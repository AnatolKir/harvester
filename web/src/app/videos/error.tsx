"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm">
        {error?.message || "Failed to load videos."}
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
