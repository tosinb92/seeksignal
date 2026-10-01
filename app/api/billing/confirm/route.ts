import { NextResponse } from "next/server";
import { getCheckoutSession } from "../../../../lib/billing/stripe";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return NextResponse.redirect(new URL("/app?billing=missing", url.origin));

  try {
    const session = await getCheckoutSession(sessionId);
    const ok = session?.status === "complete" && Boolean(session?.subscription);
    return NextResponse.redirect(
      new URL(ok ? "/app?billing=success" : "/app?billing=pending", url.origin)
    );
  } catch {
    return NextResponse.redirect(new URL("/app?billing=error", url.origin));
  }
}
