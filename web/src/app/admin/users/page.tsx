import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { UsersManagementClient } from "./users-management-client";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/auth/login");
  }

  // Use service client to check admin status and fetch data
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Admin functionality not available");
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
    redirect("/");
  }

  // Fetch initial users data
  const { data: users, error: usersError } = await serviceClient
    .from("v_user_management")
    .select("*")
    .order("status", { ascending: true }) // pending first
    .order("created_at", { ascending: false }); // newest first within status

  if (usersError) {
    throw new Error(`Failed to load users: ${usersError.message}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage user access and approval status
        </p>
      </div>

      <UsersManagementClient initialUsers={users || []} />
    </div>
  );
}
