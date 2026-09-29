import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseRest } from "../../../../lib/supabase/rest";

export async function POST(request: Request) {
  const body = await request.json();
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const response = await supabaseRest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) {
    return NextResponse.json({ error: data?.error_description || data?.msg || "Invalid email or password." }, { status: 401 });
  }

  const store = await cookies();
  store.set("ss_access_token", data.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Number(data.expires_in || 3600))
  });
  if (data?.refresh_token) {
    store.set("ss_refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return NextResponse.json({ ok: true });
}
