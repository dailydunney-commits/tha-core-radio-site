"use client";

import { useMemo, useRef, useState } from "react";

type DeckMode = "idle" | "cue" | "live";
type LogItem = {
  id: number;
  time: string;
  message: string;
};

const STREAM_URL =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  "http://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

const jingles = [
  { label: "Station ID", type: "Jingle", tone: "Tha Core Online Radio" },
  { label: "DJ Drop", type: "Drop", tone: "DJ Daily Bread in the building" },
  { label: "Promo Shot", type: "Promo", tone: "Promote your music on Tha Core" },
  { label: "Breaking", type: "Alert", tone: "Breaking news drop ready" },
  { label: "Ad Break", type: "Commercial", tone: "Commercial break loaded" },
  { label: "Request Line", type: "Listener", tone: "Song request line open" },
  { label: "Weather", type: "Reader", tone: "Weather reader ready" },
  { label: "Time Check", type: "Reader", tone: "Time announcement ready" },
];

const quickActions = [
  "Upload Music",
  "Build Playlist",
  "Schedule Show",
  "Song Request",
  "Mic Check",
  "Record Drop",
  "News Reader",
  "Weather Reader",
  "Time Reader",
  "Commercials",
  "Live Chat",
  "Emergency Stop",
];

export default function OwnerControlPanelPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [onAir, setOnAir] = useState(false);
  const [autoDj, setAutoDj] = useState(true);
  const [micLive, setMicLive] = useState(false);
  const [monitor, setMonitor] = useState(true);

  const [deckA, setDeckA] = useState<DeckMode>("cue");
  const [deckB, setDeckB] = useState<DeckMode>("idle");

  const [volume, setVolume] = useState(72);
  const [tempo, setTempo] = useState(50);
  const [bass, setBass] = useState(64);
  const [mid, setMid] = useState(58);
  const [treble, setTreble] = useState(61);
  const [crossfade, setCrossfade] = useState(50);

  const [displayMode, setDisplayMode] = useState("LIVE CONTROL");
  const [screenText, setScreenText] = useState(
    "Studio ready. Stream monitor standing by."
  );

  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: 1,
      time: "Now",
      message: "Control room loaded for Tha Core Online Radio.",
    },
  ]);

  const nowPlaying = useMemo(() => {
    if (onAir && isPlaying) return "LIVE FROM THA CORE • Stream active";
    if (autoDj) return "AutoDJ standing by • Playlist ready";
    return "Manual studio mode • Waiting for live control";
  }, [onAir, isPlaying, autoDj]);

  function stamp() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function addLog(message: string) {
    setLogs((current) => [
      { id: Date.now(), time: stamp(), message },
      ...current.slice(0, 8),
    ]);
  }

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setOnAir(false);
      setDeckA("cue");
      setDeckB("idle");
      setScreenText("Broadcast monitor paused. Studio is off air.");
      addLog("Main stream monitor paused. On Air status turned off.");
      return;
    }

    try {
      audio.volume = volume / 100;
      await audio.play();
      setIsPlaying(true);
      setOnAir(true);
      setDeckA("live");
      setDeckB(autoDj ? "cue" : "idle");
      setScreenText("Main stream monitor playing. Tha Core is ON AIR.");
      addLog("Main stream monitor started. On Air status active.");
    } catch {
      setScreenText(
        "Browser blocked playback. Click again or check stream URL / HTTPS."
      );
      addLog("Playback blocked by browser or stream connection.");
    }
  }

  function toggleAutoDj() {
    setAutoDj((value) => {
      const next = !value;
      setDeckB(next ? "cue" : "idle");
      setScreenText(next ? "Smart AutoDJ switched on." : "Smart AutoDJ switched off.");
      addLog(next ? "Smart AutoDJ switched on." : "Smart AutoDJ switched off.");
      return next;
    });
  }

  function triggerPad(pad: { label: string; type: string; tone: string }) {
    setDisplayMode(pad.type.toUpperCase());
    setScreenText(`${pad.label}: ${pad.tone}`);
    addLog(`${pad.type} triggered: ${pad.label}`);
  }

  function runQuickAction(action: string) {
    setDisplayMode(action.toUpperCase());

    if (action === "Emergency Stop") {
      audioRef.current?.pause();
      setIsPlaying(false);
      setOnAir(false);
      setMicLive(false);
      setDeckA("idle");
      setDeckB("idle");
      setScreenText("Emergency stop pressed. Studio output is now safe.");
      addLog("Emergency stop pressed.");
      return;
    }

    if (action === "Mic Check") {
      setMicLive((value) => !value);
      setScreenText(!micLive ? "Mic channel armed for live talk." : "Mic channel muted.");
      addLog(!micLive ? "Mic channel armed." : "Mic channel muted.");
      return;
    }

    setScreenText(`${action} panel selected. Ready for next connection.`);
    addLog(`${action} selected.`);
  }

  function updateVolume(value: number) {
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value / 100;
  }

  return (
    <main className="control-page">
      <audio ref={audioRef} src={STREAM_URL} preload="none" />

      <section className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">OWNER CONTROL ROOM</p>
            <h1>Tha Core Online Radio</h1>
            <p className="subtitle">
              Red, black, and yellow studio dashboard built for live control,
              AutoDJ, drops, jingles, monitoring, and broadcast energy.
            </p>
          </div>

          <div className="brand-badge">
            <div className="crown">♛</div>
            <div>
              <strong>TC</strong>
              <span>Studio Live</span>
            </div>
          </div>
        </header>

        <section className="status-grid">
          <div className="status-card hot">
            <span className={onAir ? "light green" : "light red"} />
            <small>ON AIR</small>
            <strong>{onAir ? "LIVE" : "OFF AIR"}</strong>
          </div>

          <div className="status-card">
            <span className={autoDj ? "light yellow" : "light red"} />
            <small>SMART AUTODJ</small>
            <strong>{autoDj ? "ACTIVE" : "OFF"}</strong>
          </div>

          <div className="status-card">
            <span className={micLive ? "light green" : "light red"} />
            <small>MIC CHANNEL</small>
            <strong>{micLive ? "ARMED" : "MUTED"}</strong>
          </div>

          <div className="status-card">
            <span className={monitor ? "light green" : "light red"} />
            <small>MONITOR</small>
            <strong>{monitor ? "ON" : "OFF"}</strong>
          </div>
        </section>

        <section className="studio-board">
          <div className="left-rack">
            <div className="screen">
              <div className="screen-top">
                <span>{displayMode}</span>
                <b>{onAir ? "BROADCASTING" : "STANDBY"}</b>
              </div>

              <div className="screen-body">
                <p className="now-label">NOW PLAYING / STATUS</p>
                <h2>{nowPlaying}</h2>
                <p>{screenText}</p>
              </div>

              <div className="ticker">
                <span>
                  THA CORE ONLINE RADIO • LIVE MUSIC • JINGLES • DROPS • ADS •
                  REQUESTS • NEWS • WEATHER • TIME READER •
                </span>
              </div>
            </div>

            <div className="camera-box">
              <div className="camera-header">
                <span>Studio Cam</span>
                <b>{micLive ? "MIC LIVE" : "CAM READY"}</b>
              </div>
              <div className="camera-visual">
                <div className="equalizer">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <p>Live studio window / video call area</p>
              </div>
            </div>
          </div>

          <div className="deck-area">
            <Turntable
              title="DECK A"
              mode={deckA}
              active={isPlaying && deckA === "live"}
              label="MAIN STREAM"
            />

            <div className="mixer">
              <button
                type="button"
                onClick={togglePlay}
                className={isPlaying ? "main-power active" : "main-power"}
              >
                <span>{isPlaying ? "STOP" : "PLAY"}</span>
                <b>{isPlaying ? "ON AIR" : "GO LIVE"}</b>
              </button>

              <button
                type="button"
                onClick={toggleAutoDj}
                className={autoDj ? "auto-switch active" : "auto-switch"}
              >
                <span>SMART AUTODJ</span>
                <b>{autoDj ? "ON" : "OFF"}</b>
              </button>

              <div className="slider-bank">
                <ControlSlider
                  label="Volume"
                  value={volume}
                  setValue={updateVolume}
                />
                <ControlSlider label="Tempo" value={tempo} setValue={setTempo} />
                <ControlSlider label="Bass" value={bass} setValue={setBass} />
                <ControlSlider label="Mid" value={mid} setValue={setMid} />
                <ControlSlider
                  label="Treble"
                  value={treble}
                  setValue={setTreble}
                />
              </div>

              <div className="crossfader">
                <div>
                  <span>Deck A</span>
                  <b>{crossfade < 45 ? "HOT" : "READY"}</b>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={crossfade}
                  onChange={(event) => setCrossfade(Number(event.target.value))}
                />
                <div>
                  <span>Deck B</span>
                  <b>{crossfade > 55 ? "HOT" : "READY"}</b>
                </div>
              </div>

              <div className="mini-switches">
                <button
                  type="button"
                  onClick={() => {
                    setMonitor((value) => !value);
                    addLog(!monitor ? "Studio monitor switched on." : "Studio monitor switched off.");
                  }}
                >
                  Monitor {monitor ? "On" : "Off"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMicLive((value) => !value);
                    addLog(!micLive ? "Mic armed." : "Mic muted.");
                  }}
                >
                  Mic {micLive ? "Mute" : "Arm"}
                </button>
              </div>
            </div>

            <Turntable
              title="DECK B"
              mode={deckB}
              active={autoDj && deckB !== "idle"}
              label="AUTODJ / JINGLES"
            />
          </div>

          <div className="right-rack">
            <div className="jingle-panel">
              <div className="panel-heading">
                <span>One Click Pads</span>
                <b>Jingles / Ads / Drops</b>
              </div>

              <div className="pads">
                {jingles.map((pad) => (
                  <button
                    key={pad.label}
                    type="button"
                    onClick={() => triggerPad(pad)}
                  >
                    <small>{pad.type}</small>
                    <strong>{pad.label}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="meter-panel">
              <div className="panel-heading">
                <span>Live Levels</span>
                <b>Studio Meter</b>
              </div>

              <div className={isPlaying ? "vu active" : "vu"}>
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>

              <div className="signal-row">
                <span>Stream</span>
                <b>{isPlaying ? "Good" : "Idle"}</b>
              </div>
              <div className="signal-row">
                <span>AutoDJ</span>
                <b>{autoDj ? "Ready" : "Manual"}</b>
              </div>
              <div className="signal-row">
                <span>Requests</span>
                <b>Open</b>
              </div>
            </div>
          </div>
        </section>

        <section className="bottom-grid">
          <div className="actions-panel">
            <div className="panel-heading">
              <span>Radio Control Buttons</span>
              <b>Quick Access</b>
            </div>

            <div className="action-buttons">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => runQuickAction(action)}
                  className={action === "Emergency Stop" ? "danger" : ""}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div className="log-panel">
            <div className="panel-heading">
              <span>Control Log</span>
              <b>Recent Moves</b>
            </div>

            <div className="logs">
              {logs.map((log) => (
                <div key={log.id} className="log-item">
                  <span>{log.time}</span>
                  <p>{log.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="revenue-panel">
            <div className="panel-heading">
              <span>Station Pulse</span>
              <b>Owner View</b>
            </div>

            <div className="pulse-list">
              <div>
                <span>Listeners Now</span>
                <strong>{onAir ? "127" : "0"}</strong>
              </div>
              <div>
                <span>Song Requests</span>
                <strong>18</strong>
              </div>
              <div>
                <span>Ad Slots Today</span>
                <strong>6</strong>
              </div>
              <div>
                <span>Promo Revenue</span>
                <strong>JMD $12,500</strong>
              </div>
            </div>
          </div>
        </section>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .control-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(255, 208, 0, 0.22), transparent 32%),
            radial-gradient(circle at top right, rgba(255, 0, 0, 0.28), transparent 30%),
            linear-gradient(135deg, #090000 0%, #160000 38%, #050505 100%);
          color: #fff7d6;
          padding: 24px;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .shell {
          width: min(1800px, 100%);
          margin: 0 auto;
          border: 1px solid rgba(255, 213, 0, 0.28);
          border-radius: 34px;
          padding: 24px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent),
            rgba(12, 0, 0, 0.86);
          box-shadow:
            0 0 80px rgba(255, 0, 0, 0.24),
            inset 0 0 50px rgba(255, 213, 0, 0.04);
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 22px;
          border-radius: 28px;
          background:
            linear-gradient(90deg, rgba(255, 0, 0, 0.28), rgba(255, 214, 0, 0.1)),
            #100000;
          border: 1px solid rgba(255, 213, 0, 0.25);
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #ffd500;
          font-weight: 900;
          letter-spacing: 0.25em;
          font-size: 12px;
        }

        h1 {
          margin: 0;
          font-size: clamp(34px, 5vw, 74px);
          line-height: 0.9;
          color: #fff;
          text-transform: uppercase;
          text-shadow:
            0 0 18px rgba(255, 0, 0, 0.9),
            0 0 36px rgba(255, 213, 0, 0.32);
        }

        .subtitle {
          margin: 14px 0 0;
          max-width: 860px;
          color: #ffeeb0;
          font-size: 16px;
          line-height: 1.6;
        }

        .brand-badge {
          min-width: 190px;
          height: 120px;
          border-radius: 26px;
          background:
            radial-gradient(circle, rgba(255, 213, 0, 0.25), transparent 55%),
            #050505;
          border: 1px solid rgba(255, 213, 0, 0.5);
          display: grid;
          place-items: center;
          text-align: center;
          box-shadow: 0 0 34px rgba(255, 213, 0, 0.2);
        }

        .crown {
          color: #ffd500;
          font-size: 30px;
          line-height: 1;
        }

        .brand-badge strong {
          display: block;
          font-size: 36px;
          color: #ff1f1f;
          text-shadow: 0 0 12px rgba(255, 0, 0, 0.85);
        }

        .brand-badge span {
          display: block;
          color: #ffd500;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin: 18px 0;
        }

        .status-card {
          min-height: 105px;
          border-radius: 24px;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.01)),
            #100;
          border: 1px solid rgba(255, 213, 0, 0.22);
          padding: 18px;
          position: relative;
          overflow: hidden;
        }

        .status-card.hot {
          border-color: rgba(255, 0, 0, 0.65);
          box-shadow: 0 0 28px rgba(255, 0, 0, 0.18);
        }

        .status-card small {
          display: block;
          margin-left: 34px;
          color: #ffdb57;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .status-card strong {
          display: block;
          margin-top: 12px;
          font-size: 31px;
          color: #fff;
        }

        .light {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          position: absolute;
          top: 18px;
          left: 18px;
          box-shadow: 0 0 18px currentColor;
        }

        .green {
          color: #00ff76;
          background: #00ff76;
        }

        .red {
          color: #ff1b1b;
          background: #ff1b1b;
        }

        .yellow {
          color: #ffd500;
          background: #ffd500;
        }

        .studio-board {
          display: grid;
          grid-template-columns: 1fr 2.1fr 1fr;
          gap: 18px;
          align-items: stretch;
        }

        .left-rack,
        .right-rack {
          display: grid;
          gap: 18px;
        }

        .screen,
        .camera-box,
        .jingle-panel,
        .meter-panel,
        .actions-panel,
        .log-panel,
        .revenue-panel {
          border-radius: 28px;
          background:
            linear-gradient(145deg, rgba(255, 213, 0, 0.07), rgba(255, 0, 0, 0.06)),
            #080000;
          border: 1px solid rgba(255, 213, 0, 0.24);
          box-shadow: inset 0 0 30px rgba(255, 255, 255, 0.035);
        }

        .screen {
          min-height: 360px;
          overflow: hidden;
        }

        .screen-top,
        .camera-header,
        .panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255, 213, 0, 0.16);
        }

        .screen-top span,
        .camera-header span,
        .panel-heading span {
          color: #ffd500;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.17em;
          text-transform: uppercase;
        }

        .screen-top b,
        .camera-header b,
        .panel-heading b {
          color: #fff;
          font-size: 12px;
          text-transform: uppercase;
        }

        .screen-body {
          padding: 28px 20px;
          min-height: 240px;
          background:
            repeating-linear-gradient(
              0deg,
              rgba(255, 213, 0, 0.035),
              rgba(255, 213, 0, 0.035) 1px,
              transparent 1px,
              transparent 8px
            );
        }

        .now-label {
          margin: 0 0 12px;
          color: #ff3434;
          font-weight: 900;
          letter-spacing: 0.18em;
          font-size: 12px;
        }

        .screen-body h2 {
          margin: 0;
          font-size: clamp(24px, 3vw, 44px);
          line-height: 1;
          color: #fff;
        }

        .screen-body p:last-child {
          color: #ffeeb0;
          line-height: 1.5;
          font-size: 16px;
        }

        .ticker {
          overflow: hidden;
          border-top: 1px solid rgba(255, 213, 0, 0.18);
          padding: 14px 0;
          color: #ffd500;
          white-space: nowrap;
        }

        .ticker span {
          display: inline-block;
          min-width: 100%;
          animation: ticker 16s linear infinite;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .camera-box {
          min-height: 260px;
          overflow: hidden;
        }

        .camera-visual {
          min-height: 198px;
          display: grid;
          place-items: center;
          text-align: center;
          background:
            radial-gradient(circle, rgba(255, 0, 0, 0.28), transparent 55%),
            linear-gradient(135deg, #111, #000);
        }

        .camera-visual p {
          margin: 0;
          color: #ffeeb0;
        }

        .equalizer {
          height: 88px;
          display: flex;
          align-items: end;
          gap: 7px;
        }

        .equalizer i {
          width: 12px;
          border-radius: 999px;
          background: linear-gradient(#ffd500, #ff1b1b);
          animation: bounce 0.9s infinite ease-in-out;
          box-shadow: 0 0 16px rgba(255, 213, 0, 0.35);
        }

        .equalizer i:nth-child(1) {
          height: 35px;
        }
        .equalizer i:nth-child(2) {
          height: 68px;
          animation-delay: 0.1s;
        }
        .equalizer i:nth-child(3) {
          height: 42px;
          animation-delay: 0.2s;
        }
        .equalizer i:nth-child(4) {
          height: 78px;
          animation-delay: 0.3s;
        }
        .equalizer i:nth-child(5) {
          height: 55px;
          animation-delay: 0.4s;
        }
        .equalizer i:nth-child(6) {
          height: 88px;
          animation-delay: 0.5s;
        }
        .equalizer i:nth-child(7) {
          height: 48px;
          animation-delay: 0.6s;
        }
        .equalizer i:nth-child(8) {
          height: 70px;
          animation-delay: 0.7s;
        }

        .deck-area {
          border-radius: 36px;
          padding: 22px;
          background:
            radial-gradient(circle at center, rgba(255, 213, 0, 0.12), transparent 55%),
            linear-gradient(160deg, #260000, #050505 52%, #150000);
          border: 1px solid rgba(255, 213, 0, 0.28);
          display: grid;
          grid-template-columns: 1fr 340px 1fr;
          gap: 18px;
          align-items: center;
        }

        .deck {
          min-height: 530px;
          border-radius: 34px;
          padding: 20px;
          background:
            radial-gradient(circle at 50% 42%, rgba(255, 0, 0, 0.18), transparent 55%),
            #090909;
          border: 1px solid rgba(255, 213, 0, 0.28);
          position: relative;
          overflow: hidden;
        }

        .deck-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
        }

        .deck-head strong {
          font-size: 22px;
          color: #ffd500;
        }

        .deck-head span {
          font-size: 12px;
          color: #fff;
          border: 1px solid rgba(255, 213, 0, 0.25);
          border-radius: 999px;
          padding: 8px 12px;
        }

        .platter-wrap {
          position: relative;
          width: min(330px, 100%);
          aspect-ratio: 1 / 1;
          margin: 34px auto 20px;
          display: grid;
          place-items: center;
        }

        .platter {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background:
            radial-gradient(circle, #ffd500 0 5%, #101010 6% 13%, #252525 14% 16%, #050505 17% 24%, #222 25% 27%, #050505 28% 44%, #222 45% 47%, #050505 48% 61%, #262626 62% 64%, #050505 65%),
            conic-gradient(from 40deg, rgba(255, 0, 0, 0.85), transparent, rgba(255, 213, 0, 0.65), transparent, rgba(255, 0, 0, 0.85));
          border: 12px solid #171717;
          box-shadow:
            0 0 0 4px rgba(255, 213, 0, 0.12),
            0 18px 35px rgba(0, 0, 0, 0.55),
            inset 0 0 45px rgba(0, 0, 0, 0.9);
        }

        .platter.spin {
          animation: spin 1.3s linear infinite;
        }

        .deck.active .platter.spin {
          animation-duration: 0.7s;
        }

        .needle {
          width: 42%;
          height: 9px;
          background: linear-gradient(90deg, #ffd500, #ff1b1b);
          position: absolute;
          top: 25%;
          right: 0;
          transform: rotate(28deg);
          transform-origin: right center;
          border-radius: 999px;
          box-shadow: 0 0 16px rgba(255, 213, 0, 0.45);
        }

        .needle::after {
          content: "";
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #ffd500;
          position: absolute;
          right: -16px;
          top: -17px;
          box-shadow: 0 0 18px rgba(255, 213, 0, 0.55);
        }

        .deck-label {
          text-align: center;
        }

        .deck-label b {
          display: block;
          color: #fff;
          font-size: 20px;
        }

        .deck-label span {
          display: block;
          margin-top: 6px;
          color: #ffdb57;
          font-size: 12px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .deck-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 28px;
        }

        .deck-buttons button,
        .mini-switches button,
        .action-buttons button,
        .pads button {
          border: 0;
          cursor: pointer;
          font-weight: 900;
          text-transform: uppercase;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .deck-buttons button {
          min-height: 56px;
          border-radius: 16px;
          color: #160000;
          background: linear-gradient(180deg, #ffd500, #ffae00);
          box-shadow: 0 8px 0 #6b1c00;
        }

        .deck-buttons button:hover,
        .mini-switches button:hover,
        .action-buttons button:hover,
        .pads button:hover,
        .main-power:hover,
        .auto-switch:hover {
          transform: translateY(-2px);
        }

        .mixer {
          min-height: 620px;
          border-radius: 30px;
          background:
            linear-gradient(180deg, rgba(255, 213, 0, 0.08), transparent),
            #070707;
          border: 1px solid rgba(255, 213, 0, 0.28);
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .main-power,
        .auto-switch {
          border: 0;
          border-radius: 24px;
          cursor: pointer;
          min-height: 94px;
          color: #fff;
          background: linear-gradient(180deg, #3a0000, #160000);
          border: 1px solid rgba(255, 213, 0, 0.26);
          box-shadow: inset 0 0 20px rgba(255, 0, 0, 0.14);
        }

        .main-power.active {
          background: linear-gradient(180deg, #ff1b1b, #7a0000);
          box-shadow:
            0 0 30px rgba(255, 0, 0, 0.45),
            inset 0 0 18px rgba(255, 255, 255, 0.12);
        }

        .auto-switch.active {
          background: linear-gradient(180deg, #ffd500, #b86d00);
          color: #140000;
          box-shadow: 0 0 28px rgba(255, 213, 0, 0.3);
        }

        .main-power span,
        .auto-switch span {
          display: block;
          font-size: 13px;
          letter-spacing: 0.16em;
        }

        .main-power b,
        .auto-switch b {
          display: block;
          font-size: 28px;
          margin-top: 4px;
        }

        .slider-bank {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          min-height: 285px;
          padding: 14px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 213, 0, 0.14);
        }

        .control-slider {
          display: grid;
          justify-items: center;
          gap: 10px;
        }

        .control-slider label {
          color: #ffd500;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .control-slider input {
          writing-mode: bt-lr;
          -webkit-appearance: slider-vertical;
          width: 35px;
          height: 190px;
          accent-color: #ffd500;
        }

        .control-slider strong {
          color: #fff;
          font-size: 12px;
        }

        .crossfader {
          display: grid;
          grid-template-columns: 65px 1fr 65px;
          align-items: center;
          gap: 10px;
          padding: 16px;
          border-radius: 20px;
          background: #120000;
          border: 1px solid rgba(255, 213, 0, 0.18);
        }

        .crossfader div {
          text-align: center;
        }

        .crossfader span {
          display: block;
          color: #ffd500;
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 900;
        }

        .crossfader b {
          color: #fff;
          font-size: 12px;
        }

        .crossfader input {
          width: 100%;
          accent-color: #ff1b1b;
        }

        .mini-switches {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .mini-switches button {
          min-height: 54px;
          border-radius: 16px;
          background: #ffd500;
          color: #160000;
        }

        .pads {
          padding: 16px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .pads button {
          min-height: 78px;
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(255, 213, 0, 0.95), rgba(255, 174, 0, 0.95));
          color: #160000;
          box-shadow: 0 7px 0 #681900;
        }

        .pads button small {
          display: block;
          font-size: 10px;
          letter-spacing: 0.16em;
        }

        .pads button strong {
          display: block;
          margin-top: 5px;
          font-size: 15px;
        }

        .meter-panel {
          padding-bottom: 16px;
        }

        .vu {
          padding: 18px;
          min-height: 150px;
          display: flex;
          align-items: end;
          gap: 7px;
        }

        .vu i {
          flex: 1;
          min-width: 8px;
          border-radius: 999px 999px 0 0;
          background: linear-gradient(#ff1b1b, #ffd500);
          height: 20%;
          opacity: 0.4;
        }

        .vu.active i {
          animation: meter 0.8s infinite ease-in-out;
          opacity: 1;
        }

        .vu i:nth-child(2) {
          animation-delay: 0.1s;
        }
        .vu i:nth-child(3) {
          animation-delay: 0.2s;
        }
        .vu i:nth-child(4) {
          animation-delay: 0.3s;
        }
        .vu i:nth-child(5) {
          animation-delay: 0.4s;
        }
        .vu i:nth-child(6) {
          animation-delay: 0.5s;
        }
        .vu i:nth-child(7) {
          animation-delay: 0.15s;
        }
        .vu i:nth-child(8) {
          animation-delay: 0.25s;
        }
        .vu i:nth-child(9) {
          animation-delay: 0.35s;
        }
        .vu i:nth-child(10) {
          animation-delay: 0.45s;
        }
        .vu i:nth-child(11) {
          animation-delay: 0.55s;
        }
        .vu i:nth-child(12) {
          animation-delay: 0.65s;
        }

        .signal-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 16px;
          padding: 12px 0;
          border-top: 1px solid rgba(255, 213, 0, 0.12);
        }

        .signal-row span {
          color: #ffeeb0;
        }

        .signal-row b {
          color: #ffd500;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1.45fr 1fr 0.9fr;
          gap: 18px;
          margin-top: 18px;
        }

        .action-buttons {
          padding: 16px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .action-buttons button {
          min-height: 58px;
          border-radius: 16px;
          background: #ffd500;
          color: #160000;
          border: 1px solid rgba(255, 255, 255, 0.16);
        }

        .action-buttons button.danger {
          background: #ff1b1b;
          color: #fff;
          box-shadow: 0 0 18px rgba(255, 0, 0, 0.34);
        }

        .logs {
          padding: 16px;
          display: grid;
          gap: 10px;
          max-height: 260px;
          overflow: auto;
        }

        .log-item {
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 10px;
          align-items: start;
          padding: 10px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 213, 0, 0.12);
        }

        .log-item span {
          color: #ffd500;
          font-size: 12px;
          font-weight: 900;
        }

        .log-item p {
          margin: 0;
          color: #ffeeb0;
          font-size: 13px;
          line-height: 1.4;
        }

        .pulse-list {
          padding: 16px;
          display: grid;
          gap: 10px;
        }

        .pulse-list div {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 213, 0, 0.12);
        }

        .pulse-list span {
          color: #ffeeb0;
        }

        .pulse-list strong {
          color: #ffd500;
          font-size: 20px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes ticker {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(-100%);
          }
        }

        @keyframes bounce {
          0%,
          100% {
            transform: scaleY(0.55);
          }
          50% {
            transform: scaleY(1.15);
          }
        }

        @keyframes meter {
          0%,
          100% {
            height: 24%;
          }
          50% {
            height: 96%;
          }
        }

        @media (max-width: 1400px) {
          .studio-board,
          .bottom-grid {
            grid-template-columns: 1fr;
          }

          .deck-area {
            grid-template-columns: 1fr;
          }

          .mixer {
            min-height: auto;
          }

          .slider-bank {
            min-height: 240px;
          }
        }

        @media (max-width: 760px) {
          .control-page {
            padding: 12px;
          }

          .shell {
            padding: 12px;
            border-radius: 24px;
          }

          .topbar {
            flex-direction: column;
            align-items: stretch;
          }

          .brand-badge {
            width: 100%;
          }

          .status-grid {
            grid-template-columns: 1fr;
          }

          .pads,
          .action-buttons {
            grid-template-columns: 1fr;
          }

          .slider-bank {
            grid-template-columns: repeat(5, 1fr);
            overflow-x: auto;
          }

          .deck {
            min-height: 430px;
          }
        }
      `}</style>
    </main>
  );
}

function Turntable({
  title,
  mode,
  active,
  label,
}: {
  title: string;
  mode: DeckMode;
  active: boolean;
  label: string;
}) {
  return (
    <div className={active ? "deck active" : "deck"}>
      <div className="deck-head">
        <strong>{title}</strong>
        <span>{mode.toUpperCase()}</span>
      </div>

      <div className="platter-wrap">
        <div className={active ? "platter spin" : "platter"} />
        <div className="needle" />
      </div>

      <div className="deck-label">
        <b>{label}</b>
        <span>{active ? "spinning live" : "ready to cue"}</span>
      </div>

      <div className="deck-buttons">
        <button type="button">Cue</button>
        <button type="button">Sync</button>
        <button type="button">Load</button>
      </div>
    </div>
  );
}

function ControlSlider({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
}) {
  return (
    <div className="control-slider">
      <label>{label}</label>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
      />
      <strong>{value}%</strong>
    </div>
  );
}