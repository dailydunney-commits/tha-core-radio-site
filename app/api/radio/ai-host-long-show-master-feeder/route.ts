import { NextResponse } from "next/server";
import path from "path";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PHASE = "AI_HOST_LONG_SHOW_MASTER_FEEDER_V1_DRY_RUN";
const DAY_MINUTES = 24 * 60;

type GuardDecision = {
  safeToStartLongShow?: boolean;
  safeToContinueLongShow?: boolean;
  mustPauseForNia?: boolean;
  shouldResumeAfterNia?: boolean;
  reason?: string;
};

type GuardSlot = {
  id?: string;
  label?: string;
  start?: string;
  end?: string;
  notes?: string;
};

type GuardResponse = {
  ok?: boolean;
  phase?: string;
  probeMode?: string;
  currentLongShowSlot?: GuardSlot | null;
  decision?: GuardDecision;
  jamaicaNow?: {
    minuteOfDay?: number;
    display?: string;
  };
};

type ScriptSegment = {
  segmentId: string;
  blockNumber: number;
  startMinute: number;
  durationMinutes: number;
  segmentType: string;
  title: string;
  purpose: string;
  estimatedVoiceMinutes: number;
  estimatedMusicMinutes: number;
  hosts: string[];
  hostTurns?: Array<{
    turnNumber: number;
    host: string;
    script: string;
    delivery: string;
    estimatedSeconds: number;
  }>;
};

type ScriptShow = {
  showId: string;
  showName: string;
  slot: string;
  targetMinutes: number;
  plannedMinutes: number;
  segmentCount: number;
  segments: ScriptSegment[];
};

type ScriptPackage = {
  ok?: boolean;
  phase?: string;
  scriptPackageId?: string;
  sourcePackageId?: string;
  createdAt?: string;
  shows?: ScriptShow[];
};

type MasterState = {
  updatedAt: string;
  phase: string;
  dryRunOnly: true;
  activeShowId: string | null;
  activeShowName: string | null;
  activeSlotId: string | null;
  lastWouldAction: string;
  lastReason: string;
  lastAtParam: string | null;
  lastSelectedSegmentId: string | null;
  history: Array<{
    at: string;
    atParam: string | null;
    wouldAction: string;
    showId: string | null;
    segmentId: string | null;
    reason: string;
  }>;
};

function safety() {
  return {
    dryRunOnly: true as const,
    draftOnly: true as const,
    voiceStarted: false as const,
    broadcastStarted: false as const,
    doesNotTouchNiaNews: true as const,
    doesNotTouchCurrentBroadcast: true as const,
    doesNotTouchSmartZJ: true as const,
    routeDoesNotStartStopPauseResumeAudio: true as const,
    routeDoesNotWriteCurrentBroadcast: true as const,
  };
}

