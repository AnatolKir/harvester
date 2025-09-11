"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TriggerDiscoveryClient() {
  const [limit, setLimit] = useState<number>(50);
  const [isPending, startTransition] = useTransition();

  const onSubmit = () => {
    startTransition(async () => {
      const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
      const url = base ? `${base}/api/admin/jobs` : "/api/admin/jobs";
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_discovery", limit }),
        cache: "no-store",
      });
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
    </div>
  );
}
