import React from "react";
import { FEATURED_REPOS, AUTHOR_INFO } from "@/data/blog";
import { ArrowUpRight, Code2, Sparkles } from "lucide-react";
import { GithubIcon } from "@/components/Icons";

export default function GitHubFeed() {
  return (
    <section id="github" className="py-20 border-t border-zinc-800/60 relative">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest text-[#d4af37] bg-zinc-900 border border-zinc-800 mb-3">
              <GithubIcon className="w-3 h-3" />
              Selected Works
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif-luxury font-normal text-white">
              Open Source Systems & Frameworks
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-xl font-light">
              Autonomous agent concierges, observability tools, and intelligence platforms developed on GitHub.
            </p>
          </div>

          <a
            href={AUTHOR_INFO.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
          >
            <span>github.com/Another1nat</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
          </a>
        </div>

        {/* Repositories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_REPOS.map((repo) => (
            <a
              key={repo.name}
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="luxury-panel rounded-xl p-5 hover:border-zinc-700/90 transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-mono text-xs font-semibold text-white group-hover:text-[#d4af37] transition-colors">
                    {repo.name}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed mb-4 font-light line-clamp-3">
                  {repo.description}
                </p>
              </div>

              <div>
                {/* Topics */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {repo.topics.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800/80 text-zinc-500"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-3 border-t border-zinc-800/50">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        repo.language === "TypeScript"
                          ? "bg-blue-400"
                          : repo.language === "Python"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    {repo.language}
                  </span>

                  <span className="text-[10px] text-zinc-600">Open Source</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
