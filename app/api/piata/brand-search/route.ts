import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getBrandAlternative,
  searchBranduriRomanitate,
} from "@/lib/piata/branduri-queries";
import {
  buildReceiptText,
  geminiScanProduct,
  geminiScanReceipt,
} from "@/lib/piata/gemini-scan";
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
  lat?: number;
  lng?: number;
};

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

  const { scan, imageBase64, mimeType = "image/jpeg", lat, lng } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: "Lipsește imaginea." }, { status: 400 });
  }

  try {
    if (scan === "product") {
      const productScan = await geminiScanProduct(imageBase64, mimeType);
      const searchPayload = await runBrandSearch(productScan.brand, lat, lng);
      return NextResponse.json({
        ...productScan,
        ...searchPayload,
      });
    }

    if (scan === "receipt") {
      const receiptScan = await geminiScanReceipt(imageBase64, mimeType);
      return NextResponse.json({
        ...receiptScan,
        receiptText: buildReceiptText(
          receiptScan.magazin,
          receiptScan.total,
          receiptScan.produse
        ),
      });
    }

    return NextResponse.json({ error: "Tip scanare necunoscut." }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === "SERVER_AI_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Serviciul de scanare nu este configurat pe server." },
        { status: 503 }
      );
    }

    const message = err instanceof Error ? err.message : "Scanarea a eșuat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
