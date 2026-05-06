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
  const recentArtists = new Set(
    history.slice(0, 3).map((item) => String(item.artist || "").toLowerCase())
  );

  const safeChoices = tracks.filter((track) => {
    const sameSong = recentIds.has(track.id);
    const sameArtist = recentArtists.has(String(track.artist || "").toLowerCase());

    return !sameSong && !sameArtist;
  });

  const fallbackChoices = tracks.filter((track) => !recentIds.has(track.id));

  const pool =
    safeChoices.length > 0
      ? safeChoices
      : fallbackChoices.length > 0
        ? fallbackChoices
        : tracks;

  const selected = pool[Math.floor(Math.random() * pool.length)];

  return {
    ok: true,
    message: "SmartDJ picked a next track while avoiding recent songs and recent artists.",
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


app.post("/command", (req, res) => {
  const text = String(req.body?.text || "").toLowerCase().trim();
  const tracks = getTracks();
  const history = readHistory();

  if (!text) {
    return res.status(400).json({
      ok: false,
      error: "Missing SmartDJ command text."
    });
  }

  const words = text
    .replace(/mother's/g, "mothers")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["find", "play", "song", "track", "music", "a", "the", "me", "for"].includes(word));

  const recentIds = new Set(history.slice(0, 3).map((item) => item.id));

  const ranked = tracks
    .map((track) => {
      const haystack = `${track.artist} ${track.title} ${track.filename} ${track.text}`.toLowerCase();

      let score = 0;

      for (const word of words) {
        if (haystack.includes(word)) score += 25;
      }

      if (recentIds.has(track.id)) score -= 40;

      return {
        ...track,
        smartDjCommandScore: score
      };
    })
    .filter((track) => track.smartDjCommandScore > 0)
    .sort((a, b) => b.smartDjCommandScore - a.smartDjCommandScore);

  if (ranked.length === 0) {
    return res.json({
      ok: false,
      command: text,
      message: "SmartDJ could not find a matching track yet.",
      help: "Add a matching MP3 to smartdj-engine/music. Example filename: Artist - Mothers Day Song.mp3",
      searchedWords: words
    });
  }

  const selected = ranked[0];

  const newHistory = [
    {
      ...selected,
      requestedByCommand: text,
      playedAt: new Date().toISOString()
    },
    ...history
  ].slice(0, 50);

  writeHistory(newHistory);

  res.json({
    ok: true,
    command: text,
    message: `SmartDJ found and selected: ${selected.text}`,
    selected,
    alternatives: ranked.slice(1, 5),
    history: newHistory.slice(0, 10)
  });
});


app.post("/ask", (req, res) => {
  const question = String(req.body?.question || "").trim();
  const lower = question.toLowerCase();
  const tracks = getTracks();
  const history = readHistory();

  if (!question) {
    return res.status(400).json({
      ok: false,
      error: "Ask SmartDJ a music question."
    });
  }

  if (lower.includes("history") || lower.includes("played before") || lower.includes("last played")) {
    return res.json({
      ok: true,
      question,
      answer: history.length
        ? `The last track SmartDJ selected was: ${history[0].text || history[0].filename}.`
        : "SmartDJ has no play history yet.",
      history: history.slice(0, 5)
    });
  }

  if (lower.includes("how many") || lower.includes("songs") || lower.includes("tracks")) {
    return res.json({
      ok: true,
      question,
      answer: `SmartDJ can currently see ${tracks.length} test tracks in the music folder.`,
      tracks: tracks.slice(0, 10)
    });
  }

  const matchedTracks = tracks.filter((track) => {
    const haystack = `${track.artist} ${track.title} ${track.filename} ${track.text}`.toLowerCase();
    return lower
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .some((word) => haystack.includes(word));
  });

  if (matchedTracks.length > 0) {
    return res.json({
      ok: true,
      question,
      answer: `I found ${matchedTracks.length} matching track(s). Best match: ${matchedTracks[0].text}.`,
      matches: matchedTracks.slice(0, 10)
    });
  }

  return res.json({
    ok: true,
    question,
    answer:
      "SmartDJ Ask Mode is active. Right now I can answer from your local music folder and play history. Next we connect deeper music knowledge so I can answer artist, genre, riddim, and music culture questions.",
    next:
      "Ask things like: how many songs do I have, what played last, find mothers day, find bounty killer, or what tracks are in the folder."
  });
});

app.post("/build-playlist", (req, res) => {
  const text = String(req.body?.text || "build smartdj playlist").toLowerCase().trim();
  const tracks = getTracks();

  if (tracks.length === 0) {
    return res.json({
      ok: false,
      message: "SmartDJ could not build a playlist because no tracks were found."
    });
  }

  const stopWords = new Set(["build", "make", "compile", "playlist", "set", "songs", "tracks", "music", "a", "the", "me", "for", "and"]);
  const words = text
    .replace(/mother's/g, "mothers")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !stopWords.has(word));

  const ranked = tracks
    .map((track) => {
      const haystack = `${track.artist} ${track.title} ${track.filename} ${track.text}`.toLowerCase();

      let score = 0;

      for (const word of words) {
        if (haystack.includes(word)) score += 25;
      }

      return {
        ...track,
        smartDjPlaylistScore: score
      };
    })
    .sort((a, b) => b.smartDjPlaylistScore - a.smartDjPlaylistScore);

  const matching = ranked.filter((track) => track.smartDjPlaylistScore > 0);
  const selectedTracks = (matching.length > 0 ? matching : ranked).slice(0, 12);

  const playlistSlug = text
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "smartdj-playlist";

  const playlist = {
    ok: true,
    name: text,
    slug: playlistSlug,
    createdAt: new Date().toISOString(),
    searchedWords: words,
    count: selectedTracks.length,
    tracks: selectedTracks
  };

  const playlistFolder = path.join(ROOT, "data", "playlists");
  fs.mkdirSync(playlistFolder, { recursive: true });

  const playlistFile = path.join(playlistFolder, `${playlistSlug}.json`);
  fs.writeFileSync(playlistFile, JSON.stringify(playlist, null, 2), "utf8");

  return res.json({
    ok: true,
    message: `SmartDJ built playlist: ${text}`,
    playlistFile,
    playlist
  });
});
app.listen(PORT, () => {
  console.log(`Tha Core SmartDJ Engine running on http://localhost:${PORT}`);
});







