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

type LanguageModelSession = {
  prompt: (input: string | unknown[]) => Promise<string>;
  destroy?: () => void;
};

type LanguageModelCtor = {
  availability: () => Promise<string>;
  create: (options?: { systemPrompt?: string }) => Promise<LanguageModelSession>;
};

function buildKioskReceiptText(magazin: string, total: number): string {
  const today = new Date().toLocaleDateString("ro-RO");
  return `Magazin: ${magazin}\nArticol 1\nData: ${today}\nSuma Totală: ${total.toFixed(2)}`;
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

function getBrowserLanguageModel(): LanguageModelCtor | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { LanguageModel?: LanguageModelCtor }).LanguageModel ?? null;
}

async function tryBrowserProductScan(file: File): Promise<string | null> {
  const LM = getBrowserLanguageModel();
  if (!LM) return null;

  try {
    const availability = await LM.availability();
    if (availability === "unavailable") return null;

    const session = await LM.create({
      systemPrompt:
        "Identifică brandul principal din imagine. Întoarce DOAR numele curat (ex: Elmas, Milka). Fără alt text.",
    });

    const promptInput = [
      {
        role: "user",
        content: [
          { type: "text", value: "Ce brand este pe această etichetă sau ambalaj?" },
          { type: "image", value: file },
        ],
      },
    ];

    const result = await session.prompt(promptInput).catch(() =>
      session.prompt("Identifică brandul principal din poză. Răspunde doar cu numele brandului.")
    );

    session.destroy?.();
    const brand = result.trim().replace(/^["']|["']$/g, "");
    return brand.length >= 2 ? brand : null;
  } catch {
    return null;
  }
}

async function tryBrowserReceiptScan(file: File): Promise<{ magazin: string; total: number } | null> {
  const LM = getBrowserLanguageModel();
  if (!LM) return null;

  try {
    const availability = await LM.availability();
    if (availability === "unavailable") return null;

    const session = await LM.create({
      systemPrompt:
        "Extrage din bon fiscal românesc magazinul și suma totală. Răspunde STRICT JSON: {\"magazin\":\"Nume\",\"total\":12.34}",
    });

    const promptInput = [
      {
        role: "user",
        content: [
          { type: "text", value: "Extrage magazinul și totalul din acest bon." },
          { type: "image", value: file },
        ],
      },
    ];

    const result = await session.prompt(promptInput).catch(() =>
      session.prompt("Extrage magazinul și totalul din bon. Format JSON strict.")
    );

    session.destroy?.();
    const cleaned = result.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned.replace(/'/g, '"')) as {
      magazin?: string;
      total?: number | string;
    };
    const magazin = String(parsed.magazin ?? "Chioșc").trim();
    const total =
      typeof parsed.total === "number"
        ? parsed.total
        : Number(String(parsed.total ?? "").replace(",", "."));
    if (!Number.isFinite(total) || total <= 0) return null;
    return { magazin, total };
  } catch {
    return null;
  }
}

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
  const [scanError, setScanError] = useState<string | null>(null);

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
      const browserBrand = await tryBrowserProductScan(file);
      const { imageBase64, mimeType } = await fileToBase64(file);

      const res = await fetch("/api/piata/brand-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scan: "product",
          query: browserBrand ?? undefined,
          imageBase64: browserBrand ? undefined : imageBase64,
          mimeType,
        }),
      });

      const data = (await res.json()) as {
        brand?: string;
        results?: BrandRomanitate[];
        alternatives?: Record<string, BrandRomanitate | null>;
        error?: string;
        needsClientAi?: boolean;
      };

      if (!res.ok) {
        if (data.needsClientAi) {
          throw new Error(
            "AI-ul din browser nu e disponibil. Folosește Chrome pe Android cu Gemini activat, sau caută manual."
          );
        }
        throw new Error(data.error ?? "Scanarea produsului a eșuat.");
      }

      const brand = data.brand ?? browserBrand ?? "";
      setQuery(brand);
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
      const browserReceipt = await tryBrowserReceiptScan(file);
      let magazin = browserReceipt?.magazin ?? "";
      let total = browserReceipt?.total ?? 0;
      let text = browserReceipt ? buildKioskReceiptText(magazin, total) : "";

      if (!browserReceipt) {
        const { imageBase64, mimeType } = await fileToBase64(file);
        const res = await fetch("/api/piata/brand-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scan: "receipt", imageBase64, mimeType }),
        });
        const data = (await res.json()) as {
          magazin?: string;
          total?: number;
          receiptText?: string;
          error?: string;
          needsClientAi?: boolean;
        };

        if (!res.ok) {
          if (data.needsClientAi) {
            throw new Error(
              "AI-ul din browser nu e disponibil. Folosește Chrome pe Android cu Gemini activat, sau completează manual."
            );
          }
          throw new Error(data.error ?? "Scanarea bonului a eșuat.");
        }

        magazin = data.magazin ?? "";
        total = data.total ?? 0;
        text = data.receiptText ?? buildKioskReceiptText(magazin, total);
      }

      setReceiptMagazin(magazin);
      setReceiptTotal(String(total));
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
