"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "../lib/analytics/client";
import styles from "./RunVisibilityTest.module.css";

type VisibilityResult = {
  methodology: string;
  visibilityScore: number;
  recommendationShare: number;
  mentionCount: number;
  recommendationCount: number;
  citationCount: number;
  successfulTests: number;
  totalTests: number;
  results: Array<{
    engine: string;
    model: string;
    prompt: string;
    ok: boolean;
    brandMentioned: boolean;
    recommendationDetected: boolean;
    competitorsMentioned: Array<{ name: string }>;
    citations: unknown[];
    excerpt: string;
    error?: string;
  }>;
};

export default function RunVisibilityTest({ projectId, gatewayEnabled }: { projectId: string; gatewayEnabled: boolean }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VisibilityResult | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function run() {
    if (!accepted || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setUpgradeRequired(false);
    try {
      const response = await fetch("/api/visibility/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, acceptUsageCosts: true })
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.upgradeRequired) setUpgradeRequired(true);
        throw new Error(data.error || "Could not run AI visibility test.");
      }
      setResult(data);
      void trackEvent("ai_visibility_completed", {
        projectId,
        metadata: { visibilityScore: data.visibilityScore, successfulTests: data.successfulTests, totalTests: data.totalTests }
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run AI visibility test.");
    } finally {
      setLoading(false);
    }
  }

  async function upgrade() {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Could not start checkout.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setCheckoutLoading(false);
    }
  }

  return (
    <section id="ai-visibility" className={styles.section} aria-labelledby="ai-visibility-title">
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>AI visibility</span><h2 id="ai-visibility-title">Are AI models mentioning your business?</h2><p>Run a small, controlled sample across supported provider models.</p></div>
        <div className={styles.limit}><strong>Up to 8 calls</strong><span>Maximum per run · 3 runs per project each day</span></div>
      </header>

      <div className={styles.methodNote}><strong>What this measures</strong><span>Provider API responses. They can differ from answers in consumer AI apps.</span></div>

      {!gatewayEnabled ? <div className={styles.notice} role="status">AI testing is unavailable on this deployment. No calls will be made until gateway access is enabled.</div> : null}

      <div className={styles.runRow}>
        <label className={styles.consent}>
          <input type="checkbox" checked={accepted} disabled={!gatewayEnabled} onChange={(e) => setAccepted(e.target.checked)} />
          <span>I understand this test uses metered model calls and may incur usage charges.</span>
        </label>
        <button className={styles.primaryButton} onClick={run} disabled={!gatewayEnabled || !accepted || loading || !projectId}>
          {loading ? "Running test…" : "Run AI visibility test"}
        </button>
      </div>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {upgradeRequired ? (
        <div className={styles.upgrade}>
          <div><strong>Upgrade to Pro</strong><span>£49/month · unlock live AI visibility testing and saved results.</span></div>
          <button className={styles.secondaryButton} onClick={upgrade} disabled={checkoutLoading}>{checkoutLoading ? "Opening checkout…" : "View Pro"}</button>
        </div>
      ) : null}

      {result ? (
        <div className={styles.results}>
          <div className={styles.resultHead}><div><span className={styles.eyebrow}>Latest run</span><h3>What the test found</h3></div><span className={styles.sample}>{result.successfulTests} of {result.totalTests} tests succeeded</span></div>
          <div className={styles.metricGrid}>
            <article><span>Visibility</span><strong>{result.visibilityScore}%</strong></article>
            <article><span>Share of tracked mentions</span><strong>{result.recommendationShare}%</strong></article>
            <article><span>Brand mentions</span><strong>{result.mentionCount}</strong></article>
            <article><span>Citations found</span><strong>{result.citationCount}</strong></article>
          </div>
          <div className={styles.resultList}>
            {result.results.map((item, index) => (
              <article className={styles.resultRow} key={`${item.engine}-${index}`}>
                <header><strong>{item.engine}</strong><span className={item.ok ? item.brandMentioned ? styles.positive : styles.neutral : styles.negative}>{!item.ok ? "Test failed" : item.brandMentioned ? item.recommendationDetected ? "Recommended" : "Mentioned" : "Not mentioned"}</span></header>
                {item.ok ? <div className={styles.chips}><span>{item.citations.length} citations</span>{item.competitorsMentioned.length ? <span>{item.competitorsMentioned.length} competitor brands</span> : null}</div> : null}
                <details><summary>View prompt and response</summary><p className={styles.prompt}>{item.prompt}</p><p className={styles.excerpt}>{item.ok ? item.excerpt : item.error}</p></details>
              </article>
            ))}
          </div>
          <details className={styles.methodology}><summary>Method and limitations</summary><p>{result.methodology}</p></details>
        </div>
      ) : null}
    </section>
  );
}
