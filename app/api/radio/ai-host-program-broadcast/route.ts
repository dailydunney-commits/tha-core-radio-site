import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const PROGRAM_DIR = join(DATA_DIR, "ai-host-programs");
const STATE_FILE = join(DATA_DIR, "ai-host-program-broadcast-state.json");
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");

function nowIso() {
  return new Date().toISOString();
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function cleanText(value: unknown, fallback = "", max = 500) {
  if (typeof value !== "string") return fallback;
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function isSafeAiHostAudioUrl(url: string) {
  const cleanUrl = String(url || "").trim();
  return (
    cleanUrl.startsWith("/api/listener/ai-host-audio?file=") &&
    cleanUrl.includes(".mp3") &&
    !cleanUrl.includes("..") &&
    !cleanUrl.includes("\\")
  );
}

async function listProgramManifests() {
  try {
    const files = await readdir(PROGRAM_DIR);
    const manifests = [];

    for (const file of files.filter((name) => name.endsWith(".json"))) {
      const fullPath = join(PROGRAM_DIR, file);
      const manifest = await readJson<AnyRecord | null>(fullPath, null);
      if (!manifest?.programId || !Array.isArray(manifest.audioParts)) continue;

      manifests.push({
        programId: manifest.programId,
        programName: manifest.programName,
        programSlot: manifest.programSlot,
        blockType: manifest.blockType,
        partCount: manifest.audioParts.length,
        totalEstimatedSeconds: manifest.totalEstimatedSeconds,
        createdAt: manifest.createdAt,
        fileName: file,
      });
    }

    return manifests.sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );
  } catch {
    return [];
  }
}

async function loadProgram(programId?: string) {
  await mkdir(PROGRAM_DIR, { recursive: true });

  if (programId) {
    const manifestPath = join(PROGRAM_DIR, `${programId}.json`);
    if (!existsSync(manifestPath)) return null;
    return readJson<AnyRecord | null>(manifestPath, null);
  }

  const manifests = await listProgramManifests();
  if (!manifests.length) return null;

  const latest = manifests[0];
  return readJson<AnyRecord | null>(join(PROGRAM_DIR, latest.fileName), null);
}

function getPart(manifest: AnyRecord, partIndex: number) {
  const parts = Array.isArray(manifest.audioParts) ? manifest.audioParts : [];
  if (partIndex < 0 || partIndex >= parts.length) return null;
  return parts[partIndex];
}

async function triggerSmartZjReturn(reason: string) {
  try {
    const res = await fetch(
      `http://127.0.0.1:${process.env.PORT || "3101"}/api/listener/smartzj-clean-next?ownerMonitorEnded=${encodeURIComponent(
        reason
      )}&allowDuringNiaProgram=true`,
      { method: "POST" }
    );

    const data = await res.json().catch(() => null);
    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "SMARTZJ_RETURN_FAILED",
    };
  }
}


// NIA_PROGRAM_SEQUENCE_GUARD_V1
function msUntilIso(value: unknown) {
  const ms = Date.parse(String(value || ""));
  if (!Number.isFinite(ms)) return 0;
  return ms - Date.now();
}

function secondsUntilIso(value: unknown) {
  return Math.max(0, Math.ceil(msUntilIso(value) / 1000));
}

function sameProgramId(a: unknown, b: unknown) {
  return cleanText(a || "", "", 220) === cleanText(b || "", "", 220);
}

