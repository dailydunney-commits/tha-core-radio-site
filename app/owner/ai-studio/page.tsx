"use client";

import { useState } from "react";
import styles from "./ai-studio.module.css";

const SCRIPT_TYPES = [
  "Radio Ad",
  "Jingle / Drop",
  "Business Promo",
  "Nia Talk Break",
  "Prodigy & Diamond Segment",
  "Sponsor Read",
  "Music Intro",
];

const TONES = [
  "Clean Jamaican Radio",
  "Professional",
  "Hype",
  "Smooth",
  "Funny",
  "Serious",
  "Urban Radio Personality",
];

const LENGTHS = [
  "15 seconds",
  "30 seconds",
  "60 seconds",
  "90 seconds",
  "3 minutes",
  "5 minutes",
  "15 minutes",
  "30 minutes",
  "60 minutes",
  "2 hours",
  "3 hours",
];

const VOICES = [
  { id: "lessac", label: "Female Promo Voice" },
  { id: "amy", label: "Nia Energy Voice" },
  { id: "ryan", label: "Prodigy Male Voice" },
  { id: "alan", label: "Male Radio Voice" },
  { id: "libritts", label: "Narrator / Diamond Test Voice" },
];

export default function OwnerAiStudioPage() {
  const [scriptType, setScriptType] = useState("Radio Ad");
  const [tone, setTone] = useState("Clean Jamaican Radio");
  const [length, setLength] = useState("30 seconds");
  const [voiceId, setVoiceId] = useState("lessac");
  const [details, setDetails] = useState("");
  const [script, setScript] = useState("");
  const [notice, setNotice] = useState("Build/test mode active. No owner key required.");
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [voiceLabel, setVoiceLabel] = useState("");
  const [voiceModel, setVoiceModel] = useState("");

  async function generateScript() {
    if (!details.trim()) {
      setNotice("Enter the topic or details first.");
      return;
    }

    setLoading(true);
    setNotice("Generating local script...");
    setAudioUrl("");

    try {
      const response = await fetch("/api/owner/ai-script-generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scriptType,
          tone,
          length,
          details,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Could not generate script.");
      }

      setScript(data.script || "");
      setNotice("Owner script generated locally. No OpenAI used.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not generate script.");
    } finally {
      setLoading(false);
    }
  }

  async function copyScript() {
    if (!script.trim()) return;
    await navigator.clipboard.writeText(script);
    setNotice("Script copied.");
  }

  async function generateVoice() {
    if (!script.trim()) {
      setNotice("Generate a script first.");
      return;
    }

    setVoiceLoading(true);
    setAudioUrl("");
    setVoiceLabel("");
    setVoiceModel("");
    setNotice("Generating local voice with Piper...");

    try {
      const response = await fetch("/api/owner/ai-voice-generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          voiceId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Could not generate voice.");
      }

      setAudioUrl(data.audioUrl ? `${data.audioUrl}?t=${Date.now()}` : "");
      setVoiceLabel(data.voiceLabel || "");
      setVoiceModel(data.model || "");
      setNotice(`Local voice generated: ${data.voiceLabel || voiceId} using ${data.model || "selected model"}. No OpenAI. No ElevenLabs.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not generate voice.");
    } finally {
      setVoiceLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.kicker}>OWNER AI STUDIO</div>
        <h1>Owner AI Studio</h1>
        <p>
          Create clean, broadcast-ready scripts and local voice previews for Tha Core Online Radio.
          No OpenAI. No ElevenLabs. Local build/test mode.
        </p>
        <div className={styles.notice}>{notice}</div>
      </section>

      <section className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.kicker}>SCRIPT GENERATOR</div>
          <h2>Build A New Script</h2>
          <p className={styles.help}>
            Set the format, tone, length, and voice, then generate a polished owner-ready script and local voice preview.
          </p>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Script type</span>
              <select value={scriptType} onChange={(event) => setScriptType(event.target.value)}>
                {SCRIPT_TYPES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Tone</span>
              <select value={tone} onChange={(event) => setTone(event.target.value)}>
                {TONES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Length</span>
              <select value={length} onChange={(event) => setLength(event.target.value)}>
                {LENGTHS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Voice</span>
              <select value={voiceId} onChange={(event) => setVoiceId(event.target.value)}>
                {VOICES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span>Topic / details</span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Example: Radio ad for Tha Core Graphics offering flyers, business cards, cups, shirts, banners, and logo design."
            />
          </label>

          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={generateScript} disabled={loading}>
              {loading ? "Generating..." : "Generate"}
            </button>
            <button className={styles.secondaryButton} onClick={copyScript} disabled={!script.trim()}>
              Copy
            </button>
            <button className={styles.primaryButton} onClick={generateVoice} disabled={!script.trim() || voiceLoading}>
              {voiceLoading ? "Voicing..." : "Generate Voice"}
            </button>
          </div>

          {audioUrl ? (
            <div className={styles.field}>
              <span>Voice preview {voiceLabel ? `- ${voiceLabel}` : ""}</span>
              <audio key={audioUrl} controls src={audioUrl} style={{ width: "100%" }} />
              <p className={styles.help}>Saved locally at: {audioUrl}</p>
            </div>
          ) : null}
        </div>

        <div className={styles.card}>
          <div className={styles.kicker}>GENERATED SCRIPT</div>
          <h2>Studio Output</h2>
          <p className={styles.help}>Your finished script appears here in a readable owner-side preview box.</p>

          <label className={styles.field}>
            <span>Generated script</span>
            <textarea
              className={styles.output}
              readOnly
              value={script || "Your generated radio-ready script will appear here."}
            />
          </label>
        </div>
      </section>
    </main>
  );
}


