import React from "react";
import { AUTHOR_INFO } from "@/data/blog";
import Logo from "@/components/Logo";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-900/80 bg-[#060608] py-14 text-xs text-zinc-500 font-mono">
      <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Logo size={18} />
          <span className="text-zinc-400 font-serif-luxury tracking-wide">{AUTHOR_INFO.domain}</span>
          <span>•</span>
          <span>© {currentYear} {AUTHOR_INFO.name}. All works curated.</span>
        </div>

        <div className="flex items-center gap-6 text-zinc-400">
          <a href="/about" className="hover:text-white transition-colors">
            About
          </a>
          <a href="/research" className="hover:text-white transition-colors">
            Research
          </a>
          <a href="/notes" className="hover:text-white transition-colors">
            Notes
          </a>
          <a href="/demo" className="hover:text-[#d4af37] transition-colors">
            Live AI
          </a>
          <a href="/contact" className="hover:text-[#d4af37] transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
