"use client";

import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RejectedPage() {
  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col space-y-4 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="text-2xl font-semibold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground text-sm">
          Your access request has been denied by the administrator.
        </p>
        <Link href="/auth/login" className="mt-6 block">
          <Button variant="outline" className="w-full">
            Back to Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
