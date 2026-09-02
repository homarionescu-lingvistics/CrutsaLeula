"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandRomanitate } from "@/lib/supabase/types";
import type { WorthItAlternative } from "@/lib/produse/trip-worth";
import { extractSearchTermsFromOcr, runOcrOnImageFile } from "@/lib/produse/ocr-client";
import { isKioskReceipt } from "@/lib/piata/receipt-ocr";
import { applyKioskReceiptBonus } from "@/lib/piata/receipt-actions";
import { ProductScoreCard } from "@/components/piata/ProductScoreCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/ui/section";

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "error"; message: string };

type BrandSearchPayload = {
  results: BrandRomanitate[];
  alternatives: Record<string, BrandRomanitate | null>;
};

export function ProduseTabPanel() {
  const [query, setQuery] = useState("");
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [brandResults, setBrandResults] = useState<BrandRomanitate[]>([]);
  const [altMap, setAltMap] = useState<Record<string, BrandRomanitate | null>>({});
  const [alternatives, setAlternatives] = useState<WorthItAlternative[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptText, setReceiptText] = useState("");
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo({ status: "error", message: "Geolocația nu este disponibilă pe acest dispozitiv." });
      return;
    }

    setGeo({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          status: "ready",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setGeo({
          status: "error",
          message: "Activează locația pentru calculul „Merită deplasarea?” în București/Rahova.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  const fetchBrandSearch = useCallback(
    async (q: string): Promise<BrandSearchPayload> => {
      const params = new URLSearchParams({ q });
      if (geo.status === "ready") {
        params.set("lat", String(geo.lat));
        params.set("lng", String(geo.lng));
      }
      const res = await fetch(`/api/piata/brand-search?${params.toString()}`);
      return (await res.json()) as BrandSearchPayload;
    },
    [geo]
  );

  const fetchTripAlternatives = useCallback(
    async (q: string) => {
      if (geo.status !== "ready") return [];
      const params = new URLSearchParams({
        q,
        lat: String(geo.lat),
        lng: String(geo.lng),
      });
      const res = await fetch(`/api/produse/monitor-search?${params.toString()}`);
      const data = (await res.json()) as { alternatives?: WorthItAlternative[] };
      return data.alternatives ?? [];
    },
    [geo]
  );

  const runSearch = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed.length < 2) {
        setBrandResults([]);
        setAltMap({});
        setAlternatives([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [brandData, tripData] = await Promise.all([
          fetchBrandSearch(trimmed),
          fetchTripAlternatives(trimmed),
        ]);
        setBrandResults(brandData.results ?? []);
        setAltMap(brandData.alternatives ?? {});
        setAlternatives(tripData);
      } catch {
        setError("Căutarea a eșuat.");
      } finally {
        setLoading(false);
      }
    },
    [fetchBrandSearch, fetchTripAlternatives]
  );

  const runMultiTermSearch = useCallback(
    async (ocrText: string) => {
      const terms = extractSearchTermsFromOcr(ocrText);
      if (!terms.length) {
        setError("Nu am detectat text util în poză.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const payloads = await Promise.all(terms.map((term) => fetchBrandSearch(term)));
        const merged = new Map<string, BrandRomanitate>();
        const mergedAlts: Record<string, BrandRomanitate | null> = {};

        for (const payload of payloads) {
          for (const brand of payload.results ?? []) {
            merged.set(brand.id, brand);
            mergedAlts[brand.id] = payload.alternatives?.[brand.id] ?? null;
          }
        }

        setBrandResults(Array.from(merged.values()));
        setAltMap(mergedAlts);
        setQuery(terms[0] ?? "");
        const tripData = await fetchTripAlternatives(terms[0] ?? "");
        setAlternatives(tripData);
      } finally {
        setLoading(false);
      }
    },
    [fetchBrandSearch, fetchTripAlternatives]
  );

  async function handleShelfOcr(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Nu am putut citi textul din poză.");
      return;
    }
    await runMultiTermSearch(trimmed);
  }

  async function submitReceiptBonus(text: string) {
    setBonusMsg(null);
    const result = await applyKioskReceiptBonus(text);
    setBonusMsg(result.message);
  }

  async function handleReceiptOcr(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setBonusMsg("Nu am putut citi bonul din poză.");
      return;
    }
    setReceiptText(trimmed);
    if (isKioskReceipt(trimmed)) {
      await submitReceiptBonus(trimmed);
    } else {
      setBonusMsg("Bonul a fost scanat. Verifică textul și apasă validarea.");
    }
  }

  return (
    <div className="space-y-6 bg-zinc-100 text-zinc-900">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900">Produse 🛒</h1>
        <p className="text-sm text-zinc-600">
          Monitorul Prețurilor — București/Rahova (UAT 179132)
        </p>
      </header>

      <Section
        title="Caută sau fotografiază raftul"
        description="OCR pe etichetă → carduri Romanitate Tip 1–5"
      >
        <Input
          label="Caută produs (nume sau cod de bare)"
          placeholder="ex: milka, orez, 998636"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            void runSearch(e.target.value);
          }}
        />
        <input
          id="product-camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setOcrLoading(true);
            void runOcrOnImageFile(file)
              .then((text) => handleShelfOcr(text))
              .finally(() => setOcrLoading(false));
          }}
        />
        <label
          htmlFor="product-camera-input"
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-800 p-3 font-bold text-white shadow-sm hover:bg-zinc-700"
        >
          <span>📷 FOTO RAFT / PRODUS</span>
        </label>

        {geo.status === "loading" || ocrLoading ? (
          <p className="text-sm text-zinc-600">
            {ocrLoading ? "Se citește poza cu OCR…" : "Se obține locația GPS…"}
          </p>
        ) : null}
        {geo.status === "error" ? (
          <p className="text-sm text-amber-800">{geo.message}</p>
        ) : null}
        {loading ? <p className="text-sm text-zinc-600">Se caută…</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </Section>

      {brandResults.length > 0 ? (
        <Section title="Romanitate produs">
          <div className="space-y-4">
            {brandResults.map((brand) => (
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
        </Section>
      ) : query.trim().length >= 2 && !loading ? (
        <p className="text-sm text-zinc-600">Niciun brand găsit în baza de date.</p>
      ) : null}

      {alternatives.length > 0 ? (
        <Section title="Merită deplasarea?">
          <ul className="space-y-3">
            {alternatives.map((item) => (
              <li
                key={`${item.productId}-${item.store.store_id}`}
                className="rounded-2xl border border-zinc-300 bg-white p-4"
              >
                <p className="font-semibold text-zinc-900">
                  {item.productName ?? `Produs #${item.productId}`}
                </p>
                <p className="mt-1 text-sm text-zinc-800">
                  {item.store.network_name ?? item.store.store_name} — {item.store.price.toFixed(2)} Lei
                </p>
                <p className="mt-2 text-sm font-medium text-emerald-800">
                  Economisești {item.economieReala.toFixed(2)} Lei reali pe acest drum
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Bon chioșc mic (OCR)</h2>
        <p className="text-xs text-zinc-700">
          Fă poză la bonul de chioșc din Rahova. Bonus +20 puncte Koson la validare.
        </p>
        <textarea
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/40 placeholder:text-zinc-400 focus:ring-2"
          rows={4}
          placeholder="Articol 1 ... Suma Totală: 25.50 ..."
          value={receiptText}
          onChange={(e) => setReceiptText(e.target.value)}
        />
        <input
          id="receipt-camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setOcrLoading(true);
            void runOcrOnImageFile(file)
              .then((text) => handleReceiptOcr(text))
              .finally(() => setOcrLoading(false));
          }}
        />
        <label
          htmlFor="receipt-camera-input"
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 p-4 font-bold text-white shadow-md hover:bg-emerald-500"
        >
          <span>📸 FĂ POZĂ LA BON (DESCHIDE CAMERĂ)</span>
        </label>
        <Button
          type="button"
          variant="ghost"
          className="w-full border border-emerald-300 bg-white text-zinc-900"
          onClick={() => void submitReceiptBonus(receiptText)}
        >
          Validează bonul
        </Button>
        {bonusMsg ? (
          <p className={`text-sm ${bonusMsg.startsWith("+") ? "text-emerald-800" : "text-zinc-700"}`}>
            {bonusMsg}
          </p>
        ) : null}
      </section>
    </div>
  );
}
