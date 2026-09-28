import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SeekSignal — See how AI sees your business",
  description: "AI visibility intelligence for brands that want to be discovered, understood and recommended across AI platforms."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
