"use client";

import React, { useState, useMemo } from "react";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import Navbar from "@/components/Navbar";
import BlogHeader from "@/components/BlogHeader";
import ResearchTab from "@/components/ResearchTab";
import NotesTab from "@/components/NotesTab";
import InteractiveExplorer from "@/components/InteractiveExplorer";
import GitHubFeed from "@/components/GitHubFeed";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";
import {
  RESEARCH_ARTICLES,
  QUICK_NOTES,
} from "@/data/blog";
import { BookOpen, FileText, Inbox, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"research" | "notes">("research");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Available categories depending on active tab
  const categories = useMemo(() => {
    if (activeTab === "research") {
      const unique = Array.from(new Set(RESEARCH_ARTICLES.map((a) => a.category)));
      return ["All", ...unique];
    } else {
      const unique = Array.from(new Set(QUICK_NOTES.map((n) => n.category)));
      return ["All", ...unique];
    }
  }, [activeTab]);

  // Filtered research articles
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

  // Filtered notes
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

  return (
    <div className="flex flex-col min-h-screen bg-[#08080a] text-zinc-100 selection:bg-[#d4af37] selection:text-black">
      {/* Scroll-linked reading progress indicator */}
      <ReadingProgressBar />

      <Navbar />

      <main className="flex-grow">
        {/* Editorial Introduction, Tab Switcher & Search */}
        <BlogHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          researchCount={RESEARCH_ARTICLES.length}
          notesCount={QUICK_NOTES.length}
        />

        {/* Content Feeds */}
        <section id={activeTab} className="py-14 md:py-20 max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8 text-xs font-mono text-zinc-500">
            <span className="flex items-center gap-2">
              {activeTab === "research" ? (
                <>
                  <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>
                    Showing {filteredArticles.length} of {RESEARCH_ARTICLES.length} Research Essays
                  </span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    Showing {filteredNotes.length} of {QUICK_NOTES.length} Journal Dispatches
                  </span>
                </>
              )}
            </span>

            <div className="flex items-center gap-4">
              {selectedCategory !== "All" && (
                <button
                  onClick={() => setSelectedCategory("All")}
                  className="text-[#d4af37] hover:underline"
                >
                  Reset filter
                </button>
              )}

              {activeTab === "research" ? (
                <Link
                  href="/research"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>Full Archive</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              ) : (
                <Link
                  href="/notes"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>All Dispatches</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>

          {activeTab === "research" ? (
            filteredArticles.length > 0 ? (
              <div className="space-y-6">
                <ResearchTab articles={filteredArticles} />
                <div className="pt-4 text-center">
                  <Link
                    href="/research"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl luxury-panel text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-all"
                  >
                    <span>View all {RESEARCH_ARTICLES.length} research dissertations</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#d4af37]" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
                <Inbox className="w-7 h-7 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-xs font-mono">
                  No essays found matching "{searchQuery}".
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
            )
          ) : filteredNotes.length > 0 ? (
            <div className="space-y-6">
              <NotesTab notes={filteredNotes} />
              <div className="pt-4 text-center">
                <Link
                  href="/notes"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl luxury-panel text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-all"
                >
                  <span>View all {QUICK_NOTES.length} journal entries & dispatches</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#d4af37]" />
                </Link>
              </div>
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
        </section>

        {/* Section anchor for direct links */}
        <div id="tools">
          <InteractiveExplorer />
        </div>

        {/* Section anchor for GitHub projects */}
        <GitHubFeed />

        {/* About Victor */}
        <AboutSection />
      </main>

      <Footer />
    </div>
  );
}
