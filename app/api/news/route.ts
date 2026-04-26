export const dynamic = "force-dynamic";
export const revalidate = 3600;

const feeds = [
  { category: "World", url: "https://news.google.com/rss/search?q=world+news&hl=en-US&gl=US&ceid=US:en" },
  { category: "Music", url: "https://news.google.com/rss/search?q=reggae+dancehall+music+news&hl=en-US&gl=US&ceid=US:en" },
  { category: "Sports", url: "https://news.google.com/rss/search?q=sports+news&hl=en-US&gl=US&ceid=US:en" },
  { category: "Business", url: "https://news.google.com/rss/search?q=business+money+news&hl=en-US&gl=US&ceid=US:en" },
  { category: "Weather", url: "https://news.google.com/rss/search?q=Jamaica+weather+storm+news&hl=en-US&gl=US&ceid=US:en" },
  { category: "Radio", url: "https://news.google.com/rss/search?q=radio+music+entertainment+news&hl=en-US&gl=US&ceid=US:en" },
];

function clean(text: string) {
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export async function GET() {
  const allItems: any[] = [];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, { next: { revalidate: 3600 } });
      const xml = await res.text();

      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

      items.slice(0, 5).forEach((item) => {
        const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
        const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "News Source";

        allItems.push({
          category: feed.category,
          title: clean(title),
          source: clean(source),
          pubDate: clean(pubDate),
        });
      });
    } catch {
      allItems.push({
        category: feed.category,
        title: `${feed.category} updates loading soon`,
        source: "Tha Core Newsroom",
        pubDate: new Date().toUTCString(),
      });
    }
  }

  return Response.json({
    updatedAt: new Date().toISOString(),
    items: allItems,
  });
}
