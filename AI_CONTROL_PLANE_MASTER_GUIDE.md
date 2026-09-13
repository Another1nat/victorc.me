# Aegis AI Reliability Gateway — Master Guide

> **Branch:** `sep132026`
> **Backend:** `/gateway` — Python 3.11+, FastAPI, AsyncIO, Pydantic v2, SQLite
> **Frontend:** `/src/components/AegisGatewaySimulator.tsx` and `/src/app/aegis` — Next.js 16, React 19, Tailwind CSS
> **Status:** fully wired, 58/58 automated tests passing, live-verified end-to-end. This document replaces the earlier draft of the same name — that version described several capabilities that existed as code but weren't actually connected to anything; this one describes what is true right now, with the seams marked where they are.

---

## 1. What this is

Aegis is a single-process AI reliability gateway: an OpenAI-compatible reverse proxy that sits in front of Gemini, OpenAI, Anthropic (or a zero-cost deterministic simulator when no API keys are configured) and adds the things a raw API wrapper doesn't have — rate limiting, automatic failover, cost-aware routing, tracing, output arbitration, prompt experimentation, and three applied "spokes" (SQL guardrails, hybrid RAG, self-healing docs) built on top of the same request path.

It started as an implementation of 13 discrete "senior AI engineering" project specs. Section 4 grades every one of them honestly — what's real, what's real-but-simplified, and why — because a services page that claims uniform completeness is worth less than one that tells you exactly what you're buying.

## 2. Architecture

```
                    Client / Ingress Application
                                 │
                    ┌────────────▼─────────────┐
                    │   Optional API Key Auth   │   ← off by default (GATEWAY_REQUIRE_AUTH)
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │       AI RELIABILITY GATEWAY          │
              │  Rate Limiting (Token Bucket RPM/TPM) │
              │  Cost Autopilot (Semantic Routing)     │
              │  Circuit Breakers & Failover           │
              │  Prompt A/B + Canary Feature Flags     │
              │  Multi-Critic Output Arbitration        │
              │  OpenTelemetry-style Tracing            │
              └───┬──────────────┬──────────────┬───────┘
                  │              │              │
     ┌────────────┘              │              └────────────┐
     ▼                           ▼                           ▼
┌───────────┐           ┌────────────────┐           ┌───────────────┐
│ Hybrid RAG │           │ Text-to-SQL     │           │ Self-Healing   │
│ BM25+lexical│          │ NL translate +  │           │ Docs (real AST)│
│ + citations │          │ AST guardrails  │           │                │
└───────────┘           └────────────────┘           └───────────────┘
     │                           │                           │
     └───────────────────────────┴───────────────────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │     CONTROL PLANE MANAGER             │
              │  Golden-case regression suite         │
              │  Aggregated health across every part  │
              │  Honest capability registry            │
              └────────────────────────────────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │   SQLite Persistence (API keys, spend)│
              │   → survives process restarts         │
              └────────────────────────────────────────┘
```

## 3. Directory layout

```
victorc.me/
├── gateway/
│   ├── main.py                    # FastAPI app — every route lives here
│   ├── schemas.py                 # Pydantic v2 wire schemas
│   ├── demo_cli.py                # Standalone CLI walkthrough of 8 subsystems
│   ├── check_docs_drift.py        # Self-healing docs CI entry point
│   ├── API_REFERENCE.md           # Kept in sync with main.py by the docs engine
│   ├── Dockerfile / .dockerignore # Production container for the gateway
│   ├── requirements.txt
│   │
│   ├── engine/
│   │   ├── rate_limiter.py        # Token bucket RPM/TPM/budget, plan-aware
│   │   ├── circuit_breaker.py     # CLOSED / OPEN / HALF_OPEN state machine
│   │   ├── router.py              # Cost autopilot, failover, experiment wiring
│   │   ├── arbitration.py         # Multi-critic heuristic scoring
│   │   ├── forensics.py           # Tracing + golden eval dataset mining
│   │   ├── experimentation.py     # Prompt A/B (real z-test) + canary flags
│   │   ├── regression.py          # Golden-case harness with baseline diffing
│   │   ├── manager.py             # Aggregated health + capability registry
│   │   ├── auth.py                # API key issuance/verification, plan tiers
│   │   └── persistence.py         # SQLite store: API keys + cumulative spend
│   │
│   ├── providers/                 # gemini / openai / anthropic / simulator
│   ├── spokes/
│   │   ├── sql_guardrails.py      # NL→SQL translation + AST-ish guardrail exec
│   │   ├── hybrid_rag.py          # BM25 + lexical "dense" + real file ingestion
│   │   ├── self_healing_docs.py   # Real Python `ast` drift detector
│   │   └── lora_pipeline.py       # Rank-dependent PEFT parameter/benchmark math
│   │
│   └── tests/test_gateway.py      # 58 tests, all HTTP-level or engine-level
│
├── .github/workflows/self-healing-docs.yml   # Opens a real correction PR on drift
│
└── src/
    ├── app/aegis/page.tsx          # Public product page for this system
    ├── components/AegisGatewaySimulator.tsx   # 6-tab live instrument
    └── data/blog.ts                # Flagship dissertation article
```

