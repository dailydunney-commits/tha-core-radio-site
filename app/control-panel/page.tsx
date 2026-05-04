"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type DisplayMode = "jingles" | "commercials" | "ads";
type DjMode = "auto" | "smart" | "live";

type Pad = {
  id: string;
  label: string;
  title: string;
  mode: DisplayMode;
  file: string;
};

const verticalSliderStyle: CSSProperties = {
  writingMode: "vertical-lr",
  direction: "rtl",
};

const pads: Pad[] = [
  {
    id: "station-id",
    label: "STATION ID",
    title: "Tha Core Station ID",
    mode: "jingles",
    file: "/jingles/station-id.mp3",
  },
  {
    id: "pull-up",
    label: "PULL UP",
    title: "Pull Up Jingle",
    mode: "jingles",
    file: "/jingles/pull-up.mp3",
  },
  {
    id: "big-up",
    label: "BIG UP",
    title: "Big Up Drop",
    mode: "jingles",
    file: "/jingles/big-up.mp3",
  },
  {
    id: "radio-check",
    label: "RADIO CHECK",
    title: "Radio Check Drop",
    mode: "jingles",
    file: "/jingles/radio-check.mp3",
  },
  {
    id: "weather-drop",
    label: "WEATHER",
    title: "Weather Drop",
    mode: "jingles",
    file: "/jingles/weather-drop.mp3",
  },
  {
    id: "com-break",
    label: "COM BREAK",
    title: "Commercial Break",
    mode: "commercials",
    file: "/commercials/commercial-break.mp3",
  },
  {
    id: "event-com",
    label: "EVENT COM",
    title: "Event Commercial",
    mode: "commercials",
    file: "/commercials/event-commercial.mp3",
  },
  {
    id: "booking-com",
    label: "BOOKING COM",
    title: "Booking Commercial",
    mode: "commercials",
    file: "/commercials/booking-commercial.mp3",
  },
  {
    id: "community-com",
    label: "COMMUNITY",
    title: "Community Commercial",
    mode: "commercials",
    file: "/commercials/community-commercial.mp3",
  },
  {
    id: "sponsor-ad",
    label: "SPONSOR AD",
    title: "Sponsor Ad",
    mode: "ads",
    file: "/ads/sponsor-ad.mp3",
  },
  {
    id: "store-ad",
    label: "STORE AD",
    title: "Store Ad",
    mode: "ads",
    file: "/ads/store-ad.mp3",
  },
  {
    id: "printing-ad",
    label: "PRINTING AD",
    title: "Printing Ad",
    mode: "ads",
    file: "/ads/printing-ad.mp3",
  },
  {
    id: "radio-promo",
    label: "RADIO PROMO",
    title: "Radio Promo",
    mode: "ads",
    file: "/ads/radio-promo.mp3",
  },
];

