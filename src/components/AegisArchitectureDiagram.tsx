"use client";

import React, { useState, useEffect } from "react";
import { X, Info } from "lucide-react";

interface NodeDetail {
  title: string;
  tag: string;
  what: string;
  connects: string;
  caveat: string;
}

const NODE_DETAILS: Record<string, NodeDetail> = {
  overview: {
    title: "How a request actually flows",
    tag: "Overview",
    what: "There are two independent paths through this system, not one. A /v1/chat/completions call runs the full seven-box pipeline on the left, in this order: auth + rate limiting, cost-based routing, optional A/B + canary logic, circuit-breaker failover, the actual provider call, optional arbitration, then tracing over all of it. The four applied spokes on the right — RAG, SQL, Docs, LoRA — are separate endpoints a client calls directly. They do not pass through that pipeline, and the pipeline never calls them either.",
    connects: "The only thing that touches both sides is the Control Plane Manager at the bottom, and it doesn't sit in the request path at all — it reads the pipeline's live state, and on demand it re-runs 8 golden test cases spanning the pipeline and every spoke to check nothing has quietly broken.",
    caveat: "Click any box below for exactly what it does, in the real code, right now — not a marketing description of what it's supposed to do.",
  },
  "auth-ratelimit": {
    title: "Auth & Rate Limit",
    tag: "#11 · Service Layer",
    what: "If the request carries a Bearer key, it's verified against a SHA-256 hash and resolves to a team and its configured limits. Auth is opt-in — off by default, so the public demo below needs no key. Either way, the resolved team gets a token-bucket check: requests/min, tokens/min, and a spend budget persisted to SQLite, so it survives a process restart.",
    connects: "Feeds the resolved limits into the rate limiter before Cost Autopilot ever sees the request. A rejected request never reaches any provider.",
    caveat: "Auth here only gates this one endpoint — the spoke endpoints and the manager endpoints are not behind it.",
  },
  "cost-autopilot": {
    title: "Cost Autopilot",
    tag: "#2",
    what: "Reads the request's message content and picks a provider chain. Short, simple prompts route to the cheap chain (Gemini Flash first); anything over roughly 1,200 characters, or containing words like \"analyze\" or \"code,\" routes to the reasoning-tier chain (Anthropic first) instead.",
    connects: "Hands its chosen provider order forward. A/B and canary selection run next, then the Circuit Breaker decides which provider in that order is actually allowed to receive traffic right now.",
    caveat: "—",
  },
  "circuit-breaker": {
    title: "Circuit Breaker",
    tag: "#11",
    what: "A real CLOSED → OPEN → HALF_OPEN state machine, tracked per provider. Three consecutive failures trip it OPEN for 20 seconds; after that it allows exactly one HALF_OPEN probe request — success closes it, failure reopens it. Checked once per provider as Cost Autopilot's chain is walked.",
    connects: "Skips any OPEN provider and falls through to the next one in Cost Autopilot's chain. The first provider that's allowed through actually gets dispatched. If every provider in the chain is down, the request fails with a 502.",
    caveat: "—",
  },
  experiments: {
    title: "A/B Variant + Canary",
    tag: "#9 + #12 · optional",
    what: "Runs right after Cost Autopilot picks a provider order, before any provider is actually tried. If the request opts in with an experiment_id, a prompt variant is chosen by weighted random selection and prepended as a system message. If it opts in with a canary_flag, a percentage-based rollout decides whether this specific request lands in the canary group.",
    connects: "The (possibly modified) request moves to the Circuit Breaker next. Later, once a provider responds, the arbitration confidence score feeds back into this variant's running average and into the canary's auto-rollback check.",
    caveat: "Real and tested via the API — verified live, including a real auto-rollback — but not exposed as a toggle in this page's demo yet.",
  },
  provider: {
    title: "Provider Dispatch",
    tag: "Infrastructure",
    what: "The provider selected by Cost Autopilot and the Circuit Breaker actually runs the completion: Gemini, OpenAI, or Anthropic if a key is configured, or a deterministic zero-cost simulator otherwise — which is what powers the live demo below.",
    connects: "Returns token usage and cost, which Cost Autopilot compares against a flagship-model benchmark to compute the \"cost saved\" figure shown in the demo.",
    caveat: "—",
  },
  arbitration: {
    title: "Multi-Critic Arbitration",
    tag: "#5 · optional",
    what: "Three independent heuristic checks run against the output: factuality (hedge-phrase detection), safety (prompt-leak pattern detection), and completeness (a length floor). A weighted score produces an APPROVED / FLAGGED / REJECTED verdict.",
    connects: "The confidence score it produces feeds the A/B and canary quality tracking above it, and gets attached to the response as gateway_metadata.",
    caveat: "The critics are regex and length heuristics, not separate model calls — fast and free, but not semantically deep.",
  },
  tracing: {
    title: "Forensics Tracing",
    tag: "#3 + #7",
    what: "Every step above is recorded as a timed span from the moment the request enters. A successful request's spans are simply kept for inspection; a fully-failed request — every provider in the chain exhausted — gets its trace automatically mined into the golden eval dataset.",
    connects: "This is what the Control Plane Manager reads to compute the anomaly rate in its health view, and what /v1/gateway/evals exposes.",
    caveat: "—",
  },
  rag: {
    title: "Hybrid RAG",
    tag: "#6",
    what: "Combines real BM25-style keyword scoring with a lexical trigram-overlap \"dense\" score, fused by reciprocal rank fusion. Ingests actual markdown files off disk — this repo's own README and API reference — with real line-number citations, not just hand-picked sample chunks.",
    connects: "A fully independent endpoint (/v1/spokes/rag/query). It does not pass through the chat-completions pipeline on the left.",
    caveat: "\"Dense\" scoring is lexical overlap, not a real embedding model. Confidence now scales with actual match quality after a fix this session — a gibberish query correctly scores low instead of a fixed 96%.",
  },
  sql: {
    title: "Text-to-SQL Guardrails",
    tag: "#8",
    what: "Two real halves: a rules-based translator maps a plain-English question onto a fixed set of safe SELECT templates (/spokes/sql/ask), and a guardrail validator/executor runs SQL you write yourself against a sandboxed database, blocking destructive verbs, stacked statements, and schema hallucinations (/spokes/sql/execute).",
    connects: "Independent endpoint, same as RAG — not part of the chat-completions request path.",
    caveat: "Hardened against a confirmed exploit found this session: one oversized query used to freeze the entire gateway for several seconds and crash on response serialization. Now capped and isolated.",
  },
  docs: {
    title: "Self-Healing Docs",
    tag: "#4",
    what: "Parses real Python source with the actual ast module and compares function signatures against a markdown doc's `func(args)` entries. On drift, the CI workflow writes the healed markdown back and opens a real pull request.",
    connects: "Independent endpoint. The GitHub Action version of this same engine runs against this repo's own gateway/API_REFERENCE.md on every pull request touching gateway/**.py.",
    caveat: "Only catches drift in functions that already have a doc entry — an undocumented function is invisible to it, by design.",
  },
  lora: {
    title: "LoRA Fine-Tuning Pipeline",
    tag: "#10",
    what: "Computes exact LoRA parameter counts for the selected base model's real architecture — Llama, Mistral, and Gemma each use different hidden-size and layer-count values — and a benchmark accuracy that's a genuine function of the chosen rank, verified strictly increasing from r=8 to r=64.",
    connects: "Independent endpoint. Nothing else in the system reads from it.",
    caveat: "Estimates what a LoRA fine-tune would achieve — it never actually trains anything.",
  },
  manager: {
    title: "Control Plane Manager",
    tag: "#1 + #13",
    what: "Not in the request path at all. On demand, it re-runs 8 golden test cases spanning the chat pipeline, every spoke, and the auth system — including one that checks this repo's own docs stay in sync — and diffs the result against the previous run, so it reports \"this specific case just regressed\" instead of just \"something's failing.\"",
    connects: "Also aggregates live state it doesn't own: circuit-breaker status and rate-limit usage from the pipeline, trace anomaly rate from Forensics Tracing, and the mined eval-dataset count.",
    caveat: "Proven live this session: a docs-sync case was deliberately broken, the harness caught it and marked the whole system DEGRADED, then correctly reported recovery once fixed.",
  },
};

