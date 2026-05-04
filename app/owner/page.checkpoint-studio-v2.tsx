"use client";

import { useMemo, useRef, useState } from "react";

type DeckMode = "idle" | "cue" | "live" | "paused";
type BroadcastState = "off" | "cue" | "live" | "paused";
type PadMode = "JINGLES" | "DROPS" | "COM" | "ADS" | "SMARTDJ" | "AUTODJ" | "LIVEDJ";

type LogItem = {
  id: number;
  time: string;
  message: string;
};

type Pad = {
  label: string;
  mode: PadMode;
  tone: string;
  color: "yellow" | "red" | "green" | "blue" | "purple" | "orange";
};

const STREAM_URL =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  "http://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

const padModes: PadMode[] = [
  "JINGLES",
  "DROPS",
  "COM",
  "ADS",
  "SMARTDJ",
  "AUTODJ",
  "LIVEDJ",
];

const pads: Pad[] = [
  {
    label: "Station ID",
    mode: "JINGLES",
    tone: "Official Tha Core station ID fired.",
    color: "yellow",
  },
  {
    label: "Big Intro",
    mode: "JINGLES",
    tone: "Main show intro jingle ready.",
    color: "orange",
  },
  {
    label: "DJ Drop",
    mode: "DROPS",
    tone: "DJ Daily Bread drop fired.",
    color: "purple",
  },
  {
    label: "Dancehall Drop",
    mode: "DROPS",
    tone: "Dancehall energy drop selected.",
    color: "red",
  },
  {
    label: "Com Break",
    mode: "COM",
    tone: "Commercial break command selected.",
    color: "blue",
  },
  {
    label: "Sponsor Ad",
    mode: "ADS",
    tone: "Sponsor advertisement shot triggered.",
    color: "green",
  },
  {
    label: "Smart Mix",
    mode: "SMARTDJ",
    tone: "SmartDJ checking next best move.",
    color: "purple",
  },
  {
    label: "AutoDJ Flow",
    mode: "AUTODJ",
    tone: "AutoDJ playlist flow armed.",
    color: "orange",
  },
  {
    label: "Live DJ Mic",
    mode: "LIVEDJ",
    tone: "Live DJ mic and manual deck mode selected.",
    color: "red",
  },
  {
    label: "Request Line",
    mode: "LIVEDJ",
    tone: "Listener request line opened.",
    color: "green",
  },
  {
    label: "Weather",
    mode: "SMARTDJ",
    tone: "Weather reader command ready.",
    color: "blue",
  },
  {
    label: "Time Check",
    mode: "SMARTDJ",
    tone: "Time check reader command ready.",
    color: "yellow",
  },
];

const broadcastButtons = [
  { label: "Cue", kind: "cue" },
  { label: "Play / Pause", kind: "play" },
  { label: "Stop All", kind: "stop" },
  { label: "Skip Next", kind: "skipNext" },
  { label: "Skip Back", kind: "skipBack" },
  { label: "Studio Skip", kind: "studioSkip" },
  { label: "Monitor", kind: "monitor" },
  { label: "Mic", kind: "mic" },
  { label: "LiveDJ", kind: "liveDj" },
  { label: "AutoDJ", kind: "autoDj" },
  { label: "SmartDJ", kind: "smartDj" },
  { label: "Ads", kind: "ads" },
];

