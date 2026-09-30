"use client";

function getSessionId() {
  if (typeof window === "undefined") return "";
  const key = "seeksignalSessionId";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

export async function trackEvent(
  eventName: string,
  options: { leadId?: string; projectId?: string; metadata?: Record<string, unknown> } = {}
) {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        eventName,
        sessionId: getSessionId(),
        path: window.location.pathname,
        leadId: options.leadId,
        projectId: options.projectId,
        metadata: options.metadata || {}
      })
    });
  } catch {
    // Analytics must never interrupt the product flow.
  }
}