function recentAdvanceBlocked(state: AnyRecord, cooldownSeconds = 12) {
  const lastMs = Date.parse(String(state.lastAdvanceAt || state.updatedAt || ""));
  if (!Number.isFinite(lastMs)) return false;
  return Date.now() - lastMs < cooldownSeconds * 1000;
}
async function broadcastPart(input: {
  manifest: AnyRecord;
  partIndex: number;
  reason: string;
}) {
  const part = getPart(input.manifest, input.partIndex);

  if (!part) {
    return {
      ok: false,
      error: "PROGRAM_PART_NOT_FOUND",
    };
  }

  const audioUrl = String(part.audioUrl || part.track?.audioUrl || "").trim();

  if (!isSafeAiHostAudioUrl(audioUrl)) {
    return {
      ok: false,
      error: "PROGRAM_PART_AUDIO_NOT_SAFE",
      audioUrl,
    };
  }

  const startedAt = nowIso();
  const estimatedSeconds = Math.max(
    8,
    Number(part.durationSeconds || part.actualSeconds || part.estimatedSeconds || 60)
  );
    // COHOST_FAST_HANDOFF_V1
  // Nia/news chunks need a longer safety pad, but Prodigy & Diamond co-host turns
  // must feel like real conversation with tighter back-and-forth timing.
  const cohostBlockType = cleanText(part?.track?.blockType || input.manifest.blockType, "", 120);
  const isCohostProgram =
    cohostBlockType === "cohost-show" ||
    part?.track?.source === "AI_HOST_COHOST_PROGRAM" ||
    part?.track?.cohostProgramBlock === true;

  const returnAfterSeconds = isCohostProgram
    ? Math.max(estimatedSeconds + 1, 4)
    : Math.max(estimatedSeconds + 7, 12);
  const expectedEndAt = new Date(
    Date.now() + returnAfterSeconds * 1000
  ).toISOString();

  const programId = cleanText(input.manifest.programId, "unknown-program", 200);
  const programName = cleanText(input.manifest.programName, "Nia News Program", 200);
  const programSlot = cleanText(input.manifest.programSlot, "unscheduled", 100);
  const blockType = cleanText(input.manifest.blockType, "news-program", 100);
  const hostName = cleanText(input.manifest.hostName, "Nia from Tha Core", 120);

  const track = {
    ...(part.track || {}),
    id: part.track?.id || `AI-Host-Program/${programId}/part-${input.partIndex + 1}`,
    trackId:
      part.track?.trackId || `AI-Host-Program/${programId}/part-${input.partIndex + 1}`,
    title: part.track?.title || `${programName} Part ${input.partIndex + 1}`,
    artist: hostName,
    source: "AI_HOST_PROGRAM",
    genreLane: "News",
    lane: "News",
    folder: "AI-Host-News",
    audioUrl,
    streamUrl: audioUrl,
    listen_url: audioUrl,
    cleanAudioUrl: audioUrl,
    returnedToSmartDj: true,
    held: false,
    cleanStatus: "PROCESSED_AUDIO_READY",
    bleepJobStatus: "PROCESSED_AUDIO_READY",
    aiHost: true,
    aiGeneratedVoice: true,
    fullProgramBlock: true,
    programId,
    programName,
    programSlot,
    blockType,
    partNumber: input.partIndex + 1,
    totalParts: input.manifest.audioParts.length,
    estimatedSeconds,
    returnAfterSeconds,
  };

  const currentBroadcast = {
    ok: true,
    status: "SMARTDJ_BROADCASTING",
    source: "SMARTDJ",
    title: track.title,
    artist: track.artist,
    genreLane: "News",
    audioUrl,
    streamUrl: audioUrl,
    listen_url: audioUrl,
    startedAt,
    updatedAt: startedAt,
    reason: input.reason,
    selectionReason: input.reason,
    scheduleJingleInsert: false,
    aiHostProgramBlock: true,
    message: `${programName} ${programSlot} part ${input.partIndex + 1} of ${
      input.manifest.audioParts.length
    }. Listener-safe Nia program audio. Raw Azura remains blocked.`,
    track,
    sequence: {
      mode: "NIA_PROGRAM_BROADCAST_QUEUE",
      programId,
      programName,
      programSlot,
      blockType,
      index: input.partIndex,
      itemNumber: input.partIndex + 1,
      total: input.manifest.audioParts.length,
      isLast: input.partIndex + 1 >= input.manifest.audioParts.length,
      estimatedSeconds,
      returnAfterSeconds,
      expectedEndAt,
    },
  };

  const state = {
    ok: true,
    phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
    active: true,
    programId,
    programName,
    programSlot,
    blockType,
    currentPartIndex: input.partIndex,
    currentPartNumber: input.partIndex + 1,
    totalParts: input.manifest.audioParts.length,
    audioUrl,
    startedAt,
    expectedEndAt,
    estimatedSeconds,
    returnAfterSeconds,
    lastAction: input.reason,
    lastAdvanceAt: startedAt,
    updatedAt: startedAt,
  };

  await writeJson(CURRENT_BROADCAST_FILE, currentBroadcast);
  await writeJson(STATE_FILE, state);

  return {
    ok: true,
    phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
    action: "broadcast-part",
    currentBroadcast,
    state,
  };
}

