export const dynamic = "force-dynamic";
export const revalidate = 10;

const AZURACAST_NOW_PLAYING =
  "https://thacoreonlinerad.com/api/nowplaying/tha-core-online";

export async function GET() {
  try {
    const res = await fetch(AZURACAST_NOW_PLAYING, {
      cache: "no-store",
    });

    const data = await res.json();

    const song =
      data?.now_playing?.song?.title ||
      data?.now_playing?.song?.text ||
      "Tha Core Live Mix";

    const artist =
      data?.now_playing?.song?.artist ||
      "Live From Tha Core";

    const listeners =
      data?.listeners?.current ||
      data?.listeners?.total ||
      0;

    return Response.json({
      ok: true,
      song,
      artist,
      listeners,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return Response.json({
      ok: false,
      song: "Tha Core Live Mix",
      artist: "Live From Tha Core",
      listeners: 0,
      updatedAt: new Date().toISOString(),
    });
  }
}