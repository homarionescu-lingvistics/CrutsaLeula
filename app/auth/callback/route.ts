import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/cont";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=autentificare`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=autentificare`);
  }

  const safeNext = next.startsWith("/") ? next : "/cont";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
