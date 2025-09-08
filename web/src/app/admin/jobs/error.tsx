"use client";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <div className="space-y-2 rounded border p-4">
      <div className="text-lg font-semibold">Failed to load job metrics</div>
      <div className="text-muted-foreground text-sm">
        {error?.message || "Unknown error"}
      </div>
    </div>
  );
}
