"use client";

import React, { useState, useEffect } from "react";
import { AUTHOR_INFO } from "@/data/blog";
import { Menu, X, ArrowUpRight, Rss, Mail, Search } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/Icons";
import Logo from "@/components/Logo";
import CommandMenu from "@/components/CommandMenu";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/60 bg-[#08080a]/80 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <a href="/" className="flex items-center gap-3 group">
          <Logo size={28} />
          <div className="flex flex-col">
            <span className="font-medium tracking-wider text-xs uppercase text-zinc-200 group-hover:text-white transition-colors flex items-center gap-1.5 font-mono">
              Victor
              <span className="w-1 h-1 rounded-full bg-[#d4af37]"></span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-tight">victorc.me</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-mono text-zinc-400">
          <a href="/about" className="hover:text-white transition-colors">
            About
          </a>
          <a href="/research" className="hover:text-white transition-colors">
            Research
          </a>
          <a href="/notes" className="hover:text-white transition-colors">
            Notes
          </a>
          <a href="/demo" className="text-[#d4af37] hover:text-white transition-colors flex items-center gap-1 font-semibold">
            Live AI
          </a>
          <a href="/contact" className="hover:text-white transition-colors flex items-center gap-1">
            Contact
          </a>
          <a
            href="/feed.xml"
            target="_blank"
            rel="noreferrer"
            className="hover:text-amber-300 transition-colors text-zinc-500"
            title="RSS Feed"
          >
            RSS
          </a>
        </nav>

        {/* Right Search & Socials */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-mono transition-all"
            title="Search site (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] text-zinc-400">Search</span>
            <kbd className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-700/50">
              ⌘K
            </kbd>
          </button>

          <a
            href={AUTHOR_INFO.github}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition-colors"
            title="GitHub (Another1nat)"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
          <a
            href={AUTHOR_INFO.linkedin}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg text-zinc-400 hover:text-[#d4af37] hover:bg-zinc-800/40 transition-colors"
            title="LinkedIn Profile"
          >
            <LinkedinIcon className="w-4 h-4" />
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-400 hover:text-white focus:outline-none"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-[#0c0c10] px-6 py-5 space-y-3.5 text-xs font-mono">
          <a
            href="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-zinc-300 hover:text-white py-1"
          >
            About
          </a>
          <a
            href="/research"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-zinc-300 hover:text-white py-1"
          >
            Research
          </a>
          <a
            href="/notes"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-zinc-300 hover:text-white py-1"
          >
            Notes
          </a>
          <a
            href="/demo"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-[#d4af37] font-semibold py-1"
          >
            Live AI Concierge
          </a>
          <a
            href="/#tools"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-zinc-300 hover:text-white py-1"
          >
            Instruments
          </a>
          <a
            href="/#github"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-zinc-300 hover:text-white py-1"
          >
            Works (GitHub)
          </a>
          <a
            href="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-[#d4af37] py-1"
          >
            Contact
          </a>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setSearchOpen(true);
            }}
            className="w-full flex items-center justify-between text-zinc-300 hover:text-white py-1.5 font-mono"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#d4af37]" />
              Search Publications
            </span>
            <kbd className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-700/50">
              ⌘K
            </kbd>
          </button>
          <a
            href="/feed.xml"
            target="_blank"
            rel="noreferrer"
            className="block text-zinc-500 py-1"
          >
            RSS Feed (/feed.xml)
          </a>
        </div>
      )}

      {/* Global Command Menu (Cmd + K) */}
      <CommandMenu isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
