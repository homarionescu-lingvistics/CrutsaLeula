"use client";

import { SocialLoginButtons } from "@/components/auth/social-login-buttons";

type Props = {
  label?: string;
  className?: string;
};

/** @deprecated Folosește SocialLoginButtons — păstrat pentru compatibilitate. */
export function GoogleLoginButton(_props: Props = {}) {
  return <SocialLoginButtons providers={["google"]} />;
}
