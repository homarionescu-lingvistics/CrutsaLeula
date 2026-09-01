import type { BrandRomanitate } from "@/lib/supabase/types";

type CardTip = BrandRomanitate["categorie_tip"];

const CARD_CONFIG: Record<
  CardTip,
  { bg: string; tagline: string; icon: string; defaultRetention: string }
> = {
  1: {
    bg: "#4B5563",
    tagline: "moartea țării",
    icon: "💀",
    defaultRetention: "0%",
  },
  2: {
    bg: "#DC2626",
    tagline: "vinzi la străini",
    icon: "❌",
    defaultRetention: "0%",
  },
  3: {
    bg: "#EAB308",
    tagline: "mulți bani rămân pe glie",
    icon: "🌾",
    defaultRetention: "30–50%",
  },
  4: {
    bg: "#84CC16",
    tagline: "măcar banii finali ajung pe glie",
    icon: "🪙",
    defaultRetention: "60–80%",
  },
  5: {
    bg: "#2563EB",
    tagline: "libertatea țării",
    icon: "🛡️",
    defaultRetention: "100%",
  },
};

type Props = {
  brand: Pick<
    BrandRomanitate,
    "nume_brand" | "categorie_tip" | "procent_retentie_ron" | "cod_bare_prefix" | "cui"
  >;
  compact?: boolean;
  label?: string;
};

function formatRetention(brand: Props["brand"], tip: CardTip): string {
  if (brand.procent_retentie_ron != null) {
    return `${brand.procent_retentie_ron}%`;
  }
  return CARD_CONFIG[tip].defaultRetention;
}

const LIGHT_TEXT_TIPS: CardTip[] = [3, 4];
const BOLD_WHITE_TIPS: CardTip[] = [2, 5];

export function ProductScoreCard({ brand, compact = false, label }: Props) {
  const tip = brand.categorie_tip;
  const config = CARD_CONFIG[tip];
  const retention = formatRetention(brand, tip);
  const lightText = LIGHT_TEXT_TIPS.includes(tip);
  const boldWhite = BOLD_WHITE_TIPS.includes(tip);

  const titleClass = lightText
    ? "font-bold text-zinc-950"
    : boldWhite
      ? "font-bold text-white"
      : "font-bold text-white";
  const taglineClass = lightText
    ? "font-medium italic text-zinc-900"
    : boldWhite
      ? "font-semibold italic text-white"
      : "italic text-white";
  const badgeClass = lightText
    ? "rounded-full bg-black/10 px-2.5 py-1 font-semibold text-zinc-950"
    : "rounded-full bg-black/25 px-2.5 py-1 font-semibold text-white";
  const labelClass = boldWhite
    ? "mb-2 text-xs font-bold uppercase tracking-wide text-white"
    : lightText
      ? "mb-2 text-xs font-bold uppercase tracking-wide text-zinc-800"
      : "mb-2 text-xs font-bold uppercase tracking-wide text-white";

  return (
    <article
      className={`overflow-hidden rounded-2xl shadow-md ${compact ? "p-4" : "p-5"}`}
      style={{ backgroundColor: config.bg }}
    >
      {label ? <p className={labelClass}>{label}</p> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className={`${titleClass} ${compact ? "text-base" : "text-lg"}`}>
            {brand.nume_brand}
          </h3>
          <p className={`${taglineClass} ${compact ? "text-sm" : "text-base"}`}>
            {config.tagline}
          </p>
        </div>
        <span className="text-3xl" aria-hidden>
          {config.icon}
        </span>
      </div>
      <div className={`mt-4 flex flex-wrap items-center gap-2 text-xs ${lightText ? "text-zinc-950" : "text-white"}`}>
        <span className={badgeClass}>Retenție RON: {retention}</span>
        <span className={badgeClass}>Tip {tip}</span>
        {brand.cod_bare_prefix ? (
          <span className={badgeClass}>EAN {brand.cod_bare_prefix}…</span>
        ) : null}
        {brand.cui ? <span className={badgeClass}>CUI {brand.cui}</span> : null}
      </div>
    </article>
  );
}
