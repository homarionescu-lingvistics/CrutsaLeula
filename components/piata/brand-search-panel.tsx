"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandRomanitate } from "@/lib/supabase/types";
import { applyKioskReceiptBonus } from "@/lib/piata/receipt-actions";
import {
  buildKioskReceiptText,
  geminiIdentifyProductBrand,
  geminiParseReceipt,
  getStoredGeminiKey,
  setStoredGeminiKey,
} from "@/lib/piata/gemini-client";
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
  const [ocrLoading, setOcrLoading] = useState(false);
  const [receiptMagazin, setReceiptMagazin] = useState("");
  const [receiptTotal, setReceiptTotal] = useState("");
  const [receiptText, setReceiptText] = useState("");
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiError, setGeminiError] = useState<string | null>(null);

  useEffect(() => {
    setGeminiKey(getStoredGeminiKey());
  }, []);

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

  function saveGeminiKey(value: string) {
    setGeminiKey(value);
    setStoredGeminiKey(value);
  }

  async function handleReceiptBonus(text = receiptText) {
    setBonusMsg(null);
    const result = await applyKioskReceiptBonus(text);
    setBonusMsg(result.message);
  }

  async function handleProductCamera(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setGeminiError(null);
    setOcrLoading(true);
    try {
      const brand = await geminiIdentifyProductBrand(file, geminiKey);
      setQuery(brand);
      await search(brand);
    } catch (err) {
      setGeminiError(err instanceof Error ? err.message : "Scanarea produsului a eșuat.");
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleReceiptCamera(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setGeminiError(null);
    setOcrLoading(true);
    try {
      const { magazin, total } = await geminiParseReceipt(file, geminiKey);
      const text = buildKioskReceiptText(magazin, total);
      setReceiptMagazin(magazin);
      setReceiptTotal(String(total));
      setReceiptText(text);
      await handleReceiptBonus(text);
    } catch (err) {
      setGeminiError(err instanceof Error ? err.message : "Scanarea bonului a eșuat.");
    } finally {
      setOcrLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <details className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-700">
          Cheie API Gemini (stocată local pe telefon)
        </summary>
        <div className="mt-2 space-y-1">
          <input
            type="password"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            placeholder="AIza..."
            value={geminiKey}
            onChange={(e) => saveGeminiKey(e.target.value)}
          />
          <p>Cheia rămâne în browser (`localStorage`). Apelurile Gemini se fac direct de pe dispozitivul tău.</p>
        </div>
      </details>

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
        <label
          htmlFor="product-camera-input"
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-800 p-3 text-center font-bold text-white shadow-sm hover:bg-zinc-700"
        >
          📷 FOTO RAFT / PRODUS
        </label>
        <input
          id="product-camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleProductCamera(e)}
        />
        {loading || ocrLoading ? (
          <p className="text-sm text-zinc-500">
            {ocrLoading ? "Gemini analizează poza…" : "Se caută…"}
          </p>
        ) : null}
        {geminiError ? <p className="text-sm text-red-600">{geminiError}</p> : null}
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
          Fă poză la bon sau completează manual. Bonus +20 puncte Koson.
        </p>
        <Input
          label="Magazin"
          placeholder="ex: Chioșc Rahova"
          value={receiptMagazin}
          onChange={(e) => {
            const magazin = e.target.value;
            setReceiptMagazin(magazin);
            const total = Number(receiptTotal.replace(",", "."));
            if (magazin && Number.isFinite(total) && total > 0) {
              setReceiptText(buildKioskReceiptText(magazin, total));
            }
          }}
        />
        <Input
          label="Sumă totală (Lei)"
          placeholder="ex: 25.50"
          value={receiptTotal}
          onChange={(e) => {
            const totalStr = e.target.value;
            setReceiptTotal(totalStr);
            const total = Number(totalStr.replace(",", "."));
            if (receiptMagazin && Number.isFinite(total) && total > 0) {
              setReceiptText(buildKioskReceiptText(receiptMagazin, total));
            }
          }}
        />
        <textarea
          className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/40 placeholder:text-zinc-400 focus:ring-2"
          rows={3}
          placeholder="Text bon generat automat din poză…"
          value={receiptText}
          onChange={(e) => setReceiptText(e.target.value)}
        />
        <label
          htmlFor="receipt-camera-input"
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 p-4 text-center font-bold text-white shadow-md hover:bg-emerald-500"
        >
          📸 FĂ POZĂ LA BON (DESCHIDE CAMERĂ)
        </label>
        <input
          id="receipt-camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleReceiptCamera(e)}
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
