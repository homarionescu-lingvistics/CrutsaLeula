import { NextResponse } from "next/server";
import { searchMonitorPrices } from "@/lib/produse/monitor-queries";
import { buildWorthItAlternatives } from "@/lib/produse/trip-worth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (q.trim().length < 2) {
    return NextResponse.json({ alternatives: [] });
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Geolocation required", alternatives: [] },
      { status: 400 }
    );
  }

  const rows = await searchMonitorPrices(q);
  const alternatives = await buildWorthItAlternatives(rows, lat, lng);

  return NextResponse.json({ alternatives });
}
