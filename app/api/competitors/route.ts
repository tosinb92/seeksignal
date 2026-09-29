import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "../../../../lib/auth/session";
import { supabaseRest } from "../../../../lib/supabase/rest";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const store = await cookies();
  const token = store.get("ss_access_token")?.value;
  if (!token) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const domain = typeof body?.domain === "string" ? body.domain.trim() : "";

  if (!projectId || name.length < 2) {
    return NextResponse.json({ error: "Enter a competitor name." }, { status: 400 });
  }

  const res = await supabaseRest("/rest/v1/competitors", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ id: randomUUID(), project_id: projectId, name, domain: domain || null })
  }, token);

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: data?.message || "Could not add competitor." }, { status: res.status });

  return NextResponse.json({ ok: true, competitor: Array.isArray(data) ? data[0] : data });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const store = await cookies();
  const token = store.get("ss_access_token")?.value;
  if (!token) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Competitor missing." }, { status: 400 });

  const res = await supabaseRest("/rest/v1/competitors?id=eq." + encodeURIComponent(id), { method: "DELETE" }, token);
  if (!res.ok) return NextResponse.json({ error: "Could not remove competitor." }, { status: res.status });

  return NextResponse.json({ ok: true });
}
