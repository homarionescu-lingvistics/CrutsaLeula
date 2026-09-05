"use client";

import { useMemo, useState, useTransition } from "react";
import { closeListing } from "@/lib/listings/actions";
import type { Listing, ListingStatus } from "@/lib/listings/types";
import { STATUS_LABELS, typeMeta } from "@/lib/listings/labels";
import { Button } from "@/components/ui/button";
import { ShareListing } from "@/components/share/share-listing";

const FILTERS: { value: "all" | ListingStatus; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "active", label: "Activ" },
  { value: "pending", label: "În derulare" },
  { value: "closed", label: "Finalizat" },
];

export function MyListings({ listings }: { listings: Listing[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [pending, startTransition] = useTransition();

  const shown = useMemo(
    () => (filter === "all" ? listings : listings.filter((l) => l.status === filter)),
    [listings, filter]
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === f.value
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-slate-400">
          {listings.length === 0
            ? "Nu ai anunțuri. Mergi la Mânzare."
            : "Nimic pe acest filtru."}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((l) => {
            const meta = typeMeta(l.type);
            return (
              <li key={l.id} className="space-y-2 rounded-xl bg-slate-900/80 px-3 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-100">
                      {meta.emoji} {l.title}
                    </p>
                    <p className="text-xs text-slate-500">{STATUS_LABELS[l.status]}</p>
                  </div>
                  {l.status === "active" ? (
                    <form
                      action={(fd) => {
                        startTransition(async () => {
                          await closeListing(fd);
                        });
                      }}
                    >
                      <input type="hidden" name="id" value={l.id} />
                      <Button type="submit" variant="ghost" disabled={pending}>
                        Închide
                      </Button>
                    </form>
                  ) : null}
                </div>
                <ShareListing listing={l} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
