import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dns from "node:dns/promises";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "../../../../lib/auth/session";
import { supabaseRest } from "../../../../lib/supabase/rest";

function isPrivate(ip: string) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    return p[0] === 10 || p[0] === 127 || (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168);
  }
  return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80");
}

async function normalizePublicUrl(raw: string) {
  const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid website URL.");

  const hostname = url.hostname.toLowerCase();
  if (["localhost", "0.0.0.0", "::1"].includes(hostname) || hostname.endsWith(".local")) {
    throw new Error("That website cannot be scanned.");
  }

  const [v4, v6] = await Promise.allSettled([dns.resolve4(hostname), dns.resolve6(hostname)]);
  const addresses = [
    ...(v4.status === "fulfilled" ? v4.value : []),
    ...(v6.status === "fulfilled" ? v6.value : [])
  ];
  if (!addresses.length || addresses.some(isPrivate)) throw new Error("We couldn't reach that website.");
  return url;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "Sign in again to continue." }, { status: 401 });

  const store = await cookies();
  const accessToken = store.get("ss_access_token")?.value;
  if (!accessToken) return NextResponse.json({ error: "Sign in again to continue." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  if (!projectId) return NextResponse.json({ error: "Project missing." }, { status: 400 });

  const projectResponse = await supabaseRest(
    `/rest/v1/projects?select=id,domain&limit=1&id=eq.${encodeURIComponent(projectId)}`,
    { method: "GET" },
    accessToken
  );
  const projects = projectResponse.ok ? await projectResponse.json() : [];
  const project = projects?.[0];
  if (!project?.domain) return NextResponse.json({ error: "Project website missing." }, { status: 404 });

  try {
    const url = await normalizePublicUrl(project.domain);
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "SeekSignal-Audit/1.0" },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);

    const html = (await response.text()).slice(0, 800000);
    const title = /<title[^>]*>[^<]{3,}<\/title>/i.test(html);
    const description = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{30,}/i.test(html) ||
      /<meta[^>]+content=["'][^"']{30,}["'][^>]+name=["']description["']/i.test(html);
    const h1 = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html);
    const schema = /application\/ld\+json/i.test(html) && /(Organization|LocalBusiness|Product|Service|Corporation)/i.test(html);
    const questions = /(FAQ|frequently asked|questions|how does|what is|who is)/i.test(html);
    const trust = /(about us|contact|privacy|terms|case stud|testimonial|review)/i.test(html);
    const commercial = /(pricing|price|buy|book|request a quote|get a quote|shop|services)/i.test(html);

    const checks = [
      ["Clear page title", title],
      ["Search description", description],
      ["Primary page heading", h1],
      ["Structured business data", schema],
      ["Question coverage", questions],
      ["Trust signals", trust],
      ["Commercial clarity", commercial]
    ] as const;

    const score = Math.round((checks.filter(([, ok]) => ok).length / checks.length) * 100);
    const summary = score >= 80
      ? "Strong website-readiness foundations."
      : score >= 55
        ? "Good foundations, with clear opportunities to strengthen AI-readiness."
        : "Important website-readiness signals need improvement.";

    const rawResult = {
      url: url.hostname,
      score,
      checks: checks.map(([label, ok]) => ({ label, status: ok ? "good" : "warn" })),
      methodology: "Website-readiness only. This does not claim an AI platform currently recommends the business."
    };

    const insert = await supabaseRest("/rest/v1/scans", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: randomUUID(),
        project_id: projectId,
        lead_id: null,
        scan_type: "website_readiness",
        score,
        summary,
        methodology: rawResult.methodology,
        raw_result: rawResult
      })
    }, accessToken);

    if (!insert.ok) {
      console.error("Saved scan insert failed", insert.status, await insert.text());
      return NextResponse.json({ error: "Scan completed but could not be saved." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, score, summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not complete the scan." },
      { status: 400 }
    );
  }
}
