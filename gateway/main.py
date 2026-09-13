import os
import json
import logging
import dataclasses
from typing import Optional
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from contextlib import asynccontextmanager

from schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ModelListResponse,
    ModelCard,
    SQLExecuteRequest,
    NLToSQLRequest,
    RAGQueryRequest,
    DocsDriftRequest,
    LoRAComputeRequest,
    CreateAPIKeyRequest,
)
from engine.rate_limiter import TokenBucketLimiter
from engine.circuit_breaker import CircuitBreaker
from engine.router import GatewayRouter
from providers.simulator import SimulatorProvider
from providers.gemini_provider import GeminiProvider
from providers.openai_provider import OpenAIProvider
from providers.anthropic_provider import AnthropicProvider
from spokes.sql_guardrails import TextToSQLGuardrailsEngine
from spokes.hybrid_rag import HybridRAGEngine
from spokes.self_healing_docs import SelfHealingDocsEngine
from spokes.lora_pipeline import LoRAExperimentPipeline, LoRAConfig
from engine.experimentation import ExperimentationEngine, PromptVariant, CanaryFeatureFlag
from engine.regression import RegressionHarness, GoldenCase
from engine.manager import ControlPlaneManager
from engine.persistence import PersistenceStore
from engine.auth import AuthManager, PLAN_LIMITS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("gateway.api")

# Multi-tenant auth is OFF by default so the public demo needs no setup. Set
# GATEWAY_REQUIRE_AUTH=true to require a valid API key on /v1/chat/completions.
GATEWAY_REQUIRE_AUTH = os.getenv("GATEWAY_REQUIRE_AUTH", "false").lower() == "true"
GATEWAY_ADMIN_SECRET = os.getenv("GATEWAY_ADMIN_SECRET", "aegis-demo-admin-secret-change-me")
if GATEWAY_ADMIN_SECRET == "aegis-demo-admin-secret-change-me":
    logger.warning("GATEWAY_ADMIN_SECRET is using its insecure default — set a real secret before exposing /v1/auth/api-keys publicly.")

persistence_store = PersistenceStore()
auth_manager = AuthManager(store=persistence_store)

# Core engine singletons
rate_limiter = TokenBucketLimiter(persistence=persistence_store)
circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_time_seconds=20.0)
experimentation = ExperimentationEngine()
router = GatewayRouter(circuit_breaker=circuit_breaker, experimentation=experimentation)

def init_default_experiments():
    """Register the default Prompt A/B experiment and canary feature flag (Projects 9 & 12)."""
    experimentation.register_experiment(
        "system-prompt-tone",
        [
            PromptVariant(id="baseline", template="You are a helpful assistant.", traffic_weight=0.5),
            PromptVariant(
                id="canary-concise",
                template="You are a precise, concise enterprise assistant. Answer correctly in as few words as possible.",
                traffic_weight=0.5,
            ),
        ],
    )
    experimentation.register_feature_flag(
        CanaryFeatureFlag(
            flag_key="cost-autopilot-aggressive",
            rollout_percentage=20.0,
            quality_threshold=0.75,
        )
    )

# Applied Spoke engine singletons (stateless / self-seeding — safe to share across requests)
sql_engine = TextToSQLGuardrailsEngine()
rag_engine = HybridRAGEngine()
docs_engine = SelfHealingDocsEngine()

_GATEWAY_DIR = os.path.dirname(os.path.abspath(__file__))
for _doc_name in ("README.md", "API_REFERENCE.md"):
    rag_engine.ingest_markdown_file(os.path.join(_GATEWAY_DIR, _doc_name))

# Model Regression Detection (Project 1) + the Control Plane Manager that ties
# every subsystem's health into one view (Project 1 + the unifying "manager").
regression_harness = RegressionHarness()
manager = ControlPlaneManager(router=router, rate_limiter=rate_limiter, regression_harness=regression_harness)

