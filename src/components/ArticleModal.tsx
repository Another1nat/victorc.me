"use client";

import React, { useEffect, useState } from "react";
import { ResearchArticle } from "@/data/blog";
import {
  X,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { LinkedinIcon, TwitterIcon } from "@/components/Icons";

interface ArticleModalProps {
  post: ResearchArticle | null;
  onClose: () => void;
}

export default function ArticleModal({ post, onClose }: ArticleModalProps) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedLinkedInText, setCopiedLinkedInText] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (post) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [post, onClose]);

  if (!post) return null;

  const articleUrl = `https://victorc.me/#${post.slug}`;

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(articleUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyLinkedInText = () => {
    const textToCopy = `${post.title}\n\n${post.linkedInSummary}\n\nRead the complete research: ${articleUrl}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLinkedInText(true);
    setTimeout(() => setCopiedLinkedInText(false), 2500);
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`"${post.title}" by Victor`);
    const url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(articleUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Reading Room Paper Container */}
      <div className="relative z-10 w-full max-w-3xl bg-[#0c0c10] border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/70 bg-[#08080a]/90 sticky top-0 z-20">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Index
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
              title="Copy Article Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-[#d4af37]" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Content */}
        <div className="overflow-y-auto p-7 sm:p-10 space-y-8">
          {/* Metadata & Headline */}
          <div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-500 mb-4">
              <span className="text-[#d4af37] tracking-wider uppercase font-semibold text-[11px]">
                {post.category}
              </span>
              <span>•</span>
              <span>{post.date}</span>
              <span>•</span>
              <span>{post.readingTime}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif-luxury font-normal text-white leading-tight tracking-tight">
              {post.title}
            </h1>

            <p className="mt-5 text-zinc-300 text-base leading-relaxed font-light">
              {post.summary}
            </p>
          </div>

          {/* Key Findings Card */}
          <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-3.5">
            <div className="text-[11px] font-mono text-[#d4af37] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Core Takeaways & Theses
            </div>
            <div className="space-y-2.5">
              {post.takeaways.map((takeaway, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-light">
                  <span className="text-[#d4af37] font-mono text-xs font-bold mt-0.5">•</span>
                  <span>{takeaway}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Article Sections */}
          <div className="space-y-7 text-zinc-300 text-sm sm:text-base leading-relaxed font-light">
            {post.content.sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                {section.heading && (
                  <h3 className="text-lg sm:text-xl font-serif-luxury text-white pt-3">
                    {section.heading}
                  </h3>
                )}
                <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                  {section.body}
                </p>

                {section.codeSnippet && (
                  <div className="my-5 rounded-xl bg-zinc-950 border border-zinc-800/80 overflow-hidden font-mono text-xs">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/50">
                      <span className="text-zinc-500 lowercase text-[11px]">{section.codeSnippet.language}</span>
                      <button
                        onClick={() => copyCode(section.codeSnippet!.code, idx)}
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
                      >
                        {copiedCodeIdx === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#d4af37]" />
                            <span className="text-[#d4af37]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy snippet</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-zinc-300">
                      <code>{section.codeSnippet.code}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Syndication & Sharing */}
          <div className="mt-10 pt-6 border-t border-zinc-800/70 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
                Share Research
              </span>
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={shareToLinkedIn}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-[#d4af37] hover:border-[#d4af37]/40 transition-colors"
                >
                  <LinkedinIcon className="w-3.5 h-3.5" />
                  Share to LinkedIn
                </button>
                <button
                  onClick={shareToTwitter}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white transition-colors"
                >
                  <TwitterIcon className="w-3.5 h-3.5" />
                  Post to X
                </button>
              </div>
            </div>

            {/* Ready summary */}
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <p className="text-zinc-400 text-xs italic font-light line-clamp-2">
                "{post.linkedInSummary}"
              </p>
              <button
                onClick={copyLinkedInText}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-mono transition-all border border-zinc-800"
              >
                {copiedLinkedInText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span className="text-[#d4af37]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
