"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

type AnyRecord = Record<string, any>;

const LANES = [
  "Reggae",
  "R-n-B",
  "Fresh-Dancehall",
  "Dancehall",
  "Ole-School-Dancehall",
  "Hip-Hop",
  "Jingles",
  "Test-Jingles",
  "ANY_READY_LANE",
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// SMARTZJ_BLOCK_COLOR_ACCENTS_V1
const BLOCK_COLORS = [
  "#ff3b30",
  "#ff9500",
  "#ffcc00",
  "#34c759",
  "#00c7be",
  "#007aff",
  "#5856d6",
  "#af52de",
  "#ff2d55",
  "#a2845e",
];

function blockAccent(index: number) {
  return BLOCK_COLORS[index % BLOCK_COLORS.length];
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function splitLanes(value: unknown) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return clean(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLanes(value: unknown) {
  return splitLanes(value).join(", ");
}


function objectArray(value: unknown): AnyRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object").map((item) => item as AnyRecord);
}

function normalizeInsertDays(value: unknown) {
  const days = Array.isArray(value) ? value.map(clean).filter(Boolean) : splitLanes(value);
  return days.length ? days : DAYS;
}

function scheduleTimeToMinutesV1(value: unknown) {
  const text = clean(value);
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return -1;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return -1;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return -1;

  return hour * 60 + minute;
}

// SCHEDULE_BLOCK_TIME_DURATION_LABEL_V1
function scheduleBlockDurationLabelV1(block: Record<string, any>) {
  const startMinutes = scheduleTimeToMinutesV1(block.start || block.startTime);
  const endMinutes = scheduleTimeToMinutesV1(block.end || block.endTime);

  let totalMinutes = 0;

  if (startMinutes >= 0 && endMinutes >= 0) {
    totalMinutes = endMinutes - startMinutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
  }

  if (totalMinutes <= 0) {
    totalMinutes = Number(block.durationMinutes || block.minutes || block.targetMinutes || 0);
  }

  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "Not set";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
  if (hours > 0) return `${hours} hr`;
  return `${minutes} min`;
}
function normalizeNewsInsert(raw: unknown, index: number) {
  const item = raw && typeof raw === "object" ? (raw as AnyRecord) : {};
  return {
    id: clean(item.id) || `news-${Date.now()}-${index}`,
    title: clean(item.title || item.name || "Nia News Insert"),
    type: clean(item.type || "nia-news"),
    enabled: item.enabled !== false,
    host: clean(item.host || "nia"),
    start: clean(item.start || item.startTime || "10:00"),
    end: clean(item.end || item.endTime || ""),
    durationMinutes: Number(item.durationMinutes || item.minutes || item.targetMinutes || 10),
    days: normalizeInsertDays(item.days || item.selectedDays),
    priority: Number(item.priority || 80),
    behavior: clean(item.behavior || item.priorityMode || "hard-break"),
    topic: clean(item.topic || item.description || "Fresh Nia news update"),
  };
}

function normalizeProgramInsert(raw: unknown, index: number) {
  const item = raw && typeof raw === "object" ? (raw as AnyRecord) : {};
  return {
    id: clean(item.id) || `program-${Date.now()}-${index}`,
    title: clean(item.title || item.name || "Program Insert"),
    type: clean(item.type || "program"),
    enabled: item.enabled !== false,
    host: clean(item.host || item.hosts || "Prodigy & Diamond"),
    start: clean(item.start || item.startTime || "12:00"),
    end: clean(item.end || item.endTime || ""),
    durationMinutes: Number(item.durationMinutes || item.minutes || 30),
    days: normalizeInsertDays(item.days || item.selectedDays),
    priority: Number(item.priority || 60),
    behavior: clean(item.behavior || item.priorityMode || "break-safe"),
    musicLane: clean(item.musicLane || item.primaryLane || ""),
    songsBetweenSegments: Number(item.songsBetweenSegments || item.songsBetweenTalks || 2),
  };
}

function normalizeJingleRule(raw: unknown, index: number) {
  const item = raw && typeof raw === "object" ? (raw as AnyRecord) : {};
  return {
    id: clean(item.id) || `jingle-${Date.now()}-${index}`,
    title: clean(item.title || item.name || "Jingle Rule"),
    type: clean(item.type || "jingle"),
    enabled: item.enabled !== false,
    lane: clean(item.lane || item.jingleLane || "Jingles"),
    songsBetween: Number(item.songsBetween || item.songsBetweenJingles || item.everySongs || 3),
    allowOverlay: Boolean(item.allowOverlay || item.allowJingleOverlay),
    days: normalizeInsertDays(item.days || item.selectedDays),
  };
}

function normalizeNewsInserts(value: unknown) {
  return objectArray(value).map((item, index) => normalizeNewsInsert(item, index));
}

function normalizeProgramInserts(value: unknown) {
  return objectArray(value).map((item, index) => normalizeProgramInsert(item, index));
}

function normalizeJingleRules(value: unknown) {
  return objectArray(value).map((item, index) => normalizeJingleRule(item, index));
}

// THA_CORE_SCHEDULE_EDITOR_INSERT_UI_RESTORE_V1

function normalizeBlock(block: AnyRecord, index: number) {
  return {
    id: clean(block.id) || `block-${Date.now()}-${index}`,
    name: clean(block.name) || `Schedule Block ${index + 1}`,
    type: clean(block.type) || "music",
    days: Array.isArray(block.days) ? block.days.map(clean).filter(Boolean) : DAYS,
    start: clean(block.start) || "00:00",
    end: clean(block.end) || "01:00",
    primaryLane: clean(block.primaryLane || block.lane || block.genreLane || "Fresh-Dancehall"),
    fallbackLanes: splitLanes(block.fallbackLanes || []),
    playbackOrder: clean(block.playbackOrder || "shuffled"),
    // SMARTZJ_BLOCK_REPEAT_GUARDS_EDITOR_V1
    startDate: clean(block.startDate || ""),
    endDate: clean(block.endDate || ""),
    priority: Number(block.priority || 5),
    noRepeatArtistCount: Number(block.noRepeatArtistCount || 5),
    noRepeatTitleCount: Number(block.noRepeatTitleCount || 10),
    interruptBroadcast: Boolean(block.interruptBroadcast),
    prioritizeOverRequests: Boolean(block.prioritizeOverRequests),
    playJinglesBetweenTracks: Boolean(block.playJinglesBetweenTracks),
    allowJingleOverlay: Boolean(block.allowJingleOverlay),
    songsBetweenJingles: Number(
      block.songsBetweenJingles ??
        block.songsBetweenScheduleJingles ??
        block.jingleEverySongs ??
        3
    ),
    newsInserts: normalizeNewsInserts(block.newsInserts),
    programInserts: normalizeProgramInserts(block.programInserts),
    jingleRules: normalizeJingleRules(block.jingleRules),
    adRules: objectArray(block.adRules),
  };
}

function makeNewBlock(index: number) {
  return normalizeBlock(
    {
      id: `custom-${Date.now()}`,
      name: "New Schedule Block",
      type: "music",
      days: DAYS,
      start: "12:00",
      end: "13:00",
      primaryLane: "Fresh-Dancehall",
      fallbackLanes: ["Dancehall", "Reggae", "R-n-B"],
      playbackOrder: "shuffled",
      startDate: "",
      endDate: "",
      priority: 5,
      noRepeatArtistCount: 5,
      noRepeatTitleCount: 10,
      interruptBroadcast: false,
      prioritizeOverRequests: false,
      playJinglesBetweenTracks: false,
      allowJingleOverlay: false,
      songsBetweenJingles: 3,
    },
    index
  );
}

export default function SmartZjSchedulePage() {
  const [response, setResponse] = useState<AnyRecord | null>(null);
  const [musicLibrary, setMusicLibrary] = useState<AnyRecord | null>(null); // THA_CORE_MUSIC_PICKER_INSIDE_BLOCK_V1

  useEffect(() => {
    let alive = true;

    async function loadMusicLibrary() {
      try {
        const res = await fetch("/api/radio/music-library?limit=10000", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setMusicLibrary(data || null);
      } catch {
        if (alive) setMusicLibrary(null);
      }
    }

    loadMusicLibrary();

    return () => {
      alive = false;
    };
  }, []);
  const [draft, setDraft] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Loading SmartZJ schedule...");
  const [openBlockIndex, setOpenBlockIndex] = useState<number | null>(null);

  async function loadSchedule() {
    setLoading(true);
    setStatus("Loading schedule...");
    try {
      const res = await fetch(`/api/radio/smartzj-schedule?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const schedule = data?.schedule || {};
      setResponse(data);
      setMusicLibrary(data?.musicLibrary || null); // THA_CORE_SCHEDULE_RESPONSE_MUSIC_LIBRARY_FALLBACK_V2
      setDraft({
        ...schedule,
        enabled: Boolean(schedule.enabled),
        timezone: clean(schedule.timezone) || "America/Jamaica",
        fallbackMinPlayable: Number(schedule.fallbackMinPlayable || data?.fallbackMinPlayable || 25),
        defaultFallbackLanes: splitLanes(schedule.defaultFallbackLanes || []),
        blocks: Array.isArray(schedule.blocks)
          ? schedule.blocks.map((block: AnyRecord, index: number) => normalizeBlock(block, index))
          : [],
      });
      setStatus("Schedule loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load schedule.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSchedule();
  }, []);

  async function refreshActiveBlockOnly() {
    // SCHEDULE_EDITOR_AUTO_ACTIVE_BLOCK_REFRESH_V1
    try {
      const res = await fetch(`/api/radio/smartzj-schedule?activeBlockPoll=1&t=${Date.now()}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (res.ok && data?.ok !== false) {
        setResponse(data);
        if (data?.musicLibrary) setMusicLibrary(data.musicLibrary);
      }

      await fetch(`/api/listener/smartzj-ended-resync?lane=schedule&scheduleRefresh=1&controlPanelBrain=1&activeBlockPoll=1&t=${Date.now()}`, {
        method: "POST",
        cache: "no-store",
      }).catch(() => null);
    } catch {}
  }

  useEffect(() => {
    let alive = true;

    const run = () => {
      if (!alive) return;
      void refreshActiveBlockOnly();
    };

    const timer = window.setInterval(run, 5000);
    window.setTimeout(run, 1200);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const activeBlock = response?.activeBlock || {};
  const blocks = useMemo(() => {
    return Array.isArray(draft?.blocks) ? draft?.blocks : [];
  }, [draft]);

  function musicTracks(): AnyRecord[] {
    const tracks = musicLibrary?.tracks;
    return Array.isArray(tracks) ? tracks : [];
  }

  function cleanMusicPath(value: unknown) {
    return clean(value).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  }

  function trackFolderPath(track: AnyRecord) {
    const relativePath = cleanMusicPath(track.relativePath || track.azuraRelativePath || track.sourceRelativePath || "");
    if (relativePath.includes("/")) return relativePath.split("/").slice(0, -1).join("/");

    const folder = cleanMusicPath(track.folder || "");
    const subfolder = cleanMusicPath(track.subfolder || "");
    return [folder, subfolder].filter(Boolean).join("/");
  }

  function trackMatchesBlock(track: AnyRecord, block: AnyRecord) {
    const selected = cleanMusicPath(block.primaryLane || "");
    if (!selected) return false;

    const relativePath = cleanMusicPath(track.relativePath || track.azuraRelativePath || track.sourceRelativePath || "");
    const folderPath = trackFolderPath(track);
    const folder = cleanMusicPath(track.folder || "");
    const lane = cleanMusicPath(track.genreLane || track.lane || track.genre || folder || "");

    return (
      relativePath === selected ||
      relativePath.startsWith(selected + "/") ||
      folderPath === selected ||
      folderPath.startsWith(selected + "/") ||
      folder === selected ||
      lane === selected
    );
  }

  function blockTracks(block: AnyRecord) {
    const tracks = musicTracks();
    if (tracks.length === 0) return [];
    return tracks.filter((track) => trackMatchesBlock(track, block));
  }

  function blockTrackCount(block: AnyRecord) {
    const matched = blockTracks(block);
    if (matched.length > 0) return matched.length;

    const lane = clean(block.primaryLane);
    const count = Number(response?.laneCounts?.[lane] || 0);
    return count;
  }

  function folderOptionsFromTree() {
    const root = musicLibrary?.tree;
    const options: { label: string; value: string }[] = [];

    function walk(node: AnyRecord, depth: number) {
      if (!node || typeof node !== "object") return;

      const value = cleanMusicPath(node.path || "");
      const name = clean(node.name || value || "Music Library");
      const count = Number(node.trackCount || 0);

      if (value) {
        options.push({
          label: `${"— ".repeat(Math.max(0, depth - 1))}${name} (${count})`,
          value,
        });
      }

      const rawChildren = node.children && typeof node.children === "object" ? Object.values(node.children) : [];
      const children = rawChildren as AnyRecord[];

      children
        .sort((a, b) => clean(a.name).localeCompare(clean(b.name)))
        .forEach((child) => walk(child, depth + 1));
    }

    walk(root as AnyRecord, 0);
    return options;
  }

  function updateDraft(field: string, value: any) {
    setDraft((current) => ({
      ...(current || {}),
      [field]: value,
    }));
  }

  function updateBlock(index: number, patch: AnyRecord) {
    setDraft((current) => {
      const nextBlocks = [...(Array.isArray(current?.blocks) ? current!.blocks : [])];
      nextBlocks[index] = {
        ...(nextBlocks[index] || {}),
        ...patch,
      };
      return {
        ...(current || {}),
        blocks: nextBlocks,
      };
    });
  }

  function addBlockArrayItem(index: number, key: string, item: AnyRecord) {
    const currentBlock = blocks[index] || {};
    updateBlock(index, { [key]: [...objectArray(currentBlock[key]), item] });
  }

  function updateBlockArrayItem(index: number, key: string, itemIndex: number, patch: AnyRecord) {
    const currentBlock = blocks[index] || {};
    updateBlock(index, {
      [key]: objectArray(currentBlock[key]).map((item, currentIndex) =>
        currentIndex === itemIndex ? { ...item, ...patch } : item
      ),
    });
  }

  function removeBlockArrayItem(index: number, key: string, itemIndex: number) {
    const currentBlock = blocks[index] || {};
    updateBlock(index, {
      [key]: objectArray(currentBlock[key]).filter((_, currentIndex) => currentIndex !== itemIndex),
    });
  }

  function addBlock() {
    setDraft((current) => {
      const nextBlocks = [...(Array.isArray(current?.blocks) ? current!.blocks : [])];
      nextBlocks.push(makeNewBlock(nextBlocks.length));
      return {
        ...(current || {}),
        blocks: nextBlocks,
      };
    });
  }

  function duplicateBlock(index: number) {
    setDraft((current) => {
      const nextBlocks = [...(Array.isArray(current?.blocks) ? current!.blocks : [])];
      const copy = normalizeBlock(
        {
          ...nextBlocks[index],
          id: `${clean(nextBlocks[index]?.id) || "block"}-copy-${Date.now()}`,
          name: `${clean(nextBlocks[index]?.name) || "Schedule Block"} Copy`,
        },
        nextBlocks.length
      );
      nextBlocks.splice(index + 1, 0, copy);
      return {
        ...(current || {}),
        blocks: nextBlocks,
      };
    });
  }

  function deleteBlock(index: number) {
    setDraft((current) => {
      const nextBlocks = [...(Array.isArray(current?.blocks) ? current!.blocks : [])];
      nextBlocks.splice(index, 1);
      return {
        ...(current || {}),
        blocks: nextBlocks,
      };
    });
  }

  async function saveSchedule() {
    if (!draft) return;

    setSaving(true);
    setStatus("Saving schedule...");
    try {
      const cleanSchedule = {
        ...draft,
        enabled: Boolean(draft.enabled),
        timezone: clean(draft.timezone) || "America/Jamaica",
        fallbackMinPlayable: Number(draft.fallbackMinPlayable || 25),
        defaultFallbackLanes: splitLanes(draft.defaultFallbackLanes),
        blocks: blocks.map((block: AnyRecord, index: number) => normalizeBlock(block, index)),
      };

      const res = await fetch("/api/radio/smartzj-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ schedule: cleanSchedule }),
      });

      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "Schedule save failed.");
      }

      setResponse(data);
      setDraft(data.schedule);
      setStatus("Schedule saved. SmartZJ will obey the updated blocks.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Schedule save failed.");
    } finally {
      setSaving(false);
    }
  }


  async function updateSingleBlock(index: number) {
    if (!draft) return;

    const normalizedBlocks = blocks.map((block: AnyRecord, blockIndex: number) =>
      normalizeBlock(block, blockIndex)
    );

    const block = normalizedBlocks[index];
    if (!block) {
      setStatus("Block not found.");
      return;
    }

    const blockName = clean(block.name) || `Schedule Block ${index + 1}`;

    setSaving(true);
    setStatus(`Updating ${blockName}...`);

    try {
      const cleanSchedule = {
        ...draft,
        enabled: Boolean(draft.enabled),
        timezone: clean(draft.timezone) || "America/Jamaica",
        fallbackMinPlayable: Number(draft.fallbackMinPlayable || 25),
        defaultFallbackLanes: splitLanes(draft.defaultFallbackLanes),
        blocks: normalizedBlocks,
      };

      const res = await fetch("/api/radio/smartzj-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ schedule: cleanSchedule }),
      });

      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "Block update failed.");
      }

      const savedSchedule = data?.schedule || cleanSchedule;

      setResponse(data);
      setDraft({
        ...savedSchedule,
        blocks: Array.isArray(savedSchedule.blocks)
          ? savedSchedule.blocks.map((savedBlock: AnyRecord, savedIndex: number) =>
              normalizeBlock(savedBlock, savedIndex)
            )
          : normalizedBlocks,
      });

      setOpenBlockIndex(null);
      setStatus(`${blockName} updated and closed.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Block update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshScheduleAndKickBroadcast() {
    setSaving(true);
    setStatus("Refreshing schedule and checking active block...");

    try {
      await loadSchedule();

      await fetch(`/api/listener/smartzj-ended-resync?lane=schedule&scheduleRefresh=1&controlPanelBrain=1&t=${Date.now()}`, {
        method: "POST",
        cache: "no-store",
      }).catch(() => null);

      await loadSchedule();

      setStatus("Schedule refreshed. Active block sent to broadcast brain.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Schedule refresh failed.");
    } finally {
      setSaving(false);
    }
  }
  async function resetSchedule() {
    if (!window.confirm("Reset SmartZJ schedule to defaults?")) return;

    setSaving(true);
    setStatus("Resetting schedule...");
    try {
      const res = await fetch("/api/radio/smartzj-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ reset: true }),
      });

      const data = await res.json();
      setResponse(data);
      setDraft(data.schedule);
      setStatus("Schedule reset to defaults.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Schedule reset failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !draft) {
    return <main style={pageStyle}>Loading SmartZJ schedule editor...</main>;
  }

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <p style={eyebrowStyle}>Tha Core Radio</p>
        <h1 style={titleStyle}>SmartZJ Schedule Editor</h1>
        <p style={mutedStyle}>
          Edit schedule blocks, lanes, times, and fallbacks. Raw Azura remains blocked; only clean/bleeped READY tracks can play.
        </p>
        <p style={statusStyle}>{status}</p>
        <div style={buttonRowStyle}>
          <button style={buttonStyle} onClick={() => void refreshScheduleAndKickBroadcast()} disabled={saving}>
            Refresh
          </button>
          <button style={dangerButtonStyle} onClick={resetSchedule} disabled={saving}>
            Reset Defaults
          </button>
        </div>
      </section>
      <section style={gridStyle}>
        <div style={cardStyle}>
          <h2 style={headingStyle}>Active Block</h2>
          <p style={bigStyle}>{clean(activeBlock.name) || "No active block"}</p>
          <p>ID: {clean(activeBlock.id) || "N/A"}</p>
          <p>Time: {clean(activeBlock.start) || "N/A"} - {clean(activeBlock.end) || "N/A"}</p>
          <p>Selected Lane: {clean(response?.selectedLane) || "Auto"}</p>
          <p>Reason: {clean(response?.selectionReason) || "N/A"}</p>
        </div>

        <div style={cardStyle}>
          <h2 style={headingStyle}>Global Settings</h2>
          <label style={labelStyle}>
            <span>Enabled</span>
            <select
              style={inputStyle}
              value={draft?.enabled ? "true" : "false"}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => updateDraft("enabled", event.target.value === "true")}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </label>

          <label style={labelStyle}>
            <span>Timezone</span>
            <input
              style={inputStyle}
              value={clean(draft?.timezone || "America/Jamaica")}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateDraft("timezone", event.target.value)}
            />
          </label>

          <label style={labelStyle}>
            <span>Default fallback lanes</span>
            <input
              style={inputStyle}
              value={joinLanes(draft?.defaultFallbackLanes)}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateDraft("defaultFallbackLanes", splitLanes(event.target.value))}
            />
          </label>
        </div>
        <div style={cardStyle}>
          <h2 style={headingStyle}>Music Library</h2>
          <p style={bigStyle}>{Number(response?.musicLibrary?.trackCount || 0).toLocaleString()} tracks loaded</p>
          <p style={{ margin: "0 0 6px", color: "#ccc" }}>Reggae: {Number(response?.laneCounts?.Reggae || 0).toLocaleString()}</p>
          <p style={{ margin: "0 0 6px", color: "#ccc" }}>Fresh Dancehall: {Number(response?.laneCounts?.["Fresh-Dancehall"] || 0).toLocaleString()}</p>
          <p style={{ margin: "0 0 6px", color: "#ccc" }}>Old School Dancehall: {Number(response?.laneCounts?.["Ole-School-Dancehall"] || 0).toLocaleString()}</p>
          <p style={{ margin: 0, color: "#aaa", fontSize: "13px" }}>Folders are selected inside each block.</p>
          {/* THA_CORE_REMOVE_RAW_LANE_COUNTS_BOX_V2 */}
        </div>
      </section>

      <section style={editorHeaderStyle}>
        <h2 style={headingStyle}>Schedule Blocks</h2>
        <button style={primaryButtonStyle} onClick={addBlock}>
          Add Block
        </button>
      </section>

      <section style={blockGridStyle}>
        {blocks.map((block: AnyRecord, index: number) => (
          <article
            key={`${block.id}-${index}`}
            style={{
              ...blockCardStyle,
              borderColor: blockAccent(index),
              boxShadow: `0 0 0 1px ${blockAccent(index)}44, 0 18px 40px rgba(0,0,0,0.28)`,
            }}
          >
            <div style={blockTopStyle}>
              <strong style={{ color: blockAccent(index) }}>#{index + 1}</strong>
              <div style={smallButtonRowStyle}>
                {openBlockIndex === index ? (
                  <>
                    <button style={smallButtonStyle} onClick={() => void updateSingleBlock(index)} disabled={saving}>Update Block</button>
                    <button style={smallButtonStyle} onClick={() => { setOpenBlockIndex(null); void loadSchedule(); }}>Close</button>
                  </>
                ) : (
                  <button style={smallButtonStyle} onClick={() => setOpenBlockIndex(index)}>Edit Block</button>
                )}
                <button style={smallButtonStyle} onClick={() => duplicateBlock(index)}>Duplicate</button>
                <button style={smallDangerStyle} onClick={() => deleteBlock(index)}>Delete</button>
              </div>
            </div>

            {/* SMARTZJ_ONE_BLOCK_EDITOR_UI_V1 */}
            {openBlockIndex !== index ? (
              <div style={{ marginTop: "14px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px", padding: "14px", background: "#101010" }}>
                <p style={{ margin: "0 0 8px", fontWeight: 900 }}>{clean(block.name) || `Schedule Block ${index + 1}`}</p>
                <p style={{ margin: "0 0 6px", color: "#ccc" }}>Time: {clean(block.start)} - {clean(block.end)}</p>
                <p style={{ margin: "0 0 6px", color: "#ccc" }}>Lane: {clean(block.primaryLane)}</p>
                <p style={{ margin: "0 0 6px", color: "#ccc" }}>Tracks: {blockTrackCount(block)}</p>
                <p style={{ margin: "0 0 6px", color: "#ccc" }}>Duration: {scheduleBlockDurationLabelV1(block)}</p>
                <p style={{ margin: "0 0 6px", color: "#ccc" }}>Playback: {clean(block.playbackOrder || "shuffled")}</p>
                <p style={{ margin: "0 0 6px", color: "#ccc" }}>Priority: {Number(block.priority || 5)}</p>
                <p style={{ margin: 0, color: "#ccc" }}>Days: {joinLanes(block.days)}</p>
              </div>
            ) : (
              <>

            <label style={labelStyle}>
              <span>Name</span>
              <input
                style={inputStyle}
                value={clean(block.name)}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { name: event.target.value })}
              />
            </label>

            <label style={labelStyle}>
              <span>ID</span>
              <input
                style={inputStyle}
                value={clean(block.id)}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { id: event.target.value })}
              />
            </label>
            <div style={twoColStyle}>
              <label style={labelStyle}>
                <span>Start Date</span>
                <input
                  style={inputStyle}
                  type="date"
                  value={clean(block.startDate)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { startDate: event.target.value })}
                />
              </label>

              <label style={labelStyle}>
                <span>End Date</span>
                <input
                  style={inputStyle}
                  type="date"
                  value={clean(block.endDate)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { endDate: event.target.value })}
                />
              </label>
            </div>

            <div style={twoColStyle}>
              <label style={labelStyle}>
                <span>Priority Level</span>
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  max="100"
                  value={Number(block.priority || 5)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { priority: Number(event.target.value || 5) })}
                />
              </label>

              <label style={labelStyle}>
                <span>No Same Artist Last X Plays</span>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  max="100"
                  value={Number(block.noRepeatArtistCount || 5)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { noRepeatArtistCount: Number(event.target.value || 0) })}
                />
              </label>
            </div>

            <label style={labelStyle}>
              <span>No Same Song/Title Last X Plays</span>
              <input
                style={inputStyle}
                type="number"
                min="0"
                max="200"
                value={Number(block.noRepeatTitleCount || 10)}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { noRepeatTitleCount: Number(event.target.value || 0) })}
              />
            </label>


            <div style={twoColStyle}>
              <label style={labelStyle}>
                <span>Start</span>
                <input
                  style={inputStyle}
                  type="time"
                  value={clean(block.start)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { start: event.target.value })}
                />
              </label>

              <label style={labelStyle}>
                <span>End</span>
                <input
                  style={inputStyle}
                  type="time"
                  value={clean(block.end)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { end: event.target.value })}
                />
              </label>
            </div>

            <label style={labelStyle}>
              <span>Song Playback Order</span>
              <select
                style={inputStyle}
                value={clean(block.playbackOrder || "shuffled")}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => updateBlock(index, { playbackOrder: event.target.value })}
              >
                <option value="shuffled">Shuffled</option>
                <option value="random">Random</option>
                <option value="sequential">Sequential</option>
              </select>
            </label>

            <label style={labelStyle}>
              <span>Primary lane / music folder</span>
              <select
                style={inputStyle}
                value={clean(block.primaryLane)}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => updateBlock(index, { primaryLane: event.target.value })}
              >
                {LANES.map((lane) => (
                  <option key={lane} value={lane}>{lane}</option>
                ))}
                {folderOptionsFromTree().length > 0 ? (
                  <option disabled value="">──────── Music folders ────────</option>
                ) : null}
                {folderOptionsFromTree().map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <small style={{ color: "#aaa" }}>
                Pick a lane or exact folder/subfolder. Example: Reggae / 1981 / Riddim.
              </small>
            </label>

            <label style={labelStyle}>
              <span>Fallback lanes</span>
              <input
                style={inputStyle}
                value={joinLanes(block.fallbackLanes)}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { fallbackLanes: splitLanes(event.target.value) })}
              />
            </label>

            <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: "12px", padding: "12px", background: "#0d0d0d", display: "grid", gap: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <input
                  type="checkbox"
                  checked={Boolean(block.interruptBroadcast)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { interruptBroadcast: event.target.checked })}
                  style={{ width: "16px", height: "16px" }}
                />
                <span>Interrupt Other Broadcast To Play</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <input
                  type="checkbox"
                  checked={Boolean(block.prioritizeOverRequests)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { prioritizeOverRequests: event.target.checked })}
                  style={{ width: "16px", height: "16px" }}
                />
                <span>Prioritize Over Listener Requests</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <input
                  type="checkbox"
                  checked={Boolean(block.playJinglesBetweenTracks)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { playJinglesBetweenTracks: event.target.checked })}
                  style={{ width: "16px", height: "16px" }}
                />
                <span>Play Jingles Between Tracks</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <input
                  type="checkbox"
                  checked={Boolean(block.allowJingleOverlay)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { allowJingleOverlay: event.target.checked })}
                  style={{ width: "16px", height: "16px" }}
                />
                <span>Allow Jingle Overlay</span>
              </label>

              {/* SCHEDULE_BLOCK_JINGLE_FREQUENCY_OPTIONS_V1 */}
              <div style={{ border: "1px solid rgba(255,223,46,0.35)", borderRadius: "14px", padding: "12px", background: "rgba(255,223,46,0.06)" }}>
                <p style={{ margin: "0 0 8px", fontWeight: 900, color: "#ffdf2e" }}>Jingle Frequency</p>
                <div style={smallButtonRowStyle}>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={() => updateBlock(index, { playJinglesBetweenTracks: false, songsBetweenJingles: 0 })}
                  >
                    OFF
                  </button>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={() => updateBlock(index, { playJinglesBetweenTracks: true, songsBetweenJingles: 3 })}
                  >
                    Every 3 Songs
                  </button>
                  <button
                    type="button"
                    style={smallButtonStyle}
                    onClick={() => updateBlock(index, { playJinglesBetweenTracks: true, songsBetweenJingles: 5 })}
                  >
                    Every 5 Songs
                  </button>
                </div>
                <p style={{ margin: "8px 0 0", color: "#ccc", fontSize: "13px" }}>
                  Current: {Boolean(block.playJinglesBetweenTracks) ? `Every ${Number(block.songsBetweenJingles || 3)} song(s)` : "OFF"}
                </p>
              </div>
            </div>


            {/* THA_CORE_SCHEDULE_EDITOR_INSERT_UI_RESTORE_V1 */}
            <div style={{ border: "1px solid rgba(0,199,190,0.35)", borderRadius: "14px", padding: "12px", background: "rgba(0,199,190,0.06)", display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 900, color: "#00c7be" }}>News / Nia Inserts</p>
                  <small style={{ color: "#bbb" }}>Protected news slots inside this music block.</small>
                </div>
                <button type="button" style={smallButtonStyle} onClick={() => addBlockArrayItem(index, "newsInserts", normalizeNewsInsert({}, objectArray(block.newsInserts).length))}>Add News / Nia</button>
              </div>

              {objectArray(block.newsInserts).length === 0 ? <p style={{ margin: 0, color: "#aaa", fontSize: "13px" }}>No news inserts added.</p> : null}

              {objectArray(block.newsInserts).map((insert: AnyRecord, insertIndex: number) => (
                <div key={String(insert.id || insertIndex)} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "10px", background: "#101010", display: "grid", gap: "10px" }}>
                  <div style={smallButtonRowStyle}>
                    <strong style={{ color: "#00c7be" }}>News #{insertIndex + 1}</strong>
                    <button type="button" style={smallDangerStyle} onClick={() => removeBlockArrayItem(index, "newsInserts", insertIndex)}>Remove</button>
                  </div>
                  <label style={labelStyle}><span>Title</span><input style={inputStyle} value={clean(insert.title)} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "newsInserts", insertIndex, { title: event.target.value })} /></label>
                  <div style={twoColStyle}>
                    <label style={labelStyle}><span>Start Time</span><input style={inputStyle} type="time" value={clean(insert.start)} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "newsInserts", insertIndex, { start: event.target.value })} /></label>
                    <label style={labelStyle}><span>Duration Minutes</span><input style={inputStyle} type="number" min="1" max="30" value={Number(insert.durationMinutes || 10)} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "newsInserts", insertIndex, { durationMinutes: Number(event.target.value || 10) })} /></label>
                  </div>
                  <div style={twoColStyle}>
                    <label style={labelStyle}><span>Days</span><input style={inputStyle} value={joinLanes(insert.days)} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "newsInserts", insertIndex, { days: splitLanes(event.target.value) })} /></label>
                    <label style={labelStyle}><span>Behavior</span><select style={inputStyle} value={clean(insert.behavior || "hard-break")} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateBlockArrayItem(index, "newsInserts", insertIndex, { behavior: event.target.value })}><option value="hard-break">Hard Break</option><option value="break-safe">Break Safe</option><option value="defer">Defer</option><option value="skip">Skip</option></select></label>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}><input type="checkbox" checked={insert.enabled !== false} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "newsInserts", insertIndex, { enabled: event.target.checked })} style={{ width: "16px", height: "16px" }} /><span>Enabled</span></label>
                </div>
              ))}

              <div style={{ height: "1px", background: "rgba(255,255,255,0.12)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 900, color: "#ffdf2e" }}>Program Inserts</p>
                  <small style={{ color: "#bbb" }}>Shows/programs inside this music block.</small>
                </div>
                <button type="button" style={smallButtonStyle} onClick={() => addBlockArrayItem(index, "programInserts", normalizeProgramInsert({}, objectArray(block.programInserts).length))}>Add Program</button>
              </div>

              {objectArray(block.programInserts).length === 0 ? <p style={{ margin: 0, color: "#aaa", fontSize: "13px" }}>No program inserts added.</p> : null}

              {objectArray(block.programInserts).map((insert: AnyRecord, insertIndex: number) => (
                <div key={String(insert.id || insertIndex)} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "10px", background: "#101010", display: "grid", gap: "10px" }}>
                  <div style={smallButtonRowStyle}>
                    <strong style={{ color: "#ffdf2e" }}>Program #{insertIndex + 1}</strong>
                    <button type="button" style={smallDangerStyle} onClick={() => removeBlockArrayItem(index, "programInserts", insertIndex)}>Remove</button>
                  </div>
                  <label style={labelStyle}><span>Title</span><input style={inputStyle} value={clean(insert.title)} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "programInserts", insertIndex, { title: event.target.value })} /></label>
                  <div style={twoColStyle}>
                    <label style={labelStyle}><span>Start Time</span><input style={inputStyle} type="time" value={clean(insert.start)} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "programInserts", insertIndex, { start: event.target.value })} /></label>
                    <label style={labelStyle}><span>Duration Minutes</span><input style={inputStyle} type="number" min="1" max="180" value={Number(insert.durationMinutes || 30)} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "programInserts", insertIndex, { durationMinutes: Number(event.target.value || 30) })} /></label>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}><input type="checkbox" checked={insert.enabled !== false} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "programInserts", insertIndex, { enabled: event.target.checked })} style={{ width: "16px", height: "16px" }} /><span>Enabled</span></label>
                </div>
              ))}

              <div style={{ height: "1px", background: "rgba(255,255,255,0.12)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 900, color: "#ff9500" }}>Jingle Rules</p>
                  <small style={{ color: "#bbb" }}>Specific saved jingle rules inside this block.</small>
                </div>
                <button type="button" style={smallButtonStyle} onClick={() => addBlockArrayItem(index, "jingleRules", normalizeJingleRule({}, objectArray(block.jingleRules).length))}>Add Jingle Rule</button>
              </div>

              {objectArray(block.jingleRules).length === 0 ? <p style={{ margin: 0, color: "#aaa", fontSize: "13px" }}>No jingle rules added.</p> : null}

              {objectArray(block.jingleRules).map((rule: AnyRecord, ruleIndex: number) => (
                <div key={String(rule.id || ruleIndex)} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "10px", background: "#101010", display: "grid", gap: "10px" }}>
                  <div style={smallButtonRowStyle}>
                    <strong style={{ color: "#ff9500" }}>Jingle Rule #{ruleIndex + 1}</strong>
                    <button type="button" style={smallDangerStyle} onClick={() => removeBlockArrayItem(index, "jingleRules", ruleIndex)}>Remove</button>
                  </div>
                  <div style={twoColStyle}>
                    <label style={labelStyle}><span>Title</span><input style={inputStyle} value={clean(rule.title)} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "jingleRules", ruleIndex, { title: event.target.value })} /></label>
                    <label style={labelStyle}><span>Every X Songs</span><input style={inputStyle} type="number" min="1" max="20" value={Number(rule.songsBetween || 3)} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "jingleRules", ruleIndex, { songsBetween: Number(event.target.value || 3) })} /></label>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}><input type="checkbox" checked={rule.enabled !== false} onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlockArrayItem(index, "jingleRules", ruleIndex, { enabled: event.target.checked })} style={{ width: "16px", height: "16px" }} /><span>Enabled</span></label>
                </div>
              ))}
            </div>


            <label style={labelStyle}>
              <span>Days</span>
              <input
                style={inputStyle}
                value={joinLanes(block.days)}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { days: splitLanes(event.target.value) })}
              />
            </label>
              </>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#080808",
  color: "#f8f8f8",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
};

const heroStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "22px",
  padding: "28px",
  background: "linear-gradient(135deg, rgba(120,0,0,0.35), rgba(0,0,0,0.85))",
  marginBottom: "22px",
};

const eyebrowStyle = { color: "#ffcc66", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" as const };
const titleStyle = { fontSize: "42px", margin: "8px 0" };
const mutedStyle = { color: "#cfcfcf", maxWidth: "920px" };
const statusStyle = { color: "#ffdd88", fontWeight: 900 };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px", marginBottom: "22px" };
const cardStyle = { border: "1px solid rgba(255,255,255,0.12)", borderRadius: "18px", padding: "18px", background: "rgba(255,255,255,0.055)" };
const headingStyle = { margin: "0 0 12px", color: "#ffdddd" };
const bigStyle = { fontSize: "24px", fontWeight: 900, margin: "8px 0" };
const preStyle = { whiteSpace: "pre-wrap" as const, color: "#d8ffd8", fontSize: "13px" };
const buttonRowStyle = { display: "flex", gap: "10px", flexWrap: "wrap" as const, marginTop: "18px" };
const buttonStyle = { border: 0, borderRadius: "12px", padding: "12px 16px", background: "#2b2b2b", color: "#fff", fontWeight: 900, cursor: "pointer" };
const navButtonStyle = { ...buttonStyle, display: "inline-flex", alignItems: "center", textDecoration: "none", background: "#171717" };
const primaryButtonStyle = { ...buttonStyle, background: "#b80000" };
const dangerButtonStyle = { ...buttonStyle, background: "#5c1111" };
const editorHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "30px 0 14px", gap: "14px" };
const blockGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "16px" };
const blockCardStyle = { ...cardStyle, background: "rgba(25,25,25,0.95)" };
const blockTopStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" };
const labelStyle = { display: "grid", gap: "6px", marginBottom: "12px", color: "#f3cfcf", fontWeight: 900 };
const inputStyle = { width: "100%", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "12px", padding: "12px", background: "#111", color: "#fff" };
const twoColStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" };
const smallButtonRowStyle = { display: "flex", gap: "8px" };
const smallButtonStyle = { ...buttonStyle, padding: "8px 10px", fontSize: "12px" };
const smallDangerStyle = { ...smallButtonStyle, background: "#5c1111" };
