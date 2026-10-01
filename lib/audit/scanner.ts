import dns from "node:dns/promises";
import net from "node:net";

export type AuditCheck = {
  label: string;
  status: "good" | "warn";
  detail: string;
  evidence: string;
  whyItMatters: string;
  benefit: string;
  implementation: string[];
  expectedImpact: string;
  verify: string;
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

  if (url.username || url.password) {
    throw new Error("Website addresses containing embedded login credentials cannot be scanned.");
  }

  const port = url.port;
  if (port && port !== "80" && port !== "443") {
    throw new Error("Only standard web ports can be scanned.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    ["localhost", "0.0.0.0", "::1"].includes(hostname) ||
    hostname.endsWith(".local")
  ) {
    throw new Error("That address cannot be scanned.");
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const addresses = await dns.lookup(hostname, { all: true, verbatim: true });

      if (addresses.length) {
        if (addresses.some((entry) => isPrivate(entry.address))) {
          throw new Error("That address cannot be scanned.");
        }
        return;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
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

async function readLimitedText(response: Response, maxBytes = 1_000_000) {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let output = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      break;
    }

    output += decoder.decode(value, { stream: true });
  }

  output += decoder.decode();
  return output;
}

async function fetchWebsiteAt(initial: URL) {
  let current = initial;

  for (let hop = 0; hop <= 4; hop++) {
    await validatePublicUrl(current);

    const response = await fetch(current.toString(), {
      redirect: "manual",
      headers: {
        "User-Agent": "SeekSignal-Audit/1.0 (+website-readiness scanner)",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1"
      },
      signal: AbortSignal.timeout(12000),
      cache: "no-store"
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The website returned an incomplete redirect.");
      if (hop === 4) throw new Error("The website redirects too many times.");
      current = new URL(location, current);
      continue;
    }

    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}.`);

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("That address did not return a normal HTML website.");
    }

    return { url: current, html: await readLimitedText(response) };
  }

  throw new Error("We couldn't complete the website request.");
}

async function fetchViaBrowserProxy(target: URL) {
  const endpoint =
    "https://api.microlink.io/?url=" +
    encodeURIComponent(target.toString()) +
    "&data.html.attr=html&meta=false&prerender=true";

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Browser proxy returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  const html = data?.data?.html;

  if (typeof html !== "string" || html.trim().length < 100) {
    throw new Error("Browser proxy returned no usable HTML.");
  }

  return {
    url: target,
    html
  };
}

export async function fetchPublicWebsite(raw: string) {
  const trimmed = raw.trim();
  const initial = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const original = new URL(initial);

  const candidates = [original];
  const hostname = original.hostname.toLowerCase();

  if (hostname.startsWith("www.")) {
    const apex = new URL(original.toString());
    apex.hostname = hostname.slice(4);
    candidates.push(apex);
  } else {
    const www = new URL(original.toString());
    www.hostname = `www.${hostname}`;
    candidates.push(www);
  }

  let lastError: unknown;

  // First try the same kind of browser-backed retrieval that can reach
  // public sites when the Vercel runtime DNS/network path cannot.
  for (const candidate of candidates) {
    try {
      return await fetchViaBrowserProxy(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  // Then try direct retrieval. This remains useful because it gives us the
  // exact final URL and response headers when the runtime can reach the site.
  for (const candidate of candidates) {
    try {
      return await fetchWebsiteAt(candidate);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      if (
        !/couldn't reach that domain|couldn't verify that website|ENOTFOUND|EAI_AGAIN|ENODATA|ECONN|ETIMEDOUT|fetch failed/i.test(message)
      ) {
        throw error;
      }
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("We couldn't reach that domain. Check the website address and try again.");
}

function cleanText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? cleanText(match[1]).slice(0, 220) : "";
}

export function analyseWebsite(html: string, hostname: string) {
  const titleText = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1Text = firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const descriptionMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const descriptionText = descriptionMatch?.[1] ? cleanText(descriptionMatch[1]).slice(0, 220) : "";
  const canonicalMatch =
    html.match(/<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']+)/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*canonical[^"']*["']/i);
  const canonicalUrl = canonicalMatch?.[1]?.slice(0, 220) || "";
  const types = new Set<string>();
  function collectTypes(value: unknown) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(collectTypes); return; }
    const record = value as Record<string, unknown>;
    const type = record["@type"];
    for (const item of Array.isArray(type) ? type : [type]) {
      if (typeof item === "string") types.add(item);
    }
    Object.values(record).forEach(collectTypes);
  }
  let validSchemaCount = 0;
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const schema = JSON.parse(match[1]); collectTypes(schema); validSchemaCount++; } catch { /* Invalid JSON is not evidence. */ }
  }
  const schemaTypes = [...types].slice(0, 8);
  // Framework bundles, navigation and policies do not establish buyer answers or proof.
  const contentHtml = html.replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const visibleText = cleanText(contentHtml);
  const headings = [...contentHtml.matchAll(/<h[2-6]\b[^>]*>([\s\S]*?)<\/h[2-6]>/gi)].map(m => cleanText(m[1]));
  const hasQuestionHeading = headings.some(text => /\?|^(how|what|who|why|when|where|can|do|is|are)\b/i.test(text));
  const hasAnswerParagraph = [...contentHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].some(m => cleanText(m[1]).length >= 60);

  const hasTitle = titleText.length >= 3;
  const hasDescription =
    /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{30,}/i.test(html) ||
    /<meta[^>]+content=["'][^"']{30,}["'][^>]+name=["']description["']/i.test(html);
  const hasH1 = h1Text.length > 0;
  const hasCanonical = canonicalUrl.length > 0;
  const hasSchema = validSchemaCount > 0;
  const hasBusinessSchema = schemaTypes.some(type => /^(Organization|LocalBusiness|Product|Service|Corporation|WebSite)$/i.test(type));
  const hasFaq = (hasQuestionHeading && hasAnswerParagraph) || types.has("FAQPage");
  const hasTrust = /\b(case stud(?:y|ies)|testimonial|accredit(?:ed|ation)|certified|registered company|company number)\b/i.test(visibleText);
  const hasCommercial = /\b(pricing|price|buy|book|request a quote|get a quote|shop|contact sales)\b/i.test(visibleText);
  const indexable = !/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html) &&
    !/<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);

  const items = [
    {
      label: "Clear page title",
      ok: hasTitle,
      action: hasTitle
        ? "Keep the title specific to this page and avoid diluting it with unrelated services."
        : "Add a unique title that combines the primary service or product, target market where relevant, and brand name.",
      evidence: hasTitle ? `Detected title: “${titleText}”` : "No usable <title> was detected in the fetched HTML.",
      whyItMatters: "The page title is a strong page-level context signal used by search and AI retrieval systems to understand what the page represents.",
      benefit: "Clearer service and entity classification, stronger search snippets and less ambiguity when AI systems decide whether the page is relevant.",
      implementation: hasTitle ? [
        "Check that the title still matches the page's main commercial intent.",
        "Keep the title unique across important pages."
      ] : [
        "Use this pattern: Primary service or product | Location/market if relevant | Brand.",
        "Keep the title specific to the page rather than listing every service.",
        "Publish the change in the HTML <title> tag."
      ],
      expectedImpact: hasTitle ? "Protects an already-strong page-level relevance signal." : "High likelihood of improving how clearly search and retrieval systems classify the page; may also improve search-result click-through.",
      verify: "Re-run the audit and confirm the title check passes. Also inspect the rendered <title> tag in the page source.",
      priority: hasTitle ? 0 : 82,
      effort: "Low"
    },
    {
      label: "Search description",
      ok: hasDescription,
      action: hasDescription
        ? "Keep the description factual, specific and aligned with the page's real offer."
        : "Write a 140–170 character description that states what the business does, who it serves and the main commercial outcome.",
      evidence: hasDescription ? `Detected description: “${descriptionText}”` : "No substantial meta description was detected.",
      whyItMatters: "A good description reinforces topical context and gives retrieval systems a concise summary of the page.",
      benefit: "Improves clarity around the offer and can improve click-through when the page is surfaced in search-like experiences.",
      implementation: hasDescription ? [
        "Make sure the description names the offer, audience and outcome.",
        "Keep it aligned with the visible page content."
      ] : [
        "Write 140–170 characters covering: what you do, who it is for, and the outcome.",
        "Place it in <meta name=\"description\" content=\"…\">.",
        "Avoid generic claims such as 'leading solutions' unless supported by evidence."
      ],
      expectedImpact: hasDescription ? "Maintains concise machine-readable context and search-snippet quality." : "Moderate impact on page clarity and search-result messaging; useful for humans and retrieval systems, but not a direct ranking guarantee.",
      verify: "Re-run the audit and confirm the description check passes, then inspect the meta description in page source.",
      priority: hasDescription ? 0 : 56,
      effort: "Low"
    },
    {
      label: "Primary page heading",
      ok: hasH1,
      action: hasH1
        ? "Keep one clear primary heading that matches the page's real purpose."
        : "Add one visible H1 that plainly states the core product, service or solution on the page.",
      evidence: hasH1 ? `Detected H1: “${h1Text}”` : "No H1 heading was detected.",
      whyItMatters: "The H1 helps establish the primary subject of the page and should agree with the title, copy and structured data.",
      benefit: "Reduces semantic ambiguity and makes the page easier for both buyers and retrieval systems to understand quickly.",
      implementation: hasH1 ? [
        "Confirm the H1 describes the page's primary offer in plain English.",
        "Keep supporting headings subordinate to the H1."
      ] : [
        "Add one visible H1 near the top of the page.",
        "State the main product/service and intended customer outcome.",
        "Avoid vague brand slogans as the only H1."
      ],
      expectedImpact: hasH1 ? "Preserves clear page hierarchy and topic definition." : "Moderate-to-high impact on human comprehension and page-topic clarity; especially valuable when the current hero is brand-led but not service-led.",
      verify: "Re-run the audit and confirm the H1 check passes; inspect the rendered page for one clear primary heading.",
      priority: hasH1 ? 0 : 74,
      effort: "Low"
    },
    {
      label: "Canonical URL",
      ok: hasCanonical,
      action: hasCanonical
        ? "Keep canonicals self-consistent and point duplicate variants to the preferred URL."
        : "Add a canonical link tag that points to the preferred public URL for this page.",
      evidence: hasCanonical ? `Detected canonical: ${canonicalUrl}` : "No rel=canonical URL was detected.",
      whyItMatters: "Canonical signals help crawlers consolidate duplicate URL variants and understand which page should represent the content.",
      benefit: "Reduces duplicated signals and gives search/retrieval systems a cleaner, more stable source URL.",
      implementation: hasCanonical ? [
        "Confirm the canonical points to the preferred public version of this exact page."
      ] : [
        "Add a rel=canonical tag pointing to the preferred HTTPS URL.",
        "Use the final public URL that you want indexed.",
        "Keep internal links consistent with that preferred URL."
      ],
      expectedImpact: hasCanonical ? "Protects URL consolidation and reduces duplicate-page ambiguity." : "Foundational technical impact: helps consolidate duplicate URLs and prevent fragmented indexing signals.",
      verify: "Re-run the audit and confirm the canonical check passes; inspect rel=canonical in the page source.",
      priority: hasCanonical ? 0 : 48,
      effort: "Low"
    },
    {
      label: "Indexability",
      ok: indexable,
      action: indexable
        ? "Keep important commercial pages indexable unless there is a deliberate reason to hide them."
        : "Remove the noindex directive from this page if it is intended to be discoverable publicly.",
      evidence: indexable ? "No homepage meta noindex directive was detected." : "A meta noindex directive was detected.",
      whyItMatters: "A noindex directive explicitly tells conventional search systems not to index the page and can severely restrict discoverability.",
      benefit: "Restores the page's eligibility to appear in search indexing workflows and removes a major visibility blocker.",
      implementation: indexable ? [
        "Keep important public commercial pages free from accidental noindex directives."
      ] : [
        "Remove noindex from the page if the page should be discoverable.",
        "Check robots.txt is not blocking the page.",
        "Request re-indexing in your search console after the change."
      ],
      expectedImpact: indexable ? "Maintains eligibility for indexing and downstream discovery." : "Potentially critical impact: a page that cannot be indexed is severely constrained before any AI/SEO optimisation can matter.",
      verify: "Re-run the audit and confirm indexability passes, then inspect the robots meta tag and Search Console indexing status.",
      priority: indexable ? 0 : 100,
      effort: "Low"
    },
    {
      label: "Structured business data",
      ok: hasBusinessSchema,
      action: hasBusinessSchema
        ? "Keep schema accurate and aligned with visible page content; add service or product detail where appropriate."
        : "Add valid JSON-LD for the organisation plus relevant Service, Product or LocalBusiness data using only facts shown on the site.",
      evidence: schemaTypes.length ? `Detected schema types: ${schemaTypes.join(", ")}` : "No JSON-LD @type values were detected.",
      whyItMatters: "Structured data gives machines explicit entity, offer and relationship information instead of forcing them to infer everything from prose.",
      benefit: "Makes the business, services and important attributes easier to parse consistently and can improve eligibility for structured search features.",
      implementation: hasBusinessSchema ? [
        "Check the schema values match visible content and current business facts.",
        "Add Service or Product schema to commercially important pages where appropriate."
      ] : [
        "Add Organization schema for the business identity.",
        "Add Service or Product schema on relevant commercial pages.",
        "Include only factual fields that are visible or verifiable on the site.",
        "Validate the JSON-LD before publishing."
      ],
      expectedImpact: hasBusinessSchema ? "Strengthens explicit machine-readable entity and offer information." : "High interpretability impact: gives machines explicit business/entity/offer relationships instead of relying only on prose.",
      verify: "Re-run the audit, then validate the JSON-LD with Google's Rich Results Test or Schema.org validator.",
      priority: hasBusinessSchema ? 0 : 88,
      effort: "Medium"
    },
    {
      label: "Question coverage",
      ok: hasFaq,
      action: hasFaq
        ? "Expand question-led content around high-intent buyer decisions, objections, comparisons and eligibility."
        : "Add concise answers to 5–10 real buyer questions about choosing, comparing, pricing, suitability and next steps.",
      evidence: hasFaq ? "Question headings with supporting paragraphs or valid FAQPage schema were detected. Answer quality still needs review." : "No question headings with substantial supporting paragraphs or valid FAQPage schema were detected. A FAQ navigation link alone does not pass this check.",
      whyItMatters: "AI assistants often respond to natural-language questions. Direct, factual answers create retrieval-ready passages for those intents.",
      benefit: "Increases the number of buyer questions the site can answer directly and creates content that is easier to quote, cite or retrieve.",
      implementation: hasFaq ? [
        "Expand coverage to high-intent questions that affect purchase decisions.",
        "Answer each question directly in the first sentence before adding detail."
      ] : [
        "Add 5–10 questions real buyers ask before choosing you.",
        "Cover price/cost, suitability, process, timelines, comparisons, objections and next steps.",
        "Answer each question directly, then add supporting detail.",
        "Link answers to deeper service/product pages where useful."
      ],
      expectedImpact: hasFaq ? "Expands retrieval coverage across more natural-language buyer intents." : "High content opportunity: increases the number of buyer questions the site can answer and gives AI/search systems clearer passages to retrieve or quote.",
      verify: "Re-run the audit, then test whether the new questions are answered clearly on-page without needing hidden UI or vague marketing copy.",
      priority: hasFaq ? 0 : 72,
      effort: "Medium"
    },
    {
      label: "Trust signals",
      ok: hasTrust,
      action: hasTrust
        ? "Keep proof current and specific: named clients where permitted, credentials, reviews, case studies and clear company details."
        : "Add visible company identity, contact details, policies and credible proof such as certifications, case studies, reviews or accreditations.",
      evidence: hasTrust ? "Specific proof-related language was detected in page content; its authenticity and attribution still need review." : "No case-study, testimonial, accreditation, certification or company-registration indicators were detected in page content. Contact and policy links alone are not proof.",
      whyItMatters: "Recommendation systems and buyers need evidence that the business is legitimate, established and suitable—not just a page that claims expertise.",
      benefit: "Improves buyer confidence and gives search/AI systems more corroborating evidence when evaluating the business.",
      implementation: hasTrust ? [
        "Make proof specific: who, what result, when, and where possible independently verifiable."
      ] : [
        "Add a clear About/Company page and visible contact details.",
        "Add specific reviews, testimonials, case studies or certifications where genuine.",
        "Show legal/company identity and relevant policies.",
        "Link claims of expertise to evidence rather than leaving them unsupported."
      ],
      expectedImpact: hasTrust ? "Maintains stronger buyer confidence and corroborating evidence." : "High commercial and credibility impact: can improve conversion confidence and strengthen the evidence available when systems assess legitimacy and suitability.",
      verify: "Re-run the audit and manually confirm that proof is visible, specific and attributable rather than generic claims.",
      priority: hasTrust ? 0 : 90,
      effort: "Medium"
    },
    {
      label: "Commercial clarity",
      ok: hasCommercial,
      action: hasCommercial
        ? "Keep the next step obvious and align it with the intent of each page."
        : "Add a clear commercial pathway such as pricing, book, buy, request a quote or contact sales, with a visible primary CTA.",
      evidence: hasCommercial ? "Commercial-intent language was detected on the audited page." : "No strong pricing, buying, booking, quote or sales language was detected.",
      whyItMatters: "A page can be understood without being commercially useful. Clear conversion intent tells buyers what to do next and clarifies the role of the page.",
      benefit: "Reduces friction after discovery, improves conversion potential and makes the site's commercial purpose easier to interpret.",
      implementation: hasCommercial ? [
        "Check the primary CTA matches the page intent and works end-to-end."
      ] : [
        "Choose one primary action: buy, book, request a quote, start trial, or contact sales.",
        "Place that CTA above the fold and repeat it after key proof/benefit sections.",
        "Make price, quote expectations or the next step clear enough to reduce uncertainty.",
        "Test the full conversion path yourself."
      ],
      expectedImpact: hasCommercial ? "Protects conversion clarity after a visitor or AI system discovers the page." : "High conversion impact: reduces uncertainty and gives qualified visitors a clear next step, turning discovery into measurable commercial action.",
      verify: "Re-run the audit and test the page as a buyer: the primary next step should be obvious and complete successfully.",
      priority: hasCommercial ? 0 : 84,
      effort: "Low"
    }
  ];

  const passed = items.filter((item) => item.ok).length;
  const score = Math.round((passed / items.length) * 100);

  const checks: AuditCheck[] = items.map((item) => ({
    label: item.label,
    status: item.ok ? "good" : "warn",
    detail: item.action,
    evidence: item.evidence,
    whyItMatters: item.whyItMatters,
    benefit: item.benefit,
    implementation: item.implementation,
    expectedImpact: item.expectedImpact,
    verify: item.verify
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
      score: hasBusinessSchema ? 100 : hasSchema ? 50 : 0
    },
    {
      name: "Answer coverage",
      score: hasFaq ? 100 : 0
    },
    {
      name: "Trust & authority",
      score: hasTrust ? 100 : 0
    },
    {
      name: "Commercial clarity",
      score: hasCommercial ? 100 : 0
    }
  ];

  const opportunities = items
    .filter((item) => !item.ok)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6)
    .map((item, index) => ({
      rank: index + 1,
      title: item.label,
      problem: item.whyItMatters,
      evidence: item.evidence,
      action: item.action,
      benefit: item.benefit,
      implementation: item.implementation,
      expectedImpact: item.expectedImpact,
      verify: item.verify,
      impact: item.priority >= 85 ? "High" : item.priority >= 65 ? "Medium" : "Foundational",
      effort: item.effort
    }));

  const summary =
    score >= 80
      ? "Strong website-readiness foundations. The next gains are likely to come from deeper answer coverage, authority and real AI-engine monitoring."
      : score >= 55
        ? "Good foundations, but several signals could make the business easier for AI systems to interpret and surface."
        : "Important website signals are missing or unclear. Fixing the fundamentals should come before ongoing AI visibility monitoring.";

  const methodology =
    "This score measures observable website-readiness signals on the audited page. It does not claim that an AI platform currently recommends the business.";

  const warningCount = items.filter((item) => !item.ok).length;
  const topGap = opportunities[0];
  const commercialDiagnosis = warningCount === 0
    ? {
        headline: "Your homepage communicates the fundamentals clearly. The next question is whether AI systems actually surface the business.",
        detail: "The observable homepage signals in this diagnostic are present. That removes several common interpretation barriers, but it does not prove recommendation visibility.",
        consequence: "Further homepage tweaks are unlikely to be the highest-value next move. Measure real model visibility, competitor presence and deeper site coverage instead."
      }
    : {
        headline: `${warningCount} observable gaps are weakening the evidence machines and buyers can use to understand this business.`,
        detail: topGap
          ? `The highest-priority issue is ${topGap.title.toLowerCase()}. ${topGap.evidence}`
          : "The page is missing signals that make the business easier to classify and evaluate.",
        consequence: topGap
          ? `${topGap.expectedImpact} Until the underlying evidence changes, simply producing more content or repeatedly testing AI prompts is unlikely to address this specific weakness.`
          : "Missing or ambiguous evidence can reduce discoverability, interpretation quality and conversion confidence."
      };

  return {
    url: hostname,
    score,
    checks,
    categories,
    opportunities,
    actionPlan: opportunities,
    commercialDiagnosis,
    expectedOutcome:
      opportunities.length
        ? "Work through the top three actions first. These are the changes most likely to remove practical discovery, interpretation or conversion barriers. Re-scan after publishing them, then use AI visibility tests to see whether model-level mentions actually change."
        : "The core page signals are strong. The next step is AI visibility testing, competitor benchmarking and deeper content/authority analysis.",
    quickWins: opportunities.slice(0, 3).map((item) => ({
      title: item.title,
      impact: item.impact,
      effort: item.effort,
      action: item.action,
      expectedImpact: item.expectedImpact
    })),
    summary,
    methodology
  };
}
