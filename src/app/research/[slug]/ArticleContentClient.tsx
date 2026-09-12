"use client";

import React, { useState } from "react";
import { ResearchArticle } from "@/data/blog";
import { Copy, Check, Share2 } from "lucide-react";
import { LinkedinIcon, TwitterIcon } from "@/components/Icons";
import KVCacheCalculator from "@/components/KVCacheCalculator";

export default function ArticleContentClient({
  article,
}: {
  article: ResearchArticle;
}) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedLinkedInText, setCopiedLinkedInText] = useState(false);

  const articleUrl = `https://victorc.me/research/${article.slug}`;

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
    const textToCopy = `${article.title}\n\n${article.linkedInSummary}\n\nRead the full technical analysis: ${articleUrl}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLinkedInText(true);
    setTimeout(() => setCopiedLinkedInText(false), 2500);
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      articleUrl
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`"${article.title}" by Victor`);
    const url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(
      articleUrl
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-8">
      {/* Sections */}
      <div className="space-y-8 text-zinc-300 text-base sm:text-lg leading-relaxed font-light">
        {article.content.sections.map((section, idx) => {
          const headingId = section.heading
            ? section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")
            : undefined;

          return (
            <div key={idx} className="space-y-4">
              {section.heading && (
                <h2
                  id={headingId}
                  className="text-xl sm:text-2xl font-serif-luxury font-normal text-white pt-6 scroll-mt-24"
                >
                  {section.heading}
                </h2>
              )}
              <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                {section.body}
              </p>

              {/* Render interactive calculator for context caching article */}
              {article.slug === "context-caching-cost-latency-analysis" && idx === 1 && (
                <KVCacheCalculator />
              )}

            {section.codeSnippet && (
              <div className="my-6 rounded-xl bg-zinc-950 border border-zinc-800/80 overflow-hidden font-mono text-xs">
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/50">
                  <span className="text-zinc-500 lowercase text-[11px]">
                    {section.codeSnippet.language}
                  </span>
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
                        <span>Copy code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 sm:p-5 overflow-x-auto text-zinc-300 leading-relaxed">
                  <code>{section.codeSnippet.code}</code>
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>

      {/* Sharing & LinkedIn Syndication Footer */}
      <div className="mt-12 pt-8 border-t border-zinc-800/60 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
            Syndication & Citation
          </span>
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={shareToLinkedIn}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-[#d4af37] hover:border-[#d4af37]/40 transition-colors"
            >
              <LinkedinIcon className="w-3.5 h-3.5" />
              Share on LinkedIn
            </button>
            <button
              onClick={shareToTwitter}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white transition-colors"
            >
              <TwitterIcon className="w-3.5 h-3.5" />
              Post to X
            </button>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white transition-colors"
              title="Copy Canonical URL"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-[#d4af37]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Copy Link</span>
            </button>
          </div>
        </div>

        {/* Ready LinkedIn Summary Box */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-zinc-400 font-light line-clamp-2">
            "{article.linkedInSummary}"
          </div>
          <button
            onClick={copyLinkedInText}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono transition-all border border-zinc-800"
          >
            {copiedLinkedInText ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="text-[#d4af37]">Copied Text</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy for LinkedIn</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
