import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "../../../../lib/auth/session";
import { supabaseRest } from "../../../../lib/supabase/rest";
import { analyseWebsite, fetchPublicWebsite } from "../../../../lib/audit/scanner";

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
    "/rest/v1/projects?select=id,domain&limit=1&id=eq." + encodeURIComponent(projectId),
    { method: "GET" },
    accessToken
  );
  const projects = projectResponse.ok ? await projectResponse.json() : [];
  const project = projects?.[0];

  if (!project?.domain) {
    return NextResponse.json({ error: "Project website missing." }, { status: 404 });
  }

  try {
    const fetched = await fetchPublicWebsite(project.domain);
    const audit = analyseWebsite(fetched.html, fetched.url.hostname);

    const insert = await supabaseRest("/rest/v1/scans", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: randomUUID(),
        project_id: projectId,
        lead_id: null,
        scan_type: "website_readiness",
        score: audit.score,
        summary: audit.summary,
        methodology: audit.methodology,
        raw_result: audit
      })
    }, accessToken);

    if (!insert.ok) {
      console.error("Saved scan insert failed", insert.status, await insert.text());
      return NextResponse.json({ error: "Scan completed but could not be saved." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ...audit });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not complete the scan." },
      { status: 400 }
    );
  }
}