export default function OwnerControlPanelPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [broadcast, setBroadcast] = useState<BroadcastState>("off");
  const [deckA, setDeckA] = useState<DeckMode>("idle");
  const [deckB, setDeckB] = useState<DeckMode>("idle");

  const [selectedMode, setSelectedMode] = useState<PadMode>("JINGLES");
  const [autoDj, setAutoDj] = useState(true);
  const [smartDj, setSmartDj] = useState(false);
  const [liveDj, setLiveDj] = useState(false);
  const [micLive, setMicLive] = useState(false);
  const [inHouseMonitor, setInHouseMonitor] = useState(true);

  const [screenTitle, setScreenTitle] = useState("STUDIO READY");
  const [screenText, setScreenText] = useState(
    "Tha Core control room ready. Camera, cue, play/pause, stop all, skip, monitor, SmartDJ, AutoDJ, LiveDJ, jingles, drops, commercials, and ads are loaded."
  );

  const [volume, setVolume] = useState(72);
  const [monitorVolume, setMonitorVolume] = useState(65);
  const [micGain, setMicGain] = useState(45);
  const [musicGain, setMusicGain] = useState(70);
  const [tempo, setTempo] = useState(50);
  const [bass, setBass] = useState(64);
  const [mid, setMid] = useState(58);
  const [treble, setTreble] = useState(61);
  const [reverb, setReverb] = useState(20);
  const [delay, setDelay] = useState(12);
  const [echo, setEcho] = useState(18);
  const [compression, setCompression] = useState(44);
  const [limiter, setLimiter] = useState(60);
  const [crossfade, setCrossfade] = useState(50);

  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: 1,
      time: "Now",
      message: "Studio working version loaded. Backup remains untouched.",
    },
  ]);

  const isBroadcasting = broadcast === "live";
  const filteredPads = pads.filter((pad) => pad.mode === selectedMode);

  const nowPlaying = useMemo(() => {
    if (broadcast === "live" && liveDj) return "LIVE DJ ON AIR";
    if (broadcast === "live" && autoDj) return "AUTODJ BROADCASTING";
    if (broadcast === "live" && smartDj) return "SMARTDJ BROADCASTING";
    if (broadcast === "paused") return "BROADCAST PAUSED";
    if (broadcast === "cue") return "BROADCAST CUED";
    return "OFF AIR";
  }, [broadcast, autoDj, smartDj, liveDj]);

  function stamp() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function addLog(message: string) {
    setLogs((current) => [
      { id: Date.now(), time: stamp(), message },
      ...current.slice(0, 5),
    ]);
  }

  function updateMainVolume(value: number) {
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value / 100;
  }

  function cueBroadcast() {
    setBroadcast("cue");
    setDeckA("cue");
    setDeckB(autoDj || smartDj ? "cue" : "idle");
    setScreenTitle("BROADCAST CUED");
    setScreenText("Broadcast is cued. Hit Play / Pause to start the studio broadcast monitor.");
    addLog("Broadcast cued.");
  }

  async function playPauseBroadcast() {
    const audio = audioRef.current;
    if (!audio) return;

    if (broadcast === "live") {
      audio.pause();
      setBroadcast("paused");
      setDeckA("paused");
      setDeckB("paused");
      setScreenTitle("BROADCAST PAUSED");
      setScreenText("All broadcast monitoring paused. Hit Play / Pause again to continue.");
      addLog("Broadcast paused.");
      return;
    }

    try {
      audio.volume = volume / 100;
      audio.muted = !inHouseMonitor;
      await audio.play();

      setBroadcast("live");
      setDeckA("live");
      setDeckB("live");
      setScreenTitle("BROADCASTING");
      setScreenText("Broadcast monitor playing. Both turntables spinning with real studio feel.");
      addLog("Broadcast started. Turntables spinning.");
    } catch {
      setScreenTitle("PLAYBACK BLOCKED");
      setScreenText("Browser blocked audio. Click Play again or check stream URL / HTTPS.");
      addLog("Playback blocked by browser or stream connection.");
    }
  }

  function stopBroadcast() {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Live streams may not allow reset.
      }
    }

    setBroadcast("off");
    setDeckA("idle");
    setDeckB("idle");
    setMicLive(false);
    setScreenTitle("ALL BROADCASTING STOPPED");
    setScreenText("All broadcast monitoring stopped from the control room panel.");
    addLog("Stop All pressed. Broadcast monitor stopped.");
  }

  function toggleMonitor() {
    setInHouseMonitor((current) => {
      const next = !current;

      if (audioRef.current) {
        audioRef.current.muted = !next;
      }

      setScreenTitle(next ? "IN-HOUSE MONITOR ON" : "IN-HOUSE MONITOR OFF");
      setScreenText(
        next
          ? "Studio in-house monitor is on. You can hear the broadcast in the control room."
          : "Studio in-house monitor muted. Public stream is not affected."
      );
      addLog(next ? "In-house monitor switched on." : "In-house monitor switched off.");

      return next;
    });
  }

  function skipNext() {
    setScreenTitle("SKIP NEXT");
    setScreenText("Skip Next pressed. This button is ready to connect to AzuraCast skip API.");
    addLog("Skip Next pressed.");
  }

  function skipBack() {
    setScreenTitle("SKIP BACK");
    setScreenText("Skip Back pressed. Studio back-skip command selected.");
    addLog("Skip Back pressed.");
  }

  function studioSkip() {
    setScreenTitle("STUDIO SKIP");
    setScreenText("Studio Skip pressed. SmartDJ / AutoDJ can use this for the next clean transition.");
    addLog("Studio Skip pressed.");
  }

  function triggerPad(pad: Pad) {
    setSelectedMode(pad.mode);
    setScreenTitle(`${pad.mode} FIRED`);
    setScreenText(pad.tone);

    if (pad.mode === "AUTODJ") {
      setAutoDj(true);
      setSmartDj(false);
      setLiveDj(false);
      setDeckB(broadcast === "live" ? "live" : "cue");
    }

    if (pad.mode === "SMARTDJ") {
      setSmartDj(true);
      setAutoDj(false);
      setLiveDj(false);
      setDeckB(broadcast === "live" ? "live" : "cue");
    }

    if (pad.mode === "LIVEDJ") {
      setLiveDj(true);
      setAutoDj(false);
      setSmartDj(false);
      setMicLive(true);
    }

    addLog(`${pad.mode} pad fired: ${pad.label}`);
  }

  function smartOneClick() {
    const firstPad = filteredPads[0] || pads[0];
    triggerPad(firstPad);
    setScreenTitle(`SMART BUTTON: ${selectedMode}`);
    addLog(`Smart one-click fired ${selectedMode}.`);
  }

  function runBroadcastButton(kind: string) {
    if (kind === "cue") return cueBroadcast();
    if (kind === "play") return playPauseBroadcast();
    if (kind === "stop") return stopBroadcast();
    if (kind === "skipNext") return skipNext();
    if (kind === "skipBack") return skipBack();
    if (kind === "studioSkip") return studioSkip();
    if (kind === "monitor") return toggleMonitor();

    if (kind === "mic") {
      setMicLive((current) => {
        const next = !current;
        setScreenTitle(next ? "MIC ARMED" : "MIC MUTED");
        setScreenText(next ? "Live DJ mic channel armed." : "Live DJ mic channel muted.");
        addLog(next ? "Mic armed." : "Mic muted.");
        return next;
      });
      return;
    }

    if (kind === "liveDj") {
      setLiveDj(true);
      setAutoDj(false);
      setSmartDj(false);
      setMicLive(true);
      setSelectedMode("LIVEDJ");
      setScreenTitle("LIVE DJ MODE");
      setScreenText("LiveDJ selected. Manual studio control and mic are ready.");
      addLog("LiveDJ mode selected.");
      return;
    }

    if (kind === "autoDj") {
      setAutoDj(true);
      setSmartDj(false);
      setLiveDj(false);
      setSelectedMode("AUTODJ");
      setScreenTitle("AUTODJ MODE");
      setScreenText("AutoDJ selected. Playlist flow ready.");
      addLog("AutoDJ selected.");
      return;
    }

    if (kind === "smartDj") {
      setSmartDj(true);
      setAutoDj(false);
      setLiveDj(false);
      setSelectedMode("SMARTDJ");
      setScreenTitle("SMARTDJ MODE");
      setScreenText("SmartDJ selected. Intelligent radio flow ready.");
      addLog("SmartDJ selected.");
      return;
    }

    if (kind === "ads") {
      setSelectedMode("ADS");
      setScreenTitle("ADS PANEL");
      setScreenText("Ads buttons ready.");
      addLog("Ads panel selected.");
    }
  }

  return (
    <main className="control-page">
      <audio ref={audioRef} src={STREAM_URL} preload="none" />

      <section className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">THA CORE ONLINE RADIO</p>
            <h1>Studio Control Panel</h1>
            <p className="subtitle">
              Real studio layout with central log, camera above cue, broadcast buttons,
              skip controls, smaller buttons, full mixer sliders, and spinning turntables.
            </p>
          </div>

          <div className="brand-badge">
            <div className="crown">♛</div>
            <strong>TC</strong>
            <span>STUDIO LIVE</span>
          </div>
        </header>

        <section className="status-grid">
          <StatusCard
            label="Broadcast"
            value={nowPlaying}
            color={broadcast === "live" ? "green" : broadcast === "cue" ? "yellow" : "red"}
          />
          <StatusCard label="SmartDJ" value={smartDj ? "ACTIVE" : "READY"} color={smartDj ? "green" : "yellow"} />
          <StatusCard label="AutoDJ" value={autoDj ? "ACTIVE" : "OFF"} color={autoDj ? "orange" : "red"} />
          <StatusCard label="LiveDJ" value={liveDj ? "LIVE" : "STANDBY"} color={liveDj ? "green" : "yellow"} />
          <StatusCard label="Mic" value={micLive ? "ARMED" : "MUTED"} color={micLive ? "green" : "red"} />
          <StatusCard label="Monitor" value={inHouseMonitor ? "ON" : "OFF"} color={inHouseMonitor ? "green" : "red"} />
        </section>

        <section className="central-log">
          <PanelHeading left="Central Control Log" right="Above Hero" />
          <div className="central-log-row">
            {logs.slice(0, 4).map((log) => (
              <div key={log.id} className="central-log-item">
                <span>{log.time}</span>
                <p>{log.message}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="studio-layout">
          <div className="hero-screen">
            <div className="screen-top">
              <span>{screenTitle}</span>
              <b>{nowPlaying}</b>
            </div>

            <div className="screen-body">
              <p className="screen-kicker">LIVE HERO DISPLAY</p>
              <h2>{nowPlaying}</h2>
              <p>{screenText}</p>

              <div className="mode-lamps">
                <span className={autoDj ? "lamp on orange" : "lamp"}>AUTODJ</span>
                <span className={smartDj ? "lamp on green" : "lamp"}>SMARTDJ</span>
                <span className={liveDj ? "lamp on red" : "lamp"}>LIVEDJ</span>
                <span className={micLive ? "lamp on yellow" : "lamp"}>MIC</span>
              </div>
            </div>

            <div className="ticker">
              <span>
                THA CORE ONLINE RADIO • BROADCAST • CUE • PLAY / PAUSE • STOP ALL • SKIP NEXT • STUDIO SKIP • JINGLES • DROPS • COM • ADS • SMARTDJ • AUTODJ • LIVEDJ •
              </span>
            </div>
          </div>

          <div className="turntable-board">
            <Turntable
              title="DECK A"
              mode={deckA}
              label="MAIN BROADCAST"
              active={isBroadcasting}
            />

            <div className="broadcast-section">
              <div className="cam-box">
                <div className="cam-top">
                  <span>Studio Cam</span>
                  <b>{micLive ? "MIC LIVE" : "READY"}</b>
                </div>

                <div className="cam-view">
                  <div className={isBroadcasting ? "cam-eq active" : "cam-eq"}>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <p>Camera / video call / live studio window</p>
                </div>
              </div>

              <div className="broadcast-buttons">
                <button
                  type="button"
                  onClick={cueBroadcast}
                  className={broadcast === "cue" ? "studio-btn cue active" : "studio-btn cue"}
                >
                  Cue
                </button>

                <button
                  type="button"
                  onClick={playPauseBroadcast}
                  className={broadcast === "live" ? "studio-btn play active" : "studio-btn play"}
                >
                  {broadcast === "live" ? "Pause" : "Play"}
                </button>

                <button type="button" onClick={stopBroadcast} className="studio-btn stop">
                  Stop All
                </button>

                <button type="button" onClick={skipNext} className="studio-btn skip">
                  Skip Next
                </button>

                <button type="button" onClick={skipBack} className="studio-btn skip2">
                  Skip Back
                </button>

                <button type="button" onClick={studioSkip} className="studio-btn smart">
                  Studio Skip
                </button>
              </div>

              <div className="small-action-grid">
                {broadcastButtons.slice(6).map((button) => (
                  <button
                    key={button.label}
                    type="button"
                    onClick={() => runBroadcastButton(button.kind)}
                  >
                    {button.label}
                  </button>
                ))}
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

              <div className="slider-bank compact">
                <ControlSlider label="Main" value={volume} setValue={updateMainVolume} />
                <ControlSlider label="Mon" value={monitorVolume} setValue={setMonitorVolume} />
                <ControlSlider label="Mic" value={micGain} setValue={setMicGain} />
                <ControlSlider label="Music" value={musicGain} setValue={setMusicGain} />
                <ControlSlider label="Tempo" value={tempo} setValue={setTempo} />
                <ControlSlider label="Bass" value={bass} setValue={setBass} />
                <ControlSlider label="Mid" value={mid} setValue={setMid} />
                <ControlSlider label="High" value={treble} setValue={setTreble} />
                <ControlSlider label="Reverb" value={reverb} setValue={setReverb} />
                <ControlSlider label="Delay" value={delay} setValue={setDelay} />
                <ControlSlider label="Echo" value={echo} setValue={setEcho} />
                <ControlSlider label="Comp" value={compression} setValue={setCompression} />
                <ControlSlider label="Limit" value={limiter} setValue={setLimiter} />
              </div>
            </div>

            <Turntable
              title="DECK B"
              mode={deckB}
              label="AUTODJ / JINGLES / DROPS"
              active={isBroadcasting}
            />
          </div>

          <div className="pad-panel">
            <PanelHeading left="One Click Smart Pads" right={selectedMode} />

            <div className="mode-tabs">
              {padModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedMode(mode)}
                  className={selectedMode === mode ? "selected" : ""}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button type="button" onClick={smartOneClick} className="smart-fire">
              Smart Fire {selectedMode}
            </button>

            <div className="pads">
              {filteredPads.map((pad) => (
                <button
                  key={`${pad.mode}-${pad.label}`}
                  type="button"
                  onClick={() => triggerPad(pad)}
                  className={`pad ${pad.color}`}
                >
                  <small>{pad.mode}</small>
                  <strong>{pad.label}</strong>
                </button>
              ))}
            </div>

            <div className="meter-panel">
              <PanelHeading left="Studio Meter" right={isBroadcasting ? "Moving" : "Idle"} />

              <div className={isBroadcasting ? "vu active" : "vu"}>
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
                <b>{isBroadcasting ? "Live" : "Idle"}</b>
              </div>
              <div className="signal-row">
                <span>Monitor</span>
                <b>{inHouseMonitor ? "On" : "Muted"}</b>
              </div>
              <div className="signal-row">
                <span>Mic</span>
                <b>{micLive ? "Armed" : "Muted"}</b>
              </div>
            </div>
          </div>
        </section>
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .control-page {
          min-height: 100vh;
          padding: 22px;
          color: #fff4c0;
          background:
            radial-gradient(circle at top left, rgba(255, 213, 0, 0.16), transparent 28%),
            radial-gradient(circle at top right, rgba(255, 0, 0, 0.28), transparent 32%),
            linear-gradient(135deg, #050000 0%, #210000 42%, #050505 100%);
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .shell {
          width: min(1850px, 100%);
          margin: 0 auto;
          padding: 22px;
          border-radius: 34px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent),
            rgba(9, 0, 0, 0.92);
          border: 1px solid rgba(255, 213, 0, 0.28);
          box-shadow:
            0 0 90px rgba(255, 0, 0, 0.22),
            inset 0 0 55px rgba(255, 213, 0, 0.045);
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          gap: 22px;
          align-items: center;
          padding: 20px;
          border-radius: 28px;
          background:
            linear-gradient(90deg, rgba(255, 0, 0, 0.34), rgba(255, 213, 0, 0.1)),
            #100000;
          border: 1px solid rgba(255, 213, 0, 0.25);
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #ffd500;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.25em;
        }

        h1 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(34px, 5vw, 78px);
          line-height: 0.9;
          text-transform: uppercase;
          text-shadow:
            0 0 16px rgba(255, 0, 0, 0.95),
            0 0 40px rgba(255, 213, 0, 0.24);
        }

        .subtitle {
          margin: 12px 0 0;
          max-width: 940px;
          color: #ffeeb0;
          font-size: 15px;
          line-height: 1.5;
        }

        .brand-badge {
          min-width: 190px;
          min-height: 118px;
          display: grid;
          place-items: center;
          text-align: center;
          border-radius: 24px;
          background:
            radial-gradient(circle, rgba(255, 213, 0, 0.25), transparent 58%),
            #050505;
          border: 1px solid rgba(255, 213, 0, 0.5);
          box-shadow: 0 0 34px rgba(255, 213, 0, 0.22);
        }

        .brand-badge .crown {
          color: #ffd500;
          font-size: 26px;
          line-height: 1;
        }

        .brand-badge strong {
          color: #ff1f1f;
          font-size: 40px;
          line-height: 1;
          text-shadow: 0 0 15px rgba(255, 0, 0, 0.9);
        }

        .brand-badge span {
          color: #ffd500;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
          margin: 16px 0;
        }

        .status-card {
          position: relative;
          min-height: 88px;
          padding: 15px;
          overflow: hidden;
          border-radius: 21px;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.015)),
            #0b0000;
          border: 1px solid rgba(255, 213, 0, 0.22);
        }

        .status-light {
          position: absolute;
          top: 15px;
          left: 15px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 18px currentColor;
        }

        .status-light.green {
          color: #00ff76;
        }

        .status-light.red {
          color: #ff1b1b;
        }

        .status-light.yellow {
          color: #ffd500;
        }

        .status-light.orange {
          color: #ff8a00;
        }

        .status-card small {
          display: block;
          margin-left: 26px;
          color: #ffdb57;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .status-card strong {
          display: block;
          margin-top: 13px;
          color: #ffffff;
          font-size: 18px;
          text-transform: uppercase;
        }

        .central-log {
          margin-bottom: 16px;
          border-radius: 24px;
          overflow: hidden;
          background:
            linear-gradient(90deg, rgba(255, 213, 0, 0.09), rgba(255, 0, 0, 0.08)),
            #080000;
          border: 1px solid rgba(255, 213, 0, 0.24);
        }

        .central-log-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 12px;
        }

        .central-log-item {
          display: grid;
          grid-template-columns: 54px 1fr;
          gap: 8px;
          align-items: center;
          min-height: 48px;
          padding: 8px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 213, 0, 0.1);
        }

        .central-log-item span {
          color: #ffd500;
          font-size: 11px;
          font-weight: 950;
        }

        .central-log-item p {
          margin: 0;
          color: #ffeeb0;
          font-size: 12px;
          line-height: 1.3;
        }

        .studio-layout {
          display: grid;
          grid-template-columns: 0.95fr 2.35fr 0.9fr;
          gap: 16px;
          align-items: start;
        }

        .hero-screen,
        .pad-panel,
        .meter-panel {
          border-radius: 26px;
          background:
            linear-gradient(145deg, rgba(255, 213, 0, 0.065), rgba(255, 0, 0, 0.06)),
            #080000;
          border: 1px solid rgba(255, 213, 0, 0.24);
          box-shadow: inset 0 0 30px rgba(255, 255, 255, 0.035);
          overflow: hidden;
        }

        .hero-screen {
          min-height: 520px;
        }

        .screen-top,
        .panel-heading,
        .cam-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-bottom: 1px solid rgba(255, 213, 0, 0.16);
        }

        .screen-top span,
        .panel-heading span,
        .cam-top span {
          color: #ffd500;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .screen-top b,
        .panel-heading b,
        .cam-top b {
          color: #fff;
          font-size: 10px;
          text-transform: uppercase;
          text-align: right;
        }

        .screen-body {
          min-height: 390px;
          padding: 24px 18px;
          background:
            repeating-linear-gradient(
              0deg,
              rgba(255, 213, 0, 0.035),
              rgba(255, 213, 0, 0.035) 1px,
              transparent 1px,
              transparent 8px
            );
        }

        .screen-kicker {
          margin: 0 0 12px;
          color: #ff3434;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.18em;
        }

        .screen-body h2 {
          margin: 0;
          color: #fff;
          font-size: clamp(24px, 2.6vw, 43px);
          line-height: 1;
          text-transform: uppercase;
        }

        .screen-body p {
          color: #ffeeb0;
          font-size: 15px;
          line-height: 1.5;
        }

        .mode-lamps {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 18px;
        }

        .lamp {
          display: grid;
          place-items: center;
          min-height: 37px;
          border-radius: 999px;
          color: #777;
          background: #151515;
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 10px;
          font-weight: 950;
        }

        .lamp.on.orange {
          background: #ff8a00;
          color: #100700;
          box-shadow: 0 0 15px rgba(255, 138, 0, 0.55);
        }

        .lamp.on.green {
          background: #00ff76;
          color: #00170b;
          box-shadow: 0 0 15px rgba(0, 255, 118, 0.55);
        }

        .lamp.on.red {
          background: #ff1b1b;
          color: #fff;
          box-shadow: 0 0 15px rgba(255, 0, 0, 0.55);
        }

        .lamp.on.yellow {
          background: #ffd500;
          color: #160000;
          box-shadow: 0 0 15px rgba(255, 213, 0, 0.55);
        }

        .ticker {
          overflow: hidden;
          padding: 12px 0;
          color: #ffd500;
          white-space: nowrap;
          border-top: 1px solid rgba(255, 213, 0, 0.16);
        }

        .ticker span {
          display: inline-block;
          min-width: 100%;
          font-weight: 950;
          letter-spacing: 0.13em;
          animation: ticker 19s linear infinite;
        }

        .turntable-board {
          display: grid;
          grid-template-columns: 1fr 390px 1fr;
          gap: 14px;
          align-items: stretch;
          padding: 18px;
          border-radius: 34px;
          background:
            radial-gradient(circle at center, rgba(255, 213, 0, 0.12), transparent 55%),
            linear-gradient(160deg, #260000, #050505 52%, #150000);
          border: 1px solid rgba(255, 213, 0, 0.28);
        }

        .deck {
          position: relative;
          min-height: 640px;
          padding: 18px;
          overflow: hidden;
          border-radius: 32px;
          background:
            radial-gradient(circle at 50% 42%, rgba(255, 0, 0, 0.18), transparent 55%),
            linear-gradient(145deg, #111, #040404);
          border: 1px solid rgba(255, 213, 0, 0.28);
          box-shadow:
            inset 0 0 30px rgba(255, 255, 255, 0.035),
            0 18px 30px rgba(0, 0, 0, 0.35);
        }

        .deck::before {
          content: "";
          position: absolute;
          inset: -80px auto auto -80px;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: rgba(255, 213, 0, 0.08);
        }

        .deck-head {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .deck-head strong {
          color: #ffd500;
          font-size: 22px;
        }

        .deck-head span {
          padding: 7px 11px;
          border-radius: 999px;
          color: #fff;
          font-size: 11px;
          border: 1px solid rgba(255, 213, 0, 0.25);
        }

        .platter-wrap {
          position: relative;
          width: min(360px, 100%);
          aspect-ratio: 1 / 1;
          display: grid;
          place-items: center;
          margin: 44px auto 24px;
        }

        .platter {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background:
            radial-gradient(circle, #ffd500 0 4%, #090909 5% 10%, #222 11% 12%, #050505 13% 22%, #202020 23% 24%, #050505 25% 35%, #232323 36% 37%, #050505 38% 48%, #202020 49% 50%, #050505 51% 62%, #242424 63% 64%, #050505 65%),
            repeating-radial-gradient(circle, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 7px),
            conic-gradient(
              from 40deg,
              rgba(255, 0, 0, 0.85),
              transparent,
              rgba(255, 213, 0, 0.65),
              transparent,
              rgba(255, 0, 0, 0.85)
            );
          border: 14px solid #171717;
          box-shadow:
            0 0 0 4px rgba(255, 213, 0, 0.12),
            0 18px 35px rgba(0, 0, 0, 0.55),
            inset 0 0 45px rgba(0, 0, 0, 0.9);
        }

        .deck.active .platter {
          animation: spin 1.05s linear infinite;
        }

        .record-label {
          position: absolute;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: radial-gradient(circle, #fff5a6, #ffd500 58%, #8d0000);
          display: grid;
          place-items: center;
          color: #250000;
          font-weight: 950;
          box-shadow: 0 0 20px rgba(255, 213, 0, 0.35);
        }

        .deck.active .record-label {
          animation: spin 1.05s linear infinite;
        }

        .needle {
          position: absolute;
          top: 20%;
          right: -2%;
          width: 44%;
          height: 9px;
          border-radius: 999px;
          transform: rotate(27deg);
          transform-origin: right center;
          background: linear-gradient(90deg, #ffd500, #ff1b1b);
          box-shadow: 0 0 16px rgba(255, 213, 0, 0.45);
        }

        .needle::after {
          content: "";
          position: absolute;
          right: -16px;
          top: -17px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #ffd500;
          box-shadow: 0 0 18px rgba(255, 213, 0, 0.55);
        }

        .deck-label {
          text-align: center;
        }

        .deck-label b {
          display: block;
          color: #fff;
          font-size: 19px;
        }

        .deck-label span {
          display: block;
          margin-top: 7px;
          color: #ffdb57;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .deck-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 24px;
        }

        button {
          font-family: inherit;
        }

        .deck-buttons button,
        .studio-btn,
        .small-action-grid button,
        .mode-tabs button,
        .pad,
        .smart-fire {
          border: 0;
          cursor: pointer;
          font-weight: 950;
          text-transform: uppercase;
          transition:
            transform 0.2s ease,
            filter 0.2s ease,
            box-shadow 0.2s ease;
        }

        .deck-buttons button {
          min-height: 42px;
          border-radius: 14px;
          color: #160000;
          background: linear-gradient(180deg, #ffd500, #ffae00);
          box-shadow: 0 6px 0 #6b1c00;
          font-size: 11px;
        }

        .broadcast-section {
          min-height: 640px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 13px;
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(255, 213, 0, 0.08), transparent),
            #070707;
          border: 1px solid rgba(255, 213, 0, 0.28);
        }

        .cam-box {
          border-radius: 20px;
          overflow: hidden;
          background: #090000;
          border: 1px solid rgba(255, 213, 0, 0.18);
        }

        .cam-view {
          min-height: 105px;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 10px;
          background:
            radial-gradient(circle, rgba(255, 0, 0, 0.26), transparent 60%),
            linear-gradient(135deg, #121212, #000);
        }

        .cam-view p {
          margin: 4px 0 0;
          color: #ffeeb0;
          font-size: 12px;
        }

        .cam-eq {
          height: 44px;
          display: flex;
          align-items: end;
          gap: 5px;
        }

        .cam-eq i {
          width: 9px;
          border-radius: 999px;
          height: 20px;
          background: linear-gradient(#ffd500, #ff1b1b);
        }

        .cam-eq.active i {
          animation: meter 0.7s infinite ease-in-out;
        }

        .cam-eq i:nth-child(2) {
          animation-delay: 0.1s;
        }

        .cam-eq i:nth-child(3) {
          animation-delay: 0.2s;
        }

        .cam-eq i:nth-child(4) {
          animation-delay: 0.3s;
        }

        .cam-eq i:nth-child(5) {
          animation-delay: 0.4s;
        }

        .cam-eq i:nth-child(6) {
          animation-delay: 0.5s;
        }

        .cam-eq i:nth-child(7) {
          animation-delay: 0.6s;
        }

        .broadcast-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .studio-btn {
          min-height: 48px;
          border-radius: 15px;
          color: #130000;
          background: #ffd500;
          font-size: 11px;
          box-shadow: 0 5px 0 #6b1c00;
        }

        .studio-btn.play {
          background: #00ff76;
        }

        .studio-btn.play.active {
          background: #ff8a00;
        }

        .studio-btn.stop {
          background: #ff1b1b;
          color: #fff;
          box-shadow: 0 5px 0 #570000;
        }

        .studio-btn.skip {
          background: #00d1ff;
        }

        .studio-btn.skip2 {
          background: #9d4dff;
          color: #fff;
        }

        .studio-btn.smart {
          background: #ff8a00;
        }

        .studio-btn.active {
          outline: 2px solid #fff;
          box-shadow:
            0 0 18px rgba(255, 213, 0, 0.32),
            0 5px 0 #6b1c00;
        }

        .small-action-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
        }

        .small-action-grid button {
          min-height: 38px;
          border-radius: 13px;
          background: #1b1b1b;
          color: #ffd500;
          border: 1px solid rgba(255, 213, 0, 0.18);
          font-size: 10px;
        }

        .crossfader {
          display: grid;
          grid-template-columns: 58px 1fr 58px;
          align-items: center;
          gap: 8px;
          padding: 11px;
          border-radius: 18px;
          background: #120000;
          border: 1px solid rgba(255, 213, 0, 0.18);
        }

        .crossfader div {
          text-align: center;
        }

        .crossfader span {
          display: block;
          color: #ffd500;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .crossfader b {
          color: #fff;
          font-size: 10px;
        }

        .crossfader input {
          width: 100%;
          accent-color: #ff1b1b;
        }

        .slider-bank.compact {
          display: grid;
          grid-template-columns: repeat(13, minmax(42px, 1fr));
          gap: 5px;
          min-height: 225px;
          padding: 7px;
          overflow-x: auto;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 213, 0, 0.12);
        }

        .control-slider {
          display: grid;
          justify-items: center;
          gap: 5px;
          padding: 6px 3px;
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.26);
          border: 1px solid rgba(255, 213, 0, 0.08);
        }

        .control-slider label {
          color: #ffd500;
          font-size: 8px;
          font-weight: 950;
          text-transform: uppercase;
          text-align: center;
        }

        .control-slider input {
          writing-mode: bt-lr;
          -webkit-appearance: slider-vertical;
          width: 25px;
          height: 145px;
          accent-color: #ffd500;
        }

        .control-slider strong {
          color: #fff;
          font-size: 9px;
        }

        .mode-tabs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 7px;
          padding: 12px 13px 8px;
        }

        .mode-tabs button {
          min-height: 35px;
          border-radius: 13px;
          background: #1b1b1b;
          color: #ffd500;
          border: 1px solid rgba(255, 213, 0, 0.18);
          font-size: 10px;
        }

        .mode-tabs button.selected {
          background: #ffd500;
          color: #140000;
          box-shadow: 0 0 18px rgba(255, 213, 0, 0.25);
        }

        .smart-fire {
          width: calc(100% - 26px);
          min-height: 50px;
          margin: 8px 13px 13px;
          border-radius: 17px;
          color: #130000;
          background: linear-gradient(180deg, #ffd500, #ff8a00);
          box-shadow:
            0 6px 0 #6b1c00,
            0 0 25px rgba(255, 213, 0, 0.2);
          font-size: 12px;
        }

        .pads {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          padding: 0 13px 13px;
        }

        .pad {
          min-height: 58px;
          border-radius: 16px;
          color: #130000;
          box-shadow: 0 5px 0 #681900;
        }

        .pad small {
          display: block;
          font-size: 8px;
          letter-spacing: 0.14em;
        }

        .pad strong {
          display: block;
          margin-top: 4px;
          font-size: 12px;
        }

        .pad.yellow {
          background: #ffd500;
        }

        .pad.red {
          background: #ff1b1b;
          color: #fff;
        }

        .pad.green {
          background: #00ff76;
        }

        .pad.blue {
          background: #00d1ff;
        }

        .pad.purple {
          background: #9d4dff;
          color: #fff;
        }

        .pad.orange {
          background: #ff8a00;
        }

        .vu {
          min-height: 100px;
          display: flex;
          align-items: end;
          gap: 5px;
          padding: 14px;
        }

        .vu i {
          flex: 1;
          min-width: 7px;
          height: 20%;
          border-radius: 999px 999px 0 0;
          background: linear-gradient(#ff1b1b, #ffd500);
          opacity: 0.35;
        }

        .vu.active i {
          opacity: 1;
          animation: meter 0.8s infinite ease-in-out;
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

        .signal-row {
          display: flex;
          justify-content: space-between;
          margin: 6px 14px;
          padding: 9px 0;
          border-top: 1px solid rgba(255, 213, 0, 0.12);
        }

        .signal-row span {
          color: #ffeeb0;
          font-size: 12px;
        }

        .signal-row b {
          color: #ffd500;
          font-size: 12px;
        }

        .deck-buttons button:hover,
        .studio-btn:hover,
        .small-action-grid button:hover,
        .mode-tabs button:hover,
        .pad:hover,
        .smart-fire:hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
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

        @keyframes meter {
          0%,
          100% {
            height: 24%;
          }
          50% {
            height: 96%;
          }
        }

        @media (max-width: 1500px) {
          .status-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .studio-layout {
            grid-template-columns: 1fr;
          }

          .turntable-board {
            grid-template-columns: 1fr;
          }

          .deck,
          .broadcast-section {
            min-height: auto;
          }

          .central-log-row {
            grid-template-columns: repeat(2, 1fr);
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

          .status-grid,
          .central-log-row,
          .mode-lamps,
          .pads {
            grid-template-columns: 1fr;
          }

          .broadcast-buttons,
          .small-action-grid,
          .mode-tabs {
            grid-template-columns: repeat(2, 1fr);
          }

          .slider-bank.compact {
            grid-template-columns: repeat(13, 46px);
          }
        }
      `}</style>
    </main>
  );
}

function StatusCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "green" | "red" | "yellow" | "orange";
}) {
  return (
    <div className="status-card">
      <span className={`status-light ${color}`} />
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function PanelHeading({ left, right }: { left: string; right: string }) {
  return (
    <div className="panel-heading">
      <span>{left}</span>
      <b>{right}</b>
    </div>
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
        <div className="platter" />
        <div className="record-label">TC</div>
        <div className="needle" />
      </div>

      <div className="deck-label">
        <b>{label}</b>
        <span>{active ? "real turntable spinning" : "ready to cue"}</span>
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