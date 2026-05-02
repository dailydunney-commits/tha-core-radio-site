"use client";

import { useEffect, useRef, useState } from "react";

const DROP_FILES: Record<string, string> = {
  station_id: "/drops/station-id.mp3",
  dj_drop: "/drops/dj-drop.mp3",
  next_jingle: "/drops/next-jingle.mp3",
  hype_drop: "/drops/hype-drop.mp3",
  sponsor_drop: "/drops/sponsor-drop.mp3",
  ad_drop: "/drops/ad-drop.mp3",
  voice_drop: "/drops/voice-drop.mp3",
};

const LOCAL_BUTTONS: Record<string, string> = {
  video_call: "Video call ready",
  community_chat: "Community chat ready",
  cue: "Cue ready",
  skip_song: "Skip song pressed",
  load_next: "Load next pressed",
  autodj_manager: "AutoDJ manager ready",
  playlist_manager: "Playlist manager ready",
  song_requests: "Song requests ready",
  schedule: "Schedule ready",
  media_library: "Media library ready",
  revenue_tools: "Revenue tools ready",
  website: "Website tools ready",
  settings: "Settings ready",
};

export default function ControlPanelPage() {
  const dropAudioRef = useRef<any>(null);

  const [message, setMessage] = useState("Ready");
  const [volume, setVolume] = useState(1);
  const [bass, setBass] = useState(50);
  const [treble, setTreble] = useState(50);
  const [tempo, setTempo] = useState(0);
  const [pitchA, setPitchA] = useState(0);
  const [pitchB, setPitchB] = useState(0);
  const [autoDjOn, setAutoDjOn] = useState(true);
  const [goLiveOn, setGoLiveOn] = useState(false);
  const [mainPlaying, setMainPlaying] = useState(false);
  const [dropPlaying, setDropPlaying] = useState(false);

  const [liveStatus, setLiveStatus] = useState({
    listeners: "0",
    nowPlaying: "Loading...",
  });

  const stationLive = goLiveOn || mainPlaying || autoDjOn;
  const boardLightsActive = stationLive || dropPlaying;
  const statusText = stationLive ? "ON AIR" : "OFF AIR";

  useEffect(() => {
    async function loadNowPlaying() {
      try {
        const res = await fetch("/api/now-playing", { cache: "no-store" });
        const data = await res.json();

        const song =
          data?.now_playing?.song?.text ||
          data?.nowPlaying ||
          data?.song ||
          "Nothing playing";

        const listeners = data?.listeners?.current ?? data?.listeners ?? "0";

        setLiveStatus({
          listeners: String(listeners),
          nowPlaying: song,
        });
      } catch {
        setLiveStatus((prev) => ({
          ...prev,
          nowPlaying: "Now playing unavailable",
        }));
      }
    }

    loadNowPlaying();
    const timer = setInterval(loadNowPlaying, 10000);
    return () => clearInterval(timer);
  }, []);

  function playDrop(action: string) {
    const file = DROP_FILES[action];
    if (!file) return;

    const current = dropAudioRef.current;

    if (current && current.dataset?.action === action && !current.paused) {
      current.pause();
      current.currentTime = 0;
      setDropPlaying(false);
      setMessage(`Stopped ${action}`);
      return;
    }

    if (current) {
      current.pause();
      current.currentTime = 0;
    }

    const audio: any = new Audio(file);
    audio.volume = volume;
    audio.dataset.action = action;
    dropAudioRef.current = audio;

    audio.onended = () => {
      setDropPlaying(false);
      setMessage(`${action} finished`);
    };

    audio
      .play()
      .then(() => {
        setDropPlaying(true);
        setMessage(`Playing ${action}`);
      })
      .catch(() => {
        setDropPlaying(false);
        setMessage(`Could not play ${file}`);
      });
  }

  async function callAzura(action: string) {
    try {
      await fetch("/api/azuracast/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {}
  }

  function toggleGoLive() {
    const next = !goLiveOn;
    setGoLiveOn(next);
    setMainPlaying(next);
    setMessage(next ? "GO LIVE is ON" : "GO LIVE is OFF");
    callAzura(next ? "go_on_air" : "go_off_air");
  }

  function toggleMainPlay() {
    const next = !mainPlaying;
    setMainPlaying(next);
    setMessage(next ? "Main deck playing" : "Main deck paused/stopped");
  }

  function toggleAutoDj() {
    const next = !autoDjOn;
    setAutoDjOn(next);
    setMessage(next ? "AutoDJ ON" : "AutoDJ OFF");
    callAzura(next ? "start_autodj" : "stop_autodj");
  }

  function sendAction(action: string) {
    if (DROP_FILES[action]) {
      playDrop(action);
      return;
    }

    if (action === "go_on_air") {
      toggleGoLive();
      return;
    }

    if (action === "start_autodj") {
      toggleMainPlay();
      return;
    }

    if (LOCAL_BUTTONS[action]) {
      setMessage(LOCAL_BUTTONS[action]);
      return;
    }

    setMessage(`${action} ready`);
  }

  function stopDrop() {
    if (dropAudioRef.current) {
      dropAudioRef.current.pause();
      dropAudioRef.current.currentTime = 0;
    }

    setDropPlaying(false);
    setMessage("Drop stopped");
  }

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <section style={styles.topBar}>
          <div style={styles.headerBox}>
            <p style={styles.redLabel}>THA CORE CONTROL PANEL</p>
            <h1 style={styles.mainTitle}>Full Station Command Center</h1>
            <p style={styles.subText}>
              Full equipment control: AutoDJ, live status, video call, community
              chat, jingles, drops, volume, bass, treble, decks, mixer, and radio tools.
            </p>
            <p style={styles.statusMessage}>SYSTEM: {message}</p>
          </div>

          <div style={styles.statusTop}>
            <div
              style={
                statusText === "ON AIR"
                  ? styles.onAirStatusBox
                  : styles.offAirBox
              }
            >
              <p style={styles.smallLabel}>STATUS</p>
              <h2
                style={
                  statusText === "ON AIR"
                    ? styles.onAirText
                    : styles.offAir
                }
              >
                {statusText}
              </h2>
            </div>

            <MiniStat label="LISTENERS" value={liveStatus.listeners} />
            <MiniStat label="NOW PLAYING" value={liveStatus.nowPlaying} />
            <MiniStat label="AUTODJ" value={autoDjOn ? "ON" : "OFF"} />
            <MiniStat label="COMMUNITY" value="CHAT ON" />
            <MiniStat label="REVENUE" value="JMD $19000" green />
          </div>
        </section>

        <section style={styles.topActionBar}>
          <button style={styles.videoBtn} onClick={() => sendAction("video_call")}>
            📹 VIDEO CALL
          </button>

          <button style={styles.chatBtn} onClick={() => sendAction("community_chat")}>
            💬 COMMUNITY CHAT
          </button>

          <button
            style={autoDjOn ? styles.autoDjBtn : styles.goLiveTop}
            onClick={toggleAutoDj}
          >
            🤖 AUTODJ {autoDjOn ? "ON" : "OFF"}
          </button>

          <button
            style={goLiveOn ? styles.liveGreenBtn : styles.goLiveTop}
            onClick={toggleGoLive}
          >
            {goLiveOn ? "🟢 LIVE ON" : "▶ GO LIVE"}
          </button>
        </section>

        <section style={styles.eqBar}>
          <div style={styles.eqBox}>
            <p style={styles.whiteSmall}>MASTER VOLUME</p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                const value = Number(e.target.value);
                setVolume(value);
                if (dropAudioRef.current) dropAudioRef.current.volume = value;
              }}
              style={styles.horizontalSlider}
            />
          </div>

          <div style={styles.eqBox}>
            <p style={styles.whiteSmall}>BASS {bass}%</p>
            <input
              type="range"
              min="0"
              max="100"
              value={bass}
              onChange={(e) => setBass(Number(e.target.value))}
              style={styles.horizontalSlider}
            />
          </div>

          <div style={styles.eqBox}>
            <p style={styles.whiteSmall}>TREBLE {treble}%</p>
            <input
              type="range"
              min="0"
              max="100"
              value={treble}
              onChange={(e) => setTreble(Number(e.target.value))}
              style={styles.horizontalSlider}
            />
          </div>

          <button style={styles.stopBtn} onClick={stopDrop}>
            ■ STOP DROP
          </button>
        </section>

        <section style={styles.mainGrid}>
          <div style={styles.panel}>
            <div style={styles.videoBox}>
              <h3 style={styles.camOff}>CAM OFF</h3>
              <p style={styles.muted}>DJ / Guest Video Feed</p>
            </div>

            <h3 style={styles.autoDj}>
              🤖 SMART AUTODJ {autoDjOn ? "ON" : "OFF"}
            </h3>

            <div style={styles.quickGrid}>
              <button style={styles.darkBtn} onClick={() => sendAction("station_id")}>STATION ID</button>
              <button style={styles.purpleBtn} onClick={() => sendAction("dj_drop")}>DJ DROP</button>
              <button style={styles.orangeBtn} onClick={() => sendAction("hype_drop")}>HYPE</button>
              <button style={styles.goldBtn} onClick={() => sendAction("sponsor_drop")}>SPONSOR</button>
              <button style={styles.blueBtn} onClick={() => sendAction("ad_drop")}>AD</button>
              <button style={styles.greenBtn} onClick={() => sendAction("voice_drop")}>VOICE</button>
            </div>
          </div>

          <div style={styles.deckPanel}>
            <h2 style={styles.deckTitle}>MAIN BROADCAST DECK</h2>

            <div style={styles.broadcastDeck}>
              <div style={styles.meterPair}>
                <LevelMeter active={boardLightsActive} />
                <LevelMeter active={boardLightsActive} />
              </div>

              <div style={styles.mainTurntable}>
                <div style={boardLightsActive ? styles.recordRingLive : styles.recordRing}>
                  <div style={styles.recordInner}>
                    <div style={styles.logoDot}>THA<br />CORE</div>
                  </div>
                </div>
              </div>

              <div style={styles.pitchCol}>
                <p style={styles.muted}>TEMPO</p>
                <p style={styles.whiteSmall}>{tempo.toFixed(2)}%</p>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="0.01"
                  value={tempo}
                  onChange={(e) => setTempo(Number(e.target.value))}
                  style={styles.verticalRange}
                />
              </div>
            </div>

            <div style={styles.deckControls}>
              <button
                style={mainPlaying ? styles.playGreenBtn : styles.playRedBtn}
                onClick={toggleMainPlay}
              >
                {mainPlaying ? "🟢 PLAYING" : "🔴 PLAY/PAUSE"}
              </button>

              <button style={styles.purpleBtn} onClick={() => sendAction("cue")}>CUE</button>

              <button style={styles.goLiveSmall} onClick={() => sendAction("skip_song")}>
                SKIP SONG
              </button>

              <button
                style={goLiveOn ? styles.liveGreenBtn : styles.onAirBtn}
                onClick={toggleGoLive}
              >
                {goLiveOn ? "🟢 ON AIR" : "🎙 ON AIR"}
              </button>
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.deckTitle}>JINGLES / DROPS</h2>

            <div style={styles.dropList}>
              {[
                ["♪ STATION ID", "station_id"],
                ["♪ DJ DROP", "dj_drop"],
                ["♪ NEXT JINGLE", "next_jingle"],
                ["♪ HYPE DROP", "hype_drop"],
                ["♪ SPONSOR DROP", "sponsor_drop"],
                ["♪ AD DROP", "ad_drop"],
                ["♪ VOICE DROP", "voice_drop"],
              ].map(([item, action], index) => (
                <button
                  key={item}
                  onClick={() => sendAction(action)}
                  style={[
                    styles.dropBtn,
                    styles.dropBtnAlt,
                    styles.dropBtnGold,
                    styles.dropBtnBlue,
                  ][index % 4]}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section style={styles.lowerGrid}>
          <SmallDeck
            title="DECK A — LIVE"
            button="SKIP SONG"
            action="skip_song"
            pitch={pitchA}
            setPitch={setPitchA}
            audioActive={boardLightsActive}
            sendAction={sendAction}
          />

          <SmallDeck
            title="DECK B — NEXT"
            button="LOAD NEXT"
            action="load_next"
            pitch={pitchB}
            setPitch={setPitchB}
            audioActive={boardLightsActive}
            sendAction={sendAction}
          />

          <div style={styles.mixerPanel}>
            <h2 style={styles.deckTitle}>COMPACT MIXER</h2>
            <div style={styles.mixerGrid}>
              <Mixer name="MAIN" sendAction={sendAction} />
              <Mixer name="JINGLES" sendAction={sendAction} />
              <Mixer name="VOICE" sendAction={sendAction} />
              <Mixer name="ADS" sendAction={sendAction} />
            </div>
          </div>
        </section>

        <section style={styles.bottomNav}>
          {[
            ["🤖 AUTODJ MANAGER", "autodj_manager"],
            ["🎵 PLAYLIST MANAGER", "playlist_manager"],
            ["▤ SONG REQUESTS", "song_requests"],
            ["📅 SCHEDULE", "schedule"],
            ["📁 MEDIA LIBRARY", "media_library"],
            ["$ REVENUE TOOLS", "revenue_tools"],
            ["🌐 WEBSITE", "website"],
            ["⚙ SETTINGS", "settings"],
          ].map(([item, action], index) => (
            <button
              key={item}
              onClick={() => sendAction(action)}
              style={index % 2 === 0 ? styles.navBtn : styles.navBtnAlt}
            >
              {item}
            </button>
          ))}
        </section>
      </section>

      <style>{`
        @keyframes meterBlink {
          0% { opacity: .25; transform: scaleY(.85); }
          50% { opacity: 1; transform: scaleY(1.15); }
          100% { opacity: .35; transform: scaleY(.9); }
        }

        @keyframes recordPulse {
          0% { box-shadow: 0 0 25px rgba(180,0,32,.65), inset 0 0 35px #000; }
          50% { box-shadow: 0 0 55px rgba(255,23,68,1), inset 0 0 45px #000; }
          100% { box-shadow: 0 0 25px rgba(180,0,32,.65), inset 0 0 35px #000; }
        }
      `}</style>
    </main>
  );
}

function MiniStat({ label, value, green }: any) {
  return (
    <div style={styles.miniStat}>
      <p style={styles.smallLabel}>{label}</p>
      <strong style={green ? styles.greenValue : styles.whiteValue}>{value}</strong>
    </div>
  );
}

function LevelMeter({ active }: any) {
  return (
    <div style={styles.levelMeter}>
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          style={{
            ...styles.levelBlock,
            background: i > 13 ? "#ff2020" : i > 9 ? "#ffcf00" : "#39ff14",
            animation: active ? `meterBlink ${0.25 + i * 0.02}s infinite` : "none",
          }}
        />
      ))}
    </div>
  );
}

