import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PHASE = "AI_HOST_LONG_SHOW_LIVE_RUNNER_V1_MANUAL";
const DATA_DIR = join(process.cwd(), ".data");
const PROGRAM_DIR = join(DATA_DIR, "ai-host-long-show-programs");
const STATE_FILE = join(DATA_DIR, "ai-host-long-show-live-runner-state.json");
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");

type AnyRecord = Record<string, any>;

type TimelineItem =
  | { type: "voice"; key: string; blockNumber: number; part: AnyRecord }
  | { type: "music"; key: string; blockNumber: number; marker: AnyRecord };

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value: unknown, fallback = "", max = 240) {
  return String(value ?? fallback).replace(/\s+/g, " ").trim().slice(0, max) || fallback;
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

function parseBlockNumber(segmentId: unknown, fallback: number) {
  const match = String(segmentId || "").match(/block-(\d+)/i);
  if (match) return Number(match[1]);
  if (String(segmentId || "").startsWith("smartzj-long-show-fill-")) return 9000 + fallback;
  return fallback;
}

async function latestProgramId() {
  await mkdir(PROGRAM_DIR, { recursive: true });
  const files = (await readdir(PROGRAM_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort();

  const latest = files[files.length - 1];
  return latest ? latest.replace(/\.json$/, "") : "";
}

async function loadManifest(programId?: string) {
  const id = cleanText(programId, "", 220) || (await latestProgramId());
  if (!id) return null;

  const filePath = join(PROGRAM_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;

  return readJson<AnyRecord | null>(filePath, null);
}

function buildTimeline(manifest: AnyRecord): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const part of manifest.audioParts || []) {
    const blockNumber = parseBlockNumber(part.segmentId, Number(part.partNumber || 0));
    items.push({
      type: "voice",
      key: `voice-${String(part.partNumber).padStart(4, "0")}`,
      blockNumber,
      part,
    });
  }

  for (const marker of manifest.musicBreaks || []) {
    const blockNumber = parseBlockNumber(marker.segmentId, 9000 + Number(marker.markerNumber || 0));
    items.push({
      type: "music",
      key: `music-${String(marker.markerNumber).padStart(4, "0")}`,
      blockNumber,
      marker,
    });
  }

  return items.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;

    if (a.type === b.type) {
      const av = a.type === "voice" ? Number(a.part.partNumber || 0) : Number(a.marker.markerNumber || 0);
      const bv = b.type === "voice" ? Number(b.part.partNumber || 0) : Number(b.marker.markerNumber || 0);
      return av - bv;
    }

    return a.type === "voice" ? -1 : 1;
  });
}

async function probeGuard() {
  try {
    const res = await fetch("http://127.0.0.1:3101/api/radio/ai-host-long-show-schedule-guard", {
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, blocked: true, reason: `GUARD_HTTP_${res.status}` };
    }

    const json = (await res.json()) as AnyRecord;
    const decision = json.decision || {};
    const blocked = decision.mustPauseForNia === true || String(decision.reason || "").includes("NIA_PROTECTED");

    return {
      ok: true,
      blocked,
      reason: decision.reason || "NO_GUARD_REASON",
      guard: json,
    };
  } catch (error: any) {
    return {
      ok: false,
      blocked: true,
      reason: error?.message || "GUARD_FAILED",
    };
  }
}

async function triggerSmartZj(reason: string) {
  try {
    const res = await fetch(
      `http://127.0.0.1:3101/api/listener/smartzj-clean-next?ownerMonitorEnded=${encodeURIComponent(
        reason
      )}&allowDuringNiaProgram=false`,
      { method: "POST" }
    );

    const text = await res.text();

    return {
      ok: res.ok,
      status: res.status,
      bodyPreview: text.slice(0, 1200),
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "SMARTZJ_TRIGGER_FAILED",
    };
  }
}

