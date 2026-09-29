import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseRest } from "../../../lib/supabase/rest";
import { analyseWebsite, fetchPublicWebsite } from "../../../lib/audit/scanner";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.url || typeof body.url !== "string") {
      return NextResponse.json({ error: "Enter a website first." }, { status: 400 });
    }
    if (!body?.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      return NextResponse.json({ error: "Enter your name to unlock the report." }, { status: 400 });
    }
    if (!body?.email || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      return NextResponse.json({ error: "Enter a valid work email to unlock the report." }, { status: 400 });
    }
    if (!body?.business || typeof body.business !== "string" || body.business.trim().length < 2) {
      return NextResponse.json({ error: "Enter your business name to unlock the report." }, { status: 400 });
    }

    const fetched = await fetchPublicWebsite(body.url);
    const audit = analyseWebsite(fetched.html, fetched.url.hostname);

    const leadId = randomUUID();

    const leadResponse = await supabaseRest("/rest/v1/leads", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: leadId,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        business_name: body.business.trim(),
        website: fetched.url.toString(),
        source: "free_scan"
      })
    });

    if (!leadResponse.ok) {
      const detail = await leadResponse.text();
      console.error("Lead persistence failed", leadResponse.status, detail);
      return NextResponse.json(
        { error: "We completed the scan but couldn't securely save your report. Please try again." },
        { status: 500 }
      );
    }

    const resultPayload = { leadId, ...audit };

    const scanResponse = await supabaseRest("/rest/v1/scans", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: randomUUID(),
        project_id: null,
        lead_id: leadId,
        scan_type: "website_readiness",
        score: audit.score,
        summary: audit.summary,
        methodology: audit.methodology,
        raw_result: resultPayload
      })
    });

    if (!scanResponse.ok) {
      const detail = await scanResponse.text();
      console.error("Scan persistence failed", scanResponse.status, detail);
      return NextResponse.json(
        { error: "We completed the scan but couldn't securely save your report. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(resultPayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "We couldn't complete the scan. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
