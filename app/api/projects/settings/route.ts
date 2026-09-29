import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "../../../../lib/auth/session";
import { supabaseRest } from "../../../../lib/supabase/rest";

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const store = await cookies();
  const token = store.get("ss_access_token")?.value;
  if (!token) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const domain = typeof body?.domain === "string" ? body.domain.trim() : "";
  const market = typeof body?.market === "string" ? body.market.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";

  if (!projectId || name.length < 2 || domain.length < 3) {
    return NextResponse.json({ error: "Business name and website are required." }, { status: 400 });
  }

  const res = await supabaseRest("/rest/v1/projects?id=eq." + encodeURIComponent(projectId), {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name, domain, market: market || null, category: category || null, updated_at: new Date().toISOString() })
  }, token);

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: data?.message || "Could not save project." }, { status: res.status });

  return NextResponse.json({ ok: true });
}