export default function ControlPanelPage() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("jingles");
  const [djMode, setDjMode] = useState<DjMode>("auto");
  const [onAir, setOnAir] = useState(false);
  const [clock, setClock] = useState("");
  const [status, setStatus] = useState("READY");
  const [lastPlayed, setLastPlayed] = useState<Pad | null>(null);

  const [mic, setMic] = useState(62);
  const [music, setMusic] = useState(78);
  const [jingleVol, setJingleVol] = useState(58);
  const [adVol, setAdVol] = useState(50);
  const [master, setMaster] = useState(88);
  const [crossfader, setCrossfader] = useState(50);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const visiblePads = useMemo(() => {
    return pads.filter((pad) => pad.mode === displayMode);
  }, [displayMode]);

  useEffect(() => {
    const updateClock = () => {
      setClock(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateClock();
    const timer = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function activateDjMode(mode: DjMode) {
    setDjMode(mode);

    if (mode === "auto") setStatus("AUTO DJ ACTIVE");
    if (mode === "smart") setStatus("SMART DJ ACTIVE");
    if (mode === "live") setStatus("LIVE DJ ACTIVE");
  }

  async function triggerPad(pad: Pad) {
    setLastPlayed(pad);
    setStatus(`TRIGGERING ${pad.label}`);

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(pad.file);
      audioRef.current = audio;
      audio.volume = master / 100;

      audio.onended = () => setStatus(`${pad.label} FINISHED`);
      audio.onerror = () => setStatus(`MISSING FILE: public${pad.file}`);

      await audio.play();
    } catch {
      setStatus(`BUTTON WORKS - ADD FILE: public${pad.file}`);
    }
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setStatus("STOPPED");
  }

  const displayTitle =
    displayMode === "jingles"
      ? "JINGLES DISPLAY"
      : displayMode === "commercials"
      ? "COMMERCIALS DISPLAY"
      : "ADS DISPLAY";

  return (
    <main className="min-h-screen overflow-x-auto bg-black p-4 text-white">
      <section className="mx-auto min-w-[1450px] max-w-[1900px] rounded-[30px] border border-yellow-400/30 bg-[#050505] p-4 shadow-[0_0_70px_rgba(250,204,21,0.16)]">
        <header className="grid grid-cols-[270px_1fr_250px] gap-4">
          <LogoBox />

          <section className="rounded-3xl border border-yellow-400/30 bg-[#090909] p-5 shadow-[0_0_35px_rgba(250,204,21,0.12)]">
            <h1 className="text-center text-5xl font-black uppercase tracking-[0.08em] text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.55)]">
              Tha Core Control Panel
            </h1>

            <div className="mt-5 grid grid-cols-5 gap-3">
              <StatusButton
                title="ON AIR"
                value={onAir ? "LIVE" : "OFF"}
                active={onAir}
                tone="red"
                onClick={() => {
                  setOnAir((current) => {
                    const next = !current;
                    setStatus(next ? "ON AIR LIVE" : "OFF AIR");
                    return next;
                  });
                }}
              />

              <StatusButton
                title="AUTO DJ"
                value={djMode === "auto" ? "ACTIVE" : "OFF"}
                active={djMode === "auto"}
                tone="yellow"
                onClick={() => activateDjMode("auto")}
              />

              <StatusButton
                title="SMART DJ"
                value={djMode === "smart" ? "ACTIVE" : "OFF"}
                active={djMode === "smart"}
                tone="blue"
                onClick={() => activateDjMode("smart")}
              />

              <StatusButton
                title="LIVE DJ"
                value={djMode === "live" ? "ACTIVE" : "OFF"}
                active={djMode === "live"}
                tone="green"
                onClick={() => activateDjMode("live")}
              />

              <div className="rounded-2xl border border-zinc-700 bg-black p-4 text-center">
                <p className="text-2xl font-black text-white">{clock}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-widest text-zinc-500">
                  Studio Clock
                </p>
              </div>
            </div>
          </section>

          <Panel title="Master">
            <div className="grid h-[185px] grid-cols-3 items-end gap-4">
              <LedMeter level={master - 5} />
              <LedMeter level={master} />
              <LedMeter level={master - 8} />
            </div>

            <div className="mt-3 grid grid-cols-3 text-center text-xs font-black text-zinc-500">
              <span>L</span>
              <span>-2.3 dB</span>
              <span>R</span>
            </div>
          </Panel>
        </header>

        <section className="mt-4 grid grid-cols-[285px_1fr] gap-4">
          <aside className="space-y-4">
            <Panel title="Control Menu">
              <SideButton active label="Dashboard" />
              <SideButton label="Player" />
              <SideButton label="Jingles" />
              <SideButton label="Commercials" />
              <SideButton label="Ads" />
              <SideButton label="Playlists" />
              <SideButton label="Requests" />
              <SideButton label="Schedule" />
              <SideButton label="Settings" />
            </Panel>

            <Panel title="One Click DJ Mode">
              <div className="grid gap-3">
                <BigModeButton
                  label="AUTO DJ ON"
                  active={djMode === "auto"}
                  tone="yellow"
                  onClick={() => activateDjMode("auto")}
                />

                <BigModeButton
                  label="SMART DJ ON"
                  active={djMode === "smart"}
                  tone="blue"
                  onClick={() => activateDjMode("smart")}
                />

                <BigModeButton
                  label="LIVE DJ ON"
                  active={djMode === "live"}
                  tone="green"
                  onClick={() => activateDjMode("live")}
                />
              </div>
            </Panel>
          </aside>

          <section className="space-y-4">
            <section className="rounded-3xl border border-yellow-400/25 bg-[#070707] p-4 shadow-[0_0_50px_rgba(250,204,21,0.1)]">
              <div className="grid grid-cols-[1fr_1.1fr_1fr] gap-4">
                <TurntableDeck
                  deck="A"
                  timeLabel="TRACK TIME"
                  timeValue="02:45"
                />

                <section className="space-y-4">
                  <div className="rounded-3xl border border-yellow-400/35 bg-black p-5 shadow-inner">
                    <h2 className="text-center text-3xl font-black uppercase tracking-widest text-yellow-300">
                      {displayTitle}
                    </h2>

                    <Waveform />

                    <div className="mt-5 grid grid-cols-3 gap-4">
                      <ModeButton
                        label="JING"
                        active={displayMode === "jingles"}
                        onClick={() => setDisplayMode("jingles")}
                      />

                      <ModeButton
                        label="COM"
                        active={displayMode === "commercials"}
                        onClick={() => setDisplayMode("commercials")}
                      />

                      <ModeButton
                        label="ADS"
                        active={displayMode === "ads"}
                        onClick={() => setDisplayMode("ads")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <BigModeButton
                      label="AUTO DJ ON"
                      active={djMode === "auto"}
                      tone="yellow"
                      onClick={() => activateDjMode("auto")}
                    />

                    <BigModeButton
                      label="SMART DJ ON"
                      active={djMode === "smart"}
                      tone="blue"
                      onClick={() => activateDjMode("smart")}
                    />

                    <BigModeButton
                      label="LIVE DJ ON"
                      active={djMode === "live"}
                      tone="green"
                      onClick={() => activateDjMode("live")}
                    />
                  </div>
                </section>

                <TurntableDeck
                  deck="B"
                  timeLabel="REMAINING"
                  timeValue="-01:35"
                />
              </div>

              <div className="mt-4 grid grid-cols-[1fr_1.4fr_1fr] gap-4">
                <DeckTransport />

                <div className="grid grid-cols-5 gap-3">
                  <ConsoleButton label="STOP" onClick={stopAudio} />
                  <ConsoleButton label="NEXT" />
                  <ConsoleButton label="REQUEST" />
                  <ConsoleButton label="TRIGGER" yellow />

                  <div className="flex items-center justify-center rounded-2xl border border-yellow-400/40 bg-black px-3 text-center text-xs font-black uppercase text-yellow-300">
                    {status}
                  </div>
                </div>

                <DeckTransport />
              </div>
            </section>

            <section className="grid grid-cols-[1fr_1.1fr_1.45fr] gap-4">
              <Panel title="Jingle Requests">
                <RequestRow
                  title="TC DROP THAT HEAT"
                  by="DJ ICE"
                  time="12:43 PM"
                  status="PENDING"
                />
                <RequestRow
                  title="TC WE IN THE MIX"
                  by="LIL CORE"
                  time="12:42 PM"
                  status="PENDING"
                />
                <RequestRow
                  title="TC TURN IT UP"
                  by="MS. BOSS"
                  time="12:41 PM"
                  status="PENDING"
                />
                <RequestRow
                  title="TC STREETS ANTHEM"
                  by="BIG CASH"
                  time="12:40 PM"
                  status="PLAYED"
                />
                <RequestRow
                  title="TC RADIO CHECK"
                  by="DJ ICE"
                  time="12:38 PM"
                  status="PLAYED"
                />
              </Panel>

              <Panel title="Mixer">
                <div className="grid grid-cols-5 gap-3">
                  <Fader label="MIC" value={mic} setValue={setMic} />
                  <Fader label="MUSIC" value={music} setValue={setMusic} />
                  <Fader
                    label="JINGLES"
                    value={jingleVol}
                    setValue={setJingleVol}
                  />
                  <Fader label="ADS" value={adVol} setValue={setAdVol} />
                  <Fader
                    label="MASTER"
                    value={master}
                    setValue={setMaster}
                    red
                  />
                </div>

                <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4">
                  <div className="mb-2 flex justify-between text-xs font-black uppercase text-zinc-500">
                    <span>Deck A</span>
                    <span>Crossfader</span>
                    <span>Deck B</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={crossfader}
                    onChange={(event) =>
                      setCrossfader(Number(event.target.value))
                    }
                    className="w-full accent-yellow-400"
                  />
                </div>
              </Panel>

              <Panel title="One Click Trigger Pads">
                <div className="mb-4 grid grid-cols-[1fr_140px] gap-4">
                  <div>
                    <p className="text-xl font-black uppercase text-white">
                      {lastPlayed
                        ? lastPlayed.title
                        : "TC - WE THE CORE RADIO EDIT"}
                    </p>

                    <p className="text-sm font-black uppercase text-yellow-300">
                      Now Playing / Last Triggered
                    </p>
                  </div>

                  <div className="flex items-center justify-center rounded-2xl border border-yellow-400/30 bg-[radial-gradient(circle_at_top,#2b2107,#050505_65%)]">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-400 bg-black text-3xl font-black text-yellow-300">
                      TC
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black p-3">
                  <Waveform small />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {visiblePads.map((pad) => (
                    <button
                      key={pad.id}
                      onClick={() => triggerPad(pad)}
                      className="min-h-[74px] rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-4 text-left text-sm font-black uppercase text-yellow-300 shadow-[0_0_14px_rgba(250,204,21,0.12)] transition hover:bg-yellow-400/20 active:scale-95"
                    >
                      <span className="block text-lg">{pad.label}</span>
                      <span className="block text-[10px] text-zinc-500">
                        {pad.file}
                      </span>
                    </button>
                  ))}
                </div>

                <OutputMeter />
              </Panel>
            </section>
          </section>
        </section>
      </section>
    </main>
  );
}

function LogoBox() {
  return (
    <section className="rounded-3xl border border-yellow-400/40 bg-[radial-gradient(circle_at_top,#3b2b06,#080808_60%)] p-5 text-center shadow-[0_0_35px_rgba(250,204,21,0.18)]">
      <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-full border-2 border-yellow-300 bg-black shadow-[0_0_35px_rgba(250,204,21,0.45)]">
        <span className="absolute -top-8 text-5xl text-yellow-300">♛</span>
        <span className="text-6xl font-black tracking-tighter text-yellow-300">
          TC
        </span>
      </div>

      <h2 className="mt-5 text-3xl font-black uppercase tracking-widest text-yellow-300">
        Tha Core
      </h2>

      <p className="text-sm font-black uppercase tracking-[0.45em] text-yellow-500">
        Radio
      </p>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-yellow-400/25 bg-[#070707] p-4 shadow-[0_0_30px_rgba(250,204,21,0.08)]">
      <h2 className="mb-4 text-lg font-black uppercase tracking-widest text-yellow-300">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatusButton({
  title,
  value,
  active,
  tone,
  onClick,
}: {
  title: string;
  value: string;
  active: boolean;
  tone: "red" | "yellow" | "blue" | "green";
  onClick: () => void;
}) {
  const color =
    tone === "red"
      ? "text-red-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "blue"
      ? "text-sky-300"
      : "text-green-300";

  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-zinc-700 bg-black p-4 text-left transition hover:border-yellow-400/60 active:scale-95"
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${
            active
              ? "bg-green-400 shadow-[0_0_14px_lime]"
              : "bg-red-500 shadow-[0_0_14px_red]"
          }`}
        />

        <p className={`text-lg font-black uppercase ${color}`}>{title}</p>
      </div>

      <p className="mt-1 text-xs font-black uppercase tracking-widest text-zinc-500">
        {value}
      </p>
    </button>
  );
}

function BigModeButton({
  label,
  active,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: "yellow" | "blue" | "green";
  onClick: () => void;
}) {
  const activeStyle =
    tone === "yellow"
      ? "border-yellow-400 bg-yellow-400/15 text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.25)]"
      : tone === "blue"
      ? "border-sky-400 bg-sky-400/15 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
      : "border-green-400 bg-green-400/15 text-green-300 shadow-[0_0_20px_rgba(74,222,128,0.25)]";

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-4 py-5 text-center text-lg font-black uppercase transition active:scale-95 ${
        active ? activeStyle : "border-zinc-700 bg-black text-zinc-500"
      }`}
    >
      {label}
    </button>
  );
}

function SideButton({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={`flex w-full items-center border-b border-yellow-400/10 px-4 py-3 text-left text-sm font-black uppercase ${
        active
          ? "bg-yellow-400/15 text-yellow-300"
          : "text-zinc-300 hover:bg-yellow-400/10 hover:text-yellow-300"
      }`}
    >
      {label}
    </button>
  );
}

function TurntableDeck({
  deck,
  timeLabel,
  timeValue,
}: {
  deck: "A" | "B";
  timeLabel: string;
  timeValue: string;
}) {
  const [pitch, setPitch] = useState(50);

  return (
    <section className="relative min-h-[330px] rounded-3xl border border-yellow-400/25 bg-[linear-gradient(145deg,#151515,#050505)] p-4 shadow-inner">
      <div className="flex justify-between">
        <div className="rounded-xl border border-zinc-700 bg-black px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {timeLabel}
          </p>

          <p className="text-xl font-black text-yellow-300">{timeValue}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-black uppercase text-zinc-400">Pitch</p>

          <input
            type="range"
            min="0"
            max="100"
            value={pitch}
            onChange={(event) => setPitch(Number(event.target.value))}
            className="h-24 accent-yellow-400"
            style={verticalSliderStyle}
          />

          <p className="text-xs font-black text-yellow-300">
            {((pitch - 50) / 10).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-center">
        <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-yellow-400/80 bg-[repeating-radial-gradient(circle,#111_0px,#111_5px,#222_6px,#050505_12px)] shadow-[0_0_35px_rgba(250,204,21,0.2)]">
          <div className="absolute inset-3 rounded-full border border-yellow-400/50" />
          <div className="absolute inset-8 rounded-full border border-yellow-400/20" />

          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-yellow-400 bg-black text-3xl font-black text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.4)]">
            TC
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-5 flex flex-col gap-3">
        <RoundButton label="VINYL" active />
        <RoundButton label="SLIP" />
      </div>

      <div className="absolute bottom-5 right-5 flex flex-col gap-3">
        <RoundButton label="REV" />
        <RoundButton label="SYNC" />
      </div>

      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-4 py-1 text-xs font-black text-black">
        DECK {deck}
      </span>
    </section>
  );
}

function RoundButton({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={`h-11 w-11 rounded-full border text-[9px] font-black uppercase transition active:scale-95 ${
        active
          ? "border-yellow-400 bg-yellow-400/20 text-yellow-300"
          : "border-zinc-700 bg-black text-zinc-400"
      }`}
    >
      {label}
    </button>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-5 py-5 text-3xl font-black uppercase transition active:scale-95 ${
        active
          ? "border-yellow-300 bg-yellow-400/20 text-yellow-300 shadow-[0_0_25px_rgba(250,204,21,0.45)]"
          : "border-zinc-700 bg-black text-white hover:border-yellow-400/60"
      }`}
    >
      {label}
    </button>
  );
}

function DeckTransport() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <ConsoleButton label="CUE" yellow />
      <ConsoleButton label="PAUSE" />
      <ConsoleButton label="PLAY" green />
    </div>
  );
}

function ConsoleButton({
  label,
  green,
  yellow,
  onClick,
}: {
  label: string;
  green?: boolean;
  yellow?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-4 py-5 text-sm font-black uppercase transition active:scale-95 ${
        green
          ? "border-green-400 bg-green-400/20 text-green-300 shadow-[0_0_15px_rgba(74,222,128,0.25)]"
          : yellow
          ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
          : "border-zinc-700 bg-black text-zinc-200 hover:border-yellow-400/60"
      }`}
    >
      {label}
    </button>
  );
}

function RequestRow({
  title,
  by,
  time,
  status,
}: {
  title: string;
  by: string;
  time: string;
  status: "PENDING" | "PLAYED";
}) {
  return (
    <div className="grid grid-cols-[1fr_75px_75px] items-center gap-2 border-b border-zinc-800 py-2 text-xs">
      <div>
        <p className="font-black uppercase text-white">{title}</p>
        <p className="text-[10px] font-bold text-zinc-500">
          Requested by: {by}
        </p>
      </div>

      <p className="font-bold text-zinc-400">{time}</p>

      <span
        className={`rounded px-2 py-1 text-center text-[10px] font-black ${
          status === "PLAYED"
            ? "bg-green-500/20 text-green-300"
            : "bg-yellow-500/20 text-yellow-300"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function Fader({
  label,
  value,
  setValue,
  red,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-3 text-center">
      <p className="mb-3 text-xs font-black uppercase text-zinc-300">{label}</p>

      <div className="flex h-40 items-center justify-center gap-2">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          className="h-36 accent-yellow-400"
          style={verticalSliderStyle}
        />

        <LedMeter level={value} small />
      </div>

      <button
        className={`mt-3 rounded-xl border px-4 py-2 text-xs font-black uppercase ${
          red
            ? "border-red-500 bg-red-500/20 text-red-300"
            : "border-green-500 bg-green-500/20 text-green-300"
        }`}
      >
        ON
      </button>

      <button className="mt-2 block w-full rounded-lg bg-zinc-900 py-1 text-[10px] font-black text-zinc-500">
        PFL
      </button>
    </div>
  );
}

function LedMeter({ level, small }: { level: number; small?: boolean }) {
  const bars = Array.from({ length: small ? 20 : 28 }, (_, index) => index);
  const activeCount = Math.round((level / 100) * bars.length);

  return (
    <div className="flex h-full flex-col-reverse gap-[3px]">
      {bars.map((bar) => {
        const active = bar < activeCount;
        const zone =
          bar > bars.length * 0.78
            ? "bg-red-500"
            : bar > bars.length * 0.58
            ? "bg-yellow-400"
            : "bg-green-500";

        return (
          <span
            key={bar}
            className={`h-[5px] w-5 rounded-sm ${
              active ? zone : "bg-zinc-800"
            }`}
          />
        );
      })}
    </div>
  );
}

function Waveform({ small }: { small?: boolean }) {
  const bars = Array.from({ length: small ? 44 : 82 }, (_, index) => {
    return 14 + ((index * 17) % 48);
  });

  return (
    <div
      className={`mt-4 flex items-end justify-center gap-[3px] ${
        small ? "h-12" : "h-24"
      }`}
    >
      {bars.map((height, index) => (
        <span
          key={index}
          className="w-[3px] rounded-full bg-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.55)]"
          style={{ height }}
        />
      ))}
    </div>
  );
}

function OutputMeter() {
  const bars = Array.from({ length: 80 }, (_, index) => index);

  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-black p-3">
      <p className="mb-2 text-xs font-black uppercase text-zinc-500">
        Output Level
      </p>

      <div className="flex gap-[3px]">
        {bars.map((bar) => {
          const zone =
            bar > 66
              ? "bg-red-500"
              : bar > 48
              ? "bg-yellow-400"
              : "bg-green-500";

          return <span key={bar} className={`h-3 flex-1 rounded ${zone}`} />;
        })}
      </div>

      <div className="mt-2 grid grid-cols-9 text-center text-[10px] font-bold text-zinc-500">
        <span>-60</span>
        <span>-40</span>
        <span>-30</span>
        <span>-20</span>
        <span>-10</span>
        <span>-6</span>
        <span>-3</span>
        <span>0</span>
        <span>+6</span>
      </div>
    </div>
  );
}