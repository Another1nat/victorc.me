import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aegis AI Reliability Gateway — Victor",
  description:
    "An OpenAI-compatible AI reliability gateway with cost-aware routing, circuit-breaker failover, prompt A/B testing, and a golden-case regression harness — 58 automated tests, honestly graded, live demo included.",
  alternates: {
    canonical: "https://victorc.me/aegis",
  },
  openGraph: {
    title: "Aegis AI Reliability Gateway",
    description:
      "A production-shaped AI gateway: routing, failover, rate limiting, prompt experimentation, and an honest capability registry. Try the live demo.",
    url: "https://victorc.me/aegis",
  },
};

export default function AegisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
