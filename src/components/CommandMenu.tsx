"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { RESEARCH_ARTICLES, QUICK_NOTES, FEATURED_REPOS } from "@/data/blog";
import {
  Search,
  BookOpen,
  FileText,
  Terminal,
  Compass,
  ArrowRight,
  X,
  CornerDownLeft,
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Pages" | "Research" | "Notes" | "Instruments";
  url: string;
  external?: boolean;
}

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandMenu({ isOpen, onClose }: CommandMenuProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // All searchable content
  const allItems: CommandItem[] = useMemo(() => {
    const pages: CommandItem[] = [
      { id: "page-home", title: "Portal Index", subtitle: "Overview & Manifesto", category: "Pages", url: "/" },
      { id: "page-about", title: "About Victor", subtitle: "Biography & 4 Engineering Pillars", category: "Pages", url: "/about" },
      { id: "page-research", title: "Research Repository", subtitle: "In-depth Technical Papers", category: "Pages", url: "/research" },
      { id: "page-notes", title: "Engineering Notes", subtitle: "Architecture Logbook & Dispatches", category: "Pages", url: "/notes" },
      { id: "page-demo", title: "Interactive AI Lab", subtitle: "Gemini 3.6 Flash Concierge", category: "Pages", url: "/demo" },
      { id: "page-contact", title: "Contact Terminal", subtitle: "Direct Inquiries & Correspondence", category: "Pages", url: "/contact" },
    ];

    const research: CommandItem[] = RESEARCH_ARTICLES.map((article) => ({
      id: `research-${article.id}`,
      title: article.title,
      subtitle: `${article.category} • ${article.readingTime}`,
      category: "Research",
      url: `/research/${article.slug}`,
    }));

    const notes: CommandItem[] = QUICK_NOTES.map((note) => ({
      id: `note-${note.id}`,
      title: note.title,
      subtitle: `${note.category} • ${note.date}`,
      category: "Notes",
      url: `/notes/${note.slug}`,
    }));

    const instruments: CommandItem[] = FEATURED_REPOS.map((repo) => ({
      id: `repo-${repo.name}`,
      title: repo.name,
      subtitle: repo.description,
      category: "Instruments",
      url: repo.url,
      external: true,
    }));

    return [...pages, ...research, ...notes, ...instruments];
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 12);
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          const item = filteredItems[selectedIndex];
          onClose();
          if (item.external) {
            window.open(item.url, "_blank", "noreferrer");
          } else {
            router.push(item.url);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  const getCategoryIcon = (category: CommandItem["category"]) => {
    switch (category) {
      case "Pages":
        return <Compass className="w-4 h-4 text-zinc-400" />;
      case "Research":
        return <BookOpen className="w-4 h-4 text-[#d4af37]" />;
      case "Notes":
        return <FileText className="w-4 h-4 text-zinc-400" />;
      case "Instruments":
        return <Terminal className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0e0e12] border border-zinc-800 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[75vh]">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-800/80 gap-3">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search research, dispatches, tools, or navigate..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-mono"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto flex-grow p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">
              No entries found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onClose();
                    if (item.external) {
                      window.open(item.url, "_blank", "noreferrer");
                    } else {
                      router.push(item.url);
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? "bg-zinc-800/90 text-white"
                      : "text-zinc-400 hover:bg-zinc-900/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{getCategoryIcon(item.category)}</div>
                    <div className="min-w-0 truncate">
                      <div className="text-xs font-mono truncate font-medium text-zinc-200">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-[10px] text-zinc-500 truncate font-mono">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800/60">
                      {item.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3 h-3 text-[#d4af37]" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer Keyboard Legend */}
        <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-[#09090c] flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">↑</kbd>{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">↵</kbd> select
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">ESC</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
