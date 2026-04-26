export const dynamic = "force-dynamic";
export const revalidate = 300;

const SOURCE_URL =
  "https://www.jamaicaindex.com/lottery/jamaica-lotto-results-for-today";

function clean(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCashPot(text: string) {
  const results: any[] = [];

  const regex =
    /(\d{1,2}\s+[A-Za-z]+\s+\d{4},\s+[A-Za-z]+)\s+Cash Pot\s+(EARLYBIRD|MORNING|MIDDAY|MIDAFTERNOON|DRIVETIME|EVENING|NIGHT)\s+(\d{1,2})\s+([A-Za-z ]+?)\s+(gold|white|red|blue|green|yellow|black)?\s*(gold|white|red|blue|green|yellow|black)?\s*-#(\d+)/gi;

  let match;

  while ((match = regex.exec(text)) !== null) {
    results.push({
      label: `Cash Pot ${match[2]}`,
      draw: `#${match[7]} • ${match[1]}`,
      result: `${match[3]} - ${match[4].trim()}`,
    });
  }

  return results.slice(0, 6);
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
    const results = parseCashPot(text);

    return Response.json({
      source: "JamaicaIndex / Supreme Ventures",
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