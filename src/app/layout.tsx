import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://victorc.me"),
  title: {
    default: "Victor — AI Systems, Architecture & Findings",
    template: "%s | Victor",
  },
  description:
    "Personal technical publication and engineering findings by Victor. Practical benchmarks, autonomous agent loops, context caching optimizations, and architecture teardowns.",
  keywords: [
    "Victor",
    "victorc.me",
    "Artificial Intelligence",
    "Autonomous Agents",
    "LLM Architecture",
    "Context Caching",
    "Vector Search",
    "Systems Engineering",
    "watchduck",
    "lazyduck",
    "ECC",
  ],
  authors: [{ name: "Victor", url: "https://victorc.me" }],
  creator: "Victor",
  publisher: "Victor",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  alternates: {
    canonical: "https://victorc.me",
    types: {
      "application/rss+xml": "https://victorc.me/feed.xml",
    },
  },
  openGraph: {
    title: "Victor — AI Systems, Architecture & Findings",
    description:
      "Personal technical publication and engineering findings by Victor. Practical benchmarks, autonomous agent loops, context caching optimizations, and architecture teardowns.",
    type: "website",
    url: "https://victorc.me",
    siteName: "victorc.me",
    locale: "en_US",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Victor — AI Systems & Research",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Victor — AI Systems, Architecture & Findings",
    description:
      "Personal technical publication and engineering findings by Victor. Practical benchmarks, autonomous agent loops, and architecture teardowns.",
    images: ["/icon.png"],
    creator: "@Another1nat",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://victorc.me/#person",
      "name": "Victor",
      "url": "https://victorc.me",
      "jobTitle": "AI Systems Researcher & Software Engineer",
      "sameAs": [
        "https://github.com/Another1nat",
        "https://linkedin.com"
      ],
      "description": "Researcher focusing on autonomous agent loops, context caching, vector index topologies, and frontier AI systems."
    },
    {
      "@type": "WebSite",
      "@id": "https://victorc.me/#website",
      "url": "https://victorc.me",
      "name": "Victor — AI Systems, Architecture & Findings",
      "publisher": {
        "@id": "https://victorc.me/#person"
      },
      "inLanguage": "en-US"
    }
  ]
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#08080a] text-zinc-100 antialiased flex flex-col selection:bg-[#d4af37] selection:text-black">
        {children}
      </body>
    </html>
  );
}
