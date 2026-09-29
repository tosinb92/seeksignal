import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { supabaseRest } from "../../../lib/supabase/rest";

function isPrivate(ip: string) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    return p[0] === 10 || p[0] === 127 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168);
  }
  return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80");
}

async function resolvePublicAddresses(hostname: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const [v4, v6] = await Promise.allSettled([
        dns.resolve4(hostname),
        dns.resolve6(hostname)
      ]);

      const addresses = [
        ...(v4.status === "fulfilled" ? v4.value : []),
        ...(v6.status === "fulfilled" ? v6.value : [])
      ];

      if (addresses.length) return addresses;

      const v4Reason = v4.status === "rejected" ? v4.reason : null;
      const v6Reason = v6.status === "rejected" ? v6.reason : null;
      lastError = v4Reason ?? v6Reason;
    } catch (error) {
      lastError = error;
    }

    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  const code =
    typeof lastError === "object" && lastError && "code" in lastError
      ? String((lastError as { code?: unknown }).code)
      : "";

  if (["ENOTFOUND", "ENODATA", "EAI_AGAIN", "EBUSY"].includes(code)) {
    throw new Error("We couldn't reach that domain. Check the website address and try again.");
  }

  throw new Error("We couldn't verify that website right now. Please try again in a moment.");
}

async function safeUrl(raw: string) {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const u = new URL(withProtocol);

  if (!["http:", "https:"].includes(u.protocol)) {
    throw new Error("Enter a normal website address beginning with http:// or https://.");
  }

  const hostname = u.hostname.toLowerCase();
  if (
    ["localhost", "0.0.0.0", "::1"].includes(hostname) ||
    hostname.endsWith(".local")
  ) {
    throw new Error("That address cannot be scanned.");
  }

  const addresses = await resolvePublicAddresses(hostname);
  if (addresses.some((address) => isPrivate(address))) {
    throw new Error("That address cannot be scanned.");
  }

  return u;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.url || typeof body.url !== "string") return NextResponse.json({ error: "Enter a website first." }, { status: 400 });
    if (!body?.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      return NextResponse.json({ error: "Enter your name to unlock the report." }, { status: 400 });
    }
    if (!body?.email || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      return NextResponse.json({ error: "Enter a valid work email to unlock the report." }, { status: 400 });
    }
    if (!body?.business || typeof body.business !== "string" || body.business.trim().length < 2) {
      return NextResponse.json({ error: "Enter your business name to unlock the report." }, { status: 400 });
    }
    const u = await safeUrl(body.url.trim());

    const leadId = randomUUID();
    const leadResponse = await supabaseRest("/rest/v1/leads", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: leadId,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        business_name: body.business.trim(),
        website: u.toString(),
        source: "free_scan"
      })
    });

    if (!leadResponse.ok) {
      console.error("Lead persistence failed", leadResponse.status, await leadResponse.text());
    }

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

    const summary = score >= 80
      ? "Strong foundations. The next gains are likely to come from deeper answer coverage, authority and real AI-engine monitoring."
      : score >= 55
        ? "Good foundations, but several signals could make the business easier for AI systems to interpret and surface."
        : "Important website signals are missing or unclear. Fixing the fundamentals should come before ongoing AI visibility monitoring.";

    const methodology = "This score measures observable website readiness signals. It does not claim that an AI platform currently recommends the business.";

    const resultPayload = {
      url: u.hostname,
      score,
      checks,
      categories,
      opportunities,
      summary,
      methodology
    };

    const scanResponse = await supabaseRest("/rest/v1/scans", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: randomUUID(),
        project_id: null,
        lead_id: leadId,
        scan_type: "website_readiness",
        score,
        summary,
        methodology,
        raw_result: resultPayload
      })
    });

    if (!scanResponse.ok) {
      console.error("Scan persistence failed", scanResponse.status, await scanResponse.text());
    }

    return NextResponse.json(resultPayload);
  } catch (e) {
    const rawMessage = e instanceof Error ? e.message : "";
    const safeMessage = rawMessage.startsWith("getaddrinfo") ||
      rawMessage.includes("EBUSY") ||
      rawMessage.includes("ENOTFOUND") ||
      rawMessage.includes("EAI_AGAIN")
      ? "We couldn't reach that domain. Check the website address and try again."
      : rawMessage || "We couldn't complete the scan. Please try again.";

    return NextResponse.json({ error: safeMessage }, { status: 400 });
  }
}
