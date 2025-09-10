"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Globe,
  ExternalLink,
  ArrowUpDown,
  Filter,
  Calendar,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { DomainOverview } from "@/types/api";

interface Props {
  initialDomains: DomainOverview[];
}

export function DomainTableClient({ initialDomains }: Props) {
  const [loading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState("all");
  const [suspiciousFilter, setSuspiciousFilter] = React.useState("all");

  const filteredDomains = React.useMemo(() => {
    let filtered = [...initialDomains];
    if (searchQuery) {
      filtered = filtered.filter((d) =>
        d.domain.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (dateFilter !== "all") {
      const now = new Date();
      const dayInMs = 24 * 60 * 60 * 1000;
      filtered = filtered.filter((d) => {
        const firstSeen = new Date(d.first_seen);
        switch (dateFilter) {
          case "today":
            return firstSeen.toDateString() === now.toDateString();
          case "week":
            return firstSeen.getTime() > now.getTime() - 7 * dayInMs;
          case "month":
            return firstSeen.getTime() > now.getTime() - 30 * dayInMs;
          default:
            return true;
        }
      });
    }
    if (suspiciousFilter !== "all") {
      filtered = filtered.filter((d) => {
        const isSuspicious = d.total_mentions > 50;
        return suspiciousFilter === "suspicious" ? isSuspicious : !isSuspicious;
      });
    }
    return filtered;
  }, [initialDomains, searchQuery, dateFilter, suspiciousFilter]);

  const columns: ColumnDef<DomainOverview>[] = [
    {
      accessorKey: "domain",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Domain
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const domain = row.getValue("domain") as string;
        const mentions = row.original.total_mentions;
        const isSuspicious = mentions > 50;
        return (
          <div className="flex items-center space-x-2">
            <Globe className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">{domain}</span>
            {isSuspicious && (
              <Badge variant="destructive" className="text-xs">
                High Activity
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0"
              onClick={() => window.open(`https://${domain}`, "_blank")}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Link
              href={`/domains/${encodeURIComponent(domain)}`}
              className="text-primary"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0"
                aria-label="View videos mentioning this domain"
              >
                <Film className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        );
      },
    },
    {
      accessorKey: "total_mentions",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Mentions
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono">
          {row.getValue("total_mentions") as number}
        </span>
      ),
    },
    {
      accessorKey: "first_seen",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          First Seen
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.getValue("first_seen") as string)}
        </span>
      ),
    },
    {
      accessorKey: "last_seen",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Last Seen
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.getValue("last_seen") as string)}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div className="from-primary/5 to-accent/5 glass relative overflow-hidden rounded-xl bg-gradient-to-br via-transparent p-8">
        <div className="relative z-10">
          <h1 className="gradient-text-subtle text-4xl font-bold tracking-tight">
            Domains
          </h1>
          <p className="text-muted-foreground mt-2">
            All domains discovered from TikTok comments and promotional content.
          </p>
        </div>
        <div className="bg-primary/5 absolute -top-20 -right-20 h-40 w-40 rounded-full blur-3xl" />
        <div className="bg-accent/5 absolute -bottom-10 -left-20 h-40 w-40 rounded-full blur-3xl" />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 md:max-w-sm">
          <Input
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-hover border-border/50 pl-3"
          />
        </div>
        <div className="flex gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={suspiciousFilter} onValueChange={setSuspiciousFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              <SelectItem value="suspicious">High Activity</SelectItem>
              <SelectItem value="normal">Normal Activity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card border-border/50 card-hover glass-hover relative overflow-hidden rounded-xl border p-4">
          <div className="from-chart-1/10 absolute inset-0 bg-gradient-to-br to-transparent" />
          <div className="relative">
            <div className="text-2xl font-bold">{filteredDomains.length}</div>
            <p className="text-muted-foreground text-sm">Filtered domains</p>
          </div>
        </div>
        <div className="bg-card border-border/50 card-hover glass-hover relative overflow-hidden rounded-xl border p-4">
          <div className="from-chart-2/10 absolute inset-0 bg-gradient-to-br to-transparent" />
          <div className="relative">
            <div className="text-2xl font-bold">
              {
                filteredDomains.filter(
                  (d) =>
                    new Date(d.first_seen).toDateString() ===
                    new Date().toDateString()
                ).length
              }
            </div>
            <p className="text-muted-foreground text-sm">New today</p>
          </div>
        </div>
        <div className="bg-card border-border/50 card-hover glass-hover relative overflow-hidden rounded-xl border p-4">
          <div className="from-chart-3/10 absolute inset-0 bg-gradient-to-br to-transparent" />
          <div className="relative">
            <div className="text-2xl font-bold">
              {filteredDomains.reduce((sum, d) => sum + d.total_mentions, 0)}
            </div>
            <p className="text-muted-foreground text-sm">Total mentions</p>
          </div>
        </div>
        <div className="bg-card border-border/50 card-hover glass-hover relative overflow-hidden rounded-xl border p-4">
          <div className="from-destructive/10 absolute inset-0 bg-gradient-to-br to-transparent" />
          <div className="relative">
            <div className="text-2xl font-bold">
              {filteredDomains.filter((d) => d.total_mentions > 50).length}
            </div>
            <p className="text-muted-foreground text-sm">High activity</p>
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredDomains} loading={loading} />
    </div>
  );
}
