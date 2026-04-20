import { stableSkeletonKeys } from "@/lib/ui/skeleton-keys";

export default function Loading() {
  return (
    <main className="page-main flex flex-col gap-5 md:gap-6">
      <div className="animate-pulse">
        <div className="mb-4 h-8 w-48 rounded bg-card" />
        <div className="mb-8 h-6 w-96 rounded bg-card" />

        <div className="mb-8 flex flex-wrap gap-2">
          <div className="h-10 w-40 rounded bg-card" />
          <div className="h-10 min-w-[250px] flex-1 rounded bg-card" />
          <div className="h-10 w-24 rounded bg-card" />
        </div>

        <div className="space-y-4">
          {stableSkeletonKeys(8, "sections-row").map((key) => (
            <div key={key} className="rounded-lg bg-card p-6">
              <div className="mb-2 h-6 w-3/4 rounded bg-muted" />
              <div className="mb-4 h-4 w-1/2 rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded bg-muted" />
                <div className="h-6 w-24 rounded bg-muted" />
                <div className="h-6 w-32 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
