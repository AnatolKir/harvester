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
  const [clearing, setClearing] = useState<boolean>(false);
  const [cleared, setCleared] = useState<string>("");

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

  const clearStuck = () => {
    startTransition(async () => {
      setCleared("");
      setIsError(false);
      setClearing(true);
      const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
      const url = base ? `${base}/api/admin/jobs` : "/api/admin/jobs";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_stuck", minutes: 3 }),
        cache: "no-store",
      });
      setClearing(false);
      try {
        const json = await res.json();
        if (!res.ok || json?.success === false) {
          setIsError(true);
          setCleared(json?.error || `Failed (${res.status})`);
        } else {
          setCleared(`Cleared ${json?.data?.cleared ?? 0}`);
          router.refresh();
        }
      } catch {
        if (!res.ok) {
          setIsError(true);
          setCleared(`Failed (${res.status})`);
        } else {
          setCleared("Cleared");
          router.refresh();
        }
      }
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
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
      <Button
        type="button"
        variant="outline"
        onClick={clearStuck}
        disabled={clearing}
      >
        {clearing ? "Clearing…" : "Clear stuck jobs"}
      </Button>
      {message && (
        <div
          className={`text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message}
        </div>
      )}
      {cleared && (
        <div
          className={`text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
        >
          {cleared}
        </div>
      )}
    </div>
  );
}
