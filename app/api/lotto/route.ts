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
  const draws = ["Early Bird", "Morning", "Midday", "Mid Afternoon", "Drive Time", "Evening"];
  const results: any[] = [];

  for (const drawName of draws) {
    const pattern = new RegExp(
      drawName + "\\s+#Draw\\s+(\\d+)\\s+(?:Verified\\s+)?(\\d{1,2})\\s+([A-Z ]{2,40})",
      "i"
    );

    const match = text.match(pattern);

    if (match) {
      results.push({
        label: `Cash Pot ${drawName}`,
        draw: `#${match[1]}`,
        result: `${match[2]} - ${match[3].trim()}`,
      });
    }
  }

  return results;
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