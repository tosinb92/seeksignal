import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "../../../../lib/auth/session";
import { supabaseRest } from "../../../../lib/supabase/rest";
import { createPortalSession } from "../../../../lib/billing/stripe";

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
    if (!organizationId) return NextResponse.json({ error: "No workspace found." }, { status: 400 });

    const customersResponse = await fetch(
      "https://api.stripe.com/v1/customers?email=" + encodeURIComponent(user.email) + "&limit=10",
      { headers: { Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY }, cache: "no-store" }
    );
    const customers = customersResponse.ok ? await customersResponse.json() : { data: [] };

    for (const customer of customers.data || []) {
      const subscriptionsResponse = await fetch(
        "https://api.stripe.com/v1/subscriptions?customer=" + encodeURIComponent(customer.id) + "&status=all&limit=20",
        { headers: { Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY }, cache: "no-store" }
      );
      const subscriptions = subscriptionsResponse.ok ? await subscriptionsResponse.json() : { data: [] };
      const match = (subscriptions.data || []).find((sub: any) =>
        sub.metadata?.organization_id === organizationId &&
        sub.items?.data?.some((item: any) => item.price?.id === process.env.STRIPE_PRO_PRICE_ID)
      );
      if (match) {
        const session = await createPortalSession(customer.id, new URL(request.url).origin);
        return NextResponse.json({ url: session.url });
      }
    }

    return NextResponse.json({ error: "No SeekSignal subscription found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not open billing." },
      { status: 500 }
    );
  }
}