export async function GET() {
  const state = await readJson<AnyRecord>(STATE_FILE, {});
  const programs = await listProgramManifests();

  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-program-broadcast",
    phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
    purpose:
      "Broadcasts saved Nia program voice chunks in order. Use POST start/next/return-to-music.",
    state,
    availablePrograms: programs.slice(0, 10),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const action = cleanText(body.action, "start", 80);
    const programId = cleanText(body.programId, "", 220);
    const reason = cleanText(
      body.reason,
      `NIA_PROGRAM_${action.toUpperCase()}`,
      160
    );

    if (action === "return-to-music" || action === "stop") {
      const state = await readJson<AnyRecord>(STATE_FILE, {});

      if (!state?.active && state?.lastAction === "complete-return-to-music") {
        return NextResponse.json({
          ok: true,
          phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
          action: "already-returned-to-music",
          message: "Nia program already completed and returned to SmartZJ. Duplicate return ignored.",
          state,
        });
      }

      const smartZj = await triggerSmartZjReturn("niaProgramReturnToMusic");

      await writeJson(STATE_FILE, {
        ...state,
        active: false,
        completedAt: nowIso(),
        lastAction: action,
        smartZjReturn: smartZj,
      });

      return NextResponse.json({
        ok: true,
        phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
        action,
        smartZjReturn: smartZj,
      });
    }

    const manifest = await loadProgram(programId || undefined);

    if (!manifest) {
      return NextResponse.json(
        {
          ok: false,
          error: "PROGRAM_MANIFEST_NOT_FOUND",
          message:
            "No saved Nia program manifest found. Generate voice chunks first.",
        },
        { status: 404 }
      );
    }

    const totalParts = Array.isArray(manifest.audioParts)
      ? manifest.audioParts.length
      : 0;

    if (!totalParts) {
      return NextResponse.json(
        { ok: false, error: "PROGRAM_HAS_NO_AUDIO_PARTS" },
        { status: 422 }
      );
    }
    const state = await readJson<AnyRecord>(STATE_FILE, {});
    let partIndex = 0;

    if (action === "next") {
      const expectedCurrentPartIndex =
        body.expectedCurrentPartIndex ?? body.expectedPartIndex;
      const expectedCurrentPartNumber =
        body.expectedCurrentPartNumber ?? body.expectedPartNumber;

      const hasExpectedIndex =
        expectedCurrentPartIndex !== undefined &&
        expectedCurrentPartIndex !== null &&
        expectedCurrentPartIndex !== "";

      const hasExpectedNumber =
        expectedCurrentPartNumber !== undefined &&
        expectedCurrentPartNumber !== null &&
        expectedCurrentPartNumber !== "";

      const forceNext = body.force === true || body.forceNext === true;

      if (state.active === false) {
        return NextResponse.json({
          ok: true,
          phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
          action: "next-ignored-program-complete",
          currentPartIndex: state.currentPartIndex,
          currentPartNumber: state.currentPartNumber,
          totalParts: state.totalParts || totalParts,
          smartZjReturn: state.smartZjReturn || null,
        });
      }

      if (!forceNext && !hasExpectedIndex && !hasExpectedNumber) {
        return NextResponse.json(
          {
            ok: false,
            phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
            error: "NIA_PROGRAM_NEXT_REQUIRES_EXPECTED_PART",
            currentPartIndex: state.currentPartIndex,
            currentPartNumber: state.currentPartNumber,
            totalParts,
          },
          { status: 409 }
        );
      }

      if (
        hasExpectedIndex &&
        Number(expectedCurrentPartIndex) !== Number(state.currentPartIndex || 0)
      ) {
        return NextResponse.json({
          ok: true,
          phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
          action: "stale-next-ignored",
          expectedCurrentPartIndex: Number(expectedCurrentPartIndex),
          actualCurrentPartIndex: Number(state.currentPartIndex || 0),
          currentPartNumber: state.currentPartNumber,
          totalParts,
        });
      }

      if (
        hasExpectedNumber &&
        Number(expectedCurrentPartNumber) !== Number(state.currentPartNumber || 1)
      ) {
        return NextResponse.json({
          ok: true,
          phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
          action: "stale-next-ignored",
          expectedCurrentPartNumber: Number(expectedCurrentPartNumber),
          actualCurrentPartNumber: Number(state.currentPartNumber || 1),
          currentPartIndex: state.currentPartIndex,
          totalParts,
        });
      }

      const expectedEndMs = Date.parse(String(state.expectedEndAt || ""));
      if (!forceNext && Number.isFinite(expectedEndMs) && Date.now() < expectedEndMs) {
        return NextResponse.json({
          ok: true,
          phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
          action: "early-next-ignored",
          currentPartIndex: state.currentPartIndex,
          currentPartNumber: state.currentPartNumber,
          totalParts,
          expectedEndAt: state.expectedEndAt,
          waitMs: Math.max(0, expectedEndMs - Date.now()),
        });
      }

      partIndex = Number(state.currentPartIndex || 0) + 1;
    } else if (action === "part") {
      partIndex = Math.max(0, Number(body.partIndex || 0));
    } else {
      partIndex = 0;
    }
    if (partIndex >= totalParts && state.active === false && state.lastAction === "complete-return-to-music") {
      return NextResponse.json({
        ok: true,
        phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
        action: "complete-return-already-done",
        programId: manifest.programId,
        totalParts,
        smartZjReturn: state.smartZjReturn || null,
      });
    }

    if (partIndex >= totalParts) {
      const state = await readJson<AnyRecord>(STATE_FILE, {});

      if (!state?.active && state?.lastAction === "complete-return-to-music") {
        return NextResponse.json({
          ok: true,
          phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
          action: "already-complete-return-to-music",
          message: "Nia program already completed. Duplicate complete ignored.",
          programId: manifest.programId,
          totalParts,
          state,
        });
      }

      const smartZj = await triggerSmartZjReturn("niaProgramComplete");

      await writeJson(STATE_FILE, {
        ...state,
        active: false,
        completedAt: nowIso(),
        lastAction: "complete-return-to-music",
        sequenceGuard: "NIA_PROGRAM_SEQUENCE_GUARD_V1",
        smartZjReturn: smartZj,
      });

      return NextResponse.json({
        ok: true,
        phase: "NIA_PROGRAM_BROADCAST_QUEUE_V1",
        action: "complete-return-to-music",
        programId: manifest.programId,
        totalParts,
        smartZjReturn: smartZj,
      });
    }

    const result = await broadcastPart({
      manifest,
      partIndex,
      reason,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI_HOST_PROGRAM_BROADCAST_ROUTE_ERROR",
        message: error?.message || "Unknown error.",
      },
      { status: 500 }
    );
  }
}

