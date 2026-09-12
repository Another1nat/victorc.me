import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Victor",
  description:
    "Direct inquiries and technical correspondence with Victor regarding AI systems, architecture teardowns, and autonomous agent research.",
  alternates: {
    canonical: "https://victorc.me/contact",
  },
  openGraph: {
    title: "Contact Victor — Direct Inquiries",
    description:
      "Direct technical inquiries and correspondence regarding AI systems and autonomous agent research.",
    url: "https://victorc.me/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
