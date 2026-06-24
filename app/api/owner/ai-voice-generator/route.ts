import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

// LOCAL_MULTI_VOICE_GENERATOR_FIXED_V1
// Free local Piper voice generator.
// No OpenAI. No ElevenLabs. No external voice API calls.

const VOICES: Record<string, { label: string; model: string }> = {
  lessac: { label: "Female Promo Voice", model: "en_US-lessac-medium.onnx" },
  amy: { label: "Nia Energy Voice", model: "en_US-amy-medium.onnx" },
  ryan: { label: "Prodigy Male Voice", model: "en_US-ryan-high.onnx" },
  alan: { label: "Male Radio Voice", model: "en_GB-alan-medium.onnx" },
  libritts: { label: "Narrator / Diamond Test Voice", model: "en_US-libritts_r-medium.onnx" },
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFKD")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u{10000}-\u{10FFFF}]/gu, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, " - ")
    .replace(/…/g, "...")
    .replace(/\r/g, "")
    .replace(/\n{4,}/g, "\n\n")
    .trim();
}

function stripProductionNotes(text: string) {
  return text
    .replace(/^TITLE:[\s\S]*?(?=\n\n|$)/gim, "")
    .replace(/^STYLE:[\s\S]*?(?=\n\n|$)/gim, "")
    .replace(/^TARGET LENGTH:[\s\S]*?(?=\n\n|$)/gim, "")
    .replace(/^FORMAT:[\s\S]*?(?=\n\n|$)/gim, "")
    .replace(/^NOTE:[\s\S]*?(?=\n\n|$)/gim, "")
    .replace(/^IMPORTANT PRODUCTION NOTE:[\s\S]*?(?=\n\n|$)/gim, "")
    .replace(/^ESTIMATED WORD COUNT:[\s\S]*?(?=\n\n|$)/gim, "")
    .replace(/^VOICE NOTE:[\s\S]*?(?=\n\n|$)/gim, "")
    .replace(/\[PLAY[\s\S]*?\]/gim, "Music break.")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeFileStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function assertVoiceFiles(root: string, modelName: string) {
  const modelPath = path.join(root, "voices", modelName);
  const configPath = `${modelPath}.json`;
  await fs.access(modelPath);
  await fs.access(configPath);
  return modelPath;
}

function runPiper(inputText: string, modelPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    const root = process.cwd();
    const piperExe =
      process.platform === "win32"
        ? path.join(root, ".venv-voice", "Scripts", "piper.exe")
        : path.join(root, ".venv-voice", "bin", "piper");

    const child = spawn(
      piperExe,
      ["--model", modelPath, "--output_file", outputPath],
      {
        cwd: root,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `Piper exited with code ${code}`));
    });

    child.stdin.write(inputText, "utf8");
    child.stdin.end();
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const rawText = cleanText(body?.text);
    const text = stripProductionNotes(rawText);
    const requestedVoiceId = typeof body?.voiceId === "string" ? body.voiceId : "lessac";
    const voiceId = VOICES[requestedVoiceId] ? requestedVoiceId : "lessac";
    const voice = VOICES[voiceId];

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Script text is required." },
        { status: 400 }
      );
    }

    const root = process.cwd();
    const modelPath = await assertVoiceFiles(root, voice.model);

    const outDir = path.join(root, "public", "audio", "ai-studio");
    await fs.mkdir(outDir, { recursive: true });

    const filename = `voice-${voiceId}-${safeFileStamp()}.wav`;
    const outputPath = path.join(outDir, filename);

    const limitedText = text.slice(0, 900);
    await runPiper(limitedText, modelPath, outputPath);

    return NextResponse.json({
      ok: true,
      mode: "free-local-piper-multi-voice",
      voiceId,
      voiceLabel: voice.label,
      model: voice.model,
      audioUrl: `/api/owner/ai-studio-audio?file=${encodeURIComponent(filename)}`,
      filename,
      note: "Generated quick voice preview only. Full long-script voice parts come next.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to generate local voice.",
      },
      { status: 500 }
    );
  }
}






