import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PHASE = "AI_HOST_LONG_SHOW_VOICE_PACKAGE_V1_PREP_ONLY";

export async function GET() {
  return NextResponse.json({
    ok: true,
    phase: PHASE,
    route: "/api/radio/ai-host-long-show-voice-package",
    purpose:
      "Prepare full 3.5-hour long-show voice/audio packages for Morning, Evening, or Night shows.",
    status: "ROUTE_SHELL_READY_NOT_GENERATING_AUDIO_YET",
    nextBuildStep:
      "Load latest long-show script package, choose one show, then generate Prodigy/Diamond audio parts.",
    safety: {
      prepOnly: true,
      voiceStarted: false,
      broadcastStarted: false,
      doesNotTouchNiaNews: true,
      doesNotTouchCurrentBroadcast: true,
      doesNotTouchSmartZJ: true,
      routeDoesNotWriteCurrentBroadcast: true,
    },
  });
}

export async function POST() {
  return GET();
}
