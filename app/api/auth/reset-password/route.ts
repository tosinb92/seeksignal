import { NextResponse } from "next/server";
import { supabaseRest } from "../../../../lib/supabase/rest";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!accessToken) {
    return NextResponse.json({ error: "The recovery link is missing or has expired." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Use a password of at least 8 characters." }, { status: 400 });
  }

  const response = await supabaseRest(
    "/auth/v1/user",
    {
      method: "PUT",
      body: JSON.stringify({ password })
    },
    accessToken
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.msg || data?.message || "Could not update the password." },
      { status: response.status }
    );
  }

  return NextResponse.json({ ok: true });
}
