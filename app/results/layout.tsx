import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website audit report",
  robots: { index: false, follow: false }
};

export default function ResultsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
