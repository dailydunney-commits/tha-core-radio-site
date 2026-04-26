export const dynamic = "force-dynamic";
export const revalidate = 300;

const URL = "https://www.jamaicaindex.com/lottery/jamaica-lotto-results-for-today";

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

export async function GET() {
  try {
    const res = await fetch(URL, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const html = await res.text();
    const text = clean(html);

    const results = [];

    const cashPot = text.match(/Cash Pot\s+(Morning|Midday|Evening|Night)?\s*(\d{1,2})/i);
    if (cashPot) {
      results.push({
        label: "Cash Pot",
        draw: cashPot[1] || "Latest Draw",
        result: cashPot[2],
      });
    }

    const lotto = text.match(/Lotto\s+([0-9,\s]+)/i);
    if (lotto) {
      results.push({
        label: "Lotto",
        draw: "Latest Draw",
        result: lotto[1].trim(),
      });
    }

    const pick3 = text.match(/Pick\s?3\s+([0-9]{3})/i);
    if (pick3) {
      results.push({
        label: "Pick 3",
        draw: "Latest Draw",
        result: pick3[1],
      });
    }

    if (results.length === 0) {
      results.push({
        label: "Cash Pot",
        draw: "Latest Draw",
        result: "Live update pending",
      });
    }

    return Response.json({
      source: "JamaicaIndex / Supreme Ventures",
      updatedAt: new Date().toISOString(),
      results,
    });
  } catch {
    return Response.json({
      source: "Tha Core Backup Feed",
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