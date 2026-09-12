"use client";

import React from "react";
import { ResearchArticle } from "@/data/blog";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface ResearchTabProps {
  articles: ResearchArticle[];
  onOpenArticle?: (article: ResearchArticle) => void;
}

export default function ResearchTab({ articles, onOpenArticle }: ResearchTabProps) {
  return (
    <div className="space-y-6">
      {articles.map((article) => (
        <Link
          key={article.id}
          href={`/research/${article.slug}`}
          className="block luxury-panel rounded-2xl p-7 sm:p-8 hover:border-zinc-700/80 transition-all duration-300 hover:translate-y-[-2px] group relative"
        >
          {/* Subtle gold accent top line on hover */}
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Meta */}
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

          {/* Title in Serif */}
          <h2 className="text-xl sm:text-2xl font-serif-luxury font-normal text-white group-hover:text-[#f4f4f5] transition-colors leading-snug tracking-tight">
            {article.title}
          </h2>

          {/* Summary */}
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed font-light">
            {article.summary}
          </p>

          {/* Core take-away preview */}
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

          {/* Bottom link */}
          <div className="mt-6 flex items-center justify-between text-xs font-mono text-zinc-400 group-hover:text-white transition-colors">
            <span>Read complete paper</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>
      ))}
    </div>
  );
}
