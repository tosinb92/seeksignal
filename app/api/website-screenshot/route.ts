import { NextRequest, NextResponse } from "next/server";

function normaliseUrl(value: string) {
  const raw = value.trim();
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(candidate);
  if (!["http:","https:"].includes(url.protocol)) throw new Error("Invalid website URL.");
  return url.toString();
}

async function pageSpeedScreenshot(target: string) {
  const endpoint =
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=" +
    encodeURIComponent(target) +
    "&category=performance&strategy=desktop";

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) return null;

  const data = await response.json();
  const screenshot = data?.lighthouseResult?.audits?.["final-screenshot"]?.details?.data;
  if (typeof screenshot !== "string" || !screenshot.startsWith("data:image/")) return null;
  return screenshot;
}

async function microlinkScreenshot(target: string) {
  const endpoint =
    "https://api.microlink.io/?url=" +
    encodeURIComponent(target) +
    "&screenshot=true&meta=false&viewport.width=1200&viewport.height=900";

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) return null;

  const data = await response.json();
  const screenshotUrl = data?.data?.screenshot?.url;
  if (typeof screenshotUrl !== "string") return null;

  const imageResponse = await fetch(screenshotUrl, { cache: "no-store" });
  if (!imageResponse.ok) return null;

  const contentType = imageResponse.headers.get("content-type") || "image/png";
  const bytes = await imageResponse.arrayBuffer();
  return { bytes, contentType };
}

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url");
  if (!value) return new NextResponse("Missing url.", { status: 400 });

  try {
    const target = normaliseUrl(value);

    const pageSpeed = await pageSpeedScreenshot(target);
    if (pageSpeed) {
      const comma = pageSpeed.indexOf(",");
      const base64 = comma >= 0 ? pageSpeed.slice(comma + 1) : "";
      const mime = pageSpeed.slice(5, comma).split(";")[0] || "image/jpeg";
      const bytes = Buffer.from(base64, "base64");
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=900, s-maxage=3600"
        }
      });
    }

    const micro = await microlinkScreenshot(target);
    if (micro) {
      return new NextResponse(micro.bytes, {
        status: 200,
        headers: {
          "Content-Type": micro.contentType,
          "Cache-Control": "public, max-age=900, s-maxage=3600"
        }
      });
    }

    return NextResponse.redirect(
      `https://image.thum.io/get/width/1200/crop/900/noanimate/${target}`,
      302
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not capture website." },
      { status: 400 }
    );
  }
}
