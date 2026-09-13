import os
import json
import logging
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
)
from engine.rate_limiter import TokenBucketLimiter
from engine.circuit_breaker import CircuitBreaker
from engine.router import GatewayRouter
from providers.simulator import SimulatorProvider
from providers.gemini_provider import GeminiProvider
from providers.openai_provider import OpenAIProvider
from providers.anthropic_provider import AnthropicProvider

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("gateway.api")

# Core engine singletons
rate_limiter = TokenBucketLimiter()
circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_time_seconds=20.0)
router = GatewayRouter(circuit_breaker=circuit_breaker)

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
