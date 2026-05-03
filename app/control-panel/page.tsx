"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const STREAM_URL =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  "http://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

type Mode = "AUTODJ" | "SMART DJ" | "LIVE DJ";
type DropMode = "jingles" | "ads" | "commercials";

type DropButton = {
  label: string;
  file: string;
};

const AUDIO_SETS: Record<DropMode, DropButton[]> = {
  jingles: [
    { label: "STATION ID", file: "/drops/station-id.mp3" },
    { label: "DJ DROP", file: "/drops/dj-drop.mp3" },
    { label: "NEXT JINGLE", file: "/drops/next-jingle.mp3" },
    { label: "HYPE DROP", file: "/drops/hype-drop.mp3" },
    { label: "VOICE DROP", file: "/drops/voice-drop.mp3" },
    { label: "SPONSOR", file: "/drops/sponsor-drop.mp3" },
    { label: "RADIO SWEEP", file: "/drops/station-id.mp3" },
    { label: "DROP INTRO", file: "/drops/dj-drop.mp3" },
    { label: "PROMO TAG", file: "/drops/hype-drop.mp3" },
  ],
  ads: [
    { label: "AD DROP", file: "/drops/ad-drop.mp3" },
    { label: "SPONSOR AD", file: "/drops/sponsor-drop.mp3" },
    { label: "PROMO AD", file: "/drops/hype-drop.mp3" },
    { label: "VOICE AD", file: "/drops/voice-drop.mp3" },
    { label: "STORE AD", file: "/drops/ad-drop.mp3" },
    { label: "RADIO AD", file: "/drops/sponsor-drop.mp3" },
    { label: "PRINT AD", file: "/drops/hype-drop.mp3" },
    { label: "SERVICE AD", file: "/drops/voice-drop.mp3" },
    { label: "FLASH AD", file: "/drops/ad-drop.mp3" },
  ],
  commercials: [
    { label: "COMMERCIAL 1", file: "/drops/next-jingle.mp3" },
    { label: "COMMERCIAL 2", file: "/drops/sponsor-drop.mp3" },
    { label: "COMMERCIAL 3", file: "/drops/ad-drop.mp3" },
    { label: "COMMERCIAL 4", file: "/drops/hype-drop.mp3" },
    { label: "COMMERCIAL 5", file: "/drops/voice-drop.mp3" },
    { label: "COMMERCIAL 6", file: "/drops/next-jingle.mp3" },
    { label: "BREAK INTRO", file: "/drops/station-id.mp3" },
    { label: "BREAK OUTRO", file: "/drops/dj-drop.mp3" },
    { label: "CLIENT SPOT", file: "/drops/sponsor-drop.mp3" },
  ],
};

