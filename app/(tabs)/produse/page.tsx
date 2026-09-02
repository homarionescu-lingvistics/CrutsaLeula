"use client";

import { useCallback, useEffect, useState } from "react";
import type { WorthItAlternative } from "@/lib/produse/trip-worth";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/ui/section";

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "error"; message: string };

export default function ProdusePage() {
  const [query, setQuery] = useState("");
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [alternatives, setAlternatives] = useState<WorthItAlternative[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo({ status: "error", message: "Geolocația nu este disponibilă pe acest dispozitiv." });
      return;
    }

    setGeo({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          status: "ready",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setGeo({
          status: "error",
          message: "Activează locația pentru calculul „Merită deplasarea?” în București/Rahova.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, []);

  const search = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setAlternatives([]);
        setError(null);
        return;
      }

      if (geo.status !== "ready") {
        setError("Așteptăm poziția ta GPS pentru a calcula costul deplasării.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: trimmed,
          lat: String(geo.lat),
          lng: String(geo.lng),
        });
        const res = await fetch(`/api/produse/monitor-search?${params.toString()}`);
        const data = (await res.json()) as {
          alternatives?: WorthItAlternative[];
          error?: string;
        };

        if (!res.ok) {
          setAlternatives([]);
          setError(data.error ?? "Căutarea a eșuat.");
          return;
        }

        setAlternatives(data.alternatives ?? []);
      } finally {
        setLoading(false);
      }
    },
    [geo]
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900">Produse 🛒</h1>
        <p className="text-sm text-zinc-500">
          Monitorul Prețurilor — București/Rahova (UAT 179132)
        </p>
      </header>

      <Section
        title="Merită deplasarea?"
        description="Scanează sau caută produsul; afișăm doar magazinele unde economia reală e pozitivă"
      >
        <Input
          label="Caută produs (nume sau cod)"
          placeholder="ex: lapte 3.5% sau 998636"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            void search(e.target.value);
          }}
        />

        {geo.status === "loading" ? (
          <p className="text-sm text-zinc-500">Se obține locația GPS…</p>
        ) : null}
        {geo.status === "error" ? (
          <p className="text-sm text-amber-700">{geo.message}</p>
        ) : null}
        {loading ? <p className="text-sm text-zinc-500">Se caută prețuri…</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </Section>

      {alternatives.length > 0 ? (
        <Section title="Alternative care merită drumul">
          <ul className="space-y-3">
            {alternatives.map((item) => (
              <li
                key={`${item.productId}-${item.store.store_id}`}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
              >
                <p className="font-semibold text-zinc-900">
                  {item.productName ?? `Produs #${item.productId}`}
                </p>
                <p className="mt-1 text-sm text-zinc-700">
                  {item.store.network_name ?? item.store.store_name} — {item.store.price.toFixed(2)} Lei
                </p>
                {item.store.address ? (
                  <p className="text-xs text-zinc-500">{item.store.address}</p>
                ) : null}
                <p className="mt-2 text-sm font-medium text-emerald-700">
                  Economisești {item.economieReala.toFixed(2)} Lei reali pe acest drum
                </p>
                <p className="text-xs text-zinc-500">
                  {item.distanceKm.toFixed(1)} km · cost deplasare {item.travelCostLei.toFixed(2)} Lei ·
                  față de {item.baselineStore.network_name ?? item.baselineStore.store_name} (
                  {item.baselinePrice.toFixed(2)} Lei)
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : query.trim().length >= 2 && !loading && geo.status === "ready" && !error ? (
        <p className="text-sm text-zinc-500">
          Niciun magazin alternativ nu merită deplasarea pentru acest produs.
        </p>
      ) : null}
    </div>
  );
}
