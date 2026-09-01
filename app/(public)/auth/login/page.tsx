import { Section } from "@/components/ui/section";
import { PhoneLoginForm } from "@/components/auth/phone-login-form";

const ERRORS: Record<string, string> = {
  "link-invalid": "Link invalid. Cere un SMS nou.",
  "link-expirat": "Link expirat (15 min). Cere un SMS nou.",
  autentificare: "Nu am putut intra în cont. Încearcă din nou.",
};

type Props = { searchParams: { error?: string; next?: string } };

export default function LoginPage({ searchParams }: Props) {
  const hint = searchParams.error ? ERRORS[searchParams.error] ?? null : null;

  return (
    <div className="auth-login">
      <Section
        title="Intră în cont"
        description="Doar număr de telefon — fără parolă."
      >
        <PhoneLoginForm errorHint={hint} />
      </Section>
    </div>
  );
}
