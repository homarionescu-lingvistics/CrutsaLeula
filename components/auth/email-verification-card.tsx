"use client";

import { useState, useTransition } from "react";
import type { User } from "@supabase/supabase-js";
import { resendVerificationEmail } from "@/lib/auth/actions";
import { isGoogleUser } from "@/lib/auth/google-utils";
import { Button } from "@/components/ui/button";

type Props = {
  user: User;
};

export function EmailVerificationCard({ user }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const googleAccount = isGoogleUser(user);
  const verified = googleAccount || Boolean(user.email_confirmed_at);

  const handleResend = () => {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await resendVerificationEmail();
      if (result?.error) {
        setError(result.error);
      } else {
        setMessage(result?.message ?? "Email trimis.");
      }
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Email cont</h2>
      <p className="text-sm text-zinc-700">{user.email ?? "—"}</p>

      {verified ? (
        <p className="text-sm font-medium text-emerald-700">
          {googleAccount ? "Verificat prin Google ✓" : "Email confirmat ✓"}
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-amber-800">
            Emailul nu este confirmat. Verifică inbox-ul sau retrimite linkul.
          </p>
          <Button
            type="button"
            variant="ghost"
            className="w-full border border-zinc-200"
            disabled={pending}
            onClick={handleResend}
          >
            {pending ? "Se trimite…" : "Retrimite email de verificare"}
          </Button>
        </div>
      )}

      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
