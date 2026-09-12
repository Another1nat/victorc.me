"use client";

import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import {
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Eye,
  Edit3,
  Sparkles,
  BookOpen,
  FileText,
  Clock,
  ArrowRight,
  Share2,
  RotateCcw,
} from "lucide-react";
import { RESEARCH_ARTICLES, QUICK_NOTES } from "@/data/blog";

const ADMIN_PASSCODE = "victorc-auth-2026";

interface SectionDraft {
  heading: string;
  body: string;
  codeLang?: string;
  code?: string;
}

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Tab: "create-research" | "create-note" | "published"
  const [activeTab, setActiveTab] = useState<"create-research" | "create-note" | "published">("create-research");

  // Research Form State
  const [researchTitle, setResearchTitle] = useState("");
  const [researchSlug, setResearchSlug] = useState("");
  const [researchCategory, setResearchCategory] = useState<
    "Artificial Intelligence" | "Systems & Arch" | "Autonomous Agents" | "Performance"
  >("Artificial Intelligence");
  const [researchSummary, setResearchSummary] = useState("");
  const [researchTakeaways, setResearchTakeaways] = useState<string[]>([""]);
  const [researchSections, setResearchSections] = useState<SectionDraft[]>([
    { heading: "I. Architectural Context", body: "", codeLang: "python", code: "" },
  ]);
  const [researchLinkedIn, setResearchLinkedIn] = useState("");

  // Note Form State
  const [noteTitle, setNoteTitle] = useState("");
  const [noteSlug, setNoteSlug] = useState("");
  const [noteCategory, setNoteCategory] = useState<"Observation" | "Architecture" | "Dispatches">("Architecture");
  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [noteCodeLang, setNoteCodeLang] = useState("typescript");
  const [noteCode, setNoteCode] = useState("");

  // UI helpers
  const [copiedTs, setCopiedTs] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Check existing session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAuth = sessionStorage.getItem("victorc_admin_auth");
      if (savedAuth === "true") {
        setIsAuthenticated(true);
      }

      // Load saved drafts
      const savedResearch = localStorage.getItem("victorc_draft_research");
      if (savedResearch) {
        try {
          const parsed = JSON.parse(savedResearch);
          setResearchTitle(parsed.title || "");
          setResearchSlug(parsed.slug || "");
          setResearchCategory(parsed.category || "Artificial Intelligence");
          setResearchSummary(parsed.summary || "");
          setResearchTakeaways(parsed.takeaways || [""]);
          setResearchSections(parsed.sections || []);
          setResearchLinkedIn(parsed.linkedIn || "");
        } catch {}
      }

      const savedNote = localStorage.getItem("victorc_draft_note");
      if (savedNote) {
        try {
          const parsed = JSON.parse(savedNote);
          setNoteTitle(parsed.title || "");
          setNoteSlug(parsed.slug || "");
          setNoteCategory(parsed.category || "Architecture");
          setNoteContent(parsed.content || "");
          setNoteTags(parsed.tags || "");
          setNoteCodeLang(parsed.codeLang || "typescript");
          setNoteCode(parsed.code || "");
        } catch {}
      }
    }
  }, []);

  // Auto-save drafts
  useEffect(() => {
    if (!isAuthenticated) return;
    const researchData = {
      title: researchTitle,
      slug: researchSlug,
      category: researchCategory,
      summary: researchSummary,
      takeaways: researchTakeaways,
      sections: researchSections,
      linkedIn: researchLinkedIn,
    };
    localStorage.setItem("victorc_draft_research", JSON.stringify(researchData));
  }, [isAuthenticated, researchTitle, researchSlug, researchCategory, researchSummary, researchTakeaways, researchSections, researchLinkedIn]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const noteData = {
      title: noteTitle,
      slug: noteSlug,
      category: noteCategory,
      content: noteContent,
      tags: noteTags,
      codeLang: noteCodeLang,
      code: noteCode,
    };
    localStorage.setItem("victorc_draft_note", JSON.stringify(noteData));
  }, [isAuthenticated, noteTitle, noteSlug, noteCategory, noteContent, noteTags, noteCodeLang, noteCode]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      setAuthError(false);
      sessionStorage.setItem("victorc_admin_auth", "true");
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("victorc_admin_auth");
  };

  // Slug auto-generator
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  };

  // Estimated reading time
  const estimatedReadingTime = useMemo(() => {
    const totalWords =
      researchSummary.split(/\s+/).length +
      researchSections.reduce((acc, s) => acc + (s.body ? s.body.split(/\s+/).length : 0), 0);
    const mins = Math.max(1, Math.ceil(totalWords / 180));
    return `${mins} min read`;
  }, [researchSummary, researchSections]);

  // Section modifiers
  const addSection = () => {
    setResearchSections([
      ...researchSections,
      { heading: "", body: "", codeLang: "python", code: "" },
    ]);
  };

  const removeSection = (idx: number) => {
    setResearchSections(researchSections.filter((_, i) => i !== idx));
  };

  const updateSection = (idx: number, field: keyof SectionDraft, val: string) => {
    const next = [...researchSections];
    next[idx] = { ...next[idx], [field]: val };
    setResearchSections(next);
  };

  // Takeaways modifiers
  const addTakeaway = () => {
    setResearchTakeaways([...researchTakeaways, ""]);
  };

  const updateTakeaway = (idx: number, val: string) => {
    const next = [...researchTakeaways];
    next[idx] = val;
    setResearchTakeaways(next);
  };

  const removeTakeaway = (idx: number) => {
    setResearchTakeaways(researchTakeaways.filter((_, i) => i !== idx));
  };

  // Generated TypeScript code
  const generatedCode = useMemo(() => {
    const todayIso = new Date().toISOString();
    const todayPretty = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

    if (activeTab === "create-research") {
      const articleObj = {
        id: researchSlug || "untitled-article",
        slug: researchSlug || "untitled-article",
        title: researchTitle || "Untitled Paper",
        date: todayPretty,
        isoDate: todayIso,
        readingTime: estimatedReadingTime,
        category: researchCategory,
        summary: researchSummary,
        takeaways: researchTakeaways.filter(Boolean),
        content: {
          sections: researchSections.map((s) => ({
            heading: s.heading,
            body: s.body,
            ...(s.code && s.code.trim()
              ? { codeSnippet: { language: s.codeLang || "python", code: s.code } }
              : {}),
          })),
        },
        linkedInSummary:
          researchLinkedIn ||
          `Technical analysis on ${researchTitle}. Evaluating architectural trade-offs in frontier autonomous intelligence.`,
      };

      return `// Add inside RESEARCH_ARTICLES in src/data/blog.ts:\n${JSON.stringify(
        articleObj,
        null,
        2
      )},`;
    } else {
      const noteObj = {
        id: noteSlug || "untitled-note",
        slug: noteSlug || "untitled-note",
        title: noteTitle || "Untitled Dispatch",
        date: todayPretty,
        isoDate: todayIso,
        category: noteCategory,
        content: noteContent,
        tags: noteTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        ...(noteCode && noteCode.trim()
          ? { codeSnippet: { language: noteCodeLang, code: noteCode } }
          : {}),
      };

      return `// Add inside QUICK_NOTES in src/data/blog.ts:\n${JSON.stringify(
        noteObj,
        null,
        2
      )},`;
    }
  }, [
    activeTab,
    researchTitle,
    researchSlug,
    researchCategory,
    researchSummary,
    researchTakeaways,
    researchSections,
    researchLinkedIn,
    estimatedReadingTime,
    noteTitle,
    noteSlug,
    noteCategory,
    noteContent,
    noteTags,
    noteCodeLang,
    noteCode,
  ]);

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedTs(true);
    setTimeout(() => setCopiedTs(false), 2500);
  };

  const downloadTsFile = () => {
    const filename = `${activeTab === "create-research" ? researchSlug : noteSlug || "draft"}.ts`;
    const blob = new Blob([generatedCode], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset Draft
  const handleClearDraft = () => {
    if (confirm("Are you sure you want to clear your current draft?")) {
      if (activeTab === "create-research") {
        setResearchTitle("");
        setResearchSlug("");
        setResearchSummary("");
        setResearchTakeaways([""]);
        setResearchSections([{ heading: "I. Architectural Context", body: "", codeLang: "python", code: "" }]);
        setResearchLinkedIn("");
        localStorage.removeItem("victorc_draft_research");
      } else {
        setNoteTitle("");
        setNoteSlug("");
        setNoteContent("");
        setNoteTags("");
        setNoteCode("");
        localStorage.removeItem("victorc_draft_note");
      }
    }
  };

  // If unauthenticated: Show Lock Vault
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-[#08080a] text-zinc-100 selection:bg-[#d4af37] selection:text-black">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-24 px-6">
          <div className="w-full max-w-md luxury-panel rounded-3xl p-8 sm:p-10 text-center relative shadow-2xl border border-zinc-800/80">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#d4af37] mx-auto mb-6 shadow-inner">
              <Lock className="w-5 h-5" />
            </div>

            <h1 className="text-2xl font-serif-luxury font-normal text-white mb-2">
              Victor Studio Vault
            </h1>
            <p className="text-xs font-mono text-zinc-500 mb-8">
              Private editorial composer for victorc.me
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter studio key..."
                  className={`w-full px-4 py-3 rounded-xl bg-zinc-950 border ${
                    authError ? "border-rose-500/80" : "border-zinc-800"
                  } text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#d4af37] transition-all text-center`}
                />
                {authError && (
                  <p className="text-[11px] font-mono text-rose-400 mt-2">
                    Invalid passcode. Access denied.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-white text-black text-xs font-mono font-semibold hover:bg-zinc-200 transition-colors shadow-lg"
              >
                Unlock Studio
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-zinc-900 text-[10px] font-mono text-zinc-600">
              Default access: <code className="text-zinc-400">victorc-auth-2026</code>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#08080a] text-zinc-100 selection:bg-[#d4af37] selection:text-black font-mono">
      <Navbar />

      <main className="flex-grow py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <Logo size={28} />
              <div>
                <div className="text-xs uppercase tracking-wider text-[#d4af37] font-semibold">
                  Publishing Studio
                </div>
                <div className="text-sm font-serif-luxury text-white">victorc.me/admin</div>
              </div>
            </div>

            {/* Studio Navigation & Logout */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl bg-zinc-900/90 p-1 border border-zinc-800">
                <button
                  onClick={() => setActiveTab("create-research")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    activeTab === "create-research"
                      ? "bg-white text-black font-medium"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Research Paper
                </button>
                <button
                  onClick={() => setActiveTab("create-note")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    activeTab === "create-note"
                      ? "bg-white text-black font-medium"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Quick Dispatch
                </button>
                <button
                  onClick={() => setActiveTab("published")}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    activeTab === "published"
                      ? "bg-white text-black font-medium"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Archives ({RESEARCH_ARTICLES.length + QUICK_NOTES.length})
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800"
                title="Lock Studio"
              >
                <Unlock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Published Archives Tab */}
          {activeTab === "published" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-serif-luxury text-white mb-4">
                  Active Research Papers ({RESEARCH_ARTICLES.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {RESEARCH_ARTICLES.map((article) => (
                    <div
                      key={article.slug}
                      className="luxury-panel p-5 rounded-xl flex justify-between items-start"
                    >
                      <div>
                        <div className="text-[10px] text-[#d4af37] uppercase">{article.category}</div>
                        <div className="text-sm font-serif-luxury text-white mt-1">{article.title}</div>
                        <div className="text-[11px] text-zinc-500 mt-2 font-mono">
                          {article.date} • {article.readingTime}
                        </div>
                      </div>
                      <a
                        href={`/research/${article.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-serif-luxury text-white mb-4">
                  Active Journal Dispatches ({QUICK_NOTES.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {QUICK_NOTES.map((note) => (
                    <div
                      key={note.slug}
                      className="luxury-panel p-5 rounded-xl flex justify-between items-start"
                    >
                      <div>
                        <div className="text-[10px] text-zinc-400 uppercase">{note.category}</div>
                        <div className="text-sm font-serif-luxury text-white mt-1">{note.title}</div>
                        <div className="text-[11px] text-zinc-500 mt-2 font-mono">
                          {note.date} • {note.tags.join(", ")}
                        </div>
                      </div>
                      <a
                        href={`/notes/${note.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Composer View (Split Pane) */}
          {activeTab !== "published" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Form Editor (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Mode Header */}
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-[#d4af37]" />
                    {activeTab === "create-research" ? "Compose Research Paper" : "Compose Quick Dispatch"}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearDraft}
                      className="text-xs text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                      title="Clear current draft"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear Draft
                    </button>
                  </div>
                </div>

                {/* Research Form Fields */}
                {activeTab === "create-research" ? (
                  <div className="luxury-panel p-6 sm:p-7 rounded-2xl space-y-5">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Paper Title</label>
                      <input
                        type="text"
                        value={researchTitle}
                        onChange={(e) => {
                          setResearchTitle(e.target.value);
                          if (!researchSlug || researchSlug === generateSlug(researchTitle)) {
                            setResearchSlug(generateSlug(e.target.value));
                          }
                        }}
                        placeholder="e.g. On the Invariance of Prefix KV Caches in Distributed Models"
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Slug URL</label>
                        <input
                          type="text"
                          value={researchSlug}
                          onChange={(e) => setResearchSlug(generateSlug(e.target.value))}
                          placeholder="e.g. prefix-kv-cache-invariance"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Category</label>
                        <select
                          value={researchCategory}
                          onChange={(e: any) => setResearchCategory(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-[#d4af37]"
                        >
                          <option value="Artificial Intelligence">Artificial Intelligence</option>
                          <option value="Systems & Arch">Systems &amp; Arch</option>
                          <option value="Autonomous Agents">Autonomous Agents</option>
                          <option value="Performance">Performance</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                        Abstract / Executive Summary
                      </label>
                      <textarea
                        rows={3}
                        value={researchSummary}
                        onChange={(e) => setResearchSummary(e.target.value)}
                        placeholder="Concise overview of the findings, empirical benchmarks, and architectural takeaways..."
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#d4af37] leading-relaxed"
                      />
                    </div>

                    {/* Takeaways list */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-zinc-400 font-medium">
                          Core Theses &amp; Key Takeaways
                        </label>
                        <button
                          type="button"
                          onClick={addTakeaway}
                          className="text-[11px] text-[#d4af37] hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>

                      <div className="space-y-2">
                        {researchTakeaways.map((takeaway, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 w-4">{idx + 1}.</span>
                            <input
                              type="text"
                              value={takeaway}
                              onChange={(e) => updateTakeaway(idx, e.target.value)}
                              placeholder={`Takeaway #${idx + 1}...`}
                              className="flex-grow px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-[#d4af37]"
                            />
                            {researchTakeaways.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTakeaway(idx)}
                                className="p-1.5 text-zinc-500 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sections Builder */}
                    <div className="pt-4 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-xs text-zinc-400 font-medium">
                          Sections &amp; Code Snippets ({researchSections.length})
                        </label>
                        <button
                          type="button"
                          onClick={addSection}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs text-white border border-zinc-800 flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#d4af37]" /> Add Section
                        </button>
                      </div>

                      <div className="space-y-6">
                        {researchSections.map((sec, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase text-[#d4af37]">
                                Section {idx + 1}
                              </span>
                              {researchSections.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSection(idx)}
                                  className="text-zinc-500 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <input
                              type="text"
                              value={sec.heading}
                              onChange={(e) => updateSection(idx, "heading", e.target.value)}
                              placeholder={`Heading (e.g. ${idx + 1}. Mathematical Formulation)`}
                              className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                            />

                            <textarea
                              rows={4}
                              value={sec.body}
                              onChange={(e) => updateSection(idx, "body", e.target.value)}
                              placeholder="Technical analysis, citations, benchmark observations..."
                              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-[#d4af37] leading-relaxed"
                            />

                            {/* Optional code snippet */}
                            <div className="pt-2 border-t border-zinc-900">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] text-zinc-500">Optional Code Snippet</span>
                                <select
                                  value={sec.codeLang || "python"}
                                  onChange={(e) => updateSection(idx, "codeLang", e.target.value)}
                                  className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 focus:outline-none"
                                >
                                  <option value="python">python</option>
                                  <option value="typescript">typescript</option>
                                  <option value="rust">rust</option>
                                  <option value="bash">bash</option>
                                  <option value="sql">sql</option>
                                </select>
                              </div>
                              <textarea
                                rows={3}
                                value={sec.code || ""}
                                onChange={(e) => updateSection(idx, "code", e.target.value)}
                                placeholder="# Code snippet..."
                                className="w-full p-2.5 rounded-lg bg-black border border-zinc-900 text-xs font-mono text-zinc-300 focus:outline-none focus:border-[#d4af37]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* LinkedIn Summary */}
                    <div className="pt-4 border-t border-zinc-800/80">
                      <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                        LinkedIn Autopost Hook (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={researchLinkedIn}
                        onChange={(e) => setResearchLinkedIn(e.target.value)}
                        placeholder="1-2 sentences for LinkedIn syndication..."
                        className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>
                  </div>
                ) : (
                  /* Note Form Fields */
                  <div className="luxury-panel p-6 sm:p-7 rounded-2xl space-y-5">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Dispatch Title</label>
                      <input
                        type="text"
                        value={noteTitle}
                        onChange={(e) => {
                          setNoteTitle(e.target.value);
                          if (!noteSlug || noteSlug === generateSlug(noteTitle)) {
                            setNoteSlug(generateSlug(e.target.value));
                          }
                        }}
                        placeholder="e.g. watchduck: Orchestrating MCP and agent concierges"
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Slug</label>
                        <input
                          type="text"
                          value={noteSlug}
                          onChange={(e) => setNoteSlug(generateSlug(e.target.value))}
                          placeholder="e.g. watchduck-agent-concierge"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Category</label>
                        <select
                          value={noteCategory}
                          onChange={(e: any) => setNoteCategory(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-[#d4af37]"
                        >
                          <option value="Architecture">Architecture</option>
                          <option value="Observation">Observation</option>
                          <option value="Dispatches">Dispatches</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Tags (Comma-separated)</label>
                      <input
                        type="text"
                        value={noteTags}
                        onChange={(e) => setNoteTags(e.target.value)}
                        placeholder="e.g. ClaudeCode, MCP, Architecture, AgentLoop"
                        className="w-full px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Note Body</label>
                      <textarea
                        rows={6}
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Write your observation or architectural finding..."
                        className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-[#d4af37] leading-relaxed"
                      />
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-zinc-400 font-medium">Optional Code Snippet</label>
                        <select
                          value={noteCodeLang}
                          onChange={(e) => setNoteCodeLang(e.target.value)}
                          className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 focus:outline-none"
                        >
                          <option value="typescript">typescript</option>
                          <option value="python">python</option>
                          <option value="bash">bash</option>
                          <option value="json">json</option>
                        </select>
                      </div>
                      <textarea
                        rows={4}
                        value={noteCode}
                        onChange={(e) => setNoteCode(e.target.value)}
                        placeholder="// Code snippet..."
                        className="w-full p-3 rounded-lg bg-black border border-zinc-900 text-xs font-mono text-zinc-300 focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Split Live Preview & Exporter (5 cols) */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                {/* Actions Panel */}
                <div className="luxury-panel p-5 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Publishing Output</div>
                    <div className="text-xs text-zinc-300 mt-0.5 font-semibold">
                      {activeTab === "create-research" ? `${estimatedReadingTime}` : "Single Dispatch"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyCodeToClipboard}
                      className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-medium hover:bg-zinc-200 transition-colors flex items-center gap-1.5 shadow"
                    >
                      {copiedTs ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={downloadTsFile}
                      className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                      title="Download TypeScript file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Live Article Preview Card */}
                <div className="luxury-panel p-6 rounded-2xl space-y-4 max-h-[600px] overflow-y-auto">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pb-2 border-b border-zinc-800/60">
                    <span className="text-[#d4af37] uppercase">
                      {activeTab === "create-research" ? researchCategory : noteCategory}
                    </span>
                    <span>Live Preview</span>
                  </div>

                  {activeTab === "create-research" ? (
                    <div>
                      <h2 className="text-xl font-serif-luxury text-white font-normal leading-tight">
                        {researchTitle || "Untitled Paper"}
                      </h2>

                      {researchSummary && (
                        <p className="mt-3 text-xs text-zinc-300 leading-relaxed font-light font-sans">
                          {researchSummary}
                        </p>
                      )}

                      {researchTakeaways.filter(Boolean).length > 0 && (
                        <div className="my-4 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
                          <div className="text-[10px] text-[#d4af37] uppercase tracking-wider">
                            Core Takeaways
                          </div>
                          {researchTakeaways.filter(Boolean).map((t, idx) => (
                            <div key={idx} className="text-[11px] text-zinc-300 flex items-start gap-2">
                              <span className="text-[#d4af37]">•</span>
                              <span>{t}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-4 mt-4">
                        {researchSections.map((sec, idx) => (
                          <div key={idx} className="space-y-2">
                            {sec.heading && (
                              <h3 className="text-sm font-serif-luxury text-white font-medium pt-2">
                                {sec.heading}
                              </h3>
                            )}
                            {sec.body && (
                              <p className="text-xs text-zinc-400 leading-relaxed font-sans whitespace-pre-line">
                                {sec.body}
                              </p>
                            )}
                            {sec.code && (
                              <pre className="p-3 rounded-lg bg-black text-[10px] font-mono text-zinc-300 overflow-x-auto border border-zinc-900">
                                <code>{sec.code}</code>
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-xl font-serif-luxury text-white font-normal leading-tight">
                        {noteTitle || "Untitled Dispatch"}
                      </h2>
                      {noteContent && (
                        <p className="mt-3 text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-line">
                          {noteContent}
                        </p>
                      )}
                      {noteCode && (
                        <pre className="mt-4 p-3 rounded-lg bg-black text-[10px] font-mono text-zinc-300 overflow-x-auto border border-zinc-900">
                          <code>{noteCode}</code>
                        </pre>
                      )}
                      {noteTags && (
                        <div className="flex flex-wrap gap-1.5 mt-4">
                          {noteTags.split(",").map((t) => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Generated Code Preview Block */}
                <div className="luxury-panel p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Generated TypeScript Snippet</span>
                    <button
                      onClick={copyCodeToClipboard}
                      className="text-[#d4af37] hover:underline"
                    >
                      {copiedTs ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-black text-[10px] font-mono text-zinc-400 overflow-x-auto max-h-40 border border-zinc-900">
                    <code>{generatedCode}</code>
                  </pre>
                  <p className="text-[10px] text-zinc-500">
                    Paste this directly into <code className="text-zinc-400">src/data/blog.ts</code> and push to git to publish live in 35s.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
