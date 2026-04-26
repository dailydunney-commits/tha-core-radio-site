export const dynamic = "force-dynamic";
export const revalidate = 300;

const SOURCE_URL = "https://cashpotresults.info/";

function clean(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/✅/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseResults(text: string) {
  const results: any[] = [];

  const pattern =
    /(Early Bird|Morning|Midday|Mid Afternoon|Drive Time|Evening)\s+#Draw\s+(\d+)\s+(?:Verified\s+)?(\d{1,2})\s+([A-Z ]{2,40})/gi;

  let match;

  while ((match = pattern.exec(text)) !== null) {
    results.push({
      label: `Cash Pot ${match[1]}`,
      draw: `#${match[2]}`,
      result: `${match[3]} - ${match[4].trim()}`,
    });
  }

  const order = ["Early Bird", "Morning", "Midday", "Mid Afternoon", "Drive Time", "Evening"];

  return results.sort((a, b) => {
    const aIndex = order.findIndex((name) => a.label.includes(name));
    const bIndex = order.findIndex((name) => b.label.includes(name));
    return aIndex - bIndex;
  });
}

export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const html = await res.text();
    const text = clean(html);
    const results = parseResults(text);

    return Response.json({
      source: "Cashpot Results / Supreme Ventures",
      sourceUrl: SOURCE_URL,
      updatedAt: new Date().toISOString(),
      results:
        results.length > 0
          ? results
          : [
              {
                label: "Cash Pot",
                draw: "Latest Draw",
                result: "Live update pending",
              },
            ],
    });
  } catch {
    return Response.json({
      source: "Tha Core Backup",
      updatedAt: new Date().toISOString(),
      results: [
        {
          label: "Cash Pot",
          draw: "Latest Draw",
          result: "Try refresh shortly",
        },
      ],
    });
  }
}