"use client";

import { useCallback, useState } from "react";
import type { BrandRomanitate } from "@/lib/supabase/types";
import { applyReceiptScanBonus } from "@/lib/piata/receipt-actions";
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
  categorie_tip?: 1 | 2 | 3 | 4 | 5;
  procent_retentie_ron?: number | null;
  este_romanesc?: boolean;
  motiv?: string | null;
  results?: BrandRomanitate[];
  alternatives?: Record<string, BrandRomanitate | null>;
  error?: string;
  code?: string;
};

type ReceiptScanPayload = {
  magazin?: string;
  adresa?: string | null;
  data_bon?: string | null;
  total?: number;
  produse?: ReceiptProduct[];
  este_chioc_local?: boolean;
  receiptText?: string;
  error?: string;
  code?: string;
};

function buildKioskReceiptText(
  magazin: string,
  total: number,
  produse: ReceiptProduct[] = [],
  dataBon?: string | null,
  adresa?: string | null
): string {
  const dateLabel = dataBon?.trim() || new Date().toLocaleDateString("ro-RO");
  const productLines =
    produse.length > 0
      ? produse.map((p, index) => {
          const price = p.pret != null ? ` - ${p.pret.toFixed(2)} Lei` : "";
          return `Articol ${index + 1}: ${p.nume}${price}`;
        })
      : ["Articol 1"];

  const lines = [`Magazin: ${magazin}`];
  if (adresa) lines.push(`Adresa: ${adresa}`);
  lines.push(...productLines, `Data: ${dateLabel}`, `Suma Totală: ${total.toFixed(2)}`);
  return lines.join("\n");
}

/** Comprimă poza (telefon) → JPEG mai mic, ca să treacă upload-ul. */
async function compressImageFile(
  file: File,
  maxDim = 1600,
  quality = 0.72
): Promise<{ imageBase64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file).catch(async () => {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Nu am putut citi imaginea."));
        el.src = url;
      });
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas indisponibil pe acest dispozitiv.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compresia imaginii a eșuat."))),
      "image/jpeg",
      quality
    );
  });

  const imageBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Nu am putut citi imaginea comprimată."));
    reader.readAsDataURL(blob);
  });

  return { imageBase64, mimeType: "image/jpeg" };
}

async function postScan<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/piata/brand-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let data: T & { error?: string; code?: string };
  try {
    data = JSON.parse(raw) as T & { error?: string; code?: string };
  } catch {
    throw new Error("Răspuns invalid de la server. Reîncarcă pagina.");
  }

  if (!res.ok) {
    const err = new Error(
      data.error ?? "Scanarea a eșuat. Reîncarcă pagina și încearcă din nou."
    ) as Error & { code?: string };
    err.code = data.code;
    throw err;
  }

  return data;
}

function ScanErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <p className="text-sm text-red-700">{message}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1"
          onClick={() => window.location.reload()}
        >
          Reîncarcă pagina
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="border border-zinc-200"
          onClick={onDismiss}
        >
          Închide
        </Button>
      </div>
    </div>
  );
}

