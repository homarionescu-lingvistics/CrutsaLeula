import type { Listing } from "@/lib/listings/types";
import { ListingCard } from "./listing-card";

type Props = {
  listings: Listing[];
  emptyMessage?: string;
  detailBase?: string;
};

export function FeedList({ listings, emptyMessage, detailBase = "/piata" }: Props) {
  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-12 text-center">
        <p className="text-sm text-slate-400">
          {emptyMessage ??
            "Niciun anunț încă. Mergi la Mânzare."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} detailBase={detailBase} />
      ))}
    </div>
  );
}
