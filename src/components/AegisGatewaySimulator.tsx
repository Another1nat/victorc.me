"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ShieldCheck,
  Cpu,
  Database,
  Search,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Activity,
  RotateCcw,
  GitPullRequest,
  TrendingUp,
  Wifi,
  WifiOff,
  Server,
  FlaskConical,
  MessageSquareText,
} from "lucide-react";

import { GATEWAY_URL, getVisitorTeamId, postJSON, getJSON, errorMessage, formatParamCount } from "@/lib/aegisClient";

interface WaterfallSpan {
  name: string;
  durationMs: number;
  status: string;
  error?: string | null;
}

interface GatewaySimResult {
  source: "live" | "simulated";
  status: string;
  routedModel: string;
  provider: string;
  tokens: number;
  latencyMs: number;
  costUsd: number;
  costSavedUsd: number;
  savingsPercent: number;
  fallbacksTriggered: number;
  circuitState: string;
  confidenceScore: number | null;
  verdict: string | null;
  spans: WaterfallSpan[] | null;
  outputText?: string;
}

interface SqlResult {
  source: "live" | "simulated";
  status: "APPROVED" | "REJECTED";
  reason?: string | null;
  astType: string;
  executionTimeMs?: number;
  columns?: string[];
  rows?: Array<Array<string | number>>;
}

interface RagAnswer {
  source: "live" | "simulated";
  question: string;
  answer: string;
  verifiedSource?: string;
  sparseBM25Score?: number;
  denseSemanticScore?: number;
  fusedRRFScore?: number;
  citationStatus: string;
  confidenceScore: number;
}

interface DocsDriftResult {
  source: "live" | "simulated";
  totalDriftDetected: number;
  severity: string;
  itemType: string;
  description: string;
  diffPatch: string;
  healedMarkdown: string;
}

interface LoraMetrics {
  source: "live" | "simulated";
  model: string;
  rank: number;
  trainableParams: number;
  totalParams: number;
  trainablePercent: number | string;
  vramSavedGb: number;
  baseAccuracy: string;
  loraAccuracy: string;
  gain: string;
  latencyOverhead: string;
}

interface CapabilityEntry {
  id: string;
  name: string;
  status: string;
  detail: string;
  endpoint: string;
}

interface GoldenCaseResult {
  case_id: string;
  category: string;
  description: string;
  passed: boolean;
  duration_ms: number;
  observed: Record<string, unknown>;
  failures: string[];
  error?: string | null;
}

interface RegressionRunResult {
  run_id: string;
  timestamp: number;
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  newly_regressed: string[];
  newly_recovered: string[];
  is_regression: boolean;
  results: GoldenCaseResult[];
}

interface HealthData {
  overall_status: string;
  reasons: string[];
  circuit_breakers: Record<string, { state: string; failures: number }>;
  trace_anomaly_rate: number;
  recent_trace_count: number;
  rate_limiter: { active_rpm: number; max_rpm: number; spend_usd: number; budget_limit_usd: number };
  golden_eval_candidate_count: number;
  capability_registry: CapabilityEntry[];
}

