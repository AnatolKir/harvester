import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const severity = searchParams.get("severity");
    const acknowledged = searchParams.get("acknowledged");

    const supabase = createAdminClient();

    let query = supabase
      .from("system_alerts")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq("severity", severity);
    }

    if (acknowledged !== null) {
      query = query.eq("acknowledged", acknowledged === "true");
    }

    const { data: alerts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { alertId, action } = body;

    if (!alertId || !action) {
      return NextResponse.json(
        { error: "Missing alertId or action" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (action === "acknowledge") {
      const { error } = await supabase
        .from("system_alerts")
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
