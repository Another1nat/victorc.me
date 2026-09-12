import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Studio — Victor",
  description: "Private publishing environment for Victor's research and dispatches.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
