import { NextRequest, NextResponse } from "next/server";
import { runLocalTranscribeAndProcess } from "@/lib/audio/local-transcribe-and-process";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result: any = await runLocalTranscribeAndProcess(body);

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
        status: "LOCAL_TRANSCRIBE_PROCESS_ROUTE_ERROR",
        message: "Local transcribe and process route failed before processing.",
        error: String(error?.message || error),
      },
      { status: 500 }
    );
  }
}