function normalizeMinute(minute: number): number {
  return ((minute % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

function showIdFromSlot(slotId: string | undefined | null): string | null {
  if (!slotId) return null;

  if (slotId === "morning-show") return "morning-talk-show";

  if (slotId === "evening-show-before-nia" || slotId === "evening-show-after-nia") {
    return "evening-music-show";
  }

  if (slotId === "night-show") return "night-talk-show";

  return null;
}

function minuteFromShowStart(slotId: string | undefined | null, minuteOfDay: number): number {
  const now = normalizeMinute(minuteOfDay);

  if (slotId === "morning-show") {
    return Math.max(0, now - (6 * 60 + 30));
  }

  if (slotId === "evening-show-before-nia") {
    return Math.max(0, now - 16 * 60);
  }

  if (slotId === "evening-show-after-nia") {
    // Evening show runs 4:00-5:25 first, then resumes 6:05-7:30.
    // The first part is 85 minutes long.
    return Math.max(85, 85 + now - (18 * 60 + 5));
  }

  if (slotId === "night-show") {
    return Math.max(0, now - (20 * 60 + 30));
  }

  return 0;
}

function selectSegment(show: ScriptShow | null, showMinute: number): ScriptSegment | null {
  if (!show || !Array.isArray(show.segments)) return null;

  return (
    show.segments.find((segment) => {
      const start = Number(segment.startMinute || 0);
      const end = start + Number(segment.durationMinutes || 0);
      return showMinute >= start && showMinute < end;
    }) ||
    show.segments[show.segments.length - 1] ||
    null
  );
}

async function loadLatestJson<T>(dirName: string): Promise<{ fileName: string; data: T } | null> {
  const dir = path.join(process.cwd(), ".data", dirName);

  try {
    const files = (await readdir(dir))
      .filter((file) => file.endsWith(".json"))
      .sort();

    const latest = files[files.length - 1];
    if (!latest) return null;

    const raw = await readFile(path.join(dir, latest), "utf8");
    return {
      fileName: latest,
      data: JSON.parse(raw) as T,
    };
  } catch {
    return null;
  }
}

async function loadMasterState(): Promise<MasterState> {
  const filePath = path.join(process.cwd(), ".data", "ai-host-long-show-master-feeder-state.json");

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as MasterState;
    return {
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history.slice(-25) : [],
    };
  } catch {
    return {
      updatedAt: new Date().toISOString(),
      phase: PHASE,
      dryRunOnly: true,
      activeShowId: null,
      activeShowName: null,
      activeSlotId: null,
      lastWouldAction: "INIT",
      lastReason: "NO_PREVIOUS_STATE",
      lastAtParam: null,
      lastSelectedSegmentId: null,
      history: [],
    };
  }
}

async function saveMasterState(state: MasterState) {
  const outDir = path.join(process.cwd(), ".data");
  await mkdir(outDir, { recursive: true });

  const filePath = path.join(outDir, "ai-host-long-show-master-feeder-state.json");
  await writeFile(filePath, JSON.stringify(state, null, 2), "utf8");

  return filePath;
}

async function fetchGuard(atParam: string | null): Promise<GuardResponse> {
  const url = new URL("http://127.0.0.1:3101/api/radio/ai-host-long-show-schedule-guard");

  if (atParam) {
    url.searchParams.set("at", atParam);
  }

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`SCHEDULE_GUARD_HTTP_${res.status}`);
  }

  return (await res.json()) as GuardResponse;
}

