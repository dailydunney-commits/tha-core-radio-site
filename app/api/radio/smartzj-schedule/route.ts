import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AnyRecord = Record<string, any>;

const DATA_DIR = path.join(process.cwd(), ".data");
const SCHEDULE_FILE = path.join(DATA_DIR, "smartzj-schedule.json");
const LIVE_READY_POOL_FILE = path.join(DATA_DIR, "smartzj-live-ready-pool.json");
const SMARTDJ_STATE_FILE = path.join(DATA_DIR, "smartdj-state.json");

const DEFAULT_SCHEDULE = {
  enabled: true,
  timezone: "America/Jamaica",
  fallbackMinPlayable: 25,
  rawAzuraBlocked: true,
  defaultFallbackLanes: [
    "Ole-School-Dancehall",
    "Reggae",
    "R-n-B",
    "Dancehall",
  ],
  blocks: [
    {
      id: "early-morning-clean-mix",
      name: "Early Morning Clean Mix",
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      start: "05:00",
      end: "06:00",
      type: "music",
      primaryLane: "Reggae",
      fallbackLanes: ["Ole-School-Dancehall", "R-n-B"],
      insertions: ["station_id"],
      jingleEveryMinutes: 20,
      newsEveryMinutes: 0,
    },
    {
      id: "morning-wake-up",
      name: "Morning Wake Up Show",
      days: ["mon", "tue", "wed", "thu", "fri"],
      start: "06:00",
      end: "09:00",
      type: "music_with_host",
      primaryLane: "Reggae",
      fallbackLanes: ["R-n-B", "Ole-School-Dancehall"],
      insertions: ["time_check", "weather", "news", "station_id"],
      jingleEveryMinutes: 20,
      newsEveryMinutes: 60,
    },
    {
      id: "workday-vibes",
      name: "Workday Vibes",
      days: ["mon", "tue", "wed", "thu", "fri"],
      start: "09:00",
      end: "12:00",
      type: "music",
      primaryLane: "R-n-B",
      fallbackLanes: ["Reggae", "Ole-School-Dancehall"],
      insertions: ["station_id", "weather"],
      jingleEveryMinutes: 25,
      newsEveryMinutes: 0,
    },
    {
      id: "midday-news-business-community",
      name: "Midday News / Business / Community",
      days: ["mon", "tue", "wed", "thu", "fri"],
      start: "12:00",
      end: "13:00",
      type: "programming",
      primaryLane: "Reggae",
      fallbackLanes: ["R-n-B", "Ole-School-Dancehall"],
      insertions: ["news", "weather", "business_tips", "community_notice", "sponsor_read"],
      jingleEveryMinutes: 20,
      newsEveryMinutes: 30,
    },
    {
      id: "afternoon-clean-mix",
      name: "Afternoon Clean Mix",
      days: ["mon", "tue", "wed", "thu", "fri"],
      start: "13:00",
      end: "16:00",
      type: "music",
      primaryLane: "Dancehall",
      fallbackLanes: ["Ole-School-Dancehall", "Reggae"],
      insertions: ["station_id"],
      jingleEveryMinutes: 20,
      newsEveryMinutes: 0,
    },
    {
      id: "evening-drive",
      name: "Evening Drive",
      days: ["mon", "tue", "wed", "thu", "fri"],
      start: "16:00",
      end: "19:00",
      type: "music_with_host",
      primaryLane: "Fresh-Dancehall",
      fallbackLanes: ["Dancehall", "Ole-School-Dancehall", "R-n-B"],
      insertions: ["time_check", "weather", "station_id", "sponsor_read"],
      jingleEveryMinutes: 20,
      newsEveryMinutes: 60,
    },
    {
      id: "prime-time-mix",
      name: "Prime Time Mix",
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      start: "19:00",
      end: "22:00",
      type: "music",
      primaryLane: "Hip-Hop",
      fallbackLanes: ["Dancehall", "R-n-B", "Reggae", "Ole-School-Dancehall"],
      insertions: ["station_id", "sponsor_read"],
      jingleEveryMinutes: 20,
      newsEveryMinutes: 0,
    },
    {
      id: "late-night-smooth",
      name: "Late Night Smooth",
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      start: "22:00",
      end: "01:00",
      type: "music",
      primaryLane: "R-n-B",
      fallbackLanes: ["Reggae", "Ole-School-Dancehall"],
      insertions: ["station_id"],
      jingleEveryMinutes: 30,
      newsEveryMinutes: 0,
    },
    {
      id: "overnight-auto-clean-rotation",
      name: "Overnight Auto Clean Rotation",
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      start: "01:00",
      end: "05:00",
      type: "smartzj_rotation",
      primaryLane: "ANY_READY_LANE",
      fallbackLanes: ["Ole-School-Dancehall", "Reggae", "R-n-B", "Dancehall"],
      insertions: ["station_id"],
      jingleEveryMinutes: 30,
      newsEveryMinutes: 0,
    },
  ],
};

