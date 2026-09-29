"use client";

import type { FormEvent } from "react";
import styles from "./LeadGate.module.css";

type Lead = { name: string; email: string; business: string };

type Props = {
  website: string;
  lead: Lead;
  loading: boolean;
  onChange: (lead: Lead) => void;
  onSubmit: (event: FormEvent) => void;
  onBack: () => void;
};

export default function LeadGate({ website, lead, loading, onChange, onSubmit, onBack }: Props) {
  const displayWebsite = website.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  return (
    <section className={styles.wrap} aria-labelledby="unlock-title">
      <div className={styles.preview}>
        <div className={styles.topline}>
          <span className={styles.statusDot} />
          <span>Free AI visibility scan</span>
          <span className={styles.website}>{displayWebsite}</span>
        </div>

        <div className={styles.previewBody}>
          <div className={styles.kicker}>Your report is ready to generate</div>
          <h2 id="unlock-title">Unlock your AI visibility report.</h2>
          <p className={styles.copy}>
            See your readiness score, the signals holding your website back, and the
            highest-impact actions to improve how clearly AI systems understand your business.
          </p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span>AI readiness</span>
              <strong>—</strong>
              <small>0–100 score</small>
            </div>
            <div className={styles.stat}>
              <span>Priority gaps</span>
              <strong>—</strong>
              <small>Ranked by impact</small>
            </div>
            <div className={styles.stat}>
              <span>Signals checked</span>
              <strong>9</strong>
              <small>Website signals</small>
            </div>
          </div>

          <div className={styles.points}>
            <span><i>✓</i> Website readiness breakdown</span>
            <span><i>✓</i> Prioritised recommendations</span>
            <span><i>✓</i> Clear next actions</span>
          </div>
        </div>
      </div>

      <div className={styles.formPane}>
        <button className={styles.back} type="button" onClick={onBack}>← Edit website</button>
        <div className={styles.formHeading}>
          <span>Step 2 of 2</span>
          <h3>Unlock your free report.</h3>
          <p>No card required. Enter your details to reveal and save the results.</p>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <label>
            <span>Your name</span>
            <input
              autoComplete="name"
              value={lead.name}
              onChange={(e) => onChange({ ...lead, name: e.target.value })}
              placeholder="Jane Smith"
              required
            />
          </label>

          <label>
            <span>Work email</span>
            <input
              type="email"
              autoComplete="email"
              value={lead.email}
              onChange={(e) => onChange({ ...lead, email: e.target.value })}
              placeholder="jane@company.com"
              required
            />
          </label>

          <label>
            <span>Business name</span>
            <input
              autoComplete="organization"
              value={lead.business}
              onChange={(e) => onChange({ ...lead, business: e.target.value })}
              placeholder="Company Ltd"
              required
            />
          </label>

          <button className={styles.submit} disabled={loading}>
            {loading ? <><span className={styles.spinner} /> Analysing website…</> : "Reveal my results →"}
          </button>
        </form>

        <p className={styles.privacy}>
          We use these details to create and securely associate this report with your SeekSignal account if you choose to continue.
          No card required.
        </p>
      </div>
    </section>
  );
}
