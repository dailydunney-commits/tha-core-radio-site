export const dynamic = "force-dynamic";
export const revalidate = 900;

function clean(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#047;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function grab(text: string, label: string) {
  const rx = new RegExp(label + "\\s*Result\\s*#?\\s*(\\d+)?\\s*([\\s\\S]{0,160})", "i");
  const match = text.match(rx);

  if (!match) {
    return {
      label,
      draw: "Updating",
      result: "Result loading",
    };
  }

  return {
    label,
    draw: match[1] || "Latest",
    result: match[2]
      .replace(/Pick 2|Pick 3|Pick 4|Cash Pot|Lotto|Super Lotto/gi, "")
      .trim()
      .slice(0, 90),
  };
}

export async function GET() {
  try {
    const res = await fetch("https://www.jamaicaindex.com/lottery/jamaica-lotto-results-for-today", {
      next: { revalidate: 900 },
      headers: { "User-Agent": "Mozilla/5.0 ThaCoreRadio" },
    });

    const html = await res.text();
    const text = clean(html);

    return Response.json({
      updatedAt: new Date().toISOString(),
      source: "JamaicaIndex Supreme Ventures Results",
      results: [
        grab(text, "Cash Pot"),
        grab(text, "Pick 2"),
        grab(text, "Pick 3"),
        grab(text, "Pick 4"),
        grab(text, "Lucky 5"),
        grab(text, "Lotto"),
        grab(text, "Super Lotto"),
      ],
    });
  } catch {
    return Response.json({
      updatedAt: new Date().toISOString(),
      source: "Tha Core Results",
      results: [
        { label: "Cash Pot", draw: "Updating", result: "Result could not load right now." },
        { label: "Pick 2", draw: "Updating", result: "Result could not load right now." },
        { label: "Pick 3", draw: "Updating", result: "Result could not load right now." },
        { label: "Pick 4", draw: "Updating", result: "Result could not load right now." },
        { label: "Lucky 5", draw: "Updating", result: "Result could not load right now." },
        { label: "Lotto", draw: "Updating", result: "Result could not load right now." },
        { label: "Super Lotto", draw: "Updating", result: "Result could not load right now." },
      ],
    });
  }
}
