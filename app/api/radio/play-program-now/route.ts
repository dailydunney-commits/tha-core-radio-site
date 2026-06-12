import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const LONG_SHOW_PROGRAM_DIR = join(DATA_DIR, "ai-host-long-show-programs");
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");
const DIRECT_STATE_FILE = join(DATA_DIR, "direct-ai-broadcast-state.json");

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function showNeedle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function matchesShow(manifest: AnyRecord, show: string) {
  const needle = showNeedle(show || "morning-kickstart");
  const hay = showNeedle(
    [
      manifest.showId,
      manifest.programId,
      manifest.showName,
      manifest.programName,
      manifest.slot,
    ].filter(Boolean).join(" ")
  );

  if (needle === "morning-kickstart" || needle === "morning-talk-show") {
    return hay.includes("morning") || hay.includes("kickstart") || hay.includes("morning-talk-show");
  }

  if (needle === "late-night" || needle === "night-talk-show") {
    return hay.includes("late-night") || hay.includes("night-talk-show") || hay.includes("reasoning");
  }

  if (needle === "evening-music" || needle === "music-link-up") {
    return hay.includes("evening") || hay.includes("music-link-up");
  }

  return hay.includes(needle);
}

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as AnyRecord;
}

async function findLatestLongShowManifest(show: string) {
  await mkdir(LONG_SHOW_PROGRAM_DIR, { recursive: true });

  const files = (await readdir(LONG_SHOW_PROGRAM_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();

  const matches: Array<{ file: string; manifest: AnyRecord }> = [];

  for (const file of files) {
    const filePath = join(LONG_SHOW_PROGRAM_DIR, file);
    try {
      const manifest = await readJson(filePath);
      const parts = Array.isArray(manifest.audioParts) ? manifest.audioParts : [];
      if (parts.length > 0 && matchesShow(manifest, show)) {
        matches.push({ file: filePath, manifest });
      }
    } catch {
      // ignore broken/partial manifests
    }
  }

  return matches[0] || null;
}

function pickPart(manifest: AnyRecord, requestedPartNumber: number) {
  const parts = Array.isArray(manifest.audioParts) ? manifest.audioParts : [];

  const sorted = [...parts].sort((a, b) => Number(a.partNumber || 0) - Number(b.partNumber || 0));

  if (requestedPartNumber > 0) {
    return sorted.find((part) => Number(part.partNumber) === requestedPartNumber) || sorted[0];
  }

  return sorted[0];
}

function pickAudioUrl(part: AnyRecord) {
  return clean(part.storageUrl || part.audioUrl || part.cleanAudioUrl || part.listen_url || part.streamUrl);
}

async function writeCurrentBroadcast(payload: AnyRecord) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CURRENT_BROADCAST_FILE, JSON.stringify(payload, null, 2), "utf8");
  await writeFile(DIRECT_STATE_FILE, JSON.stringify(payload, null, 2), "utf8");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AnyRecord;

    const show = clean(body.show || body.showId || body.program || "morning-kickstart", "morning-kickstart");
    const requestedPartNumber = Number(body.partNumber || 1);

    const match = await findLatestLongShowManifest(show);

    if (!match) {
      return NextResponse.json(
        {
          ok: false,
          status: "NEEDS_AUDIO_FIRST",
          show,
          message:
            "No ready audio package found for this show. Build the voice package first, then press Play Now again.",
          buildOrder: [
            "/api/radio/ai-host-long-show-package-feeder",
            "/api/radio/ai-host-long-show-script-feeder",
            "/api/radio/ai-host-long-show-voice-package",
          ],
          noMusicFallback: true,
          smartZJRequired: false,
        },
        { status: 409 }
      );
    }

    const manifest = match.manifest;
    const parts = Array.isArray(manifest.audioParts) ? manifest.audioParts : [];
    const part = pickPart(manifest, requestedPartNumber);

    if (!part) {
      return NextResponse.json(
        {
          ok: false,
          status: "NO_PLAYABLE_PART",
          show,
          programId: manifest.programId,
          programName: manifest.showName || manifest.programName,
          noMusicFallback: true,
        },
        { status: 409 }
      );
    }

    const audioUrl = pickAudioUrl(part);

    if (!audioUrl) {
      return NextResponse.json(
        {
          ok: false,
          status: "PLAYABLE_PART_HAS_NO_AUDIO_URL",
          show,
          programId: manifest.programId,
          partNumber: part.partNumber,
          noMusicFallback: true,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const programName = clean(manifest.showName || manifest.programName, "Tha Core AI Program");
    const segmentTitle = clean(part.segmentTitle || part.title, "Program Segment");
    const speaker = clean(part.speaker || part.artist, "Tha Core AI Host");

    const currentBroadcast = {
      ok: true,
      status: "AI_HOST_LONG_SHOW_BROADCASTING",
      mode: "CURRENT_BROADCAST",
      safety: "OWNER_PLAY_PROGRAM_NOW_DIRECT_AI",
      source: "AI_HOST_LONG_SHOW",
      type: "AI_HOST_LONG_SHOW",
      programId: clean(manifest.programId),
      programName,
      programSlot: clean(manifest.slot || manifest.programSlot, "on-demand"),
      title: `${programName} - ${segmentTitle}`,
      artist: `${speaker} from Tha Core`,
      audioUrl,
      streamUrl: audioUrl,
      listen_url: audioUrl,
      cleanAudioUrl: audioUrl,
      protectedBroadcast: true,
      smartZJRequired: false,
      smartZJUsed: false,
      rawAzuraBlocked: true,
      noMusicFallback: true,
      startedAt: now,
      updatedAt: now,
      message: `${programName} is playing now through the protected AI program lane. No SmartZJ music fallback.`,
      track: {
        title: `${programName} - ${segmentTitle}`,
        artist: `${speaker} from Tha Core`,
        source: "AI_HOST_LONG_SHOW",
        audioUrl,
        streamUrl: audioUrl,
        listen_url: audioUrl,
        cleanAudioUrl: audioUrl,
        programId: clean(manifest.programId),
        programName,
        segmentTitle,
        partNumber: Number(part.partNumber || 1),
      },
      sequence: {
        mode: "OWNER_PLAY_PROGRAM_NOW",
        programId: clean(manifest.programId),
        programName,
        itemNumber: Number(part.partNumber || 1),
        total: parts.length,
      },
    };

    await writeCurrentBroadcast(currentBroadcast);

    return NextResponse.json({
      ok: true,
      route: "/api/radio/play-program-now",
      action: "PLAY_PROGRAM_NOW",
      show,
      currentBroadcast,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        route: "/api/radio/play-program-now",
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/radio/play-program-now",
    purpose: "Owner/control-panel route for playing any ready AI show/program now without SmartZJ music fallback.",
    examples: [
      { show: "morning-kickstart", partNumber: 1 },
      { show: "late-night", partNumber: 1 },
      { show: "evening-music", partNumber: 1 },
    ],
  });
}
