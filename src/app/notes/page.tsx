"use client";

import React, { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import { QUICK_NOTES, QuickNote } from "@/data/blog";
import { Search, ArrowLeft, ArrowRight, FileText, Inbox, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function NotesIndexPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(QUICK_NOTES.map((n) => n.category)));
    return ["All", ...unique];
  }, []);

  const filteredNotes = useMemo(() => {
    return QUICK_NOTES.filter((note) => {
      const matchesCategory =
        selectedCategory === "All" || note.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const copyCode = (id: string, code: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
              Journal & Field Notes
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif-luxury font-normal text-white">
              Technical Dispatches & Notes.
            </h1>
            <p className="mt-4 text-zinc-400 text-sm sm:text-base leading-relaxed max-w-2xl font-light">
              Atomic thoughts, architectural observations, daily learnings, and implementation snippets from developing autonomous agents and AI tooling.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-12 space-y-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes, observations, tags, snippets..."
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
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                Showing {filteredNotes.length} of {QUICK_NOTES.length} Dispatches
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

          {/* Notes List */}
          {filteredNotes.length > 0 ? (
            <div className="space-y-6">
              {filteredNotes.map((note) => (
                <article
                  key={note.id}
                  className="luxury-panel rounded-2xl p-7 sm:p-8 border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]">
                      {note.category}
                    </span>

                    <span className="text-xs font-mono text-zinc-500">
                      {note.date}
                    </span>
                  </div>

                  <Link href={`/notes/${note.slug}`} className="block group">
                    <h2 className="text-xl font-serif-luxury font-normal text-white group-hover:text-[#d4af37] transition-colors mb-2 leading-snug">
                      {note.title}
                    </h2>
                  </Link>

                  <p className="text-zinc-300 text-sm leading-relaxed mb-4 font-light">
                    {note.content}
                  </p>

                  {note.codeSnippet && (
                    <div className="mb-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 overflow-hidden font-mono text-xs">
                      <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-800 bg-zinc-900/40 text-[11px]">
                        <span className="text-zinc-400 lowercase">
                          {note.codeSnippet.language}
                        </span>
                        <button
                          onClick={(e) => copyCode(note.id, note.codeSnippet!.code, e)}
                          className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                        >
                          {copiedId === note.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-4 overflow-x-auto text-zinc-300">
                        <code>{note.codeSnippet.code}</code>
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/40 text-xs font-mono">
                    <div className="flex flex-wrap gap-2">
                      {note.tags.map((tag) => (
                        <span key={tag} className="text-[10px] text-zinc-500">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/notes/${note.slug}`}
                      className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                    >
                      <span>Permalink</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
              <Inbox className="w-7 h-7 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-xs font-mono">
                No journal entries found matching "{searchQuery}".
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
