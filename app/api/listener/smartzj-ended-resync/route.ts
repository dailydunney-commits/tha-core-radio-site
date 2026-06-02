import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let lastKickAt = 0;

function baseUrl() {
  return String(process.env.SMARTZJ_INTERNAL_BASE_URL || "http://127.0.0.1:3101").replace(/\/+$/, "");
}

async function getJson(path: string, init?: RequestInit) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Cache-Control": "no-store", ...(init?.headers || {}) },
  });

  return res.json().catch(() => ({}));
}

export async function POST(request: NextRequest) {
  const now = Date.now();
  const requestUrl = new URL(request.url);
  const requestedLane = requestUrl.searchParams.get("lane") || "schedule";
  const cleanNextPath =
    `/api/listener/smartzj-clean-next?lane=${encodeURIComponent(requestedLane)}` +
    `&ended=1&ownerMonitorEnded=1&controlPanelBrain=1&endedResync=${now}`;

  if (now - lastKickAt < 30000) {
    const current = await getJson(`/api/listener/now-playing?endedCooldown=${now}`);

    return NextResponse.json({
      ok: true,
      action: "COOLDOWN_RETURN_CURRENT",
      kicked: false,
      current,
    });
  }

  lastKickAt = now;

  const nextResult = await getJson(cleanNextPath, {
    method: "POST",
  });

  await new Promise((resolve) => setTimeout(resolve, 1200));

  const current = await getJson(`/api/listener/now-playing?endedResync=${Date.now()}`);

  return NextResponse.json({
    ok: true,
    action: "ENDED_RESYNC_KICKED_NEXT_ONCE",
    kicked: true,
    cleanNextPath,
    nextResult,
    current,
  });
}