function decideAction(guard: GuardResponse, state: MasterState, selectedShow: ScriptShow | null): string {
  const decision = guard.decision || {};
  const slotId = guard.currentLongShowSlot?.id || null;

  if (decision.mustPauseForNia) {
    if (slotId === "evening-show-before-nia") return "WOULD_PREPARE_PAUSE_FOR_NIA";
    return "WOULD_PAUSE_OR_BLOCK_FOR_NIA";
  }

  if (!selectedShow || !slotId) {
    return "WOULD_IDLE_SMARTZJ_NO_LONG_SHOW_SLOT";
  }

  if (decision.shouldResumeAfterNia && slotId === "evening-show-after-nia") {
    return "WOULD_RESUME_EVENING_SHOW_AFTER_NIA";
  }

  if (decision.safeToStartLongShow || decision.safeToContinueLongShow) {
    if (state.activeShowId === selectedShow.showId && state.activeSlotId === slotId) {
      return "WOULD_CONTINUE_LONG_SHOW_DRY_RUN";
    }

    if (slotId === "night-show") return "WOULD_START_NIGHT_SHOW_AFTER_NIA_CLEAR";
    if (slotId === "morning-show") return "WOULD_START_MORNING_SHOW_DRY_RUN";
    if (slotId === "evening-show-before-nia") return "WOULD_START_EVENING_SHOW_DRY_RUN";

    return "WOULD_START_LONG_SHOW_DRY_RUN";
  }

  return "WOULD_HOLD_NO_ACTION";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const atParam = url.searchParams.get("at");

  const [scriptSource, state] = await Promise.all([
    loadLatestJson<ScriptPackage>("ai-host-long-show-scripts"),
    loadMasterState(),
  ]);

  if (!scriptSource || !Array.isArray(scriptSource.data.shows) || scriptSource.data.shows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        phase: PHASE,
        error: "NO_LONG_SHOW_SCRIPT_PACKAGE_FOUND",
        instruction: "Run /api/radio/ai-host-long-show-script-feeder first.",
        safety: safety(),
      },
      { status: 404 }
    );
  }

  let guard: GuardResponse;

  try {
    guard = await fetchGuard(atParam);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        phase: PHASE,
        error: error instanceof Error ? error.message : "SCHEDULE_GUARD_FAILED",
        safety: safety(),
      },
      { status: 502 }
    );
  }

  const slotId = guard.currentLongShowSlot?.id || null;
  const showId = showIdFromSlot(slotId);
  const selectedShow = showId
    ? scriptSource.data.shows.find((show) => show.showId === showId) || null
    : null;

  const minuteOfDay = Number(guard.jamaicaNow?.minuteOfDay || 0);
  const showMinute = minuteFromShowStart(slotId, minuteOfDay);
  const selectedSegment = selectSegment(selectedShow, showMinute);

  const wouldAction = decideAction(guard, state, selectedShow);
  const reason = guard.decision?.reason || "NO_GUARD_REASON";

  const newState: MasterState = {
    ...state,
    updatedAt: new Date().toISOString(),
    phase: PHASE,
    dryRunOnly: true,
    activeShowId:
      wouldAction.includes("WOULD_START") ||
      wouldAction.includes("WOULD_CONTINUE") ||
      wouldAction.includes("WOULD_RESUME")
        ? selectedShow?.showId || null
        : state.activeShowId,
    activeShowName:
      wouldAction.includes("WOULD_START") ||
      wouldAction.includes("WOULD_CONTINUE") ||
      wouldAction.includes("WOULD_RESUME")
        ? selectedShow?.showName || null
        : state.activeShowName,
    activeSlotId:
      wouldAction.includes("WOULD_START") ||
      wouldAction.includes("WOULD_CONTINUE") ||
      wouldAction.includes("WOULD_RESUME")
        ? slotId
        : state.activeSlotId,
    lastWouldAction: wouldAction,
    lastReason: reason,
    lastAtParam: atParam,
    lastSelectedSegmentId: selectedSegment?.segmentId || null,
    history: [
      ...(Array.isArray(state.history) ? state.history.slice(-24) : []),
      {
        at: new Date().toISOString(),
        atParam,
        wouldAction,
        showId: selectedShow?.showId || null,
        segmentId: selectedSegment?.segmentId || null,
        reason,
      },
    ],
  };

  const savedStatePath = await saveMasterState(newState);

  return NextResponse.json({
    ok: true,
    phase: PHASE,
    createdAt: new Date().toISOString(),
    sourceScriptPackageFile: scriptSource.fileName,
    sourceScriptPackageId: scriptSource.data.scriptPackageId || null,
    atParam,
    guard: {
      phase: guard.phase,
      probeMode: guard.probeMode,
      jamaicaNow: guard.jamaicaNow,
      currentLongShowSlot: guard.currentLongShowSlot || null,
      decision: guard.decision || null,
    },
    masterDecision: {
      wouldAction,
      reason,
      canMoveScheduleNow:
        wouldAction.includes("WOULD_START") ||
        wouldAction.includes("WOULD_CONTINUE") ||
        wouldAction.includes("WOULD_RESUME"),
      wouldStartVoice: false,
      wouldStartBroadcast: false,
      wouldWriteCurrentBroadcast: false,
      wouldTouchSmartZJ: false,
      wouldTouchNiaNews: false,
    },
    selectedShow: selectedShow
      ? {
          showId: selectedShow.showId,
          showName: selectedShow.showName,
          slot: selectedShow.slot,
          targetMinutes: selectedShow.targetMinutes,
          plannedMinutes: selectedShow.plannedMinutes,
          segmentCount: selectedShow.segmentCount,
        }
      : null,
    selectedSegment: selectedSegment
      ? {
          segmentId: selectedSegment.segmentId,
          blockNumber: selectedSegment.blockNumber,
          startMinute: selectedSegment.startMinute,
          durationMinutes: selectedSegment.durationMinutes,
          segmentType: selectedSegment.segmentType,
          title: selectedSegment.title,
          purpose: selectedSegment.purpose,
          hosts: selectedSegment.hosts,
          estimatedVoiceMinutes: selectedSegment.estimatedVoiceMinutes,
          estimatedMusicMinutes: selectedSegment.estimatedMusicMinutes,
          firstHostTurns: Array.isArray(selectedSegment.hostTurns)
            ? selectedSegment.hostTurns.slice(0, 3)
            : [],
        }
      : null,
    timing: {
      minuteOfDay,
      showMinute,
    },
    state: {
      activeShowId: newState.activeShowId,
      activeShowName: newState.activeShowName,
      activeSlotId: newState.activeSlotId,
      lastWouldAction: newState.lastWouldAction,
      lastReason: newState.lastReason,
      lastSelectedSegmentId: newState.lastSelectedSegmentId,
      historyCount: newState.history.length,
      savedStatePath,
    },
    safety: safety(),
  });
}

export async function POST(request: Request) {
  return GET(request);
}
