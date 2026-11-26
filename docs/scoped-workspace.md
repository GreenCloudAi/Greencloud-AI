# Scoped workspace pilot

The scoped workspace pilot uses the existing Tenant as the workspace boundary. A signed session identifies one active User in that workspace. The dashboard requires account and dashboard read grants and calculates all account-derived totals from the authorized set. Billing export also requires billing:export on each account. Recommendation data has its own read grant. User-supplied role preferences affect dashboard presentation.

## Configure an isolated pilot

1. Set GREENCLOUD_SESSION_SECRET to a random value of at least 32 characters in the server environment. Keep it server-side. Use HTTPS for hosted sign-in.
2. Provision a Tenant and an active User related to it. Use Role and RolePermission for permission bundles, and use RoleAssignment scopeType account with the internal CloudAccount ID as scopeId. Workspace-wide assignments use organization scope with the workspace ID or an asterisk. Provider assignments use the stored provider ID. A matching deny rule takes precedence.
3. A trusted operator can issue a one-hour token using Node 24 and the same server-side environment.

   ```sh
   node scripts/issue-workspace-session.mjs USER_ID WORKSPACE_ID
   ```

4. Enter the issued token at /workspace-sign-in. The browser receives an HTTP-only, same-site cookie. API tools can use the issued token as a bearer token. Disable the user to stop active sessions. Rotate the signing key to invalidate all issued sessions.

Scoped mode exposes dashboard reads, permission-checked billing export, and manual AWS sync for accounts with the sync:trigger grant. Inventory, CloudWatch CPU, and billing outcomes appear separately in the account details. A partial or failed refresh retains the timestamp of the last successful source attempt. A successful empty billing response can retain prior billing rows. An interrupted running job requires operator recovery before retry. Other API endpoints are gated until they have their own permission checks. The current export contains billing source rows, has a 10,000-row limit, and preserves the account, provider and date filters. Users who can view data can still copy what is visible to them. Export permissions apply to the product’s export function.

This pilot uses operator-issued sessions. Organization identity provider integration, workspace switching, resource-level grants, per-session revocation, audit access, and additional authorized mutation endpoints are follow-up work. For the existing personal demo, use GREENCLOUD_LOCAL_DEMO=true with no signing key and bind Next.js to the loopback interface only.

## Verify

Run the app on a separate loopback port with a disposable SQLite workspace. Set GREENCLOUD_TEST_URL, GREENCLOUD_TEST_DB, and the matching GREENCLOUD_SESSION_SECRET before running:

```sh
node tests/e2e/scoped-workspace.mjs
```

The fixture creates two workspaces and adds Production FinOps and Development Viewer grants. It checks account and resource totals, cross-workspace isolation, export permissions, the browser session exchange and legacy route gating. Set GREENCLOUD_TEST_OFFLINE_SYNC=true only when the isolated server has no AWS credentials and instance metadata is disabled. This additionally verifies denied sync scopes and the permitted failure path, including the actor audit record and retention of prior billing.
