import os
import json
import logging
import dataclasses
from typing import Optional
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ModelListResponse,
    ModelCard,
    SQLExecuteRequest,
    RAGQueryRequest,
    DocsDriftRequest,
    LoRAComputeRequest,
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("gateway.api")

# Core engine singletons
rate_limiter = TokenBucketLimiter()
circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_time_seconds=20.0)
router = GatewayRouter(circuit_breaker=circuit_breaker)

# Applied Spoke engine singletons (stateless / self-seeding — safe to share across requests)
sql_engine = TextToSQLGuardrailsEngine()
rag_engine = HybridRAGEngine()
docs_engine = SelfHealingDocsEngine()

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
    # Extract client IP and API key for team resolution
    auth_header = raw_request.headers.get("authorization", "")
    team_id = request.team_id or (auth_header.replace("Bearer ", "").strip() if auth_header else "default_team")

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
    """Project 8: Validate and execute a candidate SQL query against the AST guardrail engine."""
    result = sql_engine.execute_safe_sql(request.query)
    return dataclasses.asdict(result)

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
