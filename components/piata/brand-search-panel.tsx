"use client";

import { useCallback, useState } from "react";
import type { BrandRomanitate } from "@/lib/supabase/types";
import { applyKioskReceiptBonus } from "@/lib/piata/receipt-actions";
import type { ReceiptProduct } from "@/lib/piata/gemini-scan";
import { ProductScoreCard } from "@/components/piata/ProductScoreCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  initialResults?: BrandRomanitate[];
  alternatives?: Record<string, BrandRomanitate | null>;
};

type ProductScanPayload = {
  brand?: string;
  pret?: number | null;
  este_romanesc?: boolean;
  results?: BrandRomanitate[];
  alternatives?: Record<string, BrandRomanitate | null>;
  error?: string;
};

type ReceiptScanPayload = {
  magazin?: string;
  total?: number;
  produse?: ReceiptProduct[];
  receiptText?: string;
  error?: string;
};

function buildKioskReceiptText(
  magazin: string,
  total: number,
  produse: ReceiptProduct[] = []
): string {
  const today = new Date().toLocaleDateString("ro-RO");
  const productLines =
    produse.length > 0
      ? produse.map((p, index) => {
          const price = p.pret != null ? ` - ${p.pret.toFixed(2)} Lei` : "";
          return `Articol ${index + 1}: ${p.nume}${price}`;
        })
      : ["Articol 1"];

  return [`Magazin: ${magazin}`, ...productLines, `Data: ${today}`, `Suma Totală: ${total.toFixed(2)}`].join(
    "\n"
  );
}

async function fileToBase64(file: File): Promise<{ imageBase64: string; mimeType: string }> {
  const imageBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Nu am putut citi imaginea."));
    reader.readAsDataURL(file);
  });
  return { imageBase64, mimeType: file.type || "image/jpeg" };
}

async function postScan<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/piata/brand-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let data: T & { error?: string };
  try {
    data = JSON.parse(raw) as T & { error?: string };
  } catch {
    throw new Error("Răspuns invalid de la server.");
  }

  if (!res.ok) {
    throw new Error(data.error ?? "Scanarea a eșuat.");
  }

  return data;
}

export function BrandSearchPanel({ initialResults = [], alternatives = {} }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BrandRomanitate[]>(initialResults);
  const [altMap, setAltMap] = useState(alternatives);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [receiptMagazin, setReceiptMagazin] = useState("");
  const [receiptTotal, setReceiptTotal] = useState("");
  const [receiptProducts, setReceiptProducts] = useState<ReceiptProduct[]>([]);
  const [receiptText, setReceiptText] = useState("");
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [productScanInfo, setProductScanInfo] = useState<{
    brand: string;
    pret: number | null;
    este_romanesc: boolean;
  } | null>(null);

  const applySearchPayload = useCallback(
    (data: { results?: BrandRomanitate[]; alternatives?: Record<string, BrandRomanitate | null> }) => {
      setResults(data.results ?? []);
      setAltMap(data.alternatives ?? {});
    },
    []
  );

  const search = useCallback(
    async (q: string) => {
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
        applySearchPayload(data);
      } finally {
        setLoading(false);
      }
    },
    [applySearchPayload]
  );

  async function handleReceiptBonus(text = receiptText) {
    setBonusMsg(null);
    const result = await applyKioskReceiptBonus(text);
    setBonusMsg(result.message);
  }

  async function handleProductCamera(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setScanError(null);
    setOcrLoading(true);
    try {
      const { imageBase64, mimeType } = await fileToBase64(file);
      const data = await postScan<ProductScanPayload>({
        scan: "product",
        imageBase64,
        mimeType,
      });

      const brand = data.brand ?? "";
      setQuery(brand);
      setProductScanInfo({
        brand,
        pret: data.pret ?? null,
        este_romanesc: Boolean(data.este_romanesc),
      });
      applySearchPayload(data);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scanarea produsului a eșuat.");
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleReceiptCamera(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setScanError(null);
    setOcrLoading(true);
    try {
      const { imageBase64, mimeType } = await fileToBase64(file);
      const data = await postScan<ReceiptScanPayload>({
        scan: "receipt",
        imageBase64,
        mimeType,
      });

      const magazin = data.magazin ?? "";
      const total = data.total ?? 0;
      const produse = data.produse ?? [];
      const text = data.receiptText ?? buildKioskReceiptText(magazin, total, produse);

      setReceiptMagazin(magazin);
      setReceiptTotal(String(total));
      setReceiptProducts(produse);
      setReceiptText(text);
      await handleReceiptBonus(text);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scanarea bonului a eșuat.");
    } finally {
      setOcrLoading(false);
    }
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
            {ocrLoading ? "Se analizează poza…" : "Se caută…"}
          </p>
        ) : null}
        {scanError ? <p className="text-sm text-red-600">{scanError}</p> : null}
        {productScanInfo ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800">
            <p>
              <span className="font-semibold">Brand detectat:</span> {productScanInfo.brand}
            </p>
            <p>
              <span className="font-semibold">Românesc:</span>{" "}
              {productScanInfo.este_romanesc ? "Da 🇷🇴" : "Nu"}
            </p>
            <p>
              <span className="font-semibold">Preț pe etichetă:</span>{" "}
              {productScanInfo.pret != null ? `${productScanInfo.pret.toFixed(2)} Lei` : "—"}
            </p>
          </div>
        ) : null}
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
              setReceiptText(buildKioskReceiptText(magazin, total, receiptProducts));
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
              setReceiptText(buildKioskReceiptText(receiptMagazin, total, receiptProducts));
            }
          }}
        />
        {receiptProducts.length > 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-zinc-800">
            <p className="font-semibold text-emerald-900">Produse detectate pe bon</p>
            <ul className="mt-2 space-y-1">
              {receiptProducts.map((product, index) => (
                <li key={`${product.nume}-${index}`}>
                  {product.nume}
                  {product.pret != null ? ` — ${product.pret.toFixed(2)} Lei` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <textarea
          className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/40 placeholder:text-zinc-400 focus:ring-2"
          rows={4}
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
