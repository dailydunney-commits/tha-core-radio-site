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
  // NIA_PROGRAM_ENDED_RESYNC_ADVANCE_V1
  // If a full Nia news program is active and the browser says audio ended,
  // advance Nia to the next program part instead of letting SmartZJ take over.
  const niaProgramCheck = await getJson(`/api/radio/ai-host-program-broadcast?endedResync=${now}`);
  const niaState = ((niaProgramCheck as any)?.state || {}) as Record<string, any>;
  const niaProgramId = String(niaState?.programId || "");
  const niaCurrentPart = Number(niaState?.currentPartNumber || 0);
  const niaTotalParts = Number(niaState?.totalParts || 0);

  if (niaState?.active === true && niaProgramId && (!niaTotalParts || niaCurrentPart < niaTotalParts)) {
    let niaNext: any = null;

    try {
      const res = await fetch(`http://127.0.0.1:${process.env.PORT || "3101"}/api/radio/ai-host-program-broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "next",
          programId: niaProgramId,
          broadcast: true,
          force: true,
          reason: "NIA_PROGRAM_ENDED_RESYNC_ADVANCE_V1",
        }),
      });

      niaNext = {
        ok: res.ok,
        status: res.status,
        data: await res.json().catch(() => ({})),
      };
    } catch (error: any) {
      niaNext = {
        ok: false,
        error: error?.message || "NIA_PROGRAM_NEXT_FAILED",
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    const current = await getJson(`/api/listener/now-playing?niaProgramEndedResync=${Date.now()}`);

    return NextResponse.json({
      ok: true,
      action: "NIA_PROGRAM_ENDED_RESYNC_ADVANCE_V1",
      kicked: true,
      blockedSmartZjTakeover: true,
      niaProgramId,
      niaCurrentPart,
      niaTotalParts,
      niaNext,
      current,
    });
  }

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
