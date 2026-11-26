import { NextResponse } from "next/server";
import { resolveWorkspaceAccess, workspaceAccessResponse } from "@/services/workspaceAccess";
import { SESSION_COOKIE } from "@/services/workspaceSession";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!host || (origin !== `https://${host}` && origin !== `http://${host}`)) {
    return NextResponse.json({ error: { message: "Open the sign-in form in this workspace." } }, { status: 403 });
  }
  try {
    const token = (await request.formData()).get("session");
    if (typeof token !== "string" || !token) {
      return NextResponse.json({ error: { message: "Enter a workspace session token." } }, { status: 400 });
    }
    await resolveWorkspaceAccess(new Request(url, { headers: { Authorization: `Bearer ${token}` } }));
    const response = new NextResponse(null, { status: 303, headers: { Location: "/dashboard" } });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: "strict", secure: !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin ?? ""), path: "/",
    });
    return response;
  } catch (error) {
    return workspaceAccessResponse(error) ?? NextResponse.json({ error: { message: "Unable to start the workspace session." } }, { status: 500 });
  }
}
