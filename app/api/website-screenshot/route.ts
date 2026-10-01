import { NextRequest, NextResponse } from "next/server";

function normaliseUrl(value: string) {
  const raw = value.trim();
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(candidate);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid website URL.");
  url.hash = "";
  return url.toString();
}

function alternateHost(target: string) {
  const url = new URL(target);
  const host = url.hostname.toLowerCase();
  if (host.startsWith("www.")) {
    url.hostname = host.slice(4);
  } else {
    url.hostname = `www.${host}`;
  }
  return url.toString();
}

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url");
  if (!value) return new NextResponse("Missing url.", { status: 400 });

  try {
    const target = normaliseUrl(value);
    const alternate = alternateHost(target);

    // WordPress mShots is deliberately used as the primary screenshot
    // renderer. SeekSignal must not proxy the customer's site through its
    // own serverless runtime just to display a visual preview.
    const screenshotUrl =
      "https://s.wordpress.com/mshots/v1/" +
      encodeURIComponent(target) +
      "?w=1400";

    const alternateScreenshotUrl =
      "https://s.wordpress.com/mshots/v1/" +
      encodeURIComponent(alternate) +
      "?w=1400";

    // The image itself is remote-rendered; the browser can load it directly.
    // Return the primary renderer URL and keep the alternate available as a
    // query-level fallback for domains whose www/apex host differs.
    return NextResponse.redirect(screenshotUrl, 302);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not capture website." },
      { status: 400 }
    );
  }
}
