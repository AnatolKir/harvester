import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type JobsStatus = {
  backfillCheckpoint: { value: unknown; updated_at: string } | null;
};

async function getJobsStatus(): Promise<JobsStatus | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032";
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const res = await fetch(`${baseUrl}/api/admin/jobs?hours=24`, {
    cache: "no-store",
    headers: { Cookie: cookieHeader },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json?.data as JobsStatus) ?? null;
}

export default async function BackfillControlsPage() {
  const status = await getJobsStatus();

  async function triggerBackfill(formData: FormData) {
    "use server";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032";
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    const days = Math.max(1, Math.min(30, Number(formData.get("days") || 7)));
    const limit = Math.max(
      10,
      Math.min(500, Number(formData.get("limit") || 100))
    );

    await fetch(`${baseUrl}/api/admin/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ action: "trigger_backfill", days, limit }),
    });

    revalidatePath("/admin/jobs/backfill");
  }

  const cpVal = status?.backfillCheckpoint?.value as
    | { lastDate?: string; offset?: number; notes?: string }
    | string
    | null
    | undefined;
  const cpUpdated = status?.backfillCheckpoint?.updated_at;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin · Backfill</h1>
        <p className="text-muted-foreground">
          Trigger and monitor discovery backfill.
        </p>
        <div className="mt-2">
          <Link href="/admin" className="text-sm underline">
            ← Back to Admin
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last checkpoint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <div className="text-muted-foreground">Updated</div>
            <div className="font-medium">
              {cpUpdated ? new Date(cpUpdated).toLocaleString() : "-"}
            </div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">Value</div>
            <div className="font-mono text-xs break-all">
              {typeof cpVal === "string"
                ? cpVal
                : JSON.stringify(cpVal ?? null)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trigger backfill</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={triggerBackfill} className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-muted-foreground mb-1 text-sm">
                Days (1–30)
              </div>
              <Input
                name="days"
                type="number"
                min={1}
                max={30}
                defaultValue={7}
              />
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-sm">
                Limit (10–500)
              </div>
              <Input
                name="limit"
                type="number"
                min={10}
                max={500}
                defaultValue={100}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Start Backfill</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