function SmallDeck({ title, button, action, sendAction, pitch, setPitch, audioActive }: any) {
  return (
    <div style={styles.smallDeck}>
      <h2 style={styles.deckTitle}>{title}</h2>

      <div style={styles.smallDeckBody}>
        <LevelMeter active={audioActive} />

        <div style={styles.smallRecord}>
          <div style={styles.smallRecordInner}>
            <div style={styles.smallLogo}>THA<br />CORE</div>
          </div>
        </div>

        <div style={styles.pitchCol}>
          <p style={styles.muted}>PITCH</p>
          <p style={styles.whiteSmall}>{pitch.toFixed(1)}%</p>
          <input
            type="range"
            min="-20"
            max="20"
            step="0.1"
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            style={styles.verticalRangeSmall}
          />
        </div>
      </div>

      <button style={styles.goLive} onClick={() => sendAction(action)}>
        {button}
      </button>
    </div>
  );
}

function Mixer({ name, sendAction }: any) {
  const actionBase = name.toLowerCase();
  const [level, setLevel] = useState(50);

  return (
    <div style={styles.mixerStrip}>
      <p style={styles.whiteSmall}>{name}</p>
      <div style={styles.knob} />

      <button style={styles.tinyBtn} onClick={() => setLevel(Math.max(0, level - 5))}>−</button>
      <button style={styles.tinyBtn} onClick={() => setLevel(Math.min(100, level + 5))}>+</button>

      <input
        type="range"
        min="0"
        max="100"
        value={level}
        onChange={(e) => setLevel(Number(e.target.value))}
        style={styles.verticalMixer}
      />

      <button
        style={styles.tinyBtn}
        onClick={() => {
          setLevel(0);
          sendAction(`${actionBase}_mute`);
        }}
      >
        MUTE
      </button>
    </div>
  );
}

