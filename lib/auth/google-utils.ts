import type { User } from "@supabase/supabase-js";

export function isGoogleUser(user: User): boolean {
  if (user.app_metadata?.provider === "google") return true;
  return user.identities?.some((identity) => identity.provider === "google") ?? false;
}
