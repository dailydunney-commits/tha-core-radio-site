import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  return NextResponse.json({ ok: true, route: "chat feature api live" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawMessageId =
      typeof body?.messageId === "string" ? body.messageId : "";
    const rawAdminKey =
      typeof body?.adminKey === "string" ? body.adminKey : "";
    const rawLabel =
      typeof body?.featuredLabel === "string" ? body.featuredLabel : "Featured";
    const rawPrice =
      typeof body?.featuredPrice === "number"
        ? body.featuredPrice
        : Number(body?.featuredPrice ?? 0);
    const action =
      typeof body?.action === "string" ? body.action : "feature";

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
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "clear") {
      const { error } = await supabase
        .from("chat_messages")
        .update({
          is_featured: false,
          featured_label: null,
          featured_price: null,
        })
        .eq("is_featured", true);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, cleared: true });
    }

    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId." }, { status: 400 });
    }

    const shouldFeature = action !== "unfeature";

    const payload = shouldFeature
      ? {
          is_featured: true,
          featured_label: rawLabel.trim() || "Featured",
          featured_price: Number.isFinite(rawPrice) ? rawPrice : 0,
        }
      : {
          is_featured: false,
          featured_label: null,
          featured_price: null,
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
      featured: shouldFeature,
      messageId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update feature.",
      },
      { status: 500 }
    );
  }
}