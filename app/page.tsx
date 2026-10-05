"use client";
import WebsiteScreenshot from "../components/WebsiteScreenshot";

import { FormEvent, useState } from "react";
import LeadGate from "../components/LeadGate";
import { trackEvent } from "../lib/analytics/client";

type Result = {
  leadId: string;
  score: number;
  url: string;
  summary: string;
  methodology: string;
  checks: { label: string; status: "good" | "warn"; detail: string; evidence?: string }[];
  categories: { name: string; score: number }[];
  opportunities: {
    rank?: number;
    title: string;
    problem?: string;
    evidence?: string;
    action: string;
    benefit?: string;
    implementation?: string[];
    expectedImpact?: string;
    verify?: string;
    impact: string;
    effort?: string;
  }[];
  actionPlan?: {
    rank?: number;
    title: string;
    problem?: string;
    evidence?: string;
    action: string;
    benefit?: string;
    implementation?: string[];
    expectedImpact?: string;
    verify?: string;
    impact: string;
    effort?: string;
  }[];
  expectedOutcome?: string;
  commercialDiagnosis?: { headline: string; detail: string; consequence: string };
  quickWins?: {
    title: string;
    impact: string;
    effort?: string;
    action: string;
    expectedImpact?: string;
  }[];
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [showGate, setShowGate] = useState(false);
  const [lead, setLead] = useState({ name: "", email: "", business: "" });

  function startAudit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!url.trim()) {
      setError("Enter your website first.");
      return;
    }

    void trackEvent("audit_started", { metadata: { website: url.trim() } });
    setShowGate(true);
  }

  async function unlockResults(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, ...lead })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");

      setResult(data);
      setShowGate(false);
      void trackEvent("audit_completed", { leadId: data.leadId, metadata: { score: data.score, website: data.url } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Audit failed";
      setError(message);
      void trackEvent("audit_failed", { metadata: { website: url.trim(), message } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="site">
      <header className="topbar shell heroOverlayNav">
        <a className="brand" href="#" aria-label="SeekSignal home">
          <span className="brandMark">S</span><span>SeekSignal</span>
        </a>
        <nav className="mainNav" aria-label="Main navigation">
          <a href="#platform">Product</a><a href="#intelligence">Solutions</a><a href="#methodology">How it works</a><a href="#scan">Free audit</a><a href="#pricing">Pricing</a>
        </nav>
        <div className="navActions"><a className="loginLink" href="/login">Sign in</a><a className="navCta" href="#scan">Get started <span>→</span></a></div>
      </header>

      <section className="hero shell heroCover">
        <img className="heroCoverImage" src="/assets/homepage/SeekSignal%20AI%20Visibility%20Dashboard.png" alt="" aria-hidden="true" />
        <form id="scan" className="heroHotspotForm" onSubmit={startAudit} aria-label="Run a free SeekSignal website audit">
          <label className="srOnly" htmlFor="hero-url">Website address</label>
          <input id="hero-url" value={url} onChange={(e)=>setUrl(e.target.value)} aria-label="Website address" placeholder="" required />
          <button type="submit" aria-label="Analyse my website"></button>
        </form>
      </section>

      <section id="methodology" className="methodologyStrip shell">
        <span>WHAT WE ACTUALLY MEASURE</span>
        <div>
          <article><b>01</b><strong>Observable evidence</strong><p>We inspect signals available from the submitted website rather than inventing a visibility score from unsupported assumptions.</p></article>
          <article><b>02</b><strong>Explainable findings</strong><p>Important findings include what was observed, why it matters, a practical action and a way to verify the fix.</p></article>
          <article><b>03</b><strong>Clear limits</strong><p>Website readiness is not the same as being recommended by ChatGPT, Gemini or another AI system. SeekSignal states that distinction explicitly.</p></article>
        </div>
      </section>

      <section id="pricing" className="pricingSection shell">
        <div className="pricingIntro">
          <span>PRICING</span>
          <h2>Find your visibility gap before you spend more trying to fix it.</h2>
          <p>The website-readiness diagnostic is free. SeekSignal Pro unlocks controlled AI visibility tests, saved intelligence, ongoing re-testing and competitor context.</p>
        </div>
        <div className="pricingGrid">
          <article className="pricingCard">
            <div>
              <span className="pricingLabel">FREE</span>
              <h3>Website diagnostic</h3>
              <div className="price"><strong>£0</strong><small>no card required</small></div>
              <p>Understand the signals your website currently gives search and AI retrieval systems.</p>
            </div>
            <ul>
              <li>AI-readiness score</li>
              <li>Evidence behind each finding</li>
              <li>Priority website fixes</li>
              <li>Commercial diagnosis</li>
            </ul>
            <a href="#scan">Analyse my website →</a>
          </article>
          <article className="pricingCard pricingPro">
            <div>
              <span className="pricingLabel">SEEKSIGNAL PRO</span>
              <h3>Ongoing AI visibility intelligence</h3>
              <div className="price"><strong>£49</strong><small>/ month</small></div>
              <p>Move beyond website readiness and test whether leading AI models actually surface your business.</p>
            </div>
            <ul>
              <li>Everything in the free diagnostic</li>
              <li>Live AI visibility testing</li>
              <li>OpenAI, Claude, Gemini & Perplexity coverage</li>
              <li>Competitor tracking and saved reports</li>
              <li>Re-scans and ongoing monitoring</li>
            </ul>
            <a href="/signup">Start with a free diagnostic →</a>
            <small className="pricingFine">Cancel through Stripe billing. AI tests are subject to usage limits.</small>
          </article>
        </div>
      </section>

      <section className="minimalProof shell">
        <span>THE QUESTION IS SIMPLE</span>
        <h2>If a buyer asked AI for a business like yours today, would your website give it enough evidence to understand why you belong in the answer?</h2>
        <a href="#scan">Find out now →</a>
      </section>

      <footer className="footer shell">
        <div className="brand"><span className="brandMark">S</span><span>SeekSignal</span></div>
        <span>AI discovery intelligence.</span>
        <div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/login">Sign in</a><a href="/signup">Create account</a></div>
      </footer>
    </main>
  );
}