async function writeVoiceBroadcast(manifest: AnyRecord, part: AnyRecord, itemIndex: number, totalItems: number) {
  const startedAt = nowIso();
  const seconds = Math.max(8, Number(part.durationSeconds || part.actualSeconds || part.estimatedSeconds || 60));
  const expectedEndAt = new Date(Date.now() + seconds * 1000).toISOString();
  const audioUrl = cleanText(part.audioUrl || part.track?.audioUrl, "", 500);

  if (!audioUrl.startsWith("/api/listener/ai-host-audio?file=") || !audioUrl.includes(".mp3")) {
    throw new Error("LONG_SHOW_AUDIO_URL_NOT_SAFE");
  }

  const track = {
    ...(part.track || {}),
    audioUrl,
    streamUrl: audioUrl,
    listen_url: audioUrl,
    cleanAudioUrl: audioUrl,
    source: "AI_HOST_LONG_SHOW",
    aiHost: true,
    aiGeneratedVoice: true,
    longShowProgram: true,
    held: false,
    rawAudioBlocked: true,
  };

  const currentBroadcast = {
    ok: true,
    mode: "CURRENT_BROADCAST",
    safety: "CLEAN_OR_BLEEPED_CURRENT_BROADCAST",
    source: "AI_HOST_LONG_SHOW",
    type: "AI_HOST_LONG_SHOW",
    programId: manifest.programId,
    programName: manifest.showName,
    programSlot: manifest.slot,
    title: cleanText(track.title, `${manifest.showName} Part ${part.partNumber}`, 240),
    artist: cleanText(track.artist, `${part.speaker || "AI Host"} from Tha Core`, 160),
    audioUrl,
    streamUrl: audioUrl,
    listen_url: audioUrl,
    cleanAudioUrl: audioUrl,
    durationSeconds: seconds,
    startedAt,
    updatedAt: startedAt,
    expectedEndAt,
    message: `${manifest.showName} long-show voice part ${part.partNumber}. Listener-safe AI host audio. Raw Azura remains blocked.`,
    track,
    rawAudioBlocked: true,
    currentBroadcast: true,
    longShowProgram: true,
    sequence: {
      mode: "AI_HOST_LONG_SHOW_LIVE_RUNNER",
      programId: manifest.programId,
      itemIndex,
      totalItems,
      partNumber: part.partNumber,
      segmentId: part.segmentId,
      segmentTitle: part.segmentTitle,
    },
  };

  await writeJson(CURRENT_BROADCAST_FILE, currentBroadcast);

  return { currentBroadcast, expectedEndAt, seconds };
}

async function loadState() {
  return readJson<AnyRecord>(STATE_FILE, {
    ok: true,
    phase: PHASE,
    active: false,
    status: "IDLE",
    programId: null,
    itemIndex: 0,
    waitingUntil: null,
    lastAction: "INIT",
    updatedAt: nowIso(),
  });
}

async function saveState(state: AnyRecord) {
  const next = {
    ...state,
    phase: PHASE,
    updatedAt: nowIso(),
  };

  await writeJson(STATE_FILE, next);
  return next;
}

function waiting(waitingUntil: unknown) {
  const ms = Date.parse(String(waitingUntil || ""));
  return Number.isFinite(ms) && ms > Date.now();
}

async function runTick(state: AnyRecord, manifest: AnyRecord, timeline: TimelineItem[]) {
  const guard = await probeGuard();

  if (guard.blocked) {
    const paused = await saveState({
      ...state,
      active: true,
      status: "PAUSED_FOR_NIA",
      lastAction: "pause-for-nia",
      lastReason: guard.reason,
    });

    return {
      ok: true,
      phase: PHASE,
      action: "paused-for-nia",
      message: "Nia protected window/state detected. Long show did not touch broadcast.",
      guard,
      state: paused,
      safety: safety(false),
    };
  }

  if (waiting(state.waitingUntil)) {
    return {
      ok: true,
      phase: PHASE,
      action: "waiting-current-item",
      waitingUntil: state.waitingUntil,
      state,
      safety: safety(false),
    };
  }

  const itemIndex = Number(state.itemIndex || 0);

  if (itemIndex >= timeline.length) {
    const smartZj = await triggerSmartZj("longShowComplete");

    const complete = await saveState({
      ...state,
      active: false,
      status: "COMPLETE_RETURNED_TO_SMARTZJ",
      lastAction: "complete-return-to-smartzj",
      completedAt: nowIso(),
      smartZjReturn: smartZj,
    });

    return {
      ok: true,
      phase: PHASE,
      action: "complete-return-to-smartzj",
      smartZjReturn: smartZj,
      state: complete,
      safety: safety(true),
    };
  }

  const item = timeline[itemIndex];

  if (item.type === "music") {
    const minutes = Math.max(1, Number(item.marker.durationMinutes || 5));
    const smartZj = await triggerSmartZj("longShowMusicBreak");
    const waitingUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    const nextState = await saveState({
      ...state,
      active: true,
      status: "RUNNING_MUSIC_BREAK",
      itemIndex: itemIndex + 1,
      waitingUntil,
      currentItem: {
        type: "music",
        segmentId: item.marker.segmentId,
        title: item.marker.segmentTitle,
        durationMinutes: minutes,
      },
      lastAction: "music-break-smartzj",
      smartZjMusicBreak: smartZj,
    });

    return {
      ok: true,
      phase: PHASE,
      action: "music-break-smartzj",
      itemIndex,
      nextItemIndex: itemIndex + 1,
      marker: item.marker,
      smartZj,
      waitingUntil,
      state: nextState,
      safety: safety(false),
    };
  }

  const voice = await writeVoiceBroadcast(manifest, item.part, itemIndex, timeline.length);

  const nextState = await saveState({
    ...state,
    active: true,
    status: "RUNNING_VOICE_PART",
    itemIndex: itemIndex + 1,
    waitingUntil: voice.expectedEndAt,
    currentItem: {
      type: "voice",
      partNumber: item.part.partNumber,
      segmentId: item.part.segmentId,
      title: item.part.segmentTitle,
      durationSeconds: voice.seconds,
    },
    lastAction: "broadcast-voice-part",
  });

  return {
    ok: true,
    phase: PHASE,
    action: "broadcast-voice-part",
    itemIndex,
    nextItemIndex: itemIndex + 1,
    partNumber: item.part.partNumber,
    title: item.part.segmentTitle,
    audioUrl: item.part.audioUrl,
    expectedEndAt: voice.expectedEndAt,
    currentBroadcast: voice.currentBroadcast,
    state: nextState,
    safety: safety(true),
  };
}

