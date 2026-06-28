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
  let effectiveRequestedLane = requestedLane; // THA_CORE_SCHEDULE_REFRESH_REAL_SELECTED_LANE_V1
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

  // THA_CORE_SCHEDULE_REFRESH_NO_LEAK_GUARD_V1
  const isScheduleRefresh =
    requestUrl.searchParams.get("scheduleRefresh") === "1" ||
    requestUrl.searchParams.get("controlPanelBrain") === "1";

  if (isScheduleRefresh) {
    const scheduleState = await getJson(`/api/radio/smartzj-schedule?scheduleRefreshGuard=${now}`);
    const activeBlock = ((scheduleState as any)?.activeBlock || null) as Record<string, any> | null;
    const activeType = String(activeBlock?.type || activeBlock?.kind || "");
    const selectedLane = String((scheduleState as any)?.selectedLane || activeBlock?.primaryLane || "");
    const selectedLaneCount = Number((scheduleState as any)?.selectedLaneCount || 0);
    const selectionReason = String((scheduleState as any)?.selectionReason || "");

    const isMusicBlock = !activeType || /music/i.test(activeType);
    const hasPlayableScheduledMusic =
      Boolean((scheduleState as any)?.ok) &&
      Boolean(activeBlock) &&
      isMusicBlock &&
      Boolean(selectedLane) &&
      selectedLaneCount > 0 &&
      !/NO_PLAYABLE|NOT_READY|MISSING|EMPTY|BLOCKED|FALLBACK/i.test(selectionReason);

    if (hasPlayableScheduledMusic && selectedLane) {
      effectiveRequestedLane = selectedLane;
    }

    if (!hasPlayableScheduledMusic) {
      const current = await getJson(`/api/listener/now-playing?scheduleRefreshBlocked=${Date.now()}`);

      return NextResponse.json(
        {
          ok: true,
          action: "SCHEDULE_REFRESH_BLOCKED_NO_VALID_SCHEDULE_AUDIO",
          kicked: false,
          blockedSmartZjTakeover: true,
          blockedFallbackLeak: true,
          blockedRawAzura: true,
          requestedLane,
          activeTitle: String(activeBlock?.title || activeBlock?.name || ""),
          activeType,
          selectedLane,
          selectedLaneCount,
          selectionReason,
          current,
          message:
            "Schedule Refresh found no valid scheduled music/audio. SmartZJ clean-next was not called. No fallback audio released.",
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Tha-Core-Schedule-Refresh-No-Leak": "true",
            "X-Tha-Core-No-Old-Fallback": "true",
          },
        }
      );
    }
  }

  const cleanNextPath =
    `/api/listener/smartzj-clean-next?lane=${encodeURIComponent(effectiveRequestedLane)}` +
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
    requestedLane,
    effectiveRequestedLane,
    cleanNextPath,
    nextResult,
    current,
  });
}