def init_golden_regression_suite():
    """
    Registers the golden cases the regression harness re-runs on demand. Each
    case exercises a real subsystem end-to-end; the harness diffs pass/fail
    against the previous run so a case that regresses gets flagged specifically,
    not just lumped into "some tests failed."
    """
    from schemas import ChatCompletionRequest, ChatMessage

    async def _run_gateway_completion():
        req = ChatCompletionRequest(model="simulator-mock", messages=[ChatMessage(role="user", content="Explain KV-Cache in one sentence.")])
        res = await router.execute_completion(req)
        return {"has_output": bool(res.choices and res.choices[0].message.content), "provider_used": res.gateway_metadata.provider_used}

    def _check_gateway_completion(observed):
        return [] if observed.get("has_output") else ["Gateway completion returned no output."]

    regression_harness.register_case(GoldenCase(
        case_id="gateway-basic-completion", category="gateway",
        description="A basic chat completion returns non-empty output.",
        run=_run_gateway_completion, check=_check_gateway_completion,
    ))

    async def _run_circuit_breaker_fallback():
        req = ChatCompletionRequest(model="demo-outage", messages=[ChatMessage(role="user", content="Golden case: outage fallback")])
        res = await router.execute_completion(req)
        return {"provider_used": res.gateway_metadata.provider_used, "fallbacks_triggered": res.gateway_metadata.fallbacks_triggered}

    def _check_circuit_breaker_fallback(observed):
        return [] if observed.get("fallbacks_triggered", 0) >= 1 else ["Expected at least one fallback to trigger on the demo-outage chain."]

    regression_harness.register_case(GoldenCase(
        case_id="circuit-breaker-fallback", category="gateway",
        description="The demo-outage chain always recovers via fallback.",
        run=_run_circuit_breaker_fallback, check=_check_circuit_breaker_fallback,
    ))

    def _run_sql_blocks_drop():
        result = sql_engine.execute_safe_sql("DROP TABLE customer_subscriptions;")
        return {"success": result.success, "error": result.error}

    def _check_sql_blocks_drop(observed):
        return [] if observed.get("success") is False else ["DROP TABLE was not rejected."]

    regression_harness.register_case(GoldenCase(
        case_id="sql-guardrail-blocks-drop", category="sql_guardrails",
        description="A destructive DROP TABLE statement is always rejected.",
        run=_run_sql_blocks_drop, check=_check_sql_blocks_drop,
    ))

    def _run_sql_safe_select():
        result = sql_engine.execute_safe_sql("SELECT customer_name FROM customer_subscriptions")
        return {"success": result.success, "row_count": result.row_count}

    def _check_sql_safe_select(observed):
        failures = []
        if not observed.get("success"):
            failures.append("Safe SELECT was unexpectedly rejected.")
        if observed.get("row_count", 0) < 1:
            failures.append("Safe SELECT returned zero rows.")
        return failures

    regression_harness.register_case(GoldenCase(
        case_id="sql-guardrail-safe-select", category="sql_guardrails",
        description="A safe read-only SELECT executes and returns rows.",
        run=_run_sql_safe_select, check=_check_sql_safe_select,
    ))

    def _run_rag_citation():
        answer = rag_engine.generate_grounded_answer("How does KV-Cache PagedAttention prevent GPU VRAM fragmentation?")
        return {"citations_verified": answer.citations_verified, "confidence": answer.confidence_score}

    def _check_rag_citation(observed):
        return [] if observed.get("citations_verified") else ["RAG answer failed citation verification."]

    regression_harness.register_case(GoldenCase(
        case_id="rag-citation-grounded", category="rag",
        description="A known query returns a citation-verified grounded answer.",
        run=_run_rag_citation, check=_check_rag_citation,
    ))

    def _run_docs_stays_synchronized():
        with open(os.path.join(_GATEWAY_DIR, "main.py"), "r", encoding="utf-8") as f:
            code = f.read()
        with open(os.path.join(_GATEWAY_DIR, "API_REFERENCE.md"), "r", encoding="utf-8") as f:
            docs = f.read()
        report = docs_engine.analyze_documentation_drift(code, docs)
        return {"is_synchronized": report.is_synchronized, "drift_count": report.total_drift_detected}

    def _check_docs_stays_synchronized(observed):
        return [] if observed.get("is_synchronized") else [f"API_REFERENCE.md has {observed.get('drift_count')} unhealed drift item(s)."]

    regression_harness.register_case(GoldenCase(
        case_id="docs-api-reference-in-sync", category="docs_drift",
        description="gateway/API_REFERENCE.md matches the real main.py signatures right now.",
        run=_run_docs_stays_synchronized, check=_check_docs_stays_synchronized,
    ))

    def _run_lora_rank_scaling():
        pipeline = LoRAExperimentPipeline("llama-3-8b-instruct")
        low = pipeline.evaluate_benchmark(LoRAConfig(r=8))
        high = pipeline.evaluate_benchmark(LoRAConfig(r=64))
        return {"acc_r8": low.lora_model_accuracy, "acc_r64": high.lora_model_accuracy}

    def _check_lora_rank_scaling(observed):
        return [] if observed.get("acc_r64", 0) > observed.get("acc_r8", 1) else ["Higher LoRA rank did not yield higher benchmark accuracy."]

    regression_harness.register_case(GoldenCase(
        case_id="lora-benchmark-scales-with-rank", category="lora",
        description="LoRA benchmark accuracy strictly increases from r=8 to r=64.",
        run=_run_lora_rank_scaling, check=_check_lora_rank_scaling,
    ))

    def _run_auth_key_lifecycle():
        import uuid
        team_id = f"golden-auth-{uuid.uuid4().hex[:8]}"
        raw_key = auth_manager.create_key(team_id, plan="pro")
        verified = auth_manager.verify_key(raw_key)
        return {"verified_team": verified["team_id"] if verified else None, "plan": verified["plan"] if verified else None}

    def _check_auth_key_lifecycle(observed):
        failures = []
        if observed.get("verified_team") is None:
            failures.append("Freshly issued API key failed to verify.")
        if observed.get("plan") != "pro":
            failures.append(f"Expected plan 'pro', got {observed.get('plan')!r}.")
        return failures

    regression_harness.register_case(GoldenCase(
        case_id="auth-key-issuance-and-verification", category="auth",
        description="A freshly issued API key verifies back to the correct team and plan.",
        run=_run_auth_key_lifecycle, check=_check_auth_key_lifecycle,
    ))

