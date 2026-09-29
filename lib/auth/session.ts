import { cookies } from "next/headers";
import { supabaseRest } from "../supabase/rest";

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

async function refreshSession(refreshToken: string) {
  const response = await supabaseRest("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.access_token) return null;

  const store = await cookies();

  store.set("ss_access_token", data.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Number(data.expires_in || 3600))
  });

  if (data?.refresh_token) {
    store.set("ss_refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return data.access_token as string;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const store = await cookies();
  let accessToken = store.get("ss_access_token")?.value;
  const refreshToken = store.get("ss_refresh_token")?.value;

  if (!accessToken && refreshToken) {
    accessToken = await refreshSession(refreshToken) || undefined;
  }

  if (!accessToken) return null;

  let response = await supabaseRest("/auth/v1/user", { method: "GET" }, accessToken);

  if (response.ok) return response.json();

  if (response.status === 401 && refreshToken) {
    const refreshed = await refreshSession(refreshToken);
    if (!refreshed) return null;

    response = await supabaseRest("/auth/v1/user", { method: "GET" }, refreshed);
    if (response.ok) return response.json();
  }

  return null;
}
