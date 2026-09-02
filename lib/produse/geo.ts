const BUCHAREST_LAT = 44.4268;
const BUCHAREST_LNG = 26.1025;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function geocodeStoreLocation(
  address: string | null,
  networkName: string | null,
  storeName: string | null
): Promise<{ lat: number; lng: number }> {
  const query = [address, storeName, networkName, "București", "România"]
    .filter(Boolean)
    .join(", ");

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "CrutsaLeula/1.0 (preturi-monitor)" },
    next: { revalidate: 86400 },
  });

  if (response.ok) {
    const payload = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (payload[0]) {
      return { lat: Number(payload[0].lat), lng: Number(payload[0].lon) };
    }
  }

  return { lat: BUCHAREST_LAT, lng: BUCHAREST_LNG };
}
