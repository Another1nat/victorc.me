"use client";

import React from "react";

function DiagramCard({ eyebrow, title, caption, children }: { eyebrow: string; title: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="luxury-panel rounded-2xl p-5 sm:p-6">
      <div className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] mb-1.5">{eyebrow}</div>
      <h3 className="text-base font-serif-luxury text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">{children}</div>
      <p className="text-[11px] text-zinc-500 leading-relaxed mt-4">{caption}</p>
    </div>
  );
}

function CircuitBreakerDiagram() {
  return (
    <svg viewBox="0 0 440 300" className="w-full min-w-[380px]" style={{ height: "auto" }}>
      <defs>
        <marker id="cb-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#71717a" />
        </marker>
      </defs>

      {/* CLOSED */}
      <rect x={140} y={15} width={160} height={60} rx={12} fill="#0e0e12" stroke="#4ade80" strokeWidth={1.3} />
      <text x={220} y={40} fill="#4ade80" fontSize="12" fontWeight={600} textAnchor="middle">CLOSED</text>
      <text x={220} y={58} fill="#a1a1aa" fontSize="9.5" textAnchor="middle">normal traffic flows</text>

      {/* OPEN */}
      <rect x={20} y={220} width={160} height={60} rx={12} fill="#0e0e12" stroke="#f87171" strokeWidth={1.3} />
      <text x={100} y={245} fill="#f87171" fontSize="12" fontWeight={600} textAnchor="middle">OPEN</text>
      <text x={100} y={263} fill="#a1a1aa" fontSize="9.5" textAnchor="middle">provider skipped, 20s</text>

      {/* HALF_OPEN */}
      <rect x={260} y={220} width={160} height={60} rx={12} fill="#0e0e12" stroke="#fbbf24" strokeWidth={1.3} />
      <text x={340} y={245} fill="#fbbf24" fontSize="12" fontWeight={600} textAnchor="middle">HALF_OPEN</text>
      <text x={340} y={263} fill="#a1a1aa" fontSize="9.5" textAnchor="middle">one probe allowed</text>

      {/* CLOSED -> OPEN */}
      <path d="M170,75 C120,120 105,160 100,218" fill="none" stroke="#71717a" strokeWidth={1.2} markerEnd="url(#cb-arrow)" />
      <text x={78} y={150} fill="#a1a1aa" fontSize="9.5">3 consecutive</text>
      <text x={78} y={162} fill="#a1a1aa" fontSize="9.5">failures</text>

      {/* OPEN -> HALF_OPEN */}
      <path d="M180,250 L258,250" fill="none" stroke="#71717a" strokeWidth={1.2} markerEnd="url(#cb-arrow)" />
      <text x={185} y={285} fill="#a1a1aa" fontSize="9.5">20s elapses</text>

      {/* HALF_OPEN -> CLOSED (probe succeeds) */}
      <path d="M310,218 C280,160 260,110 225,77" fill="none" stroke="#71717a" strokeWidth={1.2} markerEnd="url(#cb-arrow)" />
      <text x={295} y={150} fill="#a1a1aa" fontSize="9.5">probe</text>
      <text x={295} y={162} fill="#a1a1aa" fontSize="9.5">succeeds</text>

      {/* HALF_OPEN -> OPEN (probe fails), curved below */}
      <path d="M340,222 C340,200 200,200 130,220" fill="none" stroke="#71717a" strokeWidth={1.2} strokeDasharray="3,3" markerEnd="url(#cb-arrow)" />
      <text x={195} y={198} fill="#a1a1aa" fontSize="9.5" textAnchor="middle">probe fails</text>
    </svg>
  );
}

function CostAutopilotDiagram() {
  return (
    <svg viewBox="0 0 440 300" className="w-full min-w-[380px]" style={{ height: "auto" }}>
      <defs>
        <marker id="ca-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#71717a" />
        </marker>
      </defs>

      {/* Incoming prompt */}
      <rect x={140} y={10} width={160} height={44} rx={22} fill="#18181b" stroke="#52525b" strokeWidth={1.2} />
      <text x={220} y={37} fill="#e4e4e7" fontSize="11.5" textAnchor="middle">Incoming Prompt</text>

      {/* Decision diamond */}
      <polygon points="220,72 320,132 220,192 120,132" fill="#0e0e12" stroke="#d4af37" strokeWidth={1.3} />
      <text x={220} y={124} fill="#d4af37" fontSize="10.5" textAnchor="middle" fontWeight={600}>&gt;1200 chars, or</text>
      <text x={220} y={140} fill="#d4af37" fontSize="10.5" textAnchor="middle" fontWeight={600}>&ldquo;analyze&rdquo; / &ldquo;code&rdquo;?</text>

      <path d="M220,54 L220,70" fill="none" stroke="#71717a" strokeWidth={1.2} markerEnd="url(#ca-arrow)" />

      {/* NO branch -> cheap chain */}
      <path d="M120,132 C70,132 60,180 60,215" fill="none" stroke="#71717a" strokeWidth={1.2} markerEnd="url(#ca-arrow)" />
      <text x={30} y={175} fill="#a1a1aa" fontSize="10">no</text>
      <rect x={5} y={220} width={175} height={62} rx={10} fill="#0e0e12" stroke="#4ade80" strokeWidth={1.2} />
      <text x={92} y={243} fill="#4ade80" fontSize="11" fontWeight={600} textAnchor="middle">Gemini Flash chain</text>
      <text x={92} y={260} fill="#a1a1aa" fontSize="9.5" textAnchor="middle">~$0.00003 · ~48ms</text>
      <text x={92} y={274} fill="#a1a1aa" fontSize="9.5" textAnchor="middle">~96% cheaper</text>

      {/* YES branch -> reasoning chain */}
      <path d="M320,132 C370,132 380,180 380,215" fill="none" stroke="#71717a" strokeWidth={1.2} markerEnd="url(#ca-arrow)" />
      <text x={385} y={175} fill="#a1a1aa" fontSize="10">yes</text>
      <rect x={260} y={220} width={175} height={62} rx={10} fill="#0e0e12" stroke="#f0abfc" strokeWidth={1.2} />
      <text x={347} y={243} fill="#f0abfc" fontSize="11" fontWeight={600} textAnchor="middle">Anthropic chain</text>
      <text x={347} y={260} fill="#a1a1aa" fontSize="9.5" textAnchor="middle">~$0.004 · ~420ms</text>
      <text x={347} y={274} fill="#a1a1aa" fontSize="9.5" textAnchor="middle">reasoning-tier</text>
    </svg>
  );
}

export default function AegisConceptDiagrams() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <DiagramCard
        eyebrow="#11 · Circuit Breaker"
        title="Three states, not a binary up/down"
        caption="Verified live this session: after 3 consecutive failures, a provider is skipped entirely for 20 seconds — not retried, not queued, just bypassed — then gets exactly one probe before fully reopening."
      >
        <CircuitBreakerDiagram />
      </DiagramCard>
      <DiagramCard
        eyebrow="#2 · Cost Autopilot"
        title="One branch, decided by real content analysis"
        caption="The numbers shown are real per-token pricing for the providers configured — not illustrative placeholders. Try both scenarios in the live demo below."
      >
        <CostAutopilotDiagram />
      </DiagramCard>
    </div>
  );
}
