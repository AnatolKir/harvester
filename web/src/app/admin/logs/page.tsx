import Link from "next/link";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LogLevel = "debug" | "info" | "warn" | "error";

interface SystemLogRow {
  id: string;
  event_type: string;
  level: LogLevel;
  message: string;
  job_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface JobStatusRow {
  job_id: string;
  job_type: string;
}

interface SearchParams {
  level?: LogLevel | "all";
  jobType?: string;
  event?: string;
  hours?: string;
  correlationId?: string;
  cursor?: string;
  limit?: string;
}

type MetadataLike = Record<string, unknown> & {
  correlationId?: string;
  correlation_id?: string;
  domain_id?: string;
  domainId?: string;
  video_id?: string;
  videoId?: string;
};

function getCorrelationId(meta: Record<string, unknown> | null | undefined) {
  if (!meta || typeof meta !== "object") return null;
  const md = meta as MetadataLike;
  const cid = md.correlationId ?? md.correlation_id;
  return typeof cid === "string" ? cid : null;
}

function getDomainId(meta: Record<string, unknown> | null | undefined) {
  if (!meta || typeof meta !== "object") return null;
  const md = meta as MetadataLike;
  const id = md.domain_id ?? md.domainId;
  return typeof id === "string" ? id : null;
}

function getVideoId(meta: Record<string, unknown> | null | undefined) {
  if (!meta || typeof meta !== "object") return null;
  const md = meta as MetadataLike;
  const id = md.video_id ?? md.videoId;
  return typeof id === "string" ? id : null;
}

function encodeCursor(iso: string | null): string | null {
  return iso ? Buffer.from(String(iso)).toString("base64") : null;
}

function decodeCursor(cursor: string | undefined): string | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf8");
    const date = new Date(decoded);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

async function isAdminUser(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return false;

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const role =
    typeof metadata["role"] === "string"
      ? (metadata["role"] as string)
      : undefined;
  const isAdminFlag =
    typeof metadata["is_admin"] === "boolean"
      ? (metadata["is_admin"] as boolean)
      : false;
  const fromMeta = role === "admin" || isAdminFlag === true;

  const fromEnv = user.email
    ? adminEmails.includes(user.email.toLowerCase())
    : false;
  return Boolean(fromMeta || fromEnv);
}

export const dynamic = "force-dynamic";

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const supabase = await createClient();

