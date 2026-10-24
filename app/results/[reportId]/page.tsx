"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import OpportunityValueCalculator from "../../../components/OpportunityValueCalculator";
import WebsiteScreenshot from "../../../components/WebsiteScreenshot";
import { trackEvent } from "../../../lib/analytics/client";
import styles from "./results.module.css";

type Check = { label: string; status: "good" | "warn"; detail: string; evidence?: string };
type Opportunity = {
  title: string;
  problem?: string;
  evidence?: string;
  action: string;
  expectedImpact?: string;
  implementation?: string[];
  verify?: string;
  impact: string;
  effort?: string;
  evidenceClass?: string;
  sourceUrl?: string;
  collectedAt?: string;
  confidence?: string;
  priority?: { score: number; methodology: string; factors: { name: string; points: number; class: string }[] };
};
type BuyerQuery = {
  query: string;
  intent: string;
  geography: string | null;
  dataSource: string;
  evidenceClass: string;
  confidence: string;
  supportingEvidence: string;
  recommendedAction: string;
};
type AuditReport = {
  leadId: string;
  score: number;
  url: string;
  summary: string;
  methodology: string;
  checks: Check[];
  categories: { name: string; score: number }[];
  opportunities: Opportunity[];
  buyerIntentRadar?: BuyerQuery[];
  commercialDiagnosis?: { headline: string; detail: string; consequence: string };
  expectedOutcome?: string;
  collectedAt?: string;
};

