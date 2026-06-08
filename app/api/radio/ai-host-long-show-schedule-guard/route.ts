import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PHASE = "AI_HOST_LONG_SHOW_SCHEDULE_GUARD_V1_DRY_ONLY";
const JAMAICA_TZ = "America/Jamaica";
const JAMAICA_OFFSET = "-05:00";
const DAY_MINUTES = 24 * 60;

type WindowRule = {
  id: string;
  label: string;
  type: "nia-news" | "long-show" | "buffer" | "handoff";
  startMinute: number;
  endMinute: number;
  owner: "Nia" | "ProdigyDiamond" | "SmartZJ";
  priority: number;
  action:
    | "NIA_OWNS_BROADCAST"
    | "LONG_SHOW_CAN_RUN"
    | "LONG_SHOW_HANDOFF"
    | "LONG_SHOW_PAUSED_FOR_NIA"
    | "NO_LONG_SHOW";
  notes: string;
};

type ProbeFileResult = {
  file: string;
  found: boolean;
  niaActiveSignal?: boolean;
  summary?: string;
};

type NowPlayingProbe = {
  ok: boolean;
  niaLikeSignal: boolean;
  mode?: string | null;
  safety?: string | null;
  title?: string | null;
  error?: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatMinute(minute: number): string {
  const normalized = ((minute % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const hour = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${pad2(mins)} ${suffix}`;
}

function partsInJamaica(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAMAICA_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";

  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;

  const minute = Number(get("minute"));
  const second = Number(get("second"));

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
    hour,
    minute,
    second,
    minuteOfDay: hour * 60 + minute,
    isoDate: `${get("year")}-${get("month")}-${get("day")}`,
    clock12: `${formatMinute(hour * 60 + minute)}:${pad2(second)}`,
  };
}

function parseAtParam(at: string | null): Date {
  if (!at) return new Date();

  const clean = at.trim();

  if (/^\d{1,2}:\d{2}$/.test(clean)) {
    const nowJa = partsInJamaica(new Date());
    const [h, m] = clean.split(":");
    return new Date(`${nowJa.isoDate}T${pad2(Number(h))}:${m}:00${JAMAICA_OFFSET}`);
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean)) {
    return new Date(`${clean}:00${JAMAICA_OFFSET}`);
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(clean)) {
    return new Date(`${clean}${JAMAICA_OFFSET}`);
  }

  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("INVALID_AT_PARAM");
  }

  return parsed;
}

function inWindow(minute: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return minute >= start && minute < end;
  return minute >= start || minute < end;
}

function minutesUntil(start: number, now: number): number {
  const raw = start - now;
  return raw >= 0 ? raw : raw + DAY_MINUTES;
}

function rules(): WindowRule[] {
  return [
    // Nia protected news windows with safety buffers.
    {
      id: "nia-0600",
      label: "Nia 6 AM News / Morning Update protected window",
      type: "nia-news",
      startMinute: 5 * 60 + 55,
      endMinute: 6 * 60 + 30,
      owner: "Nia",
      priority: 100,
      action: "NIA_OWNS_BROADCAST",
      notes: "Long shows must not start until this window clears.",
    },
    {
      id: "nia-1000",
      label: "Nia 10 AM News protected window",
      type: "nia-news",
      startMinute: 9 * 60 + 55,
      endMinute: 10 * 60 + 35,
      owner: "Nia",
      priority: 100,
      action: "NIA_OWNS_BROADCAST",
      notes: "Morning show must hard stop before this window.",
    },
    {
      id: "nia-1300",
      label: "Nia 1 PM News protected window",
      type: "nia-news",
      startMinute: 12 * 60 + 55,
      endMinute: 13 * 60 + 25,
      owner: "Nia",
      priority: 100,
      action: "NIA_OWNS_BROADCAST",
      notes: "No long show should start here unless explicitly approved later.",
    },
    {
      id: "nia-1500",
      label: "Nia 3 PM News protected window",
      type: "nia-news",
      startMinute: 14 * 60 + 55,
      endMinute: 15 * 60 + 25,
      owner: "Nia",
      priority: 100,
      action: "NIA_OWNS_BROADCAST",
      notes: "No long show should start here unless explicitly approved later.",
    },
    {
      id: "nia-1730",
      label: "Nia 5:30 PM News protected window",
      type: "nia-news",
      startMinute: 17 * 60 + 25,
      endMinute: 18 * 60 + 5,
      owner: "Nia",
      priority: 100,
      action: "NIA_OWNS_BROADCAST",
      notes: "Evening Music Link-Up must pause and resume after this window clears.",
    },
    {
      id: "nia-2000",
      label: "Nia 8 PM News / Evening Update protected window",
      type: "nia-news",
      startMinute: 19 * 60 + 55,
      endMinute: 20 * 60 + 30,
      owner: "Nia",
      priority: 100,
      action: "NIA_OWNS_BROADCAST",
      notes: "Late Night Reasoning must not start until this clears.",
    },

    // Long show windows.
    {
      id: "morning-show",
      label: "The Core Morning Kickstart",
      type: "long-show",
      startMinute: 6 * 60 + 30,
      endMinute: 9 * 60 + 55,
      owner: "ProdigyDiamond",
      priority: 50,
      action: "LONG_SHOW_CAN_RUN",
      notes: "Runs after Nia 6 AM and stops with a 5-minute buffer before Nia 10 AM.",
    },
    {
      id: "morning-handoff",
      label: "Morning handoff buffer before Nia 10 AM",
      type: "handoff",
      startMinute: 9 * 60 + 55,
      endMinute: 10 * 60,
      owner: "Nia",
      priority: 90,
      action: "LONG_SHOW_HANDOFF",
      notes: "Hard stop / no new Prodigy & Diamond segment should start.",
    },
    {
      id: "evening-show-before-nia",
      label: "The Core Music Link-Up before Nia 5:30",
      type: "long-show",
      startMinute: 16 * 60,
      endMinute: 17 * 60 + 25,
      owner: "ProdigyDiamond",
      priority: 50,
      action: "LONG_SHOW_CAN_RUN",
      notes: "Music show runs until the protected 5:30 Nia handoff buffer.",
    },
    {
      id: "evening-paused-for-nia",
      label: "Evening show paused for Nia 5:30",
      type: "buffer",
      startMinute: 17 * 60 + 25,
      endMinute: 18 * 60 + 5,
      owner: "Nia",
      priority: 95,
      action: "LONG_SHOW_PAUSED_FOR_NIA",
      notes: "Nia owns broadcast. Long show resumes only after Nia clears.",
    },
    {
      id: "evening-show-after-nia",
      label: "The Core Music Link-Up after Nia 5:30",
      type: "long-show",
      startMinute: 18 * 60 + 5,
      endMinute: 19 * 60 + 30,
      owner: "ProdigyDiamond",
      priority: 50,
      action: "LONG_SHOW_CAN_RUN",
      notes: "Evening show can resume after Nia news window clears.",
    },
    {
      id: "night-show",
      label: "The Late Night Reasoning",
      type: "long-show",
      startMinute: 20 * 60 + 30,
      endMinute: 24 * 60,
      owner: "ProdigyDiamond",
      priority: 50,
      action: "LONG_SHOW_CAN_RUN",
      notes: "Starts only after Nia 8 PM protected window clears.",
    },
  ];
}

function activeRulesAt(minute: number): WindowRule[] {
  return rules()
    .filter((rule) => inWindow(minute, rule.startMinute, rule.endMinute))
    .sort((a, b) => b.priority - a.priority);
}

function upcomingNiaRules(minute: number, withinMinutes: number): Array<WindowRule & { minutesUntilStart: number }> {
  return rules()
    .filter((rule) => rule.type === "nia-news")
    .map((rule) => ({
      ...rule,
      minutesUntilStart: minutesUntil(rule.startMinute, minute),
    }))
    .filter((rule) => rule.minutesUntilStart > 0 && rule.minutesUntilStart <= withinMinutes)
    .sort((a, b) => a.minutesUntilStart - b.minutesUntilStart);
}

function activeValueIsTrue(value: unknown): boolean {
  if (value === true) return true;

  if (typeof value === "string") {
    const clean = value.toLowerCase().trim();
    return ["true", "yes", "running", "active", "broadcasting"].includes(clean);
  }

  return false;
}

// STRICT_NIA_ACTIVE_SIGNAL_V2
// Do not treat random true values inside old state/current-broadcast files as Nia active.
// Only a clear active/running/broadcasting key inside a Nia/news/program context can block.
function findBooleanSignal(obj: unknown, depth = 0): boolean | null {
  if (depth > 5 || obj == null || typeof obj !== "object") return null;

  const record = obj as Record<string, unknown>;
  const context = JSON.stringify(record).toLowerCase();
  const hasNiaOrNewsContext = context.includes("nia") || context.includes("news");

  if (!hasNiaOrNewsContext) return null;

  for (const [key, value] of Object.entries(record)) {
    const lower = key.toLowerCase();

    const isActiveKey =
      lower === "active" ||
      lower === "isactive" ||
      lower.includes("active") ||
      lower.includes("running") ||
      lower.includes("broadcasting");

    if (isActiveKey && activeValueIsTrue(value)) {
      return true;
    }

    const shouldSearchNested =
      lower.includes("nia") ||
      lower.includes("news") ||
      lower.includes("program") ||
      lower.includes("broadcast") ||
      lower.includes("state");

    if (shouldSearchNested && value && typeof value === "object") {
      const nested = findBooleanSignal(value, depth + 1);
      if (nested === true) return true;
    }
  }

  return null;
}
async function probeNiaFiles(): Promise<ProbeFileResult[]> {
  const candidates = [
    ".data/nia-news-master-state.json",
    ".data/nia-news-master-feeder-state.json",
    ".data/ai-host-news-master-state.json",
    ".data/ai-host-news-program-state.json",
    ".data/nia-program-state.json",
    ".data/ai-host-program-broadcast-state.json",
    ".data/current-broadcast.json",
  ];

  const results: ProbeFileResult[] = [];

  for (const file of candidates) {
    const full = path.join(process.cwd(), file);

    try {
      const raw = await readFile(full, "utf8");
      const parsed = JSON.parse(raw);
      const signal = findBooleanSignal(parsed);

      results.push({
        file,
        found: true,
        niaActiveSignal: signal === true,
        summary: raw.slice(0, 240).replace(/\s+/g, " "),
      });
    } catch {
      results.push({
        file,
        found: false,
      });
    }
  }

  return results;
}

async function probeNowPlaying(): Promise<NowPlayingProbe> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);

    const res = await fetch("http://127.0.0.1:3101/api/listener/now-playing", {
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      return {
        ok: false,
        niaLikeSignal: false,
        error: `HTTP_${res.status}`,
      };
    }

    const j = (await res.json()) as Record<string, unknown>;
    const text = JSON.stringify(j).toLowerCase();

    return {
      ok: true,
      niaLikeSignal:
        text.includes("nia") ||
        text.includes("news-0600") ||
        text.includes("news-1000") ||
        text.includes("news-1300") ||
        text.includes("news-1500") ||
        text.includes("news-1730") ||
        text.includes("news-2000"),
      mode: typeof j.mode === "string" ? j.mode : null,
      safety: typeof j.safety === "string" ? j.safety : null,
      title: typeof j.title === "string" ? j.title : null,
    };
  } catch (error) {
    return {
      ok: false,
      niaLikeSignal: false,
      error: error instanceof Error ? error.message : "NOW_PLAYING_PROBE_FAILED",
    };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const atParam = url.searchParams.get("at");
  const upcomingBuffer = Number(url.searchParams.get("upcomingBufferMinutes") || "10");
  const pauseBuffer = Number(url.searchParams.get("pauseBufferMinutes") || "5");

  let now: Date;

  try {
    now = parseAtParam(atParam);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        phase: PHASE,
        error: "INVALID_AT_PARAM",
        example: "/api/radio/ai-host-long-show-schedule-guard?at=17:27",
        draftOnly: true,
        voiceStarted: false,
        broadcastStarted: false,
      },
      { status: 400 }
    );
  }

  const ja = partsInJamaica(now);
  const active = activeRulesAt(ja.minuteOfDay);
  const activeNiaRules = active.filter((rule) => rule.type === "nia-news" || rule.owner === "Nia");
  const activeLongRules = active.filter((rule) => rule.type === "long-show");
  const upcomingNia = upcomingNiaRules(ja.minuteOfDay, upcomingBuffer);
  const pauseSoonNia = upcomingNiaRules(ja.minuteOfDay, pauseBuffer);

  const isSimulation = !!atParam;
  const [niaFiles, nowPlaying] = await Promise.all([probeNiaFiles(), probeNowPlaying()]);

  const niaActiveFromFiles = niaFiles.some((file) => file.niaActiveSignal === true);

  // When ?at= is supplied, this route is testing a simulated clock time.
  // In simulation mode, do not let live/stale Nia state files override the schedule test.
  // Real current-time checks with no ?at= still use live Nia/now-playing probes.
  const niaActiveObserved = isSimulation ? false : niaActiveFromFiles || nowPlaying.niaLikeSignal;
  const niaProtectedNow = activeNiaRules.length > 0 || niaActiveObserved;

  const currentLongShowSlot = activeLongRules[0] || null;
  const activeTopRule = active[0] || null;

  const mustPauseForNia =
    niaProtectedNow ||
    pauseSoonNia.length > 0 ||
    active.some((rule) => rule.action === "LONG_SHOW_PAUSED_FOR_NIA" || rule.action === "LONG_SHOW_HANDOFF");

  const safeToStartLongShow =
    !!currentLongShowSlot &&
    !niaProtectedNow &&
    pauseSoonNia.length === 0 &&
    activeTopRule?.action === "LONG_SHOW_CAN_RUN";

  const safeToContinueLongShow =
    !!currentLongShowSlot &&
    !niaProtectedNow &&
    pauseSoonNia.length === 0 &&
    activeTopRule?.action === "LONG_SHOW_CAN_RUN";

  const shouldResumeAfterNia =
    !!currentLongShowSlot &&
    !niaProtectedNow &&
    upcomingNia.length === 0 &&
    (currentLongShowSlot.id === "evening-show-after-nia" || currentLongShowSlot.id === "night-show");

  const reason =
    niaProtectedNow
      ? "NIA_PROTECTED_OR_ACTIVE_NOW"
      : pauseSoonNia.length > 0
        ? "NIA_UPCOMING_WITHIN_PAUSE_BUFFER"
        : activeTopRule?.action === "LONG_SHOW_HANDOFF"
          ? "LONG_SHOW_HANDOFF_TO_NIA"
          : activeTopRule?.action === "LONG_SHOW_PAUSED_FOR_NIA"
            ? "LONG_SHOW_PAUSED_FOR_NIA"
            : currentLongShowSlot
              ? "LONG_SHOW_WINDOW_SAFE_DRY_RUN"
              : "NO_LONG_SHOW_SLOT_NOW";

  return NextResponse.json({
    ok: true,
    phase: PHASE,
    createdAt: new Date().toISOString(),
    timezone: JAMAICA_TZ,
    atParam,
    probeMode: isSimulation ? "SCHEDULE_SIMULATION_ONLY" : "LIVE_CLOCK_WITH_NIA_STATE_PROBES",
    jamaicaNow: {
      isoDate: ja.isoDate,
      weekday: ja.weekday,
      hour: ja.hour,
      minute: ja.minute,
      second: ja.second,
      minuteOfDay: ja.minuteOfDay,
      display: `${ja.isoDate} ${formatMinute(ja.minuteOfDay)} Jamaica`,
    },
    buffers: {
      upcomingBufferMinutes: upcomingBuffer,
      pauseBufferMinutes: pauseBuffer,
    },
    currentLongShowSlot: currentLongShowSlot
      ? {
          id: currentLongShowSlot.id,
          label: currentLongShowSlot.label,
          start: formatMinute(currentLongShowSlot.startMinute),
          end: formatMinute(currentLongShowSlot.endMinute),
          notes: currentLongShowSlot.notes,
        }
      : null,
    activeRules: active.map((rule) => ({
      id: rule.id,
      label: rule.label,
      type: rule.type,
      owner: rule.owner,
      action: rule.action,
      start: formatMinute(rule.startMinute),
      end: formatMinute(rule.endMinute),
      notes: rule.notes,
    })),
    upcomingNia: upcomingNia.map((rule) => ({
      id: rule.id,
      label: rule.label,
      start: formatMinute(rule.startMinute),
      end: formatMinute(rule.endMinute),
      minutesUntilStart: rule.minutesUntilStart,
    })),
    niaSignals: {
      activeByTimeWindow: activeNiaRules.length > 0,
      activeByStateFile: niaActiveFromFiles,
      activeByNowPlayingProbe: nowPlaying.niaLikeSignal,
      protectedNow: niaProtectedNow,
      stateFiles: niaFiles,
      nowPlaying,
    },
    decision: {
      safeToStartLongShow,
      safeToContinueLongShow,
      mustPauseForNia,
      shouldResumeAfterNia,
      reason,
    },
    scheduleRules: {
      morning: "6:30 AM-9:55 AM, then hard handoff before Nia 10 AM.",
      evening: "4:00 PM-5:25 PM, pause for Nia 5:30, resume 6:05 PM-7:30 PM if Nia is clear.",
      night: "8:30 PM-12:00 AM only after Nia 8 PM window clears.",
      niaPriority: "Nia news/program state always wins over Prodigy & Diamond long shows.",
    },
    safety: {
      dryRunOnly: true,
      draftOnly: true,
      voiceStarted: false,
      broadcastStarted: false,
      doesNotTouchNiaNews: true,
      doesNotTouchCurrentBroadcast: true,
      doesNotTouchSmartZJ: true,
      routeDoesNotStartStopPauseResumeAudio: true,
    },
  });
}
