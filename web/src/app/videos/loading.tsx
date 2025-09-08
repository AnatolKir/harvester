import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="h-6 w-40">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="mt-1 h-4 w-80">
          <Skeleton className="h-4 w-80" />
        </div>
      </div>

      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