def init_demo_fixtures():
    """
    Register deterministic demo providers used by the live frontend showcase
    to exercise circuit-breaker tripping and fallback cascades on demand,
    without needing a real upstream outage.
    """
    unstable_primary = SimulatorProvider(name="demo-unstable-primary", should_fail=True, failure_status_code=503)
    router.register_provider(unstable_primary)
    # With fallback: primary always fails, secondary (simulator-mock) always succeeds.
    router.fallback_chains["demo-outage"] = ["demo-unstable-primary", "simulator-mock"]
    # Without fallback: only the failing provider is in the chain, so the request fails end-to-end.
    router.fallback_chains["demo-outage-no-fallback"] = ["demo-unstable-primary"]

def init_default_providers():
    """Register all available providers and fallback simulators."""
    # 1. Simulator / Mock provider (Always active for testing)
    sim_provider = SimulatorProvider(name="simulator-mock")
    router.register_provider(sim_provider)

    # 2. Google Gemini
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        router.register_provider(GeminiProvider(api_key=gemini_key))
    else:
        router.register_provider(SimulatorProvider(name="google-gemini", cost_per_1m_input=0.075, cost_per_1m_output=0.30))

    # 3. OpenAI
    openai_key = os.getenv("OPENAI_API_KEY", "")
    if openai_key:
        router.register_provider(OpenAIProvider(api_key=openai_key))
    else:
        router.register_provider(SimulatorProvider(name="openai", cost_per_1m_input=0.15, cost_per_1m_output=0.60))

    # 4. Anthropic
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    if anthropic_key:
        router.register_provider(AnthropicProvider(api_key=anthropic_key))
    else:
        router.register_provider(SimulatorProvider(name="anthropic", cost_per_1m_input=3.00, cost_per_1m_output=15.00))

# Initialize immediately
init_default_providers()
init_demo_fixtures()
init_default_experiments()
init_golden_regression_suite()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Reliability Gateway started with active providers: %s", list(router.providers.keys()))
    yield
    logger.info("AI Gateway shutting down.")

