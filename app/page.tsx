"use client";

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
      <header className="topbar shell">
        <a className="brand" href="#">
          <span className="brandMark">S</span>
          <span>SeekSignal</span>
        </a>

        <nav className="mainNav">
          <a href="#platform">Product</a>
          <a href="#intelligence">Solutions</a>
          <a href="#methodology">How it works</a>
          <a href="#scan">Free audit</a>
        </nav>

        <div className="navActions">
          <a className="loginLink" href="/login">Sign in</a>
          <a className="navCta" href="#scan">Get started <span>→</span></a>
        </div>
      </header>

      <section className="hero shell">
        <div className="heroBackdrop" />
        <div className="heroSplit">
          <div className="heroContent">
            <div className="heroBadge"><span /> AI visibility diagnostic</div>
            <h1>
              What does AI
              <em> see when it sees you?</em>
            </h1>
            <p className="heroCopy">
              Your website is already sending signals to search engines and AI systems. SeekSignal exposes what they can understand, what they may miss, and the gaps that could keep your business out of the answer.
            </p>

            <form id="scan" className="scanBox" onSubmit={startAudit}>
              <div className="scanInput">
                <span className="scanIcon">⌁</span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter your website — example.com"
                  required
                />
              </div>
              <button>Analyse my website <span>→</span></button>
            </form>

            <div className="heroMeta">
              <span>Free diagnostic</span><i />
              <span>No card required</span><i />
              <span>No login or website access needed</span>
            </div>

            <div className="signalPreview" aria-label="Signals included in the diagnostic">
              <span>Entity clarity</span>
              <span>Authority signals</span>
              <span>Technical readiness</span>
              <span>Machine-readable context</span>
            </div>

            <div className="scanWhisper">
              <span className="pulseDot" />
              <span>Scanning entity clarity, authority, technical signals and machine-readable context.</span>
            </div>
          </div>
        </div>

        <div className="credibilityPanel">
          <div className="exampleFinding">
            <span className="credibilityEyebrow">EXAMPLE DIAGNOSTIC OUTPUT</span>
            <div className="exampleScore"><strong>47</strong><small>/100</small></div>
            <div>
              <b>3 priority gaps detected</b>
              <p>See the evidence behind each finding, why it matters and what to change first.</p>
            </div>
          </div>
          <div className="methodProof">
            <span className="credibilityEyebrow">EVIDENCE, NOT A BLACK BOX</span>
            <p>SeekSignal checks observable signals on the website you submit. Findings show the evidence detected and separate website readiness from claims about whether an AI system currently recommends your business.</p>
            <a href="#methodology">How the diagnostic works →</a>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {showGate && !result && (
          <LeadGate
            website={url}
            lead={lead}
            loading={loading}
            onChange={setLead}
            onSubmit={unlockResults}
            onBack={() => {
              setShowGate(false);
              setError("");
            }}
          />
        )}

        {result && (
          <section className="resultExperience">
            <div className="resultHeroNew">
              <div className="siteSnapshot">
                <div className="snapshotBar">
                  <span><i /> Website analysed</span>
                  <strong>{result.url}</strong>
                </div>
                <img
                  src={`https://image.thum.io/get/width/1200/crop/900/https://${result.url}`}
                  alt={`Screenshot of ${result.url} analysed by SeekSignal`}
                />
                <div className="snapshotCaption">
                  <span>Actual website</span>
                  <strong>{result.url}</strong>
                </div>
              </div>

              <div className="resultScorePanel">
                <span className="resultKicker">Your AI readiness score</span>
                <div className="resultScoreValue">{result.score}<small>/100</small></div>
                <div className="resultScoreTrack"><i style={{width:`${result.score}%`}} /></div>
                <h2>
                  {result.score >= 80
                    ? "Strong foundation. Important opportunities remain."
                    : result.score >= 55
                      ? "Good foundation. Several signals need attention."
                      : "Important gaps are limiting how clearly machines can understand this site."}
                </h2>
                <p>{result.summary}</p>
                <div className="resultFacts">
                  <span><b>{result.checks.filter((item) => item.status === "good").length}</b> strong signals</span>
                  <span><b>{result.checks.filter((item) => item.status === "warn").length}</b> opportunities</span>
                  <span><b>{result.opportunities.length}</b> prioritised fixes</span>
                </div>
                <div className="scoreMeaning">
                  <strong>What this score means</strong>
                  <span>{result.methodology}</span>
                </div>
              </div>
            </div>

            <section className="businessMeaning">
              <div className="resultSectionHead">
                <span>What this means for your business</span>
                <h2>Understand the commercial meaning before the technical detail.</h2>
              </div>
              <div className="meaningCards">
                <article>
                  <span>01</span>
                  <strong>{result.checks.filter((item) => item.status === "warn").length} readiness issues need attention</strong>
                  <p>These are observable website signals that may make the business harder for search and AI retrieval systems to interpret clearly.</p>
                </article>
                <article>
                  <span>02</span>
                  <strong>{result.opportunities[0]?.title || "No critical readiness issue detected"}</strong>
                  <p>{result.opportunities[0]?.problem || "Your core readiness signals are strong. The next step is controlled AI visibility testing."}</p>
                </article>
                <article>
                  <span>03</span>
                  <strong>Readiness is not recommendation visibility</strong>
                  <p>This audit measures how clearly your website presents machine-readable business signals. It does not claim ChatGPT, Gemini or another AI currently recommends you.</p>
                </article>
              </div>
            </section>

            {result.commercialDiagnosis ? (
              <section className="commercialDiagnosis">
                <div className="resultSectionHead">
                  <span>Commercial diagnosis</span>
                  <h2>{result.commercialDiagnosis.headline}</h2>
                </div>
                <div className="diagnosisGrid">
                  <article><span>What is happening</span><p>{result.commercialDiagnosis.detail}</p></article>
                  <article><span>Why it costs visibility</span><p>{result.commercialDiagnosis.consequence}</p></article>
                  <article><span>What to do next</span><p>Complete the priority fixes below, publish them, then re-scan. Only after the website evidence improves should you judge model-level visibility changes.</p></article>
                </div>
              </section>
            ) : null}

            <section className="priorityExperience">
              <div className="resultSectionHead">
                <span>Your priority action plan</span>
                <h2>Fix these first.</h2>
                <p>These are ranked from the actual findings in this scan, with evidence, implementation guidance and a verification step.</p>
              </div>
              {result.opportunities.length ? (
                <div className="priorityResultGrid">
                  {result.opportunities.slice(0,3).map((item,index)=>(
                    <article className="priorityResultCard" key={item.title}>
                      <div className="priorityResultTop">
                        <span className="priorityResultNumber">{String(index+1).padStart(2,"0")}</span>
                        <div>
                          <span>{item.impact} impact</span>
                          {item.effort ? <span>{item.effort} effort</span> : null}
                        </div>
                      </div>
                      <h3>{item.title}</h3>
                      {item.evidence ? <div className="resultDetail"><span>What we observed</span><p>{item.evidence}</p></div> : null}
                      {item.problem ? <div className="resultDetail"><span>Why this matters</span><p>{item.problem}</p></div> : null}
                      <div className="resultDetail resultDetailAction"><span>What to do</span><p>{item.action}</p></div>
                      {item.expectedImpact ? <div className="resultDetail"><span>Expected business impact</span><p>{item.expectedImpact}</p></div> : null}
                      {item.implementation?.length ? (
                        <details className="implementationDetails">
                          <summary>Show implementation instructions</summary>
                          <ol>{item.implementation.map((step,stepIndex)=><li key={stepIndex}>{step}</li>)}</ol>
                        </details>
                      ) : null}
                      {item.verify ? <div className="resultVerify"><span>Verify fix</span><p>{item.verify}</p></div> : null}
                    </article>
                  ))}
                </div>
              ) : <p className="allGood">No fundamental readiness warnings were found.</p>}
            </section>

            <details className="technicalResults">
              <summary>
                <div>
                  <span>Technical evidence</span>
                  <strong>See every signal checked in this scan</strong>
                </div>
                <b>{result.checks.length} checks</b>
              </summary>
              <div className="technicalResultList">
                {result.checks.map((check)=>(
                  <div className="technicalResultItem" key={check.label}>
                    <i className={check.status === "good" ? "techGood" : "techWarn"} />
                    <div>
                      <strong>{check.label}</strong>
                      {check.evidence ? <p>{check.evidence}</p> : null}
                      <small>{check.detail}</small>
                    </div>
                  </div>
                ))}
              </div>
            </details>

            {result.expectedOutcome ? (
              <div className="nextStepBand">
                <div>
                  <span>What happens next</span>
                  <strong>{result.expectedOutcome}</strong>
                </div>
                <a onClick={() => void trackEvent("signup_clicked", { leadId: result.leadId })} href={`/signup?lead=${encodeURIComponent(result.leadId)}`}>Save report, re-scan & track improvement →</a>
              </div>
            ) : null}
          </section>
        )}

        {!result && !showGate && (
          <div className="productStage productStageLegacy">
            <div className="productGlow" />
            <div className="productWindow">
              <div className="windowBar">
                <div className="traffic"><i/><i/><i/></div>
                <span>acme.com / intelligence overview</span>
                <div className="windowLive"><b/> Example workspace</div>
              </div>

              <div className="productApp">
                <aside className="productSidebar">
                  <div className="sideBrand"><span className="brandMark small">S</span>SeekSignal</div>
                  <div className="projectPicker"><small>Project</small><strong>Acme</strong><span>⌄</span></div>
                  <nav aria-label="Example workspace navigation">
                    <span className="active">Overview</span>
                    <span>AI visibility</span>
                    <span>Website readiness</span>
                    <span>Competitors</span>
                    <span>Opportunities</span>
                    <span>Reports</span>
                  </nav>
                  <div className="sideFooter"><span>Example monitoring</span><b>●</b></div>
                </aside>

                <div className="productMain">
                  <div className="productHeader">
                    <div>
                      <span>Overview</span>
                      <h3>Your visibility across AI discovery.</h3>
                    </div>
                    <span className="demoFilter">Last 30 days⌄</span>
                  </div>

                  <div className="heroMetrics">
                    <article>
                      <span>Visibility score</span>
                      <strong>68</strong>
                      <small>↑ 12 this month</small>
                    </article>
                    <article>
                      <span>Recommendation share</span>
                      <strong>24%</strong>
                      <small>↑ 6.4 pts</small>
                    </article>
                    <article>
                      <span>Tracked answers</span>
                      <strong>184</strong>
                      <small>Across 4 providers</small>
                    </article>
                  </div>

                  <div className="intelligenceGrid">
                    <section className="trendPanel">
                      <div className="panelTitle">
                        <div><span>Visibility trend</span><strong>+18.4%</strong></div>
                        <small>May — Sep</small>
                      </div>
                      <div className="chart">
                        <div className="gridLines"><i/><i/><i/><i/></div>
                        <svg viewBox="0 0 620 210" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="currentColor" stopOpacity=".18"/>
                              <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <path d="M0,180 C55,164 86,173 122,150 S184,157 222,121 S292,137 332,94 S404,108 447,67 S540,88 620,26 L620,210 L0,210Z" fill="url(#fill)"/>
                          <path d="M0,180 C55,164 86,173 122,150 S184,157 222,121 S292,137 332,94 S404,108 447,67 S540,88 620,26" fill="none" stroke="currentColor" strokeWidth="3"/>
                        </svg>
                        <div className="axis"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span></div>
                      </div>
                    </section>

                    <section className="sharePanel">
                      <div className="panelTitle"><div><span>Recommendation share</span><strong>24%</strong></div><small>vs tracked competitors</small></div>
                      <div className="shareBody">
                        <div className="donut"><span>24<small>%</small></span></div>
                        <div className="legend">
                          <div><i className="brandKey"/><span>Your brand</span><strong>24%</strong></div>
                          <div><i/><span>Competitor A</span><strong>31%</strong></div>
                          <div><i/><span>Competitor B</span><strong>18%</strong></div>
                          <div><i/><span>Other</span><strong>27%</strong></div>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="bottomGrid">
                    <section className="enginePanel">
                      <div className="panelTitle"><div><span>Engine coverage</span><strong>4 tracked</strong></div><small>Visibility score</small></div>
                      <div className="engineRows">
                        <div><span>OpenAI</span><b><i style={{width:"78%"}}/></b><strong>78</strong></div>
                        <div><span>Gemini</span><b><i style={{width:"64%"}}/></b><strong>64</strong></div>
                        <div><span>Perplexity</span><b><i style={{width:"58%"}}/></b><strong>58</strong></div>
                        <div><span>Claude</span><b><i style={{width:"42%"}}/></b><strong>42</strong></div>
                      </div>
                    </section>

                    <section className="actionsPanel">
                      <div className="panelTitle"><div><span>Next best actions</span><strong>7 open</strong></div><small>Prioritised by impact</small></div>
                      <div className="actionRows">
                        <div><i/><strong>Add service schema</strong><em>High</em></div>
                        <div><i/><strong>Strengthen entity signals</strong><em>High</em></div>
                        <div><i className="medium"/><strong>Answer buyer questions</strong><em>Medium</em></div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section id="methodology" className="methodologyStrip shell">
        <span>WHAT WE ACTUALLY MEASURE</span>
        <div>
          <article><b>01</b><strong>Observable evidence</strong><p>We inspect signals available from the submitted website rather than inventing a visibility score from unsupported assumptions.</p></article>
          <article><b>02</b><strong>Explainable findings</strong><p>Important findings include what was observed, why it matters, a practical action and a way to verify the fix.</p></article>
          <article><b>03</b><strong>Clear limits</strong><p>Website readiness is not the same as being recommended by ChatGPT, Gemini or another AI system. SeekSignal states that distinction explicitly.</p></article>
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
