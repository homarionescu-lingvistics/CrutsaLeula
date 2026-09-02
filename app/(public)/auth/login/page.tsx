import Link from "next/link";
import { Suspense } from "react";
import { Section } from "@/components/ui/section";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { SignupForm } from "@/components/auth/signup-form";

const ERRORS: Record<string, string> = {
  "link-invalid": "Link invalid. Încearcă din nou.",
  "link-expirat": "Link expirat. Autentifică-te din nou.",
  autentificare: "Nu am putut intra în cont. Încearcă din nou.",
};

type Props = { searchParams: { error?: string; next?: string } };

export default function LoginPage({ searchParams }: Props) {
  const hint = searchParams.error ? ERRORS[searchParams.error] ?? null : null;

  return (
    <div className="auth-login">
      <Section
        title="Intră în cont"
        description="Conectează-te cu Google pentru scanare AI și cont Koson."
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-zinc-800">
            <p className="font-semibold">De ce Google?</p>
            <p className="mt-2">
              Scanarea bonurilor și produselor folosește contul tău Google — fără costuri pe
              serverul nostru.
            </p>
          </div>

          {hint ? <p className="text-sm text-red-600">{hint}</p> : null}

          <Suspense fallback={<p className="text-sm text-zinc-500">Se încarcă…</p>}>
            <GoogleLoginButton />
          </Suspense>

          <p className="text-center text-xs text-zinc-500">
            La prima conectare, Google îți cere permisiunea pentru scanare AI (Gemini).
          </p>
        </div>
      </Section>

      <Section title="Cont cu email (alternativ)" description="Pentru testare sau fără Google.">
        <SignupForm />
        <p className="mt-3 text-center text-xs text-zinc-500">
          Ai deja cont?{" "}
          <Link href="/auth/signup" className="underline">
            Înregistrare email
          </Link>
        </p>
      </Section>
    </div>
  );
}
