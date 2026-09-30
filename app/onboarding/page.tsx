"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./onboarding.module.css";
import { trackEvent } from "../../lib/analytics/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    business: "",
    website: "",
    market: "United Kingdom",
    category: "",
    audience: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          leadId:
            (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("lead") : null) ||
            (typeof window !== "undefined" ? window.localStorage.getItem("seeksignalPendingLeadId") : null)
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not finish your workspace.");
      }

      void trackEvent("onboarding_completed", { projectId: data.projectId || undefined });
      if (typeof window !== "undefined") window.localStorage.removeItem("seeksignalPendingLeadId");
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish your workspace.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.brand}><span>S</span>SeekSignal</Link>

      <section className={styles.wrap}>
        <div className={styles.intro}>
          <div className={styles.step}>Step 1 of 1</div>
          <h1>Build your first AI visibility workspace.</h1>
          <p>Tell SeekSignal what you want to monitor. We’ll create the project structure around your business rather than dropping you into an empty dashboard.</p>

          <div className={styles.benefits}>
            <span><i>01</i> Track one business or domain</span>
            <span><i>02</i> Build scan history over time</span>
            <span><i>03</i> Compare visibility and opportunities</span>
          </div>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <label><span>Business name</span><input value={form.business} onChange={(e)=>setForm({...form,business:e.target.value})} placeholder="Acme Ltd" required /></label>
          <label><span>Website</span><input value={form.website} onChange={(e)=>setForm({...form,website:e.target.value})} placeholder="https://example.com" required /></label>
          <div className={styles.row}>
            <label><span>Primary market</span><input value={form.market} onChange={(e)=>setForm({...form,market:e.target.value})} /></label>
            <label><span>Business category</span><input value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})} placeholder="Fire compliance, SaaS, ecommerce…" required /></label>
          </div>
          <label><span>Who are your customers?</span><input value={form.audience} onChange={(e)=>setForm({...form,audience:e.target.value})} placeholder="Marketing leaders, local homeowners…" /></label>

          {error && <div className={styles.error}>{error}</div>}
          <button disabled={loading}>{loading ? "Creating workspace…" : "Create my workspace →"}</button>
          <small>You can add competitors, additional projects and team members later.</small>
        </form>
      </section>
    </main>
  );
}
