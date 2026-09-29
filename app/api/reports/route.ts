import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "../../../lib/auth/session";
import { supabaseRest } from "../../../lib/supabase/rest";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.id) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const store = await cookies();
  const token = store.get("ss_access_token")?.value;
  if (!token) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  if (!projectId) return NextResponse.json({ error: "Project missing." }, { status: 400 });

  const [projectResponse, scanResponse, visibilityResponse, promptSetResponse] = await Promise.all([
    supabaseRest(
      "/rest/v1/projects?select=id,name,domain,market,category&limit=1&id=eq." + encodeURIComponent(projectId),
      { method: "GET" },
      token
    ),
    supabaseRest(
      "/rest/v1/scans?select=id,score,summary,methodology,raw_result,created_at&project_id=eq." +
        encodeURIComponent(projectId) +
        "&order=created_at.desc&limit=1",
      { method: "GET" },
      token
    ),
    supabaseRest(
      "/rest/v1/visibility_snapshots?select=id,visibility_score,recommendation_share,mention_count,citation_count,engine_breakdown,captured_at&project_id=eq." +
        encodeURIComponent(projectId) +
        "&order=captured_at.desc&limit=1",
      { method: "GET" },
      token
    ),
    supabaseRest(
      "/rest/v1/prompt_sets?select=id,name,created_at&project_id=eq." +
        encodeURIComponent(projectId) +
        "&order=created_at.desc&limit=1",
      { method: "GET" },
      token
    )
  ]);

  const projects = projectResponse.ok ? await projectResponse.json() : [];
  const scans = scanResponse.ok ? await scanResponse.json() : [];
  const visibility = visibilityResponse.ok ? await visibilityResponse.json() : [];
  const promptSets = promptSetResponse.ok ? await promptSetResponse.json() : [];

  const project = projects?.[0];
  const scan = scans?.[0] || null;
  const snapshot = visibility?.[0] || null;
  const promptSet = promptSets?.[0] || null;

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (!scan && !snapshot) {
    return NextResponse.json(
      { error: "Run a website-readiness scan or AI visibility test before generating a report." },
      { status: 400 }
    );
  }

  let evidence: unknown[] = [];

  if (promptSet?.id) {
    const testsResponse = await supabaseRest(
      "/rest/v1/prompt_tests?select=id,prompt,engine,model,status,tested_at&prompt_set_id=eq." +
        encodeURIComponent(promptSet.id) +
        "&order=created_at.asc",
      { method: "GET" },
      token
    );
    const tests = testsResponse.ok ? await testsResponse.json() : [];
    const ids = tests.map((item: { id: string }) => item.id).filter(Boolean);

    if (ids.length) {
      const responsesResponse = await supabaseRest(
        "/rest/v1/ai_responses?select=prompt_test_id,brand_mentioned,recommendation_detected,citations,competitors_mentioned,response_excerpt&prompt_test_id=in.(" +
          ids.map((id: string) => encodeURIComponent(id)).join(",") +
          ")",
        { method: "GET" },
        token
      );
      const responses = responsesResponse.ok ? await responsesResponse.json() : [];
      const byTest = new Map(responses.map((item: { prompt_test_id: string }) => [item.prompt_test_id, item]));

      evidence = tests.map((test: { id: string }) => ({
        ...test,
        response: byTest.get(test.id) || null
      }));
    }
  }

  const reportId = randomUUID();
  const title = `${project.name} SeekSignal intelligence report`;
  const payload = {
    project,
    readiness: scan,
    visibility: snapshot,
    ai_evidence: evidence,
    methodology: {
      readiness:
        "Website readiness measures observable signals on the audited website and does not prove AI recommendation.",
      visibility:
        "AI visibility uses provider model APIs through Vercel AI Gateway. Results are model-level evidence and can differ from consumer AI interfaces."
    },
    generated_at: new Date().toISOString()
  };

  const response = await supabaseRest(
    "/rest/v1/reports",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: reportId,
        project_id: projectId,
        title,
        report_type: "intelligence_snapshot",
        payload,
        created_by: user.id
      })
    },
    token
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ error: data?.message || "Could not generate report." }, { status: response.status });
  }

  return NextResponse.json({ ok: true, report: Array.isArray(data) ? data[0] : data });
}
