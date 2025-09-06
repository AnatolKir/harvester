"use client";

import { useState } from "react";
import { CalendarDays, Globe, TrendingUp, Users } from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Types
import { Domain, DashboardStats } from "@/types";

// Mock data for demonstration
const mockStats: DashboardStats = {
  total_domains: 1234,
  domains_today: 45,
  domains_this_week: 156,
  total_videos: 5678,
  total_comments: 12345,
  total_mentions: 8901,
};

const mockDomains: Domain[] = [
  {
    id: "1",
    domain: "example.com",
    first_seen: "2024-01-15T10:30:00Z",
    last_seen: "2024-01-16T15:45:00Z",
    total_mentions: 23,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-16T15:45:00Z",
  },
  {
    id: "2",
    domain: "shop-deals.net",
    first_seen: "2024-01-16T08:20:00Z",
    last_seen: "2024-01-16T12:10:00Z",
    total_mentions: 8,
    created_at: "2024-01-16T08:20:00Z",
    updated_at: "2024-01-16T12:10:00Z",
  },
];

export function DashboardComponentsDemo() {
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Dashboard Components Demo</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Domains</CardTitle>
            <Globe className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockStats.total_domains.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Domains Today</CardTitle>
            <CalendarDays className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.domains_today}</div>
            <p className="text-muted-foreground text-xs">+5 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockStats.domains_this_week}
            </div>
            <p className="text-muted-foreground text-xs">+23% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Comments
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockStats.total_comments.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">+8% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Example */}
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertTitle>System Status</AlertTitle>
        <AlertDescription>
          Domain harvesting is running normally. Last update: 2 minutes ago.
        </AlertDescription>
      </Alert>

      {/* Tabs Navigation */}
      <Tabs defaultValue="domains" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="domains" className="space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardHeader>
              <CardTitle>Domain Filters</CardTitle>
              <CardDescription>
                Search and filter discovered domains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Input
                  placeholder="Search domains..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="min-w-[200px] flex-1"
                />

                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mentions">Most Mentions</SelectItem>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={() => setLoading(!loading)} variant="outline">
                  {loading ? "Stop Loading" : "Toggle Loading"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Domain Table */}
          <Card>
            <CardHeader>
              <CardTitle>Discovered Domains</CardTitle>
              <CardDescription>
                Domains extracted from TikTok comments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domain</TableHead>
                        <TableHead>Mentions</TableHead>
                        <TableHead>First Seen</TableHead>
                        <TableHead>Last Seen</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockDomains.map((domain) => (
                        <TableRow key={domain.id}>
                          <TableCell className="font-medium">
                            {domain.domain}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {domain.total_mentions}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(domain.first_seen).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {new Date(domain.last_seen).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedDomain(domain)}
                                  >
                                    View Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Domain Details</DialogTitle>
                                    <DialogDescription>
                                      Information about {domain.domain}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="font-medium">
                                        Domain:
                                      </span>
                                      <span className="col-span-3">
                                        {domain.domain}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="font-medium">
                                        Mentions:
                                      </span>
                                      <span className="col-span-3">
                                        <Badge>{domain.total_mentions}</Badge>
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="font-medium">
                                        First Seen:
                                      </span>
                                      <span className="col-span-3">
                                        {new Date(
                                          domain.first_seen
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <span className="font-medium">
                                        Last Seen:
                                      </span>
                                      <span className="col-span-3">
                                        {new Date(
                                          domain.last_seen
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    More
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>
                                    View Comments
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    Export Data
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">
                                    Mark as Spam
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination Example */}
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious href="#" />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#" isActive>
                            1
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#">2</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#">3</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext href="#" />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos">
          <Card>
            <CardHeader>
              <CardTitle>TikTok Videos</CardTitle>
              <CardDescription>
                Videos being monitored for domains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Video content would go here...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                Domain discovery trends and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Analytics charts would go here...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
