import { createClient } from "@/lib/supabase/server";
import { DomainTableClient } from "@/components/domains/DomainTableClient";

export default async function DomainsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_domains_overview")
    .select("domain, total_mentions, first_seen, last_seen")
    .order("last_seen", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to load domains: ${error.message}`);
  }

  return <DomainTableClient initialDomains={data || []} />;
}
