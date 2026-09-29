import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://fcewymfohipvosvpfmos.supabase.co";
const SUPABASE_KEY = "sb_publishable_-GBVN6VtM9U_tQWgVy3S2g_q0y-zAYL";

function tokenExpiresSoon(token?: string) {
  if (!token) return true;
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    const exp = Number(decoded?.exp || 0);
    return !exp || exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const accessToken = request.cookies.get("ss_access_token")?.value;
  const refreshToken = request.cookies.get("ss_refresh_token")?.value;

  if (!refreshToken || !tokenExpiresSoon(accessToken)) {
    return response;
  }

  try {
    const refresh = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store"
    });

    const data = await refresh.json().catch(() => ({}));

    if (!refresh.ok || !data?.access_token) {
      response.cookies.delete("ss_access_token");
      response.cookies.delete("ss_refresh_token");
      return response;
    }

    response.cookies.set("ss_access_token", data.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(60, Number(data.expires_in || 3600))
    });

    if (data?.refresh_token) {
      response.cookies.set("ss_refresh_token", data.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30
      });
    }
  } catch {
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/onboarding/:path*", "/api/onboarding/:path*", "/api/projects/:path*", "/api/competitors/:path*", "/api/reports/:path*", "/api/visibility/:path*", "/api/auth/logout"]
};
