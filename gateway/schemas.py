"""
OpenAI-Compatible Wire Protocol Schemas with Gateway Metadata Extensions.
"""
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
import time
import uuid

class ChatMessage(BaseModel):
    role: str = Field(..., description="The role of the messages author: system, user, assistant, or tool.")
    content: str = Field(..., description="The contents of the message.")
    name: Optional[str] = None

class ChatCompletionRequest(BaseModel):
    model: str = Field(..., description="ID of the model to use, or 'auto-cheapest' for cost autopilot.")
    messages: List[ChatMessage] = Field(..., min_length=1, description="A list of messages comprising the conversation so far.")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    top_p: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(default=None, ge=1)
    stream: bool = Field(default=False, description="If set, partial message deltas will be sent as data-only server-sent events.")
    user: Optional[str] = Field(default=None, description="A unique identifier representing your end-user.")
    
    # Gateway specific optional fields
    team_id: Optional[str] = Field(default="default_team", description="Team identifier for rate-limiting and budget allocations.")
    enable_arbitration: Optional[bool] = Field(default=False, description="Enable multi-critic arbitration and confidence scoring.")
    enable_guardrails: Optional[bool] = Field(default=False, description="Run input/output safety and hallucination guardrails.")

class UsageInfo(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0

class ChatChoice(BaseModel):
    index: int = 0
    message: ChatMessage
    finish_reason: Optional[str] = "stop"

class GatewayMetadata(BaseModel):
    provider_used: str
    target_model: str
    latency_ms: float
    fallbacks_triggered: int = 0
    estimated_cost_usd: float = 0.0
    cost_saved_usd: float = 0.0
    confidence_score: Optional[float] = None
    arbitration_verdict: Optional[str] = None

class ChatCompletionResponse(BaseModel):
    id: str = Field(default_factory=lambda: f"chatcmpl-{uuid.uuid4().hex[:12]}")
    object: str = "chat.completion"
    created: int = Field(default_factory=lambda: int(time.time()))
    model: str
    choices: List[ChatChoice]
    usage: UsageInfo
    gateway_metadata: Optional[GatewayMetadata] = None

class ChunkDelta(BaseModel):
    role: Optional[str] = None
    content: Optional[str] = None

class ChunkChoice(BaseModel):
    index: int = 0
    delta: ChunkDelta
    finish_reason: Optional[str] = None

class ChatCompletionChunk(BaseModel):
    id: str = Field(default_factory=lambda: f"chatcmpl-{uuid.uuid4().hex[:12]}")
    object: str = "chat.completion.chunk"
    created: int = Field(default_factory=lambda: int(time.time()))
    model: str
    choices: List[ChunkChoice]

class ModelCard(BaseModel):
    id: str
    object: str = "model"
    created: int = Field(default_factory=lambda: int(time.time()))
    owned_by: str
    cost_per_1m_input: float
    cost_per_1m_output: float
    tier: str = "general"

class ModelListResponse(BaseModel):
    object: str = "list"
    data: List[ModelCard]
