"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MagicLinkForm() {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      setError("Introdu adresa de email.");
      setPending(false);
      return;
    }

    try {
      const supabase = createClient();
      const next = searchParams.get("next") ?? "/cont";
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });

      if (otpError) {
        setError(otpError.message);
      } else {
        setMessage("Verifică emailul — ți-am trimis linkul de autentificare.");
      }
    } catch {
      setError("Nu am putut trimite linkul. Încearcă din nou.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="tu@email.com"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Se trimite…" : "Trimite Magic Link"}
      </Button>
    </form>
  );
}
