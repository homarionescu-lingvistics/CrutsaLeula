"use client";

import { SocialLoginButtons } from "@/components/auth/social-login-buttons";

/** @deprecated Folosește SocialLoginButtons — păstrat pentru compatibilitate. */
export function GoogleLoginButton() {
  return <SocialLoginButtons providers={["google"]} />;
}
