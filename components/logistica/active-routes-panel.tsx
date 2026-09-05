"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type LogisticsRoute = {
  id: string;
  from: string;
  to: string;
  vehicle: string;
  category: string;
  eta?: string;
  international: boolean;
  diasporaParcels: boolean;
  promoUntil?: string;
};

const STORAGE_KEY = "crutanomia_logistics_routes_v1";

const VEHICLE_OPTIONS = [
  { value: "Dubă prelată", label: "Dubă prelată" },
  { value: "Dubă frigorifică", label: "Dubă frigorifică" },
  { value: "Autoutilitară", label: "Autoutilitară" },
  { value: "Camion", label: "Camion" },
  { value: "Remorcă / tractor", label: "Remorcă / tractor" },
  { value: "Autoturism", label: "Autoturism" },
];

const CATEGORY_OPTIONS = [
  { value: "Marfă generală", label: "Marfă generală" },
  { value: "Utilaje agricole", label: "Utilaje agricole" },
  { value: "Marfă frigorifică", label: "Marfă frigorifică" },
  { value: "Piese / materiale", label: "Piese / materiale" },
  { value: "Colete diaspora", label: "Colete diaspora / Pachet de Acasă" },
  { value: "Drum de întoarcere pe gol", label: "Drum de întoarcere pe gol" },
];

const SEED_ROUTES: LogisticsRoute[] = [
  {
    id: "seed-1",
    from: "Cluj",
    to: "București",
    vehicle: "Camion",
    category: "Utilaje agricole",
    eta: "36h",
    international: false,
    diasporaParcels: false,
  },
  {
    id: "seed-2",
    from: "Iași",
    to: "Constanța",
    vehicle: "Dubă frigorifică",
    category: "Marfă frigorifică",
    eta: "18h",
    international: false,
    diasporaParcels: false,
  },
  {
    id: "seed-3",
    from: "Sibiu",
    to: "Craiova",
    vehicle: "Autoutilitară",
    category: "Piese / materiale",
    eta: "24h",
    international: false,
    diasporaParcels: false,
  },
  {
    id: "seed-4",
    from: "București",
    to: "Londra",
    vehicle: "Dubă prelată",
    category: "Colete diaspora",
    eta: "3–4 zile",
    international: true,
    diasporaParcels: true,
  },
];

function isInternationalRoute(from: string, to: string): boolean {
  const roCities =
    /bucuresti|cluj|iasi|timisoara|brasov|constanta|craiova|sibiu|ploiesti|oradea|galati|romania|rahova/i;
  const fromRo = roCities.test(from.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const toRo = roCities.test(to.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  return Boolean(from && to) && !(fromRo && toRo);
}

function loadRoutes(): LogisticsRoute[] {
  if (typeof window === "undefined") return SEED_ROUTES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_ROUTES;
    const parsed = JSON.parse(raw) as LogisticsRoute[];
    return Array.isArray(parsed) && parsed.length ? parsed : SEED_ROUTES;
  } catch {
    return SEED_ROUTES;
  }
}

function saveRoutes(routes: LogisticsRoute[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}

export function ActiveRoutesPanel() {
  const [routes, setRoutes] = useState<LogisticsRoute[]>(SEED_ROUTES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [vehicle, setVehicle] = useState(VEHICLE_OPTIONS[0].value);
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0].value);
  const [diasporaParcels, setDiasporaParcels] = useState(false);

  useEffect(() => {
    setRoutes(loadRoutes());
  }, []);

  const selected = useMemo(
    () => routes.find((r) => r.id === selectedId) ?? null,
    [routes, selectedId]
  );

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const f = from.trim();
    const t = to.trim();
    if (f.length < 2 || t.length < 2) return;

    const international = isInternationalRoute(f, t) || category === "Colete diaspora";
    const promoUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const next: LogisticsRoute = {
      id: `r-${Date.now()}`,
      from: f,
      to: t,
      vehicle,
      category,
      international,
      diasporaParcels: diasporaParcels || category === "Colete diaspora" || international,
      promoUntil,
    };

    const updated = [next, ...routes];
    setRoutes(updated);
    saveRoutes(updated);
    setSelectedId(next.id);
    setModalOpen(false);
    setFrom("");
    setTo("");
    setDiasporaParcels(false);
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className="w-full"
        onClick={() => setModalOpen(true)}
      >
        + Adaugă o rută frecventă / Drum de întoarcere
      </Button>

      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600">Hartă rutelor</p>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px] text-zinc-600">
            {["Cluj", "Brașov", "Timișoara", "Iași", "București", "Constanța", "Craiova", "Londra"].map(
              (city) => (
                <span
                  key={city}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1"
                >
                  {city}
                </span>
              )
            )}
          </div>
          {selected ? (
            <div className="mt-4 space-y-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
              <p className="font-semibold">
                {selected.from} → {selected.to}
              </p>
              <p className="text-xs text-zinc-700">
                {selected.vehicle} · {selected.category}
                {selected.eta ? ` · ETA ${selected.eta}` : ""}
              </p>
              {selected.diasporaParcels || selected.international ? (
                <span className="inline-flex rounded-full bg-sky-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Pachet de Acasă / Transport Internațional
                </span>
              ) : null}
              {selected.promoUntil ? (
                <p className="text-[11px] text-emerald-800">
                  Promovare feed 3 zile până la{" "}
                  {new Date(selected.promoUntil).toLocaleDateString("ro-RO")}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              Apasă o rută din listă pentru detalii (anonim — fără CUI / firmă).
            </div>
          )}
        </div>

        <div className="space-y-2">
          {routes.map((route) => {
            const active = route.id === selectedId;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => setSelectedId(route.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-sm font-medium text-zinc-900">
                  <span>{route.from}</span>
                  <span className="text-emerald-600">→</span>
                  <span>{route.to}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                  <span>
                    {route.vehicle} · {route.category}
                  </span>
                  {route.eta ? <span>{route.eta}</span> : null}
                </div>
                {route.diasporaParcels || route.international ? (
                  <span className="mt-2 inline-flex rounded-full bg-sky-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Pachet de Acasă / Transport Internațional
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                Rută frecventă / Drum de întoarcere
              </h3>
              <button
                type="button"
                className="text-sm text-zinc-500"
                onClick={() => setModalOpen(false)}
              >
                Închide
              </button>
            </div>
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              Introdu ruta ta frecventă sau drumul de întoarcere pe gol și primești promovare
              gratuită timp de 3 zile pentru produsele tale românești/eco în feed-ul principal!
            </p>
            <form className="mt-3 space-y-3" onSubmit={handleAdd}>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="De la"
                  name="from"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  required
                  placeholder="București"
                />
                <Input
                  label="Către"
                  name="to"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                  placeholder="Londra / Cluj"
                />
              </div>
              <Select
                label="Tip mașină"
                name="vehicle"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                options={VEHICLE_OPTIONS}
              />
              <Select
                label="Categorie"
                name="category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (e.target.value === "Colete diaspora") setDiasporaParcels(true);
                }}
                options={CATEGORY_OPTIONS}
              />
              <label className="flex items-start gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={diasporaParcels}
                  onChange={(e) => setDiasporaParcels(e.target.checked)}
                />
                <span>
                  Iau colete diaspora — badge{" "}
                  <strong>Pachet de Acasă / Transport Internațional</strong>
                </span>
              </label>
              <p className="text-[11px] text-zinc-500">
                Anonim: nu cerem CUI și nu publicăm numele firmei.
              </p>
              <Button type="submit" className="w-full">
                Salvează ruta
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
