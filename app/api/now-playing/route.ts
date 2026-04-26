export const dynamic = "force-dynamic";
export const revalidate = 0;

const URLS = [
  "https://thacoreonlinerad.com/api/nowplaying/tha-core-online",
  "https://thacoreonlinerad.com/api/nowplaying_static/tha-core-online.json",
  "https://thacoreonlinerad.com/api/nowplaying",
  "http://thacoreonlinerad.com/api/nowplaying/tha-core-online",
  "http://thacoreonlinerad.com/api/nowplaying_static/tha-core-online.json",
  "http://thacoreonlinerad.com/api/nowplaying",
];

function pickStation(data: any) {
  if (Array.isArray(data)) {
    return (
      data.find((s) => s?.station?.shortcode === "tha-core-online") ||
      data.find((s) => s?.station?.name?.toLowerCase?.().includes("core")) ||
      data[0]
    );
  }

  return data;
}

function parseNowPlaying(data: any) {
  const station = pickStation(data);
  const songObj = station?.now_playing?.song || {};
  const listenersObj = station?.listeners || {};

  const text = songObj.text || "";
  const title = songObj.title || text || "Tha Core Live Mix";
  const artist = songObj.artist || "Live From Tha Core";

  return {
    song: title,
    artist,
    listeners: listenersObj.current ?? listenersObj.total ?? 0,
    rawText: text,
  };
}

export async function GET() {
  for (const url of URLS) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const parsed = parseNowPlaying(data);

      return Response.json({
        ok: true,
        source: url,
        song: parsed.song,
        artist: parsed.artist,
        listeners: parsed.listeners,
        rawText: parsed.rawText,
        updatedAt: new Date().toISOString(),
      });
    } catch {}
  }

  return Response.json({
    ok: false,
    song: "Tha Core Live Mix",
    artist: "Live From Tha Core",
    listeners: 0,
    error: "No AzuraCast now-playing endpoint responded.",
    updatedAt: new Date().toISOString(),
  });
}