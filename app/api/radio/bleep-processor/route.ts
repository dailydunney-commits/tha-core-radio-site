import { NextRequest, NextResponse } from "next/server";
import { runRealBleepProcessor } from "@/lib/audio/real-bleep-processor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await runRealBleepProcessor(body);

    const httpStatus =
      result.status === "PROCESSED_AUDIO_READY"
        ? 200
        : result.status === "JOB_NOT_FOUND"
          ? 404
          : result.status === "MISSING_JOB_ID"
            ? 400
            : 423;

    return NextResponse.json(result, { status: httpStatus });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        status: "PROCESSOR_ROUTE_ERROR",
        message: "Real bleep processor route failed before processing.",
        error: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
