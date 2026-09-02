import { getNeighborhoodRank } from "@/lib/cont/rank";

type Props = {
  xpPoints: number;
};

export function NeighborhoodRankCard({ xpPoints }: Props) {
  const rank = getNeighborhoodRank(xpPoints);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        Șmecherie de cartier
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">{rank.title}</h2>
          <p className="text-sm text-zinc-600">{rank.xpCurrent} XP acumulate</p>
        </div>
        <span className="text-4xl" aria-hidden>
          {rank.badge}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-900">
          <span>Progres rang</span>
          <span>
            {rank.nextTitle ? `${rank.progressPercent}% → ${rank.nextTitle}` : "Rang maxim"}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-zinc-900 transition-all"
            style={{ width: `${rank.progressPercent}%` }}
          />
        </div>
        {rank.xpNext ? (
          <p className="text-xs text-zinc-600">
            Încă {Math.max(0, rank.xpNext - rank.xpCurrent)} XP până la următorul rang
          </p>
        ) : null}
      </div>
    </section>
  );
}
