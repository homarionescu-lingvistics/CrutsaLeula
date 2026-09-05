import { getActiveListings } from "@/lib/listings/queries";
import { getSessionUser } from "@/lib/auth/session";
import { CatunActions } from "@/components/feed/catun-actions";
import { FeedList } from "@/components/feed/feed-list";
import { Section } from "@/components/ui/section";

const LOCAL_SITES = [
  { href: "https://semanticshift.ai", label: "semanticshift.ai" },
  { href: "https://urmarestebani.ro", label: "urmarestebani.ro" },
  { href: "https://www.risco.ro", label: "RisCo" },
  { href: "https://www.onrc.ro", label: "ONRC" },
  { href: "https://www.anaf.ro", label: "ANAF" },
] as const;

export default async function HomePage() {
  const [listings, user] = await Promise.all([
    getActiveListings(20),
    getSessionUser(),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">La Cătun</h1>
        <p className="text-sm text-zinc-500">
          Ce e nou în zona ta — scroll simplu, buton verde Sună.
        </p>
        <CatunActions loggedIn={Boolean(user)} />
      </header>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600">
          Website-uri locale
        </p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-900">
          Website-uri și soluții românești
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {LOCAL_SITES.map((site) => (
            <li key={site.href}>
              <a
                className="block rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-medium text-emerald-700 hover:bg-emerald-50"
                href={site.href}
                target="_blank"
                rel="noreferrer"
              >
                {site.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <Section title="Ultimele anunțuri" description={`${listings.length} active`}>
        <FeedList
          listings={listings}
          emptyMessage="Niciun anunț. Publică aici sau mergi la Mânzare."
        />
      </Section>
    </div>
  );
}