function Drawer({ nodeKey, onClose }: { nodeKey: string | null; onClose: () => void }) {
  const open = nodeKey !== null;
  const detail = nodeKey ? NODE_DETAILS[nodeKey] : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/70 z-40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[440px] bg-[#0c0c10] border-l border-zinc-800 z-50 overflow-y-auto transform transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
      >
        {detail && (
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-[#d4af37] bg-zinc-900 border border-zinc-800 mb-3">
                  {detail.tag}
                </div>
                <h3 className="text-xl font-serif-luxury text-white leading-snug">{detail.title}</h3>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5 text-sm">
              <p className="text-zinc-300 leading-relaxed">{detail.what}</p>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1.5">How it connects</span>
                <p className="text-zinc-400 leading-relaxed text-[13px]">{detail.connects}</p>
              </div>

              {detail.caveat !== "—" && (
                <div className="p-3.5 rounded-xl bg-amber-950/15 border border-amber-900/30">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500/80 block mb-1.5">Worth knowing</span>
                  <p className="text-amber-200/80 leading-relaxed text-[13px]">{detail.caveat}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

interface NodeBoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tag: string;
  nodeKey: string;
  onSelect: (key: string) => void;
  accent?: boolean;
}

function NodeBox({ x, y, w, h, label, tag, nodeKey, onSelect, accent }: NodeBoxProps) {
  return (
    <g
      onClick={() => onSelect(nodeKey)}
      style={{ cursor: "pointer" }}
      className="group"
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill="#0e0e12"
        stroke={accent ? "#d4af37" : "#3f3f46"}
        strokeWidth={1.2}
        className="transition-colors group-hover:stroke-[#d4af37]"
      />
      <text x={x + 14} y={y + h / 2 - 6} fill="#71717a" fontSize="9" fontFamily="monospace" letterSpacing="0.05em">
        {tag.toUpperCase()}
      </text>
      <text x={x + 14} y={y + h / 2 + 13} fill="#e4e4e7" fontSize="13" fontFamily="inherit">
        {label}
      </text>
    </g>
  );
}

export default function AegisArchitectureDiagram() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <p className="text-xs text-zinc-500 font-mono">Click any box for exactly what it does — this is the real request flow, not an illustration of it.</p>
        <button
          onClick={() => setSelected("overview")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-[#d4af37] text-[11px] font-mono transition-colors flex-shrink-0"
        >
          <Info className="w-3 h-3" /> How It Works
        </button>
      </div>

      <div className="luxury-panel rounded-2xl p-4 sm:p-6 overflow-x-auto">
        <svg viewBox="0 0 1000 980" className="w-full min-w-[820px]" style={{ height: "auto" }}>
          <defs>
            <marker id="arrow-gold" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#d4af37" />
            </marker>
            <marker id="arrow-gray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#71717a" />
            </marker>
          </defs>

          {/* Client */}
          <g onClick={() => setSelected("overview")} style={{ cursor: "pointer" }} className="group">
            <rect x={370} y={15} width={260} height={50} rx={25} fill="#18181b" stroke="#52525b" strokeWidth={1.2} className="transition-colors group-hover:stroke-[#d4af37]" />
            <text x={500} y={45} fill="#e4e4e7" fontSize="13" textAnchor="middle">Client / Your App</text>
          </g>

          {/* Split lines from client to both columns */}
          <path d="M500,65 L500,95 L255,95 L255,113" fill="none" stroke="#52525b" strokeWidth={1.2} markerEnd="url(#arrow-gray)" />
          <path d="M500,95 L745,95 L745,113" fill="none" stroke="#52525b" strokeWidth={1.2} markerEnd="url(#arrow-gray)" />

          {/* LEFT CONTAINER: Chat Completions Pipeline */}
          <rect x={35} y={115} width={440} height={580} rx={14} fill="#ffffff05" stroke="#ffffff26" strokeWidth={1} />
          <text x={55} y={140} fill="#a1a1aa" fontSize="10.5" fontFamily="monospace" letterSpacing="0.04em">CHAT COMPLETIONS PIPELINE · POST /v1/chat/completions</text>
          <line x1={35} y1={150} x2={475} y2={150} stroke="#ffffff1a" strokeWidth={1} />

          <NodeBox x={60} y={165} w={390} h={55} tag="#11 · Service Layer" label="Auth & Rate Limit" nodeKey="auth-ratelimit" onSelect={setSelected} />
          <line x1={255} y1={220} x2={255} y2={233} stroke="#d4af37" strokeWidth={1.3} markerEnd="url(#arrow-gold)" />

          <NodeBox x={60} y={233} w={390} h={55} tag="#2" label="Cost Autopilot" nodeKey="cost-autopilot" onSelect={setSelected} />
          <line x1={255} y1={288} x2={255} y2={301} stroke="#d4af37" strokeWidth={1.3} markerEnd="url(#arrow-gold)" />

          <NodeBox x={60} y={301} w={390} h={55} tag="#9 + #12 · optional" label="A/B Variant + Canary" nodeKey="experiments" onSelect={setSelected} />
          <line x1={255} y1={356} x2={255} y2={369} stroke="#d4af37" strokeWidth={1.3} markerEnd="url(#arrow-gold)" />

          <NodeBox x={60} y={369} w={390} h={55} tag="#11" label="Circuit Breaker" nodeKey="circuit-breaker" onSelect={setSelected} />
          <line x1={255} y1={424} x2={255} y2={437} stroke="#d4af37" strokeWidth={1.3} markerEnd="url(#arrow-gold)" />

          <NodeBox x={60} y={437} w={390} h={55} tag="Infrastructure" label="Provider Dispatch" nodeKey="provider" onSelect={setSelected} accent />
          <line x1={255} y1={492} x2={255} y2={505} stroke="#d4af37" strokeWidth={1.3} markerEnd="url(#arrow-gold)" />

          <NodeBox x={60} y={505} w={390} h={55} tag="#5 · optional" label="Multi-Critic Arbitration" nodeKey="arbitration" onSelect={setSelected} />
          <line x1={255} y1={560} x2={255} y2={573} stroke="#d4af37" strokeWidth={1.3} markerEnd="url(#arrow-gold)" />

          <NodeBox x={60} y={573} w={390} h={55} tag="#3 + #7" label="Forensics Tracing" nodeKey="tracing" onSelect={setSelected} />

          {/* RIGHT CONTAINER: Applied Spokes */}
          <rect x={525} y={115} width={440} height={580} rx={14} fill="#ffffff05" stroke="#ffffff26" strokeWidth={1} />
          <text x={545} y={140} fill="#a1a1aa" fontSize="10.5" fontFamily="monospace" letterSpacing="0.04em">APPLIED SPOKES · independent endpoints</text>
          <line x1={525} y1={150} x2={965} y2={150} stroke="#ffffff1a" strokeWidth={1} />

          <NodeBox x={550} y={175} w={390} h={65} tag="#6" label="Hybrid RAG" nodeKey="rag" onSelect={setSelected} />
          <NodeBox x={550} y={305} w={390} h={65} tag="#8" label="Text-to-SQL Guardrails" nodeKey="sql" onSelect={setSelected} />
          <NodeBox x={550} y={435} w={390} h={65} tag="#4" label="Self-Healing Docs" nodeKey="docs" onSelect={setSelected} />
          <NodeBox x={550} y={565} w={390} h={65} tag="#10" label="LoRA Fine-Tuning Pipeline" nodeKey="lora" onSelect={setSelected} />

          {/* Responses */}
          <line x1={255} y1={628} x2={255} y2={728} stroke="#d4af37" strokeWidth={1.3} markerEnd="url(#arrow-gold)" />
          <rect x={105} y={733} width={300} height={45} rx={22} fill="#18181b" stroke="#52525b" strokeWidth={1.1} />
          <text x={255} y={760} fill="#d4d4d8" fontSize="11.5" textAnchor="middle">Response + gateway_metadata</text>

          <line x1={745} y1={630} x2={745} y2={728} stroke="#d4af37" strokeWidth={1.3} markerEnd="url(#arrow-gold)" />
          <rect x={595} y={733} width={300} height={45} rx={22} fill="#18181b" stroke="#52525b" strokeWidth={1.1} />
          <text x={745} y={760} fill="#d4d4d8" fontSize="11.5" textAnchor="middle">JSON response (per spoke)</text>

          {/* Manager */}
          <g onClick={() => setSelected("manager")} style={{ cursor: "pointer" }} className="group">
            <rect x={35} y={820} width={930} height={140} rx={14} fill="#0e0e12" stroke="#d4af37" strokeWidth={1.2} strokeOpacity={0.5} className="transition-colors group-hover:stroke-opacity-100" />
            <text x={55} y={848} fill="#d4af37" fontSize="11" fontFamily="monospace" letterSpacing="0.06em">#1 + #13 · CONTROL PLANE MANAGER</text>
            <text x={55} y={875} fill="#d4d4d8" fontSize="12.5">Not in the request path. Reads circuit-breaker state, rate limits, and trace anomalies from the</text>
            <text x={55} y={897} fill="#d4d4d8" fontSize="12.5">pipeline on the left — and on demand, re-runs 8 golden test cases against the pipeline and</text>
            <text x={55} y={919} fill="#d4d4d8" fontSize="12.5">every spoke on the right, reporting exactly what regressed, not just &ldquo;something broke.&rdquo;</text>
            <text x={55} y={945} fill="#71717a" fontSize="10.5" fontFamily="monospace">Click for the proof — a real regression was triggered and caught live this session.</text>
          </g>

          {/* Supervisory dashed connectors */}
          <line x1={180} y1={695} x2={180} y2={820} stroke="#71717a" strokeWidth={1} strokeDasharray="4,4" markerEnd="url(#arrow-gray)" />
          <text x={188} y={760} fill="#71717a" fontSize="9.5" fontFamily="monospace">reads state</text>

          <line x1={820} y1={695} x2={820} y2={820} stroke="#71717a" strokeWidth={1} strokeDasharray="4,4" markerEnd="url(#arrow-gray)" />
          <text x={700} y={760} fill="#71717a" fontSize="9.5" fontFamily="monospace" textAnchor="end">runs golden cases →</text>
        </svg>
      </div>

      <Drawer nodeKey={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