app = FastAPI(
    title="AI Reliability Gateway & Control Plane",
    description="OpenAI-compatible enterprise gateway with rate limiting, circuit breaker failovers, and cost autopilot.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-reliability-gateway"}

@app.get("/v1/models", response_model=ModelListResponse)
async def list_models():
    models = [
        ModelCard(id="auto-cheapest", owned_by="gateway-autopilot", cost_per_1m_input=0.075, cost_per_1m_output=0.30, tier="cost-autopilot"),
        ModelCard(id="gemini-2.0-flash", owned_by="google", cost_per_1m_input=0.075, cost_per_1m_output=0.30, tier="fast-multimodal"),
        ModelCard(id="gpt-4o-mini", owned_by="openai", cost_per_1m_input=0.15, cost_per_1m_output=0.60, tier="efficient"),
        ModelCard(id="gpt-4o", owned_by="openai", cost_per_1m_input=2.50, cost_per_1m_output=10.00, tier="flagship"),
        ModelCard(id="claude-3-5-sonnet-20241022", owned_by="anthropic", cost_per_1m_input=3.00, cost_per_1m_output=15.00, tier="reasoning"),
        ModelCard(id="simulator-mock", owned_by="gateway-test", cost_per_1m_input=0.00, cost_per_1m_output=0.00, tier="testing"),
    ]
    return ModelListResponse(data=models)

@app.get("/v1/gateway/stats")
async def get_gateway_stats(team_id: str = "default_team"):
    stats = rate_limiter.get_stats(team_id)
    circuit_states = {
        name: circuit_breaker.get_provider_status(name)
        for name in router.providers.keys()
    }
    return {
        "team_metrics": stats,
        "circuit_breakers": circuit_states,
        "registered_providers": list(router.providers.keys()),
    }

@app.post("/v1/auth/api-keys")
async def create_api_key(request: CreateAPIKeyRequest, raw_request: Request):
    """
    Admin-only key issuance (the multi-tenant "service" primitive). Requires
    the X-Admin-Secret header to match GATEWAY_ADMIN_SECRET. The raw key is
    returned exactly once — only its hash is ever stored.
    """
    if raw_request.headers.get("x-admin-secret", "") != GATEWAY_ADMIN_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"error": {"message": "Missing or invalid X-Admin-Secret header.", "type": "unauthorized"}})
    if request.plan not in PLAN_LIMITS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": {"message": f"Unknown plan '{request.plan}'. Valid plans: {list(PLAN_LIMITS.keys())}", "type": "invalid_plan"}})
    raw_key = auth_manager.create_key(request.team_id, request.plan)
    return {
        "team_id": request.team_id,
        "plan": request.plan,
        "api_key": raw_key,
        "warning": "Store this key now — it will not be shown again.",
    }

@app.get("/v1/auth/api-keys/{team_id}")
async def get_api_key_status(team_id: str, raw_request: Request):
    """
    Plan, spend, and revocation status for a team — never returns the raw key.

    Requires either the admin secret, or the team's own valid API key: this
    endpoint returns cumulative spend, which is business-sensitive, and it had
    no access check at all before this — any team_id (a value teams may not
    treat as a secret, since it doesn't authenticate anything on its own
    elsewhere in this API) could be queried by anyone.
    """
    is_admin = raw_request.headers.get("x-admin-secret", "") == GATEWAY_ADMIN_SECRET
    if not is_admin:
        auth_header = raw_request.headers.get("authorization", "")
        provided_key = auth_header.replace("Bearer ", "").strip() if auth_header else ""
        key_info = auth_manager.verify_key(provided_key) if provided_key else None
        if not key_info or key_info["team_id"] != team_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"error": {"message": "Requires X-Admin-Secret, or an Authorization: Bearer key belonging to this team.", "type": "unauthorized"}})

    info = auth_manager.get_status(team_id)
    if not info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"message": f"No API key found for team '{team_id}'.", "type": "team_not_found"}})
    return info

@app.post("/v1/auth/api-keys/{team_id}/revoke")
async def revoke_api_key(team_id: str, raw_request: Request):
    if raw_request.headers.get("x-admin-secret", "") != GATEWAY_ADMIN_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"error": {"message": "Missing or invalid X-Admin-Secret header.", "type": "unauthorized"}})
    revoked = auth_manager.revoke_key(team_id)
    if not revoked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"message": f"No API key found for team '{team_id}'.", "type": "team_not_found"}})
    return {"team_id": team_id, "revoked": True}

