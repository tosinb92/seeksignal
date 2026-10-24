"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import LeadGate from "../components/LeadGate";
import { trackEvent } from "../lib/analytics/client";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGate, setShowGate] = useState(false);
  const [lead, setLead] = useState({ name: "", email: "", business: "" });

  function startAudit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Enter your website first.");
      return;
    }

    void trackEvent("audit_started", { metadata: { website: url.trim() } });
    setShowGate(true);
    // Bring the existing lead form into view immediately after the hero CTA.
    window.setTimeout(() => {
      document.getElementById("scan-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
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

      const report = { ...data, collectedAt: new Date().toISOString() };
      window.sessionStorage.setItem(`seeksignal:scan:${data.leadId}`, JSON.stringify(report));
      setShowGate(false);
      void trackEvent("audit_completed", { leadId: data.leadId, metadata: { score: data.score, website: data.url } });
      router.push(`/results/${encodeURIComponent(data.leadId)}`);
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

      <section className="hero shell heroCover" id="platform">
        <img className="heroCoverImage" src="/assets/homepage/AI%20Visibility%20Workspace%20at%20Sunset.png" alt="AI visibility workspace." />
        <div className="heroCoverOverlay" />
        <div className="heroCoverContent">
          <div className="heroBadge"><span /> AI visibility intelligence</div>
          <h1>Your competitors are getting recommended. <em>Find out why.</em></h1>
          <p className="heroCopy">Discover where your business is missing out across Google and AI search. See what competitors are doing better, get evidence-backed recommendations, and turn opportunities into measurable growth.</p>
          <form id="scan" className="heroScanForm" onSubmit={startAudit}>
            <div className="heroScanInput">
              <span aria-hidden="true">↗</span>
              <input type="url" value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="Enter your website, e.g. yourbusiness.co.uk" aria-label="Website address" required />
            </div>
            <button type="submit" disabled={loading}>Analyse my website <span>→</span></button>
          </form>
          <div className="heroMeta"><span>Free scan</span><i /><span>No credit card required</span><i /><span>Results in minutes</span></div>
          {error ? <div className="heroError" role="alert">{error}</div> : null}
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
          <h2>Most tools tell you what to optimise. <em>SeekSignal shows whether those changes are actually making you visible.</em></h2>
          <div className="uspColumns">
            <div><strong>01</strong><b>Understand</b><span>See how clearly AI can understand your business and the signals your website is sending.</span></div>
            <div><strong>02</strong><b>Measure</b><span>Test real buyer questions and measure whether your brand is actually being surfaced.</span></div>
            <div><strong>03</strong><b>Compare</b><span>See which competitors appear instead, how often they win, and where the gap sits.</span></div>
            <div><strong>04</strong><b>Act</b><span>Turn the evidence into prioritised actions, make the changes, and re-test the result.</span></div>
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

      <section className="intelligenceSection" id="intelligence">
        <div className="shell intelligenceGridNew">
          <div className="intelligenceCopy">
            <span>AI VISIBILITY MONITORING</span>
            <h2>Know what buyers see <em>before they choose you.</em></h2>
            <p>AI discovery is another route into the shortlist. SeekSignal turns that invisible layer into something you can measure, understand and improve.</p>
            <div className="intelligencePoints">
              <div><b>01</b><strong>Recommendation share</strong><span>How often your brand appears for relevant buyer questions.</span></div>
              <div><b>02</b><strong>Competitor presence</strong><span>Which competitors are winning the same conversations.</span></div>
              <div><b>03</b><strong>Evidence-backed actions</strong><span>What to change, why it matters, and how to verify the improvement.</span></div>
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
            <h2>Before you spend more trying to get found, <em>find out what is holding you back.</em></h2>
            <p>SeekSignal sits before execution. Diagnose the visibility gap first, then decide what deserves your budget — content, authority, entity clarity, technical improvements or something else.</p>
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

        {showGate && (
          <div id="scan-details">
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
          </div>
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
          <h2>Find your visibility gap. Then prove you're improving it.</h2>
          <p>Start with a free diagnostic. Pro turns the snapshot into an ongoing visibility loop: track buyer questions, compare competitors, prioritise fixes, re-test changes and monitor the result.</p>
        </div>
        <div className="pricingGrid">
          <article className="pricingCard">
            <div>
              <span className="pricingLabel">FREE</span>
              <h3>Free visibility snapshot</h3>
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
              <h3>AI visibility control centre</h3>
              <div className="price"><strong>£49</strong><small>/ month</small></div>
              <p>Track whether AI actually surfaces your business — and whether your visibility improves after you make changes.</p>
            </div>
            <ul>
              <li>Everything in the free snapshot</li>
              <li>Buyer-question visibility testing</li>
              <li>OpenAI, Claude, Gemini & Perplexity coverage</li>
              <li>Competitor visibility and saved reports</li>
              <li>Re-tests and ongoing monitoring</li>
            </ul>
            <a href="/signup">Start with a free diagnostic →</a>
            <small className="pricingFine">Cancel through Stripe billing. AI tests are subject to usage limits.</small>
          </article>
        </div>
      </section>

      <section className="minimalProof shell">
        <span>THE QUESTION IS SIMPLE</span>
        <h2>If a buyer asked AI for a business like yours today, <em>would you know whether you'd be in the answer?</em></h2>
        <a href="#scan">Find out now →</a>
      </section>

      <footer className="footer shell">
        <div className="brand"><span className="brandMark">S</span><span>SeekSignal</span></div>
        <span>Find. Fix. Prove your AI visibility.</span>
        <div><a href="/experiment">The SeekSignal Experiment</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/login">Sign in</a><a href="/signup">Create account</a></div>
      </footer>
    </main>
  );
}
