"use client";

import { useEffect, useState } from "react";

type AnyObj = Record<string, any>;

function getPlaylistTracks(data: AnyObj | null): any[] {
  if (!data) return [];

  const possibleLists = [
    data?.playlist,
    data?.lastPlaylist,
    data?.lastResult?.playlist,
    data?.lastResult?.lastPlaylist,
    data?.smartdj?.playlist?.tracks,
    data?.smartdj?.playlist,
    data?.smartdj?.lastPlaylist,
  ];

  for (const list of possibleLists) {
    if (Array.isArray(list)) return list;
  }

  return [];
}

function getHeldCount(tracks: any[]): number {
  return tracks.filter((track) =>
    String(track?.action ?? track?.statusText ?? track?.reason ?? "")
      .toLowerCase()
      .includes("held")
  ).length;
}

function buildPlaylistStatus(data: AnyObj | null): string {
  const tracks = getPlaylistTracks(data);
  const heldCount = getHeldCount(tracks);

  if (tracks.length > 0) {
    return heldCount > 0
      ? `SmartDJ playlist loaded: ${tracks.length} track(s). ${heldCount} HELD waiting on clean/bleep copy.`
      : `SmartDJ playlist loaded: ${tracks.length} track(s).`;
  }

  const fallback = String(
    data?.statusText ||
      data?.message ||
      data?.reply ||
      data?.resultLabel ||
      data?.smartdj?.message ||
      ""
  ).trim();

  if (fallback && !fallback.toLowerCase().includes("returned 0 result")) {
    return fallback;
  }

  return "No SmartDJ playlist created yet. Ask SmartDJ to build one.";
}

async function readJsonSafe(response: Response): Promise<AnyObj | null> {
  try {
    return (await response.json()) as AnyObj;
  } catch {
    return null;
  }
}

export default function OwnerSmartDjCommand() {
  const [command, setCommand] = useState("find and play mothers day song");
  const [status, setStatus] = useState("SmartDJ command ready.");
  const [busy, setBusy] = useState(false);

  async function syncLatestPlaylist() {
    try {
      const response = await fetch("/api/smartdj/command", {
        method: "GET",
        cache: "no-store",
      });

      const data = await readJsonSafe(response);

      if (!response.ok || !data) return;

      const nextStatus = buildPlaylistStatus(data);
      setStatus(nextStatus);
    } catch {
      // Keep last good message.
    }
  }

  useEffect(() => {
    syncLatestPlaylist();

    const timer = window.setInterval(syncLatestPlaylist, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function askSmartDj() {
    setBusy(true);
    setStatus("SmartDJ is thinking...");

    try {
      const playlistMode =
        /\b(build|make|compile)\b/i.test(command) &&
        /\b(playlist|set)\b/i.test(command);

      const response = await fetch(
        playlistMode ? "/api/smartdj/build-playlist" : "/api/smartdj/command",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            command,
            text: command,
          }),
        }
      );

      const data = await readJsonSafe(response);

      if (!response.ok || !data) {
        setStatus("SmartDJ engine error. Check command route.");
        return;
      }

      const tracks = getPlaylistTracks(data);

      if (tracks.length > 0) {
        setStatus(buildPlaylistStatus(data));
        return;
      }

      const selected = data?.smartdj?.selected;

      if (selected) {
        setStatus(selected.text || selected.filename || "SmartDJ found track.");
        return;
      }

      const fallback = String(
        data?.statusText ||
          data?.message ||
          data?.reply ||
          data?.resultLabel ||
          data?.smartdj?.message ||
          ""
      ).trim();

      if (fallback && !fallback.toLowerCase().includes("returned 0 result")) {
        setStatus(fallback);
        return;
      }

      await syncLatestPlaylist();
    } catch {
      setStatus("SmartDJ engine offline. Make sure localhost is running.");
    } finally {
      setBusy(false);
    }
  }

  async function viewLastPlaylist() {
    setBusy(true);
    setStatus("Loading latest SmartDJ playlist...");

    try {
      const response = await fetch("/api/smartdj/command", {
        method: "GET",
        cache: "no-store",
      });

      const data = await readJsonSafe(response);

      if (!response.ok || !data) {
        setStatus("Could not load latest SmartDJ playlist.");
        return;
      }

      setStatus(buildPlaylistStatus(data));
    } catch {
      setStatus("Could not load latest SmartDJ playlist.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="owner-smartdj-command-box">
      <strong>SMARTDJ COMMAND</strong>

      <input
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        placeholder="Tell SmartDJ what to find, play, or build..."
      />

      <button type="button" onClick={askSmartDj} disabled={busy}>
        ASK SMARTDJ
      </button>

      <button type="button" onClick={viewLastPlaylist} disabled={busy}>
        VIEW LAST PLAYLIST
      </button>

      <span>{status}</span>
    </div>
  );
}
