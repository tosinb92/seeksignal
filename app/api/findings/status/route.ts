import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "../../../../lib/auth/session";
import { supabaseRest } from "../../../../lib/supabase/rest";

const statuses = ["not_started", "ready_for_approval", "implemented", "measuring", "reviewed"] as const;
type WorkflowStatus = (typeof statuses)[number];

const transitions: Record<WorkflowStatus, WorkflowStatus[]> = {
  not_started: ["not_started", "ready_for_approval"],
  ready_for_approval: ["not_started", "ready_for_approval", "implemented"],
  implemented: ["ready_for_approval", "implemented", "measuring"],
  measuring: ["implemented", "measuring", "reviewed"],
  reviewed: ["measuring", "reviewed"]
};

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const cookieStore = await cookies();
  const token = cookieStore.get("ss_access_token")?.value;
  if (!token) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const findingId = typeof body?.findingId === "string" ? body.findingId : "";
  const nextStatus = typeof body?.status === "string" ? body.status : "";
  if (!findingId || !statuses.includes(nextStatus as WorkflowStatus)) {
    return NextResponse.json({ error: "Choose a valid action and status." }, { status: 400 });
  }

  const lookup = await supabaseRest(
    "/rest/v1/findings?select=id,workflow_status&id=eq." + encodeURIComponent(findingId) + "&limit=1",
    { method: "GET" },
    token
  );
  if (!lookup.ok) return NextResponse.json({ error: "Could not load this action." }, { status: lookup.status });
  const rows = await lookup.json();
  const finding = rows?.[0];
  if (!finding) return NextResponse.json({ error: "Action not found." }, { status: 404 });

  const currentStatus = statuses.includes(finding.workflow_status) ? finding.workflow_status as WorkflowStatus : "not_started";
  if (!transitions[currentStatus].includes(nextStatus as WorkflowStatus)) {
    return NextResponse.json({ error: "Move this action through the approval and measurement stages in order." }, { status: 400 });
  }

  const update = await supabaseRest(
    "/rest/v1/findings?id=eq." + encodeURIComponent(findingId),
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ workflow_status: nextStatus })
    },
    token
  );
  const updated = await update.json().catch(() => []);
  if (!update.ok) return NextResponse.json({ error: "You may not have permission to update this action." }, { status: update.status });
  return NextResponse.json({ ok: true, finding: Array.isArray(updated) ? updated[0] : updated });
}
