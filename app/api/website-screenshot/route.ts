import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url");
  if (!value) return NextResponse.json({ error: "Missing website." }, { status: 400 });
  try {
    const raw = value.trim();
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid public website.");
    if (url.port && !["80", "443"].includes(url.port)) throw new Error("Invalid web port.");
    if (/^(localhost|127\.|0\.|10\.|192\.168\.|\[::1\])/i.test(url.hostname) || url.hostname.endsWith(".local")) throw new Error("Invalid public website.");
    url.hash = "";
    const endpoint = new URL("https://api.microlink.io/");
    endpoint.searchParams.set("url", url.toString());
    endpoint.searchParams.set("screenshot", "true");
    endpoint.searchParams.set("meta", "false");
    endpoint.searchParams.set("embed", "screenshot.url");
    // This renderer returns an actual image or an error, never a successful
    // WordPress 'Generating Preview' placeholder masquerading as a screenshot.
    return NextResponse.redirect(endpoint, 302);
  } catch {
    return NextResponse.json({ error: "Could not capture this website." }, { status: 400 });
  }
}
