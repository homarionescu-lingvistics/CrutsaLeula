import Link from "next/link";
import dynamic from "next/dynamic";
import { Section } from "@/components/ui/section";

const BrandSearchPanel = dynamic(
  () => import("@/components/piata/brand-search-panel").then((m) => m.BrandSearchPanel),
  { ssr: false }
);

export default function PiataPage() {
  return (
    <div className="space-y-6 piata-tab">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900">Mânzare & Prăvălii 🧺</h1>
      </header>

      <Section
        title="Romanitate produs"
        description="Scanează cod de bare sau caută după nume"
      >
        <BrandSearchPanel />
      </Section>

      <Link
        href="/cereri"
        className="block w-full rounded-xl bg-zinc-700 px-4 py-3.5 text-center text-sm font-semibold text-white hover:bg-zinc-600"
      >
        Ce lipsește în cartier
      </Link>
    </div>
  );
}
