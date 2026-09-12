import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import { QUICK_NOTES, QuickNote } from "@/data/blog";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, Tag } from "lucide-react";

export async function generateStaticParams() {
  return QUICK_NOTES.map((note) => ({
    slug: note.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = QUICK_NOTES.find((n) => n.slug === slug);
  if (!note) return { title: "Note Not Found | Victor" };

  return {
    title: `${note.title} — Victor`,
    description: note.content,
    alternates: {
      canonical: `https://victorc.me/notes/${note.slug}`,
    },
    openGraph: {
      title: note.title,
      description: note.content,
      type: "article",
      url: `https://victorc.me/notes/${note.slug}`,
      publishedTime: note.isoDate,
    },
    twitter: {
      card: "summary",
      title: note.title,
      description: note.content,
    },
  };
}

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const noteIndex = QUICK_NOTES.findIndex((n) => n.slug === slug);
  if (noteIndex === -1) notFound();

  const note = QUICK_NOTES[noteIndex];
  const prevNote = noteIndex > 0 ? QUICK_NOTES[noteIndex - 1] : null;
  const nextNote =
    noteIndex < QUICK_NOTES.length - 1 ? QUICK_NOTES[noteIndex + 1] : null;

  const noteJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": note.title,
    "description": note.content,
    "datePublished": note.isoDate,
    "author": {
      "@type": "Person",
      "name": "Victor",
      "url": "https://victorc.me",
    },
    "publisher": {
      "@type": "Person",
      "name": "Victor",
      "url": "https://victorc.me",
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://victorc.me/notes/${note.slug}`,
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#08080a] text-zinc-100 selection:bg-[#d4af37] selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(noteJsonLd) }}
      />
      <ReadingProgressBar />
      <Navbar />

      <main className="flex-grow py-16 md:py-24">
        <article className="max-w-3xl mx-auto px-6">
          {/* Back link */}
          <div className="flex items-center justify-between gap-4 mb-10 text-xs font-mono text-zinc-500">
            <Link
              href="/notes"
              className="inline-flex items-center gap-2 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Dispatches & Notes
            </Link>

            <span className="text-[#d4af37] uppercase tracking-wider text-[10px]">
              {note.category}
            </span>
          </div>

          <header className="mb-8">
            <div className="text-xs font-mono text-zinc-500 mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{note.date}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif-luxury font-normal text-white leading-snug">
              {note.title}
            </h1>
          </header>

          <div className="luxury-panel rounded-2xl p-7 sm:p-9 mb-10 space-y-6 border border-zinc-800/80">
            <p className="text-zinc-200 text-base sm:text-lg leading-relaxed font-light">
              {note.content}
            </p>

            {note.codeSnippet && (
              <div className="rounded-xl bg-zinc-950 border border-zinc-800/80 overflow-hidden font-mono text-xs">
                <div className="px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/50 text-zinc-500 text-[11px]">
                  {note.codeSnippet.language}
                </div>
                <pre className="p-4 sm:p-5 overflow-x-auto text-zinc-300">
                  <code>{note.codeSnippet.code}</code>
                </pre>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-800/50 text-xs font-mono">
              {note.tags.map((tag) => (
                <span key={tag} className="text-zinc-400">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <nav className="pt-6 border-t border-zinc-800/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevNote ? (
              <Link
                href={`/notes/${prevNote.slug}`}
                className="luxury-panel p-5 rounded-xl text-left group block"
              >
                <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  ← Previous Note
                </div>
                <div className="text-xs font-serif-luxury text-zinc-300 group-hover:text-white line-clamp-2">
                  {prevNote.title}
                </div>
              </Link>
            ) : <div />}

            {nextNote && (
              <Link
                href={`/notes/${nextNote.slug}`}
                className="luxury-panel p-5 rounded-xl text-right group block"
              >
                <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Next Note →
                </div>
                <div className="text-xs font-serif-luxury text-zinc-300 group-hover:text-white line-clamp-2">
                  {nextNote.title}
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
