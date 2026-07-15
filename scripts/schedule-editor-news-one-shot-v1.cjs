#!/usr/bin/env node
// SCHEDULE_EDITOR_NEWS_ONE_SHOT_RUNNER_V1
// Clean Schedule Editor news watcher.
// Does NOT restore legacy repeating 14-part news.
// Does NOT touch homepage/listener/player/duration lock.
// Only calls the existing clock-insert tick endpoint once inside a due news insert window.

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, ".data");
const STATE_FILE = path.join(DATA_DIR, "schedule-editor-news-one-shot-state-v1.json");

const BASE = String(process.env.THA_CORE_LOCAL_BASE || "http://127.0.0.1:3101").replace(/\/+$/, "");
const INTERVAL_MS = Number(process.env.NIA_NEWS_ONE_SHOT_INTERVAL_MS || 30000);
const GRACE_MINUTES = Number(process.env.NIA_NEWS_ONE_SHOT_GRACE_MINUTES || 8);

let inFlight = false;

function log(payload) {
  console.log(JSON.stringify({ at: new Date().toISOString(), ...payload }));
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { fired: {} };
  }
}

function writeState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function clean(value) {
  return String(value || "").trim();
}

function toMinutes(timeText) {
  const match = clean(timeText).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return -1;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
  if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

function jamaicaParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Jamaica",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = Number(obj.hour === "24" ? "0" : obj.hour);
  const minute = Number(obj.minute);
  const day = clean(obj.weekday).slice(0, 3).toLowerCase();
  const dateKey = `${obj.year}-${obj.month}-${obj.day}`;

  return { dateKey, day, minutes: hour * 60 + minute, clock: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

function dayAllowed(days, today) {
  if (!Array.isArray(days) || days.length === 0) return true;
  return days.map((d) => clean(d).slice(0, 3).toLowerCase()).includes(today);
}

async function getJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: { "Cache-Control": "no-store", ...(options.headers || {}) },
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, text, data };
}

function collectNewsInserts(schedule) {
  const block = schedule?.activeBlock || {};
  const inserts = Array.isArray(block.newsInserts) ? block.newsInserts : [];
  return inserts.map((insert, index) => ({ block, insert, index }));
}

async function tick() {
  if (inFlight) return;
  inFlight = true;

  try {
    const now = jamaicaParts();
    const scheduleRes = await getJson(`${BASE}/api/radio/smartzj-schedule?oneShotNewsRunner=${Date.now()}`);
    if (!scheduleRes.ok || !scheduleRes.data) {
      log({ action: "schedule-read-failed", status: scheduleRes.status, sample: scheduleRes.text.slice(0, 300) });
      return;
    }

    const dueItems = [];
    for (const item of collectNewsInserts(scheduleRes.data)) {
      const block = item.block || {};
      const insert = item.insert || {};
      if (insert.enabled === false) continue;

      const start = clean(insert.start || insert.startTime);
      const startMin = toMinutes(start);
      if (startMin < 0) continue;

      const days = insert.days || insert.selectedDays || block.days || block.selectedDays;
      if (!dayAllowed(days, now.day)) continue;

      const elapsed = now.minutes - startMin;
      if (elapsed < 0 || elapsed > GRACE_MINUTES) continue;

      const blockId = clean(block.id || block.name || "active-block").replace(/\s+/g, "-").toLowerCase();
      const insertId = clean(insert.id || insert.title || `news-${item.index}`).replace(/\s+/g, "-").toLowerCase();
      const fireKey = `${now.dateKey}:${blockId}:${insertId}:${start}`;

      dueItems.push({ fireKey, start, blockName: clean(block.name), insertTitle: clean(insert.title || "Nia News Insert") });
    }

    if (!dueItems.length) return;

    const state = readState();

    for (const due of dueItems) {
      if (state.fired[due.fireKey]) continue;

      state.fired[due.fireKey] = { at: new Date().toISOString(), status: "attempted", ...due };
      writeState(state);

      log({ action: "trigger-news-insert-once", fireKey: due.fireKey, block: due.blockName, title: due.insertTitle, jamaicaTime: now.clock });

      const tickUrl = `${BASE}/api/listener/music-block-clock-inserts-v2-tick?newsOnly=1&oneShotNewsRunner=1&fireKey=${encodeURIComponent(due.fireKey)}&t=${Date.now()}`;

      let tickRes = await getJson(tickUrl, { method: "POST" });
      if (tickRes.status === 404 || tickRes.status === 405) {
        tickRes = await getJson(tickUrl, { method: "GET" });
      }

      state.fired[due.fireKey] = {
        ...state.fired[due.fireKey],
        finishedAt: new Date().toISOString(),
        tickStatus: tickRes.status,
        tickOk: tickRes.ok,
        tickAction: tickRes.data?.action || tickRes.data?.status || "",
      };
      writeState(state);

      log({
        action: "news-insert-tick-result",
        fireKey: due.fireKey,
        tickStatus: tickRes.status,
        tickOk: tickRes.ok,
        tickAction: tickRes.data?.action || tickRes.data?.status || "",
        sample: tickRes.text.slice(0, 300),
      });
    }
  } catch (error) {
    log({ action: "one-shot-news-runner-error", error: error?.message || String(error) });
  } finally {
    inFlight = false;
  }
}

log({ action: "watch-start", marker: "SCHEDULE_EDITOR_NEWS_ONE_SHOT_RUNNER_V1", intervalMs: INTERVAL_MS, graceMinutes: GRACE_MINUTES });
tick();
setInterval(tick, INTERVAL_MS);