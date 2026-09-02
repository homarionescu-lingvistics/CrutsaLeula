"use client";

import { QRCodeSVG } from "qrcode.react";

type Props = {
  balance: number;
  qrToken: string;
};

export function KosonWalletCard({ balance, qrToken }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-300 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        Portofel digital Rahova
      </p>
      <p className="mt-3 text-3xl font-black text-black">
        {balance} <span className="text-xl font-bold text-zinc-900">KOSON / E-CODRU</span>
      </p>
      <p className="mt-1 text-sm text-zinc-700">
        Prezentă codul QR la chioșcurile locale pentru validare.
      </p>
      <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <QRCodeSVG value={qrToken} size={168} level="M" includeMargin />
        <p className="text-center text-[11px] text-zinc-600">
          Token securizat · scanare chioșc
        </p>
      </div>
    </section>
  );
}
