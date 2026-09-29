"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateReportButton({ projectId, disabled = false }: { projectId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    if (!projectId || disabled || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not generate report.");

      setMessage("Report generated.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not generate report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{textAlign:"right"}}>
      <button onClick={generate} disabled={disabled || loading} style={{
        height:40,padding:"0 15px",border:0,borderRadius:9,
        background: disabled ? "#2a2f2b" : "#c4f873",
        color: disabled ? "#777" : "#10150d",fontSize:9,fontWeight:800,cursor:disabled?"not-allowed":"pointer"
      }}>
        {loading ? "Generating…" : "Generate report"}
      </button>
      {message ? <small style={{display:"block",marginTop:6,color:"#8c968f"}}>{message}</small> : null}
    </div>
  );
}
