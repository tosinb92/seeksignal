import "server-only";

function getStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured.");
  return key;
}

async function stripeRequest(path: string, init: RequestInit = {}) {
  const response = await fetch("https://api.stripe.com" + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + getStripeKey(),
      ...(init.headers || {})
    },
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Stripe request failed.");
  return data;
}

export async function createCheckoutSession(args: {
  email: string;
  userId: string;
  organizationId: string;
  origin: string;
}) {
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) throw new Error("SeekSignal Pro price is not configured.");

  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("customer_email", args.email);
  body.set("client_reference_id", args.organizationId);
  body.set("line_items[0][price]", priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("subscription_data[metadata][organization_id]", args.organizationId);
  body.set("subscription_data[metadata][seeksignal_user_id]", args.userId);
  body.set("success_url", args.origin + "/api/billing/confirm?session_id={CHECKOUT_SESSION_ID}");
  body.set("cancel_url", args.origin + "/app?billing=cancelled");
  body.set("allow_promotion_codes", "true");

  return stripeRequest("/v1/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
}

export async function getCheckoutSession(id: string) {
  return stripeRequest("/v1/checkout/sessions/" + encodeURIComponent(id));
}

export async function createPortalSession(customerId: string, origin: string) {
  const body = new URLSearchParams();
  body.set("customer", customerId);
  body.set("return_url", origin + "/app");
  return stripeRequest("/v1/billing_portal/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
}
