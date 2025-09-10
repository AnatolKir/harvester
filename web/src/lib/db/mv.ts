import { getServerEnv } from "../../../lib/env";

export function matviewsEnabled(): boolean {
  try {
    const env = getServerEnv();
    // Accept booleans or string values
    const raw = (env as unknown as { MATVIEWS_ENABLED?: boolean | string })
      .MATVIEWS_ENABLED;
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "string") return raw.toLowerCase() === "true";
  } catch {
    // In environments where env isn't accessible, default to false
  }
  return false;
}

export function domainsOverviewSource(): string {
  return matviewsEnabled() ? "mv_domains_overview" : "v_domains_overview";
}

export function videosWithDomainsSource(): string {
  return matviewsEnabled() ? "mv_videos_with_domains" : "v_videos_with_domains";
}
