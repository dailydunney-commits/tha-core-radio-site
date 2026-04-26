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

function parseResults(text: string) {
  const games = [
    "Cash Pot",
    "Pick 2",
    "Pick 3",
    "Pick 4",
    "Hot Pick",
    "Top Draw",
    "Dollaz",
    "Lotto",
    "Super Lotto",
  ];

  const results: any[] = [];

  const rowPattern =
    /(\d{1,2}\s+[A-Za-z]+\s+\d{4},\s+[A-Za-z]+)\s+(Cash Pot|Pick 2|Pick 3|Pick 4|Hot Pick|Top Draw|Dollaz|Lotto|Super Lotto)\s+([A-Z ]+)?\s+([\d\s+]+(?:\s+\$[\d,]+)?)(?:\s+[A-Za-z ]+)?\s*-?#(\d+)/gi;

  let match;

  while ((match = rowPattern.exec(text)) !== null) {
    const date = match[1].trim();
    const game = match[2].trim();
    const drawName = (match[3] || "Latest Draw").trim();
    const nums = match[4].trim().replace(/\s+/g, " ");
    const draw = match[5].trim();

    results.push({
      label: game,
      draw: `#${draw} • ${drawName} • ${date}`,
      result: nums,
    });
  }

  const latestByGame: any[] = [];

  for (const game of games) {
    const found = results.filter((item) => item.label === game).slice(0, 6);
    latestByGame.push(...found);
  }

  return latestByGame;
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
      source: "JamaicaIndex / Supreme Ventures",
      sourceUrl: SOURCE_URL,
      updatedAt: new Date().toISOString(),
      results:
        results.length > 0
          ? results
          : [
              {
                label: "Supreme Ventures Results",
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
          label: "Supreme Ventures Results",
          draw: "Latest Draw",
          result: "Try refresh shortly",
        },
      ],
    });
  }
}