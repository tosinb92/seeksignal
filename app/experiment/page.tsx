import type { Metadata } from "next";
import Link from "next/link";
import styles from "./experiment.module.css";

export const metadata: Metadata = {
  title: "The SeekSignal Experiment",
  description: "A public record of SeekSignal measuring and improving its own search visibility.",
  alternates: { canonical: "/experiment" }
};

export default function ExperimentPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">S <b>SeekSignal</b></Link>
        <Link className={styles.back} href="/">Back to SeekSignal →</Link>
      </header>
      <section className={styles.hero}>
        <span className={styles.kicker}>A public measurement log</span>
        <h1>The SeekSignal Experiment</h1>
        <p>We are using SeekSignal to understand and improve SeekSignal’s own visibility. We’ll publish observations only when we can show where they came from and when they were collected.</p>
      </section>
      <section className={styles.status}>
        <div><span className={styles.label}>Current status</span><strong>Baseline being established</strong></div>
        <span className={styles.badge}>No performance figures published</span>
      </section>
      <section className={styles.grid}>
        <article><span>01 · Website evidence</span><h2>Technical readiness</h2><p>A first-party website scan can record observable page and technical signals. The initial baseline has not yet been published here.</p><small>Source: SeekSignal website scan · Awaiting verified run</small></article>
        <article><span>02 · Google Search</span><h2>Search performance</h2><p>Impressions, clicks, queries and average positions require an authorised Google Search Console connection.</p><small>Status: Not connected</small></article>
        <article><span>03 · AI search</span><h2>Model visibility</h2><p>Provider-model responses can be tested with recorded prompts and conditions. These tests are not equivalent to consumer search products.</p><small>Status: No internal test result published</small></article>
        <article><span>04 · Commercial outcomes</span><h2>Enquiries and conversions</h2><p>We will report enquiries or conversions only where an authorised analytics connection can measure them.</p><small>Status: Analytics connection required</small></article>
      </section>
      <section className={styles.method}>
        <span className={styles.label}>How we report</span>
        <p>Each future update will include its source, collection date, sample size and limitations. Estimates and AI-generated suggestions will be labelled separately from observed results. We will not claim that a SeekSignal change caused a performance improvement unless the evidence supports that conclusion.</p>
        <Link href="/#scan">Run a free website analysis →</Link>
      </section>
      <footer className={styles.footer}>Evidence first. No fabricated rankings, citations, traffic or customer outcomes.</footer>
    </main>
  );
}
