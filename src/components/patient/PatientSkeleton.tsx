export function PatientSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="px-5 pb-6 pt-6" aria-busy="true" aria-label={label}>
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="mt-4 h-32 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
