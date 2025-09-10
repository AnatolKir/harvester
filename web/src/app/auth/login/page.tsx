"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMagicLink, setUseMagicLink] = useState(true);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (useMagicLink) {
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
    } else {
      // Password sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    }
  };

  return (
    <div className="relative container grid min-h-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Link href="/">TikTok Domain Harvester</Link>
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              Track and analyze domains discovered from TikTok promoted video
              comments.
            </p>
            <footer className="text-sm">
              Surface new domains in real-time
            </footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
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
                  Sign in to your account
                </h1>
                <p className="text-muted-foreground text-sm">
                  {useMagicLink
                    ? "Enter your email to receive a sign-in link"
                    : "Enter your email and password to sign in"}
                </p>
              </div>
              <form onSubmit={handleSignIn} className="space-y-4">
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
                {!useMagicLink && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                )}
                {error && <div className="text-sm text-red-500">{error}</div>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? useMagicLink
                      ? "Sending link..."
                      : "Signing in..."
                    : useMagicLink
                      ? "Send Magic Link"
                      : "Sign in"}
                </Button>
              </form>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setUseMagicLink(!useMagicLink)}
                  className="text-muted-foreground hover:text-primary text-sm underline"
                >
                  {useMagicLink
                    ? "Sign in with password instead"
                    : "Sign in with magic link instead"}
                </button>
              </div>
            </>
          )}
          <p className="text-muted-foreground px-8 text-center text-sm">
            Don't have an account?{" "}
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
