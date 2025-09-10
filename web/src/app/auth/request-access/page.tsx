"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";

export default function RequestAccessPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Sign up the user (they'll be created in pending status)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: Math.random().toString(36).slice(-12), // Random password since we'll use magic links
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("This email is already registered. Please sign in instead.");
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      // Send notification to admin (via your alerts system)
      await fetch("/api/admin/notify-access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName }),
      });

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError("Failed to submit request. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container flex min-h-screen items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
          <div className="flex flex-col space-y-2 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Access Requested
            </h1>
            <p className="text-muted-foreground text-sm">
              Your request has been submitted to the administrator.
            </p>
            <p className="text-muted-foreground mt-4 text-xs">
              You&apos;ll receive an email at {email} once your access is
              approved.
            </p>
          </div>
          <Link href="/auth/magic-link">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex min-h-screen items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Request Access
          </h1>
          <p className="text-muted-foreground text-sm">
            Submit your information for admin approval
          </p>
        </div>
        <form onSubmit={handleRequestAccess} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting..." : "Request Access"}
          </Button>
        </form>
        <p className="text-muted-foreground text-center text-sm">
          Already have access?{" "}
          <Link
            href="/auth/magic-link"
            className="hover:text-primary underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
