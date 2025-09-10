"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an external service
    // console.error(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">
        {error.message ||
          "An unexpected error occurred while loading this domain."}
      </p>
      <button
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium shadow transition-colors"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
