"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run scan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className={className} onClick={run} disabled={loading || !projectId}>
        {loading ? "Scanning…" : label}
      </button>
      {error ? <small style={{display:"block",marginTop:8,color:"#ff9c9c"}}>{error}</small> : null}
    </div>
  );
}