## 4. The 13 capabilities — honest grading

| # | Capability | Status | What's real | What's simplified |
|---|---|---|---|---|
| 1 | Model Regression Detection | **REAL** | `engine/regression.py` re-runs 9 golden cases spanning every subsystem, diffs pass/fail against the last run, and reports *specifically which case regressed* | Alerting posts to Slack only if `SLACK_WEBHOOK_URL` is set; otherwise it logs honestly instead of pretending to send |
| 2 | Cost Autopilot Router | **REAL** | Genuine complexity-based provider chain selection (`auto-cheapest` routes short/simple prompts to Gemini Flash, routes prompts containing "analyze"/"code" or >1200 chars to the reasoning chain) | — |
| 3 | Failure Forensics & Tracing | **REAL** | Real per-hop span waterfall (routing → inference → arbitration), fetchable by `trace_id` | Not OpenTelemetry-protocol-compatible — it's an OTel-*shaped* internal tracer, not an OTel SDK |
| 4 | Self-Healing Technical Docs | **REAL** | Uses Python's actual `ast` module; `API_REFERENCE.md` is verifiably in sync with `main.py` right now (there's a test for it); CI opens a real PR via `peter-evans/create-pull-request` on drift | Only heals documented functions — a function with zero markdown entry is silently skipped, not flagged as missing |
| 5 | Output Arbitration System | **REAL_HEURISTIC** | Wired into every arbitrated request; produces a real weighted confidence score from 3 independent checks | The "critics" are regex/length heuristics (hedge phrases, leak patterns, output length), not separate model calls — cheap and fast, not semantically deep |
| 6 | Hybrid RAG with Citations | **REAL** | Real BM25-style term-frequency scoring; real ingestion of markdown files off disk with genuine line-number citations (`ingest_markdown_file`) | "Dense" scoring is character-trigram overlap, a lexical proxy — not a real embedding model |
| 7 | Observability Telemetry | **REAL** | `gateway_metadata` on every response carries real computed latency, cost, and savings | — |
| 8 | Text-to-SQL with Guardrails | **REAL** | Two real halves: a rules-based NL→SQL translator (`/v1/spokes/sql/ask`) and AST-ish guardrail validation + execution (`/v1/spokes/sql/execute`). Structurally injection-safe — the translator can only ever emit from its own fixed SELECT templates | Translator is intent-matching via regex, not an LLM call; covers a fixed set of question shapes |
| 9 | Prompt Versioning & A/B Testing | **REAL** | Weighted variant selection wired live into `/v1/chat/completions`; a real two-sample z-test decides "significant winner," not a hardcoded threshold | Small built-in traffic; a real deployment would want more variants and a proper multiple-testing correction |
| 10 | LoRA Fine-Tuning Pipeline | **REAL** | Parameter-count math is exact; benchmark accuracy is a genuine function of rank (`log2(r)` capacity curve, verified strictly increasing r=8→64) and varies by base model | Never runs an actual training job — this estimates, it doesn't fine-tune |
| 11 | LLM Gateway & Circuit Breaker | **REAL** | Real CLOSED/OPEN/HALF_OPEN state machine (verified tripping after 3 failures); real token-bucket RPM/TPM/budget enforcement, now plan-aware | Single-process in-memory counters — a multi-instance deployment needs Redis for the RPM/TPM windows (spend is already durable, see §7) |
| 12 | Canary AI Feature Flags | **REAL** | Percentage rollout with moving-average auto-rollback, verified live: 80 requests at 20% rollout with poisoned content actually tripped rollback | One flag's canary quality is tracked in isolation from its baseline traffic — by design, not a limitation |
| 13 | Automated Eval Dataset Miner | **REAL** | Every failed trace is automatically appended to `golden_eval_candidates`, inspectable via `/v1/gateway/evals` | No dedup or clustering of similar failures yet |

