const DEFAULT_SUPABASE_URL = "https://fcewymfohipvosvpfmos.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-GBVN6VtM9U_tQWgVy3S2g_q0y-zAYL";

export function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  return { url, publishableKey };
}

export async function supabaseRest(
  path: string,
  init: RequestInit = {},
  accessToken?: string
) {
  const { url, publishableKey } = getSupabaseServerConfig();

  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken || publishableKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    cache: "no-store"
  });
}
