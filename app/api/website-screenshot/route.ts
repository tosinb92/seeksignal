import { NextRequest, NextResponse } from "next/server";
import { resolvePublicWebsiteUrl } from "../../../lib/audit/scanner";

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url");
  if (!value) return NextResponse.json({ error: "Missing website." }, { status: 400 });
  try {
    const url = await resolvePublicWebsiteUrl(value);
    url.hash = "";
    const endpoint = new URL("https://api.microlink.io/");
    endpoint.searchParams.set("url", url.toString());
    endpoint.searchParams.set("screenshot", "true");
    endpoint.searchParams.set("meta", "false");
    endpoint.searchParams.set("embed", "screenshot.url");
    return NextResponse.redirect(endpoint, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not capture this website.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
