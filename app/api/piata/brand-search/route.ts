import { NextResponse } from "next/server";
import {
  getBrandAlternative,
  searchBranduriRomanitate,
} from "@/lib/piata/branduri-queries";
import type { BrandRomanitate } from "@/lib/supabase/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [], alternatives: {} });
  }

  const results = await searchBranduriRomanitate(q);
  const alternatives: Record<string, BrandRomanitate | null> = {};

  await Promise.all(
    results.map(async (brand) => {
      alternatives[brand.id] = await getBrandAlternative(brand);
    })
  );

  return NextResponse.json({ results, alternatives });
}
