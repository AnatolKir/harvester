export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="bg-muted h-8 w-64 animate-pulse rounded" />
        <div className="bg-muted mt-2 h-4 w-96 animate-pulse rounded" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted h-24 animate-pulse rounded-lg border"
          />
        ))}
      </div>
      <div className="bg-muted h-40 animate-pulse rounded-lg border" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted h-14 animate-pulse rounded border" />
        ))}
      </div>
    </div>
  );
}