## 5. Beyond the 13: the service layer

These exist because "worth paying for" needs more than 13 clever endpoints — it needs identity, limits, and durability.

- **API keys & plans** (`engine/auth.py`) — `POST /v1/auth/api-keys` issues a key (`aegis_...`) hashed with SHA-256 before storage; the raw key is shown exactly once. Three tiers: **Free** (60 rpm / 40k tpm / $5 budget, $0/mo), **Pro** (300 rpm / 200k tpm / $100 budget, $49/mo), **Enterprise** (2000 rpm / 2M tpm / $2000 budget, $499/mo — custom in practice). `GET /v1/plans` is public.
- **Durable spend** (`engine/persistence.py`) — SQLite-backed. Verified across an actual process kill-and-restart: spend accumulated pre-restart is still counted toward the budget post-restart. RPM/TPM windows stay in-memory on purpose (they're 60-second rolling windows; persisting them buys nothing single-process, and a real multi-instance deployment would want Redis for those specifically, not SQLite).
- **Auth is opt-in, and its scope is narrower than the name suggests** — `GATEWAY_REQUIRE_AUTH` defaults to `false` so the public demo needs no key. Set it to `true` and every `/v1/chat/completions` call requires a valid, non-revoked key. **It does not gate anything else** — the SQL/RAG/LoRA/docs spokes and the manager/regression endpoints stay open regardless of this setting. That's a deliberate scope decision for a demo (those endpoints touch no per-tenant data, no external cost, and no real secrets), not a completed multi-endpoint auth layer — treat it as "the one endpoint that costs money is gated," not "the API is locked down."
- **`GET /v1/auth/api-keys/{team_id}` requires the admin secret or the team's own key** — it returns cumulative spend, which is business-sensitive, so it isn't left open the way the compute-only spokes are.
- **Containerized** — `gateway/Dockerfile` builds a standalone image; mount a volume at `/data` (`GATEWAY_DB_PATH=/data/gateway_state.db`) so keys and spend survive redeploys. *(I wrote and reviewed this Dockerfile but could not build/run it in this environment — Docker wasn't installed. Standard `python:3.11-slim` + `pip install` + `uvicorn` pattern; verify the build yourself before relying on it.)*

## 6. Running it

```bash
cd gateway
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Optional — omit any of these to fall back to the zero-cost simulator for that provider
export GEMINI_API_KEY="..."
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."

# Optional — service hardening, both default to demo-friendly values
export GATEWAY_REQUIRE_AUTH=false
export GATEWAY_ADMIN_SECRET="change-me-before-exposing-this-publicly"
export SLACK_WEBHOOK_URL=""   # regression alerts log-only if unset

uvicorn main:app --host 0.0.0.0 --port 8420 --reload
```

Frontend: `NEXT_PUBLIC_GATEWAY_URL` (default `http://localhost:8420`) tells the Next.js app where to find it. `npm run dev` in the repo root.

## 7. Testing

```bash
cd gateway && ./.venv/bin/pytest -v
# 58 passed
```

The suite spans every layer: HTTP-level tests for every endpoint, engine-level tests for the statistics behind A/B significance and canary rollback, a live simulated-restart test for persistence, and a regression-harness self-test that deliberately flips a case from passing to failing and back to prove `newly_regressed`/`newly_recovered` reflect real state transitions, not just the current failure list.

```bash
npm run build   # 0 TypeScript errors, 25+ static pages
npm run lint    # clean
```

## 8. API reference

All endpoints return JSON. Errors follow `{"error": {"message": ..., "type": ..., "code": ...}}`.

### Core gateway
| Method & Path | Purpose |
|---|---|
| `GET /health` | Liveness probe |
| `GET /v1/models` | Routable models with pricing |
| `POST /v1/chat/completions` | OpenAI-compatible completion — see below |
| `GET /v1/gateway/stats?team_id=` | Rate-limit usage + circuit-breaker state |
| `GET /v1/gateway/traces` | Recent trace summaries |
| `GET /v1/gateway/traces/{trace_id}` | Full span waterfall for one trace |
| `GET /v1/gateway/evals` | Mined golden eval dataset candidates |

```bash
curl http://localhost:8420/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto-cheapest",
    "messages": [{"role": "user", "content": "Explain KV-cache in one sentence."}],
    "enable_arbitration": true,
    "experiment_id": "system-prompt-tone",
    "canary_flag": "cost-autopilot-aggressive"
  }'
```

### Applied spokes
| Method & Path | Purpose |
|---|---|
| `POST /v1/spokes/sql/ask` | Plain-English question → translated + executed SQL |
| `POST /v1/spokes/sql/execute` | Validate + execute a query you wrote yourself |
| `POST /v1/spokes/rag/query` | Hybrid retrieval with cited answer |
| `POST /v1/spokes/docs/analyze-drift` | Compare code against markdown docs |
| `POST /v1/spokes/lora/compute` | Rank-dependent PEFT parameter + benchmark math |

### Experimentation
| Method & Path | Purpose |
|---|---|
| `GET /v1/experiments/{id}` | Per-variant stats + significance test |
| `GET /v1/gateway/canary/{flag}` | Canary rollout status + rollback state |

### Control plane manager
| Method & Path | Purpose |
|---|---|
| `GET /v1/manager/health` | Aggregated health + capability registry |
| `POST /v1/manager/regression/run` | Run the golden-case suite now |
| `GET /v1/manager/regression/last` | Last run's result |

### Auth & plans
| Method & Path | Purpose |
|---|---|
| `GET /v1/plans` | Public plan tiers |
| `POST /v1/auth/api-keys` | Issue a key — requires `X-Admin-Secret` |
| `GET /v1/auth/api-keys/{team_id}` | Plan, spend, revocation status |
| `POST /v1/auth/api-keys/{team_id}/revoke` | Revoke — requires `X-Admin-Secret` |

```bash
curl -X POST http://localhost:8420/v1/auth/api-keys \
  -H "Content-Type: application/json" -H "X-Admin-Secret: $GATEWAY_ADMIN_SECRET" \
  -d '{"team_id": "acme-corp", "plan": "pro"}'
```

## 9. What would actually be needed to launch this as a paid, hosted product

Read this section before pitching it as SaaS-ready — it isn't, yet, and pretending otherwise wastes a buyer's time.

- **A real database.** SQLite is correct for one process; a hosted multi-tenant product needs Postgres (Neon, Supabase, RDS) for API keys/spend so multiple gateway instances see consistent state.
- **Redis for rate limiting.** The RPM/TPM windows need shared, low-latency counters the moment you run more than one instance.
- **Billing.** Stripe metered billing keyed off `cumulative_spend_usd` — the number already exists; nothing charges against it yet.
- **Real LLM-call arbitration** (optional, but the honest upgrade path for capability #5) — swap the heuristic critics for actual lightweight-model calls through the existing provider abstraction.
- **Multi-tenant isolation** for the RAG index and SQL sandbox — right now they're shared singletons; a real product needs them scoped per team.
- **TLS, structured logging/metrics export (Prometheus), and a status page** — operational basics not built here.

None of this is hard, all of it is known work — it's the difference between "an impressively complete demo with real tests" (what this is) and "a service you'd trust with production traffic" (what it would need to become).
