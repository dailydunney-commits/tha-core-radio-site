import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  return NextResponse.json({ ok: true, route: "chat delete api live" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMessageId =
      typeof body?.messageId === "string" ? body.messageId : "";
    const rawAdminKey =
      typeof body?.adminKey === "string" ? body.adminKey : "";
    const action =
      typeof body?.action === "string" ? body.action : "delete";

    const messageId = rawMessageId.trim();
    const adminKey = rawAdminKey.trim();

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
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (action === "validate") {
      return NextResponse.json({ ok: true, validated: true });
    }

    if (!messageId) {
      return NextResponse.json(
        { error: "Missing messageId." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: true, messageId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete message.",
      },
      { status: 500 }
    );
  }
}