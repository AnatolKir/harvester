export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="bg-muted h-6 w-48 animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-card h-24 animate-pulse rounded-lg border"
          />
        ))}
      </div>
    </div>
  );
}
