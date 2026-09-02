import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { isGoogleUser } from "@/lib/auth/google-utils";

export { isGoogleUser };

export async function getGoogleAccessTokenForScan(): Promise<{
  token: string;
  user: User;
} | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isGoogleUser(user)) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let token = session?.provider_token ?? null;
  if (!token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed.session?.provider_token ?? null;
  }

  if (!token) return null;
  return { token, user };
}
