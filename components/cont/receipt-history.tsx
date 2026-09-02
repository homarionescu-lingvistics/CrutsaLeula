import type { KosonTransaction } from "@/lib/supabase/wallet-queries";

type Props = {
  items: KosonTransaction[];
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ReceiptHistoryFeed({ items }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Ultimele bonuri scanate</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          Încă nu ai bonuri validate. Scanează un bon de chioșc din Mânzare.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
            >
              <span className="text-sm font-medium text-zinc-900">
                {item.amount > 0 ? "+" : ""}
                {item.amount} Koson — {item.description}
              </span>
              <time className="text-xs text-zinc-600">{formatDate(item.created_at)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