function readJson(filePath: string, fallback: AnyRecord): AnyRecord {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: AnyRecord) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// SMARTZJ_GENERIC_LANE_PRESERVE_V1
function canonicalLane(value: unknown) {
  const raw = String(value ?? "").trim();
  const cleaned = raw
    .replace(/[_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const key = cleaned
    .replace(/[-_\/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!key) return "";
  if (key === "any ready lane") return "ANY_READY_LANE";

  // Friendly aliases only. Specific lanes must not collapse into broad lanes.
  if (key === "ole school dancehall" || key === "old school dancehall") return "Ole-School-Dancehall";
  if (key === "fresh dancehall") return "Fresh-Dancehall";
  if (key === "hip hop" || key === "hiphop") return "Hip-Hop";
  if (key === "r n b" || key === "r b" || key === "rnb") return "R-n-B";
  if (key === "reggae") return "Reggae";
  if (key === "dancehall") return "Dancehall";

  // Preserve future/custom lanes instead of forcing them into broad categories.
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

function rowLane(row: AnyRecord) {
  const directLane = canonicalLane(
    row.genreLane ||
      row.genre ||
      row.lane ||
      row.folder ||
      ""
  );

  if (directLane && directLane !== "Unknown") {
    return directLane;
  }

  const idPath = String(
    row.id ||
      row.trackId ||
      row.azuraRelativePath ||
      row.sourceFilePath ||
      row.localAudioPath ||
      ""
  );

  const firstPathPart =
    idPath.includes("/") || idPath.includes("\\")
      ? idPath.split(/[\\/]+/).filter(Boolean)[0]
      : "";

  return canonicalLane(firstPathPart || "Unknown");
}

function publicAudioExists(url: string) {
  const cleanUrl = String(url || "").split("?")[0].trim();

  if (!cleanUrl.startsWith("/audio/")) {
    return false;
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    ...cleanUrl.replace(/^\/+/, "").split(/[\\/]+/).filter(Boolean)
  );

  return fs.existsSync(filePath);
}

function isReadyPlayable(row: AnyRecord) {
  const url = String(
    row.cleanAudioUrl ||
      row.processedAudioUrl ||
      row.bleepedAudioUrl ||
      row.safeAudioUrl ||
      row.audioUrl ||
      ""
  ).trim();

  const statusText = String(
    `${row.status || ""} ${row.cleanStatus || ""} ${row.bleepJobStatus || ""}`
  ).toUpperCase();

  return Boolean(
    url &&
      publicAudioExists(url) &&
      (
        statusText.includes("PROCESSED_AUDIO_READY") ||
        statusText.includes("READY")
      )
  );
}

function getRowsFromFile(filePath: string) {
  const data = readJson(filePath, {});
  return [
    data.tracks,
    data.playlist,
    data.lastPlaylist,
    data.lastResult?.playlist,
    data.result?.playlist,
  ].filter(Array.isArray).flat() as AnyRecord[];
}

function countPlayableByLane() {
  const rows = [
    ...getRowsFromFile(LIVE_READY_POOL_FILE),
    ...getRowsFromFile(SMARTDJ_STATE_FILE),
  ];

  const seen = new Set<string>();
  const counts: Record<string, number> = {};

  for (const row of rows) {
    if (!row || !isReadyPlayable(row)) continue;

    const url = String(
      row.cleanAudioUrl ||
        row.processedAudioUrl ||
        row.bleepedAudioUrl ||
        row.safeAudioUrl ||
        row.audioUrl ||
        ""
    );

    const key = `${row.id || row.trackId || row.title || url}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const lane = rowLane(row) || "Unknown";
    counts[lane] = (counts[lane] || 0) + 1;
  }

  return counts;
}

function normalizeSchedule(raw: AnyRecord) {
  return {
    ...DEFAULT_SCHEDULE,
    ...raw,
    blocks: Array.isArray(raw.blocks) ? raw.blocks : DEFAULT_SCHEDULE.blocks,
    defaultFallbackLanes: Array.isArray(raw.defaultFallbackLanes)
      ? raw.defaultFallbackLanes
      : DEFAULT_SCHEDULE.defaultFallbackLanes,
  };
}

function getSchedule() {
  const current = readJson(SCHEDULE_FILE, DEFAULT_SCHEDULE);
  const schedule = normalizeSchedule(current);

  if (!fs.existsSync(SCHEDULE_FILE)) {
    writeJson(SCHEDULE_FILE, schedule);
  }

  return schedule;
}

function timePartsForZone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "America/Jamaica",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";

  const weekday = get("weekday").slice(0, 3).toLowerCase();
  const hour = Number(get("hour") || 0);
  const minute = Number(get("minute") || 0);

  return {
    weekday,
    hour,
    minute,
    minuteOfDay: hour * 60 + minute,
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function toMinuteOfDay(value: string) {
  const [h, m] = String(value || "00:00").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function blockMatchesTime(block: AnyRecord, now: AnyRecord) {
  const days = Array.isArray(block.days) ? block.days.map((day: string) => day.toLowerCase()) : [];
  if (days.length && !days.includes(now.weekday)) return false;

  const start = toMinuteOfDay(block.start);
  const end = toMinuteOfDay(block.end);
  const current = Number(now.minuteOfDay || 0);

  if (start === end) return true;
  if (start < end) return current >= start && current < end;

  return current >= start || current < end;
}

function getActiveBlock(schedule: AnyRecord, now: AnyRecord) {
  const blocks = Array.isArray(schedule.blocks) ? schedule.blocks : [];

  function cleanValue(value: unknown) {
    return String(value ?? "").trim();
  }

  function toMinutes(value: unknown) {
    const text = cleanValue(value);
    const match = text.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return -1;

    const hour = Math.max(0, Math.min(23, Number(match[1])));
    const minute = Math.max(0, Math.min(59, Number(match[2])));

    return hour * 60 + minute;
  }

  function currentMinutes() {
    const direct =
      Number(now?.minuteOfDay) ||
      Number(now?.minutesOfDay) ||
      Number(now?.minutes);

    if (Number.isFinite(direct) && direct >= 0) return direct;

    const hour = Number(now?.hour);
    const minute = Number(now?.minute);

    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return hour * 60 + minute;
    }

    return toMinutes(now?.time || now?.hhmm || now?.clock);
  }

  function currentDayKey() {
    return cleanValue(
      now?.dayKey ||
        now?.day ||
        now?.weekday ||
        now?.shortDay ||
        ""
    )
      .toLowerCase()
      .slice(0, 3);
  }

  function dayMatches(block: AnyRecord) {
    const days = Array.isArray(block?.days) ? block.days : [];
    if (!days.length) return true;

    const today = currentDayKey();
    if (!today) return true;

    return days
      .map((day: unknown) => cleanValue(day).toLowerCase().slice(0, 3))
      .includes(today);
  }

  function isActive(block: AnyRecord) {
    const start = toMinutes(block?.start);
    const end = toMinutes(block?.end);
    const current = currentMinutes();

    // SMARTZJ_IGNORE_ZERO_LENGTH_SCHEDULE_BLOCK_V1
    // A 00:00-00:00 or same-start/end block is a draft/empty block, not an all-day hijack.
    if (start < 0 || end < 0 || current < 0 || start === end) return false;
    if (!dayMatches(block)) return false;

    if (start < end) {
      return current >= start && current < end;
    }

    // Overnight block, example 22:00-05:00.
    return current >= start || current < end;
  }

  function durationMinutes(block: AnyRecord) {
    const start = toMinutes(block?.start);
    const end = toMinutes(block?.end);
    if (start < 0 || end < 0 || start === end) return 99999;
    return start < end ? end - start : 1440 - start + end;
  }

  const activeBlocks = blocks.filter((block: AnyRecord) => isActive(block));

  activeBlocks.sort((a: AnyRecord, b: AnyRecord) => {
    const priorityA = Number(a?.priority || 5);
    const priorityB = Number(b?.priority || 5);

    if (priorityA !== priorityB) return priorityB - priorityA;

    // Same priority: more specific/shorter block wins over broad blocks.
    const durationA = durationMinutes(a);
    const durationB = durationMinutes(b);

    if (durationA !== durationB) return durationA - durationB;

    return toMinutes(b?.start) - toMinutes(a?.start);
  });

  const selected = activeBlocks[0] || null;

  if (!selected) return null;

  return {
    ...selected,
    scheduleSelectionRule: "HIGHEST_PRIORITY_ACTIVE_BLOCK",
    activeBlockCount: activeBlocks.length,
  };
}


function choosePlayableLane(schedule: AnyRecord, block: AnyRecord | null, counts: Record<string, number>) {
  const primaryLane = canonicalLane(
    block?.primaryLane ||
      block?.lane ||
      block?.genreLane ||
      block?.selectedLane ||
      ""
  );

  const fallbackLanes = [
    ...(Array.isArray(block?.fallbackLanes) ? block.fallbackLanes : []),
    ...(Array.isArray(schedule.defaultFallbackLanes) ? schedule.defaultFallbackLanes : []),
  ]
    .map(canonicalLane)
    .filter(Boolean);

  const countFor = (lane: string) => Number(counts[lane] || 0);

  // SMARTZJ_STRICT_SCHEDULE_LANE_V1
  // Schedule must obey the active block first.
  // Only leave the scheduled lane when it has ZERO clean/bleeped READY tracks.
  if (primaryLane) {
    const primaryCount = countFor(primaryLane);

    if (primaryCount > 0) {
      return {
        selectedLane: primaryLane,
        selectedLaneCount: primaryCount,
        selectionReason: "STRICT_SCHEDULE_PRIMARY_READY",
      };
    }

    for (const lane of fallbackLanes) {
      const count = countFor(lane);
      if (count > 0) {
        return {
          selectedLane: lane,
          selectedLaneCount: count,
          selectionReason: "STRICT_SCHEDULE_PRIMARY_EMPTY_FALLBACK_READY",
        };
      }
    }
  }

  const anyPlayable = Object.entries(counts)
    .filter(([, count]) => Number(count) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))[0];

  if (anyPlayable) {
    return {
      selectedLane: anyPlayable[0],
      selectedLaneCount: Number(anyPlayable[1]),
      selectionReason: primaryLane
        ? "STRICT_SCHEDULE_PRIMARY_EMPTY_EMERGENCY_ANY_READY"
        : "NO_ACTIVE_BLOCK_EMERGENCY_ANY_READY",
    };
  }

  return {
    selectedLane: "",
    selectedLaneCount: 0,
    selectionReason: "NO_PLAYABLE_CLEAN_LANE",
  };
}

function buildScheduleResponse() {
  const schedule = getSchedule();
  const now = timePartsForZone(String(schedule.timezone || "America/Jamaica"));
  const activeBlock = schedule.enabled ? getActiveBlock(schedule, now) : null;
  const laneCounts = countPlayableByLane();
  const laneChoice = choosePlayableLane(schedule, activeBlock, laneCounts);

  return {
    ok: true,
    route: "/api/radio/smartzj-schedule",
    enabled: Boolean(schedule.enabled),
    timezone: schedule.timezone || "America/Jamaica",
    now,
    activeBlock,
    laneCounts,
    ...laneChoice,
    scheduleOverrideActive: Boolean(activeBlock?.interruptBroadcast),
    requestPriorityBlocked: Boolean(activeBlock?.prioritizeOverRequests),
    interruptBroadcast: Boolean(activeBlock?.interruptBroadcast),
    prioritizeOverRequests: Boolean(activeBlock?.prioritizeOverRequests),
    fallbackMinPlayable: schedule.fallbackMinPlayable || 25,
    rawAzuraBlocked: true,
    schedule,
    message: activeBlock
      ? `Active schedule block: ${activeBlock.name || activeBlock.id}.`
      : "No active schedule block. Using fallback clean lane.",
  };
}

export async function GET() {
  return NextResponse.json(buildScheduleResponse(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const current = getSchedule();

  let nextSchedule: AnyRecord;

  if (body.action === "reset") {
    nextSchedule = {
      ...DEFAULT_SCHEDULE,
      updatedAt: new Date().toISOString(),
    };
  } else {
    const incoming = body.schedule && typeof body.schedule === "object"
      ? body.schedule
      : body;

    nextSchedule = normalizeSchedule({
      ...current,
      ...incoming,
      updatedAt: new Date().toISOString(),
    });
  }

  writeJson(SCHEDULE_FILE, nextSchedule);

  return NextResponse.json({
    ...buildScheduleResponse(),
    saved: true,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
