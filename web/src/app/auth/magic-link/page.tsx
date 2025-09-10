"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

export default function MagicLinkPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="container flex min-h-screen items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
          <div className="flex flex-col space-y-2 text-center">
            <Mail className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Check your email
            </h1>
            <p className="text-muted-foreground text-sm">
              We&apos;ve sent a magic link to {email}
            </p>
            <p className="text-muted-foreground mt-4 text-xs">
              Click the link in your email to sign in. The link expires in 1
              hour.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex min-h-screen items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in with Magic Link
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter your email to receive a secure sign-in link
          </p>
        </div>
        <form onSubmit={handleMagicLink} className="space-y-4">
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
            {loading ? "Sending..." : "Send Magic Link"}
          </Button>
        </form>
        <div className="text-center text-sm">
          <Link
            href="/auth/login"
            className="text-muted-foreground hover:text-primary"
          >
            Sign in with password instead
          </Link>
        </div>
        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            New user?{" "}
            <Link
              href="/auth/request-access"
              className="hover:text-primary underline underline-offset-4"
            >
              Request access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
