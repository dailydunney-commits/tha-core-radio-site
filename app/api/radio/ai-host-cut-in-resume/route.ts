import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");
const CUT_IN_STATE_FILE = join(DATA_DIR, "ai-host-cut-in-resume-state.json");

// NIA_CUT_IN_RESUME_CONTRACT_V1
// AI hosts can cut in, then return to the saved SmartZJ broadcast instead of random next.
// Phase 1 default policy is replay same saved song. True time-position resume needs player support later.

function internalBaseUrl() {
  return String(process.env.SMARTZJ_INTERNAL_BASE_URL || "http://127.0.0.1:3101").replace(/\/+$/, "");
}

function cleanText(value: unknown, fallback = "") {
  return String(value ?? fallback).replace(/\s+/g, " ").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function addSeconds(seconds: number) {
  return new Date(Date.now() + Math.max(1, seconds) * 1000).toISOString();
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: unknown) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function pickAudioUrl(value: AnyRecord) {
  const track = value?.track && typeof value.track === "object" ? value.track : {};
  return cleanText(
    value?.audioUrl ||
      value?.cleanAudioUrl ||
      value?.streamUrl ||
      value?.listen_url ||
      track?.audioUrl ||
      track?.cleanAudioUrl ||
      track?.streamUrl ||
      track?.listen_url ||
      ""
  );
}

function isSafeBroadcastAudioUrl(url: string) {
  if (!url) return false;
  if (url.includes("azuracast")) return false;
  return (
    url.startsWith("/audio/smartdj/clean/") ||
    url.startsWith("/api/listener/ai-host-audio?file=")
  );
}

function isAiHostAudioUrl(url: string) {
  return url.startsWith("/api/listener/ai-host-audio?file=");
}

function normalizeResumePolicy(value: unknown) {
  const raw = cleanText(value || "replay").toLowerCase();
  if (raw === "next") return "next";
  if (raw === "resume") return "resume";
  return "replay";
}

function cloneForReplay(preNia: AnyRecord, cutInId: string, requestedPolicy: string) {
  const restored = preNia && typeof preNia === "object" ? { ...preNia } : {};
  const track = restored.track && typeof restored.track === "object" ? { ...restored.track } : {};

  const audioUrl = pickAudioUrl(restored);
  const stamp = nowIso();

  return {
    ...restored,
    ok: true,
    status: "SMARTDJ_BROADCASTING",
    mode: "CURRENT_BROADCAST",
    safety: "CLEAN_OR_BLEEPED_CURRENT_BROADCAST",
    source: restored.source || track.source || "SMARTDJ",
    type: restored.type || track.type || "SMARTZJ_REPLAY_AFTER_AI_HOST",
    audioUrl,
    cleanAudioUrl: audioUrl,
    streamUrl: audioUrl,
    listen_url: audioUrl,
    startedAt: stamp,
    updatedAt: stamp,
    aiHostCutInReturned: true,
    aiHostCutInId: cutInId,
    requestedResumePolicy: requestedPolicy,
    appliedResumePolicy: requestedPolicy === "resume" ? "replay-until-player-position-resume-v2" : "replay",
    message:
      requestedPolicy === "resume"
        ? "AI host finished. Same saved song restored; exact time-position resume needs listener player support."
        : "AI host finished. Same saved song replayed safely.",
    track: {
      ...track,
      audioUrl,
      cleanAudioUrl: audioUrl,
      streamUrl: audioUrl,
      listen_url: audioUrl,
      rawAudioBlocked: true,
    },
  };
}

export async function GET() {
  const state = await readJson<AnyRecord>(CUT_IN_STATE_FILE, {
    ok: true,
    phase: "AI_HOST_CUT_IN_RESUME_CONTRACT_V1",
    active: false,
    status: "IDLE",
  });

  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-cut-in-resume",
    phase: "AI_HOST_CUT_IN_RESUME_CONTRACT_V1",
    state,
    usage: {
      start: {
        method: "POST",
        body: {
          action: "start",
          hostId: "nia",
          resumePolicy: "replay",
          dropBody: {},
        },
      },
      return: {
        method: "POST",
        body: {
          action: "return",
        },
      },
      tick: {
        method: "POST",
        body: {
          action: "tick",
        },
      },
    },
    safety: {
      rawAzuraBlocked: true,
      defaultResumePolicy: "replay same saved song",
      exactUpcomingTrackNamesRequireLock: true,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const action = cleanText(body.action || "status").toLowerCase();

    if (action === "status") {
      return GET();
    }

    if (action === "start") {
      const current = await readJson<AnyRecord>(CURRENT_BROADCAST_FILE, {});
      const currentAudioUrl = pickAudioUrl(current);

      if (!isSafeBroadcastAudioUrl(currentAudioUrl) || isAiHostAudioUrl(currentAudioUrl)) {
        return NextResponse.json(
          {
            ok: false,
            error: "NO_SAFE_SMARTZJ_SONG_TO_SAVE_BEFORE_AI_HOST",
            currentAudioUrl,
            message: "AI host cut-in requires a current saved SmartZJ clean song first.",
          },
          { status: 409 }
        );
      }

      const requestedPolicy = normalizeResumePolicy(body.resumePolicy || body.policy);
      const hostId = cleanText(body.hostId || body.host || "nia", "nia");
      const cutInId = `ai-host-cut-in-${Date.now()}`;

      const dropBody = {
        ...(body.dropBody && typeof body.dropBody === "object" ? body.dropBody : body),
        hostId,
        testOnly: true,
      };

      delete (dropBody as AnyRecord).action;
      delete (dropBody as AnyRecord).resumePolicy;
      delete (dropBody as AnyRecord).policy;

      const dropRes = await fetch(`${internalBaseUrl()}/api/radio/ai-host-next-drop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dropBody),
      });

      const dropData = (await dropRes.json().catch(() => null)) as AnyRecord | null;

      if (!dropRes.ok || !dropData?.ok || !dropData?.audioUrl) {
        return NextResponse.json(
          {
            ok: false,
            error: "AI_HOST_DROP_GENERATION_FAILED",
            status: dropRes.status,
            detail: dropData,
          },
          { status: 502 }
        );
      }

      const aiAudioUrl = cleanText(dropData.audioUrl);
      if (!isAiHostAudioUrl(aiAudioUrl)) {
        return NextResponse.json(
          {
            ok: false,
            error: "UNSAFE_AI_HOST_AUDIO_URL",
            aiAudioUrl,
          },
          { status: 409 }
        );
      }

      const durationSeconds = Math.max(
        5,
        Math.min(120, Number(dropData?.track?.durationSeconds || dropData?.track?.estimatedSeconds || 18))
      );

      const startedAt = nowIso();
      const expectedEndAt = addSeconds(durationSeconds);

      const state = {
        ok: true,
        phase: "AI_HOST_CUT_IN_RESUME_CONTRACT_V1",
        active: true,
        status: "AI_HOST_ON_AIR",
        cutInId,
        hostId,
        resumePolicy: requestedPolicy,
        preNiaCapturedAt: startedAt,
        expectedEndAt,
        preNiaBroadcast: current,
        preNiaAudioUrl: currentAudioUrl,
        aiHostDrop: {
          hostName: dropData.hostName || "Nia from Tha Core",
          talkType: dropData.talkType,
          script: dropData.script,
          audioUrl: aiAudioUrl,
          durationSeconds,
        },
        updatedAt: startedAt,
      };

      await writeJson(CUT_IN_STATE_FILE, state);

      const currentAiBroadcast = {
        ok: true,
        status: "SMARTDJ_BROADCASTING",
        mode: "CURRENT_BROADCAST",
        safety: "CLEAN_OR_BLEEPED_CURRENT_BROADCAST",
        source: "AI_HOST",
        type: "AI_HOST_CUT_IN_DROP",
        title: dropData.hostName || "Nia from Tha Core",
        artist: dropData.hostName || "Nia from Tha Core",
        audioUrl: aiAudioUrl,
        cleanAudioUrl: aiAudioUrl,
        streamUrl: aiAudioUrl,
        listen_url: aiAudioUrl,
        startedAt,
        expectedEndAt,
        updatedAt: startedAt,
        aiHostCutIn: true,
        aiHostCutInId: cutInId,
        resumePolicy: requestedPolicy,
        preNiaAudioUrl: currentAudioUrl,
        message: "AI host cut-in is live. Saved SmartZJ song will be restored by return/tick.",
        track: {
          ...(dropData.track || {}),
          title: dropData.hostName || "Nia from Tha Core",
          artist: dropData.hostName || "Nia from Tha Core",
          source: "AI_HOST",
          type: "AI_HOST_CUT_IN_DROP",
          audioUrl: aiAudioUrl,
          cleanAudioUrl: aiAudioUrl,
          streamUrl: aiAudioUrl,
          listen_url: aiAudioUrl,
          aiHost: true,
          aiHostCutIn: true,
          rawAudioBlocked: true,
          durationSeconds,
          script: dropData.script,
        },
      };

      await writeJson(CURRENT_BROADCAST_FILE, currentAiBroadcast);

      return NextResponse.json({
        ok: true,
        phase: "AI_HOST_CUT_IN_RESUME_CONTRACT_V1",
        action: "start-ai-host-cut-in",
        active: true,
        cutInId,
        resumePolicy: requestedPolicy,
        savedAudioUrl: currentAudioUrl,
        aiHostAudioUrl: aiAudioUrl,
        durationSeconds,
        expectedEndAt,
        script: dropData.script,
        state,
      });
    }

    if (action === "return" || action === "tick") {
      const state = await readJson<AnyRecord>(CUT_IN_STATE_FILE, {});
      const active = Boolean(state?.active);
      const expectedEndAt = Date.parse(cleanText(state?.expectedEndAt || ""));
      const shouldReturn =
        action === "return" ||
        (active && Number.isFinite(expectedEndAt) && Date.now() >= expectedEndAt);

      if (!active) {
        return NextResponse.json({
          ok: true,
          phase: "AI_HOST_CUT_IN_RESUME_CONTRACT_V1",
          action,
          active: false,
          status: "IDLE_NO_ACTIVE_CUT_IN",
        });
      }

      if (!shouldReturn) {
        return NextResponse.json({
          ok: true,
          phase: "AI_HOST_CUT_IN_RESUME_CONTRACT_V1",
          action,
          active: true,
          status: "WAITING_FOR_AI_HOST_TO_FINISH",
          expectedEndAt: state.expectedEndAt,
        });
      }

      const resumePolicy = normalizeResumePolicy(state.resumePolicy);
      let returnResult: AnyRecord = {};

      if (resumePolicy === "next") {
        const res = await fetch(`${internalBaseUrl()}/api/listener/smartzj-clean-next`, {
          method: "POST",
        });
        returnResult = await res.json().catch(() => ({}));
      } else {
        const restored = cloneForReplay(
          state.preNiaBroadcast || {},
          cleanText(state.cutInId || ""),
          resumePolicy
        );

        const restoredAudioUrl = pickAudioUrl(restored);
        if (!isSafeBroadcastAudioUrl(restoredAudioUrl) || isAiHostAudioUrl(restoredAudioUrl)) {
          return NextResponse.json(
            {
              ok: false,
              error: "RESTORE_AUDIO_NOT_SAFE",
              restoredAudioUrl,
            },
            { status: 409 }
          );
        }

        await writeJson(CURRENT_BROADCAST_FILE, restored);
        returnResult = {
          ok: true,
          action: "restore-saved-smartzj-song",
          restoredAudioUrl,
          appliedResumePolicy: restored.appliedResumePolicy,
        };
      }

      const nextState = {
        ...state,
        active: false,
        status: "RETURNED_TO_SMARTZJ",
        returnedAt: nowIso(),
        returnAction: returnResult.action || "return",
        returnResult,
        updatedAt: nowIso(),
      };

      await writeJson(CUT_IN_STATE_FILE, nextState);

      return NextResponse.json({
        ok: true,
        phase: "AI_HOST_CUT_IN_RESUME_CONTRACT_V1",
        action: "return-from-ai-host-cut-in",
        active: false,
        resumePolicy,
        returnResult,
        state: nextState,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "UNKNOWN_ACTION",
        action,
      },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI_HOST_CUT_IN_RESUME_ROUTE_ERROR",
        message: error?.message || "Unknown error.",
      },
      { status: 500 }
    );
  }
}