  // RBAC
  if (!(await isAdminUser())) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin · Logs</h1>
        <p className="text-muted-foreground">
          You do not have access to system logs.
        </p>
      </div>
    );
  }

  const sp = (await searchParams) || {};
  const levelParam = (sp.level || "all") as LogLevel | "all";
  const jobTypeParam = (sp.jobType || "").trim();
  const eventParam = (sp.event || "").trim();
  const hours = Math.max(1, parseInt(sp.hours || "24", 10));
  const correlationParam = (sp.correlationId || "").trim();
  const cursorParam = sp.cursor;
  const limit = Math.min(
    Math.max(parseInt(sp.limit || "50", 10) || 50, 1),
    100
  );

  const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const decodedCursorIso = decodeCursor(cursorParam || undefined);

  // Build logs query
  let query = supabase
    .from("system_logs")
    .select("id,event_type,level,message,job_id,metadata,created_at")
    .gte("created_at", sinceIso);

  if (levelParam && levelParam !== "all") {
    query = query.eq("level", levelParam);
  }
  if (eventParam) {
    query = query.eq("event_type", eventParam);
  }
  if (correlationParam) {
    // Try both camelCase and snake_case in metadata JSONB
    query = query.or(
      `metadata->>correlationId.eq.${correlationParam},metadata->>correlation_id.eq.${correlationParam}`
    );
  }

  if (decodedCursorIso) {
    // Desc ordering; fetch older than cursor
    query = query.lt("created_at", decodedCursorIso);
  }

  query = query.order("created_at", { ascending: false }).limit(limit + 1);

  const { data: logsRaw, error: logsError } =
    await query.returns<SystemLogRow[]>();
  if (logsError) {
    throw new Error(`Failed to load logs: ${logsError.message}`);
  }

  const logs = (logsRaw || []) as SystemLogRow[];

  // Map job_id -> job_type for display and filtering
  const jobIds = Array.from(
    new Set(logs.map((l) => l.job_id).filter(Boolean))
  ) as string[];
  let jobTypeById = new Map<string, string>();
  if (jobIds.length > 0) {
    const { data: jobs } = await supabase
      .from("job_status")
      .select("job_id, job_type")
      .in("job_id", jobIds)
      .returns<JobStatusRow[]>();
    jobTypeById = new Map((jobs || []).map((j) => [j.job_id, j.job_type]));
  }

  const filteredLogs = jobTypeParam
    ? logs.filter((l) =>
        l.job_id ? jobTypeById.get(l.job_id) === jobTypeParam : false
      )
    : logs;

  const hasMore = filteredLogs.length > limit;
  const slice = filteredLogs.slice(0, limit);
  const nextCursor = encodeCursor(
    slice.length ? slice[slice.length - 1].created_at : null
  );

  // Build chips
  const levels: (LogLevel | "all")[] = [
    "all",
    "error",
    "warn",
    "info",
    "debug",
  ];

  // Preserve cookies for server data hydration in nested actions if needed
  // (not used directly here)

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Admin · System Logs
          </h1>
          <p className="text-muted-foreground text-sm">
            Recent events with filters and correlation IDs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-sm underline">
            Health
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href="/admin/jobs" className="text-sm underline">
            Jobs
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href="/admin/kill-switch" className="text-sm underline">
            Kill Switch
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          {levels.map((lvl) => {
            const active = lvl === levelParam;
            const sp = new URLSearchParams();
            if (lvl !== "all") sp.set("level", String(lvl));
            if (jobTypeParam) sp.set("jobType", jobTypeParam);
            if (eventParam) sp.set("event", eventParam);
            if (hours) sp.set("hours", String(hours));
            if (correlationParam) sp.set("correlationId", correlationParam);
            if (limit) sp.set("limit", String(limit));
            const href = sp.toString()
              ? `/admin/logs?${sp.toString()}`
              : "/admin/logs";
            return (
              <Link key={lvl} href={href}>
                <Badge variant={active ? "default" : "secondary"}>
                  {String(lvl).toUpperCase()}
                </Badge>
              </Link>
            );
          })}
        </div>

        <form className="flex items-center gap-2" action="/admin/logs">
          <Input
            name="jobType"
            placeholder="jobType (e.g. discovery)"
            defaultValue={jobTypeParam}
            className="h-8 w-48"
          />
          <Input
            name="event"
            placeholder="event_type (optional)"
            defaultValue={eventParam}
            className="h-8 w-48"
          />
          <Input
            name="correlationId"
            placeholder="correlationId"
            defaultValue={correlationParam}
            className="h-8 w-48"
          />
          <Input
            name="hours"
            type="number"
            min={1}
            max={720}
            defaultValue={String(hours)}
            className="h-8 w-24"
          />
          <Input
            name="limit"
            type="number"
            min={1}
            max={100}
            defaultValue={String(limit)}
            className="h-8 w-24"
          />
          <Button type="submit" variant="outline" className="h-8 px-3 text-xs">
            Apply
          </Button>
        </form>

        <AutoRefresh seconds={30} />
      </div>

      {/* Results table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Correlation</TableHead>
              <TableHead>Links</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground text-center text-sm"
                >
                  No logs.
                </TableCell>
              </TableRow>
            ) : (
              slice.map((l) => {
                const jobType = l.job_id
                  ? jobTypeById.get(l.job_id)
                  : undefined;
                const correlationId = getCorrelationId(l.metadata || undefined);
                const domainId = getDomainId(l.metadata || undefined);
                const videoId = getVideoId(l.metadata || undefined);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          l.level === "error"
                            ? "destructive"
                            : l.level === "warn"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {l.level.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{l.event_type}</TableCell>
                    <TableCell
                      className="max-w-xl truncate text-xs"
                      title={l.message}
                    >
                      {l.message}
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.job_id ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px]">
                            {l.job_id}
                          </span>
                          {jobType && (
                            <Link
                              className="text-primary underline"
                              href={`/admin/jobs?type=${encodeURIComponent(jobType)}`}
                            >
                              {jobType}
                            </Link>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {correlationId ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px]">
                            {correlationId}
                          </span>
                          <button
                            type="button"
                            className="text-primary underline"
                            data-copy={correlationId}
                            aria-label="Copy correlation id"
                          >
                            Copy
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-2">
                        {domainId && (
                          <Link
                            className="text-primary underline"
                            href={`/domains/${domainId}`}
                          >
                            Domain
                          </Link>
                        )}
                        {videoId && (
                          <Link
                            className="text-primary underline"
                            href={`/videos`}
                          >
                            Video
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-end gap-2">
        {hasMore && nextCursor ? (
          <Link
            href={buildHref({
              level: levelParam,
              jobType: jobTypeParam,
              event: eventParam,
              hours,
              correlationId: correlationParam,
              limit,
              cursor: nextCursor,
            })}
            className="text-sm underline"
          >
            Next
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">End</span>
        )}
      </div>
    </div>
  );
}

function buildHref(params: {
  level?: LogLevel | "all";
  jobType?: string;
  event?: string;
  hours?: number;
  correlationId?: string;
  limit?: number;
  cursor?: string | null;
}) {
  const sp = new URLSearchParams();
  if (params.level && params.level !== "all")
    sp.set("level", String(params.level));
  if (params.jobType) sp.set("jobType", params.jobType);
  if (params.event) sp.set("event", params.event);
  if (params.hours) sp.set("hours", String(params.hours));
  if (params.correlationId) sp.set("correlationId", params.correlationId);
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.cursor) sp.set("cursor", params.cursor);
  const qs = sp.toString();
  return qs ? `/admin/logs?${qs}` : "/admin/logs";
}

function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function(){
            var interval = ${Math.max(5, seconds)} * 1000;
            try {
              setInterval(function(){
                if (document && document.visibilityState === 'visible') {
                  var url = new URL(window.location.href);
                  // no change to params; trigger refresh
                  window.location.replace(url.toString());
                }
              }, interval);
              document.addEventListener('click', function(e){
                var t = e.target;
                if (!t) return;
                if (t.matches && t.matches('button[data-copy]')) {
                  try { navigator.clipboard.writeText(t.getAttribute('data-copy') || ''); } catch(e) {}
                }
              });
            } catch (e) {}
          })();
        `,
      }}
    />
  );
}
