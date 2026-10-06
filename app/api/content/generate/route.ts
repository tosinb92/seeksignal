import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "../../../../lib/auth/session";
import { supabaseRest } from "../../../../lib/supabase/rest";
import { getBillingState } from "../../../../lib/billing/stripe";
import { getVercelOidcToken } from "@vercel/oidc";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const store = await cookies();
  const token = store.get("ss_access_token")?.value;
  if (!token) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  if (!projectId) return NextResponse.json({ error: "Project missing." }, { status: 400 });
  if (!user.email) return NextResponse.json({ error: "A verified account email is required." }, { status: 400 });
  const projectResponse = await supabaseRest("/rest/v1/projects?select=id,name,domain,market,category,organization_id&limit=1&id=eq." + encodeURIComponent(projectId), { method: "GET" }, token);
  const projects = projectResponse.ok ? await projectResponse.json() : [];
  const project = projects[0];
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const billing = await getBillingState(user.email, project.organization_id);
  if (!billing.active) return NextResponse.json({ error: "SeekSignal Pro is required to generate content.", upgradeRequired: true }, { status: 402 });
  const scanResponse = await supabaseRest("/rest/v1/scans?select=score,summary,raw_result&project_id=eq." + encodeURIComponent(projectId) + "&order=created_at.desc&limit=1", { method: "GET" }, token);
  const scans = scanResponse.ok ? await scanResponse.json() : [];
  const scan = scans[0];
  if (!scan) return NextResponse.json({ error: "Run your website scan first so SeekSignal can tailor the article to a real visibility gap." }, { status: 400 });
  let gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || "";
  if (!gatewayToken && process.env.VERCEL === "1") gatewayToken = await getVercelOidcToken();
  if (!gatewayToken) return NextResponse.json({ error: "AI content generation is not enabled on this deployment." }, { status: 503 });
  const opportunities = Array.isArray(scan.raw_result?.opportunities) ? scan.raw_result.opportunities.slice(0, 5) : [];
  const prompt = "Create one high-impact SEO and AI-discovery article for this business. Business: " + project.name + ". Domain: " + project.domain + ". Market: " + (project.market || "") + ". Category: " + (project.category || "") + ". Audit summary: " + scan.summary + ". Audit opportunities: " + JSON.stringify(opportunities) + ". Return JSON with title, targetQuery, whyThisOpportunity, metaTitle, metaDescription, articleMarkdown, internalLinks, schemaRecommendation, verificationPlan. Write 1200-1800 words of genuinely useful buyer-focused content. Use natural language, clear headings and FAQ where useful. Do not invent facts, credentials, statistics or sources. Do not promise rankings or AI recommendations. Explain how to re-test visibility after publication.";
  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + gatewayToken, "Content-Type": "application/json" }, body: JSON.stringify({ model: "openai/gpt-5", max_tokens: 5000, temperature: 0.35, messages: [{ role: "system", content: "You are the senior SEO and AI-search content strategist for SeekSignal." }, { role: "user", content: prompt }] }), signal: AbortSignal.timeout(60000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: data?.error?.message || "The content model could not generate the article." }, { status: 502 });
  const raw = String(data?.choices?.[0]?.message?.content || "").trim().replace(/^```json\\s*/i, "").replace(/```$/i, "");
  let article;
  try { article = JSON.parse(raw); } catch { return NextResponse.json({ error: "The generated article could not be formatted. Please try again." }, { status: 502 }); }
  return NextResponse.json({ ok: true, article });
}
