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
    "/rest/v1/projects?select=id,name,domain,market,category&limit=1&id=eq." + encodeURIComponent(projectId),
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
    const audit = analyseWebsite(fetched.html, fetched.url.hostname, {
      businessName: project.name,
      category: project.category || "",
      market: project.market || ""
    });

    const scanId = randomUUID();
    const insert = await supabaseRest("/rest/v1/scans", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: scanId,
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

    const findings = audit.opportunities.slice(0, 3);
    const syncResults = await Promise.all(findings.map(async (finding: any) => {
      const titleFilter = encodeURIComponent(`"${finding.title.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`);
      const lookup = await supabaseRest(
        "/rest/v1/findings?select=id&project_id=eq." + encodeURIComponent(projectId) + "&title=eq." + titleFilter + "&limit=1",
        { method: "GET" },
        accessToken
      );
      if (!lookup.ok) return false;
      const existing = await lookup.json();
      const payload = {
        project_id: projectId,
        scan_id: scanId,
        finding_type: "website_readiness",
        category: "website_readiness",
        severity: finding.impact || "medium",
        title: finding.title,
        description: finding.problem || finding.evidence || null,
        evidence: {
          class: finding.evidenceClass || "VERIFIED",
          confidence: finding.confidence || "medium",
          source_url: finding.sourceUrl || fetched.url.toString(),
          collected_at: finding.collectedAt || new Date().toISOString(),
          observation: finding.evidence || null,
          priority: finding.priority || null
        },
        recommendation: finding.action,
        last_detected_at: new Date().toISOString()
      };
      const saved = existing?.[0]?.id
        ? await supabaseRest("/rest/v1/findings?id=eq." + encodeURIComponent(existing[0].id), {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify(payload)
          }, accessToken)
        : await supabaseRest("/rest/v1/findings", {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify(payload)
          }, accessToken);
      return saved.ok;
    }));

    if (syncResults.some((ok) => !ok)) {
      console.error("Growth Blueprint sync incomplete", { projectId, scanId });
    }

    return NextResponse.json({ ok: true, blueprintSynced: syncResults.every(Boolean), ...audit });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not complete the scan." },
      { status: 400 }
    );
  }
}
