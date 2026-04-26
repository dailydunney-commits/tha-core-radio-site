export const dynamic = "force-dynamic";
export const revalidate = 300;

type LottoResult = {
  label: string;
  draw: string;
  result: string;
};

const SOURCES = [
  {
    label: "Cash Pot",
    url: "https://cashpotresults.info/",
    type: "cashpot",
  },
  {
    label: "Pick 2",
    url: "https://cashpotresults.info/pick-2-results/",
    type: "numbers",
  },
  {
    label: "Pick 3",
    url: "https://cashpotresults.info/pick-3-results/",
    type: "numbers",
  },
  {
    label: "Pick 4",
    url: "https://cashpotresults.info/pick-4-results/",
    type: "numbers",
  },
  {
    label: "Dollaz",
    url: "https://cashpotresults.info/dollaz-results/",
    type: "numbers",
  },
  {
    label: "Hot Pick",
    url: "https://www.jamaicaindex.com/lottery/results/hot-pick",
    type: "jamaicaindex",
  },
  {
    label: "Top Draw",
    url: "https://www.jamaicaindex.com/lottery/results/top-draw",
    type: "jamaicaindex",
  },
  {
    label: "Lotto",
    url: "https://www.jamaicaindex.com/lottery/results/lotto",
    type: "jamaicaindex",
  },
  {
    label: "Super Lotto",
    url: "https://www.jamaicaindex.com/lottery/results/super-lotto",
    type: "jamaicaindex",
  },
];

const DRAW_ORDER = [
  "Early Bird",
  "Morning",
  "Midday",
  "Mid Afternoon",
  "Drive Time",
  "Evening",
];

function clean(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/✅/g, " ")
    .replace(/✓/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeResult(raw: string, type: string) {
  const cleaned = raw
    .replace(/\bVerified\b/gi, " ")
    .replace(/\bResults?\b.*$/i, " ")
    .replace(/\bToday\b.*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.includes("?")) return "";

  if (type === "cashpot") {
    const match = cleaned.match(/^(\d{1,2})\s+([A-Za-z ]{2,35})/);
    if (!match) return "";
    return `${match[1]} - ${match[2].trim().toUpperCase()}`;
  }

  const nums = cleaned.match(/\d+/g);
  if (!nums || nums.length === 0) return "";

  return nums.slice(0, 20).join(" - ");
}

function parseCashpotInfo(text: string, gameLabel: string, type: string) {
  const results: LottoResult[] = [];

  for (const drawName of DRAW_ORDER) {
    const drawPattern = drawName.replace(/\s+/g, "\\s+");

    const regex = new RegExp(
      `${drawPattern}\\s+#Draw\\s+(\\d+)\\s+([\\s\\S]*?)(?=(Early\\s+Bird|Morning|Midday|Mid\\s+Afternoon|Drive\\s+Time|Evening)\\s+#Draw|$)`,
      "i"
    );

    const match = text.match(regex);

    if (!match) continue;

    const result = normalizeResult(match[2], type);

    if (!result) continue;

    results.push({
      label: `${gameLabel} ${drawName}`,
      draw: `#${match[1]}`,
      result,
    });
  }

  return results;
}

function parseJamaicaIndex(text: string, gameLabel: string) {
  const results: LottoResult[] = [];

  const rowPattern =
    /(EARLYBIRD|MORNING|MIDDAY|MIDAFTERNOON|DRIVETIME|EVENING|Latest Draw|Draw)\s*(?:\d{1,2}:\d{2}\s*(?:AM|PM)|\d{1,2}PM|\d{1,2}AM)?\s*#?(\d{3,6})?\s+([0-9][0-9\s+\-,]{0,80})/gi;

  let match;

  while ((match = rowPattern.exec(text)) !== null) {
    const drawName = match[1]
      .replace("EARLYBIRD", "Early Bird")
      .replace("MIDAFTERNOON", "Mid Afternoon")
      .replace("DRIVETIME", "Drive Time");

    const drawNumber = match[2] ? `#${match[2]}` : "Latest Draw";

    const nums = (match[3].match(/\d+/g) || []).slice(0, 20);

    if (nums.length === 0) continue;

    results.push({
      label: `${gameLabel} ${drawName}`,
      draw: drawNumber,
      result: nums.join(" - "),
    });
  }

  return results.slice(0, 6);
}

async function fetchSource(source: (typeof SOURCES)[number]) {
  try {
    const res = await fetch(source.url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const text = clean(html);

    if (source.type === "jamaicaindex") {
      return parseJamaicaIndex(text, source.label);
    }

    return parseCashpotInfo(text, source.label, source.type);
  } catch {
    return [];
  }
}

export async function GET() {
  const allResults: LottoResult[] = [];

  for (const source of SOURCES) {
    const results = await fetchSource(source);
    allResults.push(...results);
  }

  return Response.json({
    source: "Cashpot Results / JamaicaIndex / Supreme Ventures",
    updatedAt: new Date().toISOString(),
    results:
      allResults.length > 0
        ? allResults
        : [
            {
              label: "Supreme Ventures Results",
              draw: "Latest Draw",
              result: "Live update pending",
            },
          ],
  });
}