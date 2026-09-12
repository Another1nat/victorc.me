"use client";

import React, { useState } from "react";
import { Info, Sliders } from "lucide-react";

export default function InteractiveExplorer() {
  const [contextTokens, setContextTokens] = useState<number>(64000);
  const [modelParams, setModelParams] = useState<number>(14); // in Billions
  const [precision, setPrecision] = useState<"fp16" | "int8" | "int4">("fp16");

  const bytesPerParam = precision === "fp16" ? 2 : precision === "int8" ? 1 : 0.5;

  const kvCacheMB = Math.round(
    ((contextTokens * (modelParams * 0.08) * bytesPerParam) / 1024) * 10
  ) / 10;

  const weightsGB = Math.round((modelParams * bytesPerParam * 10)) / 10;
  const totalVramGB = Math.round(((weightsGB + kvCacheMB / 1024) * 10)) / 10;

  const estimatedTTFTMs = Math.round(
    (contextTokens / 1000) * (modelParams > 30 ? 18 : 8) * (precision === "fp16" ? 1 : 0.75)
  );

  const recommendCache = contextTokens >= 32000;

  return (
    <section id="tools" className="py-20 border-t border-zinc-800/60 relative">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-[#d4af37] bg-zinc-900 border border-zinc-800 mb-3">
            <Sliders className="w-3 h-3" />
            Interactive Instrument
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif-luxury font-normal text-white">
            Compute & Context Geometry Modeler
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-2xl font-light leading-relaxed">
            An analytical modeler derived from our benchmark series. Evaluate the geometric scaling of KV-tensor memory allocation, static weight bounds, and Time-To-First-Token pre-fill dynamics.
          </p>
        </div>

        {/* Instrument Container */}
        <div className="luxury-panel rounded-2xl p-7 sm:p-9 border border-zinc-800/80 space-y-8">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Context Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-300 mb-2">
                <span className="text-zinc-400">Context Window</span>
                <span className="text-[#d4af37] font-semibold font-mono">
                  {(contextTokens / 1000).toFixed(0)}k tokens
                </span>
              </div>
              <input
                type="range"
                min={4000}
                max={256000}
                step={4000}
                value={contextTokens}
                onChange={(e) => setContextTokens(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#d4af37]"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-600 mt-1.5">
                <span>4k</span>
                <span>64k</span>
                <span>128k</span>
                <span>256k</span>
              </div>
            </div>

            {/* Model Architecture */}
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-2">
                Model Parameter Class
              </label>
              <select
                value={modelParams}
                onChange={(e) => setModelParams(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#d4af37]/60"
              >
                <option value={7}>7B Parameters (Edge / Local)</option>
                <option value={14}>14B Parameters (Mid-Scale)</option>
                <option value={32}>32B Parameters (High Reasoning)</option>
                <option value={70}>70B Parameters (Frontier Scale)</option>
              </select>
            </div>

            {/* Precision */}
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-2">
                Quantization Precision
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["fp16", "int8", "int4"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrecision(p)}
                    className={`py-2 rounded-lg text-xs font-mono uppercase transition-all ${
                      precision === p
                        ? "bg-zinc-800 text-[#d4af37] border border-[#d4af37]/40"
                        : "bg-zinc-900/60 text-zinc-500 border border-zinc-800/80 hover:text-zinc-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-zinc-800/60">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                KV Cache Memory
              </div>
              <div className="text-xl sm:text-2xl font-serif-luxury text-white mt-1">
                {kvCacheMB > 1024 ? `${(kvCacheMB / 1024).toFixed(2)} GB` : `${kvCacheMB} MB`}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1 font-light">dynamic allocation</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Model Weights
              </div>
              <div className="text-xl sm:text-2xl font-serif-luxury text-[#d4af37] mt-1">
                {weightsGB} GB
              </div>
              <div className="text-[10px] text-zinc-500 mt-1 font-light">base static VRAM</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Total Envelope
              </div>
              <div className="text-xl sm:text-2xl font-serif-luxury text-white mt-1">
                {totalVramGB} GB
              </div>
              <div className="text-[10px] text-zinc-500 mt-1 font-light">aggregate footprint</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Pre-fill Latency
              </div>
              <div className="text-xl sm:text-2xl font-serif-luxury text-[#e4e4e7] mt-1">
                ~{estimatedTTFTMs} ms
              </div>
              <div className="text-[10px] text-zinc-500 mt-1 font-light">cold Time-To-First-Token</div>
            </div>
          </div>

          {/* Analytical Takeaway */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/70 flex items-start gap-3 text-xs text-zinc-400">
            <Info className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
            <div className="leading-relaxed font-light">
              <strong className="text-zinc-200 font-normal">Architectural Analysis: </strong>
              {recommendCache ? (
                <span>
                  At {(contextTokens / 1000).toFixed(0)}k tokens, prompt pre-fill begins dominating turn latency (~{estimatedTTFTMs}ms). Persisting <strong>KV-Cache states</strong> reduces recurrent pre-fill compute by ~75% and ensures sub-300ms subsequent turns.
                </span>
              ) : (
                <span>
                  Context size remains lightweight. Standard prompt evaluation is optimal and circumvents minimum TTL allocation overhead.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
