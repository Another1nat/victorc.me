# Aegis AI Control Plane & Reliability Gateway — Master Architecture & Testing Guide

> **Branch:** `sep132026`  
> **Repository:** [victorc.me](file:///Volumes/MacSSD/victorc.me)  
> **Backend Engine:** `/gateway` (Python 3.11+ / FastAPI / AsyncIO / Pydantic v2)  
> **Frontend Showcase:** `/src/components/AegisGatewaySimulator.tsx` (Next.js 16 + React 19 + Tailwind CSS)

---

## 1. Executive Summary & Purpose

This repository houses an **Enterprise AI Reliability Gateway, Control Plane, and Applied Intelligence Suite**. It transitions software engineering past fragile, direct-API wrappers into a production-grade infrastructure platform.

It consolidates all **13 Senior AI Engineering Capabilities** into a modular **Hub & Spoke** architecture:

```
                               ┌─────────────────────────────────────────┐
                               │       Client / Ingress Application      │
                               └────────────────────┬────────────────────┘
                                                    │
                             ┌──────────────────────▼──────────────────────┐
                             │       AI RELIABILITY GATEWAY (HUB)         │
                             │  - Rate Limiting (Token Bucket RPM/TPM)    │
                             │  - Cost Autopilot (Semantic Model Routing) │
                             │  - Circuit Breakers & Auto-Failovers       │
                             │  - Prompt A/B Testing & Canary Flags       │
                             │  - Multi-Critic Output Arbitration         │
                             │  - OpenTelemetry Tracing & Forensics       │
                             └───────┬──────────────┬──────────────┬───────┘
                                     │              │              │
             ┌───────────────────────┘              │              └───────────────────────┐
             ▼                                      ▼                                      ▼
┌─────────────────────────┐            ┌─────────────────────────┐            ┌─────────────────────────┐
│     Hybrid RAG Spoke    │            │   Text-to-SQL AST Spoke │            │    LoRA Adapter Spoke   │
│  - BM25 + Dense RRF     │            │  - Read-only AST check  │            │  - Parameter efficiency │
│  - Verifiable citations │            │  - Zero SQL injection   │            │  - Task eval benchmarks │
└─────────────────────────┘            └─────────────────────────┘            └─────────────────────────┘
             │                                      │                                      │
             └──────────────────────────────────────┴──────────────────────────────────────┘
                                                    │
                             ┌──────────────────────▼──────────────────────┐
                             │       CONTINUOUS QUALITY FLYWHEEL           │
                             │  - Automated Eval Dataset Mining from Logs │
                             │  - Self-Healing Docs AST CI/CD Action       │
                             │  - Regression Testing Harness              │
                             └─────────────────────────────────────────────┘
```

---

## 2. Directory Layout & Module Index

```
victorc.me/
├── gateway/                             # Core Python Gateway & Control Plane
│   ├── main.py                          # FastAPI ASGI app (OpenAI-compatible /v1 endpoints)
│   ├── schemas.py                       # Pydantic v2 schemas for wire protocol & telemetry
│   ├── demo_cli.py                      # Master interactive CLI runner for all 8 systems
│   ├── requirements.txt                 # Dependencies (FastAPI, httpx, pydantic, pytest)
│   ├── README.md                        # Gateway standalone documentation
│   │
│   ├── engine/
│   │   ├── rate_limiter.py              # Token Bucket Rate Limiter (RPM, TPM, Spend Budgets)
│   │   ├── circuit_breaker.py           # Provider Circuit Breakers (CLOSED / OPEN / HALF-OPEN)
│   │   ├── router.py                    # Semantic Cost Autopilot & Failover Orchestrator
│   │   ├── arbitration.py               # Multi-Agent Critic Consensus & Confidence Scoring
│   │   ├── forensics.py                 # OpenTelemetry Tracing & Golden Eval Log Miner
│   │   └── experimentation.py          # Prompt A/B Testing & Canary Rollouts
│   │
│   ├── providers/
│   │   ├── base.py                      # Abstract Provider interface + Cost Calculator
│   │   ├── gemini_provider.py           # Google Gemini 2.0 Flash / 1.5 Pro
│   │   ├── openai_provider.py           # OpenAI GPT-4o / GPT-4o-mini
│   │   ├── anthropic_provider.py        # Anthropic Claude 3.5 Sonnet / Haiku
│   │   └── simulator.py                 # Deterministic local simulator for zero-cost offline testing
│   │
│   ├── spokes/
│   │   ├── sql_guardrails.py            # Text-to-SQL with AST Safety & Schema Hallucination Check
│   │   ├── hybrid_rag.py                # Sparse BM25 + Dense Vector Search + Citation Verification
│   │   ├── self_healing_docs.py         # AST Codebase vs Markdown Documentation Drift Detector
│   │   └── lora_pipeline.py             # PEFT/LoRA Parameter Calculator & Task Evaluation
│   │
│   └── tests/
│       └── test_gateway.py              # 15 automated unit tests (100% passing)
│
├── .github/workflows/
│   └── self-healing-docs.yml            # CI/CD Action for automated documentation synchronization
│
└── src/
    ├── components/
    │   └── AegisGatewaySimulator.tsx    # 5-Tab Interactive Control Plane Instrument on victorc.me
    └── data/
        └── blog.ts                      # Flagship Research Dissertation on AI Control Planes
```

---

## 3. The 13 Core Capabilities Mapping

| # | Project Name | Implementation File | Key Mechanism / Innovation |
|---|---|---|---|
| **1** | **Model Regression Detection** | `engine/router.py`, `tests/` | CI/CD testing against golden evaluation datasets on prompt/model changes. |
| **2** | **Cost Autopilot Router** | `engine/router.py` | Classifies query complexity; routes simple queries to Gemini Flash / 4o-mini, cutting costs 70–95%. |
| **3** | **Failure Forensics & Tracing** | `engine/forensics.py` | OpenTelemetry spans per hop (Ingress, Router, Model, Guardrails) isolating failure nodes. |
| **4** | **Self-Healing Technical Docs** | `spokes/self_healing_docs.py` | AST parsing of code vs markdown docs; detects drift and auto-generates git diff patches. |
| **5** | **Output Arbitration System** | `engine/arbitration.py` | Multi-critic consensus (Factuality, Safety, Completeness) generating calibrated confidence scores. |
| **6** | **Hybrid RAG with Citations** | `spokes/hybrid_rag.py` | BM25 sparse + dense embeddings fused via Reciprocal Rank Fusion (RRF) with line citations. |
| **7** | **Observability Telemetry** | `schemas.py`, `main.py` | Standardized `gateway_metadata` returned with provider, latency, and real-time dollar savings. |
| **8** | **Text-to-SQL with Guardrails** | `spokes/sql_guardrails.py` | AST validator forbidding destructive verbs (DROP, DELETE) and detecting schema hallucinations. |
| **9** | **Prompt Versioning & A/B** | `engine/experimentation.py` | Prompt-as-code versioning with weighted traffic distribution and significance metrics. |
| **10** | **LoRA Fine-Tuning Pipeline** | `spokes/lora_pipeline.py` | Parameter-efficient fine-tuning (PEFT) calculator, benchmark evaluation, and adapter export. |
| **11** | **LLM Gateway & Circuit Breaker**| `main.py`, `circuit_breaker.py` | Token-bucket rate limiting (RPM/TPM) and automated provider failover upon 5xx errors. |
| **12** | **Canary AI Feature Flags** | `engine/experimentation.py` | Non-binary canary rollouts with moving-average quality monitoring and automated rollback. |
| **13** | **Automated Eval Dataset Miner**| `engine/forensics.py` | Continuous log mining of anomalous/failed interactions into structured test datasets. |

---

## 4. How to Test and Run the System

### Step 1: Set Up the Environment

```bash
cd /Volumes/MacSSD/victorc.me/gateway
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 2: Run the Automated Pytest Suite (15 Tests)

Run the full automated test suite verifying all 15 modules:

```bash
./.venv/bin/pytest -v
```

*Expected output:*
```
tests/test_gateway.py::test_health_check PASSED
tests/test_gateway.py::test_model_listing PASSED
tests/test_gateway.py::test_non_streaming_completion PASSED
tests/test_gateway.py::test_streaming_sse_completion PASSED
tests/test_gateway.py::test_rate_limiter_rpm_enforcement PASSED
tests/test_gateway.py::test_circuit_breaker_automatic_fallback PASSED
tests/test_gateway.py::test_cost_autopilot_routing_and_savings PASSED
tests/test_gateway.py::test_sql_guardrails_blocks_destructive_commands PASSED
tests/test_gateway.py::test_sql_guardrails_executes_safe_select PASSED
tests/test_gateway.py::test_sql_guardrails_detects_schema_hallucination PASSED
tests/test_gateway.py::test_hybrid_rag_retrieval_and_citations PASSED
tests/test_gateway.py::test_multi_critic_arbitration_flags_safety_violation PASSED
tests/test_gateway.py::test_forensics_tracer_mines_eval_dataset_on_failure PASSED
tests/test_gateway.py::test_self_healing_docs_detects_signature_drift PASSED
tests/test_gateway.py::test_lora_pipeline_parameter_metrics_and_benchmarks PASSED
============================== 15 passed in ~1.0s ==============================
```

### Step 3: Run the Master Interactive CLI Demonstration

Execute the live demonstration script exercising all 8 core subsystems:

```bash
./.venv/bin/python demo_cli.py
```

### Step 4: Start the Live Gateway Server

```bash
./.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Test standard OpenAI completion via `curl`:
```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-team" \
  -d '{
    "model": "auto-cheapest",
    "messages": [{"role": "user", "content": "Explain KV-Cache in 1 sentence."}]
  }'
```

#### Test SSE Streaming via `curl`:
```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-team" \
  -d '{
    "model": "simulator-mock",
    "messages": [{"role": "user", "content": "Stream this test sequence"}],
    "stream": true
  }'
```

#### Inspect Gateway Telemetry & Circuit Breaker Health:
```bash
curl http://localhost:8000/v1/gateway/stats
curl http://localhost:8000/v1/gateway/traces
curl http://localhost:8000/v1/gateway/evals
```

---

## 5. Guide for Another AI (Cursor / Claude Code / Codex) to Test & Expand

If you hand this codebase to another AI agent (such as Claude Code, Cursor, or ChatGPT), copy and paste the prompt below to direct it:

```markdown
### Prompt for Another AI Agent:

"You are working on the repository at /Volumes/MacSSD/victorc.me on branch 'sep132026'.
Review AI_CONTROL_PLANE_MASTER_GUIDE.md.
The project contains an enterprise AI Reliability Gateway in /gateway (FastAPI + Pydantic v2) and an interactive simulator on the Next.js frontend in /src/components/AegisGatewaySimulator.tsx.

Please do the following:
1. Run `cd gateway && ./.venv/bin/pytest -v` to ensure all 15 tests are passing.
2. Run `npm run build` in the workspace root to ensure Next.js compiles with zero errors.
3. Choose one of the following expansion tasks:
   - [A] Add persistent Redis storage to `gateway/engine/rate_limiter.py` using `redis-py`.
   - [B] Add dynamic DSPy-style prompt compilation to `gateway/engine/experimentation.py`.
   - [C] Connect the Next.js `AegisGatewaySimulator.tsx` to an optional live backend toggle calling `http://localhost:8000/v1/chat/completions`.
4. Ensure new unit tests are added to `gateway/tests/test_gateway.py` with 100% pass rate."
```

---

## 6. Ideas for Future Expansions

1. **Persistent Redis Token Bucket:** Replace in-memory dictionaries in `rate_limiter.py` with Redis Lua scripts for multi-node horizontal scaling.
2. **vLLM / Local HuggingFace Provider:** Add a native `vllm_provider.py` to stream directly from local GPUs or RunPod serverless endpoints.
3. **Automated GitHub Bot PR Submitter:** Extend `self_healing_docs.py` using PyGithub to automatically open pull requests directly on GitHub when documentation drift is detected.
4. **DSPy Prompt Optimization:** Integrate DSPy teleprompters into `lora_pipeline.py` to auto-optimize system instructions based on mined evaluation traces.
