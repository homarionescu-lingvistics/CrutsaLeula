import Link from "next/link";
import { getLogisticsListings } from "@/lib/listings/queries";
import { getSessionUser } from "@/lib/auth/session";
import { getUserListings } from "@/lib/listings/queries";
import { getOpenHandshakeForListing, getUserHandshakes } from "@/lib/trust/handshake-queries";
import { FeedList } from "@/components/feed/feed-list";
import { ActiveRoutesPanel } from "@/components/logistica/active-routes-panel";
import { CreateLogisticsForm } from "@/components/logistica/create-logistics-form";
import { JoinHandshakeForm } from "@/components/logistica/join-handshake-form";
import { HandshakePanel } from "@/components/logistica/handshake-panel";
import { MyLogisticsHandshakes } from "@/components/logistica/my-logistics-handshakes";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { isLogisticsType } from "@/lib/listings/labels";

export default async function LogisticaPage() {
  const [listings, user] = await Promise.all([
    getLogisticsListings(50),
    getSessionUser(),
  ]);

  const myListings = user ? await getUserListings(user.id) : [];
  const myLogistics = myListings.filter((l) => isLogisticsType(l.type));
  const userHandshakes = user ? await getUserHandshakes(user.id) : [];

  const openByListing: Record<string, Awaited<ReturnType<typeof getOpenHandshakeForListing>>> = {};
  for (const l of myLogistics) {
    if (l.status !== "closed") {
      openByListing[l.id] = await getOpenHandshakeForListing(l.id);
    }
  }

  const activePanels = userHandshakes.filter((h) => !h.confirmed_at);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">Strungă cu rost</h1>
        <p className="text-sm text-zinc-500">Logistica</p>
        {!user ? (
          <Link href="/auth/login?next=/logistica">
            <Button variant="ghost" className="w-full border border-zinc-200">
              Autentifică-te ca să publici
            </Button>
          </Link>
        ) : (
          <CreateLogisticsForm />
        )}
      </header>

      <JoinHandshakeForm />

      {user && activePanels.length > 0 ? (
        <Section title="Confirmări active" description="Bate palma pe ambele telefoane">
          {activePanels.map((hs) => {
            const listing = myListings.find((l) => l.id === hs.listing_id);
            return (
              <HandshakePanel
                key={hs.id}
                handshake={hs}
                userId={user.id}
                listingTitle={listing?.title ?? "Anunț"}
              />
            );
          })}
        </Section>
      ) : null}

      {user ? (
        <Section title="Anunțurile tale" description="Transport & utilaje">
          <MyLogisticsHandshakes
            listings={myListings}
            handshakes={openByListing}
            userId={user.id}
          />
        </Section>
      ) : null}

      <Section title="Rute active" description="Anonime — fără CUI sau nume firmă">
        <ActiveRoutesPanel />
      </Section>

      <Section title="Disponibil în zonă" description={`${listings.length} anunțuri`}>
        <FeedList
          listings={listings}
          emptyMessage="Niciun transport sau utilaj. Publică un anunț mai sus."
          detailBase="/logistica"
        />
      </Section>
    </div>
  );
}
