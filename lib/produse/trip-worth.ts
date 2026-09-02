import type { PreturiMonitorRow } from "@/lib/produse/monitor-queries";
import { geocodeStoreLocation, haversineKm } from "@/lib/produse/geo";

export type WorthItAlternative = {
  productId: number;
  productName: string | null;
  store: PreturiMonitorRow;
  distanceKm: number;
  travelCostLei: number;
  baselinePrice: number;
  baselineStore: PreturiMonitorRow;
  economieReala: number;
};

export function travelCostLei(distanceKm: number): number {
  if (distanceKm < 1) return 0;
  return distanceKm * 2;
}

type StoreCoords = { lat: number; lng: number };

export async function buildWorthItAlternatives(
  rows: PreturiMonitorRow[],
  userLat: number,
  userLng: number
): Promise<WorthItAlternative[]> {
  if (!rows.length) return [];

  const coordsByStore = new Map<number, StoreCoords>();
  const storeIds = Array.from(
    new Set(rows.map((row) => row.store_id).filter((id): id is number => id != null))
  );

  await Promise.all(
    storeIds.map(async (storeId) => {
      const sample = rows.find((row) => row.store_id === storeId);
      if (!sample) return;
      const coords = await geocodeStoreLocation(
        sample.address,
        sample.network_name,
        sample.store_name
      );
      coordsByStore.set(storeId, coords);
    })
  );

  const byProduct = new Map<number, PreturiMonitorRow[]>();
  for (const row of rows) {
    const bucket = byProduct.get(row.product_id) ?? [];
    bucket.push(row);
    byProduct.set(row.product_id, bucket);
  }

  const alternatives: WorthItAlternative[] = [];

  for (const [productId, productRows] of Array.from(byProduct.entries())) {
    const pricedRows = productRows.filter((row) => row.store_id != null);
    if (pricedRows.length < 2) continue;

    let baseline = pricedRows[0];
    let baselineDistance = Number.POSITIVE_INFINITY;

    for (const row of pricedRows) {
      const coords = coordsByStore.get(row.store_id!);
      if (!coords) continue;
      const distance = haversineKm(userLat, userLng, coords.lat, coords.lng);
      if (distance < baselineDistance) {
        baselineDistance = distance;
        baseline = row;
      }
    }

    const pretScump = baseline.price;

    for (const row of pricedRows) {
      if (row.store_id === baseline.store_id) continue;
      if (row.price >= pretScump) continue;

      const coords = coordsByStore.get(row.store_id!);
      if (!coords) continue;

      const distanceKm = haversineKm(userLat, userLng, coords.lat, coords.lng);
      const costDeplasare = travelCostLei(distanceKm);
      const economieReala = pretScump - row.price - costDeplasare;

      if (economieReala > 0) {
        alternatives.push({
          productId,
          productName: row.product_name,
          store: row,
          distanceKm,
          travelCostLei: costDeplasare,
          baselinePrice: pretScump,
          baselineStore: baseline,
          economieReala,
        });
      }
    }
  }

  return alternatives.sort((a, b) => b.economieReala - a.economieReala);
}
