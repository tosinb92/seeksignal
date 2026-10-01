import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "../../../../lib/auth/session";
import { supabaseRest } from "../../../../lib/supabase/rest";
import { createCheckoutSession } from "../../../../lib/billing/stripe";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.id || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const store = await cookies();
    const token = store.get("ss_access_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membershipResponse = await supabaseRest(
      "/rest/v1/organization_members?select=organization_id&user_id=eq." + encodeURIComponent(user.id) + "&limit=1",
      { method: "GET" },
      token
    );
    const memberships = membershipResponse.ok ? await membershipResponse.json() : [];
    const organizationId = memberships?.[0]?.organization_id;
    if (!organizationId) return NextResponse.json({ error: "Complete onboarding first." }, { status: 400 });

    const session = await createCheckoutSession({
      email: user.email,
      userId: user.id,
      organizationId,
      origin: new URL(request.url).origin
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start checkout." },
      { status: 500 }
    );
  }
}
