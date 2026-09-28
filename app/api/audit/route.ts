import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";

function isPrivate(ip: string) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    return p[0] === 10 || p[0] === 127 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168);
  }
  return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80");
}

async function safeUrl(raw: string) {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const u = new URL(withProtocol);
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only HTTP/HTTPS websites can be scanned.");
  if (["localhost", "0.0.0.0"].includes(u.hostname)) throw new Error("That address cannot be scanned.");
  const addresses = await dns.lookup(u.hostname, { all: true });
  if (!addresses.length || addresses.some((x) => isPrivate(x.address))) throw new Error("That address cannot be scanned.");
  return u;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.url || typeof body.url !== "string") return NextResponse.json({ error: "Enter a website first." }, { status: 400 });
    const u = await safeUrl(body.url.trim());

    const res = await fetch(u, {
      redirect: "manual",
      headers: { "User-Agent": "SeekSignal-Audit/1.0" },
      signal: AbortSignal.timeout(8000)
    });

    if (res.status >= 300 && res.status < 400) {
      return NextResponse.json({ error: "This website redirects. Enter its final website address and try again." }, { status: 400 });
    }
    if (!res.ok) return NextResponse.json({ error: `Website returned HTTP ${res.status}.` }, { status: 400 });

    const html = (await res.text()).slice(0, 800000);
    const hasTitle = /<title[^>]*>[^<]{3,}<\/title>/i.test(html);
    const hasDescription = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{30,}/i.test(html) || /<meta[^>]+content=["'][^"']{30,}["'][^>]+name=["']description["']/i.test(html);
    const hasH1 = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html);
    const hasSchema = /application\/ld\+json/i.test(html);
    const hasOrg = /(Organization|LocalBusiness|Product|Service|Corporation)/i.test(html);
    const hasFaq = /(FAQ|frequently asked|questions|how does|what is|who is)/i.test(html);
    const hasTrust = /(about us|contact|privacy|terms|case stud|testimonial|review)/i.test(html);
    const hasCommercial = /(pricing|price|buy|book|request a quote|get a quote|shop|services)/i.test(html);

    const items = [
      ["Clear page title", hasTitle, hasTitle ? "A descriptive title helps establish page topic and entity context." : "Add a descriptive, specific title to key pages."],
      ["Search description", hasDescription, hasDescription ? "A substantial meta description is present." : "Add unique meta descriptions that explain the business and offer."],
      ["Primary page heading", hasH1, hasH1 ? "A clear H1 is present." : "Add one strong H1 that states what this page is about."],
      ["Structured business data", hasSchema && hasOrg, hasSchema && hasOrg ? "Relevant structured data was detected." : "Add JSON-LD for your organization, services or products."],
      ["Question coverage", hasFaq, hasFaq ? "The site contains question-oriented content." : "Add direct answers to the questions buyers ask before choosing you."],
      ["Trust signals", hasTrust, hasTrust ? "Trust and company signals are visible." : "Strengthen about, contact, proof, policy and customer-evidence pages."],
      ["Commercial clarity", hasCommercial, hasCommercial ? "Commercial intent and next steps are visible." : "Make pricing, buying, booking or enquiry pathways more explicit."]
    ] as const;

    const passed = items.filter((x) => x[1]).length;
    const score = Math.round((passed / items.length) * 100);

    const checks = items.map(([label, ok, detail]) => ({ label, status: ok ? "good" as const : "warn" as const, detail }));
    const categories = [
      { name: "Entity clarity", score: Math.round(((Number(hasTitle) + Number(hasDescription) + Number(hasH1)) / 3) * 100) },
      { name: "Structured data", score: hasSchema && hasOrg ? 100 : hasSchema ? 55 : 20 },
      { name: "Answer coverage", score: hasFaq ? 82 : 35 },
      { name: "Trust & authority", score: hasTrust ? 78 : 32 },
      { name: "Commercial clarity", score: hasCommercial ? 88 : 30 }
    ];
    const opportunities = checks
      .filter((check) => check.status === "warn")
      .slice(0, 4)
      .map((check, index) => ({
        title: check.label,
        action: check.detail,
        impact: index < 2 ? "High" : "Medium"
      }));

    return NextResponse.json({
      url: u.hostname,
      score,
      checks,
      categories,
      opportunities,
      summary: score >= 80
        ? "Strong foundations. The next gains are likely to come from deeper answer coverage, authority and real AI-engine monitoring."
        : score >= 55
          ? "Good foundations, but several signals could make the business easier for AI systems to interpret and surface."
          : "Important website signals are missing or unclear. Fixing the fundamentals should come before ongoing AI visibility monitoring.",
      methodology: "This score measures observable website readiness signals. It does not claim that an AI platform currently recommends the business."
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to scan this website.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
