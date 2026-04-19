import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { id, adminKey } = await request.json();

    if (!id || !adminKey) {
      return NextResponse.json(
        { error: "Missing upload id or admin key." },
        { status: 400 }
      );
    }

    if (adminKey !== process.env.ADMIN_DELETE_KEY) {
      return NextResponse.json(
        { error: "Invalid admin key." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.DELETE_SUPABASE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error: `Missing vars -> NEXT_PUBLIC_SUPABASE_URL: ${!!supabaseUrl}, DELETE_SUPABASE_KEY: ${!!serviceRoleKey}`,
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("listener_uploads")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: `Database delete failed: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Upload not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Upload deleted from database.",
      id: data.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Server error.",
      },
      { status: 500 }
    );
  }
}