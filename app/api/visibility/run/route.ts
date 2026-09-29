import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import { getSessionUser } from "../../../../lib/auth/session";
import { supabaseRest } from "../../../../lib/supabase/rest";

type Engine = {
  name: string;
  model: string;
};

const ENGINES: Engine[] = [
  { name: "OpenAI", model: "openai/gpt-5.6-sol" },
  { name: "Claude", model: "anthropic/claude-sonnet-5" },
  { name: "Gemini", model: "google/gemini-3.1-pro-preview" },
  { name: "Perplexity", model: "perplexity/sonar" }
];

function containsName(text: string, name: string) {
  const needle = name.trim().toLowerCase();
  return needle.length >= 2 && text.toLowerCase().includes(needle);
}

function recommendationDetected(text: string, brand: string) {
  if (!containsName(text, brand)) return false;
  return /(recommend|consider|option|choice|provider|company|best|top|strong|reputable|suitable|shortlist)/i.test(text);
}

async function gatewayCall(token: string, model: string, prompt: string) {
  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 450,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a neutral buyer research assistant. Answer the user's buying question directly. Name specific brands or providers only when they are genuinely relevant. Do not favor or invent a business merely because it may exist. Keep the answer concise and useful."
        },
        { role: "user", content: prompt }
      ]
    }),
    signal: AbortSignal.timeout(45000),
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `AI Gateway returned HTTP ${response.status}.`;
    throw new Error(message);
  }

  const text =
    data?.choices?.[0]?.message?.content ||
    data?.output_text ||
    "";

  const citations =
    data?.citations ||
    data?.sources ||
    data?.choices?.[0]?.message?.citations ||
    [];

  return {
    text: typeof text === "string" ? text : JSON.stringify(text),
    citations: Array.isArray(citations) ? citations : []
  };
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Sign in again to continue." }, { status: 401 });
  }

  const store = await cookies();
  const accessToken = store.get("ss_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Sign in again to continue." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  const acceptUsageCosts = body?.acceptUsageCosts === true;

  if (!projectId) {
    return NextResponse.json({ error: "Project missing." }, { status: 400 });
  }

  if (!acceptUsageCosts) {
    return NextResponse.json(
      { error: "Confirm AI model usage before starting the visibility test." },
      { status: 400 }
    );
  }

  const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!gatewayToken) {
    return NextResponse.json(
      { error: "AI monitoring is not enabled for this deployment yet." },
      { status: 503 }
    );
  }

  const [projectResponse, competitorResponse, recentResponse] = await Promise.all([
    supabaseRest(
      "/rest/v1/projects?select=id,name,domain,market,category&limit=1&id=eq." +
        encodeURIComponent(projectId),
      { method: "GET" },
      accessToken
    ),
    supabaseRest(
      "/rest/v1/competitors?select=id,name,domain&project_id=eq." +
        encodeURIComponent(projectId),
      { method: "GET" },
      accessToken
    ),
    supabaseRest(
      "/rest/v1/visibility_snapshots?select=id,captured_at&project_id=eq." +
        encodeURIComponent(projectId) +
        "&order=captured_at.desc&limit=1",
      { method: "GET" },
      accessToken
    )
  ]);

  const projects = projectResponse.ok ? await projectResponse.json() : [];
  const competitors = competitorResponse.ok ? await competitorResponse.json() : [];
  const recent = recentResponse.ok ? await recentResponse.json() : [];
  const project = projects?.[0];

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (recent?.[0]?.captured_at) {
    const lastRun = new Date(recent[0].captured_at).getTime();
    if (Number.isFinite(lastRun) && Date.now() - lastRun < 5 * 60 * 1000) {
      return NextResponse.json(
        { error: "A visibility run was completed recently. Wait 5 minutes before running another." },
        { status: 429 }
      );
    }
  }

  const category = (project.category || "").trim();
  const market = (project.market || "the target market").trim();
  const brand = project.name.trim();

  if (category.length < 2) {
    return NextResponse.json(
      { error: "Add a specific business category in Project settings before running AI visibility." },
      { status: 400 }
    );
  }

  const prompts = [
    `What are the best ${category} providers for buyers in ${market}? Give me a useful shortlist and explain why.`,
    `Which reputable ${category} companies should someone in ${market} consider, and what distinguishes them?`
  ];

  const promptSetId = randomUUID();
  const promptSetInsert = await supabaseRest(
    "/rest/v1/prompt_sets",
    {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: promptSetId,
        project_id: projectId,
        name: `Visibility run ${new Date().toISOString()}`
      })
    },
    accessToken
  );

  if (!promptSetInsert.ok) {
    console.error("Prompt set insert failed", await promptSetInsert.text());
    return NextResponse.json({ error: "Could not start the visibility run." }, { status: 500 });
  }

  const jobs = ENGINES.flatMap((engine) =>
    prompts.map(async (prompt) => {
      const promptTestId = randomUUID();
      const testedAt = new Date().toISOString();

      try {
        const result = await gatewayCall(gatewayToken, engine.model, prompt);
        const text = result.text;
        const brandMentioned = containsName(text, brand);
        const mentionedCompetitors = competitors
          .filter((competitor: { name: string }) => containsName(text, competitor.name))
          .map((competitor: { id: string; name: string; domain?: string | null }) => ({
            id: competitor.id,
            name: competitor.name,
            domain: competitor.domain || null
          }));

        const promptInsert = await supabaseRest(
          "/rest/v1/prompt_tests",
          {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              id: promptTestId,
              prompt_set_id: promptSetId,
              prompt,
              engine: engine.name,
              model: engine.model,
              status: "complete",
              tested_at: testedAt
            })
          },
          accessToken
        );

        if (!promptInsert.ok) {
          throw new Error("Could not save the AI prompt test.");
        }

        const responseInsert = await supabaseRest(
          "/rest/v1/ai_responses",
          {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              id: randomUUID(),
              prompt_test_id: promptTestId,
              brand_mentioned: brandMentioned,
              recommendation_detected: recommendationDetected(text, brand),
              citations: result.citations,
              competitors_mentioned: mentionedCompetitors,
              response_excerpt: text.slice(0, 1800),
              response_hash: createHash("sha256").update(text).digest("hex"),
              metadata: {
                model: engine.model,
                engine: engine.name,
                provider_api: true,
                consumer_surface: false,
                methodology: "Category-led provider-model API test"
              }
            })
          },
          accessToken
        );

        if (!responseInsert.ok) {
          throw new Error("Could not save the AI response.");
        }

        return {
          engine: engine.name,
          model: engine.model,
          prompt,
          ok: true,
          brandMentioned,
          recommendationDetected: recommendationDetected(text, brand),
          competitorsMentioned: mentionedCompetitors,
          citations: result.citations,
          excerpt: text.slice(0, 1200)
        };
      } catch (error) {
        await supabaseRest(
          "/rest/v1/prompt_tests",
          {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              id: promptTestId,
              prompt_set_id: promptSetId,
              prompt,
              engine: engine.name,
              model: engine.model,
              status: "failed",
              tested_at: testedAt
            })
          },
          accessToken
        ).catch(() => null);

        return {
          engine: engine.name,
          model: engine.model,
          prompt,
          ok: false,
          error: error instanceof Error ? error.message : "AI request failed.",
          brandMentioned: false,
          recommendationDetected: false,
          competitorsMentioned: [],
          citations: [],
          excerpt: ""
        };
      }
    })
  );

  const results = await Promise.all(jobs);
  const successful = results.filter((result) => result.ok);
  const mentionCount = successful.filter((result) => result.brandMentioned).length;
  const recommendationCount = successful.filter((result) => result.recommendationDetected).length;
  const competitorMentionCount = successful.reduce(
    (total, result) => total + result.competitorsMentioned.length,
    0
  );
  const citationCount = successful.reduce(
    (total, result) => total + result.citations.length,
    0
  );

  if (successful.length < 2) {
    return NextResponse.json(
      {
        error: "Too few AI providers completed the test to produce a trustworthy visibility score. No snapshot was saved.",
        successfulTests: successful.length,
        totalTests: results.length,
        results
      },
      { status: 502 }
    );
  }

  const visibilityScore = Math.round((mentionCount / successful.length) * 100);

  const denominator = mentionCount + competitorMentionCount;
  const recommendationShare = denominator
    ? Math.round((mentionCount / denominator) * 1000) / 10
    : 0;

  const engineBreakdown = ENGINES.reduce<Record<string, unknown>>((acc, engine) => {
    const engineResults = results.filter((result) => result.engine === engine.name);
    const complete = engineResults.filter((result) => result.ok);
    acc[engine.name] = {
      model: engine.model,
      tested: engineResults.length,
      successful: complete.length,
      mentions: complete.filter((result) => result.brandMentioned).length,
      recommendations: complete.filter((result) => result.recommendationDetected).length
    };
    return acc;
  }, {});

  const snapshotInsert = await supabaseRest(
    "/rest/v1/visibility_snapshots",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: randomUUID(),
        project_id: projectId,
        visibility_score: visibilityScore,
        recommendation_share: recommendationShare,
        mention_count: mentionCount,
        citation_count: citationCount,
        engine_breakdown: engineBreakdown
      })
    },
    accessToken
  );

  if (!snapshotInsert.ok) {
    console.error("Visibility snapshot insert failed", await snapshotInsert.text());
    return NextResponse.json(
      { error: "AI tests completed but the visibility snapshot could not be saved." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    methodology:
      "This run uses provider model APIs through Vercel AI Gateway. It is evidence of model-level visibility, not a claim about identical results in consumer ChatGPT, Claude, Gemini, Perplexity or Copilot interfaces.",
    prompts,
    visibilityScore,
    recommendationShare,
    mentionCount,
    recommendationCount,
    citationCount,
    successfulTests: successful.length,
    totalTests: results.length,
    engineBreakdown,
    results
  });
}
