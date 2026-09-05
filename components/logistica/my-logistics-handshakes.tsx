"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startHandshake } from "@/lib/trust/handshake-actions";
import type { Listing } from "@/lib/listings/types";
import { isLogisticsType, STATUS_LABELS } from "@/lib/listings/labels";
import { Button } from "@/components/ui/button";

type Props = {
  listings: Listing[];
  handshakes: Record<string, import("@/lib/trust/handshake").Handshake | null>;
  userId: string;
};

export function MyLogisticsHandshakes({ listings, handshakes, userId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [codes, setCodes] = useState<Record<string, string>>({});

  const logistics = listings.filter((l) => isLogisticsType(l.type));

  if (logistics.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Niciun anunț la Strungă cu rost. Publică unul mai sus.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {logistics.map((l) => {
        const hs = handshakes[l.id];
        const showStart = l.status === "active" && !hs;
        const code = codes[l.id];

        return (
          <li key={l.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">{l.title}</p>
                <p className="text-xs text-zinc-500">{STATUS_LABELS[l.status]}</p>
              </div>
              {showStart ? (
                <form
                  action={(fd) => {
                    startTransition(async () => {
                      const result = await startHandshake(fd);
                      if (result?.code) {
                        setCodes((c) => ({ ...c, [l.id]: result.code! }));
                        router.refresh();
                      }
                    });
                  }}
                >
                  <input type="hidden" name="listing_id" value={l.id} />
                  <Button type="submit" variant="ghost" className="border border-zinc-200" disabled={pending}>
                    Bate palma
                  </Button>
                </form>
              ) : null}
            </div>
            {code || hs?.code ? (
              <p className="mt-2 text-xs text-emerald-700">
                Cod: <span className="font-mono text-base">{code ?? hs?.code}</span>
              </p>
            ) : null}
            {hs && (hs.owner_id === userId || hs.partner_id === userId) ? (
              <p className="mt-1 text-xs text-zinc-500">
                {hs.owner_confirmed_at && hs.partner_confirmed_at
                  ? "Finalizat ✓"
                  : "Așteaptă confirmarea ambelor părți"}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
