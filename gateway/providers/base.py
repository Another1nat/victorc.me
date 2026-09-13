from abc import ABC, abstractmethod
from typing import AsyncGenerator
from schemas import ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk

class BaseProvider(ABC):
    def __init__(self, name: str, cost_per_1m_input: float, cost_per_1m_output: float):
        self.name = name
        self.cost_per_1m_input = cost_per_1m_input
        self.cost_per_1m_output = cost_per_1m_output

    def calculate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        input_cost = (prompt_tokens / 1_000_000.0) * self.cost_per_1m_input
        output_cost = (completion_tokens / 1_000_000.0) * self.cost_per_1m_output
        return round(input_cost + output_cost, 6)

    @abstractmethod
    async def complete(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """Execute a non-streaming chat completion."""
        pass

    @abstractmethod
    async def stream(self, request: ChatCompletionRequest) -> AsyncGenerator[ChatCompletionChunk, None]:
        """Execute a streaming chat completion yielding SSE chunks."""
        pass
