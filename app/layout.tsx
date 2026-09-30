import type { Metadata } from "next";
import "./globals.css";
import PageViewTracker from "../components/PageViewTracker";

export const metadata: Metadata = {
  metadataBase: new URL("https://seeksignal.vercel.app"),
  title: {
    default: "SeekSignal — AI visibility intelligence",
    template: "%s | SeekSignal"
  },
  description: "Audit website AI readiness, test model-level visibility, track competitors and turn findings into practical improvements.",
  applicationName: "SeekSignal",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "SeekSignal — AI visibility intelligence",
    description: "See what AI can understand about your business, where competitors appear, and what to improve next.",
    siteName: "SeekSignal"
  },
  twitter: {
    card: "summary_large_image",
    title: "SeekSignal — AI visibility intelligence",
    description: "Website-readiness audits and controlled AI visibility testing with practical recommendations."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
