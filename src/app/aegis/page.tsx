"use client";

import React from "react";
import Link from "next/link";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AegisGatewaySimulator from "@/components/AegisGatewaySimulator";
import AegisArchitectureDiagram from "@/components/AegisArchitectureDiagram";
import {
  ShieldCheck,
  Zap,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Container,
  KeyRound,
  Workflow,
  Mail,
} from "lucide-react";

type CapabilityStatus = "REAL" | "REAL_HEURISTIC";

interface Capability {
  id: number;
  name: string;
  status: CapabilityStatus;
  detail: string;
  caveat: string;
}

const CAPABILITIES: Capability[] = [
  { id: 1, name: "Model Regression Detection", status: "REAL", detail: "Golden-case harness diffs pass/fail against the last run — flags exactly which case regressed.", caveat: "Slack alerts log-only unless a webhook is configured." },
  { id: 2, name: "Cost Autopilot Router", status: "REAL", detail: "Routes simple prompts to cheap models, complex ones to reasoning-tier models, by real content analysis.", caveat: "—" },
  { id: 3, name: "Failure Forensics & Tracing", status: "REAL", detail: "Full per-hop span waterfall, fetchable by trace ID.", caveat: "OTel-shaped, not OTel-protocol-compatible." },
  { id: 4, name: "Self-Healing Technical Docs", status: "REAL", detail: "Real Python AST parsing; CI opens an actual correction PR on drift.", caveat: "Only catches drift in already-documented functions." },
  { id: 5, name: "Output Arbitration System", status: "REAL_HEURISTIC", detail: "Weighted confidence score from 3 independent checks, wired into every arbitrated request.", caveat: "Critics are pattern heuristics, not separate model calls." },
  { id: 6, name: "Hybrid RAG with Citations", status: "REAL", detail: "Real BM25 scoring plus real ingestion of markdown files with genuine line-number citations.", caveat: "“Dense” score is lexical trigram overlap, not embeddings." },
  { id: 7, name: "Observability Telemetry", status: "REAL", detail: "Real computed latency, cost, and savings on every response.", caveat: "—" },
  { id: 8, name: "Text-to-SQL with Guardrails", status: "REAL", detail: "Plain-English → SQL translation, structurally incapable of emitting destructive statements, plus AST-ish execution guardrails.", caveat: "Rules-based translator, not an LLM call." },
  { id: 9, name: "Prompt A/B Testing", status: "REAL", detail: "Live-wired weighted variant selection with a real two-sample z-test for significance.", caveat: "No multiple-testing correction across many variants yet." },
  { id: 10, name: "LoRA Fine-Tuning Pipeline", status: "REAL", detail: "Exact parameter math; benchmark accuracy is a real function of rank, verified strictly increasing.", caveat: "Estimates a training run — doesn't perform one." },
  { id: 11, name: "LLM Gateway & Circuit Breaker", status: "REAL", detail: "Real CLOSED/OPEN/HALF_OPEN state machine and token-bucket limiter, now plan-aware.", caveat: "Single-process — a fleet needs Redis for shared counters." },
  { id: 12, name: "Canary AI Feature Flags", status: "REAL", detail: "Percentage rollout with moving-average auto-rollback — verified tripping live.", caveat: "—" },
  { id: 13, name: "Automated Eval Dataset Miner", status: "REAL", detail: "Every failed trace is auto-mined into a growing golden eval dataset.", caveat: "No dedup/clustering of similar failures yet." },
];

const PLANS = [
  { id: "free", name: "Free", price: "$0", cadence: "/mo", rpm: "60 rpm", tpm: "40K tpm", budget: "$5 budget", highlight: false },
  { id: "pro", name: "Pro", price: "$49", cadence: "/mo", rpm: "300 rpm", tpm: "200K tpm", budget: "$100 budget", highlight: true },
  { id: "enterprise", name: "Enterprise", price: "$499", cadence: "/mo", rpm: "2,000 rpm", tpm: "2M tpm", budget: "$2,000 budget", highlight: false },
];

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-[#d4af37] bg-zinc-900 border border-zinc-800 mb-3">
        {eyebrow}
      </div>
      <h2 className="text-2xl sm:text-3xl font-serif-luxury font-normal text-white">{title}</h2>
      {sub && <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{sub}</p>}
    </div>
  );
}

