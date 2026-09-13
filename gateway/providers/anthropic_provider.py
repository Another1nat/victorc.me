import os
import time
import json
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

class AnthropicProvider(BaseProvider):
    """
    Anthropic Claude Provider via api.anthropic.com/v1/messages.
    Maps OpenAI wire protocol to Anthropic API and back.
    """
    def __init__(
        self,
        api_key: str = None,
        default_model: str = "claude-3-5-sonnet-20241022",
        cost_per_1m_input: float = 3.00,
        cost_per_1m_output: float = 15.00,
    ):
        super().__init__("anthropic", cost_per_1m_input, cost_per_1m_output)
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        self.default_model = default_model
        self.base_url = "https://api.anthropic.com/v1/messages"

    def _convert_messages(self, messages):
        system_content = ""
        converted = []
        for m in messages:
            if m.role == "system":
                system_content += m.content + "\n"
            else:
                converted.append({"role": m.role, "content": m.content})
        return system_content.strip(), converted

    async def complete(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        start_time = time.time()
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured.")

        system_msg, user_msgs = self._convert_messages(request.messages)
        target_model = request.model if request.model.startswith("claude-") else self.default_model

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": target_model,
            "max_tokens": request.max_tokens or 1024,
            "messages": user_msgs,
            "temperature": request.temperature,
        }
        if system_msg:
            payload["system"] = system_msg

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(self.base_url, headers=headers, json=payload)
            if res.status_code != 200:
                raise RuntimeError(f"Anthropic API error ({res.status_code}): {res.text}")

            data = res.json()
            choice_text = "".join(b.get("text", "") for b in data.get("content", []))
            usage = data.get("usage", {})
            prompt_tokens = usage.get("input_tokens", 0)
            completion_tokens = usage.get("output_tokens", 0)
            cost = self.calculate_cost(prompt_tokens, completion_tokens)
            elapsed_ms = round((time.time() - start_time) * 1000, 2)

            return ChatCompletionResponse(
                id=data.get("id", "claude-res"),
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
            raise ValueError("ANTHROPIC_API_KEY is not configured.")

        system_msg, user_msgs = self._convert_messages(request.messages)
        target_model = request.model if request.model.startswith("claude-") else self.default_model

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": target_model,
            "max_tokens": request.max_tokens or 1024,
            "messages": user_msgs,
            "temperature": request.temperature,
            "stream": True,
        }
        if system_msg:
            payload["system"] = system_msg

        async with httpx.AsyncClient(timeout=45.0) as client:
            async with client.stream("POST", self.base_url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    raise RuntimeError(f"Anthropic Streaming Error ({response.status_code}): {error_body.decode()}")

                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue
                    event_data = line[6:]
                    try:
                        parsed = json.loads(event_data)
                        event_type = parsed.get("type")
                        if event_type == "content_block_delta":
                            delta_text = parsed.get("delta", {}).get("text", "")
                            yield ChatCompletionChunk(
                                model=target_model,
                                choices=[ChunkChoice(index=0, delta=ChunkDelta(content=delta_text))],
                            )
                        elif event_type == "message_stop":
                            yield ChatCompletionChunk(
                                model=target_model,
                                choices=[ChunkChoice(index=0, delta=ChunkDelta(), finish_reason="stop")],
                            )
                            break
                    except Exception:
                        continue
