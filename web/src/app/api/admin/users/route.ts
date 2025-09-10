import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use service client to check admin status from user_profiles
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Admin functionality not available" },
        { status: 503 }
      );
    }

    const serviceClient = createServiceClient(supabaseUrl, serviceRoleKey);

    // Check if user is admin
    const { data: profile, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin" ||
      profile.status !== "approved"
    ) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Fetch all users from the view using service client
    const { data: users, error: usersError } = await serviceClient
      .from("v_user_management")
      .select("*")
      .order("status", { ascending: true }) // pending first
      .order("created_at", { ascending: false }); // newest first within status

    if (usersError) {
      console.error("Failed to fetch users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ users: users || [] }, { status: 200 });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use service client to check admin status from user_profiles
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Admin functionality not available" },
        { status: 503 }
      );
    }

    const serviceClient = createServiceClient(supabaseUrl, serviceRoleKey);

    // Check if user is admin
    const { data: profile, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin" ||
      profile.status !== "approved"
    ) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, userId, reason } = body;

    if (!action || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Call the approve_user function using service client
      const { error: approveError } = await serviceClient.rpc("approve_user", {
        target_user_id: userId,
      });

      if (approveError) {
        console.error("Failed to approve user:", approveError);
        return NextResponse.json(
          { error: "Failed to approve user" },
          { status: 500 }
        );
      }
    } else if (action === "reject") {
      // Call the reject_user function using service client
      const { error: rejectError } = await serviceClient.rpc("reject_user", {
        target_user_id: userId,
        reason: reason || null,
      });

      if (rejectError) {
        console.error("Failed to reject user:", rejectError);
        return NextResponse.json(
          { error: "Failed to reject user" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("User action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
