import { NextResponse } from "next/server";
import http from "node:http";
import https from "node:https";

function getJson(url: string, redirectCount = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects from AzuraCast"));
      return;
    }

    const isHttps = url.startsWith("https://");
    const client = isHttps ? https : http;

    const req = client.get(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Tha-Core-Radio-Site/1.0",
        },
        timeout: 10000,
        ...(isHttps
          ? {
              agent: new https.Agent({
                rejectUnauthorized: false,
              }),
            }
          : {}),
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;
        const location = res.headers.location;

        if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
          const nextUrl = new URL(location, url).toString();
          resolve(getJson(nextUrl, redirectCount + 1));
          return;
        }

        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new Error(
                `AzuraCast request failed with status ${statusCode}: ${body}`
              )
            );
            return;
          }

          resolve(body);
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("AzuraCast request timed out"));
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

export async function GET() {
  try {
    const azuraUrl = process.env.AZURACAST_NOW_PLAYING_URL;

    if (!azuraUrl) {
      return NextResponse.json(
        { error: "Missing AZURACAST_NOW_PLAYING_URL" },
        { status: 500 }
      );
    }

    const text = await getJson(azuraUrl);
    const data = JSON.parse(text);

    const station = Array.isArray(data)
      ? data.find(
          (item) =>
            item?.station?.shortcode === "tha-core-online" ||
            item?.station?.name === "Tha Core Online Radio"
        )
      : data;

    if (!station) {
      return NextResponse.json(
        { error: "Station not found in AzuraCast response" },
        { status: 404 }
      );
    }

    return NextResponse.json(station);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load now playing data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}