"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createListing } from "@/lib/listings/actions";
import type { ListingDraft } from "@/lib/listings/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DRAFT_KEY = "crutsanimia_listing_draft";

type Role = "need" | "offer";

export function CreateLogisticsForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("need");
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<ListingDraft>({
    type: "request",
    barter_ok: true,
  });

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ListingDraft;
      setDraft((d) => ({ ...d, ...parsed }));
      if (parsed.type === "request") setRole("need");
      else setRole("offer");
      setOpen(true);
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-semibold text-sky-700">+ Transport / Utilaj / Ajutor</span>
        <span className="text-xs text-zinc-500">{open ? "Ascunde" : "Deschide"}</span>
      </button>

      {open ? (
        <form
          className="space-y-3 border-t border-zinc-200 px-4 pb-4 pt-3"
          action={(formData) => {
            setError(null);
            formData.set("type", role === "need" ? "request" : "service");
            startTransition(async () => {
              const result = await createListing(formData);
              if (result?.error) setError(result.error);
              else {
                setOpen(false);
                router.refresh();
              }
            });
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-800">Ce cauți?</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800">
              <input
                type="radio"
                name="role"
                value="need"
                checked={role === "need"}
                onChange={() => setRole("need")}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Am nevoie de transport</span>
                <span className="mt-0.5 block text-xs text-zinc-500">(Caut șofer)</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800">
              <input
                type="radio"
                name="role"
                value="offer"
                checked={role === "offer"}
                onChange={() => setRole("offer")}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Ofer transport / Am utilaj</span>
                <span className="mt-0.5 block text-xs text-zinc-500">(Sunt șofer)</span>
              </span>
            </label>
          </fieldset>

          <Input
            label="Titlu scurt"
            name="title"
            required
            minLength={3}
            defaultValue={draft.title ?? ""}
            placeholder={
              role === "need"
                ? "Caut transport porumb — 2 tone"
                : "Dubă prelată disponibilă / Tractor cu remorcă"
            }
          />
          <Input
            label={role === "need" ? "Ce ai de transportat și când?" : "Descriere"}
            name="description"
            defaultValue={draft.description ?? ""}
            placeholder={
              role === "need"
                ? "Marfă, cantitate, dată / oră ridicare"
                : "Disponibil azi, zonă, capacitate"
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Oraș" name="city" defaultValue={draft.city ?? ""} placeholder="Ploiești" />
            <Input
              label="Cartier / Sat"
              name="neighborhood"
              defaultValue={draft.neighborhood ?? ""}
              placeholder="Lazaret"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={role === "need" ? "Buget maxim oferit (opțional)" : "Preț / oră RON"}
              name="price_ron"
              type="number"
              min={0}
              step="0.01"
              defaultValue={draft.price_ron ?? ""}
            />
            <Input
              label="Telefon"
              name="contact_phone"
              type="tel"
              defaultValue={draft.contact_phone ?? ""}
              placeholder="07xx xxx xxx"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="barter_ok"
              defaultChecked={draft.barter_ok ?? true}
              className="h-4 w-4 rounded border-zinc-400"
            />
            Accept schimb / muncă la schimb
          </label>
          {error ? (
            <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Se publică…" : "Publică anunțul"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
