"use client";

import React, { useRef, useEffect } from "react";
import { AUTHOR_INFO } from "@/data/blog";
import { Search, Sparkles, Filter, ArrowUpRight, Compass } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/Icons";

interface BlogHeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  categories: string[];
  activeTab: "research" | "notes";
  setActiveTab: (tab: "research" | "notes") => void;
  researchCount: number;
  notesCount: number;
}

export default function BlogHeader({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  activeTab,
  setActiveTab,
  researchCount,
  notesCount,
}: BlogHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener ('/' to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <section className="pt-20 pb-12 md:pt-28 md:pb-16 border-b border-zinc-800/60 relative">
      <div className="max-w-4xl mx-auto px-6 relative z-10">
        {/* Active Focus Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
          <span className="text-zinc-300">Active Focus:</span>
          <span className="text-zinc-400">Autonomous concierges & context economics</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-serif-luxury font-normal text-white leading-[1.12] tracking-tight">
          AI is as smart as the people who use it.
        </h1>

        {/* Philosophical Counter-line & Context */}
        <div className="mt-6 space-y-3 max-w-2xl">
          <p className="text-lg sm:text-xl font-serif-luxury italic text-[#e4e4e7] font-normal leading-relaxed">
            "Compute is merely an amplifier of intent. Without architecture, taste, and discipline, it is only expensive noise."
          </p>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-light">
            I'm <strong className="text-zinc-200 font-normal">Victor</strong>. I architect autonomous agent systems, token observability harnesses, and high-performance developer tooling. This journal documents empirical benchmarks, architectural teardowns, and observations on artificial intelligence.
          </p>
        </div>

        {/* Quiet Meta Links */}
        <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400">
          <a
            href={AUTHOR_INFO.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>Another1nat</span>
            <ArrowUpRight className="w-3 h-3 text-zinc-500" />
          </a>

          <span className="text-zinc-700">•</span>

          <a
            href={AUTHOR_INFO.linkedin}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-[#d4af37] transition-colors"
          >
            <LinkedinIcon className="w-3.5 h-3.5" />
            <span>LinkedIn</span>
            <ArrowUpRight className="w-3 h-3 text-zinc-500" />
          </a>

          <span className="text-zinc-700">•</span>

          <a
            href="/contact"
            className="text-zinc-300 hover:text-[#d4af37] transition-colors"
          >
            Inquiries & Correspondence
          </a>
        </div>

        {/* Tab Selection */}
        <div className="mt-14 pt-8 border-t border-zinc-800/60">
          <div className="flex items-center gap-3 mb-6 font-mono text-xs">
            <button
              onClick={() => {
                setActiveTab("research");
                setSelectedCategory("All");
              }}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === "research"
                  ? "bg-zinc-800/90 text-white border border-zinc-700/80 shadow-[0_0_20px_rgba(212,175,55,0.08)]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <span>Essays & Research</span>
              <span className="text-[10px] text-zinc-500 font-mono">({researchCount})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("notes");
                setSelectedCategory("All");
              }}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === "notes"
                  ? "bg-zinc-800/90 text-white border border-zinc-700/80 shadow-[0_0_20px_rgba(212,175,55,0.08)]"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <span>Journal & Notes</span>
              <span className="text-[10px] text-zinc-500 font-mono">({notesCount})</span>
            </button>
          </div>

          {/* Search bar with keyboard shortcut prompt */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={
                activeTab === "research"
                  ? "Filter essays by concept or keyword..."
                  : "Search journal entries, observations, dispatches..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-all font-mono"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded">
                /
              </kbd>
            </div>
          </div>

          {/* Category pills */}
          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                    selectedCategory === cat
                      ? "bg-zinc-800 text-[#d4af37] border border-[#d4af37]/30"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
