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

// ENDED_RESYNC_DURATION_LOCK_V1
function getDurationLock(currentLike: any) {
  const root = currentLike || {};
  const current = root.currentBroadcast || root || {};
  const track = current.track || root.track || {};

  const type = String(current.type || root.type || track.type || "").toLowerCase();
  const source = String(current.source || root.source || track.source || "").toLowerCase();
  const directAudioUrl = String(
    current.directAudioUrl ||
      root.directAudioUrl ||
      current.audioUrl ||
      root.audioUrl ||
      current.streamUrl ||
      root.streamUrl ||
      ""
  );

  const isMusic =
    type.includes("music") ||
    source.includes("smartdj") ||
    source.includes("schedule") ||
    directAudioUrl.includes("/audio/smartdj/clean/") ||
    directAudioUrl.includes("/audio/control-panel/muzik/");

  const isProtectedNonMusic =
    type.includes("jingle") ||
    type.includes("news") ||
    type.includes("program") ||
    directAudioUrl.includes("/jingle") ||
    directAudioUrl.includes("/drops/") ||
    directAudioUrl.includes("/ai-studio/") ||
    directAudioUrl.includes("/ai-host/");

  if (!isMusic || isProtectedNonMusic) return null;

  const durationSec = ffprobeMissingDurationV1(root, current, track);

  const startedAtRaw =
    current.startedAt ||
    root.startedAt ||
    track.startedAt ||
    current.started_at ||
    root.started_at ||
    "";

  const startedAtMs = Date.parse(String(startedAtRaw || ""));

  if (!Number.isFinite(durationSec) || durationSec <= 10) return null;
  if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) return null;

  const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
  const remainingSec = Math.ceil(durationSec - elapsedSec);

  return {
    shouldHold: remainingSec > 2,
    durationSec,
    elapsedSec,
    remainingSec,
    startedAt: String(startedAtRaw || ""),
    title: String(current.title || root.title || track.title || ""),
    directAudioUrl,
  };
}

