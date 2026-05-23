import { NextRequest, NextResponse } from "next/server";
import { runSmartDjLocalCleanOne } from "@/lib/audio/smartdj-local-clean-one";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result: any = await runSmartDjLocalCleanOne({
      ...body,
      origin: req.nextUrl.origin,
    });

    const httpStatus =
      result.status === "PROCESSED_AUDIO_READY"
        ? 200
        : result.status === "JOB_NOT_FOUND" || result.status === "SMARTDJ_TRACK_NOT_FOUND"
          ? 404
          : result.status === "MISSING_JOB_ID"
            ? 400
            : 423;

    return NextResponse.json(result, { status: httpStatus });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        status: "SMARTDJ_LOCAL_CLEAN_ONE_ROUTE_ERROR",
        message: "SmartDJ local clean-one route failed before processing.",
        error: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
