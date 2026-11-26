import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "greencloud_session";
export const SESSION_SECONDS = 60 * 60;

export function readSession(token: string, secret: string) {
  if (secret.length < 32 || token.length > 2048) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(signature)) return null;
  const actual = Buffer.from(signature, "base64url");
  const expected = createHmac("sha256", secret).update(payload).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const { userId, workspaceId, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (typeof userId !== "string" || !userId || typeof workspaceId !== "string" || !workspaceId
      || !Number.isSafeInteger(exp) || exp <= now || exp > now + SESSION_SECONDS) return null;
    return { userId, workspaceId, exp };
  } catch {
    return null;
  }
}

export function issueSession(userId: string, workspaceId: string, secret: string) {
  if (secret.length < 32) throw new Error("Configure a session secret of at least 32 characters.");
  const payload = Buffer.from(JSON.stringify({
    userId, workspaceId, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
