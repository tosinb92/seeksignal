"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VisibilityResult = {
  methodology: string;
  visibilityScore: number;
  recommendationShare: number;
  mentionCount: number;
  recommendationCount: number;
  citationCount: number;
  successfulTests: number;
  totalTests: number;
  results: Array<{
    engine: string;
    model: string;
    prompt: string;
    ok: boolean;
    brandMentioned: boolean;
    recommendationDetected: boolean;
    competitorsMentioned: Array<{ name: string }>;
    citations: unknown[];
    excerpt: string;
    error?: string;
  }>;
};

export default function RunVisibilityTest({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VisibilityResult | null>(null);

  async function run() {
    if (!accepted || loading) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/visibility/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, acceptUsageCosts: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not run AI visibility test.");
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run AI visibility test.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="ai-visibility" style={{marginTop:24,padding:24,border:"1px solid rgba(255,255,255,.075)",borderRadius:17,background:"linear-gradient(180deg,#0f1313,#0c1010)"}}>
      <div style={{display:"grid",gridTemplateColumns:"1.2fr .8fr",gap:24,alignItems:"start"}}>
        <div>
          <span style={{color:"#c4f873",fontSize:8,textTransform:"uppercase",letterSpacing:1.1}}>AI visibility test</span>
          <h2 style={{margin:"8px 0 10px",fontSize:27,letterSpacing:"-1px"}}>Test whether leading AI models surface your brand.</h2>
          <p style={{margin:0,color:"#77817a",fontSize:11,lineHeight:1.7,maxWidth:680}}>
            SeekSignal asks two neutral, category-led buyer questions across OpenAI, Claude, Gemini and Perplexity, then records brand mentions, recommendations, competitor mentions and citations.
          </p>
        </div>
        <div style={{padding:16,border:"1px solid rgba(196,248,115,.12)",borderRadius:13,background:"rgba(196,248,115,.04)"}}>
          <strong style={{display:"block",fontSize:10}}>8 model calls maximum per run</strong>
          <span style={{display:"block",marginTop:6,color:"#77817a",fontSize:9,lineHeight:1.5}}>This is provider-model API evidence. Consumer app answers may differ.</span>
        </div>
      </div>

      <label style={{display:"flex",gap:10,alignItems:"flex-start",marginTop:20,color:"#a5aea7",fontSize:10,lineHeight:1.5,cursor:"pointer"}}>
        <input type="checkbox" checked={accepted} onChange={(e)=>setAccepted(e.target.checked)} style={{marginTop:2}} />
        <span>I understand this run uses metered Vercel AI Gateway model calls and may incur AI usage charges.</span>
      </label>

      <button onClick={run} disabled={!accepted || loading || !projectId} style={{
        marginTop:14,height:42,padding:"0 16px",border:0,borderRadius:9,
        background:accepted?"#c4f873":"#2a2f2b",color:accepted?"#10150d":"#747b76",
        fontWeight:800,cursor:accepted&&!loading?"pointer":"not-allowed"
      }}>
        {loading ? "Running 8 AI tests…" : "Run AI visibility test →"}
      </button>

      {error ? <div style={{marginTop:14,padding:12,borderRadius:9,background:"rgba(255,90,90,.07)",color:"#ffaaaa",fontSize:10}}>{error}</div> : null}

      {result ? (
        <div style={{marginTop:24}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>
            <article style={{padding:16,border:"1px solid rgba(255,255,255,.07)",borderRadius:12}}><span style={{fontSize:8,color:"#6f7772"}}>VISIBILITY</span><strong style={{display:"block",fontSize:29,marginTop:8}}>{result.visibilityScore}%</strong></article>
            <article style={{padding:16,border:"1px solid rgba(255,255,255,.07)",borderRadius:12}}><span style={{fontSize:8,color:"#6f7772"}}>RECOMMENDATION SHARE</span><strong style={{display:"block",fontSize:29,marginTop:8}}>{result.recommendationShare}%</strong></article>
            <article style={{padding:16,border:"1px solid rgba(255,255,255,.07)",borderRadius:12}}><span style={{fontSize:8,color:"#6f7772"}}>BRAND MENTIONS</span><strong style={{display:"block",fontSize:29,marginTop:8}}>{result.mentionCount}</strong></article>
            <article style={{padding:16,border:"1px solid rgba(255,255,255,.07)",borderRadius:12}}><span style={{fontSize:8,color:"#6f7772"}}>SUCCESSFUL TESTS</span><strong style={{display:"block",fontSize:29,marginTop:8}}>{result.successfulTests}/{result.totalTests}</strong></article>
          </div>

          <div style={{display:"grid",marginTop:18}}>
            {result.results.map((item, index)=>(
              <div key={index} style={{padding:"14px 0",borderTop:"1px solid rgba(255,255,255,.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                  <strong style={{fontSize:10}}>{item.engine}</strong>
                  <span style={{fontSize:9,color:item.ok?(item.brandMentioned?"#c4f873":"#88908a"):"#ffaaaa"}}>
                    {!item.ok ? "Failed" : item.brandMentioned ? "Brand mentioned" : "Not mentioned"}
                  </span>
                </div>
                <p style={{margin:"6px 0 0",color:"#69736c",fontSize:9,lineHeight:1.55}}>{item.ok ? item.excerpt : item.error}</p>
              </div>
            ))}
          </div>
          <p style={{margin:"16px 0 0",color:"#59635c",fontSize:8,lineHeight:1.5}}>{result.methodology}</p>
        </div>
      ) : null}
    </section>
  );
}
