"use client";

import { FormEvent, useState } from "react";

type Result = {
  score: number;
  url: string;
  checks: { label: string; status: "good" | "warn"; detail: string }[];
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function runAudit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setResult(data);
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

        <form id="scan" className="scan" onSubmit={runAudit}>
          <div className="inputWrap">
            <span>↗</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your website — example.com"
              required
            />
          </div>
          <button disabled={loading}>{loading ? "Scanning…" : "Run free AI visibility scan"}</button>
        </form>
        <p className="micro">No card required · Results in seconds · Website-readiness scan</p>
        {error && <div className="error">{error}</div>}

        {result && (
          <section className="resultCard">
            <div className="resultTop">
              <div>
                <div className="label">AI readiness score</div>
                <h2>{result.url}</h2>
              </div>
              <div className="score">{result.score}<span>/100</span></div>
            </div>
            <div className="checks">
              {result.checks.map((c) => (
                <div className="check" key={c.label}>
                  <div className={c.status === "good" ? "dot good" : "dot warn"} />
                  <div><strong>{c.label}</strong><p>{c.detail}</p></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!result && (
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
                  <div className="metric"><span>Citations found</span><strong>37</strong><small>Across answer engines</small></div>
                </div>
                <div className="lowerGrid">
                  <div className="chartCard"><span>Visibility trend</span><div className="chart"><svg viewBox="0 0 500 150" preserveAspectRatio="none"><path d="M0,125 C55,105 60,120 105,96 S170,110 210,70 S285,82 330,52 S410,70 500,20" fill="none" stroke="currentColor" strokeWidth="3"/></svg></div><div className="axis"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span></div></div>
                  <div className="oppCard"><div className="oppHead"><span>Top opportunities</span><b>7 open</b></div><div className="opp"><i className="high"/>Add product schema <em>High impact</em></div><div className="opp"><i/>Strengthen entity signals <em>Medium</em></div><div className="opp"><i/>Answer 6 buyer questions <em>Medium</em></div></div>
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
