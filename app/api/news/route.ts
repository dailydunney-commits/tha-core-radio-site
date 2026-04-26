export const dynamic = "force-dynamic";
export const revalidate = 900;

const feeds: Record<string, string> = {
  world:
    "https://news.google.com/rss/search?q=world+news&hl=en-US&gl=US&ceid=US:en",
  music:
    "https://news.google.com/rss/search?q=reggae+dancehall+music+news&hl=en-US&gl=US&ceid=US:en",
  sports:
    "https://news.google.com/rss/search?q=sports+news&hl=en-US&gl=US&ceid=US:en",
  business:
    "https://news.google.com/rss/search?q=business+money+news&hl=en-US&gl=US&ceid=US:en",
  weather:
    "https://news.google.com/rss/search?q=Jamaica+weather+storm+news&hl=en-US&gl=US&ceid=US:en",
  "radio-updates":
    "https://news.google.com/rss/search?q=radio+music+entertainment+news&hl=en-US&gl=US&ceid=US:en",
};

function clean(text: string) {
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<li>/g, " ")
    .replace(/<\/li>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "world";
  const feedUrl = feeds[category] || feeds.world;

  try {
    const res = await fetch(feedUrl, { next: { revalidate: 900 } });
    const xml = await res.text();

    const items = (xml.match(/<item>[\s\S]*?<\/item>/g) || [])
      .slice(0, 12)
      .map((item) => {
        const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
        const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
        const source =
          item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ||
          "News Source";
        const description =
          item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ||
          "Full story summary is loading from the live news feed.";

        return {
          title: clean(title),
          link: clean(link),
          source: clean(source),
          pubDate: clean(pubDate),
          description: clean(description),
        };
      });

    return Response.json({
      category,
      updatedAt: new Date().toISOString(),
      items,
    });
  } catch {
    return Response.json({
      category,
      updatedAt: new Date().toISOString(),
      items: [
        {
          title: "Live news loading soon",
          link: "/news",
          source: "Tha Core Newsroom",
          pubDate: new Date().toUTCString(),
          description: "Live news is temporarily loading. Please refresh shortly.",
        },
      ],
    });
  }
}