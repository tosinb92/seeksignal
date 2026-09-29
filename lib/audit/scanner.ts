import dns from "node:dns/promises";
import net from "node:net";

export type AuditCheck = {
  label: string;
  status: "good" | "warn";
  detail: string;
};

function isPrivate(ip: string) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    return p[0] === 10 ||
      p[0] === 127 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168);
  }

  return ip === "::1" ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe80");
}

async function validatePublicUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Enter a normal website address beginning with http:// or https://.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    ["localhost", "0.0.0.0", "::1"].includes(hostname) ||
    hostname.endsWith(".local")
  ) {
    throw new Error("That address cannot be scanned.");
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    const [v4, v6] = await Promise.allSettled([
      dns.resolve4(hostname),
      dns.resolve6(hostname)
    ]);

    const addresses = [
      ...(v4.status === "fulfilled" ? v4.value : []),
      ...(v6.status === "fulfilled" ? v6.value : [])
    ];

    if (addresses.length) {
      if (addresses.some(isPrivate)) throw new Error("That address cannot be scanned.");
      return;
    }

    lastError = v4.status === "rejected" ? v4.reason : v6.status === "rejected" ? v6.reason : null;
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 120));
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

export async function fetchPublicWebsite(raw: string) {
  const initial = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  let current = new URL(initial);

  for (let hop = 0; hop <= 4; hop++) {
    await validatePublicUrl(current);

    const response = await fetch(current.toString(), {
      redirect: "manual",
      headers: {
        "User-Agent": "SeekSignal-Audit/1.0 (+website-readiness scanner)"
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store"
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The website returned an incomplete redirect.");
      if (hop === 4) throw new Error("The website redirects too many times.");

      current = new URL(location, current);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Website returned HTTP ${response.status}.`);
    }

    return {
      url: current,
      html: (await response.text()).slice(0, 800000)
    };
  }

  throw new Error("We couldn't complete the website request.");
}

export function analyseWebsite(html: string, hostname: string) {
  const hasTitle = /<title[^>]*>[^<]{3,}<\/title>/i.test(html);
  const hasDescription =
    /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{30,}/i.test(html) ||
    /<meta[^>]+content=["'][^"']{30,}["'][^>]+name=["']description["']/i.test(html);
  const hasH1 = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html);
  const hasCanonical = /<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=/i.test(html) ||
    /<link[^>]+href=[^>]+rel=["'][^"']*canonical[^"']*["']/i.test(html);
  const hasSchema = /application\/ld\+json/i.test(html);
  const hasBusinessSchema = hasSchema && /(Organization|LocalBusiness|Product|Service|Corporation|WebSite)/i.test(html);
  const hasFaq = /(FAQ|frequently asked|questions|how does|what is|who is|why choose)/i.test(html);
  const hasTrust = /(about us|contact|privacy|terms|case stud|testimonial|review|accredit|certif)/i.test(html);
  const hasCommercial = /(pricing|price|buy|book|request a quote|get a quote|shop|services|contact sales)/i.test(html);
  const indexable = !/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html) &&
    !/<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);

  const items: Array<[string, boolean, string]> = [
    ["Clear page title", hasTitle, hasTitle ? "A descriptive title helps establish page topic and entity context." : "Add a descriptive, specific title to key pages."],
    ["Search description", hasDescription, hasDescription ? "A substantial meta description is present." : "Add unique meta descriptions that explain the business and offer."],
    ["Primary page heading", hasH1, hasH1 ? "A clear H1 is present." : "Add one strong H1 that states what this page is about."],
    ["Canonical URL", hasCanonical, hasCanonical ? "A canonical URL signal is present." : "Add canonical tags so crawlers can identify the preferred page URL."],
    ["Indexability", indexable, indexable ? "No homepage noindex directive was detected." : "Remove the noindex directive if this page should be discoverable."],
    ["Structured business data", hasBusinessSchema, hasBusinessSchema ? "Relevant structured data was detected." : "Add JSON-LD for your organization, services or products."],
    ["Question coverage", hasFaq, hasFaq ? "The site contains question-oriented content." : "Add direct answers to the questions buyers ask before choosing you."],
    ["Trust signals", hasTrust, hasTrust ? "Trust and company signals are visible." : "Strengthen about, contact, proof, policy and customer-evidence pages."],
    ["Commercial clarity", hasCommercial, hasCommercial ? "Commercial intent and next steps are visible." : "Make pricing, buying, booking or enquiry pathways more explicit."]
  ];

  const passed = items.filter(([, ok]) => ok).length;
  const score = Math.round((passed / items.length) * 100);

  const checks: AuditCheck[] = items.map(([label, ok, detail]) => ({
    label,
    status: ok ? "good" : "warn",
    detail
  }));

  const categories = [
    {
      name: "Entity clarity",
      score: Math.round(((Number(hasTitle) + Number(hasDescription) + Number(hasH1)) / 3) * 100)
    },
    {
      name: "Technical readiness",
      score: Math.round(((Number(hasCanonical) + Number(indexable)) / 2) * 100)
    },
    {
      name: "Structured data",
      score: hasBusinessSchema ? 100 : hasSchema ? 55 : 20
    },
    {
      name: "Answer coverage",
      score: hasFaq ? 82 : 35
    },
    {
      name: "Trust & authority",
      score: hasTrust ? 78 : 32
    },
    {
      name: "Commercial clarity",
      score: hasCommercial ? 88 : 30
    }
  ];

  const opportunities = checks
    .filter((check) => check.status === "warn")
    .slice(0, 5)
    .map((check, index) => ({
      title: check.label,
      action: check.detail,
      impact: index < 2 ? "High" : "Medium"
    }));

  const summary =
    score >= 80
      ? "Strong website-readiness foundations. The next gains are likely to come from deeper answer coverage, authority and real AI-engine monitoring."
      : score >= 55
        ? "Good foundations, but several signals could make the business easier for AI systems to interpret and surface."
        : "Important website signals are missing or unclear. Fixing the fundamentals should come before ongoing AI visibility monitoring.";

  const methodology =
    "This score measures observable website-readiness signals on the audited page. It does not claim that an AI platform currently recommends the business.";

  return {
    url: hostname,
    score,
    checks,
    categories,
    opportunities,
    summary,
    methodology
  };
}
