export function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase is not configured");
  }

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
