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
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="navActions">
          <a className="loginLink" href="/login">Sign in</a>
          <a className="navCta" href="#scan">Get started <span>→</span></a>
        </div>
      </header>

      <section className="hero shell heroCover">
        <img className="heroCoverImage" src="/assets/homepage/AI%20Visibility%20Workspace%20at%20Sunset.png" alt="Premium SeekSignal workspace showing AI visibility intelligence on a laptop." />
        <div className="heroCoverOverlay" />
        <div className="heroCoverContent">
          <div className="heroBadge"><span /> AI visibility intelligence</div>
          <h1>Know if AI can <em>find, understand & recommend you.</em></h1>
          <p className="heroCopy">
            See exactly how visible your business is across AI discovery — and what to fix before you spend more on SEO, content or optimisation.
          </p>
          <form id="scan" className="heroScanForm" onSubmit={startAudit}>
            <div className="heroScanInput">
              <span aria-hidden="true">↗</span>
              <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="Enter your website (e.g. yourbusiness.co.uk)" aria-label="Website address" required />
            </div>
            <button type="submit">Analyse my website <span>→</span></button>
          </form>
          <div className="heroMeta">
            <span>Free scan</span><i />
            <span>No credit card required</span><i />
            <span>Results in minutes</span>
          </div>
        </div>
      </section>

      <section className="trustBar">
        <div className="shell trustInner">
          <span>Built for the AI discovery shift</span>
          <div><b>ChatGPT</b><b>Gemini</b><b>Perplexity</b><b>Claude</b><b>Search</b></div>
        </div>
      </section>

      <section className="uspBand">
        <div className="shell uspInner">
          <span className="uspLabel">Why SeekSignal</span>
          <h2>Most tools tell you what to optimise. <em>SeekSignal tells you whether you're actually being found.</em></h2>
          <div className="uspColumns">
            <div><strong>01</strong><b>Understand</b><span>See what your website tells machines about who you are and what you do.</span></div>
            <div><strong>02</strong><b>Measure</b><span>Test whether AI systems actually surface your brand for relevant buyer questions.</span></div>
            <div><strong>03</strong><b>Compare</b><span>See which competitors appear instead and where the recommendation gap sits.</span></div>
            <div><strong>04</strong><b>Act</b><span>Turn the evidence into a short list of high-impact changes and re-test.</span></div>
          </div>
        </div>
      </section>

      <section className="howSection">
        <div className="shell">
          <div className="howHeader">
            <span>HOW IT WORKS</span>
            <h2>From <em>signal</em> to action.</h2>
            <p>One clear workflow. No complicated SEO dashboard to decipher.</p>
          </div>
          <div className="howGrid">
            <article className="howFeature">
              <img src="/assets/homepage/home--how-it-works--buyer-ai-journey--01.png" alt="AI buyer journey showing recommendation signals." />
              <div className="howOverlay" />
              <div className="howCopy"><span>01 / Discover</span><h3>See the recommendation gap.</h3><p>Understand what AI can infer about your business before you start changing anything.</p></div>
            </article>
            <article><span>02</span><h3>Measure visibility.</h3><p>Test real buyer questions and see whether your brand appears in AI answers.</p></article>
            <article><span>03</span><h3>See who wins instead.</h3><p>Compare your presence with the competitors being surfaced in the same buying journeys.</p></article>
            <article><span>04</span><h3>Fix & re-test.</h3><p>Prioritise the changes with the clearest commercial upside, then measure again.</p></article>
          </div>
        </div>
      </section>

      <section className="intelligenceSection">
        <div className="shell intelligenceGridNew">
          <div className="intelligenceCopy">
            <span>AI VISIBILITY MONITORING</span>
            <h2>Know what buyers see <em>before they choose.</em></h2>
            <p>AI discovery is becoming another route into the shortlist. SeekSignal turns that invisible layer into something you can measure and improve.</p>
            <div className="intelligencePoints">
              <div><b>01</b><strong>Recommendation share</strong><span>How often your brand appears in relevant AI answers.</span></div>
              <div><b>02</b><strong>Competitor presence</strong><span>Which brands are winning the same conversations.</span></div>
              <div><b>03</b><strong>Evidence-backed actions</strong><span>What to change and why it could improve discoverability.</span></div>
            </div>
          </div>
          <div className="intelligenceVisual">
            <img src="/assets/homepage/home--visibility-monitoring--ai-presence-timeline--01.png" alt="AI visibility timeline across multiple platforms." />
          </div>
        </div>
      </section>

      <section className="humanSection">
        <div className="shell humanGrid">
          <div className="humanVisual"><img src="/assets/homepage/home--methodology--human-ai-research--01.png" alt="Business professional researching with AI." /></div>
          <div className="humanCopy">
            <span>THE COMMERCIAL QUESTION</span>
            <h2>Before you spend more trying to get found, <em>find out where you stand.</em></h2>
            <p>SeekSignal is designed to sit before execution. Diagnose the visibility gap first, then decide whether the answer is better content, stronger authority, clearer entities, technical improvements — or something else.</p>
            <a href="#scan">Run the free diagnostic →</a>
          </div>
        </div>
      </section>

      <section className="proofBand">
        <div className="shell proofGrid">
          <div><strong>01</strong><span>Website readiness</span><p>Observable signals that shape how clearly machines understand your business.</p></div>
          <div><strong>02</strong><span>AI visibility</span><p>Controlled testing of whether relevant AI answers surface your brand.</p></div>
          <div><strong>03</strong><span>Competitive context</span><p>Understand who is appearing instead and where the gap is coming from.</p></div>
          <div><strong>04</strong><span>Prioritised action</span><p>A practical route from evidence to improvement and re-testing.</p></div>
        </div>
      </section>

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
                <WebsiteScreenshot url={result.url} />
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
                <h2>Don't just audit the website. Understand the visibility gap.</h2>
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
                  <article><span>What to do next</span><p>{result.opportunities.length ? "Complete the priority fixes below, publish them, then re-scan. Compare real model visibility after improving the website evidence." : "Test three real buyer questions against AI models, record whether your business and competitors appear, and inspect the cited sources. Repeat the same questions after any improvements."}</p></article>
                </div>
              </section>
            ) : null}

            <section className="priorityExperience">
              <div className="resultSectionHead">
                <span>Your priority action plan</span>
                <h2>Know what is costing you visibility — and fix that first.</h2>
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
