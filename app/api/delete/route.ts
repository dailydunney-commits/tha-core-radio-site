import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, adminKey } = body as {
      messageId?: string;
      adminKey?: string;
    };

    const expectedAdminKey = process.env.ADMIN_DELETE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.DELETE_SUPABASE_KEY;

    if (!expectedAdminKey || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing server environment variables." },
        { status: 500 }
      );
    }

    if (!adminKey || adminKey !== expectedAdminKey) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId." }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
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