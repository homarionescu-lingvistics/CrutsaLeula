import { createClient } from "@/lib/supabase/server";

export type PreturiMonitorRow = {
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

export async function searchMonitorPrices(query: string): Promise<PreturiMonitorRow[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = createClient();
  const digitsOnly = q.replace(/\D/g, "");

  if (digitsOnly.length >= 4 && digitsOnly === q.replace(/\s/g, "")) {
    const productId = Number(digitsOnly);
    const { data, error } = await supabase
      .from("preturi_monitor")
      .select(
        "product_id, product_name, store_id, store_name, network_name, address, price, uat_id, fetched_at"
      )
      .eq("product_id", productId)
      .eq("uat_id", 179132)
      .order("price", { ascending: true });

    if (!error && data?.length) return data as PreturiMonitorRow[];
  }

  const { data, error } = await supabase
    .from("preturi_monitor")
    .select(
      "product_id, product_name, store_id, store_name, network_name, address, price, uat_id, fetched_at"
    )
    .ilike("product_name", `%${q}%`)
    .eq("uat_id", 179132)
    .order("price", { ascending: true })
    .limit(500);

  if (error || !data) return [];
  return data as PreturiMonitorRow[];
}
