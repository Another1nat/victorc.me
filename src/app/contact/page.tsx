"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import { AUTHOR_INFO } from "@/data/blog";
import {
  Mail,
  Copy,
  Check,
  Send,
  ArrowLeft,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { GithubIcon, LinkedinIcon, TwitterIcon } from "@/components/Icons";

export default function ContactPage() {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [name, setName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const copyEmail = () => {
    navigator.clipboard.writeText(AUTHOR_INFO.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:${AUTHOR_INFO.email}?subject=${encodeURIComponent(
      `[victorc.me] ${subject || "Correspondence from " + (name || "Reader")}`
    )}&body=${encodeURIComponent(
      `Hi Victor,\n\n${message}\n\nRegards,\n${name} (${senderEmail})`
    )}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#08080a] text-zinc-100 selection:bg-[#d4af37] selection:text-black">
      <ReadingProgressBar />
      <Navbar />

      <main className="flex-grow py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6">
          {/* Back link */}
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Index
          </a>

          {/* Header */}
          <div className="mb-12">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] mb-3">
              Correspondence
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif-luxury font-normal text-white">
              Direct Inquiries.
            </h1>
            <p className="mt-4 text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl font-light">
              For technical inquiries, dialogue on autonomous agent architectures, or research feedback. Direct correspondence is welcomed.
            </p>
          </div>

          {/* Direct Address Card */}
          <div className="luxury-panel rounded-2xl p-6 sm:p-7 mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Direct Email</div>
              <div className="text-base font-serif-luxury text-white mt-0.5">
                {AUTHOR_INFO.email}
              </div>
            </div>

            <button
              onClick={copyEmail}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-all border border-zinc-800 flex items-center justify-center gap-1.5 shrink-0"
            >
              {copiedEmail ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span className="text-[#d4af37]">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Address</span>
                </>
              )}
            </button>
          </div>

          {/* Letter / Form Container */}
          <div className="luxury-panel rounded-2xl p-7 sm:p-9 mb-12">
            <h2 className="text-lg font-serif-luxury font-normal text-white mb-6">
              Compose a Dispatch
            </h2>

            <form onSubmit={handleSendMessage} className="space-y-5 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-zinc-400 mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]/60"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-2">Subject / Inquiry Domain</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Research inquiry on Context Caching benchmarks"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]/60"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-2">Message</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your message or thoughts..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#d4af37]/60 font-sans text-xs sm:text-sm font-light"
                />
              </div>

              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 text-black font-medium text-xs font-mono hover:bg-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Note
                </button>

                <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Responses typically within 24 to 48 hours
                </span>
              </div>
            </form>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
            <a
              href={AUTHOR_INFO.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <GithubIcon className="w-4 h-4" />
              <span>GitHub (Another1nat)</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-600" />
            </a>

            <span className="text-zinc-700">•</span>

            <a
              href={AUTHOR_INFO.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-[#d4af37] transition-colors"
            >
              <LinkedinIcon className="w-4 h-4" />
              <span>LinkedIn</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-600" />
            </a>

            <span className="text-zinc-700">•</span>

            <a
              href={AUTHOR_INFO.twitter}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <TwitterIcon className="w-4 h-4" />
              <span>X / Twitter</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-600" />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
