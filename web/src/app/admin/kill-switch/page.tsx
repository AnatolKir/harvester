import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

type KillSwitchStatus = { killSwitchActive: boolean };

async function getStatus(): Promise<{ ok: boolean; data?: KillSwitchStatus }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032";
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const res = await fetch(`${baseUrl}/api/admin/kill-switch`, {
    cache: "no-store",
    headers: { Cookie: cookieHeader },
  });
  if (!res.ok) {
    return { ok: false };
  }
  const json = await res.json();
  return { ok: true, data: json.data as KillSwitchStatus };
}

async function getUserEmail() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email || "admin";
}

export default async function KillSwitchPage() {
  const requesterEmail = await getUserEmail();
  const statusResp = await getStatus();

  async function activateAction(formData: FormData) {
    "use server";
    const reason = String(formData.get("reason") || "").trim();
    if (!reason) {
      throw new Error("Reason is required");
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032";
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    await fetch(`${baseUrl}/api/admin/kill-switch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ reason, requestedBy: requesterEmail }),
    });

    revalidatePath("/admin/kill-switch");
  }

  async function deactivateAction(formData: FormData) {
    "use server";
    const reason = String(formData.get("reason") || "").trim();
    if (!reason) {
      throw new Error("Reason is required");
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032";
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    await fetch(`${baseUrl}/api/admin/kill-switch`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ reason, requestedBy: requesterEmail }),
    });

    revalidatePath("/admin/kill-switch");
  }

  if (!statusResp.ok) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Admin · Kill Switch
        </h1>
        <p className="text-muted-foreground">
          You do not have access to view or modify the kill switch.
        </p>
      </div>
    );
  }

  const status = statusResp.data!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Admin · Kill Switch
        </h1>
        <p className="text-muted-foreground">
          Pause or resume processing globally.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge
              variant={status.killSwitchActive ? "destructive" : "secondary"}
            >
              {status.killSwitchActive ? "Active (Stopped)" : "Inactive"}
            </Badge>
            <span className="text-muted-foreground text-sm">
              Changes are logged to system logs with actor and reason.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!status.killSwitchActive ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">Activate</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Activate Kill Switch</DialogTitle>
                    <DialogDescription>
                      Provide a reason. All harvesting jobs will be halted.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={activateAction} className="space-y-3">
                    <Input name="reason" placeholder="Reason (required)" />
                    <div className="flex justify-end gap-2">
                      <Button type="submit" variant="destructive">
                        Confirm Activate
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Deactivate</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Deactivate Kill Switch</DialogTitle>
                    <DialogDescription>
                      Provide a reason. Processing will resume.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={deactivateAction} className="space-y-3">
                    <Input name="reason" placeholder="Reason (required)" />
                    <div className="flex justify-end gap-2">
                      <Button type="submit" variant="default">
                        Confirm Deactivate
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
