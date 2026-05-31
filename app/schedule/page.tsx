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
  "ANY_READY_LANE",
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

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
    },
    index
  );
}

export default function SmartZjSchedulePage() {
  const [response, setResponse] = useState<AnyRecord | null>(null);
  const [draft, setDraft] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Loading SmartZJ schedule...");

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

  const activeBlock = response?.activeBlock || {};
  const blocks = useMemo(() => {
    return Array.isArray(draft?.blocks) ? draft?.blocks : [];
  }, [draft]);

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
          <button style={primaryButtonStyle} onClick={saveSchedule} disabled={saving}>
            {saving ? "Saving..." : "Save Schedule"}
          </button>
          <button style={buttonStyle} onClick={() => void loadSchedule()} disabled={saving}>
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
          <h2 style={headingStyle}>Lane Counts</h2>
          <pre style={preStyle}>{JSON.stringify(response?.laneCounts || {}, null, 2)}</pre>
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
          <article key={`${block.id}-${index}`} style={blockCardStyle}>
            <div style={blockTopStyle}>
              <strong>#{index + 1}</strong>
              <div style={smallButtonRowStyle}>
                <button style={smallButtonStyle} onClick={() => duplicateBlock(index)}>Duplicate</button>
                <button style={smallDangerStyle} onClick={() => deleteBlock(index)}>Delete</button>
              </div>
            </div>

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
              <span>Primary lane</span>
              <select
                style={inputStyle}
                value={clean(block.primaryLane)}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => updateBlock(index, { primaryLane: event.target.value })}
              >
                {LANES.map((lane) => (
                  <option key={lane} value={lane}>{lane}</option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              <span>Fallback lanes</span>
              <input
                style={inputStyle}
                value={joinLanes(block.fallbackLanes)}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { fallbackLanes: splitLanes(event.target.value) })}
              />
            </label>

            <label style={labelStyle}>
              <span>Days</span>
              <input
                style={inputStyle}
                value={joinLanes(block.days)}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateBlock(index, { days: splitLanes(event.target.value) })}
              />
            </label>
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