import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { runRealBleepProcessor } from "@/lib/audio/real-bleep-processor";

type AnyRecord = Record<string, any>;

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, ".data");
const JOBS_FILE = path.join(DATA_DIR, "bleep-jobs.json");
const LOCAL_TRANSCRIBE_DIR = path.join(DATA_DIR, "local-whisper");
const PUBLIC_DIR = path.join(ROOT, "public");

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
  fs.mkdirSync(LOCAL_TRANSCRIBE_DIR, { recursive: true });
}

function safeJsonRead(filePath: string, fallback: any) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeJsonWrite(filePath: string, value: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function getJobListShape(data: any): { list: AnyRecord[]; save: (list: AnyRecord[]) => any } {
  if (Array.isArray(data)) return { list: data, save: (list) => list };
  if (Array.isArray(data?.jobs)) return { list: data.jobs, save: (list) => ({ ...data, jobs: list }) };
  if (Array.isArray(data?.items)) return { list: data.items, save: (list) => ({ ...data, items: list }) };
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
    throw new Error("Unsafe local public audio path.");
  }

  return resolved;
}

function resolveLocalAudioPath(job: AnyRecord, body: AnyRecord) {
  const direct =
    body.sourceFilePath ||
    body.localAudioPath ||
    job.sourceFilePath ||
    job.localAudioPath ||
    job.track?.sourceFilePath ||
    job.track?.localAudioPath;

  if (direct) {
    return path.resolve(ROOT, String(direct));
  }

  const audioUrl =
    body.audioUrl ||
    job.audioUrl ||
    job.cleanAudioUrl ||
    job.processedAudioUrl ||
    job.track?.audioUrl ||
    job.track?.cleanAudioUrl ||
    job.track?.processedAudioUrl;

  if (audioUrl && isLocalPublicAudio(String(audioUrl))) {
    return publicUrlToFilePath(String(audioUrl));
  }

  return "";
}

function getPythonExe() {
  const fromEnv = process.env.LOCAL_WHISPER_PYTHON;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  const linuxVenvPython = path.join(ROOT, ".venv", "bin", "python");
  if (fs.existsSync(linuxVenvPython)) return linuxVenvPython;

  const windowsVenvPython = path.join(ROOT, ".venv-whisper", "Scripts", "python.exe");
  if (fs.existsSync(windowsVenvPython)) return windowsVenvPython;

  return "python";
}

