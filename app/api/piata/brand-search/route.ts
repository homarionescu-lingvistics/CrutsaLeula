import { NextResponse } from "next/server";
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

function mapMonitorRowsToResults(
  rows: MonitorRow[],
  q: string
): MonitorBrandResult[] {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = normalizeQuery(searchParams.get("q") ?? "");
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

  if (q.length < 2) {
    return NextResponse.json({
      results: [],
      alternatives: {},
      monitorPrices: {},
      tripAlternatives: [],
    });
  }

  const monitorRows = await searchPreturiMonitorFirst(q);

  if (monitorRows.length) {
    const results = mapMonitorRowsToResults(monitorRows, q);
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
      hasGeo ? await buildWorthItAlternatives(monitorRows, lat, lng) : [];

    return NextResponse.json({
      results,
      alternatives,
      monitorPrices,
      tripAlternatives,
    });
  }

  const brandResults = await searchBranduriRomanitate(q);
  const alternatives: Record<string, BrandRomanitate | null> = {};
  await Promise.all(
    brandResults.map(async (brand) => {
      alternatives[brand.id] = await getBrandAlternative(brand);
    })
  );

  return NextResponse.json({
    results: brandResults,
    alternatives,
    monitorPrices: {},
    tripAlternatives: [],
  });
}
