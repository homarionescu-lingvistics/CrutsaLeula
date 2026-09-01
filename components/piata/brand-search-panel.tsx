"use client";

import { useCallback, useState } from "react";
import type { BrandRomanitate } from "@/lib/supabase/types";
import { applyKioskReceiptBonus } from "@/lib/piata/receipt-actions";
import { ProductScoreCard } from "@/components/piata/ProductScoreCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  initialResults?: BrandRomanitate[];
  alternatives?: Record<string, BrandRomanitate | null>;
};

export function BrandSearchPanel({ initialResults = [], alternatives = {} }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BrandRomanitate[]>(initialResults);
  const [altMap, setAltMap] = useState(alternatives);
  const [loading, setLoading] = useState(false);
  const [receiptText, setReceiptText] = useState("");
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/piata/brand-search?q=${encodeURIComponent(trimmed)}`);
      const data = (await res.json()) as {
        results: BrandRomanitate[];
        alternatives: Record<string, BrandRomanitate | null>;
      };
      setResults(data.results ?? []);
      setAltMap(data.alternatives ?? {});
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleReceiptBonus() {
    setBonusMsg(null);
    const result = await applyKioskReceiptBonus(receiptText);
    setBonusMsg(result.message);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Input
          label="Caută produs (nume sau cod de bare)"
          placeholder="ex: 594 sau Coca-Cola"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            void search(e.target.value);
          }}
        />
        {loading ? <p className="text-sm text-zinc-500">Se caută…</p> : null}
      </div>

      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((brand) => (
            <div key={brand.id} className="space-y-3">
              <ProductScoreCard brand={brand} />
              {altMap[brand.id] ? (
                <ProductScoreCard
                  brand={altMap[brand.id]!}
                  label="Alternativă românească"
                  compact
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : query.trim().length >= 2 && !loading ? (
        <p className="text-sm text-zinc-500">Niciun brand găsit în baza de date.</p>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-800">Bon chioșc mic (OCR)</h2>
        <p className="text-xs text-zinc-500">
          Lipește textul scanat de pe bon (Articol 1, dată, sumă totală). Bonus +20 puncte Koson.
        </p>
        <textarea
          className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/40 placeholder:text-zinc-400 focus:ring-2"
          rows={4}
          placeholder="Articol 1 ... Suma Totală: 25.50 ..."
          value={receiptText}
          onChange={(e) => setReceiptText(e.target.value)}
        />
        <Button type="button" className="w-full" onClick={() => void handleReceiptBonus()}>
          Verifică bon & acordă bonus
        </Button>
        {bonusMsg ? (
          <p className={`text-sm ${bonusMsg.startsWith("+") ? "text-emerald-600" : "text-zinc-500"}`}>
            {bonusMsg}
          </p>
        ) : null}
      </section>
    </div>
  );
}
