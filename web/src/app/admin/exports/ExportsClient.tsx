"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL as string;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export default function ExportsClient() {
  const [dateFilter, setDateFilter] = React.useState<string>("all");
  const [domainId, setDomainId] = React.useState<string>("");
  const [since, setSince] = React.useState<string>("");

  const base = getBaseUrl();

  const handleDownloadDomains = React.useCallback(() => {
    const url = `${base}/api/domains/export?dateFilter=${encodeURIComponent(dateFilter)}`;
    window.open(url, "_blank");
  }, [base, dateFilter]);

  const handleDownloadMentions = React.useCallback(() => {
    if (!domainId) return;
    const url = new URL(
      `${base}/api/domains/${encodeURIComponent(domainId)}/mentions/export`
    );
    if (since) {
      // Convert local datetime to ISO string
      const d = new Date(since);
      if (!isNaN(d.getTime())) {
        url.searchParams.set("since", d.toISOString());
      }
    }
    window.open(url.toString(), "_blank");
  }, [base, domainId, since]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin · Exports</h1>
        <p className="text-muted-foreground">
          Generate CSV exports for domains and mentions.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Domains CSV</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="md:w-64">
            <Label className="mb-1 block">Time Range</Label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button onClick={handleDownloadDomains}>Download CSV</Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Domain Mentions CSV</h2>
        <div className="grid gap-3 md:grid-cols-3 md:items-end">
          <div>
            <Label htmlFor="domainId" className="mb-1 block">
              Domain ID (UUID)
            </Label>
            <Input
              id="domainId"
              placeholder="550e8400-e29b-41d4-a716-446655440000"
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="since" className="mb-1 block">
              Since
            </Label>
            <Input
              id="since"
              type="datetime-local"
              value={since}
              onChange={(e) => setSince(e.target.value)}
            />
          </div>
          <div>
            <Button onClick={handleDownloadMentions} disabled={!domainId}>
              Download CSV
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
