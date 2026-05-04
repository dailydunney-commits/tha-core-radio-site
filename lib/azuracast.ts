export type RadioAction = "skip" | "restart" | "start" | "stop";

export function getAzuraBaseUrl() {
  return (process.env.AZURACAST_BASE_URL || "http://thacoreonlinerad.com").replace(/\/$/, "");
}

export function getAzuraStationShortcode() {
  return process.env.AZURACAST_STATION_SHORTCODE || "tha-core-online";
}

export function getAzuraStationId() {
  return process.env.AZURACAST_STATION_ID || "1";
}

export function getAzuraApiKey() {
  return process.env.AZURACAST_API_KEY || "";
}

export function getAuthHeaders() {
  const apiKey = getAzuraApiKey();

  if (!apiKey) {
    throw new Error("Missing AZURACAST_API_KEY.");
  }

  return {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
  };
}

export function getPadRequestMap(): Record<string, string> {
  const raw = process.env.AZURACAST_PAD_REQUESTS || "{}";

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function getPadSlug(label: string) {
  return label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
