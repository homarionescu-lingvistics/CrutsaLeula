import Link from "next/link";
import { Suspense } from "react";
import { Section } from "@/components/ui/section";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { LoginForm } from "@/components/auth/login-form";

const ERRORS: Record<string, string> = {
  "link-invalid": "Link invalid. Încearcă din nou.",
  "link-expirat": "Link expirat. Autentifică-te din nou.",
  autentificare: "Nu am putut intra în cont. Încearcă din nou.",
};

type Props = { searchParams: { error?: string; next?: string } };

export default function LoginPage({ searchParams }: Props) {
  const hint = searchParams.error ? ERRORS[searchParams.error] ?? null : null;

  return (
    <div className="auth-login space-y-6">
      <Section
        title="Intră în cont"
        description="Magic Link pe email sau autentificare socială (Facebook / Google)."
      >
        <div className="space-y-4">
          {hint ? <p className="text-sm text-red-600">{hint}</p> : null}

          <Suspense fallback={<p className="text-sm text-zinc-500">Se încarcă…</p>}>
            <MagicLinkForm />
          </Suspense>

          <div className="relative py-2 text-center text-xs text-zinc-500">
            <span className="bg-zinc-100 px-2">sau</span>
          </div>

          <Suspense fallback={<p className="text-sm text-zinc-500">Se încarcă…</p>}>
            <SocialLoginButtons providers={["facebook", "google"]} />
          </Suspense>

          <p className="text-center text-xs text-zinc-500">
            Activează Facebook / Google în Supabase Dashboard → Authentication → Providers.
          </p>
        </div>
      </Section>

      <Section title="Email + parolă" description="Cont clasic, dacă ai deja parolă.">
        <LoginForm />
        <p className="mt-3 text-center text-xs text-zinc-500">
          Nu ai cont?{" "}
          <Link href="/auth/signup" className="underline">
            Creează unul
          </Link>
        </p>
      </Section>
    </div>
  );
}
