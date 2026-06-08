import { NextRequest, NextResponse } from "next/server";

type AnyRecord = Record<string, any>;

const VERSION = "AI_HOST_COHOST_SHOW_V1_DRY_ONLY";

function cleanText(value: unknown, fallback = "", max = 3000) {
  return String(value ?? fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function buildCohostScript(body: AnyRecord) {
  // COHOST_OWNER_NOTES_NOT_SPOKEN_V1
  // Owner notes guide the test/request, but must never be spoken on air.
  const topic = cleanText(
    body.topic || "life, music, money, relationships, and everyday listener talk",
    "life, music, money, relationships, and everyday listener talk",
    300
  );

  return [
    "PRODIGY: This is Prodigy from Tha Core, and you are locked into the lighter side of the station.",
    "DIAMOND: And this is Diamond, right beside him, bringing the sparkle, the laugh, and the real talk.",
    "",
    `PRODIGY: Tonight we are touching on ${topic}. Not too heavy, not too stiff, just real conversation for real listeners.`,
    "DIAMOND: Exactly. Sometimes people do not need a lecture. Sometimes they need somebody to say, yes, life is serious, but you can still smile while you figure it out.",
    "",
    "PRODIGY: Question for the listeners: what is one thing you are trying to improve this week? Money, discipline, relationship, business, health, or just your peace of mind?",
    "DIAMOND: And be honest with yourself. Sometimes the answer is, I need to stop answering messages that disturb my spirit.",
    "",
    "PRODIGY: That one right there is a full sermon in one sentence.",
    "DIAMOND: See? That is why I am here. I save people time.",
    "",
    "PRODIGY: But real talk, whatever you are building, keep it steady. Do not let pressure rush your decisions.",
    "DIAMOND: And do not let anybody make you feel small because you are still figuring things out. Progress has different speeds.",
    "",
    "PRODIGY: Tha Core listeners, send in your questions, your thoughts, your comments, and your real-life situations. We might not have every answer, but we can reason it out together.",
    "DIAMOND: Keep it respectful, keep it honest, and keep it fun. This is Prodigy and Diamond on Tha Core, and we are just getting started.",

  ]
    .filter(Boolean)
    .join("\n");
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-cohost-show",
    phase: VERSION,
    purpose:
      "Dry-only co-host show brain for Prodigy and Diamond. They interact with each other, listeners, audience questions, comments, jokes, suggestions, and light entertainment.",
    hosts: [
      {
        hostId: "prodigy",
        hostName: "Prodigy from Tha Core",
        role: "male co-host, calm, witty, smart, practical, business/life/sports/world-comment energy",
      },
      {
        hostId: "diamond",
        hostName: "Diamond from Tha Core",
        role: "female co-host, stylish, funny, warm, entertainment/lifestyle/relationship/community energy",
      },
    ],
    draftOnly: true,
    voiceStarted: false,
    broadcastStarted: false,
    doesNotTouchNewsRunner: true,
    doesNotTouchCurrentBroadcast: true,
    doesNotTouchSmartZJ: true,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const script = buildCohostScript(body);

    return NextResponse.json({
      ok: true,
      route: "/api/radio/ai-host-cohost-show",
      phase: VERSION,
      showName: "Prodigy & Diamond",
      showType: "lighter-side-cohost-talk-entertainment",
      hosts: ["Prodigy from Tha Core", "Diamond from Tha Core"],
      draftOnly: true,
      voiceStarted: false,
      broadcastStarted: false,
      doesNotTouchNewsRunner: true,
      doesNotTouchCurrentBroadcast: true,
      doesNotTouchSmartZJ: true,
      script,
      nextStep:
        "Review and approve before connecting this co-host show to generated voice or broadcast.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        phase: VERSION,
        error: "AI_HOST_COHOST_SHOW_ERROR",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

