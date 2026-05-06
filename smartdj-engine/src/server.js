const dotenv = require("dotenv");
const express = require("express");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
const PORT = Number(process.env.SMARTDJ_PORT || 5050);

app.use(express.json({ limit: "2mb" }));

const ROOT = path.resolve(__dirname, "..");
const MUSIC_FOLDER = path.join(ROOT, "music");
const DATA_FOLDER = path.join(ROOT, "data");
const HISTORY_FILE = path.join(DATA_FOLDER, "play-history.json");
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"];

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function walkFiles(folder) {
  if (!fs.existsSync(folder)) return [];

  const files = [];

  for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
    const fullPath = path.join(folder, item.name);

    if (item.isDirectory()) {
      files.push(...walkFiles(fullPath));
    }

    if (item.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseTrack(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath, ext);
  const relativePath = path.relative(MUSIC_FOLDER, filePath);

  let artist = "Unknown Artist";
  let title = filename;

  if (filename.includes(" - ")) {
    const parts = filename.split(" - ");
    artist = parts[0].trim() || "Unknown Artist";
    title = parts.slice(1).join(" - ").trim() || filename;
  }

  return {
    id: slugify(`${artist}-${title}-${relativePath}`),
    artist,
    title,
    text: `${artist} - ${title}`,
    filename: path.basename(filePath),
    relativePath,
    fullPath: filePath,
    ext,
    scannedAt: new Date().toISOString()
  };
}

function getTracks() {
  return walkFiles(MUSIC_FOLDER)
    .filter((file) => AUDIO_EXTENSIONS.includes(path.extname(file).toLowerCase()))
    .map(parseTrack);
}

function readHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeHistory(history) {
  fs.mkdirSync(DATA_FOLDER, { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf8");
}

function pickNextTrack() {
  const tracks = getTracks();
  const history = readHistory();

  if (tracks.length === 0) {
    return {
      ok: false,
      error: "No tracks found in smartdj-engine/music."
    };
  }

  const recentIds = new Set(history.slice(0, 3).map((item) => item.id));
  const choices = tracks.filter((track) => !recentIds.has(track.id));
  const pool = choices.length > 0 ? choices : tracks;
  const blockedIds = new Set(history.slice(0, 3).map((item) => item.id));
  const safePool = pool.filter((track) => !blockedIds.has(track.id));
  const finalPool = safePool.length > 0 ? safePool : pool;
  const selected = finalPool[Math.floor(Math.random() * finalPool.length)];

  return {
    ok: true,
    message: "SmartDJ picked a next track.",
    selected,
    recentHistory: history.slice(0, 5)
  };
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "Tha Core SmartDJ Engine",
    status: "running",
    port: PORT,
    musicFolder: MUSIC_FOLDER,
    time: new Date().toISOString()
  });
});

app.get("/tracks", (req, res) => {
  res.json({
    ok: true,
    count: getTracks().length,
    musicFolder: MUSIC_FOLDER,
    tracks: getTracks()
  });
});

app.get("/recommend-next", (req, res) => {
  res.json(pickNextTrack());
});

app.get("/history", (req, res) => {
  const history = readHistory();

  res.json({
    ok: true,
    count: history.length,
    history
  });
});

app.post("/select-next", (req, res) => {
  const result = pickNextTrack();

  if (!result.ok) {
    return res.status(400).json(result);
  }

  const history = readHistory();

  const newHistory = [
    {
      ...result.selected,
      playedAt: new Date().toISOString()
    },
    ...history
  ].slice(0, 50);

  writeHistory(newHistory);

  res.json({
    ok: true,
    message: "SmartDJ selected next track and saved it to history.",
    selected: result.selected,
    history: newHistory.slice(0, 10)
  });
});

app.listen(PORT, () => {
  console.log(`Tha Core SmartDJ Engine running on http://localhost:${PORT}`);
});

