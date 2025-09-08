import ExportsClient from "./ExportsClient";
import { createClient } from "@/lib/supabase/server";

export default async function AdminExportsPage() {
  // Ensure session cookies are initialized
  await createClient();
  return <ExportsClient />;
}
