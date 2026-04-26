import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  return NextResponse.json({ ok: true, route: "chat pin api live" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const messageId =
      typeof body?.messageId === "string" ? body.messageId.trim() : "";

    const adminKey =
      typeof body?.adminKey === "string" ? body.adminKey.trim() : "";

    const action =
      typeof body?.action === "string" ? body.action.trim() : "pin";

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
        .update({ is_pinned: false })
        .eq("is_pinned", true);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, cleared: true });
    }

    if (!messageId) {
      return NextResponse.json(
        { error: "Missing messageId." },
        { status: 400 }
      );
    }

    const { error: clearError } = await supabase
      .from("chat_messages")
      .update({ is_pinned: false })
      .eq("is_pinned", true);

    if (clearError) {
      return NextResponse.json(
        { error: clearError.message },
        { status: 500 }
      );
    }

    const shouldPin = action !== "unpin";

    const { error } = await supabase
      .from("chat_messages")
      .update({ is_pinned: shouldPin })
      .eq("id", messageId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      pinned: shouldPin,
      messageId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update pin.",
      },
      { status: 500 }
    );
  }
}