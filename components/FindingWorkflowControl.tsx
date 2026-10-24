"use client";

import { useState } from "react";

const options = [
  { value: "not_started", label: "Not started" },
  { value: "ready_for_approval", label: "Ready for approval" },
  { value: "implemented", label: "Implemented" },
  { value: "measuring", label: "Measuring" },
  { value: "reviewed", label: "Reviewed" }
];

export default function FindingWorkflowControl({ findingId, initialStatus }: { findingId?: string; initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus || "not_started");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function updateStatus(nextStatus: string) {
    if (!findingId || nextStatus === status || busy) return;
    const previous = status;
    setStatus(nextStatus);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/findings/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId, status: nextStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update this action.");
    } catch (error) {
      setStatus(previous);
      setMessage(error instanceof Error ? error.message : "Could not update this action.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="findingWorkflow">
      <label>
        <span>Growth plan status</span>
        <select aria-label="Growth plan status" value={status} disabled={!findingId || busy} onChange={(event) => void updateStatus(event.target.value)}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {status === "implemented" || status === "measuring" || status === "reviewed" ? (
        <small>Customer-reported progress. Re-scan the website to check whether the observed issue changed.</small>
      ) : null}
      {message ? <small role="alert">{message}</small> : null}
    </div>
  );
}
