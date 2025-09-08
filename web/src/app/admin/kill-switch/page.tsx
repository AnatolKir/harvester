import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

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

type KillSwitchStatus = {
  killSwitchActive: boolean;
};

async function getStatus(): Promise<KillSwitchStatus> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/kill-switch`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch kill switch status (${res.status})`);
  }
  const json = await res.json();
  return json.data as KillSwitchStatus;
}

async function assertAdminOrNotFound() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) notFound();
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin =
    (user.user_metadata &&
      (user.user_metadata.role === "admin" ||
        user.user_metadata.is_admin === true)) ||
    (user.email ? adminEmails.includes(user.email.toLowerCase()) : false);
  if (!isAdmin) notFound();
  return user.email || "admin";
}

export default async function KillSwitchPage() {
  const requesterEmail = await assertAdminOrNotFound();
  const status = await getStatus();

  async function activateAction(formData: FormData) {
    "use server";
    const reason = String(formData.get("reason") || "").trim();
    if (!reason) {
      throw new Error("Reason is required");
    }

    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/kill-switch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, requestedBy: requesterEmail }),
      }
    );

    revalidatePath("/admin/kill-switch");
  }

  async function deactivateAction(formData: FormData) {
    "use server";
    const reason = String(formData.get("reason") || "").trim();
    if (!reason) {
      throw new Error("Reason is required");
    }

    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/kill-switch`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, requestedBy: requesterEmail }),
      }
    );

    revalidatePath("/admin/kill-switch");
  }

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
