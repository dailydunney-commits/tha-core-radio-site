import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RadioCommandBody = {
  command?: string;
};

const AZURACAST_BASE_URL =
  process.env.AZURACAST_BASE_URL || "https://thacoreonlinerad.com";

const AZURACAST_STATION_ID = process.env.AZURACAST_STATION_ID || "1";

const AZURACAST_API_KEY = process.env.AZURACAST_API_KEY || "";

const ADMIN_CONTROL_KEY =
  process.env.ADMIN_CONTROL_KEY ||
  process.env.ADMIN_DELETE_KEY ||
  "";

function cleanBaseUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function missingConfig(name: string) {
  return jsonResponse(
    {
      ok: false,
      message: `Missing server env variable: ${name}`,
    },
    500
  );
}

async function callAzura(path: string, method: "GET" | "POST" = "POST") {
  if (!AZURACAST_API_KEY) {
    return {
      ok: false,
      status: 500,
      url: null,
      data: {
        message: "Missing AZURACAST_API_KEY on the server.",
      },
    };
  }

  const url = `${cleanBaseUrl(AZURACAST_BASE_URL)}${path}`;

  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${AZURACAST_API_KEY}`,
        "X-API-Key": AZURACAST_API_KEY,
      },
    });

    let data: unknown = null;

    try {
      data = await response.json();
    } catch {
      data = {
        message: response.statusText || "No JSON response from AzuraCast.",
      };
    }

    return {
      ok: response.ok,
      status: response.status,
      url,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      url,
      data: {
        message:
          error instanceof Error
            ? error.message
            : "AzuraCast request failed.",
      },
    };
  }
}

async function runAzuraStep(label: string, path: string, method: "GET" | "POST" = "POST") {
  const result = await callAzura(path, method);

  return {
    label,
    ok: result.ok,
    status: result.status,
    url: result.url,
    data: result.data,
  };
}

async function requestPreset(envName: string, label: string) {
  const requestId = process.env[envName];

  if (!requestId) {
    return jsonResponse(
      {
        ok: false,
        command: label.toLowerCase(),
        message: `${label} is not wired yet. Add ${envName} to .env.local and Vercel after you choose the request ID from AzuraCast.`,
      },
      400
    );
  }

  const result = await runAzuraStep(
    label,
    `/api/station/${AZURACAST_STATION_ID}/request/${requestId}`
  );

  return jsonResponse({
    ok: result.ok,
    command: label.toLowerCase(),
    message: result.ok
      ? `${label} request sent to AzuraCast.`
      : `${label} request failed.`,
    result,
  });
}

export async function POST(request: NextRequest) {
  if (!ADMIN_CONTROL_KEY) {
    return missingConfig("ADMIN_CONTROL_KEY");
  }

  if (!AZURACAST_BASE_URL) {
    return missingConfig("AZURACAST_BASE_URL");
  }

  if (!AZURACAST_STATION_ID) {
    return missingConfig("AZURACAST_STATION_ID");
  }

  const incomingKey = request.headers.get("x-admin-key") || "";

  if (incomingKey.trim() !== ADMIN_CONTROL_KEY.trim()) {
    return jsonResponse(
      {
        ok: false,
        message: "Unauthorized. Wrong owner control key.",
      },
      401
    );
  }

  let body: RadioCommandBody = {};

  try {
    body = (await request.json()) as RadioCommandBody;
  } catch {
    body = {};
  }

  const command = String(body.command || "").trim().toLowerCase();

  if (!command) {
    return jsonResponse(
      {
        ok: false,
        message: "Missing command.",
      },
      400
    );
  }

  if (command === "skip" || command === "skip_song") {
    const result = await runAzuraStep(
      "Skip current song",
      `/api/station/${AZURACAST_STATION_ID}/backend/skip`
    );

    return jsonResponse({
      ok: result.ok,
      command,
      message: result.ok
        ? "Skip command sent to AzuraCast."
        : "Skip command failed.",
      result,
    });
  }

  if (command === "broadcast_play" || command === "autodj_on") {
    const result = await runAzuraStep(
      "Start backend / AutoDJ",
      `/api/station/${AZURACAST_STATION_ID}/backend/start`
    );

    return jsonResponse({
      ok: result.ok,
      command,
      message: result.ok
        ? "Broadcast play/backend start command sent to AzuraCast."
        : "Broadcast play/backend start command failed.",
      note:
        "This command starts the backend/AutoDJ only. It no longer calls frontend/start because your AzuraCast frontend returned 500 there.",
      result,
    });
  }

  if (command === "broadcast_pause" || command === "autodj_off") {
    const result = await runAzuraStep(
      "Stop backend / AutoDJ",
      `/api/station/${AZURACAST_STATION_ID}/backend/stop`
    );

    return jsonResponse({
      ok: result.ok,
      command,
      message: result.ok
        ? "Broadcast pause/backend stop command sent to AzuraCast."
        : "Broadcast pause/backend stop command failed.",
      warning:
        "This stops the AutoDJ/backend. Listeners may hear silence until broadcast_play/backend start is sent again.",
      result,
    });
  }

  if (command === "backend_restart") {
    const result = await runAzuraStep(
      "Restart backend",
      `/api/station/${AZURACAST_STATION_ID}/backend/restart`
    );

    return jsonResponse({
      ok: result.ok,
      command,
      message: result.ok
        ? "Backend restart command sent to AzuraCast."
        : "Backend restart failed.",
      result,
    });
  }

  if (command === "frontend_restart") {
    const result = await runAzuraStep(
      "Restart frontend",
      `/api/station/${AZURACAST_STATION_ID}/frontend/restart`
    );

    return jsonResponse({
      ok: result.ok,
      command,
      message: result.ok
        ? "Frontend restart command sent to AzuraCast."
        : "Frontend restart failed.",
      result,
    });
  }

  if (command === "station_restart" || command === "restart_station") {
    const result = await runAzuraStep(
      "Restart station",
      `/api/station/${AZURACAST_STATION_ID}/restart`
    );

    return jsonResponse({
      ok: result.ok,
      command,
      message: result.ok
        ? "Full station restart command sent to AzuraCast."
        : "Full station restart failed.",
      result,
    });
  }

  if (command === "jingle" || command === "jingles") {
    return requestPreset("AZURACAST_JINGLE_REQUEST_ID", "Jingle");
  }

  if (command === "ad" || command === "ads") {
    return requestPreset("AZURACAST_AD_REQUEST_ID", "Ad");
  }

  if (command === "commercial") {
    return requestPreset("AZURACAST_COMMERCIAL_REQUEST_ID", "Commercial");
  }

  if (command === "birthday" || command === "birthday_shout") {
    return requestPreset("AZURACAST_BIRTHDAY_REQUEST_ID", "Birthday shoutout");
  }

  if (command === "status") {
    const result = await runAzuraStep(
      "Station status",
      `/api/station/${AZURACAST_STATION_ID}/status`,
      "GET"
    );

    return jsonResponse({
      ok: result.ok,
      command,
      message: result.ok ? "Station status loaded." : "Station status failed.",
      result,
    });
  }

  return jsonResponse(
    {
      ok: false,
      message: `Unknown command: ${command}`,
      supportedCommands: [
        "skip",
        "broadcast_play",
        "broadcast_pause",
        "autodj_on",
        "autodj_off",
        "backend_restart",
        "frontend_restart",
        "station_restart",
        "jingles",
        "ads",
        "commercial",
        "birthday",
        "status",
      ],
    },
    400
  );
}