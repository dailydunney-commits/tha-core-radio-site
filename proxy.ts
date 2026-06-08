import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/owner",
  "/api/radio",
  "/api/smartdj",
  "/api/autodj",
  "/api/azuracast/control",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function unauthorized() {
  return new NextResponse("Tha Core Owner Login Required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Tha Core Owner Panel", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function proxy(request: NextRequest) {
  // SMARTZJ_INTERNAL_BACKEND_ALLOW_V1
  // Allows only server-local backend jobs through. Public /api/radio routes stay locked.
  const smartZjPathname =
    request.nextUrl?.pathname || new URL(request.url).pathname;

  const smartZjHost = String(request.headers.get("host") || "").toLowerCase();
  const smartZjForwardedHost = String(request.headers.get("x-forwarded-host") || "").toLowerCase();

  const smartZjInternalHost =
    smartZjHost.startsWith("127.0.0.1") ||
    smartZjHost.startsWith("localhost") ||
    smartZjForwardedHost.startsWith("127.0.0.1") ||
    smartZjForwardedHost.startsWith("localhost");

  const smartZjInternalPath =
    smartZjPathname === "/api/radio/smartdj-clean-next" ||
    smartZjPathname.startsWith("/api/radio/smartdj-clean-next/") ||
    smartZjPathname === "/api/radio/smartdj-azura-scan-load" ||
    smartZjPathname.startsWith("/api/radio/smartdj-azura-scan-load/") ||
    smartZjPathname === "/api/radio/smartdj-background-clean" ||
    smartZjPathname.startsWith("/api/radio/smartdj-background-clean/") ||
    smartZjPathname === "/api/radio/smartdj-local-clean-one" ||
    smartZjPathname.startsWith("/api/radio/smartdj-local-clean-one/") ||
    smartZjPathname === "/api/radio/smartzj-folder-rotation" ||
    smartZjPathname.startsWith("/api/radio/smartzj-folder-rotation/") ||
    smartZjPathname === "/api/radio/smartzj-schedule" ||
    smartZjPathname.startsWith("/api/radio/smartzj-schedule/") ||
    smartZjPathname === "/api/radio/smartzj-request-block" ||
    smartZjPathname.startsWith("/api/radio/smartzj-request-block/") ||
    smartZjPathname === "/api/radio/smartzj-watchdog" ||
    smartZjPathname.startsWith("/api/radio/smartzj-watchdog/") ||
    smartZjPathname === "/api/radio/ai-host-two-hosts" ||
    smartZjPathname.startsWith("/api/radio/ai-host-two-hosts/") ||
    smartZjPathname === "/api/radio/ai-host-script" ||
    smartZjPathname.startsWith("/api/radio/ai-host-script/") ||
    smartZjPathname === "/api/radio/ai-host-voice" ||
    smartZjPathname.startsWith("/api/radio/ai-host-voice/") ||
    smartZjPathname === "/api/radio/ai-host-audio" ||
    smartZjPathname.startsWith("/api/radio/ai-host-audio/") ||
    smartZjPathname === "/api/radio/ai-host-next-drop" ||
    smartZjPathname.startsWith("/api/radio/ai-host-next-drop/") ||
    smartZjPathname === "/api/radio/ai-host-news-rundown" ||
    smartZjPathname.startsWith("/api/radio/ai-host-news-rundown/") ||
    smartZjPathname === "/api/radio/ai-host-news-runner" ||
    smartZjPathname.startsWith("/api/radio/ai-host-news-runner/") ||
    smartZjPathname === "/api/radio/ai-host-program-voice" ||
    smartZjPathname.startsWith("/api/radio/ai-host-program-voice/") ||
    smartZjPathname === "/api/radio/ai-host-program-broadcast" ||
    smartZjPathname.startsWith("/api/radio/ai-host-program-broadcast/") ||
    smartZjPathname === "/api/radio/current-broadcast" ||
    smartZjPathname.startsWith("/api/radio/current-broadcast/");

  if (smartZjInternalHost && smartZjInternalPath) {
    return NextResponse.next();
  }

  // SAFE_BACKEND_LOCAL_DEV_ALLOWLIST
  // Local backend tests only. Production owner/security lock stays protected.
  const safeBackendPathname =
    request.nextUrl?.pathname || new URL(request.url).pathname;

  if (
    process.env.NODE_ENV !== "production" &&
    (
      safeBackendPathname === "/api/radio/smartdj-clean-next" ||
    safeBackendPathname.startsWith("/api/radio/smartdj-clean-next/") ||
    safeBackendPathname === "/api/radio/smartdj-auto-brain" ||
    safeBackendPathname.startsWith("/api/radio/smartdj-auto-brain/") || safeBackendPathname.startsWith("/api/radio/smartdj-clean-next/") || safeBackendPathname === "/api/radio/smartdj-second-scan" || safeBackendPathname.startsWith("/api/radio/smartdj-second-scan/") || safeBackendPathname === "/api/radio/smartdj-azura-scan-load" || safeBackendPathname.startsWith("/api/radio/smartdj-azura-scan-load/") || safeBackendPathname === "/api/radio/smartdj-background-clean" || safeBackendPathname.startsWith("/api/radio/smartdj-background-clean/") || safeBackendPathname === "/api/radio/smartdj-auto-clean" || safeBackendPathname.startsWith("/api/radio/smartdj-auto-clean/") || safeBackendPathname === "/api/radio/safe-action" ||
      safeBackendPathname.startsWith("/api/radio/safe-action/") ||
      safeBackendPathname === "/api/radio/bleep-check" ||
      safeBackendPathname.startsWith("/api/radio/bleep-check/") ||
      safeBackendPathname === "/api/radio/bleep-job" ||
      safeBackendPathname.startsWith("/api/radio/bleep-job/") ||
      safeBackendPathname === "/api/radio/global-audio-gate" ||
      safeBackendPathname.startsWith("/api/radio/global-audio-gate/") ||
      safeBackendPathname === "/api/radio/current-broadcast" ||
      safeBackendPathname.startsWith("/api/radio/current-broadcast/") ||
      safeBackendPathname === "/api/radio/ai-host-two-hosts" ||
      safeBackendPathname.startsWith("/api/radio/ai-host-two-hosts/") ||
      safeBackendPathname === "/api/radio/ai-host-script" ||
      safeBackendPathname.startsWith("/api/radio/ai-host-script/") ||
      safeBackendPathname === "/api/radio/ai-host-voice" ||
      safeBackendPathname.startsWith("/api/radio/ai-host-voice/") ||
      safeBackendPathname === "/api/radio/ai-host-audio" ||
      safeBackendPathname.startsWith("/api/radio/ai-host-audio/") ||
      safeBackendPathname === "/api/radio/ai-host-next-drop" ||
      safeBackendPathname.startsWith("/api/radio/ai-host-next-drop/") ||
      safeBackendPathname === "/api/radio/ai-host-news-rundown" ||
      safeBackendPathname.startsWith("/api/radio/ai-host-news-rundown/") ||
      safeBackendPathname === "/api/radio/ai-host-news-runner" ||
      safeBackendPathname.startsWith("/api/radio/ai-host-news-runner/") ||
      safeBackendPathname === "/api/radio/ai-host-program-voice" ||
      safeBackendPathname.startsWith("/api/radio/ai-host-program-voice/") ||
      safeBackendPathname === "/api/radio/ai-host-program-broadcast" ||
      safeBackendPathname.startsWith("/api/radio/ai-host-program-broadcast/")
    )
  ) {
    return NextResponse.next();
  }

// REAL_BLEEP_PROCESSOR_DEV_ALLOWLIST
  // Local backend test bypass only. Production owner/security lock stays protected.
  const realBleepProcessorPathname =
    request.nextUrl?.pathname || new URL(request.url).pathname;

  if (
    process.env.NODE_ENV !== "production" &&
    (
      realBleepProcessorPathname === "/api/radio/bleep-process" ||
      realBleepProcessorPathname.startsWith("/api/radio/bleep-process/") ||
      realBleepProcessorPathname === "/api/radio/safe-action" || realBleepProcessorPathname.startsWith("/api/radio/safe-action/") || realBleepProcessorPathname === "/api/radio/smartdj-local-clean-one" || realBleepProcessorPathname.startsWith("/api/radio/smartdj-local-clean-one/") || realBleepProcessorPathname === "/api/radio/bleep-local-transcribe-and-process" || realBleepProcessorPathname.startsWith("/api/radio/bleep-local-transcribe-and-process/") || realBleepProcessorPathname === "/api/radio/bleep-transcribe-and-process" || realBleepProcessorPathname.startsWith("/api/radio/bleep-transcribe-and-process/") || realBleepProcessorPathname === "/api/radio/bleep-processor" ||
      realBleepProcessorPathname.startsWith("/api/radio/bleep-processor/")
    )
  ) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  // AI_HOST_WEEKEND_PROGRAM_LOCAL_DRY_BYPASS_V1
  // Allows local Windows dry tests only. Live/public requests remain owner-protected.
  const isAiHostWeekendProgramDryRoute =
    pathname === "/api/radio/ai-host-weekend-program" ||
    pathname === "/api/radio/ai-host-weekend-program-feeder" ||
    pathname === "/api/radio/ai-host-profiles";
const hostHeader = request.headers.get("host") || "";
  const isLocalDryTestHost =
    hostHeader.startsWith("127.0.0.1:") ||
    hostHeader.startsWith("localhost:");

  if (isAiHostWeekendProgramDryRoute && isLocalDryTestHost) {
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const requiredUser = process.env.OWNER_PANEL_USER || "owner";
  const requiredPassword = process.env.OWNER_PANEL_PASSWORD;

  if (!requiredPassword) {
    return new NextResponse(
      "Owner panel locked. OWNER_PANEL_PASSWORD is not configured.",
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const encoded = authHeader.split(" ")[1] || "";
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) {
      return unauthorized();
    }

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    if (username === requiredUser && password === requiredPassword) {
      return NextResponse.next();
    }

    return unauthorized();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: [
    "/owner/:path*",
    "/api/radio/:path*",
    "/api/smartdj/:path*",
    "/api/autodj/:path*",
    "/api/azuracast/control/:path*",
  ],
};




