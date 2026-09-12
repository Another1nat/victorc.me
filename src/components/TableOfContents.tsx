"use client";

import React, { useEffect, useState } from "react";

interface TableOfContentsProps {
  sections: {
    heading?: string;
  }[];
}

export default function TableOfContents({ sections }: TableOfContentsProps) {
  const [activeHeading, setActiveHeading] = useState<string>("");

  const headings = sections
    .map((s) => s.heading)
    .filter((h): h is string => Boolean(h && h.trim()));

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    );

    headings.forEach((heading) => {
      const id = heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden xl:block w-64 shrink-0 text-xs font-mono">
      <div className="sticky top-28 space-y-4 pr-4">
        <div className="text-[10px] uppercase tracking-widest text-[#d4af37] font-semibold">
          Contents
        </div>
        <nav className="space-y-2 border-l border-zinc-800/80 pl-3">
          {headings.map((heading) => {
            const id = heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const isActive = activeHeading === id;

            return (
              <a
                key={id}
                href={`#${id}`}
                className={`block py-1 leading-snug transition-colors ${
                  isActive
                    ? "text-[#d4af37] font-medium -ml-[13px] pl-3 border-l-2 border-[#d4af37]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {heading}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
