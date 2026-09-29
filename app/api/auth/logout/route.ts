import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseRest } from "../../../../lib/supabase/rest";

export async function POST() {
  const store = await cookies();
  const accessToken = store.get("ss_access_token")?.value;

  if (accessToken) {
    await supabaseRest("/auth/v1/logout", { method: "POST" }, accessToken).catch(() => null);
  }

  store.delete("ss_access_token");
  store.delete("ss_refresh_token");

  return NextResponse.json({ ok: true });
}
