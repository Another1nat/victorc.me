"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Zap, ShieldAlert, Brain, RotateCcw, Wifi, WifiOff, ArrowRight } from "lucide-react";
import { GATEWAY_URL, getVisitorTeamId, postJSON, errorMessage, checkGatewayHealth } from "@/lib/aegisClient";

type ScenarioId = "simple" | "complex" | "attack";

interface ResultState {
  source: "live" | "simulated";
  headline: string;
  detail: string;
  ok: boolean;
}

const SCENARIOS: Record<ScenarioId, { label: string; icon: React.ElementType }> = {
  simple: { label: "Ask something simple", icon: Zap },
  complex: { label: "Ask something complex", icon: Brain },
  attack: { label: "Attempt a SQL injection", icon: ShieldAlert },
};

function simulatedResult(id: ScenarioId): ResultState {
  if (id === "simple") {
    return { source: "simulated", ok: true, headline: "Routed to Gemini Flash", detail: "$0.00003 · 48ms · 95.7% cheaper than a flat GPT-4 default" };
  }
  if (id === "complex") {
    return { source: "simulated", ok: true, headline: "Routed to Anthropic (reasoning-tier)", detail: "$0.0042 · 420ms — content triggered the reasoning-tier chain" };
  }
  return { source: "simulated", ok: false, headline: "REJECTED by the AST guardrail", detail: "\"Only read-only SELECT queries are allowed. Got 'DROP'\"" };
}

export default function AegisQuickTry() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [running, setRunning] = useState<ScenarioId | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  const check = useCallback(async () => {
    setStatus("checking");
    setStatus((await checkGatewayHealth()) ? "online" : "offline");
  }, []);

  useEffect(() => {
    const t = setTimeout(check, 0);
    return () => clearTimeout(t);
  }, [check]);

  const run = async (id: ScenarioId) => {
    setRunning(id);
    setResult(null);

    if (status !== "online") {
      setTimeout(() => {
        setResult(simulatedResult(id));
        setRunning(null);
      }, 350);
      return;
    }

    try {
      if (id === "attack") {
        const data = await postJSON("/v1/spokes/sql/execute", { query: "DROP TABLE customer_subscriptions;" });
        setResult({
          source: "live",
          ok: data.success === false,
          headline: data.success ? "Unexpectedly succeeded" : "REJECTED by the AST guardrail",
          detail: data.error || "No error returned.",
        });
      } else {
        const prompt = id === "complex"
          ? "Please analyze this distributed system architecture for reliability, cost, and failure isolation in depth."
          : "What is 2 + 2?";
        const data = await postJSON("/v1/chat/completions", {
          model: "auto-cheapest",
          messages: [{ role: "user", content: prompt }],
          team_id: getVisitorTeamId(),
        });
        const meta = data.gateway_metadata || {};
        setResult({
          source: "live",
          ok: true,
          headline: `Routed to ${meta.provider_used}`,
          detail: `$${Number(meta.estimated_cost_usd ?? 0).toFixed(6)} · ${meta.latency_ms}ms`,
        });
      }
    } catch (e) {
      const fallback = simulatedResult(id);
      setResult({ ...fallback, detail: `${fallback.detail} (live call failed: ${errorMessage(e)})` });
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="luxury-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-300 font-semibold">Try it right now — no scrolling required</span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
          {status === "checking" && <RotateCcw className="w-3 h-3 animate-spin" />}
          {status === "online" && <Wifi className="w-3 h-3 text-emerald-400" />}
          {status === "offline" && <WifiOff className="w-3 h-3 text-zinc-600" />}
          {status === "online" ? `Live at ${GATEWAY_URL}` : status === "offline" ? "No local gateway — using simulated fixtures" : "Checking for a local gateway…"}
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 mb-4">
        {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => {
          const { label, icon: Icon } = SCENARIOS[id];
          return (
            <button
              key={id}
              onClick={() => run(id)}
              disabled={running !== null}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-[#d4af37] hover:text-white transition-all text-xs font-mono flex items-center gap-2 disabled:opacity-50"
            >
              {running === id ? <RotateCcw className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> : <Icon className="w-3.5 h-3.5 flex-shrink-0 text-[#d4af37]" />}
              {label}
            </button>
          );
        })}
      </div>

      {result && (
        <div className={`p-3.5 rounded-xl border text-xs font-mono ${result.ok ? "bg-emerald-950/15 border-emerald-900/30" : "bg-red-950/15 border-red-900/30"}`}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={result.ok ? "text-emerald-300 font-semibold" : "text-red-300 font-semibold"}>{result.headline}</span>
            <span className="text-[9px] uppercase tracking-wider text-zinc-500">{result.source}</span>
          </div>
          <p className="text-zinc-400 leading-relaxed">{result.detail}</p>
        </div>
      )}

      <a href="#demo" className="inline-flex items-center gap-1.5 mt-4 text-[11px] font-mono text-zinc-500 hover:text-[#d4af37] transition-colors">
        Want the full 6-tab instrument — SQL, RAG, LoRA, self-healing docs, the manager? <ArrowRight className="w-3 h-3" />
      </a>
    </div>
  );
}
