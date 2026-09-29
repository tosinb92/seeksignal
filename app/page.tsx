"use client";

import { FormEvent, useState } from "react";
import LeadGate from "../components/LeadGate";

type Result = {
  score: number;
  url: string;
  summary: string;
  methodology: string;
  checks: { label: string; status: "good" | "warn"; detail: string }[];
  categories: { name: string; score: number }[];
  opportunities: { title: string; action: string; impact: string }[];
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#"><span className="mark">S</span>SeekSignal</a>
        <div className="navlinks">
          <a href="#how">How it works</a>
          <a href="#platform">Platform</a>
          <a href="#pricing">Pricing</a>
        </div>
        <a className="navCta" href="#scan">Run free scan</a>
      </nav>

      <section className="hero shell">
        <div className="eyebrow"><span /> AI visibility intelligence</div>
        <h1>Know whether AI can <em>find, understand and recommend</em> your business.</h1>
        <p className="lede">See how prepared your website is for discovery across ChatGPT and other AI answer engines — then get a clear plan to improve it.</p>

        <form id="scan" className="scan" onSubmit={startAudit}>
          <div className="inputWrap">
            <span>↗</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your website — example.com"
              required
            />
          </div>
          <button>Run free AI visibility scan</button>
        </form>
        <p className="micro">No card required · Results in seconds · Website-readiness scan</p>
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
                <div className="label">AI readiness score</div>
                <h2>{result.url}</h2>
              </div>
              <div className="score">{result.score}<span>/100</span></div>
            </div>
            <p className="resultSummary">{result.summary}</p>
            <div className="categoryGrid">
              {result.categories.map((category) => (
                <div className="category" key={category.name}>
                  <div><span>{category.name}</span><strong>{category.score}</strong></div>
                  <div className="bar"><i style={{ width: `${category.score}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="resultColumns">
              <div>
                <div className="resultSectionTitle">Signals checked</div>
                <div className="checks">
                  {result.checks.map((c) => (
                    <div className="check" key={c.label}>
                      <div className={c.status === "good" ? "dot good" : "dot warn"} />
                      <div><strong>{c.label}</strong><p>{c.detail}</p></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="opportunities">
                <div className="resultSectionTitle">Priority opportunities</div>
                {result.opportunities.length ? result.opportunities.map((o) => (
                  <div className="opportunity" key={o.title}>
                    <div><strong>{o.title}</strong><em>{o.impact} impact</em></div>
                    <p>{o.action}</p>
                  </div>
                )) : <p className="allGood">No fundamental issues found. Move on to live AI visibility monitoring and competitor benchmarking.</p>}
              </div>
            </div>
            <div className="methodology"><strong>What this score means</strong><span>{result.methodology}</span></div>
          </section>
        )}

        {!result && !showGate && (
          <div className="productFrame" id="platform">
            <div className="frameBar">
              <div className="traffic"><i/><i/><i/></div>
              <span>seeksignal / overview</span>
              <div className="live"><b/> Live intelligence</div>
            </div>
            <div className="dash">
              <aside>
                <div className="sideBrand"><span className="mark small">S</span>SeekSignal</div>
                <div className="sideItem active">Overview</div>
                <div className="sideItem">AI mentions</div>
                <div className="sideItem">Competitors</div>
                <div className="sideItem">Website readiness</div>
                <div className="sideItem">Opportunities</div>
              </aside>
              <div className="dashMain">
                <div className="dashHead"><div><span>Overview</span><h3>Your AI visibility, in one view.</h3></div><button>Last 30 days⌄</button></div>
                <div className="metrics">
                  <div className="metric"><span>AI Visibility</span><strong>68</strong><small>↑ 12 this month</small></div>
                  <div className="metric"><span>Recommendation share</span><strong>24%</strong><small>↑ 6.4%</small></div>
                  <div className="metric"><span>AI mentions</span><strong>37</strong><small>Across tracked answers</small></div>
                  <div className="metric accentMetric"><span>Competitors ahead</span><strong>3</strong><small>7 tracked competitors</small></div>
                </div>
                <div className="lowerGrid">
                  <div className="chartCard"><span>Visibility trend</span><div className="chart"><svg viewBox="0 0 500 150" preserveAspectRatio="none"><path d="M0,125 C55,105 60,120 105,96 S170,110 210,70 S285,82 330,52 S410,70 500,20" fill="none" stroke="currentColor" strokeWidth="3"/></svg></div><div className="axis"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span></div></div>
                  <div className="engineCard"><div className="oppHead"><span>AI engine coverage</span><b>5 engines</b></div><div className="engine"><span>ChatGPT</span><div><i style={{width:"78%"}}/></div><strong>78</strong></div><div className="engine"><span>Google AI</span><div><i style={{width:"64%"}}/></div><strong>64</strong></div><div className="engine"><span>Perplexity</span><div><i style={{width:"58%"}}/></div><strong>58</strong></div><div className="engine"><span>Copilot</span><div><i style={{width:"42%"}}/></div><strong>42</strong></div></div>
                </div>
                <div className="workspaceStrip">
                  <div className="tabs"><b>Opportunities</b><span>Issues</span><span>Competitors</span><span>Monitoring</span></div>
                  <div className="workRows"><div><i className="high"/><strong>Add product & service schema</strong><span>Structured data</span><em>High impact</em></div><div><i/><strong>Build answer coverage for buyer questions</strong><span>Content</span><em>Medium</em></div><div><i/><strong>Strengthen organization identity signals</strong><span>Entity clarity</span><em>Medium</em></div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="proof shell">
        <span>Built for the new search journey</span>
        <div className="logos"><b>ChatGPT</b><b>Google AI</b><b>Perplexity</b><b>Copilot</b><b>Claude</b></div>
      </section>

      <section className="section shell" id="how">
        <div className="sectionEyebrow">From visibility to action</div>
        <h2>Don’t just track mentions.<br/>Know what to fix next.</h2>
        <div className="steps">
          <article><span>01</span><h3>Scan</h3><p>Audit the signals AI systems use to understand your business, products and authority.</p></article>
          <article><span>02</span><h3>Benchmark</h3><p>Compare visibility, recommendation share and coverage against the competitors buyers also see.</p></article>
          <article><span>03</span><h3>Improve</h3><p>Turn findings into prioritized, commercially useful actions — not another dashboard full of noise.</p></article>
        </div>
      </section>

      <section className="ctaBand shell" id="pricing">
        <div><span>Start with a free scan</span><h2>Find the gaps before your competitors do.</h2></div>
        <a href="#scan">Scan my website →</a>
      </section>

      <footer className="shell"><div className="brand"><span className="mark">S</span>SeekSignal</div><span>AI visibility intelligence.</span></footer>
    </main>
  );
}
