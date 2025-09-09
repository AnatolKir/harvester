import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle } from "@/components/ui/alert";

type ConfigItem = {
  key: string;
  value: unknown;
  description?: string | null;
  updated_at?: string | null;
};

type ConfigResponse = Array<ConfigItem>;

const KEY_ALERTS_ENABLED = "alerts_enabled" as const;
const KEY_SUCCESS_RATE_MIN = "alert_success_rate_min" as const;
const KEY_DISCOVERY_GAP_MIN = "alert_discovery_gap_min" as const;
const KEY_HARVEST_GAP_MIN = "alert_harvest_gap_min" as const;
const KEY_DLQ_THRESHOLD = "alert_dlq_threshold" as const;

async function getConfig(): Promise<ConfigResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032";
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const res = await fetch(`${baseUrl}/api/admin/config`, {
    cache: "no-store",
    headers: { Cookie: cookieHeader },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json?.data as ConfigResponse) ?? null;
}

function pickValue<T>(
  items: ConfigResponse | null,
  key: string,
  fallback: T
): T {
  const found = items?.find((i) => i.key === key)?.value;
  return (found as T | undefined) ?? fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default async function AlertsSettingsPage() {
  const cfg = await getConfig();

  // Defaults if not yet set in DB
  const defaults = {
    enabled: Boolean(pickValue(cfg, KEY_ALERTS_ENABLED, false)),
    successRateMin: Number(pickValue(cfg, KEY_SUCCESS_RATE_MIN, 80)), // percent
    discoveryGapMin: Number(pickValue(cfg, KEY_DISCOVERY_GAP_MIN, 60)), // minutes
    harvestGapMin: Number(pickValue(cfg, KEY_HARVEST_GAP_MIN, 60)), // minutes
    dlqThreshold: Number(pickValue(cfg, KEY_DLQ_THRESHOLD, 100)),
  };

  async function saveSettings(formData: FormData) {
    "use server";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3032";
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    const enabledStr = String(formData.get("alerts_enabled") || "disabled");
    const enabled = enabledStr === "enabled";
    const successRateMin = clampNumber(
      Number(formData.get("success_rate_min") || 80),
      1,
      100
    );
    const discoveryGapMin = clampNumber(
      Number(formData.get("discovery_gap_min") || 60),
      5,
      10080
    );
    const harvestGapMin = clampNumber(
      Number(formData.get("harvest_gap_min") || 60),
      5,
      10080
    );
    const dlqThreshold = clampNumber(
      Number(formData.get("dlq_threshold") || 100),
      0,
      100000
    );

    const updates: Array<{
      key: string;
      value: unknown;
      description?: string;
    }> = [
      {
        key: KEY_ALERTS_ENABLED,
        value: enabled,
        description: "Enable/disable Slack/email alerts",
      },
      {
        key: KEY_SUCCESS_RATE_MIN,
        value: successRateMin,
        description: "Minimum overall job success rate % before alerting",
      },
      {
        key: KEY_DISCOVERY_GAP_MIN,
        value: discoveryGapMin,
        description: "Max allowed minutes without discovery before alerting",
      },
      {
        key: KEY_HARVEST_GAP_MIN,
        value: harvestGapMin,
        description: "Max allowed minutes without harvesting before alerting",
      },
      {
        key: KEY_DLQ_THRESHOLD,
        value: dlqThreshold,
        description: "DLQ size threshold for backlog alert",
      },
    ];

    for (const u of updates) {
      const res = await fetch(`${baseUrl}/api/admin/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: baseUrl,
          Cookie: cookieHeader,
        },
        body: JSON.stringify(u),
      });
      if (!res.ok) {
        throw new Error(`Failed to update ${u.key}`);
      }
    }

    // Flash success message and revalidate
    cookieStore.set("flash_admin_alerts", "saved", {
      path: "/admin/alerts",
      maxAge: 60,
    });
    revalidatePath("/admin/alerts");
  }

  const flash = (await cookies()).get("flash_admin_alerts")?.value;

  if (!cfg) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin · Alerts</h1>
        <p className="text-muted-foreground">
          You do not have access to view or modify alert settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin · Alerts</h1>
        <p className="text-muted-foreground">
          Configure alert toggles and thresholds used by Slack/email
          notifications.
        </p>
      </div>

      {flash === "saved" && (
        <Alert>
          <AlertTitle>Settings saved</AlertTitle>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Alert Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveSettings} className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">Alerts</div>
              <Select
                name="alerts_enabled"
                defaultValue={defaults.enabled ? "enabled" : "disabled"}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">
                Success rate minimum (%)
              </div>
              <Input
                name="success_rate_min"
                type="number"
                min={1}
                max={100}
                defaultValue={defaults.successRateMin}
              />
            </div>

            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">
                Discovery gap (minutes)
              </div>
              <Input
                name="discovery_gap_min"
                type="number"
                min={5}
                max={10080}
                defaultValue={defaults.discoveryGapMin}
              />
            </div>

            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">
                Harvest gap (minutes)
              </div>
              <Input
                name="harvest_gap_min"
                type="number"
                min={5}
                max={10080}
                defaultValue={defaults.harvestGapMin}
              />
            </div>

            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">
                DLQ threshold (items)
              </div>
              <Input
                name="dlq_threshold"
                type="number"
                min={0}
                max={100000}
                defaultValue={defaults.dlqThreshold}
              />
            </div>

            <div className="flex items-end">
              <Button type="submit">Save Settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
