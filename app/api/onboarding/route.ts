import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "../../../lib/auth/session";
import { supabaseRest } from "../../../lib/supabase/rest";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
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

  const body = await request.json();
  const business = typeof body?.business === "string" ? body.business.trim() : "";
  const website = typeof body?.website === "string" ? body.website.trim() : "";
  const market = typeof body?.market === "string" ? body.market.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";
  const audience = typeof body?.audience === "string" ? body.audience.trim() : "";

  if (business.length < 2 || website.length < 3) {
    return NextResponse.json({ error: "Enter your business name and website." }, { status: 400 });
  }

  const organizationId = randomUUID();
  const projectId = randomUUID();
  const organizationSlug = `${slugify(business) || "workspace"}-${organizationId.slice(0, 6)}`;

  const orgResponse = await supabaseRest("/rest/v1/organizations", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      id: organizationId,
      name: business,
      slug: organizationSlug,
      owner_user_id: user.id
    })
  }, accessToken);

  if (!orgResponse.ok) {
    console.error("Organization creation failed", orgResponse.status, await orgResponse.text());
    return NextResponse.json({ error: "Could not create your workspace." }, { status: 500 });
  }

  const projectResponse = await supabaseRest("/rest/v1/projects", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      id: projectId,
      organization_id: organizationId,
      name: business,
      domain: website,
      market: market || null,
      category: category || audience || null,
      status: "active",
      created_by: user.id
    })
  }, accessToken);

  if (!projectResponse.ok) {
    console.error("Project creation failed", projectResponse.status, await projectResponse.text());
    return NextResponse.json({ error: "Workspace created, but the first project could not be added." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, organizationId, projectId });
}
