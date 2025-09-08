export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted h-24 animate-pulse rounded" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-muted h-48 animate-pulse rounded" />
        ))}
      </div>
      <div className="bg-muted h-56 animate-pulse rounded" />
    </div>
  );
}