function LiveBadge({ source }: { source: "live" | "simulated" }) {
  return source === "live" ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-emerald-950/50 text-emerald-400 border border-emerald-800/50">
      <Wifi className="w-2.5 h-2.5" /> Live Gateway
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-zinc-800/60 text-zinc-500 border border-zinc-700/50">
      Simulated
    </span>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 text-[11px] font-mono leading-relaxed">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function AegisGatewaySimulator() {
  const [activeTab, setActiveTab] = useState<"gateway" | "sql" | "rag" | "docs" | "lora" | "manager">("gateway");

  // Live backend connectivity
  const [liveBackend, setLiveBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"unknown" | "checking" | "online" | "offline">("unknown");

  const checkBackendHealth = useCallback(async () => {
    setBackendStatus("checking");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${GATEWAY_URL}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      setBackendStatus(res.ok ? "online" : "offline");
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  useEffect(() => {
    if (!liveBackend) return;
    // Deferred so the health check's setState calls don't land synchronously
    // within this effect's own render pass.
    const timer = setTimeout(() => {
      checkBackendHealth();
    }, 0);
    return () => clearTimeout(timer);
  }, [liveBackend, checkBackendHealth]);

  const useLive = liveBackend && backendStatus === "online";

  // Tab 1: Gateway & Cost Autopilot State
  const [selectedScenario, setSelectedScenario] = useState<"simple" | "complex" | "outage">("simple");
  const [costAutopilotEnabled, setCostAutopilotEnabled] = useState(true);
  const [circuitBreakerEnabled, setCircuitBreakerEnabled] = useState(true);
  const [arbitrationEnabled, setArbitrationEnabled] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<GatewaySimResult | null>(null);
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  // Tab 2: Text-to-SQL Guardrail State
  const [sqlMode, setSqlMode] = useState<"write" | "ask">("write");
  const [sqlQueryInput, setSqlQueryInput] = useState(
    "SELECT customer_name, plan_tier, monthly_mrr_usd FROM customer_subscriptions WHERE status = 'active';"
  );
  const [sqlQuestionInput, setSqlQuestionInput] = useState("which customers are currently active?");
  const [sqlResult, setSqlResult] = useState<SqlResult | null>(null);
  const [sqlTranslation, setSqlTranslation] = useState<{ matchedIntent: string; confidence: number; explanation: string } | null>(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Tab 3: Hybrid RAG State
  const [ragQuery, setRagQuery] = useState("How does KV-Cache PagedAttention prevent GPU VRAM fragmentation?");
  const [ragAnswer, setRagAnswer] = useState<RagAnswer | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);

  // Tab 4: Self-Healing Docs State
  const [docsCode, setDocsCode] = useState(`def update_rate_limit(team_id: str, max_rpm: int, max_tpm: int, new_budget: float = 100.0):\n    """Updates rate limits and spend ceiling for a team."""\n    return True`);
  const [docsMarkdown, setDocsMarkdown] = useState(`### \`update_rate_limit(team_id, max_rpm)\`\nUpdates the rate limits for a given team.`);
  const [docsDriftResult, setDocsDriftResult] = useState<DocsDriftResult | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  // Tab 5: LoRA Fine-Tuning State
  const [loraRank, setLoraRank] = useState(16);
  const [selectedLoraModel, setSelectedLoraModel] = useState("llama-3-8b-instruct");
  const [loraMetrics, setLoraMetrics] = useState<LoraMetrics | null>(null);
  const [loraLoading, setLoraLoading] = useState(false);
  const [loraError, setLoraError] = useState<string | null>(null);

  // Tab 6: Control Plane Manager State
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [regressionResult, setRegressionResult] = useState<RegressionRunResult | null>(null);
  const [managerLoading, setManagerLoading] = useState(false);
  const [regressionLoading, setRegressionLoading] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);

  // --- Simulated fixture data (used when Live Backend is off, or as a graceful fallback) ---

  function getSimulatedGatewayResult() {
    if (selectedScenario === "simple") {
      return {
        source: "simulated" as const,
        status: "SUCCESS",
        routedModel: costAutopilotEnabled ? "gemini-2.0-flash" : "gpt-4o",
        provider: costAutopilotEnabled ? "Google Gemini" : "OpenAI",
        tokens: 142,
        latencyMs: costAutopilotEnabled ? 48 : 280,
        costUsd: costAutopilotEnabled ? 0.00003 : 0.00071,
        costSavedUsd: costAutopilotEnabled ? 0.00068 : 0.0,
        savingsPercent: costAutopilotEnabled ? 95.7 : 0.0,
        fallbacksTriggered: 0,
        circuitState: "CLOSED",
        confidenceScore: arbitrationEnabled ? 0.98 : null,
        verdict: arbitrationEnabled ? "APPROVED" : "UNINSPECTED",
        spans: [
          { name: "ingress", durationMs: 2.1, status: "SUCCESS" },
          { name: "token_bucket_check", durationMs: 0.8, status: "SUCCESS" },
          { name: "complexity_classifier", durationMs: 4.2, status: "SUCCESS" },
          { name: "model_dispatch", durationMs: costAutopilotEnabled ? 38.5 : 265.0, status: "SUCCESS" },
          { name: "critic_arbitration", durationMs: arbitrationEnabled ? 4.1 : 0.0, status: arbitrationEnabled ? "SUCCESS" : "SKIPPED" },
        ],
      };
    } else if (selectedScenario === "outage") {
      return {
        source: "simulated" as const,
        status: circuitBreakerEnabled ? "RECOVERED_VIA_FALLBACK" : "FAILED",
        routedModel: circuitBreakerEnabled ? "gemini-2.0-flash (Fallback)" : "openai-failed",
        provider: circuitBreakerEnabled ? "Google Gemini (Auto-Failover)" : "OpenAI (Primary 503)",
        tokens: 280,
        latencyMs: circuitBreakerEnabled ? 74 : 1240,
        costUsd: 0.00008,
        costSavedUsd: 0.0014,
        savingsPercent: 94.6,
        fallbacksTriggered: circuitBreakerEnabled ? 1 : 0,
        circuitState: circuitBreakerEnabled ? "OPEN (Tripped on Primary)" : "FAILED",
        confidenceScore: arbitrationEnabled ? 0.96 : null,
        verdict: circuitBreakerEnabled ? "APPROVED" : "PROVIDER_OUTAGE_503",
        spans: [
          { name: "ingress", durationMs: 2.3, status: "SUCCESS" },
          { name: "primary_dispatch_openai", durationMs: 25.1, status: "FAILED", error: "503 Service Unavailable" },
          { name: "circuit_breaker_trip", durationMs: 1.2, status: "TRIPPED" },
          { name: "fallback_dispatch_gemini", durationMs: 42.4, status: "SUCCESS" },
          { name: "critic_arbitration", durationMs: arbitrationEnabled ? 3.8 : 0.0, status: "SUCCESS" },
        ],
      };
    }
    return {
      source: "simulated" as const,
      status: "SUCCESS",
      routedModel: "claude-3-5-sonnet",
      provider: "Anthropic",
      tokens: 890,
      latencyMs: 420,
      costUsd: 0.0042,
      costSavedUsd: 0.0022,
      savingsPercent: 34.3,
      fallbacksTriggered: 0,
      circuitState: "CLOSED",
      confidenceScore: arbitrationEnabled ? 0.99 : null,
      verdict: "APPROVED",
      spans: [
        { name: "ingress", durationMs: 1.9, status: "SUCCESS" },
        { name: "complexity_classifier", durationMs: 5.1, status: "SUCCESS" },
        { name: "reasoning_route_anthropic", durationMs: 408.2, status: "SUCCESS" },
        { name: "critic_arbitration", durationMs: 4.8, status: "SUCCESS" },
      ],
    };
  }

  // Guards every dispatch handler against rapid double-clicks: `disabled={loading}`
  // alone isn't enough, because the DOM attribute only updates after React
  // re-renders, which is slower than a real user's second click (or a batch of
  // programmatic ones) — confirmed live: 5 fast clicks fired 5 separate
  // in-flight requests despite the button being visually "disabled" after the
  // first. This ref is checked synchronously, with no render in between.
  const inFlightRef = useRef<Record<string, boolean>>({});
  function guardedAction(key: string, fn: () => Promise<void> | void) {
    return async () => {
      if (inFlightRef.current[key]) return;
      inFlightRef.current[key] = true;
      try {
        await fn();
      } finally {
        inFlightRef.current[key] = false;
      }
    };
  }

  // Trigger Gateway Simulation (live fetch to FastAPI, or local fixture data)
  const handleRunGatewaySimInner = async () => {
    setIsSimulating(true);
    setGatewayError(null);

    if (useLive) {
      try {
        const scenarioModel =
          selectedScenario === "outage"
            ? circuitBreakerEnabled
              ? "demo-outage"
              : "demo-outage-no-fallback"
            : selectedScenario === "complex"
              ? "auto-cheapest"
              : costAutopilotEnabled
                ? "auto-cheapest"
                : "gpt-4o";

        const promptText =
          selectedScenario === "complex"
            ? "Please analyze this distributed system architecture for reliability, cost, and failure isolation in depth."
            : selectedScenario === "outage"
              ? "Simulate a primary provider 503 outage and verify automatic failover."
              : "What is 2 + 2?";

        const data = await postJSON("/v1/chat/completions", {
          model: scenarioModel,
          messages: [{ role: "user", content: promptText }],
          enable_arbitration: arbitrationEnabled,
          team_id: getVisitorTeamId(),
        });

        const meta = data.gateway_metadata || {};
        let spans: WaterfallSpan[] | null = null;
        if (meta.trace_id) {
          try {
            const trace = await getJSON(`/v1/gateway/traces/${meta.trace_id}`);
            spans = trace.spans.map(
              (s: { name: string; duration_ms: number; status: string; error?: string | null }) => ({
                name: s.name,
                durationMs: s.duration_ms,
                status: s.status,
                error: s.error,
              })
            );
          } catch {
            spans = null;
          }
        }

        const totalCostBasis = (meta.cost_saved_usd || 0) + (meta.estimated_cost_usd || 0);
        setSimulationResult({
          source: "live",
          status: meta.fallbacks_triggered > 0 ? "RECOVERED_VIA_FALLBACK" : "SUCCESS",
          routedModel: data.model,
          provider: meta.provider_used,
          tokens: data.usage?.total_tokens ?? 0,
          latencyMs: meta.latency_ms,
          costUsd: meta.estimated_cost_usd,
          costSavedUsd: meta.cost_saved_usd,
          savingsPercent: totalCostBasis > 0 ? Math.round((meta.cost_saved_usd / totalCostBasis) * 1000) / 10 : 0,
          fallbacksTriggered: meta.fallbacks_triggered,
          circuitState: meta.fallbacks_triggered > 0 ? "OPEN (Tripped on Primary)" : "CLOSED",
          confidenceScore: meta.confidence_score,
          verdict: meta.arbitration_verdict,
          spans,
          outputText: data.choices?.[0]?.message?.content,
        });
      } catch (e) {
        setGatewayError(`Live gateway call failed (${errorMessage(e)}). Showing simulated result instead — is "uvicorn main:app --port 8420" running?`);
        setSimulationResult(getSimulatedGatewayResult());
      } finally {
        setIsSimulating(false);
      }
      return;
    }

    setTimeout(() => {
      setIsSimulating(false);
      setSimulationResult(getSimulatedGatewayResult());
    }, 450);
  };
  const handleRunGatewaySim = guardedAction("gateway", handleRunGatewaySimInner);

  // Run SQL Guardrail Check (write-your-own-SQL mode)
  const handleRunSQLInner = async () => {
    setSqlError(null);
    setSqlTranslation(null);
    const q = sqlQueryInput.trim();

    if (useLive) {
      setSqlLoading(true);
      try {
        const data = await postJSON("/v1/spokes/sql/execute", { query: q });
        setSqlResult({
          source: "live",
          status: data.success ? "APPROVED" : "REJECTED",
          reason: data.error,
          astType: data.success ? "SAFE_READ_ONLY_SELECT" : "AST_VALIDATION_REJECTED",
          executionTimeMs: data.execution_time_ms,
          rows: data.success ? data.rows : undefined,
          columns: data.columns,
        });
      } catch (e) {
        setSqlError(`Live SQL guardrail call failed (${errorMessage(e)}). Showing local validation instead.`);
        runSimulatedSQL(q);
      } finally {
        setSqlLoading(false);
      }
      return;
    }

    runSimulatedSQL(q);
  };
  const handleRunSQL = guardedAction("sql", handleRunSQLInner);

  // Project 8 (half 1 of 2): plain-English question -> translated SQL -> validated + executed
  const handleAskSQLInner = async () => {
    setSqlError(null);
    const question = sqlQuestionInput.trim();
    if (!question) return;

    if (!useLive) {
      setSqlError("Plain-English translation requires the Live Backend — the intent-rule translator only runs in the Python gateway. Enable Live Backend above, or switch to Write SQL mode.");
      return;
    }

    setSqlLoading(true);
    try {
      const data = await postJSON("/v1/spokes/sql/ask", { question });
      const t = data.translation;
      const e = data.execution;
      setSqlTranslation({
        matchedIntent: t.matched_intent,
        confidence: t.translation_confidence,
        explanation: t.explanation,
      });
      setSqlQueryInput(t.sql_query || "");
      if (!t.sql_query) {
        setSqlResult(null);
      } else {
        setSqlResult({
          source: "live",
          status: e?.success ? "APPROVED" : "REJECTED",
          reason: e?.error,
          astType: e?.success ? "SAFE_READ_ONLY_SELECT" : "AST_VALIDATION_REJECTED",
          executionTimeMs: e?.execution_time_ms,
          rows: e?.success ? e.rows : undefined,
          columns: e?.columns,
        });
      }
    } catch (e) {
      setSqlError(`Live NL-to-SQL call failed (${errorMessage(e)}).`);
    } finally {
      setSqlLoading(false);
    }
  };
  const handleAskSQL = guardedAction("sqlAsk", handleAskSQLInner);

  function runSimulatedSQL(q: string) {
    if (q.includes(";") && q.indexOf(";") < q.length - 1) {
      setSqlResult({
        source: "simulated",
        status: "REJECTED",
        reason: "Security Violation: Multiple stacked SQL statements detected.",
        astType: "BLOCK_STACKED_INJECTION",
      });
      return;
    }
    const upper = q.toUpperCase();
    if (!upper.startsWith("SELECT")) {
      setSqlResult({
        source: "simulated",
        status: "REJECTED",
        reason: "AST Enforcement: Only read-only SELECT queries are permitted.",
        astType: "DENY_NON_SELECT",
      });
      return;
    }
    if (upper.includes("DROP") || upper.includes("DELETE") || upper.includes("TRUNCATE") || upper.includes("ALTER")) {
      setSqlResult({
        source: "simulated",
        status: "REJECTED",
        reason: "Security Violation: Destructive DDL/DML token intercepted by AST validator.",
        astType: "BLOCK_DESTRUCTIVE_TOKEN",
      });
      return;
    }
    if (upper.includes("PAYROLL") || upper.includes("SECRET")) {
      setSqlResult({
        source: "simulated",
        status: "REJECTED",
        reason: "Schema Hallucination: Referenced table does not exist in verified catalog.",
        astType: "SCHEMA_HALLUCINATION_DETECTED",
      });
      return;
    }

    setSqlResult({
      source: "simulated",
      status: "APPROVED",
      astType: "SAFE_READ_ONLY_SELECT",
      executionTimeMs: 1.4,
      columns: ["customer_name", "plan_tier", "monthly_mrr_usd"],
      rows: [
        ["Acme Corp", "Enterprise", 4500],
        ["Starlight AI", "Pro", 899],
        ["QuantFlow", "Enterprise", 6200],
      ],
    });
  }

  // Run Hybrid RAG Search
  const handleRunRAGInner = async () => {
    setRagError(null);
    if (useLive) {
      setRagLoading(true);
      try {
        const data = await postJSON("/v1/spokes/rag/query", { query: ragQuery });
        const top = data.top_matches?.[0];
        setRagAnswer({
          source: "live",
          question: data.question,
          answer: data.answer_text,
          verifiedSource: data.cited_chunks?.[0],
          sparseBM25Score: top?.sparse_score,
          denseSemanticScore: top?.dense_score,
          fusedRRFScore: top?.rrf_score,
          citationStatus: data.citations_verified ? "VERIFIED_100%" : "UNVERIFIED",
          confidenceScore: data.confidence_score,
        });
      } catch (e) {
        setRagError(`Live RAG call failed (${errorMessage(e)}). Showing cached demo answer instead.`);
        runSimulatedRAG();
      } finally {
        setRagLoading(false);
      }
      return;
    }
    runSimulatedRAG();
  };
  const handleRunRAG = guardedAction("rag", handleRunRAGInner);

  function runSimulatedRAG() {
    setRagAnswer({
      source: "simulated",
      question: ragQuery,
      answer: "According to [doc-arch-01:L14-L22], KV-Cache memory scales linearly with sequence length O(s) and context windows. In multi-tenant inference, PagedAttention partitions KV blocks across GPU VRAM to prevent allocation fragmentation.",
      verifiedSource: "doc-arch-01",
      sparseBM25Score: 0.884,
      denseSemanticScore: 0.941,
      fusedRRFScore: 0.0328,
      citationStatus: "VERIFIED_100%",
      confidenceScore: 0.98,
    });
  }

  // Run Self-Healing Docs AST Check
  const handleRunDocsCheckInner = async () => {
    setDocsError(null);
    if (useLive) {
      setDocsLoading(true);
      try {
        const data = await postJSON("/v1/spokes/docs/analyze-drift", { code: docsCode, markdown: docsMarkdown });
        const first = data.drift_items?.[0];
        setDocsDriftResult({
          source: "live",
          totalDriftDetected: data.total_drift_detected,
          severity: first?.severity ?? "NONE",
          itemType: first?.item_type ?? "SYNCHRONIZED",
          description: first ? first.description : "No drift detected — documentation matches the current AST signatures.",
          diffPatch: first?.suggested_patch ?? "(no patch — already synchronized)",
          healedMarkdown: data.healed_doc_content,
        });
      } catch (e) {
        setDocsError(`Live AST drift check failed (${errorMessage(e)}). Showing cached demo result instead.`);
        runSimulatedDocs();
      } finally {
        setDocsLoading(false);
      }
      return;
    }
    runSimulatedDocs();
  };
  const handleRunDocsCheck = guardedAction("docs", handleRunDocsCheckInner);

  function runSimulatedDocs() {
    setDocsDriftResult({
      source: "simulated",
      totalDriftDetected: 1,
      severity: "HIGH",
      itemType: "PARAMETER_MISMATCH",
      description: "Parameters ['max_tpm', 'new_budget'] added in code but missing from documentation.",
      diffPatch: "- `update_rate_limit(team_id, max_rpm)\n+ update_rate_limit(team_id, max_rpm, max_tpm, new_budget)",
      healedMarkdown: docsMarkdown.replace("update_rate_limit(team_id, max_rpm)", "update_rate_limit(team_id, max_rpm, max_tpm, new_budget)"),
    });
  }

  // Run LoRA Parameter Efficiency Calculation
  const handleRunLoRAInner = async () => {
    setLoraError(null);
    if (useLive) {
      setLoraLoading(true);
      try {
        const data = await postJSON("/v1/spokes/lora/compute", { model_name: selectedLoraModel, rank: loraRank });
        setLoraMetrics({
          source: "live",
          model: data.model,
          rank: data.rank,
          trainableParams: data.parameter_metrics.trainable_params,
          totalParams: data.parameter_metrics.total_params,
          trainablePercent: data.parameter_metrics.trainable_percent,
          vramSavedGb: data.parameter_metrics.vram_saved_gb,
          baseAccuracy: `${(data.benchmark.base_model_accuracy * 100).toFixed(1)}%`,
          loraAccuracy: `${(data.benchmark.lora_model_accuracy * 100).toFixed(1)}%`,
          gain: `+${data.benchmark.accuracy_gain_percent.toFixed(1)}%`,
          latencyOverhead: `+${(((data.benchmark.lora_avg_latency_ms - data.benchmark.base_avg_latency_ms) / data.benchmark.base_avg_latency_ms) * 100).toFixed(1)}%`,
        });
      } catch (e) {
        setLoraError(`Live LoRA compute call failed (${errorMessage(e)}). Showing local calculation instead.`);
        runSimulatedLoRA();
      } finally {
        setLoraLoading(false);
      }
      return;
    }
    runSimulatedLoRA();
  };
  const handleRunLoRA = guardedAction("lora", handleRunLoRAInner);

  function runSimulatedLoRA() {
    // Mirrors gateway/spokes/lora_pipeline.py's real math so the offline fallback
    // doesn't silently give a different (and wrong, for non-Llama models) answer
    // than the live backend does.
    const ARCH: Record<string, { totalParams: number; dModel: number; numLayers: number; baseAcc: number }> = {
      "llama-3-8b-instruct": { totalParams: 8_030_000_000, dModel: 4096, numLayers: 32, baseAcc: 0.625 },
      "mistral-7b-v0.3": { totalParams: 7_240_000_000, dModel: 4096, numLayers: 32, baseAcc: 0.610 },
      "gemma-2-9b-it": { totalParams: 9_240_000_000, dModel: 3584, numLayers: 42, baseAcc: 0.605 },
    };
    const arch = ARCH[selectedLoraModel] ?? ARCH["llama-3-8b-instruct"];
    const loraTrainable = 2 * loraRank * arch.dModel * arch.numLayers * 4;
    const trainablePercent = ((loraTrainable / arch.totalParams) * 100).toFixed(3);
    const vramSavedGb = Math.round((arch.totalParams * (30.0 / 8_030_000_000)) * 10) / 10;

    const RANK_REFERENCE = 64;
    const MAX_GAIN = 0.34;
    const capacityRatio = Math.min(1.0, Math.log2(Math.max(1, loraRank)) / Math.log2(RANK_REFERENCE));
    const loraAcc = Math.min(0.97, arch.baseAcc + MAX_GAIN * capacityRatio);
    const gainPercent = ((loraAcc - arch.baseAcc) / arch.baseAcc) * 100;
    const baseLatency = 310.5;
    const loraLatency = baseLatency * (1 + 0.003 * loraRank);

    setLoraMetrics({
      source: "simulated",
      model: selectedLoraModel,
      rank: loraRank,
      trainableParams: loraTrainable,
      totalParams: arch.totalParams,
      trainablePercent: trainablePercent,
      vramSavedGb,
      baseAccuracy: `${(arch.baseAcc * 100).toFixed(1)}%`,
      loraAccuracy: `${(loraAcc * 100).toFixed(1)}%`,
      gain: `+${gainPercent.toFixed(1)}%`,
      latencyOverhead: `+${(((loraLatency - baseLatency) / baseLatency) * 100).toFixed(1)}%`,
    });
  }

  // Tab 6: Control Plane Manager — real system health, requires Live Backend.
  const handleFetchHealthInner = async () => {
    setManagerError(null);
    if (!useLive) {
      setManagerError("System health is read directly from the live gateway's in-memory state — enable Live Backend above to fetch it.");
      return;
    }
    setManagerLoading(true);
    try {
      const data = await getJSON(`/v1/manager/health?team_id=${encodeURIComponent(getVisitorTeamId())}`);
      setHealthData(data as HealthData);
    } catch (e) {
      setManagerError(`Failed to fetch system health (${errorMessage(e)}).`);
    } finally {
      setManagerLoading(false);
    }
  };
  const handleFetchHealth = guardedAction("health", handleFetchHealthInner);

  const handleRunRegressionSuiteInner = async () => {
    setManagerError(null);
    if (!useLive) {
      setManagerError("The regression suite runs the real golden cases against the live gateway — enable Live Backend above to run it.");
      return;
    }
    setRegressionLoading(true);
    try {
      const data = await postJSON("/v1/manager/regression/run", {});
      setRegressionResult(data as RegressionRunResult);
      handleFetchHealth();
    } catch (e) {
      setManagerError(`Regression suite run failed (${errorMessage(e)}).`);
    } finally {
      setRegressionLoading(false);
    }
  };
  const handleRunRegressionSuite = guardedAction("regression", handleRunRegressionSuiteInner);

  useEffect(() => {
    if (activeTab === "manager" && useLive && !healthData) {
      const timer = setTimeout(() => {
        handleFetchHealth();
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, useLive]);

  return (
    <section id="ai-gateway-control-plane" className="py-20 border-t border-zinc-800/60 relative">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-[#d4af37] bg-zinc-900 border border-zinc-800 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              AI Reliability Control Plane & Gateway
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif-luxury font-normal text-white">
              Aegis AI Reliability Engine
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl font-light leading-relaxed">
              An open-architecture AI Gateway and Control Plane featuring circuit-breaker failovers, semantic cost routing, AST-based SQL guardrails, and hybrid retrieval with citation grounding.
            </p>
          </div>

          {/* Live Backend Toggle */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
              <input
                type="checkbox"
                checked={liveBackend}
                onChange={(e) => setLiveBackend(e.target.checked)}
                className="accent-[#d4af37] rounded"
              />
              <span className="text-zinc-300">Live Backend</span>
            </label>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              {!liveBackend ? (
                <span className="text-zinc-600">Using simulated fixtures</span>
              ) : backendStatus === "checking" ? (
                <span className="flex items-center gap-1 text-zinc-500">
                  <RotateCcw className="w-3 h-3 animate-spin" /> Checking {GATEWAY_URL}…
                </span>
              ) : backendStatus === "online" ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3 h-3" /> Connected to {GATEWAY_URL}
                </span>
              ) : (
                <button onClick={checkBackendHealth} className="flex items-center gap-1 text-red-400 hover:text-red-300">
                  <WifiOff className="w-3 h-3" /> Unreachable — retry
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 mb-6 gap-2 sm:gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("gateway")}
            className={`pb-3 text-xs sm:text-sm font-mono transition-colors flex items-center gap-2 ${
              activeTab === "gateway"
                ? "text-[#d4af37] border-b-2 border-[#d4af37] font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cpu className="w-4 h-4" />
            1. Cost Routing & Circuit Breakers
          </button>
          <button
            onClick={() => setActiveTab("sql")}
            className={`pb-3 text-xs sm:text-sm font-mono transition-colors flex items-center gap-2 ${
              activeTab === "sql"
                ? "text-[#d4af37] border-b-2 border-[#d4af37] font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Database className="w-4 h-4" />
            2. Text-to-SQL Guardrails (AST)
          </button>
          <button
            onClick={() => setActiveTab("rag")}
            className={`pb-3 text-xs sm:text-sm font-mono transition-colors flex items-center gap-2 ${
              activeTab === "rag"
                ? "text-[#d4af37] border-b-2 border-[#d4af37] font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Search className="w-4 h-4" />
            3. Hybrid RAG & Citations
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`pb-3 text-xs sm:text-sm font-mono transition-colors flex items-center gap-2 ${
              activeTab === "docs"
                ? "text-[#d4af37] border-b-2 border-[#d4af37] font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <GitPullRequest className="w-4 h-4" />
            4. Self-Healing Docs (AST)
          </button>
          <button
            onClick={() => setActiveTab("lora")}
            className={`pb-3 text-xs sm:text-sm font-mono transition-colors flex items-center gap-2 ${
              activeTab === "lora"
                ? "text-[#d4af37] border-b-2 border-[#d4af37] font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            5. LoRA Fine-Tuning
          </button>
          <button
            onClick={() => setActiveTab("manager")}
            className={`pb-3 text-xs sm:text-sm font-mono transition-colors flex items-center gap-2 ${
              activeTab === "manager"
                ? "text-[#d4af37] border-b-2 border-[#d4af37] font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Server className="w-4 h-4" />
            6. Control Plane Manager
          </button>
        </div>

        {/* Panel Container */}
        <div className="luxury-panel rounded-2xl p-6 sm:p-8 border border-zinc-800/80 space-y-6">
          {/* TAB 1: GATEWAY & COST AUTOPILOT */}
          {activeTab === "gateway" && (
            <div className="space-y-6">
              {/* Scenario Presets */}
              <div>
                <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                  Select Traffic Scenario
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedScenario("simple")}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      selectedScenario === "simple"
                        ? "border-[#d4af37] bg-zinc-900 text-white"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-semibold text-zinc-200 mb-0.5">Simple Prompt</div>
                    <div className="text-[11px] text-zinc-500">Routes to low-cost model (95% savings)</div>
                  </button>
                  <button
                    onClick={() => setSelectedScenario("complex")}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      selectedScenario === "complex"
                        ? "border-[#d4af37] bg-zinc-900 text-white"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-semibold text-zinc-200 mb-0.5">Complex Architecture</div>
                    <div className="text-[11px] text-zinc-500">Routes to Tier-1 reasoning model</div>
                  </button>
                  <button
                    onClick={() => setSelectedScenario("outage")}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      selectedScenario === "outage"
                        ? "border-amber-500 bg-zinc-900 text-white"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-semibold text-amber-400 mb-0.5">Simulated 503 Outage</div>
                    <div className="text-[11px] text-zinc-500">Trips circuit & auto-failovers</div>
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-zinc-800/60 text-xs font-mono">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={costAutopilotEnabled}
                    onChange={(e) => setCostAutopilotEnabled(e.target.checked)}
                    className="accent-[#d4af37] rounded"
                  />
                  <span>Cost Autopilot</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={circuitBreakerEnabled}
                    onChange={(e) => setCircuitBreakerEnabled(e.target.checked)}
                    className="accent-[#d4af37] rounded"
                  />
                  <span>Circuit Breaker Fallback</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={arbitrationEnabled}
                    onChange={(e) => setArbitrationEnabled(e.target.checked)}
                    className="accent-[#d4af37] rounded"
                  />
                  <span>Multi-Critic Evals</span>
                </label>
              </div>

              {/* Dispatch Action */}
              <div>
                <button
                  onClick={handleRunGatewaySim}
                  disabled={isSimulating}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSimulating ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      Evaluating Gateway Middleware...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Dispatch Request Through Gateway
                    </>
                  )}
                </button>
              </div>

              <ErrorBanner message={gatewayError} />

              {/* Results Display */}
              {simulationResult && (
                <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${simulationResult.status.includes("SUCCESS") || simulationResult.status.includes("RECOVERED") ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className="font-mono text-xs text-white font-semibold">{simulationResult.provider}</span>
                      <span className="text-zinc-500 text-xs font-mono">({simulationResult.routedModel})</span>
                      <LiveBadge source={simulationResult.source} />
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-zinc-400">{simulationResult.latencyMs}ms</span>
                      {simulationResult.costSavedUsd > 0 && (
                        <span className="text-emerald-400 font-semibold">
                          -${simulationResult.costSavedUsd.toFixed(5)} ({simulationResult.savingsPercent}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Waterfall Spans */}
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-2">
                      OpenTelemetry Span Waterfall
                    </span>
                    {simulationResult.spans ? (
                      <div className="space-y-1.5 font-mono text-[11px]">
                        {simulationResult.spans.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1 px-2.5 rounded bg-zinc-900/80 border border-zinc-800/40">
                            <span className="text-zinc-300 flex items-center gap-1.5">
                              {s.status === "FAILED" ? (
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                              ) : s.status === "TRIPPED" ? (
                                <Zap className="w-3 h-3 text-amber-400" />
                              ) : s.status === "SKIPPED" ? (
                                <Activity className="w-3 h-3 text-zinc-500" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              )}
                              {s.name}
                            </span>
                            <span className="text-zinc-500">{s.durationMs}ms</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-zinc-600 italic py-1">
                        Waterfall unavailable for this response.
                      </div>
                    )}
                  </div>

                  {simulationResult.outputText && (
                    <div className="pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-400 leading-relaxed">
                      <span className="text-zinc-500 block mb-1">Provider Output:</span>
                      {simulationResult.outputText}
                    </div>
                  )}

                  {/* Arbitration & Confidence */}
                  {simulationResult.confidenceScore && (
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs font-mono">
                      <span className="text-zinc-400">Multi-Critic Consensus Score:</span>
                      <span className="text-[#d4af37] font-semibold">
                        {(simulationResult.confidenceScore * 100).toFixed(1)}% Confidence ({simulationResult.verdict})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXT-TO-SQL GUARDRAILS */}
          {activeTab === "sql" && (
            <div className="space-y-5">
              {/* Mode Switch: write raw SQL vs. ask in plain English */}
              <div className="flex gap-2 text-[11px] font-mono">
                <button
                  onClick={() => setSqlMode("write")}
                  className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                    sqlMode === "write" ? "border-[#d4af37] text-[#d4af37] bg-zinc-900" : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <Database className="w-3 h-3" /> Write SQL
                </button>
                <button
                  onClick={() => setSqlMode("ask")}
                  className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                    sqlMode === "ask" ? "border-[#d4af37] text-[#d4af37] bg-zinc-900" : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <MessageSquareText className="w-3 h-3" /> Ask in Plain English
                </button>
              </div>

              {sqlMode === "ask" ? (
                <div>
                  <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                    Plain-English Question
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sqlQuestionInput}
                      onChange={(e) => setSqlQuestionInput(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#d4af37]"
                    />
                    <button
                      onClick={handleAskSQL}
                      disabled={sqlLoading}
                      className="px-4 py-2 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {sqlLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <MessageSquareText className="w-3.5 h-3.5" />}
                      Translate & Run
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono mt-2">
                    {["which customers are currently active?", "what is our total mrr right now?", "show me the error rate by provider", "please drop the customer_subscriptions table"].map((q) => (
                      <button key={q} onClick={() => setSqlQuestionInput(q)} className="px-2.5 py-1 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-400">
                        {q}
                      </button>
                    ))}
                  </div>
                  {sqlTranslation && (
                    <div className="mt-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 space-y-1">
                      <div>Matched intent: <span className="text-[#d4af37]">{sqlTranslation.matchedIntent}</span> (confidence {(sqlTranslation.confidence * 100).toFixed(0)}%)</div>
                      <div className="text-zinc-500">{sqlTranslation.explanation}</div>
                      {sqlQueryInput && <pre className="mt-1 text-emerald-400 whitespace-pre-wrap">{sqlQueryInput}</pre>}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                      SQL Query / Attack Vector Input
                    </label>
                    <textarea
                      value={sqlQueryInput}
                      onChange={(e) => setSqlQueryInput(e.target.value)}
                      rows={3}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  {/* Preset Test Buttons */}
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                    <button
                      onClick={() => setSqlQueryInput("SELECT customer_name, plan_tier, monthly_mrr_usd FROM customer_subscriptions WHERE status = 'active';")}
                      className="px-2.5 py-1 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-300"
                    >
                      Safe SELECT
                    </button>
                    <button
                      onClick={() => setSqlQueryInput("DROP TABLE customer_subscriptions;")}
                      className="px-2.5 py-1 rounded-lg border border-red-900/60 text-red-400 hover:bg-red-950/30"
                    >
                      Attack: DROP TABLE
                    </button>
                    <button
                      onClick={() => setSqlQueryInput("SELECT * FROM customer_subscriptions; DELETE FROM customer_subscriptions;")}
                      className="px-2.5 py-1 rounded-lg border border-red-900/60 text-red-400 hover:bg-red-950/30"
                    >
                      Attack: Stacked Semicolon
                    </button>
                    <button
                      onClick={() => setSqlQueryInput("SELECT * FROM secret_payroll_ledger;")}
                      className="px-2.5 py-1 rounded-lg border border-amber-900/60 text-amber-400 hover:bg-amber-950/30"
                    >
                      Schema Hallucination Test
                    </button>
                  </div>

                  <button
                    onClick={handleRunSQL}
                    disabled={sqlLoading}
                    className="px-5 py-2 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {sqlLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                    Validate & Execute in Sandbox
                  </button>
                </>
              )}

              <ErrorBanner message={sqlError} />

              {/* SQL Result Output */}
              {sqlResult && (
                <div className={`p-4 rounded-xl border text-xs font-mono space-y-3 ${
                  sqlResult.status === "APPROVED"
                    ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-200"
                    : "bg-red-950/20 border-red-800/40 text-red-200"
                }`}>
                  <div className="flex items-center justify-between font-semibold flex-wrap gap-2">
                    <span className="flex items-center gap-2">
                      {sqlResult.status === "APPROVED" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      )}
                      Verdict: {sqlResult.status} ({sqlResult.astType})
                      <LiveBadge source={sqlResult.source} />
                    </span>
                    {sqlResult.executionTimeMs != null && <span>{sqlResult.executionTimeMs}ms</span>}
                  </div>

                  {sqlResult.reason && (
                    <div className="text-zinc-400 text-[11px] leading-relaxed">
                      {sqlResult.reason}
                    </div>
                  )}

                  {sqlResult.rows && (
                    <div className="overflow-x-auto pt-2 border-t border-zinc-800/60">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-zinc-500 border-b border-zinc-800">
                            {(sqlResult.columns ?? sqlResult.rows[0]?.map((_, i) => `col_${i}`) ?? []).map((col) => (
                              <th key={col} className="pb-1 pr-4 whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sqlResult.rows.map((row, i) => (
                            <tr key={i} className="border-b border-zinc-800/30 text-zinc-300">
                              {row.map((cell, j) => (
                                <td key={j} className="py-1 pr-4 whitespace-nowrap">{String(cell)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HYBRID RAG */}
          {activeTab === "rag" && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                  Technical Documentation Query
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#d4af37]"
                  />
                  <button
                    onClick={handleRunRAG}
                    disabled={ragLoading}
                    className="px-4 py-2 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {ragLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Query
                  </button>
                </div>
              </div>

              <ErrorBanner message={ragError} />

              {ragAnswer && (
                <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-2 flex-wrap gap-2">
                    <span className="text-[#d4af37] font-semibold flex items-center gap-2">
                      Grounded Answer (With Citations)
                      <LiveBadge source={ragAnswer.source} />
                    </span>
                    <span className="text-emerald-400">{ragAnswer.citationStatus}</span>
                  </div>
                  <p className="text-zinc-200 text-xs leading-relaxed font-sans">
                    {ragAnswer.answer}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-400">
                    <div>
                      <span className="text-zinc-500 block">Sparse BM25 Score:</span>
                      <span className="text-zinc-200">{ragAnswer.sparseBM25Score}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Dense Semantic Score:</span>
                      <span className="text-zinc-200">{ragAnswer.denseSemanticScore}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Fused RRF Score:</span>
                      <span className="text-[#d4af37] font-semibold">{ragAnswer.fusedRRFScore}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SELF-HEALING DOCUMENTATION */}
          {activeTab === "docs" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                    Codebase AST (Function Implementation)
                  </label>
                  <textarea
                    value={docsCode}
                    onChange={(e) => setDocsCode(e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                    Stale Markdown Documentation
                  </label>
                  <textarea
                    value={docsMarkdown}
                    onChange={(e) => setDocsMarkdown(e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <button
                onClick={handleRunDocsCheck}
                disabled={docsLoading}
                className="px-5 py-2 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {docsLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <GitPullRequest className="w-3.5 h-3.5" />}
                Analyze AST Signature Drift
              </button>

              <ErrorBanner message={docsError} />

              {docsDriftResult && (
                <div className={`p-5 rounded-xl bg-zinc-950 border space-y-3 font-mono text-xs ${docsDriftResult.totalDriftDetected > 0 ? "border-amber-900/40" : "border-emerald-900/40"}`}>
                  <div className={`flex items-center justify-between border-b border-zinc-800/60 pb-2 flex-wrap gap-2 ${docsDriftResult.totalDriftDetected > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    <span className="font-semibold flex items-center gap-2">
                      {docsDriftResult.totalDriftDetected > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      {docsDriftResult.totalDriftDetected > 0
                        ? `Drift Detected: ${docsDriftResult.itemType} (Severity: ${docsDriftResult.severity})`
                        : "Documentation Synchronized"}
                      <LiveBadge source={docsDriftResult.source} />
                    </span>
                    <span className="text-zinc-500">Automated CI/CD Action</span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    {docsDriftResult.description}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                      Auto-Generated Git Diff Patch
                    </span>
                    <pre className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                      {docsDriftResult.diffPatch}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LoRA FINE-TUNING */}
          {activeTab === "lora" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                    Base Foundation Model
                  </label>
                  <select
                    value={selectedLoraModel}
                    onChange={(e) => setSelectedLoraModel(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#d4af37]"
                  >
                    <option value="llama-3-8b-instruct">Llama 3 8B Instruct (8.03B params)</option>
                    <option value="mistral-7b-v0.3">Mistral 7B v0.3 (7.24B params)</option>
                    <option value="gemma-2-9b-it">Gemma 2 9B IT (9.24B params)</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-400 mb-2">
                    <span>LoRA Rank Dimension (r)</span>
                    <span className="text-[#d4af37] font-semibold">r = {loraRank} (Alpha = {loraRank * 2})</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={64}
                    step={8}
                    value={loraRank}
                    onChange={(e) => setLoraRank(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#d4af37] mt-2"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-600 mt-1">
                    <span>r=8</span>
                    <span>r=16</span>
                    <span>r=32</span>
                    <span>r=64</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRunLoRA}
                disabled={loraLoading}
                className="px-5 py-2 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loraLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                Compute Parameter Efficiency & Benchmark
              </button>

              <ErrorBanner message={loraError} />

              {loraMetrics && (
                <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-2 flex-wrap gap-2">
                    <span className="text-[#d4af37] font-semibold flex items-center gap-2">
                      PEFT Adaptation Metrics ({loraMetrics.model})
                      <LiveBadge source={loraMetrics.source} />
                    </span>
                    <span className="text-emerald-400">VRAM Saved: {loraMetrics.vramSavedGb} GB</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 block">Trainable Params</span>
                      <span className="text-sm font-semibold text-white">{loraMetrics.trainableParams.toLocaleString()}</span>
                      <span className="text-[10px] text-emerald-400 block mt-0.5">({loraMetrics.trainablePercent}% of {formatParamCount(loraMetrics.totalParams)})</span>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 block">Base Model Accuracy</span>
                      <span className="text-sm font-semibold text-zinc-400">{loraMetrics.baseAccuracy}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">Zero-shot JSON</span>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 block">LoRA Fine-Tuned</span>
                      <span className="text-sm font-semibold text-[#d4af37]">{loraMetrics.loraAccuracy}</span>
                      <span className="text-[10px] text-emerald-400 block mt-0.5">{loraMetrics.gain} Gain</span>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 block">Latency Overhead</span>
                      <span className="text-sm font-semibold text-zinc-300">{loraMetrics.latencyOverhead}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">&lt;4ms per inference</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CONTROL PLANE MANAGER */}
          {activeTab === "manager" && (
            <div className="space-y-6">
              <p className="text-xs text-zinc-400 leading-relaxed">
                One view across every subsystem: circuit-breaker state, rate-limit usage, the golden-case
                regression suite (Project 1), and an honest capability registry — what&apos;s fully real,
                what&apos;s real-but-heuristic, rather than a page claiming uniform completeness.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleFetchHealth}
                  disabled={managerLoading}
                  className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-200 font-mono text-xs font-semibold hover:border-[#d4af37] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {managerLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
                  Refresh System Health
                </button>
                <button
                  onClick={handleRunRegressionSuite}
                  disabled={regressionLoading}
                  className="px-4 py-2 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {regressionLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                  Run Full Regression Suite
                </button>
              </div>

              <ErrorBanner message={managerError} />

              {healthData && (
                <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-4 font-mono text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        healthData.overall_status === "HEALTHY"
                          ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/50"
                          : healthData.overall_status === "DEGRADED"
                            ? "bg-amber-950/50 text-amber-400 border border-amber-800/50"
                            : "bg-red-950/50 text-red-400 border border-red-800/50"
                      }`}
                    >
                      {healthData.overall_status === "HEALTHY" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {healthData.overall_status.replace(/_/g, " ")}
                    </span>
                    <span className="text-zinc-500 text-[10px]">
                      {healthData.recent_trace_count} recent traces · {(healthData.trace_anomaly_rate * 100).toFixed(1)}% anomaly rate
                    </span>
                  </div>

                  {healthData.reasons.length > 0 && (
                    <ul className="text-amber-300 text-[11px] list-disc list-inside space-y-0.5">
                      {healthData.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 block">Rate Limit (this browser)</span>
                      <span className="text-sm font-semibold text-white">{healthData.rate_limiter.active_rpm}/{healthData.rate_limiter.max_rpm} rpm</span>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 block">Spend</span>
                      <span className="text-sm font-semibold text-white">${healthData.rate_limiter.spend_usd.toFixed(4)} / ${healthData.rate_limiter.budget_limit_usd.toFixed(0)}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 block">Mined Eval Candidates</span>
                      <span className="text-sm font-semibold text-white">{healthData.golden_eval_candidate_count}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-2">Circuit Breakers</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(healthData.circuit_breakers).map(([name, s]) => (
                        <span
                          key={name}
                          className={`px-2 py-1 rounded text-[10px] border ${
                            s.state === "OPEN" ? "border-red-800/60 text-red-400 bg-red-950/20" : "border-zinc-800 text-zinc-400"
                          }`}
                        >
                          {name}: {s.state}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {regressionResult && (
                <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3 font-mono text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
                    <span className={`font-semibold ${regressionResult.is_regression ? "text-red-400" : "text-emerald-400"}`}>
                      {regressionResult.passed_cases}/{regressionResult.total_cases} golden cases passed
                      {regressionResult.is_regression ? ` — ${regressionResult.newly_regressed.length} newly regressed` : ""}
                    </span>
                    <span className="text-zinc-500 text-[10px]">{regressionResult.run_id}</span>
                  </div>
                  <div className="space-y-1">
                    {regressionResult.results.map((r) => (
                      <div key={r.case_id} className="flex items-center justify-between py-1 px-2.5 rounded bg-zinc-900/80 border border-zinc-800/40">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          {r.passed ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-red-400" />}
                          {r.case_id}
                        </span>
                        <span className="text-zinc-500">{r.duration_ms}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-2">
                  Capability Registry (13 Projects — Honest Status)
                </span>
                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {(healthData?.capability_registry ?? []).map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/60 text-[11px] font-mono">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-200 font-semibold">#{c.id} {c.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${c.status === "REAL" ? "bg-emerald-950/50 text-emerald-400" : "bg-amber-950/50 text-amber-400"}`}>
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-zinc-500 mt-1">{c.detail}</div>
                      <div className="text-zinc-600 mt-0.5">{c.endpoint}</div>
                    </div>
                  ))}
                  {!healthData && (
                    <div className="text-zinc-600 italic py-2">Enable Live Backend and refresh to load the capability registry from the running gateway.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