function runLocalWhisper(audioPath: string, outputPath: string) {
  return new Promise<AnyRecord>((resolve, reject) => {
    const pythonExe = getPythonExe();
    const scriptPath = path.join(ROOT, "scripts", "local-whisper-transcribe.py");

    const child = spawn(
      pythonExe,
      [
        scriptPath,
        "--audio",
        audioPath,
        "--output",
        outputPath,
        "--model",
        process.env.LOCAL_WHISPER_MODEL || "tiny.en",
      ],
      {
        cwd: ROOT,
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
        },
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        const error: any = new Error(`Local Whisper failed with code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      const data = safeJsonRead(outputPath, null);

      if (data) {
        resolve(data);
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim().split(/\r?\n/).pop() || "{}"));
      } catch {
        const error: any = new Error("Local Whisper returned invalid JSON.");
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

function buildBleepCuesFromWords(words: AnyRecord[]) {
  return words
    .filter((item) => isExplicitWord(String(item.word ?? item.text ?? "")))
    .map((item) => {
      const start = Number(item.start ?? item.startTime);
      const rawEnd = Number(item.end ?? item.endTime);
      const word = String(item.word ?? item.text ?? "");

      if (!Number.isFinite(start)) return null;

      // Whisper can return zero-length word timestamps like 22.3 -> 22.3.
      // Do not miss explicit words because of that. Give them a safe bleep window.
      const end = Number.isFinite(rawEnd) && rawEnd > start ? rawEnd : start + 0.55;

      return {
        start: Math.max(0, start - 0.08),
        end: end + 0.12,
        word,
        reason: "local_whisper_explicit_word_timestamp",
      };
    })
    .filter(Boolean);
}

export async function runLocalTranscribeAndProcess(body: AnyRecord) {
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

  const audioPath = resolveLocalAudioPath(job, body);

  if (!audioPath || !fs.existsSync(audioPath)) {
    const updatedList = updateJob(list, job, {
      status: "NEEDS_LOCAL_AUTHORIZED_AUDIO",
      decision: "BLOCK_PROCESSING",
      safe: false,
      needsAuthorizedAudioSource: true,
      message: "Local Whisper needs an authorized local audio file path.",
    });

    safeJsonWrite(JOBS_FILE, shape.save(updatedList));

    return {
      ok: false,
      jobId,
      status: "NEEDS_LOCAL_AUTHORIZED_AUDIO",
      message: "Local Whisper needs an authorized local audio file path.",
      audioPath,
    };
  }

  const outputPath = path.join(LOCAL_TRANSCRIBE_DIR, `${jobId}-local-whisper.json`);

  let transcription: AnyRecord;

  try {
    transcription = await runLocalWhisper(audioPath, outputPath);
  } catch (error: any) {
    const updatedList = updateJob(list, job, {
      status: "LOCAL_WHISPER_FAILED",
      decision: "BLOCK_PROCESSING",
      safe: false,
      localWhisperError: String(error?.message || error),
      localWhisperStdout: String(error?.stdout || ""),
      localWhisperStderr: String(error?.stderr || ""),
      message: "Local Whisper transcription failed.",
    });

    safeJsonWrite(JOBS_FILE, shape.save(updatedList));

    return {
      ok: false,
      jobId,
      status: "LOCAL_WHISPER_FAILED",
      message: "Local Whisper transcription failed.",
      error: String(error?.message || error),
      stderr: String(error?.stderr || ""),
    };
  }

  if (!transcription.ok || !Array.isArray(transcription.words) || !transcription.words.length) {
    const updatedList = updateJob(list, job, {
      status: "LOCAL_WHISPER_NO_WORD_TIMESTAMPS",
      decision: "BLOCK_PROCESSING",
      safe: false,
      needsWordTimestamps: true,
      localWhisperResult: transcription,
      message: "Local Whisper did not return usable word timestamps.",
    });

    safeJsonWrite(JOBS_FILE, shape.save(updatedList));

    return {
      ok: false,
      jobId,
      status: "LOCAL_WHISPER_NO_WORD_TIMESTAMPS",
      message: "Local Whisper did not return usable word timestamps.",
      localWhisperResult: transcription,
    };
  }

  const bleepCues = buildBleepCuesFromWords(transcription.words);

  if (!bleepCues.length) {
    const updatedList = updateJob(list, job, {
      status: "SMARTDJ_SECOND_SCAN_RECOMMENDED",
      decision: "BLOCK_UNTIL_REVIEW",
      safe: false,
      needsSmartDjSecondScan: true,
      transcript: transcription.transcript || "",
      wordTimestamps: transcription.words,
      bleepCues: [],
      cueCount: 0,
      message:
        "Local Whisper produced word timestamps, but no explicit cues were detected. SmartDJ second scan recommended before broadcast.",
    });

    safeJsonWrite(JOBS_FILE, shape.save(updatedList));

    return {
      ok: false,
      jobId,
      status: "SMARTDJ_SECOND_SCAN_RECOMMENDED",
      message:
        "No explicit bleep cues were found. SmartDJ second scan recommended before release.",
      transcript: transcription.transcript || "",
      wordCount: transcription.words.length,
      cueCount: 0,
    };
  }

  const updatedList = updateJob(list, job, {
    status: "LOCAL_TRANSCRIBED_EXPLICIT_CUES_READY",
    decision: "PROCESS_REAL_BLEEP_COPY",
    safe: false,
    needsBleep: true,
    needsWordTimestamps: false,
    transcript: transcription.transcript || "",
    wordTimestamps: transcription.words,
    bleepCues,
    cueCount: bleepCues.length,
    sourceFilePath: audioPath,
    message: "Local Whisper created explicit bleep cues. Sending to real bleep processor.",
  });

  safeJsonWrite(JOBS_FILE, shape.save(updatedList));

  const processed = await runRealBleepProcessor({
    ...body,
    jobId,
    sourceFilePath: audioPath,
    cues: bleepCues,
  });

  return {
    ...processed,
    localTranscribed: true,
    transcript: transcription.transcript || "",
    wordCount: transcription.words.length,
    cueCount: bleepCues.length,
  };
}


