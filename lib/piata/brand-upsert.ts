import { createAdminClient } from "@/lib/supabase/admin";
import type { BrandRomanitate } from "@/lib/supabase/types";
import type { ProductScanResult } from "@/lib/piata/gemini-scan";

export async function upsertBrandFromGeminiScan(
  scan: ProductScanResult
): Promise<BrandRomanitate> {
  const admin = createAdminClient();
  const name = scan.brand.trim();

  const { data: existing } = await admin
    .from("branduri_romanitate")
    .select("*")
    .ilike("nume_brand", name)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await admin
      .from("branduri_romanitate")
      .update({
        categorie_tip: scan.categorie_tip,
        procent_retentie_ron: scan.procent_retentie_ron,
        cui: scan.cui ?? existing.cui,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error || !updated) {
      return {
        ...(existing as BrandRomanitate),
        categorie_tip: scan.categorie_tip,
        procent_retentie_ron: scan.procent_retentie_ron,
        cui: scan.cui ?? existing.cui,
      };
    }
    return updated as BrandRomanitate;
  }

  const { data: inserted, error } = await admin
    .from("branduri_romanitate")
    .insert({
      nume_brand: name,
      categorie_tip: scan.categorie_tip,
      procent_retentie_ron: scan.procent_retentie_ron,
      cui: scan.cui,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return {
      id: `gemini-${Date.now()}`,
      cod_bare_prefix: null,
      cui: scan.cui,
      nume_brand: name,
      categorie_tip: scan.categorie_tip,
      procent_retentie_ron: scan.procent_retentie_ron,
      brand_alternativ_id: null,
      created_at: new Date().toISOString(),
    };
  }

  return inserted as BrandRomanitate;
}
