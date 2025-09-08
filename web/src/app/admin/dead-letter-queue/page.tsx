import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

type DlqItem = {
  id: string;
  original_event_name: string | null;
  original_payload: unknown;
  last_error: string | null;
  attempt_count: number | null;
  created_at: string;
  updated_at?: string | null;
  retry_after?: string | null;
  status: string;
};

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

async function getUserEmail() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email || "admin";
}

async function getDlq(status?: string): Promise<DlqItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032";
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const url = new URL(`${baseUrl}/api/admin/dead-letter-queue`);
  if (status && status !== "all") url.searchParams.set("status", status);

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { Cookie: cookieHeader },
  });

  if (!res.ok) return [];
  const json = await res.json();
  return (json.data || []) as DlqItem[];
}

function summarizePayload(payload: unknown): string {
  try {
    const text = JSON.stringify(payload);
    if (text.length <= 120) return text;
    return `${text.slice(0, 117)}...`;
  } catch {
    return "<unserializable>";
  }
}

export default async function DeadLetterQueuePage({ searchParams }: PageProps) {
  const requesterEmail = await getUserEmail();
  const status =
    typeof searchParams?.status === "string" ? searchParams?.status : "all";
  const page = Number(searchParams?.page ?? 1) || 1;
  const pageSize = 20;

  const items = await getDlq(status);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);

  async function retryAction(formData: FormData) {
    "use server";
    const dlqId = String(formData.get("dlqId") || "");
    if (!dlqId) throw new Error("Missing DLQ id");

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032";
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    await fetch(`${baseUrl}/api/admin/dead-letter-queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ dlqId, requestedBy: requesterEmail }),
    });

    revalidatePath("/admin/dead-letter-queue");
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const dlqId = String(formData.get("dlqId") || "");
    if (!dlqId) throw new Error("Missing DLQ id");

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032";
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    await fetch(`${baseUrl}/api/admin/dead-letter-queue`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ dlqId, requestedBy: requesterEmail }),
    });

    revalidatePath("/admin/dead-letter-queue");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Admin · Dead Letter Queue
        </h1>
        <p className="text-muted-foreground">
          Inspect failed jobs and take corrective action.
        </p>
        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertTitle>What is a Dead Letter Queue?</AlertTitle>
          <AlertDescription>
            The dead letter queue (DLQ) holds jobs that failed after retries.
            Use <strong>Retry</strong> to attempt processing again once the
            underlying issue is fixed, or <strong>Delete</strong> to permanently
            remove the failed item. Access to this page is restricted via RBAC
            (Role-Based Access Control).
          </AlertDescription>
        </Alert>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <form className="flex items-center gap-2">
            <input type="hidden" name="page" value="1" />
            <Select name="status" defaultValue={status}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="retry_scheduled">Retry Scheduled</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" formAction="/admin/dead-letter-queue">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dead Letter Items ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">ID</TableHead>
                <TableHead>Job Type</TableHead>
                <TableHead className="max-w-[320px]">Error</TableHead>
                <TableHead>First Failure</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead className="max-w-[320px]">Payload</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.id}</TableCell>
                  <TableCell>{item.original_event_name || "—"}</TableCell>
                  <TableCell
                    className="max-w-[320px] truncate"
                    title={item.last_error || undefined}
                  >
                    {item.last_error || "—"}
                  </TableCell>
                  <TableCell>
                    {new Date(item.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {item.updated_at
                      ? new Date(item.updated_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell>{item.attempt_count ?? 0}</TableCell>
                  <TableCell
                    className="max-w-[320px] truncate"
                    title={summarizePayload(item.original_payload)}
                  >
                    {summarizePayload(item.original_payload)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary">
                            Retry
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Retry job?</DialogTitle>
                            <DialogDescription>
                              This schedules a retry for the selected DLQ item.
                            </DialogDescription>
                          </DialogHeader>
                          <form
                            action={retryAction}
                            className="flex justify-end"
                          >
                            <input type="hidden" name="dlqId" value={item.id} />
                            <Button type="submit" variant="default">
                              Confirm Retry
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            Delete
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete DLQ item?</DialogTitle>
                            <DialogDescription>
                              This permanently removes the DLQ item. This action
                              cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <form
                            action={deleteAction}
                            className="flex justify-end"
                          >
                            <input type="hidden" name="dlqId" value={item.id} />
                            <Button type="submit" variant="destructive">
                              Confirm Delete
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="text-muted-foreground mt-4 flex w-full items-center justify-between text-sm">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={{
                    pathname: "/admin/dead-letter-queue",
                    query: { status, page: page - 1 },
                  }}
                  className="underline"
                >
                  Previous
                </Link>
              ) : (
                <span className="opacity-50">Previous</span>
              )}
              {page < totalPages ? (
                <Link
                  href={{
                    pathname: "/admin/dead-letter-queue",
                    query: { status, page: page + 1 },
                  }}
                  className="underline"
                >
                  Next
                </Link>
              ) : (
                <span className="opacity-50">Next</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
