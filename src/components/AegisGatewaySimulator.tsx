"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  Cpu, 
  Database, 
  Search, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Activity, 
  Layers,
  Terminal,
  RotateCcw,
  FileCode,
  GitPullRequest,
  TrendingUp,
} from "lucide-react";

export default function AegisGatewaySimulator() {
  const [activeTab, setActiveTab] = useState<"gateway" | "sql" | "rag" | "docs" | "lora">("gateway");

  // Tab 1: Gateway & Cost Autopilot State
  const [selectedScenario, setSelectedScenario] = useState<"simple" | "complex" | "outage">("simple");
  const [costAutopilotEnabled, setCostAutopilotEnabled] = useState(true);
  const [circuitBreakerEnabled, setCircuitBreakerEnabled] = useState(true);
  const [arbitrationEnabled, setArbitrationEnabled] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);

  // Tab 2: Text-to-SQL Guardrail State
  const [sqlQueryInput, setSqlQueryInput] = useState(
    "SELECT customer_name, plan_tier, monthly_mrr_usd FROM customer_subscriptions WHERE status = 'active';"
  );
  const [sqlResult, setSqlResult] = useState<{
    status: "APPROVED" | "REJECTED";
    reason?: string;
    astType?: string;
    executionTimeMs?: number;
    rows?: Array<{ customer: string; plan: string; mrr: number }>;
  } | null>(null);

  // Tab 3: Hybrid RAG State
  const [ragQuery, setRagQuery] = useState("How does KV-Cache PagedAttention prevent GPU VRAM fragmentation?");
  const [ragAnswer, setRagAnswer] = useState<any | null>(null);

  // Tab 4: Self-Healing Docs State
  const [docsCode, setDocsCode] = useState(`def update_rate_limit(team_id: str, max_rpm: int, max_tpm: int, new_budget: float = 100.0):\n    """Updates rate limits and spend ceiling for a team."""\n    return True`);
  const [docsMarkdown, setDocsMarkdown] = useState(`### \`update_rate_limit(team_id, max_rpm)\`\nUpdates the rate limits for a given team.`);
  const [docsDriftResult, setDocsDriftResult] = useState<any | null>(null);

  // Tab 5: LoRA Fine-Tuning State
  const [loraRank, setLoraRank] = useState(16);
  const [selectedLoraModel, setSelectedLoraModel] = useState("llama-3-8b-instruct");
  const [loraMetrics, setLoraMetrics] = useState<any | null>(null);

  // Trigger Gateway Simulation
  const handleRunGatewaySim = () => {
    setIsSimulating(true);
    setSimulationResult(null);

    setTimeout(() => {
      setIsSimulating(false);
      if (selectedScenario === "simple") {
        setSimulationResult({
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
        });
      } else if (selectedScenario === "outage") {
        setSimulationResult({
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
        });
      } else {
        // Complex reasoning
        setSimulationResult({
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
        });
      }
    }, 450);
  };

  // Run SQL Guardrail Check
  const handleRunSQL = () => {
    const q = sqlQueryInput.trim();
    if (q.includes(";") && q.indexOf(";") < q.length - 1) {
      setSqlResult({
        status: "REJECTED",
        reason: "Security Violation: Multiple stacked SQL statements detected.",
        astType: "BLOCK_STACKED_INJECTION",
      });
      return;
    }
    const upper = q.toUpperCase();
    if (!upper.startsWith("SELECT")) {
      setSqlResult({
        status: "REJECTED",
        reason: "AST Enforcement: Only read-only SELECT queries are permitted.",
        astType: "DENY_NON_SELECT",
      });
      return;
    }
    if (upper.includes("DROP") || upper.includes("DELETE") || upper.includes("TRUNCATE") || upper.includes("ALTER")) {
      setSqlResult({
        status: "REJECTED",
        reason: "Security Violation: Destructive DDL/DML token intercepted by AST validator.",
        astType: "BLOCK_DESTRUCTIVE_TOKEN",
      });
      return;
    }
    if (upper.includes("PAYROLL") || upper.includes("SECRET")) {
      setSqlResult({
        status: "REJECTED",
        reason: "Schema Hallucination: Referenced table does not exist in verified catalog.",
        astType: "SCHEMA_HALLUCINATION_DETECTED",
      });
      return;
    }

    setSqlResult({
      status: "APPROVED",
      astType: "SAFE_READ_ONLY_SELECT",
      executionTimeMs: 1.4,
      rows: [
        { customer: "Acme Corp", plan: "Enterprise", mrr: 4500 },
        { customer: "Starlight AI", plan: "Pro", mrr: 899 },
        { customer: "QuantFlow", plan: "Enterprise", mrr: 6200 },
      ],
    });
  };

  // Run Hybrid RAG Search
  const handleRunRAG = () => {
    setRagAnswer({
      question: ragQuery,
      answer: "According to [doc-arch-01:L14-L22], KV-Cache memory scales linearly with sequence length O(s) and context windows. In multi-tenant inference, PagedAttention partitions KV blocks across GPU VRAM to prevent allocation fragmentation.",
      verifiedSource: "doc-arch-01",
      sparseBM25Score: 0.884,
      denseSemanticScore: 0.941,
      fusedRRFScore: 0.0328,
      citationStatus: "VERIFIED_100%",
      confidenceScore: 0.98,
    });
  };

  // Run Self-Healing Docs AST Check
  const handleRunDocsCheck = () => {
    setDocsDriftResult({
      totalDriftDetected: 1,
      severity: "HIGH",
      itemType: "PARAMETER_MISMATCH",
      description: "Parameters ['max_tpm', 'new_budget'] added in code but missing from documentation.",
      diffPatch: "- `update_rate_limit(team_id, max_rpm)`\n+ `update_rate_limit(team_id, max_rpm, max_tpm, new_budget)`",
      healedMarkdown: docsMarkdown.replace("update_rate_limit(team_id, max_rpm)", "update_rate_limit(team_id, max_rpm, max_tpm, new_budget)"),
    });
  };

  // Run LoRA Parameter Efficiency Calculation
  const handleRunLoRA = () => {
    const totalParams = 8_030_000_000;
    const loraTrainable = 2 * loraRank * 4096 * 32 * 4;
    const trainablePercent = ((loraTrainable / totalParams) * 100).toFixed(3);
    setLoraMetrics({
      model: selectedLoraModel,
      rank: loraRank,
      trainableParams: loraTrainable,
      trainablePercent: trainablePercent,
      vramSavedGb: 30.0,
      baseAccuracy: "62.5%",
      loraAccuracy: "95.0%",
      gain: "+52.0%",
      latencyOverhead: "+1.2%",
    });
  };

  return (
    <section id="ai-gateway-control-plane" className="py-20 border-t border-zinc-800/60 relative">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
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

              {/* Results Display */}
              {simulationResult && (
                <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${simulationResult.status.includes("SUCCESS") || simulationResult.status.includes("RECOVERED") ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className="font-mono text-xs text-white font-semibold">{simulationResult.provider}</span>
                      <span className="text-zinc-500 text-xs font-mono">({simulationResult.routedModel})</span>
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
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {simulationResult.spans.map((s: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-1 px-2.5 rounded bg-zinc-900/80 border border-zinc-800/40">
                          <span className="text-zinc-300 flex items-center gap-1.5">
                            {s.status === "FAILED" ? (
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                            ) : s.status === "TRIPPED" ? (
                              <Zap className="w-3 h-3 text-amber-400" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            )}
                            {s.name}
                          </span>
                          <span className="text-zinc-500">{s.durationMs}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>

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
                className="px-5 py-2 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] transition-all flex items-center gap-2"
              >
                <Database className="w-3.5 h-3.5" />
                Validate & Execute in Sandbox
              </button>

              {/* SQL Result Output */}
              {sqlResult && (
                <div className={`p-4 rounded-xl border text-xs font-mono space-y-3 ${
                  sqlResult.status === "APPROVED"
                    ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-200"
                    : "bg-red-950/20 border-red-800/40 text-red-200"
                }`}>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-2">
                      {sqlResult.status === "APPROVED" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      )}
                      Verdict: {sqlResult.status} ({sqlResult.astType})
                    </span>
                    {sqlResult.executionTimeMs && <span>{sqlResult.executionTimeMs}ms</span>}
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
                            <th className="pb-1">Customer</th>
                            <th className="pb-1">Plan</th>
                            <th className="pb-1">MRR ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sqlResult.rows.map((r, i) => (
                            <tr key={i} className="border-b border-zinc-800/30 text-zinc-300">
                              <td className="py-1">{r.customer}</td>
                              <td className="py-1">{r.plan}</td>
                              <td className="py-1">${r.mrr}</td>
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
                    className="px-4 py-2 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Query
                  </button>
                </div>
              </div>

              {ragAnswer && (
                <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-2">
                    <span className="text-[#d4af37] font-semibold">Grounded Answer (With Citations)</span>
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
                className="px-5 py-2 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] transition-all flex items-center gap-2"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                Analyze AST Signature Drift
              </button>

              {docsDriftResult && (
                <div className="p-5 rounded-xl bg-zinc-950 border border-amber-900/40 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-amber-400 border-b border-zinc-800/60 pb-2">
                    <span className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Drift Detected: {docsDriftResult.itemType} (Severity: {docsDriftResult.severity})
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
                className="px-5 py-2 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] transition-all flex items-center gap-2"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Compute Parameter Efficiency & Benchmark
              </button>

              {loraMetrics && (
                <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800/60 pb-2">
                    <span className="text-[#d4af37] font-semibold">PEFT Adaptation Metrics ({loraMetrics.model})</span>
                    <span className="text-emerald-400">VRAM Saved: {loraMetrics.vramSavedGb} GB</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 block">Trainable Params</span>
                      <span className="text-sm font-semibold text-white">{loraMetrics.trainableParams.toLocaleString()}</span>
                      <span className="text-[10px] text-emerald-400 block mt-0.5">({loraMetrics.trainablePercent}% of 8B)</span>
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
        </div>
      </div>
    </section>
  );
}
