import os
import time
import httpx
from typing import AsyncGenerator
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

class GeminiProvider(BaseProvider):
    """
    Google Gemini Provider via Gemini's OpenAI-compatible v1beta endpoint.
    Ultra-low latency, native streaming support, and cost-effective.
    """
    def __init__(
        self,
        api_key: str = None,
        default_model: str = "gemini-2.0-flash",
        cost_per_1m_input: float = 0.075,
        cost_per_1m_output: float = 0.30,
    ):
        super().__init__("google-gemini", cost_per_1m_input, cost_per_1m_output)
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.default_model = default_model
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

    async def complete(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        start_time = time.time()
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        target_model = request.model if request.model.startswith("gemini-") else self.default_model
        payload = {
            "model": target_model,
            "messages": [m.model_dump(exclude_none=True) for m in request.messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": False,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(self.base_url, headers=headers, json=payload)
            if res.status_code != 200:
                raise RuntimeError(f"Gemini API error ({res.status_code}): {res.text}")
            
            data = res.json()
            choice_text = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens", 0)
            completion_tokens = usage.get("completion_tokens", 0)
            cost = self.calculate_cost(prompt_tokens, completion_tokens)
            elapsed_ms = round((time.time() - start_time) * 1000, 2)

            return ChatCompletionResponse(
                id=data.get("id", "gemini-res"),
                model=target_model,
                choices=[
                    ChatChoice(
                        index=0,
                        message=ChatMessage(role="assistant", content=choice_text),
                        finish_reason="stop",
                    )
                ],
                usage=UsageInfo(
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=prompt_tokens + completion_tokens,
                    estimated_cost_usd=cost,
                ),
                gateway_metadata=GatewayMetadata(
                    provider_used=self.name,
                    target_model=target_model,
                    latency_ms=elapsed_ms,
                    estimated_cost_usd=cost,
                ),
            )

    async def stream(self, request: ChatCompletionRequest) -> AsyncGenerator[ChatCompletionChunk, None]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        target_model = request.model if request.model.startswith("gemini-") else self.default_model
        payload = {
            "model": target_model,
            "messages": [m.model_dump(exclude_none=True) for m in request.messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            async with client.stream("POST", self.base_url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    raise RuntimeError(f"Gemini Streaming Error ({response.status_code}): {error_body.decode()}")

                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    import json
                    try:
                        chunk_dict = json.loads(data_str)
                        yield ChatCompletionChunk(**chunk_dict)
                    except Exception:
                        continue
