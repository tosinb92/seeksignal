import { cookies } from "next/headers";
import { supabaseRest } from "../supabase/rest";

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export async function getSessionUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const accessToken = store.get("ss_access_token")?.value;
  if (!accessToken) return null;

  const response = await supabaseRest("/auth/v1/user", { method: "GET" }, accessToken);
  if (!response.ok) return null;

  return response.json();
}
