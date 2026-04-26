export const dynamic = "force-dynamic";
export const revalidate = 900;

const SOURCE_URL = "https://www.jamaicaindex.com/lottery/jamaica-lotto-results-for-today";

function clean(text: string) {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, {
      next: { revalidate: 900 },
      headers: {
        "User-Agent": "Mozilla/5.0 ThaCoreRadioBot/1.0",
      },
    });

    const html = await res.text();
    const text = clean(html);

    const cashPotMatches = [...text.matchAll(/#(\d+)\s+([^#]{0,80}?)Cash Pot\s+([A-Z ]+)\s+(\d{1,2})\s+([A-Za-z ]+)?/g)];

    const results = cashPotMatches.slice(0, 6).map((match) => {
      const drawNumber = match[1];
      const dateText = match[2].trim();
      const drawName = match[3].trim();
      const number = match[4].trim();
      const meaning = (match[5] || "").trim();

      return {
        label: `Cash Pot ${drawName}`,
        draw: `#${drawNumber} • ${dateText}`,
        result: meaning ? `${number} - ${meaning}` : number,
      };
    });

    if (results.length === 0) {
      return Response.json({
        source: "JamaicaIndex / Supreme Ventures",
        sourceUrl: SOURCE_URL,
        updatedAt: new Date().toISOString(),
        results: [
          {
            label: "Cash Pot",
            draw: "Live results loading",
            result: "Check again shortly",
          },
        ],
      });
    }

    return Response.json({
      source: "JamaicaIndex / Supreme Ventures",
      sourceUrl: SOURCE_URL,
      updatedAt: new Date().toISOString(),
      results,
    });
  } catch {
    return Response.json({
      source: "JamaicaIndex / Supreme Ventures",
      sourceUrl: SOURCE_URL,
      updatedAt: new Date().toISOString(),
      results: [
        {
          label: "Cash Pot",
          draw: "Unable to load live draw",
          result: "Try refresh shortly",
        },
      ],
    });
  }
}