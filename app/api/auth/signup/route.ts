import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseRest } from "../../../../lib/supabase/rest";

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return NextResponse.json(
      { error: "Enter your name, a valid email and a password of at least 8 characters." },
      { status: 400 }
    );
  }

  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/login?confirmed=1`;

  const response = await supabaseRest(
    `/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        data: { full_name: name }
      })
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.msg ||
      data?.message ||
      data?.error_description ||
      "Could not create account.";
    return NextResponse.json({ error: message }, { status: response.status });
  }

  if (data?.access_token) {
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
  }

  return NextResponse.json({
    ok: true,
    needsEmailConfirmation: !data?.access_token,
    message: data?.access_token
      ? "Account created."
      : "Account created. Check your email to confirm it, then sign in."
  });
}
