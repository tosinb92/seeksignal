"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "../lib/analytics/client";

export default function RunProjectScanButton({ projectId, className, label = "Run scan" }: { projectId: string; className?: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!projectId || loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/projects/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Could not run scan.");
      void trackEvent("project_scan_completed", { projectId, metadata: { score: data.score } });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run scan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{display:"inline-block",maxWidth:"100%"}}>
      <button className={className} onClick={run} disabled={loading || !projectId}>
        {loading ? "Analysing website…" : label}
      </button>

      {loading ? (
        <div style={{
          marginTop:12,
          width:"min(420px,80vw)",
          padding:16,
          border:"1px solid rgba(196,248,115,.14)",
          borderRadius:14,
          background:"linear-gradient(180deg,#111613,#0c100e)",
          boxShadow:"0 18px 50px rgba(0,0,0,.22)",
          textAlign:"left"
        }}>
          <strong style={{display:"block",fontSize:12,color:"#f2f6f1"}}>Analysing the live website</strong>
          <p style={{margin:"6px 0 12px",fontSize:10,lineHeight:1.5,color:"#8f9992"}}>
            SeekSignal is reading the page and checking the same observable signals used in your readiness score.
          </p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px 12px",fontSize:9,color:"#aeb7b0"}}>
            <span>✓ Page title & heading</span>
            <span>✓ Structured data</span>
            <span>✓ Indexability</span>
            <span>✓ Buyer-question coverage</span>
            <span>✓ Trust signals</span>
            <span>✓ Commercial clarity</span>
          </div>
          <small style={{display:"block",marginTop:12,color:"#657069"}}>
            This scan measures website readiness. It does not claim an AI platform currently recommends the business.
          </small>
        </div>
      ) : null}

      {error ? <small style={{display:"block",marginTop:8,color:"#ff9c9c"}}>{error}</small> : null}
    </div>
  );
}
