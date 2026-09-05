"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createListing } from "@/lib/listings/actions";
import { LISTING_TYPES } from "@/lib/listings/labels";
import type { ListingDraft } from "@/lib/listings/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const DRAFT_KEY = "crutsanimia_listing_draft";

export function saveListingDraft(draft: ListingDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function CreateListingForm({
  triggerLabel = "+ Anunț nou",
}: {
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<ListingDraft>({
    type: "product",
    barter_ok: true,
  });

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ListingDraft;
      setDraft((d) => ({ ...d, ...parsed }));
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
        <span className="font-semibold text-emerald-700">{triggerLabel}</span>
        <span className="text-xs text-zinc-500">{open ? "Ascunde" : "Deschide"}</span>
      </button>

      {open ? (
        <form
          className="space-y-3 border-t border-zinc-200 px-4 pb-4 pt-3"
          action={(formData) => {
            setError(null);
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
          <Select
            label="Tip"
            name="type"
            defaultValue={draft.type ?? "product"}
            options={LISTING_TYPES.map((t) => ({
              value: t.value,
              label: `${t.emoji} ${t.label}`,
            }))}
          />
          <Input
            label="Titlu scurt"
            name="title"
            required
            minLength={3}
            defaultValue={draft.title ?? ""}
            placeholder="50 saci cartofi"
          />
          <Input
            label="Descriere"
            name="description"
            defaultValue={draft.description ?? ""}
            placeholder="Soi, cantitate, disponibil azi"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Oraș"
              name="city"
              defaultValue={draft.city ?? ""}
              placeholder="Ploiești"
            />
            <Input
              label="Cartier / Sat"
              name="neighborhood"
              defaultValue={draft.neighborhood ?? ""}
              placeholder="Lazaret"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preț RON"
              name="price_ron"
              type="number"
              min={0}
              step="0.01"
              defaultValue={draft.price_ron ?? ""}
            />
            <Input
              label="Telefon contact"
              name="contact_phone"
              type="tel"
              defaultValue={draft.contact_phone ?? ""}
              placeholder="07xx xxx xxx"
            />
          </div>
          <Input
            label="Link poză (opțional)"
            name="photo_url"
            type="url"
            placeholder="https://..."
          />
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="barter_ok"
              defaultChecked={draft.barter_ok ?? true}
              className="h-4 w-4 rounded border-zinc-400"
            />
            Accept schimb / troc
          </label>
          {error ? (
            <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Se publică…" : "Publică anunțul"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
