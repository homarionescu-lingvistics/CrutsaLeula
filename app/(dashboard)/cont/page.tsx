import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { buildWalletQrToken } from "@/lib/cont/rank";
import { getKosonTransactions } from "@/lib/supabase/wallet-queries";
import { NeighborhoodRankCard } from "@/components/cont/neighborhood-rank";
import { KosonWalletCard } from "@/components/cont/koson-wallet";
import { ReceiptHistoryFeed } from "@/components/cont/receipt-history";
import { Button } from "@/components/ui/button";

export default async function ContPage() {
  const { user, profile } = await getCurrentProfile();

  if (!user) {
    return (
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900">
        <h1 className="text-2xl font-bold">Cont</h1>
        <p className="text-sm text-zinc-600">Intră în cont ca să vezi portofelul Koson și rangul tău.</p>
        <Link href="/auth/login?next=/cont">
          <Button className="w-full">Autentificare</Button>
        </Link>
      </div>
    );
  }

  const kosonBalance = profile?.koson_balance ?? 0;
  const xpPoints = profile?.xp_points ?? 0;
  const transactions = await getKosonTransactions(user.id);
  const qrToken = buildWalletQrToken(user.id, kosonBalance);

  return (
    <div className="space-y-6 text-zinc-900">
      <header className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
          Tab 5 · Profil
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">
          {profile?.full_name ?? user.email ?? "Utilizator"}
        </h1>
        <p className="text-sm text-zinc-600">
          {profile?.company_name ?? "Cetățean Cruțănomia-RON"}
        </p>
      </header>

      <NeighborhoodRankCard xpPoints={xpPoints} />
      <KosonWalletCard balance={kosonBalance} qrToken={qrToken} />
      <ReceiptHistoryFeed items={transactions} />
    </div>
  );
}
