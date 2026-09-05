import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { getOpenClearingOffers } from "@/lib/scofaluta/queries";
import { offersMatch } from "@/lib/clearing/types";
import { ClearingOfferForm } from "@/components/scofaluta/clearing-offer-form";
import { ClearingList } from "@/components/scofaluta/clearing-list";
import { Section } from "@/components/ui/section";

export default async function ScofalutaPage() {
  const [{ user }, offers] = await Promise.all([
    getCurrentProfile(),
    getOpenClearingOffers(),
  ]);

  const myOffers = offers.filter((o) => o.user_id === user?.id);
  const matchIds = new Set<string>();
  for (const mine of myOffers) {
    for (const other of offers) {
      if (offersMatch(mine, other)) {
        matchIds.add(mine.id);
        matchIds.add(other.id);
      }
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900">Scofalută 🪙</h1>
        <p className="text-sm text-zinc-500">Circuit P2P — eu dau, tu dai.</p>
      </header>

      <Section title="Circuit P2P" description="Eu dau — tu dai. Fără cash.">
        {user ? (
          <ClearingOfferForm />
        ) : (
          <p className="text-sm text-zinc-500">
            <Link href="/auth/login?next=/scofaluta" className="underline">
              Autentifică-te
            </Link>{" "}
            ca să oferi schimb.
          </p>
        )}
        <div className="mt-4">
          <ClearingList offers={offers} userId={user?.id ?? null} matchIds={matchIds} />
        </div>
      </Section>
    </div>
  );
}
