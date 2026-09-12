"use client";

import React, { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import { RESEARCH_ARTICLES, ResearchArticle } from "@/data/blog";
import { Search, ArrowRight, ArrowLeft, BookOpen, Inbox } from "lucide-react";
import Link from "next/link";

export default function ResearchIndexPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = useMemo(() => {
    const unique = Array.from(new Set(RESEARCH_ARTICLES.map((a) => a.category)));
    return ["All", ...unique];
  }, []);

  const filteredArticles = useMemo(() => {
    return RESEARCH_ARTICLES.filter((article) => {
      const matchesCategory =
        selectedCategory === "All" || article.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.takeaways.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col min-h-screen bg-[#08080a] text-zinc-100 selection:bg-[#d4af37] selection:text-black">
      <ReadingProgressBar />
      <Navbar />

      <main className="flex-grow py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Index
          </Link>

          {/* Header */}
          <div className="mb-12">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] mb-3">
              Archive & Dissertations
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif-luxury font-normal text-white">
              Research & Engineering Essays.
            </h1>
            <p className="mt-4 text-zinc-400 text-sm sm:text-base leading-relaxed max-w-2xl font-light">
              Rigorous empirical benchmarks, architectural teardowns, and analytical examinations of frontier AI models, autonomous agents, and inference systems.
            </p>
          </div>

          {/* Search and Category Filter */}
          <div className="mb-12 space-y-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search research papers by concept, benchmark, or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-all font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    selectedCategory === cat
                      ? "bg-zinc-800 text-[#d4af37] border border-[#d4af37]/30"
                      : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Count bar */}
          <div className="flex items-center justify-between mb-8 text-xs font-mono text-zinc-500">
            <span className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>
                Showing {filteredArticles.length} of {RESEARCH_ARTICLES.length} Published Papers
              </span>
            </span>

            {selectedCategory !== "All" && (
              <button
                onClick={() => setSelectedCategory("All")}
                className="text-[#d4af37] hover:underline"
              >
                Reset filter
              </button>
            )}
          </div>

          {/* Articles List */}
          {filteredArticles.length > 0 ? (
            <div className="space-y-6">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/research/${article.slug}`}
                  className="block luxury-panel rounded-2xl p-7 sm:p-8 hover:border-zinc-700/80 transition-all duration-300 hover:translate-y-[-2px] group relative"
                >
                  {/* Subtle gold line on hover */}
                  <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-mono text-zinc-500">
                    <span className="text-[#d4af37] tracking-wider uppercase text-[10px] font-semibold">
                      {article.category}
                    </span>
                    <div className="flex items-center gap-3">
                      <span>{article.date}</span>
                      <span>•</span>
                      <span>{article.readingTime}</span>
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-serif-luxury font-normal text-white group-hover:text-[#f4f4f5] transition-colors leading-snug tracking-tight">
                    {article.title}
                  </h2>

                  <p className="mt-3 text-sm text-zinc-400 leading-relaxed font-light">
                    {article.summary}
                  </p>

                  {article.takeaways.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-zinc-800/50 flex items-baseline gap-2.5 text-xs text-zinc-300">
                      <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider shrink-0">
                        Core Thesis:
                      </span>
                      <span className="line-clamp-2 text-zinc-300 font-light italic">
                        "{article.takeaways[0]}"
                      </span>
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-between text-xs font-mono text-zinc-400 group-hover:text-white transition-colors">
                    <span>Read complete paper</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
              <Inbox className="w-7 h-7 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-xs font-mono">
                No research essays found matching "{searchQuery}".
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-zinc-800/90 text-xs font-mono text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
