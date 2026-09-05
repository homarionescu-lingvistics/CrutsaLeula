"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Provider = "facebook" | "google";

type Props = {
  providers?: Provider[];
};

export function SocialLoginButtons({
  providers = ["facebook", "google"],
}: Props) {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSocial(provider: Provider) {
    setPending(provider);
    setError(null);

    try {
      const supabase = createClient();
      const next = searchParams.get("next") ?? "/cont";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });

      if (oauthError) {
        setError(oauthError.message);
        setPending(null);
      }
    } catch {
      setError("Nu am putut deschide autentificarea socială.");
      setPending(null);
    }
  }

  const labels: Record<Provider, string> = {
    facebook: "Continuă cu Facebook",
    google: "Continuă cu Google",
  };

  return (
    <div className="space-y-2">
      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="ghost"
          className="w-full border border-zinc-200"
          disabled={pending !== null}
          onClick={() => void handleSocial(provider)}
        >
          {pending === provider ? "Se deschide…" : labels[provider]}
        </Button>
      ))}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
