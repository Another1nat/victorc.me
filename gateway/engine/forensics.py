import time
import uuid
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field

@dataclass
class TraceSpan:
    name: str              # e.g. "ingress", "rate_limit", "router", "model_inference", "arbitration"
    start_time: float
    end_time: Optional[float] = None
    status: str = "SUCCESS"  # "SUCCESS", "FAILED", "SKIPPED"
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

    @property
    def duration_ms(self) -> float:
        if self.end_time:
            return round((self.end_time - self.start_time) * 1000, 2)
        return 0.0

@dataclass
class RequestTrace:
    trace_id: str
    user_prompt: str
    model_requested: str
    created_at: float
    spans: List[TraceSpan] = field(default_factory=list)
    final_output: Optional[str] = None
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0
    failed_node: Optional[str] = None
    is_anomaly: bool = False

class FailureForensicsTracer:
    """
    OpenTelemetry-compatible Tracing & Forensics Engine for AI pipelines.
    Traces every step, isolates failure nodes, and captures edge-case data for evaluation datasets.
    """
    def __init__(self, max_retained_traces: int = 200):
        self.max_retained = max_retained_traces
        self.traces: Dict[str, RequestTrace] = {}
        self.golden_eval_candidates: List[Dict] = []

    def start_trace(self, prompt: str, model: str) -> RequestTrace:
        trace_id = f"tr-{uuid.uuid4().hex[:10]}"
        trace = RequestTrace(
            trace_id=trace_id,
            user_prompt=prompt,
            model_requested=model,
            created_at=time.time(),
        )
        self.traces[trace_id] = trace
        
        # Evict oldest traces if limit reached
        if len(self.traces) > self.max_retained:
            oldest_key = min(self.traces.keys(), key=lambda k: self.traces[k].created_at)
            del self.traces[oldest_key]

        return trace

    def start_span(self, trace: RequestTrace, name: str, metadata: Optional[Dict] = None) -> TraceSpan:
        span = TraceSpan(
            name=name,
            start_time=time.time(),
            metadata=metadata or {},
        )
        trace.spans.append(span)
        return span

    def end_span(
        self,
        span: TraceSpan,
        status: str = "SUCCESS",
        error: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ):
        span.end_time = time.time()
        span.status = status
        span.error = error
        if metadata:
            span.metadata.update(metadata)

    def finish_trace(
        self,
        trace: RequestTrace,
        output: Optional[str] = None,
        tokens: int = 0,
        cost: float = 0.0,
        error: Optional[str] = None,
    ):
        trace.final_output = output
        trace.total_tokens = tokens
        trace.estimated_cost_usd = cost

        if error:
            trace.failed_node = next((s.name for s in reversed(trace.spans) if s.status == "FAILED"), "unknown")
            trace.is_anomaly = True

            # Project 13: Automatically mine failure interaction into an Eval Dataset Candidate
            self.golden_eval_candidates.append({
                "source_trace_id": trace.trace_id,
                "input_prompt": trace.user_prompt,
                "expected_model": trace.model_requested,
                "failure_node": trace.failed_node,
                "error_detail": error,
                "timestamp": time.time(),
            })

    def get_trace_detail(self, trace_id: str) -> Optional[Dict]:
        trace = self.traces.get(trace_id)
        if not trace:
            return None
        return {
            "trace_id": trace.trace_id,
            "user_prompt": trace.user_prompt,
            "model_requested": trace.model_requested,
            "is_anomaly": trace.is_anomaly,
            "failed_node": trace.failed_node,
            "total_tokens": trace.total_tokens,
            "estimated_cost_usd": trace.estimated_cost_usd,
            "spans": [
                {
                    "name": s.name,
                    "status": s.status,
                    "duration_ms": s.duration_ms,
                    "error": s.error,
                    "metadata": s.metadata,
                }
                for s in trace.spans
            ],
        }

    def get_traces_summary(self) -> List[Dict]:
        return [
            {
                "trace_id": t.trace_id,
                "prompt_snippet": t.user_prompt[:50] + "...",
                "model": t.model_requested,
                "spans_count": len(t.spans),
                "duration_ms": round(sum(s.duration_ms for s in t.spans), 2),
                "is_anomaly": t.is_anomaly,
                "failed_node": t.failed_node,
            }
            for t in sorted(self.traces.values(), key=lambda x: x.created_at, reverse=True)
        ]
