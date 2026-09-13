# AI Reliability Gateway & Control Plane

A high-throughput, OpenAI-compatible enterprise AI Gateway and Reliability Engine built with Python (FastAPI + AsyncIO + Pydantic v2).

---

## Key Features

- **OpenAI-Compatible Ingress:** Drop-in `/v1/chat/completions` and `/v1/models` endpoints supporting both non-streaming JSON and streaming Server-Sent Events (`text/event-stream`).
- **Unified Provider Adapters:** Multi-provider client abstraction supporting Google Gemini, OpenAI, Anthropic Claude, and zero-cost local simulators.
- **Resilient Circuit Breaker:** Automated state machine (`CLOSED` -> `OPEN` -> `HALF_OPEN`) with threshold-based failure detection and transparent fallback cascades.
- **Token Bucket Rate Limiting:** Sliding-window rate limiter enforcing Requests Per Minute (RPM), Tokens Per Minute (TPM), and spend budgets with standard HTTP 429 response headers.
- **Cost Autopilot:** Semantic complexity classifier routing simple queries to cost-effective models (Gemini Flash / GPT-4o-mini) and complex reasoning to flagship models.
- **Observability Telemetry:** Every response includes `gateway_metadata` with latency, provider used, fallbacks triggered, and real-time cost savings.

---

## Quickstart

### 1. Installation

```bash
cd gateway
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables (Optional)

```bash
export GEMINI_API_KEY="your-gemini-api-key"
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```
*(Note: If API keys are not set, the Gateway automatically runs using high-fidelity local simulator providers for testing with zero cost.)*

### 3. Run Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Test Completion (OpenAI Drop-In)

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-team" \
  -d '{
    "model": "auto-cheapest",
    "messages": [
      {"role": "user", "content": "Explain KV-Cache optimization in 1 sentence."}
    ]
  }'
```

---

## Architecture

```
Client -> /v1/chat/completions
             │
      [Token Bucket Limiter]  (RPM / TPM / Budget check)
             │
       [Cost Autopilot]       (Analyzes query complexity)
             │
      [Circuit Breaker]       (Checks provider health status)
             │
  ┌──────────┼──────────┐
Gemini    OpenAI    Anthropic
  │          │          │
  └──────────┴──────────┘
             │ (If 5xx/429 -> automatic failover to next provider)
    [Gateway Metadata]        (Attach latency, cost & savings)
             │
      Validated Output
```
