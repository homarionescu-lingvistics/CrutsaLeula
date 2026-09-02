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

const MONITOR_SELECT_PRODUCT =
  "product_id, product_name, store_id, store_name, network_name, address, price, uat_id, fetched_at";

const MONITOR_SELECT_NUME =
  "product_id, nume_produs, store_id, store_name, network_name, address, price, uat_id, fetched_at";

function normalizeMonitorRow(
  row: Record<string, unknown>,
  column: "nume_produs" | "product_name"
): PreturiMonitorRow {
  const productName =
    (column === "nume_produs" && typeof row.nume_produs === "string" && row.nume_produs) ||
    (typeof row.product_name === "string" && row.product_name) ||
    (typeof row.nume_produs === "string" && row.nume_produs) ||
    null;

  return {
    product_id: Number(row.product_id),
    product_name: productName,
    store_id: row.store_id != null ? Number(row.store_id) : null,
    store_name: typeof row.store_name === "string" ? row.store_name : null,
    network_name: typeof row.network_name === "string" ? row.network_name : null,
    address: typeof row.address === "string" ? row.address : null,
    price: Number(row.price),
    uat_id: Number(row.uat_id ?? 179132),
    fetched_at:
      typeof row.fetched_at === "string" ? row.fetched_at : new Date().toISOString(),
  };
}

async function queryMonitorColumn(
  column: "nume_produs" | "product_name",
  q: string,
  withUatFilter: boolean
): Promise<PreturiMonitorRow[]> {
  const supabase = createClient();
  const select = column === "nume_produs" ? MONITOR_SELECT_NUME : MONITOR_SELECT_PRODUCT;
  let request = supabase
    .from("preturi_monitor")
    .select(select)
    .ilike(column, `%${q}%`)
    .order("price", { ascending: true })
    .limit(500);

  if (withUatFilter) {
    request = request.eq("uat_id", 179132);
  }

  const { data, error } = await request;
  if (error || !data?.length) return [];
  return data.map((row) => normalizeMonitorRow(row as Record<string, unknown>, column));
}

export async function searchPreturiMonitor(q: string): Promise<PreturiMonitorRow[]> {
  const normalized = q.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized.length < 2) return [];

  const attempts: Array<{ column: "nume_produs" | "product_name"; withUat: boolean }> = [
    { column: "nume_produs", withUat: true },
    { column: "product_name", withUat: true },
    { column: "nume_produs", withUat: false },
    { column: "product_name", withUat: false },
  ];

  for (const { column, withUat } of attempts) {
    const rows = await queryMonitorColumn(column, normalized, withUat);
    if (rows.length) return rows;
  }

  return [];
}

export async function searchMonitorPrices(query: string): Promise<PreturiMonitorRow[]> {
  return searchPreturiMonitor(query);
}
