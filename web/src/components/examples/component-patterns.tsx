// Component Usage Patterns for TikTok Domain Harvester Dashboard
// This file demonstrates best practices for using shadcn/ui components

import React from "react";
import type { Domain, DashboardStats } from "@/types";

// ============================================================================
// 1. DASHBOARD STATS CARDS
// ============================================================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, TrendingUp, Calendar, MessageCircle } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  change?: string;
  icon: React.ReactNode;
}

export function StatsCard({ title, value, change, icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && <p className="text-muted-foreground text-xs">{change}</p>}
      </CardContent>
    </Card>
  );
}

// Usage Example:
export function DashboardStats({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Domains"
        value={stats.total_domains.toLocaleString()}
        change="+15% from last month"
        icon={<Globe className="text-muted-foreground h-4 w-4" />}
      />
      <StatsCard
        title="Domains Today"
        value={stats.domains_today}
        change="+5 from yesterday"
        icon={<Calendar className="text-muted-foreground h-4 w-4" />}
      />
      <StatsCard
        title="This Week"
        value={stats.domains_this_week}
        change="+23% from last week"
        icon={<TrendingUp className="text-muted-foreground h-4 w-4" />}
      />
      <StatsCard
        title="Total Comments"
        value={stats.total_comments.toLocaleString()}
        change="+8% from last month"
        icon={<MessageCircle className="text-muted-foreground h-4 w-4" />}
      />
    </div>
  );
}

// ============================================================================
// 2. DOMAIN STATUS BADGES
// ============================================================================

import { Badge } from "@/components/ui/badge";

type DomainStatus = "new" | "active" | "suspicious" | "verified" | "blocked";

interface DomainStatusBadgeProps {
  status: DomainStatus;
  count?: number;
}

export function DomainStatusBadge({ status, count }: DomainStatusBadgeProps) {
  const variants = {
    new: "default",
    active: "secondary",
    suspicious: "destructive",
    verified: "outline",
    blocked: "destructive",
  } as const;

  const labels = {
    new: "New",
    active: "Active",
    suspicious: "Suspicious",
    verified: "Verified",
    blocked: "Blocked",
  };

  return (
    <Badge variant={variants[status]}>
      {labels[status]}
      {count && ` (${count})`}
    </Badge>
  );
}

// ============================================================================
// 3. FILTER AND SEARCH BAR
// ============================================================================

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download } from "lucide-react";

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onTimeRangeChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onExport: () => void;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  onTimeRangeChange,
  onSortChange,
  onExport,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative min-w-[300px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
        <Input
          placeholder="Search domains..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select onValueChange={onTimeRangeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>

      <Select onValueChange={onSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mentions_desc">Most Mentions</SelectItem>
          <SelectItem value="recent">Most Recent</SelectItem>
          <SelectItem value="alphabetical">Alphabetical</SelectItem>
          <SelectItem value="first_seen">First Seen</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={onExport}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    </div>
  );
}

// ============================================================================
// 4. DOMAIN DETAILS MODAL
// ============================================================================

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DomainDetailsModalProps {
  domain: Domain | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DomainDetailsModal({
  domain,
  open,
  onOpenChange,
}: DomainDetailsModalProps) {
  if (!domain) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {domain.domain}
          </DialogTitle>
          <DialogDescription>
            Domain discovery and mention details
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-2 font-medium">Discovery Info</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">First seen:</span>
                  <span className="ml-2">
                    {new Date(domain.first_seen).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last seen:</span>
                  <span className="ml-2">
                    {new Date(domain.last_seen).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total mentions:</span>
                  <Badge variant="secondary" className="ml-2">
                    {domain.total_mentions}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-medium">Status</h4>
              <div className="space-y-2">
                <DomainStatusBadge status="active" />
                <p className="text-muted-foreground text-sm">
                  Active monitoring
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-medium">Recent Activity</h4>
            <div className="text-muted-foreground text-sm">
              Recent comment mentions and video appearances would be displayed
              here.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 5. ACTION DROPDOWN MENU
// ============================================================================

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Download as DownloadIcon,
  Flag,
  Ban,
} from "lucide-react";

interface DomainActionsProps {
  domain: Domain;
  onView: (domain: Domain) => void;
  onExport: (domain: Domain) => void;
  onFlag: (domain: Domain) => void;
  onBlock: (domain: Domain) => void;
}

export function DomainActions({
  domain,
  onView,
  onExport,
  onFlag,
  onBlock,
}: DomainActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(domain)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport(domain)}>
          <DownloadIcon className="mr-2 h-4 w-4" />
          Export Data
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onFlag(domain)}>
          <Flag className="mr-2 h-4 w-4" />
          Flag as Suspicious
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onBlock(domain)}
          className="text-destructive focus:text-destructive"
        >
          <Ban className="mr-2 h-4 w-4" />
          Block Domain
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// 6. LOADING SKELETON PATTERNS
// ============================================================================

import { Skeleton } from "@/components/ui/skeleton";

export function DomainTableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-8 w-[100px]" />
        </div>
      ))}
    </div>
  );
}

export function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-[120px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-[80px]" />
            <Skeleton className="h-3 w-[100px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// 7. ALERT PATTERNS
// ============================================================================

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

export function SystemStatusAlert({
  status,
}: {
  status: "online" | "offline" | "warning";
}) {
  const configs = {
    online: {
      icon: <CheckCircle className="h-4 w-4" />,
      title: "System Online",
      description:
        "Domain harvesting is running normally. Last update: 2 minutes ago.",
      variant: undefined,
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4" />,
      title: "Performance Warning",
      description:
        "High load detected. Some operations may be slower than usual.",
      variant: undefined,
    },
    offline: {
      icon: <AlertTriangle className="h-4 w-4" />,
      title: "System Offline",
      description:
        "Domain harvesting is currently unavailable. Please try again later.",
      variant: "destructive" as const,
    },
  };

  const config = configs[status];

  return (
    <Alert variant={config.variant}>
      {config.icon}
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription>{config.description}</AlertDescription>
    </Alert>
  );
}