@app.get("/v1/plans")
async def list_plans():
    """Public: the plan tiers a hosted version of this gateway would sell."""
    return {plan_id: dataclasses.asdict(limits) if dataclasses.is_dataclass(limits) else limits.__dict__ for plan_id, limits in PLAN_LIMITS.items()}

@app.get("/v1/manager/health")
async def get_manager_health(team_id: str = "default_team"):
    """Aggregated system health across circuit breakers, rate limits, traces, and the last regression run."""
    return manager.get_system_health(team_id=team_id)

@app.post("/v1/manager/regression/run")
async def run_regression_suite():
    """Project 1: Re-run the golden case suite now and diff against the last recorded baseline."""
    result = await regression_harness.run_suite()
    return dataclasses.asdict(result)

@app.get("/v1/manager/regression/last")
async def get_last_regression_run():
    """Return the most recent regression suite run, if any has executed yet."""
    last = regression_harness.get_last_run()
    if last is None:
        return {"has_run": False}
    return {"has_run": True, "result": dataclasses.asdict(last)}

@app.get("/v1/experiments/{experiment_id}")
async def get_experiment_report(experiment_id: str, min_samples: int = 5):
    """Project 9: Per-variant traffic/quality stats and a real two-sample significance test."""
    if experiment_id not in experimentation.experiments:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"message": f"Experiment '{experiment_id}' not found.", "type": "experiment_not_found"}})
    result = experimentation.evaluate_significance(experiment_id, min_samples=min_samples)
    return dataclasses.asdict(result)

@app.get("/v1/gateway/canary/{flag_key}")
async def get_canary_status(flag_key: str):
    """Project 12: Current rollout percentage, recent quality scores, and rollback state."""
    flag = experimentation.feature_flags.get(flag_key)
    if not flag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"message": f"Feature flag '{flag_key}' not found.", "type": "flag_not_found"}})
    return dataclasses.asdict(flag)

@app.get("/v1/gateway/traces")
async def get_gateway_traces():
    """Retrieve recent request traces with latency waterfall metrics."""
    return {"traces": router.tracer.get_traces_summary()}

@app.get("/v1/gateway/traces/{trace_id}")
async def get_gateway_trace_detail(trace_id: str):
    """Retrieve the full per-span OpenTelemetry waterfall for one request trace."""
    detail = router.tracer.get_trace_detail(trace_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": {"message": f"Trace '{trace_id}' not found or evicted.", "type": "trace_not_found"}})
    return detail

@app.get("/v1/gateway/evals")
async def get_mined_eval_dataset():
    """Project 13: Continuous evaluation dataset candidates mined from production logs."""
    return {
        "candidate_count": len(router.tracer.golden_eval_candidates),
        "candidates": router.tracer.golden_eval_candidates,
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest, raw_request: Request):
    # Resolve team identity. A valid API key always wins (and sets the team's
    # paid plan limits); otherwise fall back to the demo-friendly body/header
    # team_id, exactly as before. GATEWAY_REQUIRE_AUTH=true is what actually
    # gates access — off by default so the public demo needs no key.
    auth_header = raw_request.headers.get("authorization", "")
    provided_key = auth_header.replace("Bearer ", "").strip() if auth_header else ""
    key_info = auth_manager.verify_key(provided_key) if provided_key else None

    if GATEWAY_REQUIRE_AUTH:
        if not key_info or key_info.get("revoked"):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": {"message": "A valid API key is required. Provide 'Authorization: Bearer <key>'.", "type": "unauthorized", "code": 401}},
            )
        team_id = key_info["team_id"]
        plan = key_info["plan"]
    elif key_info and not key_info.get("revoked"):
        team_id = key_info["team_id"]
        plan = key_info["plan"]
    else:
        team_id = request.team_id or (provided_key or "default_team")
        plan = None

    rate_limiter.get_or_create_rule(team_id, plan=plan)

    # Estimate input tokens
    estimated_input_tokens = sum(len(m.content.split()) for m in request.messages) * 2

    # 1. Rate Limiting Check
    allowed, error_msg, rate_headers = rate_limiter.check_limit(team_id, estimated_tokens=estimated_input_tokens)
    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"error": {"message": error_msg, "type": "rate_limit_exceeded", "code": 429}},
            headers=rate_headers,
        )

    # 2. Streaming execution
    if request.stream:
        async def stream_generator():
            try:
                async for chunk in router.execute_stream(request):
                    data = json.dumps(chunk.model_dump(exclude_none=True))
                    yield f"data: {data}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                err_data = json.dumps({"error": {"message": str(e), "type": "gateway_stream_error"}})
                yield f"data: {err_data}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream",
            headers={
                **rate_headers,
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    # 3. Non-streaming execution
    try:
        response = await router.execute_completion(request)
        
        # Record actual usage and cost
        rate_limiter.record_usage(
            team_id=team_id,
            tokens=response.usage.total_tokens,
            cost_usd=response.usage.estimated_cost_usd,
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=response.model_dump(exclude_none=True),
            headers=rate_headers,
        )

    except Exception as e:
        logger.exception("Chat completion execution failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": {"message": str(e), "type": "provider_cascade_failure"}},
            headers=rate_headers,
        )