export default function ControlPanelPage() {
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const dropAudioRef = useRef<HTMLAudioElement | null>(null);

  const [message, setMessage] = useState("Ready");
  const [mainPlaying, setMainPlaying] = useState(false);
  const [dropPlaying, setDropPlaying] = useState(false);
  const [studioMonitor, setStudioMonitor] = useState(true);

  const [mode, setMode] = useState<Mode>("AUTODJ");
  const [dropMode, setDropMode] = useState<DropMode>("jingles");

  const [mainVolume, setMainVolume] = useState(0.85);
  const [mainGain, setMainGain] = useState(70);
  const [mainBass, setMainBass] = useState(50);
  const [mainTreble, setMainTreble] = useState(50);
  const [mainFilter, setMainFilter] = useState(50);
  const [mainMaster, setMainMaster] = useState(85);
  const [mainCue, setMainCue] = useState(50);
  const [mainMic, setMainMic] = useState(65);
  const [mainFx, setMainFx] = useState(40);
  const [mainComp, setMainComp] = useState(45);
  const [mainLimiter, setMainLimiter] = useState(70);
  const [tempoA, setTempoA] = useState(0);

  const [dropVolume, setDropVolume] = useState(0.75);
  const [dropGain, setDropGain] = useState(60);
  const [dropBass, setDropBass] = useState(50);
  const [dropTreble, setDropTreble] = useState(50);
  const [dropFilter, setDropFilter] = useState(50);
  const [dropReverb, setDropReverb] = useState(15);
  const [dropDelay, setDropDelay] = useState(10);
  const [dropDuck, setDropDuck] = useState(45);
  const [dropMaster, setDropMaster] = useState(80);
  const [dropCue, setDropCue] = useState(50);
  const [dropFx, setDropFx] = useState(35);
  const [tempoB, setTempoB] = useState(0);

  const [crossFader, setCrossFader] = useState(50);

  const [liveStatus, setLiveStatus] = useState({
    listeners: "0",
    nowPlaying: "Tha Core Live Mix",
  });

  const stationLive =
    mainPlaying || mode === "AUTODJ" || mode === "SMART DJ" || mode === "LIVE DJ";

  const lightsActive = stationLive || dropPlaying;

  useEffect(() => {
    async function loadNowPlaying() {
      try {
        const res = await fetch("/api/now-playing", { cache: "no-store" });
        const data = await res.json();

        setLiveStatus({
          listeners: String(data?.listeners?.current ?? data?.listeners ?? "0"),
          nowPlaying:
            data?.now_playing?.song?.text ||
            data?.nowPlaying ||
            data?.song ||
            "Tha Core Live Mix",
        });
      } catch {
        setLiveStatus((prev) => ({
          ...prev,
          nowPlaying: "Tha Core Live Mix",
        }));
      }
    }

    loadNowPlaying();
    const timer = window.setInterval(loadNowPlaying, 10000);

    return () => window.clearInterval(timer);
  }, []);

  function updateMainVolume(value: number) {
    setMainVolume(value);

    if (mainAudioRef.current) {
      mainAudioRef.current.volume = studioMonitor ? value : 0;
      mainAudioRef.current.muted = false;
    }
  }

  function updateDropVolume(value: number) {
    setDropVolume(value);

    if (dropAudioRef.current) {
      dropAudioRef.current.volume = value;
      dropAudioRef.current.muted = false;
    }
  }

  async function callAzuraControl(action: string) {
    try {
      const res = await fetch("/api/azuracast/control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setMessage(data?.message || `Azura action failed: ${action}`);
        return false;
      }

      return true;
    } catch {
      setMessage(`Could not reach Azura control route: ${action}`);
      return false;
    }
  }

  async function togglePlayPause() {
    const audio = mainAudioRef.current;

    if (!audio) {
      setMessage("Audio player not ready");
      return;
    }

    try {
      if (mainPlaying) {
        audio.pause();
        setMainPlaying(false);
        setMessage("Broadcast monitor paused");
        return;
      }

      audio.src = STREAM_URL;
      audio.volume = studioMonitor ? mainVolume : 0;
      audio.muted = false;

      await audio.play();

      setMainPlaying(true);
      setMessage("Broadcast monitor playing");
    } catch {
      setMainPlaying(false);
      setMessage("Audio failed — stream is live, check browser or volume");
    }
  }

  async function cueStopAllBroadcast() {
    if (mainAudioRef.current) {
      mainAudioRef.current.pause();
    }

    if (dropAudioRef.current) {
      dropAudioRef.current.pause();
    }

    setMainPlaying(false);
    setDropPlaying(false);
    setMessage("CUE pressed — stopping broadcast through Azura...");

    const ok = await callAzuraControl("cue_stop_all");

    if (ok) {
      setMessage("CUE STOP sent to Azura");
    }
  }

  function toggleStudioMonitor() {
    const next = !studioMonitor;
    setStudioMonitor(next);

    if (mainAudioRef.current) {
      mainAudioRef.current.volume = next ? mainVolume : 0;
      mainAudioRef.current.muted = false;
    }

    setMessage(next ? "Studio monitor ON" : "Studio monitor OFF");
  }

  async function cycleMode() {
    const next: Mode =
      mode === "AUTODJ" ? "SMART DJ" : mode === "SMART DJ" ? "LIVE DJ" : "AUTODJ";

    setMode(next);
    setMessage(`Switching mode to ${next}...`);

    const action = next === "LIVE DJ" ? "go_on_air" : "restart_autodj";
    const ok = await callAzuraControl(action);

    if (ok) {
      setMessage(`${next} selected`);
    }
  }

  function switchDropPanel() {
    setDropMode((prev) => {
      const next =
        prev === "jingles" ? "ads" : prev === "ads" ? "commercials" : "jingles";

      setMessage(`Switched panel to ${next.toUpperCase()}`);
      return next;
    });
  }

  function playDrop(label: string, file: string) {
    if (dropAudioRef.current) {
      dropAudioRef.current.pause();
    }

    const audio = new Audio(file);
    audio.volume = dropVolume;
    audio.muted = false;
    dropAudioRef.current = audio;

    audio.onended = () => {
      setDropPlaying(false);
      setMessage(`${label} finished`);
    };

    audio
      .play()
      .then(() => {
        setDropPlaying(true);
        setMessage(`${label} playing`);
      })
      .catch(() => {
        setDropPlaying(false);
        setMessage(`Could not play ${label}`);
      });
  }

  return (
    <main style={styles.page}>
      <audio ref={mainAudioRef} src={STREAM_URL} preload="none" playsInline />

      <section style={styles.shell}>
        <section style={styles.topBar}>
          <div style={styles.headerBox}>
            <p style={styles.redLabel}>THA CORE CONTROL PANEL</p>
            <h1 style={styles.mainTitle}>Live Broadcast Deck</h1>
            <p style={styles.subText}>
              Full turntable mixer control with cam, jingles, ads, commercials,
              revenue, live status, studio monitor, and Azura broadcast control.
            </p>
            <p style={styles.statusMessage}>SYSTEM: {message}</p>
          </div>

          <div style={styles.statusTop}>
            <StatusBox
              label="STATUS"
              value={stationLive ? "ON AIR" : "OFF AIR"}
              color={stationLive ? "green" : "red"}
            />
            <StatusBox label="LISTENERS" value={liveStatus.listeners} color="white" />
            <StatusBox
              label="NOW PLAYING"
              value={liveStatus.nowPlaying}
              color="white"
              wide
            />
            <StatusBox
              label="MODE"
              value={mode}
              color={mode === "AUTODJ" ? "yellow" : "green"}
              blink
            />
            <StatusBox label="REVENUE" value="JMD $19000" color="green" />
          </div>
        </section>

        <section style={styles.camDropRow}>
          <div style={styles.camScreen}>
            <h2 style={styles.deckTitle}>CAM SCREEN</h2>

            <div style={styles.videoBox}>
              <h3 style={styles.camOff}>CAM OFF</h3>
              <p style={styles.muted}>DJ / Guest Video Feed</p>
            </div>

            <div style={styles.camMeters}>
              <BlinkLight color={studioMonitor ? "green" : "blue"} label="STUDIO" />
              <BlinkLight color={mainPlaying ? "green" : "blue"} label="AUDIO" />
            </div>
          </div>

          <div style={styles.dropSwitchPanel}>
            <div style={styles.dropHeader}>
              <div>
                <h2 style={styles.deckTitle}>{dropMode.toUpperCase()} BUTTONS</h2>
                <p style={styles.mutedCenter}>
                  Switch panel changes the whole area: Jingles → Ads → Commercials.
                </p>
              </div>

              <button style={styles.goldButton} onClick={switchDropPanel}>
                SWITCH PANEL
              </button>
            </div>

            <div style={styles.dropButtonGrid}>
              {AUDIO_SETS[dropMode].map((item) => (
                <button
                  key={item.label}
                  style={
                    dropMode === "jingles"
                      ? styles.purpleButton
                      : dropMode === "ads"
                      ? styles.tealButton
                      : styles.orangeButton
                  }
                  onClick={() => playDrop(item.label, item.file)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div style={styles.dropBottomFill}>
              <BlinkLight
                color={dropMode === "jingles" ? "green" : "blue"}
                label="JINGLES"
              />
              <BlinkLight color={dropMode === "ads" ? "green" : "blue"} label="ADS" />
              <BlinkLight
                color={dropMode === "commercials" ? "green" : "blue"}
                label="COMMERCIALS"
              />
              <BlinkLight color={dropPlaying ? "green" : "blue"} label="DROP AUDIO" />
            </div>
          </div>
        </section>

        <section style={styles.broadcastSection}>
          <TurntableDeck
            title="TURNTABLE A — MAIN BROADCAST"
            active={mainPlaying}
            lightsActive={lightsActive}
            sliders={[
              ["VOL", mainVolume, updateMainVolume, 0, 1, 0.01],
              ["GAIN", mainGain, setMainGain, 0, 100, 1],
              ["BASS", mainBass, setMainBass, 0, 100, 1],
              ["TREBLE", mainTreble, setMainTreble, 0, 100, 1],
              ["FILTER", mainFilter, setMainFilter, 0, 100, 1],
              ["MASTER", mainMaster, setMainMaster, 0, 100, 1],
              ["CUE", mainCue, setMainCue, 0, 100, 1],
              ["MIC", mainMic, setMainMic, 0, 100, 1],
              ["FX", mainFx, setMainFx, 0, 100, 1],
              ["COMP", mainComp, setMainComp, 0, 100, 1],
              ["LIMIT", mainLimiter, setMainLimiter, 0, 100, 1],
              ["TEMPO", tempoA, setTempoA, -20, 20, 0.1],
            ]}
          />

          <div style={styles.centerControl}>
            <h2 style={styles.deckTitle}>MAIN BROADCAST SECTION</h2>

            <div style={styles.nowPlayingBox}>
              <p style={styles.whiteSmall}>NOW PLAYING</p>
              <strong>{liveStatus.nowPlaying}</strong>
            </div>

            <div style={styles.mainBroadcastButtons}>
              <button
                style={mainPlaying ? styles.greenButton : styles.redButton}
                onClick={togglePlayPause}
              >
                {mainPlaying ? "PAUSE BROADCAST" : "PLAY BROADCAST"}
              </button>

              <button
                style={studioMonitor ? styles.greenButton : styles.blueButton}
                onClick={toggleStudioMonitor}
              >
                {studioMonitor ? "STUDIO MONITOR ON" : "STUDIO MONITOR OFF"}
              </button>

              <button style={styles.redButton} onClick={cueStopAllBroadcast}>
                CUE / STOP ALL BROADCAST
              </button>

              <button
                style={mode === "AUTODJ" ? styles.yellowButton : styles.greenButton}
                onClick={cycleMode}
              >
                {mode}
              </button>
            </div>

            <div style={styles.bigLights}>
              <BlinkLight color={mode === "AUTODJ" ? "yellow" : "blue"} label="AUTODJ" />
              <BlinkLight
                color={mode === "SMART DJ" ? "green" : "yellow"}
                label="SMART DJ"
              />
              <BlinkLight color={mode === "LIVE DJ" ? "green" : "red"} label="LIVE DJ" />
              <BlinkLight color={studioMonitor ? "green" : "blue"} label="STUDIO" />
              <BlinkLight color={mainPlaying ? "green" : "blue"} label="AUDIO" />
              <BlinkLight color={dropPlaying ? "green" : "blue"} label="DROPS" />
            </div>

            <div style={styles.crossFaderBox}>
              <p style={styles.whiteSmall}>CROSSFADER {crossFader}%</p>
              <input
                type="range"
                min="0"
                max="100"
                value={crossFader}
                onChange={(e) => setCrossFader(Number(e.target.value))}
                style={styles.redHorizontalSlider}
              />
            </div>
          </div>

          <TurntableDeck
            title={`TURNTABLE B — ${dropMode.toUpperCase()}`}
            active={dropPlaying}
            lightsActive={lightsActive}
            sliders={[
              ["VOL", dropVolume, updateDropVolume, 0, 1, 0.01],
              ["GAIN", dropGain, setDropGain, 0, 100, 1],
              ["BASS", dropBass, setDropBass, 0, 100, 1],
              ["TREBLE", dropTreble, setDropTreble, 0, 100, 1],
              ["FILTER", dropFilter, setDropFilter, 0, 100, 1],
              ["REVERB", dropReverb, setDropReverb, 0, 100, 1],
              ["DELAY", dropDelay, setDropDelay, 0, 100, 1],
              ["DUCK", dropDuck, setDropDuck, 0, 100, 1],
              ["MASTER", dropMaster, setDropMaster, 0, 100, 1],
              ["CUE", dropCue, setDropCue, 0, 100, 1],
              ["FX", dropFx, setDropFx, 0, 100, 1],
              ["TEMPO", tempoB, setTempoB, -20, 20, 0.1],
            ]}
          />
        </section>

        <section style={styles.bottomNav}>
          {[
            "AUTODJ MANAGER",
            "PLAYLIST MANAGER",
            "SONG REQUESTS",
            "SCHEDULE",
            "MEDIA LIBRARY",
            "REVENUE TOOLS",
            "SETTINGS",
          ].map((item, index) => (
            <button
              key={item}
              onClick={() => setMessage(`${item} ready`)}
              style={index % 2 === 0 ? styles.navBtn : styles.navBtnAlt}
            >
              {item}
            </button>
          ))}
        </section>
      </section>

      <style>{`
        input[type="range"] { accent-color: #ff1744; }

        @keyframes recordSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes recordPulse {
          0% { box-shadow: 0 0 25px rgba(180,0,32,.65), inset 0 0 35px #000; }
          50% { box-shadow: 0 0 55px rgba(255,23,68,1), inset 0 0 45px #000; }
          100% { box-shadow: 0 0 25px rgba(180,0,32,.65), inset 0 0 35px #000; }
        }

        @keyframes lightBlink {
          0% { opacity: .35; transform: scale(.9); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: .45; transform: scale(.95); }
        }

        @keyframes meterBlink {
          0% { opacity: .25; transform: scaleY(.85); }
          50% { opacity: 1; transform: scaleY(1.15); }
          100% { opacity: .35; transform: scaleY(.9); }
        }
      `}</style>
    </main>
  );
}

function TurntableDeck({
  title,
  active,
  lightsActive,
  sliders,
}: {
  title: string;
  active: boolean;
  lightsActive: boolean;
  sliders: [string, number, (value: number) => void, number, number, number][];
}) {
  return (
    <div style={styles.turntableCard}>
      <h2 style={styles.deckTitle}>{title}</h2>

      <div style={styles.turntableMain}>
        <LevelMeter active={lightsActive} />

        <div style={styles.recordWrap}>
          <div
            style={{
              ...styles.recordRing,
              animation: active
                ? "recordSpin 2s linear infinite, recordPulse .7s infinite"
                : "recordPulse 1.4s infinite",
            }}
          >
            <div style={styles.recordInner}>
              <div style={styles.logoDot}>
                THA
                <br />
                CORE
              </div>
            </div>
          </div>
        </div>

        <LevelMeter active={lightsActive} />
      </div>

      <div style={styles.slidersOnDeck}>
        {sliders.map(([label, value, setter, min, max, step]) => {
          const shown =
            max === 1
              ? `${Math.round(Number(value) * 100)}%`
              : `${Number(value).toFixed(step < 1 ? 1 : 0)}%`;

          return (
            <label key={label} style={styles.sliderBox}>
              <span style={styles.whiteSmall}>{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => setter(Number(e.target.value))}
                style={styles.redVerticalSlider}
              />
              <span style={styles.whiteSmall}>{shown}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function LevelMeter({ active }: { active: boolean }) {
  return (
    <div style={styles.levelMeter}>
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          style={{
            ...styles.levelBlock,
            background: i > 13 ? "#ff2020" : i > 9 ? "#ffcf00" : "#39ff14",
            animation: active
              ? `meterBlink ${0.25 + i * 0.02}s infinite`
              : "lightBlink 1s infinite",
          }}
        />
      ))}
    </div>
  );
}

function BlinkLight({ color, label }: { color: string; label: string }) {
  const dot =
    color === "green"
      ? styles.greenDotBlink
      : color === "yellow"
      ? styles.yellowDotBlink
      : color === "blue"
      ? styles.blueDotBlink
      : styles.redDotBlink;

  return (
    <div style={styles.lightBox}>
      <span style={dot}></span>
      <strong>{label}</strong>
    </div>
  );
}

function StatusBox({
  label,
  value,
  color,
  wide,
  blink,
}: {
  label: string;
  value: string;
  color: string;
  wide?: boolean;
  blink?: boolean;
}) {
  const text =
    color === "green"
      ? styles.greenValue
      : color === "yellow"
      ? styles.yellowValue
      : color === "red"
      ? styles.redValue
      : styles.whiteValue;

  const dot =
    color === "green"
      ? styles.greenDotBlink
      : color === "yellow"
      ? styles.yellowDotBlink
      : color === "red"
      ? styles.redDotBlink
      : null;

  return (
    <div style={wide ? styles.miniStatWide : styles.miniStat}>
      <p style={styles.smallLabel}>{label}</p>
      {blink && dot && <span style={dot}></span>}
      <strong style={text}>{value}</strong>
    </div>
  );
}

function button(background: string, border: string, color: string): CSSProperties {
  return {
    background,
    border: `1px solid ${border}`,
    color,
    padding: 12,
    borderRadius: 8,
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: `0 0 16px ${border}55`,
  };
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(120,0,20,.28), transparent 30%), #010101",
    color: "#fff",
    padding: 14,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  shell: {
    border: "2px solid #7a0015",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 0 35px rgba(120,0,20,.55)",
    background: "linear-gradient(180deg,#030303,#000)",
  },
  topBar: {
    display: "grid",
    gridTemplateColumns: "1.05fr 2fr",
    gap: 18,
  },
  headerBox: {
    padding: 10,
  },
  redLabel: {
    margin: 0,
    color: "#ff1744",
    fontWeight: 900,
    fontSize: 20,
  },
  mainTitle: {
    margin: "10px 0",
    fontSize: 46,
    fontWeight: 1000,
    lineHeight: 1,
  },
  subText: {
    color: "#f5f5f5",
    fontSize: 16,
    lineHeight: 1.45,
  },
  statusMessage: {
    marginTop: 12,
    color: "#39ff14",
    fontWeight: 900,
    fontSize: 14,
  },
  statusTop: {
    border: "1px solid #7a0015",
    borderRadius: 14,
    padding: 12,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1.7fr 1fr 1fr",
    gap: 8,
    background: "rgba(0,0,0,.85)",
  },
  miniStat: {
    border: "1px solid #3b000a",
    padding: 12,
    textAlign: "center",
    background: "linear-gradient(180deg,#111,#030303)",
    overflow: "hidden",
    minHeight: 96,
  },
  miniStatWide: {
    border: "1px solid #3b000a",
    padding: 12,
    textAlign: "center",
    background: "linear-gradient(180deg,#111,#030303)",
    overflow: "hidden",
    minHeight: 96,
  },
  smallLabel: {
    margin: "0 0 8px",
    color: "#d0d0d0",
    fontSize: 12,
    fontWeight: 900,
  },
  whiteValue: {
    color: "#fff",
    fontSize: 15,
    display: "block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  greenValue: { color: "#39ff14", fontSize: 18 },
  yellowValue: { color: "#ffcf00", fontSize: 18 },
  redValue: { color: "#ff1744", fontSize: 18 },

  camDropRow: {
    marginTop: 12,
    marginBottom: 12,
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: 12,
  },
  camScreen: {
    border: "1px solid #7a0015",
    borderRadius: 12,
    padding: 12,
    background: "linear-gradient(180deg,#090909,#010101)",
    minHeight: 380,
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    gap: 10,
  },
  videoBox: {
    border: "1px solid #2b2b2b",
    display: "grid",
    placeContent: "center",
    textAlign: "center",
    background: "#030303",
    boxShadow: "inset 0 0 25px rgba(120,0,20,.45)",
    minHeight: 255,
  },
  camOff: {
    color: "#ff1744",
    margin: 0,
    fontSize: 24,
  },
  muted: {
    color: "#aaa",
    margin: "6px 0",
    fontSize: 12,
  },
  mutedCenter: {
    color: "#aaa",
    margin: "0 0 8px",
    fontSize: 12,
    textAlign: "center",
  },
  camMeters: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },

  dropSwitchPanel: {
    border: "1px solid #7a0015",
    borderRadius: 12,
    padding: 12,
    background: "linear-gradient(180deg,#090909,#010101)",
    minHeight: 380,
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    gap: 10,
  },
  dropHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 220px",
    gap: 10,
    alignItems: "center",
  },
  dropButtonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 10,
    alignContent: "stretch",
  },
  dropBottomFill: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 8,
  },

  broadcastSection: {
    border: "1px solid #7a0015",
    borderRadius: 12,
    padding: 12,
    display: "grid",
    gridTemplateColumns: "1.15fr .9fr 1.15fr",
    gap: 12,
    background: "linear-gradient(180deg,#090909,#010101)",
  },
  turntableCard: {
    border: "1px solid #5a0010",
    borderRadius: 10,
    padding: 12,
    background: "#030303",
    boxShadow: "inset 0 0 20px rgba(255,23,68,.12)",
    minHeight: 560,
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
  },
  deckTitle: {
    margin: "0 0 12px",
    color: "#ff1744",
    textAlign: "center",
    fontSize: 20,
    fontWeight: 1000,
  },
  turntableMain: {
    display: "grid",
    gridTemplateColumns: "35px 1fr 35px",
    gap: 10,
    alignItems: "center",
  },
  recordWrap: {
    display: "grid",
    placeContent: "center",
  },
  recordRing: {
    width: 270,
    height: 270,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, #050505 0%, #111 42%, #000 60%, #2b0008 61%, #000 64%)",
    border: "6px solid #333",
    boxShadow: "0 0 35px rgba(180,0,32,.65), inset 0 0 35px #000",
    display: "grid",
    placeContent: "center",
  },
  recordInner: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    border: "2px solid #ff1744",
    display: "grid",
    placeContent: "center",
  },
  logoDot: {
    width: 82,
    height: 82,
    borderRadius: "50%",
    background: "linear-gradient(180deg,#b00020,#43000c)",
    display: "grid",
    placeContent: "center",
    textAlign: "center",
    fontWeight: 1000,
    boxShadow: "0 0 20px rgba(255,23,68,.8)",
  },
  slidersOnDeck: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(12,1fr)",
    gap: 5,
  },
  sliderBox: {
    display: "grid",
    justifyItems: "center",
    gap: 4,
    border: "1px solid #3b000a",
    padding: 5,
    background: "#050505",
    minHeight: 130,
  },
  redVerticalSlider: {
    writingMode: "vertical-lr",
    direction: "rtl",
    height: 82,
    width: 22,
    accentColor: "#ff1744",
  },
  redHorizontalSlider: {
    width: "100%",
    accentColor: "#ff1744",
  },

  centerControl: {
    border: "1px solid #3b000a",
    borderRadius: 10,
    padding: 12,
    background: "#050505",
    minHeight: 560,
    display: "grid",
    gridTemplateRows: "auto auto auto 1fr auto",
    gap: 10,
  },
  nowPlayingBox: {
    border: "1px solid #5a0010",
    borderRadius: 8,
    padding: 12,
    textAlign: "center",
    background: "#030303",
    overflow: "hidden",
  },
  mainBroadcastButtons: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  bigLights: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  lightBox: {
    border: "1px solid #333",
    borderRadius: 8,
    padding: 12,
    textAlign: "center",
    background: "#070707",
    fontWeight: 1000,
  },
  crossFaderBox: {
    border: "1px solid #333",
    borderRadius: 8,
    padding: 10,
    background: "#030303",
    alignSelf: "end",
  },

  levelMeter: {
    width: 18,
    display: "flex",
    flexDirection: "column-reverse",
    gap: 4,
    padding: 4,
    background: "#020202",
    border: "1px solid #333",
    borderRadius: 4,
  },
  levelBlock: {
    height: 8,
    borderRadius: 2,
  },

  greenDotBlink: {
    display: "inline-block",
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#39ff14",
    boxShadow: "0 0 14px #39ff14",
    marginRight: 6,
    animation: "lightBlink .8s infinite",
  },
  redDotBlink: {
    display: "inline-block",
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#ff1744",
    boxShadow: "0 0 14px #ff1744",
    marginRight: 6,
    animation: "lightBlink .8s infinite",
  },
  yellowDotBlink: {
    display: "inline-block",
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#ffcf00",
    boxShadow: "0 0 14px #ffcf00",
    marginRight: 6,
    animation: "lightBlink .8s infinite",
  },
  blueDotBlink: {
    display: "inline-block",
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#38bdf8",
    boxShadow: "0 0 14px #38bdf8",
    marginRight: 6,
    animation: "lightBlink .8s infinite",
  },

  whiteSmall: {
    margin: 0,
    color: "#fff",
    fontWeight: 900,
    fontSize: 11,
    textAlign: "center",
  },

  redButton: button("linear-gradient(180deg,#b00020,#43000c)", "#ff1744", "#fff"),
  greenButton: button("linear-gradient(180deg,#00c853,#003d14)", "#00ff88", "#fff"),
  yellowButton: button("linear-gradient(180deg,#ffcf00,#5a3a00)", "#ffe66d", "#000"),
  blueButton: button("linear-gradient(180deg,#0369a1,#082f49)", "#38bdf8", "#fff"),
  goldButton: button("linear-gradient(180deg,#b77900,#2a1800)", "#ffd34d", "#fff"),
  purpleButton: button("linear-gradient(180deg,#4c1d95,#160029)", "#8b5cf6", "#fff"),
  tealButton: button("linear-gradient(180deg,#0f766e,#022c22)", "#2dd4bf", "#fff"),
  orangeButton: button("linear-gradient(180deg,#c2410c,#2a0a00)", "#fb923c", "#fff"),

  bottomNav: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(7,1fr)",
    gap: 10,
  },
  navBtn: {
    background: "linear-gradient(180deg,#190005,#050505)",
    border: "1px solid #6f0014",
    color: "#fff",
    padding: 14,
    borderRadius: 6,
    fontWeight: 900,
    cursor: "pointer",
  },
  navBtnAlt: {
    background: "linear-gradient(180deg,#1b1b1b,#050505)",
    border: "1px solid #5a0010",
    color: "#fff",
    padding: 14,
    borderRadius: 6,
    fontWeight: 900,
    cursor: "pointer",
  },
};