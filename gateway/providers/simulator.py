import asyncio
import time
from typing import AsyncGenerator, Optional
from schemas import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionChunk,
    ChatChoice,
    ChatMessage,
    ChunkChoice,
    ChunkDelta,
    UsageInfo,
    GatewayMetadata,
)
from providers.base import BaseProvider

class SimulatorProvider(BaseProvider):
    """
    High-fidelity deterministic simulator provider.
    Allows testing routing, streaming, latency, rate-limiting, and circuit-breaker failovers
    without requiring external network calls or incurring API costs.
    """
    def __init__(
        self,
        name: str = "simulator-mock",
        latency_seconds: float = 0.05,
        should_fail: bool = False,
        failure_status_code: int = 500,
        cost_per_1m_input: float = 0.15,
        cost_per_1m_output: float = 0.60,
    ):
        super().__init__(name, cost_per_1m_input, cost_per_1m_output)
        self.latency_seconds = latency_seconds
        self.should_fail = should_fail
        self.failure_status_code = failure_status_code

    async def complete(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        start_time = time.time()
        if self.latency_seconds > 0:
            await asyncio.sleep(self.latency_seconds)

        if self.should_fail:
            raise RuntimeError(f"Simulator error: provider failed with status {self.failure_status_code}")

        user_content = request.messages[-1].content if request.messages else "Empty prompt"
        response_text = f"[Simulator Response via {self.name}]: Processed prompt: '{user_content[:40]}...'"

        prompt_tokens = sum(len(m.content.split()) for m in request.messages) * 2
        completion_tokens = len(response_text.split()) * 2
        total_tokens = prompt_tokens + completion_tokens
        cost = self.calculate_cost(prompt_tokens, completion_tokens)
        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return ChatCompletionResponse(
            model=request.model,
            choices=[
                ChatChoice(
                    index=0,
                    message=ChatMessage(role="assistant", content=response_text),
                    finish_reason="stop",
                )
            ],
            usage=UsageInfo(
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=cost,
            ),
            gateway_metadata=GatewayMetadata(
                provider_used=self.name,
                target_model=request.model,
                latency_ms=elapsed_ms,
                estimated_cost_usd=cost,
            ),
        )

    async def stream(self, request: ChatCompletionRequest) -> AsyncGenerator[ChatCompletionChunk, None]:
        if self.should_fail:
            raise RuntimeError(f"Simulator error: streaming failed with status {self.failure_status_code}")

        user_content = request.messages[-1].content if request.messages else "Empty prompt"
        words = f"[Simulator Stream via {self.name}]: Received: {user_content}".split()

        # Initial role chunk
        yield ChatCompletionChunk(
            model=request.model,
            choices=[ChunkChoice(index=0, delta=ChunkDelta(role="assistant"))],
        )

        for word in words:
            if self.latency_seconds > 0:
                await asyncio.sleep(self.latency_seconds / max(len(words), 1))
            yield ChatCompletionChunk(
                model=request.model,
                choices=[ChunkChoice(index=0, delta=ChunkDelta(content=word + " "))],
            )

        # Final chunk
        yield ChatCompletionChunk(
            model=request.model,
            choices=[ChunkChoice(index=0, delta=ChunkDelta(), finish_reason="stop")],
        )
