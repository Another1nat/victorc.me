"use client";

import React, { useState, useMemo } from "react";
import { Sparkles, DollarSign, Zap, Clock, ShieldCheck } from "lucide-react";

interface ModelPricing {
  name: string;
  uncachedPerMillion: number;
  cachedPerMillion: number;
  baseLatencyMs: number;
  cachedLatencyMs: number;
}

const MODELS: Record<string, ModelPricing> = {
  "gemini-flash": {
    name: "Gemini 3.6 Flash",
    uncachedPerMillion: 0.10,
    cachedPerMillion: 0.025,
    baseLatencyMs: 950,
    cachedLatencyMs: 240,
  },
  "claude-sonnet": {
    name: "Claude 3.5 Sonnet",
    uncachedPerMillion: 3.00,
    cachedPerMillion: 0.30,
    baseLatencyMs: 1650,
    cachedLatencyMs: 420,
  },
  "gpt-4o": {
    name: "GPT-4o",
    uncachedPerMillion: 2.50,
    cachedPerMillion: 1.25,
    baseLatencyMs: 1400,
    cachedLatencyMs: 510,
  },
};

export default function KVCacheCalculator() {
  const [selectedModelKey, setSelectedModelKey] = useState<string>("gemini-flash");
  const [tokens, setTokens] = useState<number>(150000); // 150k default
  const [dailyRequests, setDailyRequests] = useState<number>(200);

  const model = MODELS[selectedModelKey];

  const stats = useMemo(() => {
    const monthlyRequests = dailyRequests * 30;
    const totalTokensMillions = (tokens * monthlyRequests) / 1_000_000;

    const uncachedCost = totalTokensMillions * model.uncachedPerMillion;
    const cachedCost = totalTokensMillions * model.cachedPerMillion;
    const monthlySavings = uncachedCost - cachedCost;
    const percentSaved = Math.round(((uncachedCost - cachedCost) / uncachedCost) * 100);

    const latencyCutPercent = Math.round(
      ((model.baseLatencyMs - model.cachedLatencyMs) / model.baseLatencyMs) * 100
    );

    return {
      uncachedCost: uncachedCost.toFixed(2),
      cachedCost: cachedCost.toFixed(2),
      monthlySavings: monthlySavings.toFixed(2),
      percentSaved,
      baseLatency: model.baseLatencyMs,
      cachedLatency: model.cachedLatencyMs,
      latencyCutPercent,
    };
  }, [tokens, dailyRequests, model]);

  return (
    <div className="my-10 p-6 sm:p-8 rounded-2xl bg-[#0d0d12] border border-zinc-800 shadow-xl font-mono text-zinc-100">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#d4af37] mb-2 font-semibold">
        <Zap className="w-3.5 h-3.5" />
        Interactive Instrument
      </div>
      <h3 className="text-xl sm:text-2xl font-serif-luxury font-normal text-white mb-2">
        KV-Cache Economics &amp; Latency Simulator
      </h3>
      <p className="text-xs text-zinc-400 font-light mb-6">
        Simulate real-world token expenditure and Time-To-First-Token (TTFT) latency cuts across frontier model providers.
      </p>

      {/* Model Selector Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(MODELS).map(([key, m]) => (
          <button
            key={key}
            onClick={() => setSelectedModelKey(key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs transition-all ${
              selectedModelKey === key
                ? "bg-white text-black font-medium shadow"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-5 mb-8">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-zinc-400">Context Prefix Length:</span>
            <span className="text-[#d4af37] font-semibold">{tokens.toLocaleString()} tokens</span>
          </div>
          <input
            type="range"
            min={10000}
            max={1000000}
            step={10000}
            value={tokens}
            onChange={(e) => setTokens(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
            <span>10K tokens</span>
            <span>500K</span>
            <span>1,000,000 tokens (1M)</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-zinc-400">Daily Agent Invocations:</span>
            <span className="text-[#d4af37] font-semibold">{dailyRequests.toLocaleString()} reqs / day</span>
          </div>
          <input
            type="range"
            min={10}
            max={2000}
            step={10}
            value={dailyRequests}
            onChange={(e) => setDailyRequests(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
            <span>10 / day</span>
            <span>1,000</span>
            <span>2,000 reqs / day</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
            Monthly Cost Delta
          </div>
          <div className="text-xl sm:text-2xl font-serif-luxury text-white">
            ${stats.cachedCost}
          </div>
          <div className="text-[10px] text-zinc-500 line-through mt-0.5">
            ${stats.uncachedCost} uncached
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/80 border border-[#d4af37]/30">
          <div className="text-[10px] uppercase tracking-wider text-[#d4af37] mb-1">
            Capital Saved
          </div>
          <div className="text-xl sm:text-2xl font-serif-luxury text-[#d4af37]">
            ${stats.monthlySavings} / mo
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">
            +{stats.percentSaved}% budget reduction
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
            TTFT Latency Cut
          </div>
          <div className="text-xl sm:text-2xl font-serif-luxury text-white">
            {stats.cachedLatency}ms
          </div>
          <div className="text-[10px] text-amber-300 mt-0.5">
            -{stats.latencyCutPercent}% TTFT acceleration
          </div>
        </div>
      </div>
    </div>
  );
}
