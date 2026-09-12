import React from "react";
import { AUTHOR_INFO } from "@/data/blog";
import { ArrowUpRight } from "lucide-react";
import { GithubIcon, LinkedinIcon, TwitterIcon } from "@/components/Icons";

export default function AboutSection() {
  return (
    <section id="about" className="py-20 border-t border-zinc-800/60 relative">
      <div className="max-w-4xl mx-auto px-6">
        <div className="luxury-panel rounded-2xl p-8 sm:p-10 border border-zinc-800/80">
          <div className="max-w-2xl">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] mb-3">
              Colophon & Perspective
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif-luxury font-normal text-white mb-4">
              Written & Maintained by {AUTHOR_INFO.name}.
            </h2>

            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed mb-4 font-light">
              My engineering focus centers on autonomous agent orchestration, multimodal systems, and low-latency inference architectures.
            </p>

            <p className="text-zinc-400 text-sm leading-relaxed mb-8 font-light">
              This publication serves as an open research journal: empirical benchmarks, architectural analyses, and software tools developed in the open on GitHub. Open to rigorous technical dialogue.
            </p>

            {/* Links */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <a
                href={AUTHOR_INFO.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
              >
                <GithubIcon className="w-3.5 h-3.5" />
                <span>GitHub (Another1nat)</span>
                <ArrowUpRight className="w-3 h-3 text-zinc-600" />
              </a>

              <span className="text-zinc-700">•</span>

              <a
                href={AUTHOR_INFO.linkedin}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-[#d4af37] transition-colors"
              >
                <LinkedinIcon className="w-3.5 h-3.5" />
                <span>LinkedIn</span>
                <ArrowUpRight className="w-3 h-3 text-zinc-600" />
              </a>

              <span className="text-zinc-700">•</span>

              <a
                href="/feed.xml"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 hover:text-amber-300 transition-colors"
              >
                RSS XML
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
