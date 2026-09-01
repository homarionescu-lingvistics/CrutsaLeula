import Link from "next/link";
import { getActiveListings } from "@/lib/listings/queries";
import { getSessionUser } from "@/lib/auth/session";
import { FeedList } from "@/components/feed/feed-list";
import { CreateListingForm } from "@/components/piata/create-listing-form";
import { BrandSearchPanel } from "@/components/piata/brand-search-panel";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";

export default async function PiataPage() {
  const [listings, user] = await Promise.all([
    getActiveListings(50),
    getSessionUser(),
  ]);

  const products = listings.filter((l) => l.type === "product" || l.type === "service");

  return (
    <div className="space-y-6 piata-tab">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900">Mânzare & Prăvălii 🧺</h1>
        <p className="text-sm text-zinc-500">Produse, recoltă, servicii locale.</p>
        {!user ? (
          <Link href="/auth/login?next=/piata">
            <Button variant="ghost" className="w-full">
              Autentifică-te ca să publici
            </Button>
          </Link>
        ) : (
          <CreateListingForm />
        )}
      </header>

      <Section
        title="Romanitate produs"
        description="Scanează cod de bare sau caută după nume"
      >
        <BrandSearchPanel />
      </Section>

      <Section title="Piața" description={`${products.length} anunțuri`}>
        <FeedList listings={products} />
      </Section>
    </div>
  );
}
