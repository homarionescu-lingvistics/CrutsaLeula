import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getBrandAlternative,
  searchBranduriRomanitate,
} from "@/lib/piata/branduri-queries";
import { buildWorthItAlternatives } from "@/lib/produse/trip-worth";
import type { BrandRomanitate } from "@/lib/supabase/types";

type MonitorRow = {
  product_id: number;
  product_name: string | null;
  store_id: number | null;
  store_name: string | null;
  network_name: string | null;
  address: string | null;
  price: number;
  uat_id: number;
  fetched_at: string;
};

type MonitorBrandResult = BrandRomanitate & {
  price: number;
  store_name: string | null;
  network_name: string | null;
  address: string | null;
  product_id: number;
};

type PostBody = {
  scan?: "product" | "receipt";
  imageBase64?: string;
  mimeType?: string;
  query?: string;
  lat?: number;
  lng?: number;
};

const PRODUCT_PROMPT =
  "Identifică brandul principal din imagine. Întoarce DOAR numele curat (ex: 'Elmas', 'Milka'). Fără alt text.";

const RECEIPT_PROMPT =
  "Extrage din bon: {'magazin': 'Nume', 'total': valoare_numerică}. Întoarce STRICT acest format JSON.";

function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function getMonitorClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars missing");
  }
  return createSupabaseClient(url, key);
}

async function searchPreturiMonitorFirst(q: string): Promise<MonitorRow[]> {
  const supabase = getMonitorClient();
  const { data, error } = await supabase
    .from("preturi_monitor")
    .select(
      "product_id, product_name, store_id, store_name, network_name, address, price, uat_id, fetched_at"
    )
    .ilike("product_name", `%${q}%`)
    .order("price", { ascending: true })
    .limit(1000);

  if (error || !data?.length) return [];
  return data as MonitorRow[];
}

function extractBrandLabel(productName: string | null, fallback: string): string {
  if (productName?.trim()) return productName.trim();
  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

function mapMonitorRowsToResults(rows: MonitorRow[], q: string): MonitorBrandResult[] {
  const byProduct = new Map<number, MonitorRow>();

  for (const row of rows) {
    const existing = byProduct.get(row.product_id);
    if (!existing || Number(row.price) < Number(existing.price)) {
      byProduct.set(row.product_id, row);
    }
  }

  return Array.from(byProduct.values())
    .slice(0, 30)
    .map((row) => ({
      id: `monitor-${row.product_id}`,
      cod_bare_prefix: null,
      cui: null,
      nume_brand: extractBrandLabel(row.product_name, q),
      categorie_tip: 2 as const,
      procent_retentie_ron: 0,
      brand_alternativ_id: null,
      created_at: new Date().toISOString(),
      price: Number(row.price),
      store_name: row.store_name ?? row.network_name,
      network_name: row.network_name,
      address: row.address,
      product_id: row.product_id,
    }));
}

async function runBrandSearch(q: string, lat?: number, lng?: number) {
  const normalized = normalizeQuery(q);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

  if (normalized.length < 2) {
    return {
      results: [] as BrandRomanitate[],
      alternatives: {} as Record<string, BrandRomanitate | null>,
      monitorPrices: {},
      tripAlternatives: [],
    };
  }

  const monitorRows = await searchPreturiMonitorFirst(normalized);

  if (monitorRows.length) {
    const results = mapMonitorRowsToResults(monitorRows, normalized);
    const alternatives = Object.fromEntries(results.map((item) => [item.id, null]));
    const monitorPrices = Object.fromEntries(
      results.map((item) => [
        item.id,
        {
          productId: item.product_id,
          minPrice: item.price,
          maxPrice: item.price,
          storeCount: 1,
          store_name: item.store_name,
        },
      ])
    );
    const tripAlternatives =
      hasGeo && lat !== undefined && lng !== undefined
        ? await buildWorthItAlternatives(monitorRows, lat, lng)
        : [];

    return { results, alternatives, monitorPrices, tripAlternatives };
  }

  const brandResults = await searchBranduriRomanitate(normalized);
  const alternatives: Record<string, BrandRomanitate | null> = {};
  await Promise.all(
    brandResults.map(async (brand) => {
      alternatives[brand.id] = await getBrandAlternative(brand);
    })
  );

  return {
    results: brandResults,
    alternatives,
    monitorPrices: {},
    tripAlternatives: [],
  };
}

function parseGeminiJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const normalized = cleaned.replace(/'/g, '"');
  return JSON.parse(normalized) as T;
}

async function geminiFromImage(
  imageBase64: string,
  mimeType: string,
  systemInstruction: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SERVER_AI_UNAVAILABLE");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction,
  });
  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
  ]);
  return result.response.text().trim();
}

function buildReceiptText(magazin: string, total: number): string {
  const today = new Date().toLocaleDateString("ro-RO");
  return `Magazin: ${magazin}\nArticol 1\nData: ${today}\nSuma Totală: ${total.toFixed(2)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  const payload = await runBrandSearch(
    q,
    Number.isFinite(lat) ? lat : undefined,
    Number.isFinite(lng) ? lng : undefined
  );

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }

  const { scan, imageBase64, mimeType = "image/jpeg", query, lat, lng } = body;

  try {
    if (scan === "product") {
      let brand = query?.trim() ?? "";

      if (!brand && imageBase64) {
        try {
          brand = (await geminiFromImage(imageBase64, mimeType, PRODUCT_PROMPT)).replace(
            /^["']|["']$/g,
            ""
          );
        } catch (err) {
          if (err instanceof Error && err.message === "SERVER_AI_UNAVAILABLE") {
            return NextResponse.json(
              {
                error:
                  "Folosește Chrome cu AI activ pe telefon. Serverul nu are cheie Gemini configurată.",
                needsClientAi: true,
              },
              { status: 503 }
            );
          }
          throw err;
        }
      }

      if (!brand) {
        return NextResponse.json({ error: "Nu am identificat un brand." }, { status: 422 });
      }

      const searchPayload = await runBrandSearch(brand, lat, lng);
      return NextResponse.json({ brand, ...searchPayload });
    }

    if (scan === "receipt") {
      if (!imageBase64) {
        return NextResponse.json({ error: "Lipsește imaginea bonului." }, { status: 400 });
      }

      let raw: string;
      try {
        raw = await geminiFromImage(imageBase64, mimeType, RECEIPT_PROMPT);
      } catch (err) {
        if (err instanceof Error && err.message === "SERVER_AI_UNAVAILABLE") {
          return NextResponse.json(
            {
              error:
                "Folosește Chrome cu AI activ pe telefon. Serverul nu are cheie Gemini configurată.",
              needsClientAi: true,
            },
            { status: 503 }
          );
        }
        throw err;
      }

      const parsed = parseGeminiJson<{ magazin?: string; total?: number | string }>(raw);
      const magazin = String(parsed.magazin ?? "Chioșc").trim();
      const total =
        typeof parsed.total === "number"
          ? parsed.total
          : Number(String(parsed.total ?? "").replace(",", "."));

      if (!Number.isFinite(total) || total <= 0) {
        return NextResponse.json({ error: "Nu am extras suma totală din bon." }, { status: 422 });
      }

      return NextResponse.json({
        magazin,
        total,
        receiptText: buildReceiptText(magazin, total),
      });
    }

    return NextResponse.json({ error: "Tip scanare necunoscut." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Scanarea a eșuat." }, { status: 500 });
  }
}
