import { NextResponse } from "next/server";
import { supabaseRest } from "../../../../lib/supabase/rest";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/reset-password`;

  const response = await supabaseRest(
    `/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      method: "POST",
      body: JSON.stringify({ email })
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.msg || data?.message || "Could not send the recovery email.";
    return NextResponse.json({ error: message }, { status: response.status });
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, a recovery link has been sent."
  });
}
