export const dynamic = "force-dynamic";
export const revalidate = 300;

const SOURCE_URL = "https://supremeventurescashpotresults.com/cashpot-results/";

function clean(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseResults(text: string) {
  const drawNames = ["Early Bird", "Morning", "Midday", "Mid Afternoon", "Drive Time", "Evening"];
  const results: any[] = [];

  for (const name of drawNames) {
    const safeName = name.replace(" ", "\\s*");
    const regex = new RegExp(`${safeName}[^0-9#]{0,80}(?:#\\s*Draw\\s*)?(\\d{4,6})?[^0-9]{0,80}(\\d{1,2})\\s*[-–]?\\s*([A-Za-z ]{2,30})`, "i");
    const match = text.match(regex);

    if (match) {
      results.push({
        label: `Cash Pot ${name}`,
        draw: match[1] ? `#${match[1]}` : "Latest Draw",
        result: `${match[2]} - ${match[3].trim()}`
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
      source: "Supreme Ventures Cash Pot Results",
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