function formatDate(value?: string) {
  if (!value) return "Just completed";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Just completed" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function AuditReportPage() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expandedAction, setExpandedAction] = useState<number | null>(0);

  useEffect(() => {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const reportId = pathParts[pathParts.length - 1];
    if (reportId) {
      try {
        const saved = window.sessionStorage.getItem(`seeksignal:scan:${reportId}`);
        const parsed = saved ? JSON.parse(saved) as AuditReport : null;
        if (parsed?.leadId === reportId && typeof parsed.score === "number") setReport(parsed);
      } catch {
        setReport(null);
      }
    }
    setLoaded(true);
  }, []);

  if (!loaded) return <main className={styles.loading}>Preparing your report…</main>;
  if (!report) {
    return (
      <main className={styles.unavailable}>
        <Link className={styles.brand} href="/">S <b>SeekSignal</b></Link>
        <span>REPORT NOT AVAILABLE IN THIS TAB</span>
        <h1>Run a new scan to open your report.</h1>
        <p>For privacy, this report is stored in the browser tab where the scan was completed. Start a new scan in this tab to create another report.</p>
        <Link className={styles.primaryButton} href="/#scan">Analyse a website →</Link>
      </main>
    );
  }

  const host = (() => { try { return new URL(report.url).hostname; } catch { return report.url; } })();
  const warnings = report.checks.filter((item) => item.status === "warn").length;
  const strengths = report.checks.filter((item) => item.status === "good").length;
  const opportunities = report.opportunities.slice(0, 5);

  return (
    <main className={styles.reportShell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/">S <b>SeekSignal</b></Link>
        <div className={styles.reportIdentity}><span>WEBSITE REPORT</span><strong>{host}</strong></div>
        <nav aria-label="Report sections">
          <a href="#overview" className={styles.navActive}>Overview</a>
          <a href="#actions">Priority actions</a>
          <a href="#buyer-intent">Buyer intent</a>
          <a href="#technical">Technical evidence</a>
          <a href="#value-scenario">Value scenario</a>
        </nav>
        <div className={styles.sidebarNote}><i /> Evidence-based scan <small>Completed {formatDate(report.collectedAt)}</small></div>
        <Link className={styles.sidebarLink} href="/#scan">Analyse another website <span>↗</span></Link>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div><span>FREE WEBSITE ANALYSIS</span><h1>{host}</h1><p>Report generated {formatDate(report.collectedAt)}</p></div>
          <Link className={styles.topAction} href="/#scan">New analysis <span>＋</span></Link>
        </header>

        <section className={styles.scoreOverview} id="overview">
          <div className={styles.scoreCard}>
            <span>WEBSITE READINESS</span>
            <div><strong>{report.score}</strong><small>/ 100</small></div>
            <div className={styles.scoreTrack}><i style={{ width: `${Math.max(0, Math.min(100, report.score))}%` }} /></div>
            <small>Based on the signals checked in this scan</small>
          </div>
          <div className={styles.overviewText}>
            <span className={styles.sectionEyebrow}>YOUR VISIBILITY SNAPSHOT</span>
            <h2>{report.score >= 80 ? "A strong starting point." : report.score >= 55 ? "Some important signals need attention." : "Clear gaps are holding back your search readiness."}</h2>
            <p>{report.summary}</p>
            <div className={styles.overviewFoot}><span><b>{strengths}</b> strong signals</span><span><b>{warnings}</b> opportunities</span><span><b>{report.opportunities.length}</b> recommended actions</span></div>
          </div>
        </section>

        <section className={styles.metricGrid} aria-label="Scan summary">
          <article><span>Signals checked</span><strong>{report.checks.length}</strong><small>Observed on the website</small></article>
          <article><span>Strong signals</span><strong>{strengths}</strong><small>Working well in this scan</small></article>
          <article><span>Needs attention</span><strong>{warnings}</strong><small>Evidence-backed findings</small></article>
          <article><span>Priority actions</span><strong>{report.opportunities.length}</strong><small>Recommended next steps</small></article>
        </section>

        <section className={styles.insightGrid}>
          <article className={styles.categoryPanel}>
            <div className={styles.panelHeading}><div><span className={styles.sectionEyebrow}>AT A GLANCE</span><h2>Readiness by area</h2></div><small>Scan scores</small></div>
            <div className={styles.categoryList}>{report.categories.map((category) => (
              <div className={styles.categoryRow} key={category.name}>
                <span>{category.name}</span><div><i style={{ width: `${Math.max(0, Math.min(100, category.score))}%` }} /></div><b>{category.score}</b>
              </div>
            ))}</div>
            <p className={styles.methodNote}>{report.methodology}</p>
          </article>
          <article className={styles.previewPanel}>
            <div className={styles.panelHeading}><div><span className={styles.sectionEyebrow}>WEBSITE PREVIEW</span><h2>What we analysed</h2></div><a href={report.url} target="_blank" rel="noreferrer">Open site ↗</a></div>
            <div className={styles.previewFrame}><WebsiteScreenshot url={report.url} /></div>
          </article>
        </section>

        {report.commercialDiagnosis ? (
          <section className={styles.diagnosis}>
            <span className={styles.sectionEyebrow}>COMMERCIAL DIAGNOSIS</span><h2>{report.commercialDiagnosis.headline}</h2>
            <div className={styles.diagnosisGrid}><article><b>What we observed</b><p>{report.commercialDiagnosis.detail}</p></article><article><b>Why it matters</b><p>{report.commercialDiagnosis.consequence}</p></article></div>
          </section>
        ) : null}

        <section className={styles.actionsPanel} id="actions">
          <div className={styles.panelHeading}><div><span className={styles.sectionEyebrow}>GROWTH BLUEPRINT</span><h2>Start with these actions</h2><p>Ranked recommendations with evidence and a way to verify each change.</p></div><span className={styles.countBadge}>{report.opportunities.length} actions</span></div>
          {opportunities.length ? <div className={styles.actionList}>{opportunities.map((item, index) => (
            <article className={styles.actionItem} key={`${item.title}-${index}`}>
              <button className={styles.actionToggle} onClick={() => setExpandedAction(expandedAction === index ? null : index)} aria-expanded={expandedAction === index}>
                <span className={styles.actionNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.actionTitle}><strong>{item.title}</strong><small>{item.impact} impact{item.effort ? ` · ${item.effort} effort` : ""}</small></span>
                {item.priority ? <span className={styles.priorityScore}>{item.priority.score}<small>priority</small></span> : null}
                <span className={styles.chevron}>{expandedAction === index ? "−" : "+"}</span>
              </button>
              {expandedAction === index ? <div className={styles.actionDetails}>
                {item.evidence ? <div><b>Evidence</b><p>{item.evidence}</p></div> : null}
                {item.evidenceClass ? <div className={styles.evidence}><b>{item.evidenceClass} · {item.confidence || "confidence not scored"}</b><p>{item.sourceUrl || report.url}{item.collectedAt ? ` · Collected ${formatDate(item.collectedAt)}` : ""}</p></div> : null}
                {item.problem ? <div><b>Why it matters</b><p>{item.problem}</p></div> : null}
                <div className={styles.recommendedAction}><b>Recommended action</b><p>{item.action}</p></div>
                {item.expectedImpact ? <div><b>Potential benefit</b><p>{item.expectedImpact}</p></div> : null}
                {item.implementation?.length ? <details className={styles.detailDisclosure}><summary>Implementation steps</summary><ol>{item.implementation.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}</ol></details> : null}
                {item.verify ? <div><b>How to verify</b><p>{item.verify}</p></div> : null}
                {item.priority ? <details className={styles.detailDisclosure}><summary>How the priority score was calculated</summary><p>{item.priority.methodology}</p><ul>{item.priority.factors.map((factor) => <li key={factor.name}>{factor.name}: +{factor.points} ({factor.class})</li>)}</ul></details> : null}
              </div> : null}
            </article>
          ))}</div> : <p className={styles.emptyState}>No fundamental readiness warnings were found. The next step is to monitor visibility using connected search data.</p>}
        </section>

        {report.buyerIntentRadar?.length ? <section className={styles.buyerPanel} id="buyer-intent">
          <div className={styles.panelHeading}><div><span className={styles.sectionEyebrow}>BUYER INTENT RADAR</span><h2>Commercial searches to validate</h2><p>These are suggested query hypotheses. Search volume and competition have not been measured.</p></div></div>
          <div className={styles.queryList}>{report.buyerIntentRadar.map((item) => (
            <article key={item.query}><div><span className={styles.intentTag}>{item.intent}</span><h3>{item.query}</h3><p>{item.supportingEvidence}</p></div><div className={styles.queryEvidence}><b>{item.evidenceClass}</b><span>{item.confidence} confidence</span><small>Volume: unavailable · Competition: not measured</small><small>Source: {item.dataSource}</small><details><summary>Recommended next step</summary><p>{item.recommendedAction}</p></details></div></article>
          ))}</div>
        </section> : null}

        <section id="value-scenario" className={styles.calculator}><OpportunityValueCalculator /></section>

        <details className={styles.technicalPanel} id="technical">
          <summary><div><span className={styles.sectionEyebrow}>FULL SCAN RECORD</span><h2>Technical evidence</h2><p>Open each check to see what the scan observed.</p></div><span>{report.checks.length} checks&nbsp;⌄</span></summary>
          <div className={styles.checkList}>{report.checks.map((check) => <article key={check.label}><i className={check.status === "good" ? styles.good : styles.warn} /><div><strong>{check.label}</strong><p>{check.evidence || check.detail}</p><small>{check.detail}</small></div><span>{check.status === "good" ? "Observed" : "Review"}</span></article>)}</div>
        </details>

        <section className={styles.nextStep}>
          <div><span>YOUR NEXT STEP</span><h2>{report.expectedOutcome || "Save your report and start tracking progress."}</h2><p>Readiness is a website scan. It does not claim that an AI platform recommends your business.</p></div>
          <Link href={`/signup?lead=${encodeURIComponent(report.leadId)}`} onClick={() => void trackEvent("signup_clicked", { leadId: report.leadId })}>Save report & track progress →</Link>
        </section>
        <footer className={styles.footer}>SeekSignal · Evidence first · Generated {formatDate(report.collectedAt)}</footer>
      </div>
    </main>
  );
}
