"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col space-y-4 text-center">
        <Clock className="mx-auto h-12 w-12 text-yellow-500" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Approval Pending
        </h1>
        <p className="text-muted-foreground text-sm">
          Your account is awaiting administrator approval.
        </p>
        <p className="text-muted-foreground text-xs">
          You&apos;ll receive an email once your access has been reviewed.
        </p>
        <Button variant="outline" onClick={handleSignOut} className="mt-6">
          Sign Out
        </Button>
      </div>
    </div>
  );
}
