"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const GEMINI_SCOPE = "https://www.googleapis.com/auth/generative-language";

type Props = {
  label?: string;
  className?: string;
};

export function GoogleLoginButton({
  label = "Continuă cu Google",
  className = "w-full",
}: Props) {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const next = searchParams.get("next") ?? "/cont";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          scopes: GEMINI_SCOPE,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setPending(false);
      }
    } catch {
      setError("Nu am putut deschide autentificarea Google.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" className={className} disabled={pending} onClick={() => void handleGoogleLogin()}>
        {pending ? "Se deschide Google…" : label}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
