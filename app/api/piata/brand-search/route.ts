import { NextResponse } from "next/server";
import {
  getBrandAlternative,
  searchBranduriRomanitate,
} from "@/lib/piata/branduri-queries";
import {
  searchPreturiMonitor,
  type PreturiMonitorRow,
} from "@/lib/produse/monitor-queries";
import { buildWorthItAlternatives } from "@/lib/produse/trip-worth";
import type { BrandRomanitate } from "@/lib/supabase/types";

function capitalizeTerm(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function monitorProductToBrand(
  productId: number,
  productName: string | null,
  fallbackName: string
): BrandRomanitate {
  return {
    id: crypto.randomUUID(),
    cod_bare_prefix: null,
    cui: null,
    nume_brand: productName?.trim() || capitalizeTerm(fallbackName),
    categorie_tip: 2,
    procent_retentie_ron: 0,
    brand_alternativ_id: null,
    created_at: new Date().toISOString(),
  };
}

function groupMonitorByProduct(rows: PreturiMonitorRow[]): Map<number, PreturiMonitorRow[]> {
  const byProduct = new Map<number, PreturiMonitorRow[]>();
  for (const row of rows) {
    const bucket = byProduct.get(row.product_id) ?? [];
    bucket.push(row);
    byProduct.set(row.product_id, bucket);
  }
  return byProduct;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase().replace(/\s+/g, " ");
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

  const [brandResults, monitorRows] = await Promise.all([
    searchBranduriRomanitate(q),
    searchPreturiMonitor(q),
  ]);

  const alternatives: Record<string, BrandRomanitate | null> = {};
  await Promise.all(
    brandResults.map(async (brand) => {
      alternatives[brand.id] = await getBrandAlternative(brand);
    })
  );

  const monitorPrices: Record<
    string,
    { productId: number; minPrice: number; maxPrice: number; storeCount: number }
  > = {};
  const monitorBrands: BrandRomanitate[] = [];

  for (const [productId, rows] of Array.from(groupMonitorByProduct(monitorRows).entries())) {
    const productName = rows.find((row) => row.product_name)?.product_name ?? null;
    const prices = rows.map((row) => Number(row.price)).filter((price) => Number.isFinite(price));
    if (!prices.length) continue;

    const brand = monitorProductToBrand(productId, productName, q);
    monitorBrands.push(brand);
    monitorPrices[brand.id] = {
      productId,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      storeCount: Array.from(
        new Set(rows.map((row) => row.store_id).filter((id): id is number => id != null))
      ).length,
    };
    alternatives[brand.id] = null;
  }

  let results = [...brandResults, ...monitorBrands];

  if (!results.length && monitorRows.length) {
    const fallbackBrand = monitorProductToBrand(
      monitorRows[0].product_id,
      monitorRows[0].product_name,
      q
    );
    results = [fallbackBrand];
    alternatives[fallbackBrand.id] = null;
    monitorPrices[fallbackBrand.id] = {
      productId: monitorRows[0].product_id,
      minPrice: Number(monitorRows[0].price),
      maxPrice: Number(monitorRows[0].price),
      storeCount: 1,
    };
  }

  const tripAlternatives =
    hasGeo && monitorRows.length
      ? await buildWorthItAlternatives(monitorRows, lat, lng)
      : [];

  return NextResponse.json({
    results,
    alternatives,
    monitorPrices,
    tripAlternatives,
  });
}
