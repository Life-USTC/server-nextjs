export default function Loading() {
  return (
    <main className="page-main">
      <div className="animate-pulse">
        <div className="h-8 bg-card rounded w-48 mb-4" />
        <div className="h-6 bg-card rounded w-96 mb-8" />

        <div className="flex flex-wrap gap-2 mb-8">
          <div className="h-10 bg-card rounded w-40" />
          <div className="h-10 bg-card rounded w-40" />
          <div className="h-10 bg-card rounded w-40" />
          <div className="h-10 bg-card rounded flex-1 min-w-[250px]" />
          <div className="h-10 bg-card rounded w-24" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }, () => (
            <div
              key={`skeleton-${crypto.randomUUID()}`}
              className="p-6 bg-card rounded-lg"
            >
              <div className="h-6 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2 mb-4" />
              <div className="flex gap-2">
                <div className="h-6 bg-muted rounded w-20" />
                <div className="h-6 bg-muted rounded w-24" />
                <div className="h-6 bg-muted rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
