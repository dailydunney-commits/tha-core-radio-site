import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  return NextResponse.json({ ok: true, route: "chat spotlight api live" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawMessageId =
      typeof body?.messageId === "string" ? body.messageId : "";
    const rawAdminKey =
      typeof body?.adminKey === "string" ? body.adminKey : "";
    const rawLabel =
      typeof body?.spotlightLabel === "string" ? body.spotlightLabel : "On Air";
    const action =
      typeof body?.action === "string" ? body.action : "spotlight";

    const messageId = rawMessageId.trim();
    const adminKey = rawAdminKey.trim();
    const spotlightLabel = rawLabel.trim() || "On Air";

    const expectedAdminKey = (process.env.ADMIN_DELETE_KEY || "").trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceRoleKey = process.env.DELETE_SUPABASE_KEY || "";

    if (!expectedAdminKey || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing server environment variables." },
        { status: 500 }
      );
    }

    if (!adminKey || adminKey !== expectedAdminKey) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "clear") {
      const { error } = await supabase
        .from("chat_messages")
        .update({
          is_spotlight: false,
          spotlight_label: null,
          spotlighted_at: null,
        })
        .eq("is_spotlight", true);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, cleared: true });
    }

    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId." }, { status: 400 });
    }

    const { error: clearError } = await supabase
      .from("chat_messages")
      .update({
        is_spotlight: false,
        spotlight_label: null,
        spotlighted_at: null,
      })
      .eq("is_spotlight", true);

    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }

    const shouldSpotlight = action !== "unspotlight";

    const payload = shouldSpotlight
      ? {
          is_spotlight: true,
          spotlight_label: spotlightLabel,
          spotlighted_at: new Date().toISOString(),
        }
      : {
          is_spotlight: false,
          spotlight_label: null,
          spotlighted_at: null,
        };

    const { error } = await supabase
      .from("chat_messages")
      .update(payload)
      .eq("id", messageId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      spotlighted: shouldSpotlight,
      messageId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update spotlight.",
      },
      { status: 500 }
    );
  }
}