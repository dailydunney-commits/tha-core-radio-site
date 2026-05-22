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
