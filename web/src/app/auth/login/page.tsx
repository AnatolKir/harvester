"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Send magic link
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

    setMagicLinkSent(true);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm">
      {magicLinkSent ? (
        <div className="flex flex-col space-y-4 text-center">
          <div className="rounded-lg bg-green-50 p-4">
            <h2 className="text-lg font-semibold">Check your email!</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              We&apos;ve sent a magic link to {email}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              Click the link to sign in. It expires in 1 hour.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setMagicLinkSent(false);
              setEmail("");
            }}
          >
            Try a different email
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter your email to receive a sign-in link
            </p>
          </div>
          <form onSubmit={handleSignIn} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending link..." : "Send Magic Link"}
            </Button>
          </form>
          <p className="text-muted-foreground text-center text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/request-access"
              className="hover:text-primary underline underline-offset-4"
            >
              Request access
            </Link>
          </p>
        </>
      )}
    </div>
  );
}