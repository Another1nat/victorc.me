import time
import logging
from typing import Dict, List, Optional, Tuple, AsyncGenerator
from schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionChunk,
    ChatMessage,
    GatewayMetadata,
)
from providers.base import BaseProvider
from engine.circuit_breaker import CircuitBreaker
from engine.arbitration import OutputArbitrator
from engine.forensics import FailureForensicsTracer
from engine.experimentation import ExperimentationEngine

logger = logging.getLogger("gateway.router")

class GatewayRouter:
    """
    Intelligent routing and failover orchestration engine.
    Handles provider selection, cost autopilot, multi-critic arbitration, forensics
    tracing, and prompt A/B + canary experimentation (Projects 9 & 12).
    """
    def __init__(
        self,
        circuit_breaker: Optional[CircuitBreaker] = None,
        arbitrator: Optional[OutputArbitrator] = None,
        tracer: Optional[FailureForensicsTracer] = None,
        experimentation: Optional[ExperimentationEngine] = None,
    ):
        self.providers: Dict[str, BaseProvider] = {}
        self.circuit_breaker = circuit_breaker or CircuitBreaker()
        self.arbitrator = arbitrator or OutputArbitrator()
        self.tracer = tracer or FailureForensicsTracer()
        self.experimentation = experimentation or ExperimentationEngine()
        self.fallback_chains: Dict[str, List[str]] = {
            "default": ["google-gemini", "openai", "anthropic", "simulator-mock"],
            "fast": ["google-gemini", "openai", "simulator-mock"],
            "reasoning": ["anthropic", "openai", "google-gemini"],
        }

    def register_provider(self, provider: BaseProvider):
        self.providers[provider.name] = provider

    def resolve_provider_chain(self, request: ChatCompletionRequest) -> List[BaseProvider]:
        """Determine prioritized list of providers based on model name and cost autopilot."""
        chain_names: List[str] = []

        if request.model == "auto-cheapest":
            # Cost Autopilot logic: analyze message complexity
            total_chars = sum(len(m.content) for m in request.messages)
            is_complex = total_chars > 1200 or any("code" in m.content.lower() or "analyze" in m.content.lower() for m in request.messages)
            
            if is_complex and "anthropic" in self.providers:
                chain_names = ["anthropic", "openai", "google-gemini", "simulator-mock"]
            else:
                chain_names = ["google-gemini", "openai", "simulator-mock"]
        elif request.model.startswith("claude"):
            chain_names = ["anthropic", "openai", "google-gemini", "simulator-mock"]
        elif request.model.startswith("gemini"):
            chain_names = ["google-gemini", "openai", "simulator-mock"]
        elif request.model.startswith("gpt"):
            chain_names = ["openai", "google-gemini", "anthropic", "simulator-mock"]
        elif request.model.startswith("simulator"):
            chain_names = ["simulator-mock"]
        elif request.model in self.fallback_chains:
            chain_names = self.fallback_chains[request.model]
        else:
            chain_names = self.fallback_chains["default"]

        # Resolve to registered provider instances that are currently allowed by circuit breaker
        available = []
        for name in chain_names:
            if name in self.providers:
                available.append(self.providers[name])
        return available

    async def execute_completion(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        start_time = time.time()
        last_user_prompt = request.messages[-1].content if request.messages else ""
        trace = self.tracer.start_trace(last_user_prompt, request.model)
        
        span_routing = self.tracer.start_span(trace, "routing", {"model": request.model})
        providers_to_try = self.resolve_provider_chain(request)
        self.tracer.end_span(span_routing, status="SUCCESS" if providers_to_try else "FAILED")

        if not providers_to_try:
            self.tracer.finish_trace(trace, error="No available AI providers configured in gateway.")
            raise RuntimeError("No available AI providers configured in gateway.")

        # Project 9: Prompt A/B variant selection. The chosen variant's template is
        # prepended as a system message on the request actually dispatched to the
        # provider, while `request` itself (used for routing/tracing) is untouched.
        selected_variant = None
        dispatch_request = request
        if request.experiment_id:
            span_exp = self.tracer.start_span(trace, "experiment_variant_selection", {"experiment_id": request.experiment_id})
            selected_variant = self.experimentation.select_prompt_variant(request.experiment_id)
            if selected_variant:
                dispatch_request = request.model_copy(
                    update={"messages": [ChatMessage(role="system", content=selected_variant.template)] + list(request.messages)}
                )
            self.tracer.end_span(span_exp, status="SUCCESS", metadata={"variant": selected_variant.id if selected_variant else None})

        # Project 12: Canary feature-flag evaluation for this request.
        is_canary = None
        if request.canary_flag:
            is_canary, _assigned_variant = self.experimentation.evaluate_canary(request.canary_flag, request.team_id)

        last_error = None
        fallbacks_count = 0

        for i, provider in enumerate(providers_to_try):
            # Check circuit breaker
            if not self.circuit_breaker.allow_request(provider.name):
                logger.warning(f"Circuit for provider '{provider.name}' is OPEN. Bypassing to next fallback.")
                fallbacks_count += 1
                continue

            span_inference = self.tracer.start_span(trace, f"inference_{provider.name}")
            try:
                logger.info(f"Dispatching request to provider: '{provider.name}'")
                response = await provider.complete(dispatch_request)
                self.tracer.end_span(span_inference, status="SUCCESS")
                
                # Successful execution
                self.circuit_breaker.record_success(provider.name)
                
                # Calculate cost savings if autopilot was used
                benchmark_gpt4_cost = (response.usage.total_tokens / 1_000_000.0) * 5.00
                cost_saved = max(0.0, benchmark_gpt4_cost - response.usage.estimated_cost_usd)

                # Optional Multi-Critic Arbitration
                confidence_score = None
                verdict = None
                if request.enable_arbitration:
                    span_arb = self.tracer.start_span(trace, "arbitration")
                    candidate_text = response.choices[0].message.content if response.choices else ""
                    arb_result = self.arbitrator.evaluate(last_user_prompt, candidate_text)
                    confidence_score = arb_result.confidence_score
                    verdict = arb_result.verdict
                    self.tracer.end_span(span_arb, status="SUCCESS", metadata={"verdict": verdict, "confidence": confidence_score})

                    # Feed the quality signal back into any active experiment/canary.
                    if selected_variant is not None:
                        self.experimentation.record_variant_quality(request.experiment_id, selected_variant.id, confidence_score)
                    if request.canary_flag and is_canary:
                        # Only the canary arm's own quality feeds its rollback decision —
                        # baseline traffic assigned to the same flag shouldn't count against it.
                        self.experimentation.record_canary_quality(request.canary_flag, confidence_score)

                # Attach comprehensive gateway metadata
                elapsed_ms = round((time.time() - start_time) * 1000, 2)
                response.gateway_metadata = GatewayMetadata(
                    provider_used=provider.name,
                    target_model=request.model,
                    latency_ms=elapsed_ms,
                    fallbacks_triggered=fallbacks_count,
                    estimated_cost_usd=response.usage.estimated_cost_usd,
                    cost_saved_usd=round(cost_saved, 6),
                    confidence_score=confidence_score,
                    arbitration_verdict=verdict,
                    trace_id=trace.trace_id,
                    experiment_variant=selected_variant.id if selected_variant else None,
                    canary_flag=request.canary_flag,
                    is_canary=is_canary,
                )

                self.tracer.finish_trace(
                    trace,
                    output=response.choices[0].message.content if response.choices else "",
                    tokens=response.usage.total_tokens,
                    cost=response.usage.estimated_cost_usd,
                )
                return response

            except Exception as e:
                self.tracer.end_span(span_inference, status="FAILED", error=str(e))
                logger.error(f"Provider '{provider.name}' failed with error: {str(e)}")
                self.circuit_breaker.record_failure(provider.name)
                last_error = e
                fallbacks_count += 1
                continue

        self.tracer.finish_trace(trace, error=str(last_error))
        raise RuntimeError(f"All configured providers in fallback chain failed. Last error: {str(last_error)}")

    async def execute_stream(self, request: ChatCompletionRequest) -> AsyncGenerator[ChatCompletionChunk, None]:
        providers_to_try = self.resolve_provider_chain(request)
        if not providers_to_try:
            raise RuntimeError("No available AI providers configured in gateway.")

        last_error = None
        for provider in providers_to_try:
            if not self.circuit_breaker.allow_request(provider.name):
                continue
            try:
                async for chunk in provider.stream(request):
                    yield chunk
                self.circuit_breaker.record_success(provider.name)
                return
            except Exception as e:
                logger.error(f"Streaming failed on '{provider.name}': {str(e)}")
                self.circuit_breaker.record_failure(provider.name)
                last_error = e
                continue

        raise RuntimeError(f"All providers failed streaming. Last error: {str(last_error)}")
