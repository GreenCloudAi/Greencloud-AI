import { NextResponse } from "next/server";
import { prisma } from "./db";
import { readSession, SESSION_COOKIE } from "./workspaceSession";

export function localDemoEnabled() {
  return process.env.GREENCLOUD_LOCAL_DEMO === "true" && !process.env.GREENCLOUD_SESSION_SECRET;
}

export class WorkspaceAccessError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function workspaceAccessResponse(error: unknown) {
  if (!(error instanceof WorkspaceAccessError)) return null;
  return NextResponse.json({ error: { message: error.message } }, { status: error.status });
}

export async function resolveWorkspaceAccess(request: Request) {
  const auth = request.headers.get("authorization");
  const cookie = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim()).find((part) => part.startsWith(SESSION_COOKIE + "="));
  const token = auth ? (auth.startsWith("Bearer ") ? auth.slice(7) : "") : cookie?.slice(SESSION_COOKIE.length + 1) ?? "";
  const session = readSession(token, process.env.GREENCLOUD_SESSION_SECRET ?? "");
  if (!session) throw new WorkspaceAccessError(401, "A valid workspace session is required.");

  const actor = await prisma.user.findFirst({
    where: { id: session.userId, tenantId: session.workspaceId, status: "active" },
    include: {
      tenant: true,
      roleAssignments: {
        where: { tenantId: session.workspaceId },
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      },
    },
  });
  if (!actor) throw new WorkspaceAccessError(401, "A valid workspace session is required.");
  const assignments = actor.roleAssignments.filter(({ role }) =>
    role.tenantId === actor.tenantId || (role.tenantId === null && role.isSystem)
  );

  function permits(permission: string, accountId?: string, provider?: string) {
    let allowed = false;
    for (const grant of assignments) {
      const matches = (grant.scopeType === "organization" && (grant.scopeId === "*" || grant.scopeId === actor!.tenantId))
        || (grant.scopeType === "account" && accountId !== undefined && grant.scopeId === accountId)
        || (grant.scopeType === "provider" && provider !== undefined && grant.scopeId === provider);
      if (!matches) continue;
      const rule = grant.role.permissions.find((entry) => entry.permission.key === permission);
      if (!rule) continue;
      if (grant.effect === "deny" || rule.effect === "deny") return false;
      if (grant.effect === "allow" && rule.effect === "allow") allowed = true;
    }
    return allowed;
  }

  return { tenant: actor.tenant, actorId: actor.id, permits };
}