export default function AegisProductPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#08080a] text-zinc-100 selection:bg-[#d4af37] selection:text-black">
      <ReadingProgressBar />
      <Navbar />

      <main className="flex-grow">
        {/* HERO */}
        <section className="py-20 md:py-28 border-b border-zinc-800/60">
          <div className="max-w-4xl mx-auto px-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-[#d4af37] bg-zinc-900 border border-zinc-800 mb-5">
              <ShieldCheck className="w-3.5 h-3.5" />
              AI Reliability Gateway & Control Plane
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif-luxury font-normal text-white leading-[1.05] mb-6">
              Aegis
            </h1>
            <p className="text-lg sm:text-xl text-zinc-300 leading-relaxed max-w-2xl mb-4">
              An OpenAI-compatible reverse proxy that sits in front of your LLM providers and adds what a raw API call doesn&apos;t have: cost-aware routing, automatic failover, rate limits that survive a restart, prompt experimentation, and a regression suite that tells you exactly what broke.
            </p>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl mb-8">
              Thirteen capabilities, each graded honestly below — not a page claiming uniform completeness. 58 automated tests. Try it live at the bottom of this page.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#demo" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d4af37] text-zinc-950 font-mono text-xs font-semibold hover:bg-[#e6be44] transition-all">
                <Zap className="w-3.5 h-3.5" /> Try the Live Demo
              </a>
              <a href="#capabilities" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl luxury-panel text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-all">
                See the 13 Capabilities <ArrowRight className="w-3.5 h-3.5 text-[#d4af37]" />
              </a>
              <a href="#architecture" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl luxury-panel text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-all">
                How It Works <ArrowRight className="w-3.5 h-3.5 text-[#d4af37]" />
              </a>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-10 pt-6 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 58/58 tests passing</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 0 TypeScript errors</span>
              <span className="flex items-center gap-1.5"><Container className="w-3.5 h-3.5 text-zinc-400" /> Dockerized</span>
              <span className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5 text-zinc-400" /> API keys + plan tiers</span>
              <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-zinc-400" /> Spend survives restarts</span>
            </div>
          </div>
        </section>

        {/* PROBLEM / SOLUTION */}
        <section className="py-16 md:py-20 border-b border-zinc-800/60">
          <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-500 mb-3">The Problem</h3>
              <p className="text-zinc-300 text-sm leading-relaxed">
                A direct call to an LLM provider is a single point of failure with no cost discipline. One 429 or 503 halts every downstream workflow. Every prompt defaults to the most expensive model regardless of how simple the question is. Nobody can say which prompt version is actually better, or whether last week&apos;s change quietly made outputs worse.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-[#d4af37] mb-3">The Gateway</h3>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Aegis sits between your app and every provider. It routes on complexity, fails over on outage, enforces budgets per team, runs prompt variants against each other with real statistics, and keeps a golden-case suite that catches regressions the moment they happen — all wired into one request path, not five disconnected demos.
              </p>
            </div>
          </div>
        </section>

        {/* ARCHITECTURE */}
        <section id="architecture" className="py-16 md:py-20 border-b border-zinc-800/60">
          <div className="max-w-4xl mx-auto px-6">
            <SectionHeading eyebrow="Architecture" title="Two independent paths, one control plane" sub="A chat completion runs the full pipeline on the left. The four applied spokes on the right are separate endpoints — they don't route through it. Click any box for what it actually does." />
            <AegisArchitectureDiagram />
          </div>
        </section>

        {/* CAPABILITIES */}
        <section id="capabilities" className="py-16 md:py-20 border-b border-zinc-800/60">
          <div className="max-w-4xl mx-auto px-6">
            <SectionHeading
              eyebrow="Honest Grading"
              title="13 capabilities, graded the way I'd want a vendor to grade themselves"
              sub="REAL means wired, tested, and live-verified. REAL (heuristic) means the same, with a specific, named simplification instead of a hidden one."
            />
            <div className="grid sm:grid-cols-2 gap-3">
              {CAPABILITIES.map((c) => (
                <div key={c.id} className="luxury-panel rounded-xl p-4 text-xs font-mono">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-zinc-200 font-semibold">#{c.id} {c.name}</span>
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] uppercase ${c.status === "REAL" ? "bg-emerald-950/50 text-emerald-400" : "bg-amber-950/50 text-amber-400"}`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed mb-1.5">{c.detail}</p>
                  {c.caveat !== "—" && (
                    <p className="text-zinc-600 flex items-start gap-1 leading-relaxed">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {c.caveat}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SERVICE LAYER / PRICING */}
        <section className="py-16 md:py-20 border-b border-zinc-800/60">
          <div className="max-w-4xl mx-auto px-6">
            <SectionHeading
              eyebrow="Beyond The 13"
              title="What makes this service-shaped, not just clever"
              sub="API keys hashed at rest, plan-tiered rate limits, and spend that survives a restart — verified by actually killing the process and checking the number again."
            />
            <div className="grid sm:grid-cols-3 gap-4 mb-10">
              {PLANS.map((p) => (
                <div key={p.id} className={`rounded-2xl p-5 border ${p.highlight ? "border-[#d4af37]/60 bg-zinc-900" : "border-zinc-800/80 bg-zinc-950"}`}>
                  {p.highlight && <div className="text-[9px] font-mono uppercase tracking-wider text-[#d4af37] mb-2">Most Common</div>}
                  <div className="text-sm font-mono text-zinc-300 mb-1">{p.name}</div>
                  <div className="text-2xl font-serif-luxury text-white mb-3">{p.price}<span className="text-xs text-zinc-500 font-mono">{p.cadence}</span></div>
                  <ul className="space-y-1 text-[11px] font-mono text-zinc-400">
                    <li>{p.rpm}</li>
                    <li>{p.tpm}</li>
                    <li>{p.budget}</li>
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-600 font-mono leading-relaxed max-w-2xl">
              These tiers are real — <code className="text-zinc-400">GET /v1/plans</code> returns exactly this data from the running gateway, and issuing a key genuinely applies these limits. What&apos;s <em>not</em> real: no payment is collected here. This is infrastructure for a service, demonstrated honestly, not a live storefront.
            </p>
          </div>
        </section>

        {/* DEMO */}
        <section id="demo">
          <AegisGatewaySimulator />
        </section>

        {/* DOCS / LINKS */}
        <section className="py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-6">
            <SectionHeading eyebrow="Go Deeper" title="More on how and why" />
            <div className="grid sm:grid-cols-3 gap-4">
              <a href="#architecture" className="luxury-panel rounded-xl p-4 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-all flex items-start gap-3">
                <Workflow className="w-4 h-4 text-[#d4af37] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-1">How It Works</div>
                  <div className="text-zinc-500">The full request-flow diagram, with a written explanation behind every box.</div>
                </div>
              </a>
              <Link href="/research/architecting-enterprise-ai-reliability-gateway" className="luxury-panel rounded-xl p-4 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-all flex items-start gap-3">
                <Search className="w-4 h-4 text-[#d4af37] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-1">The Dissertation</div>
                  <div className="text-zinc-500">Why circuit breakers and cost routing matter, in essay form.</div>
                </div>
              </Link>
              <Link href="/contact" className="luxury-panel rounded-xl p-4 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-all flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#d4af37] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-1">Get in Touch</div>
                  <div className="text-zinc-500">Want access, a walkthrough, or to talk about the architecture directly.</div>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