export async function POST(request: NextRequest) {
  const now = Date.now();
  const requestUrl = new URL(request.url);

// ENDED_RESYNC_ACTIVE_BLOCK_POLL_NO_ADVANCE_V1
// Schedule Editor active-block polling must never advance music.
// It only refreshes status. Manual/owner refresh is handled later.
if (requestUrl.searchParams.get("activeBlockPoll") === "1") {
  let current: any = {};
  try {
    const nowPlayingUrl = new URL("/api/listener/now-playing?activeBlockPollNoAdvance=1", requestUrl);
    const nowPlayingRes = await fetch(nowPlayingUrl, { cache: "no-store" });
    current = await nowPlayingRes.json();
  } catch (error: any) {
    current = { ok: false, error: error?.message || String(error) };
  }

  return NextResponse.json(
    {
      ok: true,
      action: "ACTIVE_BLOCK_POLL_NO_ADVANCE",
      marker: "ENDED_RESYNC_ACTIVE_BLOCK_POLL_NO_ADVANCE_V1",
      kicked: false,
      current,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Tha-Core-Active-Block-Poll-No-Advance": "1",
      },
    }
  );
}
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
  // ENDED_RESYNC_GET_AND_LANE_FIX_V1
  // Listener/homepage/device ended-resync must resolve the real active schedule lane too.
  // Otherwise it can call clean-next with lane=schedule and stay stuck on the last handoff item.
  const isListenerEndedRefresh =
    requestUrl.searchParams.get("ended") === "1" ||
    requestUrl.searchParams.get("listenerEnded") === "1" ||
    requestUrl.searchParams.get("desktopListenerEnded") === "1" ||
    requestUrl.searchParams.get("desktopManualEnded") === "1" ||
    requestUrl.searchParams.get("ownerMonitorEnded") === "1";

  const isScheduleRefresh =
    isListenerEndedRefresh ||
    requestUrl.searchParams.get("scheduleRefresh") === "1" ||
    requestUrl.searchParams.get("controlPanelBrain") === "1";

  if (isScheduleRefresh) {
    // ENDED_RESYNC_DURATION_LOCK_CONTROL_PANEL_BYPASS_V2
    // Duration lock blocks only auto-poll / listener false-ended jumps.
    // Real Control Panel / Schedule Editor refresh must obey immediately.
    const isActiveBlockPoll = requestUrl.searchParams.get("activeBlockPoll") === "1";
    const isManualOrControlPanelRefresh =
      requestUrl.searchParams.get("manual") === "1" ||
      requestUrl.searchParams.get("ownerManual") === "1" ||
      requestUrl.searchParams.get("force") === "1" ||
      (requestUrl.searchParams.get("scheduleRefresh") === "1" &&
        requestUrl.searchParams.get("controlPanelBrain") === "1" &&
        !isActiveBlockPoll &&
        !isListenerEndedRefresh);

    const currentForDurationLock = await getJson(`/api/listener/now-playing?durationLock=${now}`);
    const durationLock = getDurationLock(currentForDurationLock);

    if (!isManualOrControlPanelRefresh && durationLock?.shouldHold) {
      return NextResponse.json({
        ok: true,
        action: "DURATION_GUARD_HOLD_CURRENT",
        marker: "ENDED_RESYNC_DURATION_LOCK_V1",
        kicked: false,
        blockedEarlyAdvance: true,
        requestedLane,
        effectiveRequestedLane,
        durationLock,
        current: currentForDurationLock,
        message: "Current music has not reached durationSec yet. Ended-resync did not advance.",
      }, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Tha-Core-Duration-Lock": "true",
        },
      });
    }

    const scheduleState = await getJson(`/api/radio/smartzj-schedule?scheduleRefreshGuard=${now}`);
    const activeBlock = ((scheduleState as any)?.activeBlock || null) as Record<string, any> | null;
    const activeType = String(activeBlock?.type || activeBlock?.kind || "");
    const selectedLane = String((scheduleState as any)?.selectedLane || activeBlock?.primaryLane || "");
    const selectedLaneCount = Number((scheduleState as any)?.selectedLaneCount || 0);
    const selectionReason = String((scheduleState as any)?.selectionReason || "");

    const isMusicBlock = !activeType || /music/i.test(activeType);
    // ENDED_RESYNC_EMPTY_GUARD_FIX_V1
    // A schedule reason like STRICT_SCHEDULE_PRIMARY_EMPTY_EMERGENCY_ANY_READY can still be valid
    // when selectedLaneCount > 0. Do not block the ended handoff just because "EMPTY" appears
    // in the reason text after the resolver already found an emergency any-ready lane.
    const hardBlockedSelection =
      /NO_PLAYABLE|NOT_READY|MISSING|BLOCKED|FALLBACK/i.test(selectionReason) ||
      (/EMPTY/i.test(selectionReason) && selectedLaneCount <= 0);

    const hasPlayableScheduledMusic =
      Boolean((scheduleState as any)?.ok) &&
      Boolean(activeBlock) &&
      isMusicBlock &&
      Boolean(selectedLane) &&
      selectedLaneCount > 0 &&
      !hardBlockedSelection;

    if (hasPlayableScheduledMusic && selectedLane) {
      effectiveRequestedLane = selectedLane;
    }

    if (!hasPlayableScheduledMusic) {
      const current = await getJson(`/api/listener/now-playing?scheduleRefreshBlocked=${Date.now()}`);

      // SMARTZJ_ENDED_RESYNC_JINGLE_RETURN_V1
      // If the listener says a jingle ended, do not leave current-broadcast stuck on Jingles
      // just because no active Schedule Editor music block is active. Return to normal clean music.
      const currentBroadcastForJingleReturn = ((current as any)?.currentBroadcast || current || {}) as Record<string, any>;
      const currentBroadcastLaneForJingleReturn = String(
        currentBroadcastForJingleReturn?.genreLane ||
          currentBroadcastForJingleReturn?.track?.genreLane ||
          currentBroadcastForJingleReturn?.track?.lane ||
          ""
      ).toLowerCase();
      const currentBroadcastAudioForJingleReturn = String(
        currentBroadcastForJingleReturn?.audioUrl ||
          currentBroadcastForJingleReturn?.directAudioUrl ||
          currentBroadcastForJingleReturn?.track?.audioUrl ||
          ""
      ).toLowerCase();
      const currentIsJingleForReturn =
        currentBroadcastLaneForJingleReturn === "jingles" ||
        currentBroadcastAudioForJingleReturn.includes("/jingles/");

      const listenerEndedJingleForReturn =
        currentIsJingleForReturn &&
        (
          requestUrl.searchParams.get("ended") === "1" ||
          requestUrl.searchParams.get("listenerEnded") === "1" ||
          requestUrl.searchParams.get("desktopManualEnded") === "1" ||
          requestUrl.searchParams.get("desktopListenerEnded") === "1" ||
          requestUrl.searchParams.get("afterJingleReturnTest") === "1" ||
          requestUrl.searchParams.get("afterJingle") === "1"
        );

      if (listenerEndedJingleForReturn) {
        const jingleReturnCleanNextPath =
          `/api/listener/smartzj-clean-next?lane=auto` +
          `&ended=1&ownerMonitorEnded=1&controlPanelBrain=1&afterJingleReturn=1&endedResync=${now}`;

        const jingleReturnNextResult = await getJson(jingleReturnCleanNextPath, {
          method: "POST",
        });

        await new Promise((resolve) => setTimeout(resolve, 1200));

        const afterJingleReturnCurrent = await getJson(`/api/listener/now-playing?afterJingleReturn=${Date.now()}`);

        return NextResponse.json({
          ok: true,
          action: "ENDED_RESYNC_JINGLE_RETURN_KICKED_MUSIC",
          kicked: true,
          requestedLane,
          effectiveRequestedLane: "auto",
          cleanNextPath: jingleReturnCleanNextPath,
          nextResult: jingleReturnNextResult,
          current: afterJingleReturnCurrent,
        });
      }

      // ENDED_RESYNC_NO_ACTIVE_BLOCK_SMARTZJ_UNLOCK_V1
      // If Schedule Editor has no active playable block but SmartZJ has a selected lane,
      // do not leave current-broadcast stale/stuck. Hand off to SmartZJ clean-next.
      if (
        Number(selectedLaneCount || 0) > 0 ||
        String(selectionReason || "") === "NO_ACTIVE_BLOCK_EMERGENCY_ANY_READY"
      ) {
        const unlockLane = String(selectedLane || effectiveRequestedLane || "auto");
        effectiveRequestedLane = unlockLane;

        const unlockCleanNextPath =
          `/api/listener/smartzj-clean-next?lane=${encodeURIComponent(unlockLane)}` +
          `&ended=1&ownerMonitorEnded=1&controlPanelBrain=1&noActiveBlockUnlock=1&endedResync=${now}`;

        const unlockNextResult = await getJson(unlockCleanNextPath, {
          method: "POST",
        });

        await new Promise((resolve) => setTimeout(resolve, 1200));

        const unlockCurrent = await getJson(`/api/listener/now-playing?noActiveBlockUnlock=${Date.now()}`);

        return NextResponse.json({
          ok: true,
          action: "ENDED_RESYNC_NO_ACTIVE_BLOCK_SMARTZJ_UNLOCK_V1",
          kicked: true,
          requestedLane,
          effectiveRequestedLane,
          cleanNextPath: unlockCleanNextPath,
          nextResult: unlockNextResult,
          current: unlockCurrent,
        });
      }

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

  let nextResult: any = await getJson(cleanNextPath, {
    method: "POST",
  });

  // ENDED_RESYNC_ANY_READY_FALLBACK_V1
  // If Schedule selected a lane that clean-next cannot actually play,
  // do not leave all devices in SAFE_STANDBY. Try the existing auto/any-ready clean handoff.
  let fallbackNextPath = "";
  let fallbackNextResult: any = null;

  const nextResultStatus = String(
    nextResult?.status ||
      nextResult?.action ||
      nextResult?.message ||
      nextResult?.data?.status ||
      ""
  ).toUpperCase();

  const selectedLaneFailed =
    nextResult?.ok === false ||
    /NO_READY|NO_PLAYABLE|NO_AUDIO|NO_VALID|NO_MATCH|SELECTED_LANE|STANDBY/.test(nextResultStatus);

  if (selectedLaneFailed && effectiveRequestedLane) {
    fallbackNextPath =
      `/api/listener/smartzj-clean-next?lane=auto` +
      `&ended=1&ownerMonitorEnded=1&controlPanelBrain=1&endedResyncAnyReadyFallback=1&endedResync=${Date.now()}`;

    fallbackNextResult = await getJson(fallbackNextPath, {
      method: "POST",
    });

    if (fallbackNextResult?.ok === true) {
      nextResult = fallbackNextResult;
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 1200));

  const current = await getJson(`/api/listener/now-playing?endedResync=${Date.now()}`);

  return NextResponse.json({
    ok: true,
    action: "ENDED_RESYNC_KICKED_NEXT_ONCE",
    kicked: true,
    requestedLane,
    effectiveRequestedLane,
    cleanNextPath,
    fallbackNextPath,
    nextResult,
    fallbackNextResult,
    current,
  });
}
export async function GET(request: NextRequest) {
  // ENDED_RESYNC_GET_AND_LANE_FIX_V1
  // Some listener/browser callers hit this route with GET. Route must behave the same as POST.
  return POST(request);
}

