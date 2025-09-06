import { LoginForm } from "@/components/auth";
import Link from "next/link";

export default function LoginPage() {
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
              "Track and analyze domains discovered from TikTok promoted video
              comments."
            </p>
            <footer className="text-sm">
              Surface new domains in real-time
            </footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter your email below to sign in
            </p>
          </div>
          <LoginForm />
          <p className="text-muted-foreground px-8 text-center text-sm">
            Don't have an account?{" "}
            <Link
              href="/auth/signup"
              className="hover:text-primary underline underline-offset-4"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
