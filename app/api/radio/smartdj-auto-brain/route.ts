import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function callJson(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    const data = await res.json().catch(() => null);

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 500,
      error: error?.message || "FETCH_FAILED",
    };
  }
}

function getBroadcastStatus(payload: any) {
  return String(
    payload?.status ||
      payload?.data?.status ||
      payload?.state?.status ||
      payload?.currentBroadcast?.status ||
      payload?.data?.currentBroadcast?.status ||
      payload?.mode ||
      ""
  ).toUpperCase();
}

function isSmartDjBroadcasting(payload: any) {
  const status = getBroadcastStatus(payload);
  return status.includes("SMARTDJ") && status.includes("BROADCAST");
}

function isIdle(payload: any) {
  const status = getBroadcastStatus(payload);
  return !status || status === "IDLE" || status.includes("FALLBACK");
}

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const body = await req.json().catch(() => ({}));

  const event = String(body?.event || "tick").toLowerCase();

  /*
    This is the automatic SmartDJ worker.

    It does two jobs:
    1. Keep cleaning / bleeping SmartDJ rows.
    2. Start or advance clean SmartDJ broadcast only when needed.

    It does NOT broadcast raw Azura audio.
    It does NOT require PLAY ALL.
  */

  const cleanResult = await callJson(`${origin}/api/radio/smartdj-second-scan`, {
    method: "POST",
    body: JSON.stringify({
      source: "SMARTDJ_AUTO_BRAIN",
      reason: "Auto clean/bleep SmartDJ rows while broadcast continues.",
    }),
  });

  const currentBroadcast = await callJson(`${origin}/api/radio/current-broadcast`, {
    method: "GET",
  });

  const alreadyBroadcastingSmartDj = isSmartDjBroadcasting(currentBroadcast.data);
  const broadcastIdle = isIdle(currentBroadcast.data);

  let nextResult: any = {
    skipped: true,
    reason: "Current SmartDJ clean broadcast is still active.",
  };

  if (event === "ended" || broadcastIdle || !alreadyBroadcastingSmartDj) {
    nextResult = await callJson(`${origin}/api/radio/smartdj-clean-next`, {
      method: "POST",
      body: JSON.stringify({
        source: "SMARTDJ_AUTO_BRAIN",
        reason:
          event === "ended"
            ? "Current clean SmartDJ track ended. Send next clean track."
            : "No active SmartDJ clean broadcast. Start next clean track.",
      }),
    });
  }

  return NextResponse.json({
    ok: true,
    action: "SMARTDJ_AUTO_BRAIN",
    event,
    message:
      "SmartDJ auto brain checked cleaning and clean broadcast handoff. PLAY ALL is not required.",
    cleanResult,
    currentBroadcast: currentBroadcast.data,
    nextResult,
  });
}
