import fs from "fs";
import path from "path";
import { runRealBleepProcessor } from "@/lib/audio/real-bleep-processor";

type AnyRecord = Record<string, any>;

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, ".data");
const JOBS_FILE = path.join(DATA_DIR, "bleep-jobs.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const INPUT_DIR = path.join(DATA_DIR, "bleep-input");

const EXPLICIT_WORDS = [
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "pussy",
  "dick",
  "cock",
  "cocksucker",
  "motherfucker",
  "nigger",
  "nigga",
  "asshole",
  "slut",
  "whore",
];

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(INPUT_DIR, { recursive: true });
}

function safeJsonRead(filePath: string, fallback: any) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function safeJsonWrite(filePath: string, value: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function getJobListShape(data: any): { list: AnyRecord[]; save: (list: AnyRecord[]) => any } {
  if (Array.isArray(data)) {
    return { list: data, save: (list) => list };
  }

  if (Array.isArray(data?.jobs)) {
    return { list: data.jobs, save: (list) => ({ ...data, jobs: list }) };
  }

  if (Array.isArray(data?.items)) {
    return { list: data.items, save: (list) => ({ ...data, items: list }) };
  }

  return { list: [], save: (list) => ({ jobs: list }) };
}

function findJob(list: AnyRecord[], jobId: string) {
  return list.find((job) => {
    const ids = [
      job.id,
      job.jobId,
      job.bleepJobId,
      job.trackId,
      job.track?.id,
      job.track?.trackId,
    ].filter(Boolean);

    return ids.map(String).includes(String(jobId));
  });
}

function updateJob(list: AnyRecord[], job: AnyRecord, patch: AnyRecord) {
  const updatedJob = {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  return list.map((item) => (item === job ? updatedJob : item));
}

function normalizeWord(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isExplicitWord(word: string) {
  return EXPLICIT_WORDS.includes(normalizeWord(word));
}

function isLocalPublicAudio(value: string) {
  return value.startsWith("/audio/") || value.startsWith("audio/");
}

function publicUrlToFilePath(value: string) {
  const clean = value.startsWith("/") ? value.slice(1) : value;
  const resolved = path.resolve(PUBLIC_DIR, clean);

  if (!resolved.startsWith(PUBLIC_DIR)) {
    throw new Error("Unsafe local audio path.");
  }

  return resolved;
}

function getAudioSource(job: AnyRecord, body: AnyRecord) {
  const explicitLocalPath =
    body.sourceFilePath ||
    job.sourceFilePath ||
    job.localAudioPath ||
    job.track?.sourceFilePath ||
    job.track?.localAudioPath;

  if (explicitLocalPath) {
    return {
      type: "local" as const,
      value: path.resolve(ROOT, String(explicitLocalPath)),
      authorized: true,
    };
  }

  const authorizedUrl =
    body.authorizedAudioUrl ||
    job.authorizedAudioUrl ||
    job.safeDownloadUrl ||
    job.track?.authorizedAudioUrl ||
    job.track?.safeDownloadUrl;

  if (authorizedUrl) {
    const url = String(authorizedUrl);

    if (isLocalPublicAudio(url)) {
      return {
        type: "local" as const,
        value: publicUrlToFilePath(url),
        authorized: true,
      };
    }

    return {
      type: "remote" as const,
      value: url,
      authorized: true,
    };
  }

  const unsafeUrl =
    body.audioUrl ||
    job.audioUrl ||
    job.rawAudioUrl ||
    job.track?.audioUrl ||
    job.track?.rawAudioUrl ||
    job.track?.url;

  if (unsafeUrl && isLocalPublicAudio(String(unsafeUrl))) {
    return {
      type: "local" as const,
      value: publicUrlToFilePath(String(unsafeUrl)),
      authorized: true,
    };
  }

  return {
    type: "missing" as const,
    value: unsafeUrl ? String(unsafeUrl) : "",
    authorized: false,
  };
}

function extensionFromContentType(contentType: string) {
  const lower = contentType.toLowerCase();

  if (lower.includes("wav")) return ".wav";
  if (lower.includes("mpeg") || lower.includes("mp3")) return ".mp3";
  if (lower.includes("mp4")) return ".mp4";
  if (lower.includes("m4a")) return ".m4a";
  if (lower.includes("ogg")) return ".ogg";
  if (lower.includes("webm")) return ".webm";

  return ".mp3";
}

async function downloadAuthorizedAudio(url: string, jobId: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "ThaCoreRadioCleanProcessor/1.0",
      Accept: "audio/*,*/*",
    },
  });

  if (!response.ok) {
    const error: any = new Error(`Audio download failed with HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "audio/mpeg";
  const ext = extensionFromContentType(contentType);
  const output = path.join(INPUT_DIR, `${jobId}-authorized-source${ext}`);

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(output, Buffer.from(arrayBuffer));

  return output;
}

async function resolveAuthorizedAudioToLocalPath(job: AnyRecord, body: AnyRecord, jobId: string) {
  const source = getAudioSource(job, body);

  if (!source.authorized || source.type === "missing") {
    return {
      ok: false as const,
      status: "NEEDS_AUTHORIZED_AUDIO_SOURCE",
      message:
        "No authorized audio source found. Provide authorizedAudioUrl, safeDownloadUrl, or sourceFilePath.",
    };
  }

  if (source.type === "local") {
    if (!fs.existsSync(source.value)) {
      return {
        ok: false as const,
        status: "AUTHORIZED_AUDIO_NOT_FOUND",
        message: `Authorized local audio file was not found: ${source.value}`,
      };
    }

    return {
      ok: true as const,
      sourceFilePath: source.value,
    };
  }

  try {
    const sourceFilePath = await downloadAuthorizedAudio(source.value, jobId);

    return {
      ok: true as const,
      sourceFilePath,
    };
  } catch (error: any) {
    const is403 = Number(error?.status) === 403 || String(error?.message || "").includes("403");

    return {
      ok: false as const,
      status: is403 ? "NEEDS_AUTHORIZED_AUDIO_SOURCE" : "AUTHORIZED_AUDIO_DOWNLOAD_FAILED",
      message: is403
        ? "Remote source refused download with 403. Provide a properly authorized source."
        : `Authorized audio download failed: ${String(error?.message || error)}`,
    };
  }
}

async function transcribeWithOpenAI(sourceFilePath: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      ok: false as const,
      status: "NEEDS_OPENAI_API_KEY",
      message: "OPENAI_API_KEY is missing from .env.local.",
    };
  }

  const audioBytes = fs.readFileSync(sourceFilePath);
  const ext = path.extname(sourceFilePath).toLowerCase();
  const type =
    ext === ".wav"
      ? "audio/wav"
      : ext === ".m4a"
        ? "audio/mp4"
        : ext === ".mp4"
          ? "audio/mp4"
          : ext === ".ogg"
            ? "audio/ogg"
            : ext === ".webm"
              ? "audio/webm"
              : "audio/mpeg";

  const form = new FormData();
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");

  const blob = new Blob([new Uint8Array(audioBytes)], { type });
  form.append("file", blob, path.basename(sourceFilePath) || "audio.mp3");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const text = await response.text();

  if (!response.ok) {
    return {
      ok: false as const,
      status: "TRANSCRIPTION_FAILED",
      message: `OpenAI transcription failed with HTTP ${response.status}.`,
      error: text,
    };
  }

  let json: AnyRecord;

  try {
    json = JSON.parse(text);
  } catch {
    return {
      ok: false as const,
      status: "TRANSCRIPTION_PARSE_FAILED",
      message: "OpenAI transcription response was not valid JSON.",
      raw: text,
    };
  }

  const words = Array.isArray(json.words) ? json.words : [];

  if (!words.length) {
    return {
      ok: false as const,
      status: "NEEDS_WORD_TIMESTAMPS",
      message: "Transcription completed, but no word-level timestamps were returned.",
      transcript: json.text || "",
      raw: json,
    };
  }

  return {
    ok: true as const,
    transcript: json.text || "",
    words,
    raw: json,
  };
}

function buildBleepCuesFromWords(words: AnyRecord[]) {
  return words
    .filter((item) => isExplicitWord(String(item.word ?? item.text ?? "")))
    .map((item) => {
      const start = Number(item.start ?? item.startTime);
      const end = Number(item.end ?? item.endTime);
      const word = String(item.word ?? item.text ?? "");

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

      return {
        start: Math.max(0, start - 0.03),
        end: end + 0.05,
        word,
        reason: "openai_word_timestamp_explicit_word",
      };
    })
    .filter(Boolean);
}

export async function runTranscribeAndProcess(body: AnyRecord) {
  ensureDirs();

  const jobId = String(body.jobId || body.id || body.bleepJobId || "").trim();

  if (!jobId) {
    return {
      ok: false,
      status: "MISSING_JOB_ID",
      message: "No jobId was provided.",
    };
  }

  const jobsData = safeJsonRead(JOBS_FILE, { jobs: [] });
  const shape = getJobListShape(jobsData);
  const list = shape.list;
  const job = findJob(list, jobId);

  if (!job) {
    return {
      ok: false,
      jobId,
      status: "JOB_NOT_FOUND",
      message: "No matching bleep job was found.",
    };
  }

  const audio = await resolveAuthorizedAudioToLocalPath(job, body, jobId);

  if (!audio.ok) {
    const updatedList = updateJob(list, job, {
      status: audio.status,
      decision: "BLOCK_PROCESSING",
      safe: false,
      needsAuthorizedAudioSource: true,
      message: audio.message,
    });

    safeJsonWrite(JOBS_FILE, shape.save(updatedList));

    return {
      ok: false,
      jobId,
      status: audio.status,
      message: audio.message,
    };
  }

  const transcription = await transcribeWithOpenAI(audio.sourceFilePath);

  if (!transcription.ok) {
    const updatedList = updateJob(list, job, {
      status: transcription.status,
      decision: "BLOCK_PROCESSING",
      safe: false,
      needsWordTimestamps: transcription.status === "NEEDS_WORD_TIMESTAMPS",
      message: transcription.message,
      transcript: (transcription as any).transcript || "",
      transcriptionError: (transcription as any).error || "",
    });

    safeJsonWrite(JOBS_FILE, shape.save(updatedList));

    return {
      ok: false,
      jobId,
      status: transcription.status,
      message: transcription.message,
      error: (transcription as any).error,
    };
  }

  const bleepCues = buildBleepCuesFromWords(transcription.words);

  if (!bleepCues.length) {
    const updatedList = updateJob(list, job, {
      status: "TRANSCRIBED_NO_EXPLICIT_CUES_REVIEW_REQUIRED",
      decision: "BLOCK_UNTIL_REVIEW",
      safe: false,
      needsBleep: false,
      needsHumanReview: true,
      transcript: transcription.transcript,
      wordTimestamps: transcription.words,
      bleepCues: [],
      message:
        "Transcription produced word timestamps, but no explicit cues were detected. Human review required before allowing broadcast.",
    });

    safeJsonWrite(JOBS_FILE, shape.save(updatedList));

    return {
      ok: false,
      jobId,
      status: "TRANSCRIBED_NO_EXPLICIT_CUES_REVIEW_REQUIRED",
      message:
        "No explicit bleep cues were found. Track was not marked safe automatically. Human review required.",
      transcript: transcription.transcript,
      wordCount: transcription.words.length,
      cueCount: 0,
    };
  }

  const updatedList = updateJob(list, job, {
    status: "TRANSCRIBED_EXPLICIT_CUES_READY",
    decision: "PROCESS_REAL_BLEEP_COPY",
    safe: false,
    needsBleep: true,
    needsWordTimestamps: false,
    needsAuthorizedAudioSource: false,
    transcript: transcription.transcript,
    wordTimestamps: transcription.words,
    bleepCues,
    cueCount: bleepCues.length,
    sourceFilePath: audio.sourceFilePath,
    message: "Word timestamps found and explicit bleep cues created. Sending to real bleep processor.",
  });

  safeJsonWrite(JOBS_FILE, shape.save(updatedList));

  const processed = await runRealBleepProcessor({
    ...body,
    jobId,
    sourceFilePath: audio.sourceFilePath,
    cues: bleepCues,
  });

  return {
    ...processed,
    transcribed: true,
    transcript: transcription.transcript,
    wordCount: transcription.words.length,
    cueCount: bleepCues.length,
  };
}

