"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinHandshake } from "@/lib/trust/handshake-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function JoinHandshakeForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-sky-300 bg-sky-50 p-4">
      <p className="text-sm font-semibold text-sky-900">Bate palma (Confirmare sigură)</p>
      <p className="mt-1 text-xs text-zinc-600">
        Ai găsit pe cineva să te ajute? Introduceți amândoi acest cod pe telefoanele voastre când
        marfa a ajuns la destinație pentru a crește în comunitate!
      </p>
      <form
        className="mt-3 space-y-3"
        action={(formData) => {
          setError(null);
          setOk(null);
          startTransition(async () => {
            const result = await joinHandshake(formData);
            if (result?.error) setError(result.error);
            else {
              setOk("Ești conectat! Confirmați amândoi mai jos.");
              router.refresh();
            }
          });
        }}
      >
        <Input
          label="Cod bate palma"
          name="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          placeholder="123456"
        />
        {error ? (
          <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : null}
        {ok ? (
          <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{ok}</p>
        ) : null}
        <Button type="submit" variant="ghost" className="w-full border border-sky-200" disabled={pending}>
          {pending ? "Verific…" : "Intră în bate palma"}
        </Button>
      </form>
    </div>
  );
}
