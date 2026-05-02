export const dynamic = "force-dynamic";

const URL =
  "http://18.222.11.16/api/nowplaying/tha-core-online";

export async function GET() {
  try {
    const res = await fetch(URL, { cache: "no-store" });
    const data = await res.json();

    const song = data?.now_playing?.song?.title || "Tha Core Live";
    const artist = data?.now_playing?.song?.artist || "Tha Core Radio";

    const listeners =
      data?.listeners?.current ||
      data?.listeners?.total ||
      0;

    return Response.json({
      ok: true,
      song,
      artist,
      listeners,
      online: data?.is_online || false,
    });
  } catch (e) {
    return Response.json({
      ok: false,
      song: "Tha Core Live Mix",
      artist: "Tha Core Radio",
      listeners: 0,
      online: false,
    });
  }
}