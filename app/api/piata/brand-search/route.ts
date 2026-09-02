import { NextResponse } from "next/server";
import {
  getBrandAlternative,
  searchBranduriRomanitate,
} from "@/lib/piata/branduri-queries";
import type { PreturiMonitorRow } from "@/lib/produse/monitor-queries";
import { buildWorthItAlternatives } from "@/lib/produse/trip-worth";
import { createClient } from "@/lib/supabase/server";
import type { BrandRomanitate } from "@/lib/supabase/types";

function monitorProductToBrand(
  productId: number,
  productName: string | null
): BrandRomanitate {
  return {
    id: `monitor-${productId}`,
    cod_bare_prefix: null,
    cui: null,
    nume_brand: productName ?? `Produs #${productId}`,
    categorie_tip: 2,
    procent_retentie_ron: 0,
    brand_alternativ_id: null,
    created_at: new Date().toISOString(),
  };
}

async function searchPreturiMonitor(q: string): Promise<PreturiMonitorRow[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("preturi_monitor")
    .select(
      "product_id, product_name, store_id, store_name, network_name, address, price, uat_id, fetched_at"
    )
    .ilike("product_name", `%${trimmed}%`)
    .eq("uat_id", 179132)
    .order("price", { ascending: true })
    .limit(500);

  if (error || !data) return [];
  return data as PreturiMonitorRow[];
}

function hasRomanianBrandMatch(
  productName: string,
  brandResults: BrandRomanitate[]
): boolean {
  const normalizedProduct = productName.trim().toLowerCase();
  return brandResults.some(
    (brand) =>
      brand.categorie_tip === 5 &&
      normalizedProduct.includes(brand.nume_brand.trim().toLowerCase())
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

  if (q.trim().length < 2) {
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

  const existingNames = new Set(
    brandResults.map((brand) => brand.nume_brand.trim().toLowerCase())
  );

  const monitorPrices: Record<
    string,
    { productId: number; minPrice: number; maxPrice: number; storeCount: number }
  > = {};
  const monitorBrands: BrandRomanitate[] = [];

  const byProduct = new Map<number, PreturiMonitorRow[]>();
  for (const row of monitorRows) {
    const bucket = byProduct.get(row.product_id) ?? [];
    bucket.push(row);
    byProduct.set(row.product_id, bucket);
  }

  for (const [productId, rows] of Array.from(byProduct.entries())) {
    const productName = rows.find((row) => row.product_name)?.product_name ?? null;
    const normalizedName = (productName ?? "").trim().toLowerCase();
    if (!productName || hasRomanianBrandMatch(productName, brandResults)) continue;
    if (normalizedName && existingNames.has(normalizedName)) continue;

    const prices = rows.map((row) => row.price);
    const brand = monitorProductToBrand(productId, productName);
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
    if (normalizedName) existingNames.add(normalizedName);
  }

  const results = [...brandResults, ...monitorBrands];
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
