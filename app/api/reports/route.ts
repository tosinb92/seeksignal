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

  const [projectResponse, scanResponse] = await Promise.all([
    supabaseRest(
      "/rest/v1/projects?select=id,name,domain&limit=1&id=eq." + encodeURIComponent(projectId),
      { method: "GET" },
      token
    ),
    supabaseRest(
      "/rest/v1/scans?select=id,score,summary,methodology,raw_result,created_at&project_id=eq." + encodeURIComponent(projectId) + "&order=created_at.desc&limit=1",
      { method: "GET" },
      token
    )
  ]);

  const projects = projectResponse.ok ? await projectResponse.json() : [];
  const scans = scanResponse.ok ? await scanResponse.json() : [];
  const project = projects?.[0];
  const scan = scans?.[0];

  if (!project || !scan) {
    return NextResponse.json({ error: "Run a saved scan before generating a report." }, { status: 400 });
  }

  const reportId = randomUUID();
  const title = `${project.name} readiness report`;
  const payload = {
    project: { id: project.id, name: project.name, domain: project.domain },
    scan,
    generated_at: new Date().toISOString()
  };

  const response = await supabaseRest("/rest/v1/reports", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id: reportId,
      project_id: projectId,
      title,
      report_type: "website_readiness",
      payload,
      created_by: user.id
    })
  }, token);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ error: data?.message || "Could not generate report." }, { status: response.status });
  }

  return NextResponse.json({ ok: true, report: Array.isArray(data) ? data[0] : data });
}
