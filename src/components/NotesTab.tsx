"use client";

import React, { useState } from "react";
import { QuickNote } from "@/data/blog";
import { Calendar, Copy, Check } from "lucide-react";

interface NotesTabProps {
  notes: QuickNote[];
}

export default function NotesTab({ notes }: NotesTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {notes.map((note) => (
        <article
          key={note.id}
          className="luxury-panel rounded-2xl p-6 sm:p-7 border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-200"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]">
              {note.category}
            </span>

            <span className="text-xs font-mono text-zinc-500">
              {note.date}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-serif-luxury font-normal text-white mb-2 leading-snug">
            {note.title}
          </h3>

          {/* Note Body */}
          <p className="text-zinc-300 text-sm leading-relaxed mb-4 font-light">
            {note.content}
          </p>

          {/* Code Snippet if present */}
          {note.codeSnippet && (
            <div className="mb-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 overflow-hidden font-mono text-xs">
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/40 text-[11px]">
                <span className="text-zinc-400 lowercase">{note.codeSnippet.language}</span>
                <button
                  onClick={() => copyCode(note.id, note.codeSnippet!.code)}
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

          {/* Tags */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-800/40">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono text-zinc-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