export function BrandSearchPanel({ initialResults = [], alternatives = {} }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BrandRomanitate[]>(initialResults);
  const [altMap, setAltMap] = useState(alternatives);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [receiptMagazin, setReceiptMagazin] = useState("");
  const [receiptAdresa, setReceiptAdresa] = useState("");
  const [receiptDataBon, setReceiptDataBon] = useState("");
  const [receiptTotal, setReceiptTotal] = useState("");
  const [receiptProducts, setReceiptProducts] = useState<ReceiptProduct[]>([]);
  const [receiptLocal, setReceiptLocal] = useState(false);
  const [receiptText, setReceiptText] = useState("");
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [productScanInfo, setProductScanInfo] = useState<{
    brand: string;
    pret: number | null;
    categorie_tip: number;
    este_romanesc: boolean;
    motiv: string | null;
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

  async function handleReceiptBonus() {
    setBonusMsg(null);
    const total = Number(receiptTotal.replace(",", "."));
    const result = await applyReceiptScanBonus({
      magazin: receiptMagazin,
      adresa: receiptAdresa || null,
      total,
      dataBon: receiptDataBon || null,
      produse: receiptProducts,
      esteChiocLocal: receiptLocal,
      rawText: receiptText,
    });
    setBonusMsg(result.message);
  }

  async function handleProductCamera(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setScanError(null);
    setOcrLoading(true);
    try {
      const { imageBase64, mimeType } = await compressImageFile(file);
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
        categorie_tip: data.categorie_tip ?? data.results?.[0]?.categorie_tip ?? 2,
        este_romanesc: Boolean(data.este_romanesc),
        motiv: data.motiv ?? null,
      });
      applySearchPayload(data);
    } catch (err) {
      setScanError(
        err instanceof Error
          ? err.message
          : "Scanarea produsului a eșuat. Reîncarcă pagina."
      );
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
      const { imageBase64, mimeType } = await compressImageFile(file);
      const data = await postScan<ReceiptScanPayload>({
        scan: "receipt",
        imageBase64,
        mimeType,
      });

      const magazin = data.magazin ?? "";
      const total = data.total ?? 0;
      const produse = data.produse ?? [];
      const adresa = data.adresa ?? "";
      const dataBon = data.data_bon ?? "";
      const text =
        data.receiptText ??
        buildKioskReceiptText(magazin, total, produse, dataBon, adresa || null);

      setReceiptMagazin(magazin);
      setReceiptAdresa(adresa);
      setReceiptDataBon(dataBon);
      setReceiptTotal(String(total));
      setReceiptProducts(produse);
      setReceiptLocal(Boolean(data.este_chioc_local));
      setReceiptText(text);

      const result = await applyReceiptScanBonus({
        magazin,
        adresa: adresa || null,
        total,
        dataBon: dataBon || null,
        produse,
        esteChiocLocal: Boolean(data.este_chioc_local),
        rawText: text,
      });
      setBonusMsg(result.message);
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : "Scanarea bonului a eșuat. Reîncarcă pagina."
      );
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
          accept="image/*,image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleProductCamera(e)}
        />
        {loading || ocrLoading ? (
          <p className="text-sm text-zinc-500">
            {ocrLoading ? "Se analizează poza…" : "Se caută…"}
          </p>
        ) : null}
        {scanError ? (
          <ScanErrorBanner message={scanError} onDismiss={() => setScanError(null)} />
        ) : null}
        {productScanInfo ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800">
            <p>
              <span className="font-semibold">Brand detectat:</span> {productScanInfo.brand}
            </p>
            <p>
              <span className="font-semibold">Tip card:</span> {productScanInfo.categorie_tip}
              {productScanInfo.este_romanesc ? " · amprentă RO" : ""}
            </p>
            <p>
              <span className="font-semibold">Preț pe etichetă:</span>{" "}
              {productScanInfo.pret != null ? `${productScanInfo.pret.toFixed(2)} Lei` : "—"}
            </p>
            {productScanInfo.motiv ? (
              <p className="mt-1 text-xs text-zinc-500">{productScanInfo.motiv}</p>
            ) : null}
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
        <h2 className="text-sm font-semibold text-zinc-800">Bon fiscal (OCR)</h2>
        <p className="text-xs text-zinc-500">
          Poza trebuie să fie din ziua curentă pentru +20 Koson. Datele se salvează oricum.
        </p>
        <Input
          label="Magazin"
          placeholder="ex: Chioșc Rahova / La Cocoș"
          value={receiptMagazin}
          onChange={(e) => setReceiptMagazin(e.target.value)}
        />
        <Input
          label="Adresă (de pe bon)"
          placeholder="opțional"
          value={receiptAdresa}
          onChange={(e) => setReceiptAdresa(e.target.value)}
        />
        <Input
          label="Data bonului"
          placeholder="YYYY-MM-DD sau ZZ.LL.AAAA"
          value={receiptDataBon}
          onChange={(e) => setReceiptDataBon(e.target.value)}
        />
        <Input
          label="Sumă totală (Lei)"
          placeholder="ex: 25.50"
          value={receiptTotal}
          onChange={(e) => setReceiptTotal(e.target.value)}
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
          accept="image/*,image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleReceiptCamera(e)}
        />
        <Button type="button" className="w-full" onClick={() => void handleReceiptBonus()}>
          Verifică bon & acordă bonus
        </Button>
        {bonusMsg ? (
          <p
            className={`text-sm ${bonusMsg.startsWith("+") ? "text-emerald-600" : "text-zinc-600"}`}
          >
            {bonusMsg}
          </p>
        ) : null}
      </section>
    </div>
  );
}
