import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseRest } from "../../../../lib/supabase/rest";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken : "";
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";

  if (!accessToken) {
    return NextResponse.json({ error: "Confirmation session missing." }, { status: 400 });
  }

  const userResponse = await supabaseRest("/auth/v1/user", { method: "GET" }, accessToken);
  if (!userResponse.ok) {
    return NextResponse.json({ error: "This confirmation link is invalid or has expired." }, { status: 401 });
  }

  const store = await cookies();
  store.set("ss_access_token", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60
  });

  if (refreshToken) {
    store.set("ss_refresh_token", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return NextResponse.json({ ok: true });
}
