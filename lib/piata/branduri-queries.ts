import { createClient } from "@/lib/supabase/server";
import type { BrandRomanitate } from "@/lib/supabase/types";

export async function searchBranduriRomanitate(
  query: string
): Promise<BrandRomanitate[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = createClient();
  const digitsOnly = q.replace(/\D/g, "");

  if (digitsOnly.length >= 3) {
    const prefix = digitsOnly.slice(0, 3);
    const { data: byPrefix } = await supabase
      .from("branduri_romanitate")
      .select("*")
      .eq("cod_bare_prefix", prefix)
      .limit(10);

    if (byPrefix?.length) return byPrefix as BrandRomanitate[];
  }

  const { data, error } = await supabase
    .from("branduri_romanitate")
    .select("*")
    .ilike("nume_brand", `%${q}%`)
    .limit(10);

  if (error || !data) return [];
  return data as BrandRomanitate[];
}

export async function getBrandById(
  id: string
): Promise<BrandRomanitate | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("branduri_romanitate")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as BrandRomanitate;
}

export async function getBrandAlternative(
  brand: BrandRomanitate
): Promise<BrandRomanitate | null> {
  if (!brand.brand_alternativ_id) return null;
  if (brand.categorie_tip !== 1 && brand.categorie_tip !== 2) return null;
  return getBrandById(brand.brand_alternativ_id);
}
