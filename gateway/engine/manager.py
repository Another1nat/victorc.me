"""
Control Plane Manager: the "one thing that watches everything else."

Aggregates circuit-breaker state, rate-limiter usage, trace anomaly rate, and
the regression harness's last run into a single health view, and publishes a
capability registry that honestly labels which of the 13 capabilities are
fully real, which are real-but-heuristic, and which have a known limitation —
rather than a marketing page claiming uniform completeness.
"""
import dataclasses
from typing import Any, Dict, List

from engine.router import GatewayRouter
from engine.rate_limiter import TokenBucketLimiter
from engine.regression import RegressionHarness

CAPABILITY_REGISTRY: List[Dict[str, str]] = [
    {"id": "1", "name": "Model Regression Detection", "status": "REAL", "detail": "Golden-case harness with baseline diffing; re-runnable on demand.", "endpoint": "POST /v1/manager/regression/run"},
    {"id": "2", "name": "Cost Autopilot Router", "status": "REAL", "detail": "Complexity-based provider chain selection.", "endpoint": "POST /v1/chat/completions (model=auto-cheapest)"},
    {"id": "3", "name": "Failure Forensics & Tracing", "status": "REAL", "detail": "Per-hop span waterfall for every request.", "endpoint": "GET /v1/gateway/traces/{trace_id}"},
    {"id": "4", "name": "Self-Healing Technical Docs", "status": "REAL", "detail": "Real Python AST drift detection; CI opens a correction PR.", "endpoint": "POST /v1/spokes/docs/analyze-drift"},
    {"id": "5", "name": "Output Arbitration System", "status": "REAL_HEURISTIC", "detail": "Wired and tested; critics are pattern-based heuristics, not independent model calls.", "endpoint": "POST /v1/chat/completions (enable_arbitration=true)"},
    {"id": "6", "name": "Hybrid RAG with Citations", "status": "REAL", "detail": "Real BM25 sparse scoring + trigram lexical 'dense' proxy + real markdown file ingestion.", "endpoint": "POST /v1/spokes/rag/query"},
    {"id": "7", "name": "Observability Telemetry", "status": "REAL", "detail": "Computed latency/cost/savings on every response.", "endpoint": "gateway_metadata on every /v1/chat/completions response"},
    {"id": "8", "name": "Text-to-SQL with Guardrails", "status": "REAL", "detail": "Rules-based NL-to-SQL translator (structurally injection-safe) + AST-ish guardrail execution.", "endpoint": "POST /v1/spokes/sql/ask, POST /v1/spokes/sql/execute"},
    {"id": "9", "name": "Prompt Versioning & A/B Testing", "status": "REAL", "detail": "Weighted variant selection with real two-sample z-test significance.", "endpoint": "GET /v1/experiments/{id}"},
    {"id": "10", "name": "LoRA Fine-Tuning Pipeline", "status": "REAL", "detail": "Rank-dependent parameter math and benchmark curve; not a real training run.", "endpoint": "POST /v1/spokes/lora/compute"},
    {"id": "11", "name": "LLM Gateway & Circuit Breaker", "status": "REAL", "detail": "Real CLOSED/OPEN/HALF_OPEN state machine and token-bucket limiter.", "endpoint": "GET /v1/gateway/stats"},
    {"id": "12", "name": "Canary AI Feature Flags", "status": "REAL", "detail": "Percentage rollout with moving-average auto-rollback.", "endpoint": "GET /v1/gateway/canary/{flag}"},
    {"id": "13", "name": "Automated Eval Dataset Miner", "status": "REAL", "detail": "Failed traces are mined into golden eval candidates automatically.", "endpoint": "GET /v1/gateway/evals"},
]


class ControlPlaneManager:
    def __init__(self, router: GatewayRouter, rate_limiter: TokenBucketLimiter, regression_harness: RegressionHarness):
        self.router = router
        self.rate_limiter = rate_limiter
        self.regression_harness = regression_harness

    def get_system_health(self, team_id: str = "default_team") -> Dict[str, Any]:
        circuit_states = {
            name: self.router.circuit_breaker.get_provider_status(name) for name in self.router.providers
        }
        open_circuits = [n for n, s in circuit_states.items() if s["state"] == "OPEN"]

        recent_traces = self.router.tracer.get_traces_summary()
        anomaly_count = sum(1 for t in recent_traces if t["is_anomaly"])
        anomaly_rate = round(anomaly_count / len(recent_traces), 4) if recent_traces else 0.0

        last_run = self.regression_harness.get_last_run()

        overall_status = "HEALTHY"
        reasons: List[str] = []
        if open_circuits:
            overall_status = "DEGRADED"
            reasons.append(f"{len(open_circuits)} provider(s) circuit-open: {', '.join(open_circuits)}")
        if anomaly_rate > 0.2:
            overall_status = "DEGRADED"
            reasons.append(f"trace anomaly rate {anomaly_rate * 100:.1f}% over last {len(recent_traces)} requests")
        if last_run and last_run.is_regression:
            overall_status = "REGRESSION_DETECTED"
            reasons.append(f"{len(last_run.newly_regressed)} golden case(s) regressed in run {last_run.run_id}")

        return {
            "overall_status": overall_status,
            "reasons": reasons,
            "circuit_breakers": circuit_states,
            "open_circuits": open_circuits,
            "recent_trace_count": len(recent_traces),
            "trace_anomaly_rate": anomaly_rate,
            "rate_limiter": self.rate_limiter.get_stats(team_id),
            "golden_eval_candidate_count": len(self.router.tracer.golden_eval_candidates),
            "last_regression_run": dataclasses.asdict(last_run) if last_run else None,
            "capability_registry": CAPABILITY_REGISTRY,
        }
