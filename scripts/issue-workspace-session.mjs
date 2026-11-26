import { issueSession } from "../src/services/workspaceSession.ts";

const [userId, workspaceId] = process.argv.slice(2);
if (!userId || !workspaceId) {
  process.stderr.write("Usage: node scripts/issue-workspace-session.mjs USER_ID WORKSPACE_ID\n");
  process.exit(1);
}
process.stdout.write(issueSession(userId, workspaceId, process.env.GREENCLOUD_SESSION_SECRET ?? "") + "\n");
