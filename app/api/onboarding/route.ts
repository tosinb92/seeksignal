import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "../../../lib/auth/session";
import { supabaseRest } from "../../../lib/supabase/rest";

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

  const existingMembershipResponse = await supabaseRest(
    "/rest/v1/organization_members?select=organization_id&user_id=eq." + encodeURIComponent(user.id) + "&limit=1",
    { method: "GET" },
    accessToken
  );
  const existingMemberships = existingMembershipResponse.ok ? await existingMembershipResponse.json() : [];

  if (existingMemberships?.length) {
    const organizationId = existingMemberships[0].organization_id;
    const existingProjectResponse = await supabaseRest(
      "/rest/v1/projects?select=id&organization_id=eq." + encodeURIComponent(organizationId) + "&order=created_at.asc&limit=1",
      { method: "GET" },
      accessToken
    );
    const existingProjects = existingProjectResponse.ok ? await existingProjectResponse.json() : [];

    return NextResponse.json({
      ok: true,
      organizationId,
      projectId: existingProjects?.[0]?.id ?? null,
      alreadyOnboarded: true
    });
  }

  const body = await request.json();
  const business = typeof body?.business === "string" ? body.business.trim() : "";
  const website = typeof body?.website === "string" ? body.website.trim() : "";
  const market = typeof body?.market === "string" ? body.market.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";
  const audience = typeof body?.audience === "string" ? body.audience.trim() : "";
  const leadId = typeof body?.leadId === "string" && /^[0-9a-f-]{36}$/i.test(body.leadId) ? body.leadId : null;

  if (business.length < 2 || website.length < 3 || category.length < 2) {
    return NextResponse.json({ error: "Enter your business name, website and business category." }, { status: 400 });
  }

  const rpcResponse = await supabaseRest("/rest/v1/rpc/complete_onboarding", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      p_business: business,
      p_website: website,
      p_market: market || null,
      p_category: category,
      p_lead_id: leadId
    })
  }, accessToken);

  if (!rpcResponse.ok) {
    const detail = await rpcResponse.text();
    console.error("Onboarding transaction failed", rpcResponse.status, detail);
    return NextResponse.json(
      { error: "We couldn't create your workspace. Please try again." },
      { status: 500 }
    );
  }

  const data = await rpcResponse.json();
  const result = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({
    ok: true,
    organizationId: result?.organization_id ?? null,
    projectId: result?.project_id ?? null
  });
}
