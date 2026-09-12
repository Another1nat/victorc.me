import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Victor — AI Systems, Architecture & Findings",
  description:
    "Personal technical notebook and engineering findings by Victor. Practical benchmarks, architecture teardowns, and experiments with frontier AI models.",
  keywords: [
    "AI Architecture",
    "LLM Benchmarks",
    "Context Caching",
    "Systems Engineering",
    "Local Inference",
    "Victor",
    "Blog",
  ],
  authors: [{ name: "Victor" }],
  alternates: {
    types: {
      "application/rss+xml": "https://victorc.me/feed.xml",
    },
  },
  openGraph: {
    title: "Victor — AI Systems, Architecture & Findings",
    description:
      "Personal technical notebook and engineering findings by Victor. Practical benchmarks, architecture teardowns, and experiments with frontier AI models.",
    type: "website",
    url: "https://victorc.me",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Victor's Technical Notebook"
          href="/feed.xml"
        />
      </head>
      <body className="min-h-screen bg-[#090a0f] text-zinc-100 antialiased flex flex-col selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
