import { NextResponse } from "next/server";
import { supabaseRest } from "../../../lib/supabase/rest";

const ALLOWED = new Set([
  "page_view","audit_started","audit_completed","audit_failed","signup_clicked",
  "signup_completed","login_completed","onboarding_completed","project_scan_completed",
  "competitor_added","competitor_removed","ai_visibility_completed","report_generated"
]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const eventName = typeof body?.eventName === "string" ? body.eventName : "";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0,120) : "";
  const path = typeof body?.path === "string" ? body.path.slice(0,300) : null;
  const leadId = typeof body?.leadId === "string" ? body.leadId : null;
  const projectId = typeof body?.projectId === "string" ? body.projectId : null;
  const metadata = body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {};

  if (!ALLOWED.has(eventName) || sessionId.length < 8) {
    return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
  }

  const response = await supabaseRest("/rest/v1/product_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      event_name: eventName,
      session_id: sessionId,
      path,
      lead_id: leadId,
      project_id: projectId,
      metadata
    })
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
