"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="space-y-2">
      <h2 className="text-destructive text-lg font-semibold">Failed to load domains</h2>
      <p className="text-muted-foreground text-sm">{error.message}</p>
    </div>
  );
}


