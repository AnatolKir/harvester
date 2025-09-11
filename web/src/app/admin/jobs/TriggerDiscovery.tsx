"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TriggerDiscoveryClient() {
  const [limit, setLimit] = useState<number>(50);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);
  const router = useRouter();

  const onSubmit = () => {
    startTransition(async () => {
      setMessage("");
      setIsError(false);
      const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
      const url = base ? `${base}/api/admin/jobs` : "/api/admin/jobs";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_discovery", limit }),
        cache: "no-store",
      });
      try {
        const json = await res.json();
        if (!res.ok || json?.success === false) {
          setIsError(true);
          setMessage(json?.error || `Failed (${res.status})`);
        } else {
          setMessage("Discovery triggered");
          router.refresh();
        }
      } catch {
        if (!res.ok) {
          setIsError(true);
          setMessage(`Failed (${res.status})`);
        } else {
          setMessage("Discovery triggered");
          router.refresh();
        }
      }
    });
  };

  return (
    <div className="flex items-end gap-2">
      <div>
        <div className="text-muted-foreground mb-1 text-sm">Limit (1–100)</div>
        <Input
          name="limit"
          type="number"
          min={1}
          max={100}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        />
      </div>
      <Button type="button" onClick={onSubmit} disabled={isPending}>
        {isPending ? "Starting…" : "Start Discovery"}
      </Button>
      {message && (
        <div
          className={`text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
