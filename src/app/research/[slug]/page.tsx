import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import { RESEARCH_ARTICLES, ResearchArticle } from "@/data/blog";
import ArticleContentClient from "./ArticleContentClient";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, Clock } from "lucide-react";

export async function generateStaticParams() {
  return RESEARCH_ARTICLES.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = RESEARCH_ARTICLES.find((a) => a.slug === slug);
  if (!article) return { title: "Article Not Found | Victor" };

  return {
    title: `${article.title} — Victor`,
    description: article.summary,
    openGraph: {
      title: article.title,
      description: article.summary,
      type: "article",
      url: `https://victorc.me/research/${article.slug}`,
      publishedTime: article.isoDate,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary,
    },
  };
}

export default async function ResearchDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const articleIndex = RESEARCH_ARTICLES.findIndex((a) => a.slug === slug);
  if (articleIndex === -1) notFound();

  const article = RESEARCH_ARTICLES[articleIndex];
  const prevArticle = articleIndex > 0 ? RESEARCH_ARTICLES[articleIndex - 1] : null;
  const nextArticle =
    articleIndex < RESEARCH_ARTICLES.length - 1
      ? RESEARCH_ARTICLES[articleIndex + 1]
      : null;

  return (
    <div className="flex flex-col min-h-screen bg-[#08080a] text-zinc-100 selection:bg-[#d4af37] selection:text-black">
      <ReadingProgressBar />
      <Navbar />

      <main className="flex-grow py-16 md:py-24">
        <article className="max-w-3xl mx-auto px-6">
          {/* Breadcrumb / Back Link */}
          <div className="flex items-center justify-between gap-4 mb-10 text-xs font-mono text-zinc-500">
            <Link
              href="/research"
              className="inline-flex items-center gap-2 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Research Papers
            </Link>

            <span className="text-[#d4af37] uppercase tracking-wider text-[10px]">
              {article.category}
            </span>
          </div>

          {/* Paper Header */}
          <header className="mb-12">
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 mb-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-zinc-600" />
                {article.date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-600" />
                {article.readingTime}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif-luxury font-normal text-white leading-[1.18] tracking-tight">
              {article.title}
            </h1>

            <p className="mt-6 text-zinc-300 text-base sm:text-lg leading-relaxed font-light">
              {article.summary}
            </p>
          </header>

          {/* Core Takeaways Callout */}
          <div className="luxury-panel rounded-2xl p-6 sm:p-7 mb-12 space-y-3.5 border border-zinc-800/80">
            <div className="text-[11px] font-mono text-[#d4af37] uppercase tracking-widest">
              Core Theses & Takeaways
            </div>
            <div className="space-y-2.5">
              {article.takeaways.map((takeaway, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-light"
                >
                  <span className="text-[#d4af37] font-mono text-xs font-bold mt-0.5">•</span>
                  <span>{takeaway}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Client Component for Code Copy & Social Sharing */}
          <ArticleContentClient article={article} />

          {/* Post Navigation */}
          <nav className="mt-16 pt-8 border-t border-zinc-800/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevArticle ? (
              <Link
                href={`/research/${prevArticle.slug}`}
                className="luxury-panel p-5 rounded-xl text-left group block"
              >
                <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  ← Previous Paper
                </div>
                <div className="text-xs font-serif-luxury text-zinc-300 group-hover:text-white line-clamp-2">
                  {prevArticle.title}
                </div>
              </Link>
            ) : <div />}

            {nextArticle && (
              <Link
                href={`/research/${nextArticle.slug}`}
                className="luxury-panel p-5 rounded-xl text-right group block"
              >
                <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Next Paper →
                </div>
                <div className="text-xs font-serif-luxury text-zinc-300 group-hover:text-white line-clamp-2">
                  {nextArticle.title}
                </div>
              </Link>
            )}
          </nav>
        </article>
      </main>

      <Footer />
    </div>
  );
}
