import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;
  const localDemo = process.env.GREENCLOUD_LOCAL_DEMO === "true" && !process.env.GREENCLOUD_SESSION_SECRET;
  if (localDemo && ["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return NextResponse.next();

  const scopedSync = /^\/api\/cloud-accounts\/[^/]+\/sync$/.test(pathname);
  const scopedReads = ["/api/dashboard", "/api/dashboard/export"];
  if ((request.method === "GET" && scopedReads.includes(pathname))
    || (request.method === "POST" && (pathname === "/api/workspace/session" || scopedSync))) {
    return NextResponse.next();
  }
  return NextResponse.json({ error: { message: "This endpoint is unavailable in a scoped workspace." } }, { status: 403 });
}

export const config = { matcher: "/api/:path*" };
