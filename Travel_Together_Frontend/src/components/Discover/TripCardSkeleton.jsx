/* Mirrors TripFeedCard's shape so the grid doesn't jump when trips arrive. */
export default function TripCardSkeleton() {
  return (
    <div style={{ animation: "ttShimmer 1.4s ease-in-out infinite" }} aria-hidden="true">
      <div className="rounded-2xl border border-line bg-line-soft aspect-4/5" />
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="h-4 w-1/2 rounded-full bg-line-soft" />
          <div className="h-4 w-14 rounded-full bg-line-soft" />
        </div>
        <div className="mt-2.5 h-3 w-2/3 rounded-full bg-line-soft" />
        <div className="mt-3 h-3 w-1/2 rounded-full bg-line-soft" />
        <div className="mt-3.5 flex items-center gap-2">
          <div className="h-5.5 w-5.5 rounded-full bg-line-soft" />
          <div className="h-3 w-24 rounded-full bg-line-soft" />
        </div>
      </div>
    </div>
  );
}
