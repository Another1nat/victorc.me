"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import { Sparkles, Send, ArrowLeft, Bot, Shield, Zap, RotateCcw } from "lucide-react";
import Link from "next/link";

const SAMPLE_PROMPTS = [
  "What are the latency and cost trade-offs of KV context caching?",
  "How does watchduck orchestrate MCP tools for Claude Code?",
  "Why do simple state machines outperform heavy agent frameworks?",
];

export default function DemoPage() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modelBadge, setModelBadge] = useState<string | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAsk = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    setResponse(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: queryText }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Request failed.");
      } else {
        setResponse(data.text);
        setModelBadge(data.model);
        if (data.remainingQuota !== undefined) {
          setRemainingQuota(data.remainingQuota);
        }
      }
    } catch (err: any) {
      setErrorMsg("Network error connecting to AI endpoint.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#08080a] text-zinc-100 selection:bg-[#d4af37] selection:text-black">
      <ReadingProgressBar />
      <Navbar />

      <main className="flex-grow py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          {/* Breadcrumb */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Index
          </Link>

          {/* Header */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-[#d4af37] bg-zinc-900 border border-zinc-800 mb-3">
              <Sparkles className="w-3 h-3" />
              Live Interactive Prototype
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif-luxury font-normal text-white">
              AI Research Concierge.
            </h1>
            <p className="mt-4 text-zinc-400 text-sm sm:text-base leading-relaxed font-light">
              A live backend demonstration powered by <strong>Gemini 2.0 Flash</strong>. Test inference directly against Victor's research theses, autonomous agent design patterns, and open-source tools.
            </p>
          </div>

          {/* Cost & Safeguard Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-[11px] font-mono">
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-center gap-2.5 text-zinc-400">
              <Zap className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Model: Gemini 2.0 Flash</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-center gap-2.5 text-zinc-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Capped: 450 max tokens</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-center gap-2.5 text-zinc-400">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>Quota: {remainingQuota !== null ? `${remainingQuota} left` : "5 / 5 min"}</span>
            </div>
          </div>

          {/* Pre-set questions */}
          <div className="mb-6 space-y-2">
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
              Suggested Explorations:
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPrompt(p);
                    handleAsk(p);
                  }}
                  className="text-left text-xs font-light text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>

          {/* Query Input Box */}
          <div className="luxury-panel rounded-2xl p-6 sm:p-7 mb-8 border border-zinc-800/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk(prompt);
              }}
              className="space-y-4"
            >
              <div className="relative">
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask a question about context economics, agent loops, or system architecture..."
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#d4af37]/60 font-light resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">
                  Max 500 characters
                </span>

                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 text-black font-mono text-xs font-medium hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                >
                  {isLoading ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      Inference Running...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Execute Query
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs font-mono mb-8">
              {errorMsg}
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="luxury-panel rounded-2xl p-7 sm:p-8 space-y-4 animate-in fade-in duration-300 border border-[#d4af37]/30">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 text-[11px] font-mono text-zinc-500">
                <span className="flex items-center gap-1.5 text-[#d4af37]">
                  <Bot className="w-3.5 h-3.5" />
                  Synthesized Answer
                </span>
                <span>{modelBadge || "gemini-2.0-flash"}</span>
              </div>

              <div className="text-zinc-200 text-sm sm:text-base leading-relaxed font-light whitespace-pre-wrap">
                {response}
              </div>

              <div className="pt-4 border-t border-zinc-800/40 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>Verified response bounds</span>
                <Link
                  href="/research"
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  Read referenced research papers →
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
