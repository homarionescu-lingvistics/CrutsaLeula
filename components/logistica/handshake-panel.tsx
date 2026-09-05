"use client";

import { useTransition } from "react";
import { confirmHandshake } from "@/lib/trust/handshake-actions";
import type { Handshake } from "@/lib/trust/handshake";
import { Button } from "@/components/ui/button";

type Props = {
  handshake: Handshake;
  userId: string;
  listingTitle: string;
};

export function HandshakePanel({ handshake, userId, listingTitle }: Props) {
  const [pending, startTransition] = useTransition();
  const isOwner = handshake.owner_id === userId;
  const isPartner = handshake.partner_id === userId;
  const ownerDone = Boolean(handshake.owner_confirmed_at);
  const partnerDone = Boolean(handshake.partner_confirmed_at);

  if (!isOwner && !isPartner) return null;

  return (
    <div className="mt-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm">
      <p className="font-medium text-emerald-900">Bate palma: {listingTitle}</p>
      {isOwner ? (
        <p className="mt-1 text-xs text-zinc-600">
          Cod pentru partener:{" "}
          <span className="font-mono text-lg font-bold text-emerald-700">{handshake.code}</span>
        </p>
      ) : null}
      <div className="mt-2 flex gap-2 text-xs">
        <span className={ownerDone ? "text-emerald-700" : "text-zinc-500"}>
          Proprietar {ownerDone ? "✓" : "…"}
        </span>
        <span className="text-zinc-400">|</span>
        <span className={partnerDone ? "text-emerald-700" : "text-zinc-500"}>
          Partener {partnerDone ? "✓" : handshake.partner_id ? "…" : "—"}
        </span>
      </div>
      <form
        className="mt-3"
        action={(fd) => {
          startTransition(async () => {
            await confirmHandshake(fd);
          });
        }}
      >
        <input type="hidden" name="handshake_id" value={handshake.id} />
        <Button
          type="submit"
          className="w-full"
          disabled={
            pending ||
            (isOwner && ownerDone) ||
            (isPartner && (partnerDone || !handshake.partner_id))
          }
        >
          {isOwner
            ? ownerDone
              ? "Ai confirmat"
              : "Confirmă predarea"
            : partnerDone
              ? "Ai confirmat"
              : "Confirmă primirea"}
        </Button>
      </form>
    </div>
  );
}