function safety(touchesCurrentBroadcast: boolean) {
  return {
    liveRunner: true,
    voiceStarted: touchesCurrentBroadcast,
    broadcastStarted: touchesCurrentBroadcast,
    doesNotTouchNiaNews: true,
    doesNotTouchSmartZJ: false,
    touchesCurrentBroadcast,
    rawAzuraBlocked: true,
    niaPriorityGuardEnabled: true,
  };
}

export async function GET() {
  const state = await loadState();

  return NextResponse.json({
    ok: true,
    phase: PHASE,
    route: "/api/radio/ai-host-long-show-live-runner",
    purpose: "Manual live runner for 210-minute long-show packages.",
    state,
    usage: {
      start: {
        method: "POST",
        body: {
          action: "start",
          programId: "long-show-night-talk-show-20260608093955-38a38285",
          confirm: "START_LONG_SHOW_NOW",
          manualOverride: true,
        },
      },
      tick: {
        method: "POST",
        body: { action: "tick" },
      },
      stop: {
        method: "POST",
        body: { action: "stop" },
      },
    },
    safety: {
      startRequiresExactConfirm: "START_LONG_SHOW_NOW",
      niaPriorityGuardEnabled: true,
      rawAzuraBlocked: true,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const action = cleanText(body.action, "status", 80);
    const state = await loadState();

    if (action === "status") {
      return NextResponse.json({ ok: true, phase: PHASE, action, state });
    }

    if (action === "stop") {
      const smartZj = await triggerSmartZj("longShowManualStop");
      const stopped = await saveState({
        ...state,
        active: false,
        status: "STOPPED_RETURNED_TO_SMARTZJ",
        lastAction: "manual-stop-return-to-smartzj",
        stoppedAt: nowIso(),
        smartZjReturn: smartZj,
      });

      return NextResponse.json({
        ok: true,
        phase: PHASE,
        action: "stop-return-to-smartzj",
        smartZjReturn: smartZj,
        state: stopped,
      });
    }

    if (action === "start") {
      if (body.confirm !== "START_LONG_SHOW_NOW") {
        return NextResponse.json(
          {
            ok: false,
            phase: PHASE,
            error: "CONFIRMATION_REQUIRED",
            requiredConfirm: "START_LONG_SHOW_NOW",
          },
          { status: 423 }
        );
      }

      const manifest = await loadManifest(cleanText(body.programId, "", 220));

      if (!manifest) {
        return NextResponse.json(
          { ok: false, phase: PHASE, error: "LONG_SHOW_MANIFEST_NOT_FOUND" },
          { status: 404 }
        );
      }

      if (manifest.buildComplete !== true) {
        return NextResponse.json(
          { ok: false, phase: PHASE, error: "LONG_SHOW_PACKAGE_NOT_COMPLETE" },
          { status: 423 }
        );
      }

      const guard = await probeGuard();

      if (guard.blocked) {
        return NextResponse.json(
          {
            ok: false,
            phase: PHASE,
            error: "NIA_PROTECTED_NOW_START_BLOCKED",
            guard,
          },
          { status: 423 }
        );
      }

      const timeline = buildTimeline(manifest);

      const started = await saveState({
        ok: true,
        phase: PHASE,
        active: true,
        status: "STARTED_MANUAL_LONG_SHOW",
        programId: manifest.programId,
        programName: manifest.showName,
        itemIndex: 0,
        totalItems: timeline.length,
        waitingUntil: null,
        manualOverride: body.manualOverride === true,
        startedAt: nowIso(),
        lastAction: "manual-start",
      });

      return NextResponse.json(await runTick(started, manifest, timeline));
    }

    if (action === "tick" || action === "next" || action === "resume") {
      if (!state.active || !state.programId) {
        return NextResponse.json({
          ok: true,
          phase: PHASE,
          action,
          message: "NO_ACTIVE_LONG_SHOW",
          state,
        });
      }

      const manifest = await loadManifest(state.programId);

      if (!manifest) {
        return NextResponse.json(
          { ok: false, phase: PHASE, error: "ACTIVE_MANIFEST_NOT_FOUND", state },
          { status: 404 }
        );
      }

      return NextResponse.json(await runTick(state, manifest, buildTimeline(manifest)));
    }

    return NextResponse.json(
      {
        ok: false,
        phase: PHASE,
        error: "UNKNOWN_ACTION",
        allowedActions: ["status", "start", "tick", "next", "resume", "stop"],
      },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        phase: PHASE,
        error: "LONG_SHOW_LIVE_RUNNER_ERROR",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
