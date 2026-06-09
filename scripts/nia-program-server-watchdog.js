const fs = require("fs");
const path = require("path");

const APP = process.cwd();
const PORT = process.env.PORT || "3101";
const BASE = `http://127.0.0.1:${PORT}`;
const STATE_FILE = path.join(APP, ".data", "ai-host-program-broadcast-state.json");
const LOG_FILE = path.join(APP, ".data", "nia-program-server-watchdog.log");

const MARKER = "NIA_PROGRAM_SERVER_WATCHDOG_V1";

function log(line) {
  const text = `${new Date().toISOString()} ${line}\n`;
  fs.appendFileSync(LOG_FILE, text);
  console.log(text.trim());
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

async function postNext(state) {
  const programId = String(state.programId || "");
  if (!programId) return;

  const res = await fetch(`${BASE}/api/radio/ai-host-program-broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "next",
      programId,
      broadcast: true,
      force: true,
      reason: MARKER,
    }),
  });

  const data = await res.json().catch(() => ({}));
  log(`${MARKER} ADVANCE programId=${programId} part=${state.currentPartNumber}/${state.totalParts} ok=${res.ok} action=${data.action || ""}`);
}

async function tick() {
  const state = readJson(STATE_FILE);

  if (!state || state.active !== true) return;

  const expectedEndAtMs = Date.parse(String(state.expectedEndAt || ""));
  if (!Number.isFinite(expectedEndAtMs)) return;

  const now = Date.now();
  const overdueMs = now - expectedEndAtMs;

  if (overdueMs >= 5000) {
    await postNext(state);
  }
}

async function main() {
  log(`${MARKER} STARTED`);
  setInterval(() => {
    tick().catch((err) => log(`${MARKER} ERROR ${err?.message || err}`));
  }, 10000);
  tick().catch((err) => log(`${MARKER} ERROR ${err?.message || err}`));
}

main();
