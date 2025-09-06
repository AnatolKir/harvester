import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle auth errors from Supabase
  if (error) {
    const errorUrl = new URL("/auth/sign-in", origin);
    errorUrl.searchParams.set("error", error);
    if (errorDescription) {
      errorUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(errorUrl);
  }

  // Handle missing code
  if (!code) {
    const errorUrl = new URL("/auth/sign-in", origin);
    errorUrl.searchParams.set("error", "missing_code");
    errorUrl.searchParams.set(
      "error_description",
      "No authorization code provided"
    );
    return NextResponse.redirect(errorUrl);
  }

  try {
    const supabase = await createClient();

    // Exchange the code for a session
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth callback error:", exchangeError);
      const errorUrl = new URL("/auth/sign-in", origin);
      errorUrl.searchParams.set("error", "exchange_failed");
      errorUrl.searchParams.set("error_description", exchangeError.message);
      return NextResponse.redirect(errorUrl);
    }

    if (!data.session) {
      const errorUrl = new URL("/auth/sign-in", origin);
      errorUrl.searchParams.set("error", "no_session");
      errorUrl.searchParams.set(
        "error_description",
        "Failed to create session"
      );
      return NextResponse.redirect(errorUrl);
    }

    // Successful authentication - redirect to the intended page
    const redirectUrl = new URL(next, origin);

    // Add a success parameter to show confirmation message
    redirectUrl.searchParams.set("auth", "success");

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Unexpected auth callback error:", error);
    const errorUrl = new URL("/auth/sign-in", origin);
    errorUrl.searchParams.set("error", "unexpected_error");
    errorUrl.searchParams.set(
      "error_description",
      "An unexpected error occurred during authentication"
    );
    return NextResponse.redirect(errorUrl);
  }
}
