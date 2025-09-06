"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Globe,
  ExternalLink,
  ArrowUpDown,
  Search,
  Calendar,
  Filter,
  Download,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { Domain } from "@/types";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data - in real app this would come from API
const mockDomains: Domain[] = [
  {
    id: "1",
    domain: "shopify.com",
    first_seen: "2024-01-15T08:00:00Z",
    last_seen: "2024-01-15T14:30:00Z",
    total_mentions: 24,
    created_at: "2024-01-15T08:00:00Z",
    updated_at: "2024-01-15T14:30:00Z",
  },
  {
    id: "2",
    domain: "etsy.com",
    first_seen: "2024-01-15T09:15:00Z",
    last_seen: "2024-01-15T13:45:00Z",
    total_mentions: 18,
    created_at: "2024-01-15T09:15:00Z",
    updated_at: "2024-01-15T13:45:00Z",
  },
  {
    id: "3",
    domain: "amazon.com",
    first_seen: "2024-01-14T16:20:00Z",
    last_seen: "2024-01-15T12:10:00Z",
    total_mentions: 42,
    created_at: "2024-01-14T16:20:00Z",
    updated_at: "2024-01-15T12:10:00Z",
  },
  {
    id: "4",
    domain: "instagram.com",
    first_seen: "2024-01-15T10:30:00Z",
    last_seen: "2024-01-15T15:20:00Z",
    total_mentions: 33,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T15:20:00Z",
  },
  {
    id: "5",
    domain: "tiktok.com",
    first_seen: "2024-01-14T12:00:00Z",
    last_seen: "2024-01-15T16:00:00Z",
    total_mentions: 67,
    created_at: "2024-01-14T12:00:00Z",
    updated_at: "2024-01-15T16:00:00Z",
  },
];

export default function DomainsPage() {
  const [loading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState("all");
  const [suspiciousFilter, setSuspiciousFilter] = React.useState("all");

  // Filter domains based on search and filters
  const filteredDomains = React.useMemo(() => {
    let filtered = [...mockDomains];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((d) =>
        d.domain.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Date filter
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

    // Suspicious filter
    if (suspiciousFilter !== "all") {
      filtered = filtered.filter((d) => {
        const isSuspicious = d.total_mentions > 50;
        return suspiciousFilter === "suspicious" ? isSuspicious : !isSuspicious;
      });
    }

    return filtered;
  }, [searchQuery, dateFilter, suspiciousFilter]);

  const columns: ColumnDef<Domain>[] = [
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
        const isSuspicious = mentions > 50; // Simple heuristic for demo

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
      cell: ({ row }) => {
        const mentions = row.getValue("total_mentions") as number;
        return <span className="font-mono">{mentions}</span>;
      },
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
      cell: ({ row }) => {
        const date = row.getValue("first_seen") as string;
        return (
          <span className="text-muted-foreground">{formatDate(date)}</span>
        );
      },
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
      cell: ({ row }) => {
        const date = row.getValue("last_seen") as string;
        return (
          <span className="text-muted-foreground">{formatDate(date)}</span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const domain = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/domains/${domain.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => console.log("View comments", domain.id)}
              >
                View Comments
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => console.log("Export", domain.id)}
              >
                Export Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Domains</h1>
          <p className="text-muted-foreground">
            All domains discovered from TikTok comments and promotional content.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm">Refresh</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold">{filteredDomains.length}</div>
          <p className="text-muted-foreground text-sm">Filtered domains</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold">
            {
              mockDomains.filter(
                (d) =>
                  new Date(d.first_seen).toDateString() ===
                  new Date().toDateString()
              ).length
            }
          </div>
          <p className="text-muted-foreground text-sm">New today</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold">
            {filteredDomains.reduce((sum, d) => sum + d.total_mentions, 0)}
          </div>
          <p className="text-muted-foreground text-sm">Total mentions</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-2xl font-bold">
            {filteredDomains.filter((d) => d.total_mentions > 50).length}
          </div>
          <p className="text-muted-foreground text-sm">High activity</p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={filteredDomains} loading={loading} />
    </div>
  );
}
