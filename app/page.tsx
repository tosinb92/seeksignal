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
          <a href="#platform">Platform</a>
          <a href="#intelligence">Intelligence</a>
          <a href="#methodology">Methodology</a>
        </nav>

        <div className="navActions">
          <a className="loginLink" href="/login">Sign in</a>
          <a className="navCta" href="#scan">Run free audit</a>
        </div>
      </header>

      <section className="hero shell">
        <div className="heroBadge"><span /> AI discovery intelligence</div>
        <h1>
          See where AI sends your buyers
          <em> — and why it isn’t you.</em>
        </h1>
        <p className="heroCopy">
          Start with a real website-readiness audit, then use controlled AI-model tests to measure
          whether your brand is actually being surfaced, who appears instead, and what to improve next.
        </p>

        <form id="scan" className="scanBox" onSubmit={startAudit}>
          <div className="scanInput">
            <span className="scanIcon">↗</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your website — example.com"
              required
            />
          </div>
          <button>Run free AI readiness audit</button>
        </form>

        <div className="heroMeta">
          <span>No card required</span><i />
          <span>Results in seconds</span><i />
          <span>Website-readiness audit</span>
        </div>
        <div className="heroProof">
          <div><strong>4</strong><span>AI model providers in visibility tests</span></div>
          <div><strong>9</strong><span>Observable website signals checked</span></div>
          <div><strong>→</strong><span>Prioritised fixes, not vanity data</span></div>
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
          <section className="resultCard">
            <div className="resultTop">
              <div>
                <span className="resultLabel">AI readiness audit</span>
                <h2>{result.url}</h2>
              </div>
              <div className="score">{result.score}<span>/100</span></div>
            </div>

            <p className="resultSummary">{result.summary}</p>

            <div className="categoryGrid">
              {result.categories.map((category) => (
                <div className="category" key={category.name}>
                  <div>
                    <span>{category.name}</span>
                    <strong>{category.score}</strong>
                  </div>
                  <div className="bar"><i style={{ width: `${category.score}%` }} /></div>
                </div>
              ))}
            </div>

            <div className="resultColumns">
              <div>
                <div className="resultSectionTitle">What SeekSignal found</div>
                <div className="checks">
                  {result.checks.map((check) => (
                    <div className="check" key={check.label}>
                      <div className={check.status === "good" ? "dot good" : "dot warn"} />
                      <div>
                        <strong>{check.label}</strong>
                        {check.evidence ? <p className="evidenceLine"><b>Evidence:</b> {check.evidence}</p> : null}
                        <p>{check.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="opportunities">
                <div className="resultSectionTitle">Your prioritised action plan</div>
                {result.opportunities.length ? result.opportunities.map((item) => (
                  <div className="opportunity opportunityDetailed" key={item.title}>
                    <div className="opportunityHead">
                      <span className="opportunityRank">{String(item.rank || 1).padStart(2,"0")}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <div className="opportunityMeta">
                          <em>{item.impact} impact</em>
                          {item.effort ? <span>{item.effort} effort</span> : null}
                        </div>
                      </div>
                    </div>

                    {item.evidence ? (
                      <div className="actionBlock evidence">
                        <span>What we observed</span>
                        <p>{item.evidence}</p>
                      </div>
                    ) : null}

                    {item.problem ? (
                      <div className="actionBlock">
                        <span>Why this matters</span>
                        <p>{item.problem}</p>
                      </div>
                    ) : null}

                    <div className="actionBlock fix">
                      <span>What to change</span>
                      <p>{item.action}</p>
                    </div>

                    {item.implementation?.length ? (
                      <div className="actionBlock implementation">
                        <span>How to implement it</span>
                        <ol>
                          {item.implementation.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}
                        </ol>
                      </div>
                    ) : null}

                    {item.expectedImpact ? (
                      <div className="actionBlock impact">
                        <span>Expected impact</span>
                        <p>{item.expectedImpact}</p>
                      </div>
                    ) : null}

                    {item.benefit ? (
                      <div className="actionBlock benefit">
                        <span>Customer / website benefit</span>
                        <p>{item.benefit}</p>
                      </div>
                    ) : null}

                    {item.verify ? (
                      <div className="actionBlock verify">
                        <span>How to verify</span>
                        <p>{item.verify}</p>
                      </div>
                    ) : null}
                  </div>
                )) : (
                  <p className="allGood">
                    No fundamental issues found. Move on to live AI visibility monitoring and competitor benchmarking.
                  </p>
                )}
              </div>
            </div>

            {result.expectedOutcome ? (
              <div className="expectedOutcome">
                <span>What happens next</span>
                <strong>{result.expectedOutcome}</strong>
              </div>
            ) : null}

            <div className="resultActions">
              <div className="methodology">
                <strong>What this score means</strong>
                <span>{result.methodology}</span>
              </div>
              <a onClick={() => void trackEvent("signup_clicked", { leadId: result.leadId })} href={`/signup?lead=${encodeURIComponent(result.leadId)}`}>Create free workspace, save this report & re-test →</a>
            </div>
          </section>
        )}

        {!result && !showGate && (
          <div className="productStage" id="platform">
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

      <section className="engineStrip shell">
        <span>Designed for the new buying journey</span>
        <div className="engineBrands">
          <b><i className="brandIcon openai" aria-hidden="true" />OpenAI</b>
          <b><i className="brandIcon google" aria-hidden="true" />Google Gemini</b>
          <b><i className="brandIcon perplexity" aria-hidden="true" />Perplexity</b>
          <b className="plannedEngine"><i className="brandIcon copilot" aria-hidden="true" />Copilot <small>planned</small></b>
          <b><i className="brandIcon anthropic" aria-hidden="true" />Claude</b>
        </div>
      </section>

      <section className="lightBand">
        <div className="shell">
          <div className="howIntro">
            <span>How it works</span>
            <h2>Turn AI visibility into <em>real business growth.</em></h2>
            <p>SeekSignal turns scattered AI signals into a clear commercial workflow your team can understand and act on.</p>
          </div>

          <div className="howGrid">
            <article className="howPrimary">
              <div className="workflowPreview">
                <div className="promptBubble"><span>Buyer prompt</span><strong>“Which provider should I choose?”</strong></div>
                <div className="signalLine"><i/><span>Competitor recommended</span><b>Detected</b></div>
                <div className="signalLine"><i/><span>Your brand visibility</span><b>24%</b></div>
              </div>
              <small>01 / Monitor</small>
              <h3>See the recommendation gap.</h3>
              <p>Track where your brand appears, where competitors win, and the AI journeys creating the gap.</p>
            </article>
            <article>
              <i className="howIcon blue">▥</i><small>02</small><h3>Analyse</h3>
              <p>Benchmark recommendation share and identify the signals influencing visibility.</p>
            </article>
            <article>
              <i className="howIcon violet">◇</i><small>03</small><h3>Optimise</h3>
              <p>Turn evidence into prioritised fixes across authority, content and entity clarity.</p>
            </article>
            <article>
              <i className="howIcon coral">↗</i><small>04</small><h3>Verify & grow</h3>
              <p>Re-test the changes and measure whether visibility actually improves over time.</p>
            </article>
          </div>

          <div className="howActions">
            <a href="#scan">Run free audit →</a>
            <a className="textAction" href="#methodology">See the methodology →</a>
          </div>
        </div>
      </section>

      <section className="editorialSection shell" id="intelligence">
        <div className="sectionIntro">
          <span>01 / Intelligence</span>
          <h2>AI discovery is becoming a commercial channel. Treat it like one.</h2>
          <p>
            Search is changing from a list of links into a recommendation layer.
            SeekSignal gives your team a measurable way to see where you appear, where you do not,
            and what should change next.
          </p>
        </div>

        <div className="featureMosaic">
          <article className="featureLarge">
            <span>Visibility monitoring</span>
            <h3>Track whether your brand is actually showing up.</h3>
            <p>Monitor mentions, recommendation presence and citation patterns across the AI journeys your buyers use.</p>
            <div className="miniChart"><i/><i/><i/><i/><i/><i/><i/><i/></div>
          </article>

          <article className="featureCard light">
            <span>Competitor intelligence</span>
            <h3>See who AI recommends instead.</h3>
            <p>Compare your share of recommendation against the brands appearing in the same buying conversations.</p>
            <div className="rankList">
              <div><b>01</b><span>Competitor A</span><strong>31%</strong></div>
              <div className="you"><b>02</b><span>Your brand</span><strong>24%</strong></div>
              <div><b>03</b><span>Competitor B</span><strong>18%</strong></div>
            </div>
          </article>

          <article className="featureCard">
            <span>Opportunity engine</span>
            <h3>Know what to fix before you waste budget.</h3>
            <p>Translate weak signals into prioritised actions across entity clarity, content, trust and technical readiness.</p>
            <div className="priorityList">
              <div><i/>Structured data <em>High impact</em></div>
              <div><i/>Entity clarity <em>High impact</em></div>
              <div><i className="medium"/>Buyer questions <em>Medium</em></div>
            </div>
          </article>
        </div>
      </section>

      <section className="softSection" id="methodology">
        <div className="methodSection shell">
        <div className="methodLabel">02 / Methodology</div>
        <div className="methodCopy">
          <h2>Separate what can be measured from what can only be inferred.</h2>
          <p>
            SeekSignal keeps website AI-readiness separate from actual AI recommendation testing.
            A technically strong site does not automatically mean an AI platform recommends it — so we do not pretend it does.
          </p>
        </div>

        <div className="methodSteps">
          <article><span>01</span><strong>Readiness</strong><p>Audit whether your website clearly communicates entity, offer, authority and commercial intent.</p></article>
          <article><span>02</span><strong>Visibility</strong><p>Test representative buyer prompts across supported AI engines and record observable mentions and citations.</p></article>
          <article><span>03</span><strong>Action</strong><p>Prioritise the gaps most likely to improve clarity, discoverability and recommendation opportunity.</p></article>
        </div>
        </div>
      </section>

      <section className="conversionBand shell">
        <div>
          <span>Free diagnostic</span>
          <h2>Find out what AI can understand about your business today.</h2>
        </div>
        <a href="#scan">Run my free audit →</a>
      </section>

      <footer className="footer shell">
        <div className="brand"><span className="brandMark">S</span><span>SeekSignal</span></div>
        <span>AI discovery intelligence.</span>
        <div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/login">Sign in</a><a href="/signup">Create account</a></div>
      </footer>
    </main>
  );
}
