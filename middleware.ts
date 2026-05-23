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

export function middleware(request: NextRequest) {
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
    safeBackendPathname.startsWith("/api/radio/smartdj-auto-brain/") || safeBackendPathname.startsWith("/api/radio/smartdj-clean-next/") || safeBackendPathname === "/api/radio/smartdj-second-scan" || safeBackendPathname.startsWith("/api/radio/smartdj-second-scan/") || safeBackendPathname === "/api/radio/smartdj-auto-clean" || safeBackendPathname.startsWith("/api/radio/smartdj-auto-clean/") || safeBackendPathname === "/api/radio/safe-action" ||
      safeBackendPathname.startsWith("/api/radio/safe-action/") ||
      safeBackendPathname === "/api/radio/bleep-check" ||
      safeBackendPathname.startsWith("/api/radio/bleep-check/") ||
      safeBackendPathname === "/api/radio/bleep-job" ||
      safeBackendPathname.startsWith("/api/radio/bleep-job/") ||
      safeBackendPathname === "/api/radio/global-audio-gate" ||
      safeBackendPathname.startsWith("/api/radio/global-audio-gate/") ||
      safeBackendPathname === "/api/radio/current-broadcast" ||
      safeBackendPathname.startsWith("/api/radio/current-broadcast/")
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











