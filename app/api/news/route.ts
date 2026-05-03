import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  category: string;
};

const NEWS_FEEDS: Record<string, string> = {
  world:
    "https://news.google.com/rss/search?q=world+news&hl=en-US&gl=US&ceid=US:en",
  music:
    "https://news.google.com/rss/search?q=reggae+dancehall+music+news&hl=en-US&gl=US&ceid=US:en",
  sports:
    "https://news.google.com/rss/search?q=sports+news+jamaica+caribbean&hl=en-US&gl=US&ceid=US:en",
  business:
    "https://news.google.com/rss/search?q=business+news+jamaica+caribbean&hl=en-US&gl=US&ceid=US:en",
  weather:
    "https://news.google.com/rss/search?q=jamaica+weather+storm+hurricane&hl=en-US&gl=US&ceid=US:en",
  radio:
    "https://news.google.com/rss/search?q=radio+music+entertainment+news&hl=en-US&gl=US&ceid=US:en",
};

function decodeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function getTagValue(item: string, tag: string) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = item.match(regex);

  if (!match?.[1]) {
    return "";
  }

  return decodeHtml(match[1]);
}

function parseRssItems(xml: string, category: string): NewsItem[] {
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  return itemMatches.slice(0, 10).map((item) => {
    const title = getTagValue(item, "title");
    const link = getTagValue(item, "link");
    const pubDate = getTagValue(item, "pubDate");
    const source = getTagValue(item, "source") || "Google News";
    const description = stripHtml(getTagValue(item, "description"));

    return {
      title: title || "Untitled news story",
      link,
      pubDate,
      source,
      description,
      category,
    };
  });
}

async function fetchFeed(category: string): Promise<NewsItem[]> {
  const feedUrl = NEWS_FEEDS[category] || NEWS_FEEDS.world;

  const response = await fetch(feedUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "Tha Core Radio News Reader",
    },
  });

  if (!response.ok) {
    throw new Error(`News feed failed for ${category}: ${response.status}`);
  }

  const xml = await response.text();
  return parseRssItems(xml, category);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedCategory = (
      searchParams.get("category") || "all"
    ).toLowerCase();

    const categories =
      requestedCategory === "all"
        ? Object.keys(NEWS_FEEDS)
        : [requestedCategory];

    const results = await Promise.all(
      categories.map(async (category) => {
        const items = await fetchFeed(category);
        return items;
      })
    );

    const items = results
      .flat()
      .sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime();
        const dateB = new Date(b.pubDate).getTime();
        return dateB - dateA;
      })
      .slice(0, requestedCategory === "all" ? 30 : 12);

    return NextResponse.json({
      ok: true,
      category: requestedCategory,
      count: items.length,
      items,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Unable to load news feed.",
        items: [],
      },
      { status: 500 }
    );
  }
}
