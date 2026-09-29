import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const store = await cookies();
  store.delete("ss_access_token");
  store.delete("ss_refresh_token");
  return NextResponse.json({ ok: true });
}