const styles: any = {
  page: { minHeight: "100vh", background: "radial-gradient(circle at top left, rgba(120,0,20,.28), transparent 30%), #010101", color: "#fff", padding: 14, fontFamily: "Arial, Helvetica, sans-serif" },
  shell: { border: "2px solid #7a0015", borderRadius: 18, padding: 16, boxShadow: "0 0 35px rgba(120,0,20,.55)", background: "linear-gradient(180deg,#030303,#000)" },
  topBar: { display: "grid", gridTemplateColumns: "1.1fr 1.9fr", gap: 18, alignItems: "stretch" },
  headerBox: { padding: 12 },
  redLabel: { margin: 0, color: "#ff1744", fontWeight: 900, fontSize: 20 },
  mainTitle: { margin: "10px 0", fontSize: 46, fontWeight: 1000, lineHeight: 1 },
  subText: { color: "#f5f5f5", fontSize: 16, lineHeight: 1.5 },
  statusMessage: { marginTop: 12, color: "#39ff14", fontWeight: 900, fontSize: 14 },
  statusTop: { border: "1px solid #7a0015", borderRadius: 14, padding: 12, display: "grid", gridTemplateColumns: "1.1fr 1fr 1.6fr 1fr 1fr 1fr", gap: 8, background: "rgba(0,0,0,.85)", minWidth: 0 },
  offAirBox: { border: "1px solid #ff1744", padding: 12, textAlign: "center", background: "linear-gradient(180deg,#30000a,#120006)", boxShadow: "0 0 25px rgba(255,23,68,.45)" },
  onAirStatusBox: { border: "1px solid #39ff14", padding: 12, textAlign: "center", background: "linear-gradient(180deg,#002b10,#001406)", boxShadow: "0 0 25px rgba(57,255,20,.45)" },
  offAir: { margin: 0, color: "#ff1744", fontSize: 34, fontWeight: 1000 },
  onAirText: { margin: 0, color: "#39ff14", fontSize: 34, fontWeight: 1000 },
  miniStat: { border: "1px solid #3b000a", padding: 12, textAlign: "center", background: "linear-gradient(180deg,#111,#030303)", overflow: "hidden" },
  smallLabel: { margin: "0 0 8px", color: "#d0d0d0", fontSize: 12, fontWeight: 900 },
  whiteValue: { color: "#fff", fontSize: 15, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  greenValue: { color: "#39ff14", fontSize: 18 },
  topActionBar: { margin: "14px 0", border: "1px solid #3b000a", borderRadius: 10, padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, background: "linear-gradient(180deg,#070707,#000)" },
  eqBar: { margin: "0 0 14px", border: "1px solid #3b000a", borderRadius: 10, padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, background: "linear-gradient(180deg,#050505,#000)" },
  eqBox: { border: "1px solid #5a0010", borderRadius: 8, padding: 10, background: "linear-gradient(180deg,#111,#030303)" },
  horizontalSlider: { width: "100%" },
  stopBtn: { background: "linear-gradient(180deg,#b00020,#43000c)", color: "#fff", border: "1px solid #ff1744", borderRadius: 8, padding: "12px 18px", fontWeight: 1000, cursor: "pointer" },
  mainGrid: { display: "grid", gridTemplateColumns: "1.05fr 1.55fr .8fr", gap: 12 },
  panel: { border: "1px solid #7a0015", borderRadius: 8, padding: 14, background: "linear-gradient(180deg,#090909,#010101)" },
  videoBox: { height: 240, border: "1px solid #2b2b2b", marginTop: 0, display: "grid", placeContent: "center", textAlign: "center", background: "#030303", boxShadow: "inset 0 0 25px rgba(120,0,20,.45)" },
  camOff: { color: "#ff1744", margin: 0, fontSize: 24 },
  muted: { color: "#aaa", margin: "6px 0", fontSize: 12 },
  goLive: { width: "100%", marginTop: 14, background: "linear-gradient(180deg,#d00024,#5a0010)", border: "1px solid #ff1744", borderRadius: 6, color: "#fff", padding: 16, fontWeight: 1000, fontSize: 16, cursor: "pointer", boxShadow: "0 0 22px rgba(180,0,32,.55)" },
  goLiveTop: { background: "linear-gradient(180deg,#d00024,#5a0010)", border: "1px solid #ff1744", borderRadius: 8, color: "#fff", padding: "14px 20px", fontWeight: 1000, fontSize: 16, cursor: "pointer", boxShadow: "0 0 22px rgba(180,0,32,.55)" },
  liveGreenBtn: { background: "linear-gradient(180deg,#00c853,#003d14)", border: "1px solid #00ff88", borderRadius: 8, color: "#fff", padding: "14px 20px", fontWeight: 1000, fontSize: 16, cursor: "pointer", boxShadow: "0 0 22px rgba(0,255,120,.55)" },
  playGreenBtn: { background: "linear-gradient(180deg,#00c853,#003d14)", border: "1px solid #00ff88", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 1000, cursor: "pointer" },
  playRedBtn: { background: "linear-gradient(180deg,#b00020,#43000c)", border: "1px solid #ff1744", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 1000, cursor: "pointer" },
  autoDjBtn: { background: "linear-gradient(180deg,#00c853,#003d14)", border: "1px solid #00ff88", borderRadius: 8, color: "#fff", padding: "14px 20px", fontWeight: 1000, fontSize: 15, cursor: "pointer", boxShadow: "0 0 18px rgba(0,255,120,.5)" },
  goLiveSmall: { background: "linear-gradient(180deg,#d00024,#5a0010)", border: "1px solid #ff1744", borderRadius: 6, color: "#fff", padding: 14, fontWeight: 1000, cursor: "pointer", boxShadow: "0 0 16px rgba(180,0,32,.45)" },
  onAirBtn: { background: "linear-gradient(180deg,#300,#070707)", border: "1px solid #ff1744", color: "#ffd34d", padding: 14, borderRadius: 6, fontWeight: 1000, cursor: "pointer" },
  autoDj: { color: "#39ff14", textAlign: "center", fontSize: 18, margin: "18px 0" },
  quickGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  darkBtn: { background: "linear-gradient(180deg,#1b1b1b,#050505)", border: "1px solid #5a0010", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 900, cursor: "pointer" },
  videoBtn: { background: "linear-gradient(180deg,#b00020,#43000c)", border: "1px solid #ff1744", color: "#fff", padding: 14, borderRadius: 8, fontWeight: 900, cursor: "pointer" },
  chatBtn: { background: "linear-gradient(180deg,#7a0015,#1a0005)", border: "1px solid #ff5577", color: "#fff", padding: 14, borderRadius: 8, fontWeight: 900, cursor: "pointer" },
  purpleBtn: { background: "linear-gradient(180deg,#4c1d95,#160029)", border: "1px solid #8b5cf6", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 900, cursor: "pointer" },
  orangeBtn: { background: "linear-gradient(180deg,#c2410c,#2a0a00)", border: "1px solid #fb923c", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 900, cursor: "pointer" },
  goldBtn: { background: "linear-gradient(180deg,#b77900,#2a1800)", border: "1px solid #ffd34d", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 900, cursor: "pointer" },
  blueBtn: { background: "linear-gradient(180deg,#1d4ed8,#001333)", border: "1px solid #60a5fa", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 900, cursor: "pointer" },
  greenBtn: { background: "linear-gradient(180deg,#15803d,#001c0b)", border: "1px solid #4ade80", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 900, cursor: "pointer" },
  deckPanel: { border: "1px solid #7a0015", borderRadius: 8, padding: 14, background: "linear-gradient(180deg,#090909,#010101)", boxShadow: "0 0 20px rgba(120,0,20,.35)" },
  deckTitle: { margin: "0 0 12px", color: "#ff1744", textAlign: "center", fontSize: 20, fontWeight: 1000 },
  broadcastDeck: { minHeight: 300, border: "1px solid #2b2b2b", display: "grid", gridTemplateColumns: "70px 1fr 70px", gap: 12, alignItems: "center", padding: 14, background: "#040404" },
  meterPair: { display: "flex", gap: 8, justifyContent: "center" },
  levelMeter: { width: 18, display: "flex", flexDirection: "column-reverse", gap: 4, padding: 4, background: "#020202", border: "1px solid #333", borderRadius: 4 },
  levelBlock: { height: 8, borderRadius: 2 },
  mainTurntable: { display: "grid", placeContent: "center" },
  recordRing: { width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, #050505 0%, #111 42%, #000 60%, #2b0008 61%, #000 64%)", border: "6px solid #333", boxShadow: "0 0 35px rgba(180,0,32,.65), inset 0 0 35px #000", display: "grid", placeContent: "center" },
  recordRingLive: { width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, #050505 0%, #111 42%, #000 60%, #2b0008 61%, #000 64%)", border: "6px solid #333", animation: "recordPulse .7s infinite", display: "grid", placeContent: "center" },
  recordInner: { width: 130, height: 130, borderRadius: "50%", border: "2px solid #ff1744", display: "grid", placeContent: "center" },
  logoDot: { width: 86, height: 86, borderRadius: "50%", background: "linear-gradient(180deg,#b00020,#43000c)", display: "grid", placeContent: "center", textAlign: "center", fontWeight: 1000, boxShadow: "0 0 20px rgba(255,23,68,.8)" },
  pitchCol: { display: "grid", justifyItems: "center", gap: 8 },
  whiteSmall: { margin: 0, color: "#fff", fontWeight: 900, fontSize: 12, textAlign: "center" },
  verticalRange: { writingMode: "vertical-lr", direction: "rtl", height: 140, width: 22 },
  verticalRangeSmall: { writingMode: "vertical-lr", direction: "rtl", height: 100, width: 22 },
  deckControls: { marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr 1fr", gap: 10 },
  dropList: { display: "grid", gap: 10 },
  dropBtn: { background: "linear-gradient(180deg,#1c1c1c,#060606)", border: "1px solid #6f0014", color: "#fff", padding: 16, textAlign: "left", fontWeight: 900, borderRadius: 4 },
  dropBtnAlt: { background: "linear-gradient(180deg,#4c1d95,#160029)", border: "1px solid #8b5cf6", color: "#fff", padding: 16, textAlign: "left", fontWeight: 900, borderRadius: 4 },
  dropBtnGold: { background: "linear-gradient(180deg,#b77900,#2a1800)", border: "1px solid #ffd34d", color: "#fff", padding: 16, textAlign: "left", fontWeight: 900, borderRadius: 4 },
  dropBtnBlue: { background: "linear-gradient(180deg,#1d4ed8,#001333)", border: "1px solid #60a5fa", color: "#fff", padding: 16, textAlign: "left", fontWeight: 900, borderRadius: 4 },
  lowerGrid: { marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 12 },
  smallDeck: { border: "1px solid #7a0015", borderRadius: 8, padding: 14, background: "linear-gradient(180deg,#090909,#010101)" },
  smallDeckBody: { border: "1px solid #2b2b2b", padding: 12, display: "grid", gridTemplateColumns: "40px 1fr 50px", alignItems: "center", gap: 10 },
  smallRecord: { width: 190, height: 190, margin: "0 auto", borderRadius: "50%", border: "5px solid #333", background: "radial-gradient(circle,#111,#000)", boxShadow: "0 0 25px rgba(180,0,32,.65)", display: "grid", placeContent: "center" },
  smallRecordInner: { width: 82, height: 82, borderRadius: "50%", border: "2px solid #ff1744", display: "grid", placeContent: "center" },
  smallLogo: { width: 58, height: 58, borderRadius: "50%", background: "#b00020", display: "grid", placeContent: "center", fontSize: 11, fontWeight: 1000, textAlign: "center" },
  mixerPanel: { border: "1px solid #7a0015", borderRadius: 8, padding: 14, background: "linear-gradient(180deg,#090909,#010101)" },
  mixerGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", border: "1px solid #2b2b2b" },
  mixerStrip: { borderRight: "1px solid #2b2b2b", padding: 10, textAlign: "center" },
  knob: { width: 48, height: 48, borderRadius: "50%", margin: "10px auto", background: "radial-gradient(circle,#333,#000)", border: "2px solid #7a0015" },
  tinyBtn: { margin: 4, background: "#080808", color: "#fff", border: "1px solid #5a0010", padding: "6px 10px", borderRadius: 4, fontWeight: 900, cursor: "pointer" },
  verticalMixer: { writingMode: "vertical-lr", direction: "rtl", height: 115, width: 22, margin: "8px auto" },
  bottomNav: { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 10 },
  navBtn: { background: "linear-gradient(180deg,#190005,#050505)", border: "1px solid #6f0014", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 900, cursor: "pointer" },
  navBtnAlt: { background: "linear-gradient(180deg,#1b1b1b,#050505)", border: "1px solid #5a0010", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 900, cursor: "pointer" },
};