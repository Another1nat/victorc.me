# Gateway API Reference

This file documents the public HTTP-facing functions in `main.py`. It is checked
against the actual function signatures by `spokes/self_healing_docs.py` — both
in `tests/test_gateway.py::test_self_healing_docs_stays_synchronized_with_main`
and by `.github/workflows/self-healing-docs.yml` on every pull request that
touches `gateway/**.py`. If you change a route handler's parameters, update the
matching entry below in the same commit, or the CI check will fail and open a
correction PR for you.

## Core Gateway

### `health_check()`
Liveness probe. Always returns `{"status": "healthy", ...}`.

### `list_models()`
Lists the models the cost-autopilot router can route to, with per-1M-token pricing.

### `get_gateway_stats(team_id)`
Returns rate-limiter usage and circuit-breaker state for a team.

### `get_gateway_traces()`
Returns a summary of recent request traces (latency, anomaly flag, failed node).

### `get_gateway_trace_detail(trace_id)`
Returns the full per-span OpenTelemetry waterfall for one request trace.

### `get_mined_eval_dataset()`
Returns the golden evaluation dataset candidates mined from failed traces.

### `chat_completions(request, raw_request)`
OpenAI-compatible `/v1/chat/completions`. Handles rate limiting, cost-autopilot
routing, circuit-breaker failover, optional multi-critic arbitration, and both
streaming and non-streaming responses.

## Applied Spokes

### `spokes_sql_execute(request)`
Validates and executes a candidate SQL query against the AST/regex guardrail engine.

### `spokes_sql_ask(request)`
Translates a plain-English question into SQL via the intent-rule translator,
then validates and executes the result.

### `spokes_rag_query(request)`
Runs hybrid BM25 + dense retrieval with reciprocal rank fusion and returns a
grounded, cited answer.

### `spokes_docs_analyze_drift(request)`
Compares Python source against markdown documentation and reports signature drift.

### `spokes_lora_compute(request)`
Computes LoRA parameter-efficiency metrics and a rank-dependent benchmark
comparison for a given base model and rank.