# ---------------------------------------------------------------------------
# Applied Spoke Endpoints — expose the same engines used by tests/demo_cli.py
# over HTTP so the live frontend showcase can call the real implementations
# instead of client-side fixture data.
# ---------------------------------------------------------------------------

@app.post("/v1/spokes/sql/execute")
async def spokes_sql_execute(request: SQLExecuteRequest):
    """
    Project 8 (half 2 of 2): Validate and execute a candidate SQL query against the AST guardrail engine.

    Runs in a worker thread, not on the event loop: SQLite execution is a
    blocking call, and a confirmed exploit (e.g. `SELECT randomblob(999999999)`)
    demonstrated that running it inline froze every other in-flight request on
    this single-process gateway for the full duration of the query.
    """
    result = await run_in_threadpool(sql_engine.execute_safe_sql, request.query)
    return dataclasses.asdict(result)

@app.post("/v1/spokes/sql/ask")
async def spokes_sql_ask(request: NLToSQLRequest):
    """Project 8 (half 1 of 2): Translate a plain-English question into SQL, then validate+execute it."""
    translation, execution = await run_in_threadpool(sql_engine.ask, request.question)
    return {
        "translation": dataclasses.asdict(translation),
        "execution": dataclasses.asdict(execution) if execution else None,
    }

@app.post("/v1/spokes/rag/query")
async def spokes_rag_query(request: RAGQueryRequest):
    """Project 6: Hybrid BM25 + dense retrieval with reciprocal rank fusion and verified citations."""
    result = rag_engine.generate_grounded_answer(request.query)
    return dataclasses.asdict(result)

@app.post("/v1/spokes/docs/analyze-drift")
async def spokes_docs_analyze_drift(request: DocsDriftRequest):
    """Project 4: AST-based comparison of code signatures against markdown documentation."""
    try:
        result = docs_engine.analyze_documentation_drift(request.code, request.markdown)
    except SyntaxError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"message": f"Invalid Python source: {str(e)}", "type": "ast_parse_error"}},
        )
    return dataclasses.asdict(result)

@app.post("/v1/spokes/lora/compute")
async def spokes_lora_compute(request: LoRAComputeRequest):
    """Project 10: PEFT/LoRA parameter efficiency, benchmark comparison, and adapter manifest."""
    pipeline = LoRAExperimentPipeline(request.model_name)
    pipeline.default_config = LoRAConfig(r=request.rank, lora_alpha=request.rank * 2)
    metrics = pipeline.compute_parameter_efficiency()
    benchmark = pipeline.evaluate_benchmark()
    manifest = pipeline.export_adapter_manifest()
    return {
        "model": request.model_name,
        "rank": request.rank,
        "parameter_metrics": dataclasses.asdict(metrics),
        "benchmark": dataclasses.asdict(benchmark),
        "adapter_manifest": manifest,
    }
