import React from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import { AUTHOR_INFO, FEATURED_REPOS } from "@/data/blog";
import Logo from "@/components/Logo";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Cpu,
  Layers,
  Database,
  Terminal,
  Shield,
  Sparkles,
  Mail,
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "About — Victor",
  description:
    "Background, technical ethos, and research trajectory of Victor. Architecting autonomous intelligence, context caching systems, and high-performance software.",
  alternates: {
    canonical: "https://victorc.me/about",
  },
  openGraph: {
    title: "About Victor — AI Systems & Research",
    description:
      "Background, technical ethos, and research trajectory of Victor. Architecting autonomous intelligence, context caching systems, and high-performance software.",
    url: "https://victorc.me/about",
  },
};

const PILLARS = [
  {
    icon: Cpu,
    title: "Autonomous Agent Architecture",
    description:
      "Engineering robust state machines and protocol dispatchers. Moving past fragile prompt chains into deterministic, observable agent loops that can self-correct, execute multi-step tools, and operate reliably in production.",
  },
  {
    icon: Layers,
    title: "Context Invariance & Token Economics",
    description:
      "Pioneering KV-cache re-use strategies and prefix design. Slashing inference latency and API expenditure by treating model context as a warm memory cache rather than an ephemeral buffer.",
  },
  {
    icon: Database,
    title: "Vector Topologies & Retrieval",
    description:
      "Designing high-recall hybrid retrieval architectures. Evaluating trade-offs between graph-based indexing (HNSW) and inverted centroid clustering (IVF-Flat) under strict RAM constraints.",
  },
  {
    icon: Shield,
    title: "System Discipline & Zero Cost Overhead",
    description:
      "Constructing serverless, edge-deployed pipelines that scale to zero when idle and surge gracefully under load. Clean, minimal dependencies with zero architectural waste.",
  },
];

const TECH_STACK = [
  { category: "Languages", items: ["Python", "TypeScript", "JavaScript", "Rust", "SQL", "HTML/CSS"] },
  { category: "Frontier AI", items: ["Gemini 3.6 / 2.5 Flash", "Claude Code / Sonnet", "DeepSeek R1", "OpenAI o3", "PyTorch"] },
  { category: "Systems & Deploy", items: ["Next.js (App Router)", "Vercel Edge", "Google Cloud Run", "Docker", "Git"] },
  { category: "Data & Storage", items: ["Cloud Firestore", "PostgreSQL", "Redis", "HNSW Vector Indices", "Tailwind CSS"] },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#08080a] text-zinc-100 selection:bg-[#d4af37] selection:text-black">
      <ReadingProgressBar />
      <Navbar />

      <main className="flex-grow py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6">
          {/* Breadcrumb / Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-white transition-colors mb-12"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Portal
          </Link>

          {/* Hero Header */}
          <header className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Logo size={32} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]">
                Identity & Ethos
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-serif-luxury font-normal tracking-tight text-white leading-tight">
              Architecting intelligence with taste, architecture, and discipline.
            </h1>

            <div className="mt-8 pt-8 border-t border-zinc-800/60">
              <blockquote className="font-serif-luxury italic text-xl sm:text-2xl text-zinc-300 leading-relaxed">
                “Compute is merely an amplifier of intent. Without architecture, taste, and discipline, it is only expensive noise.”
              </blockquote>
            </div>
          </header>

          {/* Biography Narrative */}
          <section className="prose-luxury space-y-6 text-base text-zinc-300 font-light leading-relaxed mb-20">
            <p>
              I am an AI systems engineer and software researcher building high-performance architectures, autonomous agent loops, and frontier language model tooling. My work bridges the gap between abstract artificial intelligence research and production-grade software engineering.
            </p>
            <p>
              Rather than treating language models as black-box chatbots, I examine them as stochastic microprocessors: systems governed by memory bandwidth, cache invariance, attention topologies, and deterministic runtime constraints.
            </p>
            <p>
              When I build, I prioritize lean systems: code that compiles quickly, runs with sub-second latency, respects computational cost, and avoids unnecessary framework bloat.
            </p>
          </section>

          {/* Research & Architectural Pillars */}
          <section className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-serif-luxury font-normal text-white">
                Core Engineering Pillars
              </h2>
              <span className="text-[11px] font-mono text-zinc-500">04 Disciplines</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {PILLARS.map((pillar, i) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={i}
                    className="luxury-panel rounded-2xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#d4af37] mb-4">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-serif-luxury text-white mb-2 font-medium">
                        {pillar.title}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed font-light">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Open-Source Works */}
          <section className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-serif-luxury font-normal text-white">
                Selected Open Source Works
              </h2>
              <a
                href={AUTHOR_INFO.github}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-zinc-400 hover:text-[#d4af37] transition-colors flex items-center gap-1"
              >
                GitHub Profile
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-4">
              {FEATURED_REPOS.slice(0, 4).map((repo) => (
                <a
                  key={repo.name}
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="luxury-panel rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group block hover:border-[#d4af37]/40 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-white font-medium group-hover:text-[#d4af37] transition-colors">
                        {repo.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                        {repo.language}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-400 font-light leading-relaxed max-w-xl">
                      {repo.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500 group-hover:text-zinc-300 text-xs font-mono shrink-0">
                    <span>Inspect</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Technical Stack */}
          <section className="mb-20">
            <h2 className="text-2xl font-serif-luxury font-normal text-white mb-8">
              Technical Stack & Instrumentation
            </h2>

            <div className="luxury-panel rounded-2xl p-7 space-y-6">
              {TECH_STACK.map((group) => (
                <div key={group.category} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                  <span className="text-xs font-mono text-zinc-500 w-32 shrink-0">
                    {group.category}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span
                        key={item}
                        className="text-xs font-mono px-2.5 py-1 rounded-lg bg-zinc-900/90 text-zinc-300 border border-zinc-800"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contact / Colophon CTA */}
          <section className="luxury-panel rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden">
            <div className="max-w-md mx-auto">
              <div className="inline-flex p-3 rounded-full bg-zinc-900 border border-zinc-800 text-[#d4af37] mb-4">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-serif-luxury font-normal text-white mb-3">
                Let&apos;s Start a Dialogue.
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm font-light leading-relaxed mb-6">
                Whether you wish to discuss autonomous agent loops, explore research collaboration, or simply share technical feedback, my inbox is always open.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/contact"
                  className="px-6 py-3 rounded-xl bg-white text-black text-xs font-mono font-medium hover:bg-zinc-200 transition-colors shadow-sm"
                >
                  Direct Correspondence
                </Link>
                <Link
                  href="/demo"
                  className="px-6 py-3 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono transition-colors"
                >
                  Test AI Concierge
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
