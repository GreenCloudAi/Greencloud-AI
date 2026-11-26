import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "../..");

export function normalizeBaseUrl(rawUrl) {
  const value = (rawUrl || "http://127.0.0.1:3000").trim();
  return value.replace(/\/+$/, "");
}

export const BASE_URL = normalizeBaseUrl(
  process.env.BASE_URL || process.env.E2E_BASE_URL || "http://127.0.0.1:3000"
);

export const ROLES = Object.freeze([
  "admin",
  "finops",
  "devops",
  "architect",
  "sustainability",
  "viewer",
]);

export const PERSONA_HEADERS = Object.freeze(
  Object.fromEntries(ROLES.map((role) => [role, Object.freeze({ "x-greencloud-role": role })]))
);

const PROTECTED_ENTITY_NAMES = new Set([
  "GreenCloud Default Organization",
  "Acme Enterprise",
  "Staging Tenant",
  "My AWS Production",
]);

const PROTECTED_ARTIFACT_BASENAMES = new Set(["ticket_GC-E2E-TEST.md"]);

const trackedAccountIds = new Set();
const trackedAssignmentIds = new Set();
const trackedArtifactPaths = new Set();

export function actorHeaders(role, userId) {
  const headers = {};
  if (role !== null && role !== undefined && String(role).trim() !== "") {
    headers["x-greencloud-role"] = String(role);
  }
  if (userId !== null && userId !== undefined && String(userId).trim() !== "") {
    headers["x-greencloud-user-id"] = String(userId);
  }
  return headers;
}

function buildUrl(requestPath, query, baseUrl = BASE_URL) {
  const root = normalizeBaseUrl(baseUrl);
  const normalizedPath = requestPath.startsWith("http")
    ? requestPath
    : `${root}${requestPath.startsWith("/") ? requestPath : `/${requestPath}`}`;
  const url = new URL(normalizedPath);

  if (query && typeof query === "object") {
    for (const [key, rawValue] of Object.entries(query)) {
      if (rawValue === undefined || rawValue === null) continue;
      if (Array.isArray(rawValue)) {
        if (rawValue.length === 0) continue;
        url.searchParams.set(key, rawValue.map((v) => String(v)).join(","));
      } else {
        url.searchParams.set(key, String(rawValue));
      }
    }
  }
  return url.toString();
}

export async function apiRequest(
  requestPath,
  {
    method = "GET",
    role = "admin",
    userId,
    headers = {},
    body,
    query,
    expectStatus,
    baseUrl = BASE_URL,
    timeoutMs = 15000,
  } = {}
) {
  const url = buildUrl(requestPath, query, baseUrl);
  const mergedHeaders = {
    ...actorHeaders(role, userId),
    ...headers,
  };

  let serializedBody;
  if (body !== undefined) {
    if (typeof body === "string") {
      serializedBody = body;
      if (!mergedHeaders["content-type"] && !mergedHeaders["Content-Type"]) {
        mergedHeaders["Content-Type"] = "application/json";
      }
    } else {
      serializedBody = JSON.stringify(body);
      if (!mergedHeaders["content-type"] && !mergedHeaders["Content-Type"]) {
        mergedHeaders["Content-Type"] = "application/json";
      }
    }
  }

  const startedAt = performance.now();
  const response = await fetch(url, {
    method,
    headers: mergedHeaders,
    body: serializedBody,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
  const text = await response.text();

  let json = null;
  if (text.trim().length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  const result = {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    json,
    text,
    durationMs,
  };

  if (expectStatus !== undefined) {
    const allowed = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
    if (!allowed.includes(result.status)) {
      const preview = text.length > 400 ? `${text.slice(0, 400)}...` : text;
      assert.fail(
        `${method} ${url} expected HTTP ${allowed.join(" or ")}, got ${result.status}. Body: ${preview}`
      );
    }
  }

  return result;
}

export function assertErrorEnvelope(response, expectedStatus, expectedCode) {
  assert.ok(response && typeof response === "object", "Response object is required");
  if (Array.isArray(expectedStatus)) {
    assert.ok(
      expectedStatus.includes(response.status),
      `Expected status in [${expectedStatus.join(", ")}], got ${response.status}. Body: ${response.text}`
    );
  } else if (expectedStatus !== undefined) {
    assert.equal(
      response.status,
      expectedStatus,
      `Expected HTTP ${expectedStatus}, got ${response.status}. Body: ${response.text}`
    );
  }

  assert.ok(
    response.json && typeof response.json === "object",
    `Expected JSON error body for HTTP ${response.status}, got: ${response.text}`
  );
  assert.ok(
    response.json.error && typeof response.json.error === "object",
    `Expected { error: { code, message } } envelope, got: ${JSON.stringify(response.json)}`
  );
  assert.equal(
    typeof response.json.error.code,
    "string",
    `Expected string error.code, got: ${JSON.stringify(response.json.error)}`
  );
  assert.ok(
    response.json.error.code.trim().length > 0,
    "Expected non-empty error.code"
  );
  assert.equal(
    typeof response.json.error.message,
    "string",
    `Expected string error.message, got: ${JSON.stringify(response.json.error)}`
  );
  assert.ok(
    response.json.error.message.trim().length > 0,
    "Expected non-empty error.message"
  );

  if (expectedCode !== undefined) {
    const allowedCodes = Array.isArray(expectedCode) ? expectedCode : [expectedCode];
    assert.ok(
      allowedCodes.includes(response.json.error.code),
      `Expected error.code in [${allowedCodes.join(", ")}], got "${response.json.error.code}"`
    );
  }
}

export async function ensureServerReady({
  baseUrl = BASE_URL,
  timeoutMs = Number(process.env.E2E_READY_TIMEOUT_MS || 8000),
} = {}) {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl);
  const healthUrl = `${resolvedBaseUrl}/api/workspace/config`;
  const deadline = Date.now() + timeoutMs;
  let lastReason = "No response";

  while (Date.now() <= deadline) {
    try {
      const response = await fetch(healthUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(Math.min(2500, Math.max(500, timeoutMs))),
      });
      if (response.status === 200) {
        const config = await response.json().catch(() => null);
        return {
          baseUrl: resolvedBaseUrl,
          startedByHelper: false,
          config,
        };
      }
      lastReason = `HTTP ${response.status}`;
    } catch (error) {
      lastReason = error?.cause?.code || error?.message || String(error);
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(250, remaining)));
  }

  throw new Error(
    `GreenCloud AI server is unreachable at ${resolvedBaseUrl} (checked GET ${healthUrl}; last error: ${lastReason}). ` +
      `Start the app (e.g. "npm run dev" or "npm run start") or pass BASE_URL / --base-url.`
  );
}

export async function snapshotWorkspaceConfig({ baseUrl = BASE_URL } = {}) {
  const res = await apiRequest("/api/workspace/config", {
    method: "GET",
    role: "admin",
    baseUrl,
    expectStatus: 200,
  });
  assert.ok(res.json && typeof res.json === "object", "Workspace config response must be JSON");
  return {
    monthlyBudget: res.json.monthlyBudget,
    functionalUnits: res.json.functionalUnits,
    activeRole: res.json.activeRole,
  };
}

export async function restoreWorkspaceConfig(snapshot, { baseUrl = BASE_URL } = {}) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const payload = {};
  if (typeof snapshot.monthlyBudget === "number" && Number.isFinite(snapshot.monthlyBudget)) {
    payload.monthlyBudget = snapshot.monthlyBudget;
  }
  if (typeof snapshot.functionalUnits === "number" && Number.isFinite(snapshot.functionalUnits)) {
    payload.functionalUnits = snapshot.functionalUnits;
  }
  if (typeof snapshot.activeRole === "string" && ROLES.includes(snapshot.activeRole)) {
    payload.activeRole = snapshot.activeRole;
  }
  if (Object.keys(payload).length === 0) return null;

  const res = await apiRequest("/api/workspace/config", {
    method: "PATCH",
    role: "admin",
    body: payload,
    baseUrl,
    expectStatus: 200,
  });
  return res.json;
}

function findConnectorEntry(statusPayload, aliases) {
  if (!statusPayload || typeof statusPayload !== "object") return null;
  const list = Array.isArray(statusPayload)
    ? statusPayload
    : Array.isArray(statusPayload.connectors)
    ? statusPayload.connectors
    : null;

  if (list) {
    for (const item of list) {
      const key = String(item?.provider || item?.id || item?.name || "").toLowerCase();
      if (aliases.includes(key)) return item;
    }
    return null;
  }

  for (const alias of aliases) {
    if (statusPayload[alias] && typeof statusPayload[alias] === "object") {
      return statusPayload[alias];
    }
  }
  return null;
}

export async function getConnectorCapabilities({ baseUrl = BASE_URL } = {}) {
  const res = await apiRequest("/api/connectors/status", {
    method: "GET",
    role: "admin",
    baseUrl,
    expectStatus: [200, 404],
  });

  const statusPayload = res.status === 200 ? res.json : null;

  const awsEntry = findConnectorEntry(statusPayload, ["aws"]);
  const azureEntry = findConnectorEntry(statusPayload, ["azure"]);
  const gcpEntry = findConnectorEntry(statusPayload, ["gcp"]);
  const k8sEntry = findConnectorEntry(statusPayload, ["kubernetes", "k8s", "opencost"]);
  const gridEntry = findConnectorEntry(statusPayload, [
    "gridintensity",
    "grid",
    "electricitymaps",
    "watttime",
  ]);

  const awsLive = Boolean(
    awsEntry?.sourceMode === "live_api" ||
      process.env.AWS_TEST_ROLE_ARN ||
      (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  );
  const azureLive = Boolean(
    azureEntry?.sourceMode === "live_api" ||
      (process.env.AZURE_CLIENT_ID &&
        process.env.AZURE_CLIENT_SECRET &&
        process.env.AZURE_TENANT_ID)
  );
  const gcpLive = Boolean(
    gcpEntry?.sourceMode === "live_api" ||
      process.env.GCP_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
  const k8sLive = Boolean(
    k8sEntry?.sourceMode === "live_api" || process.env.OPENCOST_ENDPOINT
  );
  const gridLive = Boolean(
    gridEntry?.sourceMode === "live_api" ||
      process.env.ELECTRICITY_MAPS_API_KEY ||
      (process.env.WATTTIME_USERNAME && process.env.WATTTIME_PASSWORD)
  );

  return {
    awsLive,
    azureLive,
    gcpLive,
    k8sLive,
    gridLive,
    statusCode: res.status,
    statusPayload,
  };
}

function decodeHtmlEntities(input) {
  return input
    .replace(/&mdash;|&#8212;|&#x2014;/gi, "\u2014")
    .replace(/&ndash;|&#8211;|&#x2013;/gi, "\u2013")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'");
}

function stripHtmlToText(html) {
  const withoutScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  const stripped = withoutScripts.replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(stripped).replace(/\s+/g, " ").trim();
}

function extractStylesheets(html, baseUrl) {
  const hrefs = new Set();
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  const normalizedBase = normalizeBaseUrl(baseUrl);

  for (const tag of linkTags) {
    if (!/\brel=["'][^"']*stylesheet[^"']*["']/i.test(tag)) continue;
    const hrefMatch = tag.match(/\bhref=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const href = decodeHtmlEntities(hrefMatch[1]).trim();
    if (href.startsWith("/") || href.startsWith(normalizedBase)) {
      hrefs.add(href);
    }
  }
  return Array.from(hrefs);
}

function extractIconPaths(html) {
  const matches = html.match(/\/icons\/[a-zA-Z0-9._-]+\.svg/g) || [];
  return Array.from(new Set(matches));
}

export async function fetchHtmlPage(
  pagePath,
  { role, userId, query, headers = {}, baseUrl = BASE_URL, timeoutMs = 15000 } = {}
) {
  const url = buildUrl(pagePath, query, baseUrl);
  const mergedHeaders = {
    Accept: "text/html,application/xhtml+xml",
    ...(role !== undefined ? actorHeaders(role, userId) : {}),
    ...headers,
  };

  const response = await fetch(url, {
    method: "GET",
    headers: mergedHeaders,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const html = await response.text();
  assert.equal(
    response.status,
    200,
    `Expected HTTP 200 for HTML page ${url}, got ${response.status}`
  );
  assert.ok(html.trim().length > 0, `Expected non-empty HTML body for ${url}`);

  const textContent = stripHtmlToText(html);

  const hasNextErrorMarker =
    /<[^>]+\bid=["']__next_error__["']/i.test(html) ||
    /__next_error__/i.test(textContent) ||
    /Application error:\s*a\s+(?:client|server)-side\s+exception/i.test(textContent);
  assert.equal(
    hasNextErrorMarker,
    false,
    `Detected Next.js error overlay or Application error on ${url}`
  );

  return {
    status: response.status,
    html,
    textContent,
    stylesheets: extractStylesheets(html, baseUrl),
    iconPaths: extractIconPaths(html),
  };
}

export async function fetchLinkedCss(stylesheets = [], { baseUrl = BASE_URL, timeoutMs = 15000 } = {}) {
  if (!Array.isArray(stylesheets) || stylesheets.length === 0) {
    return "";
  }
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const chunks = [];

  for (const href of stylesheets) {
    if (!href || typeof href !== "string") continue;
    if (/^https?:\/\//i.test(href) && !href.startsWith(normalizedBase)) {
      continue;
    }
    const target = href.startsWith("http")
      ? href
      : `${normalizedBase}${href.startsWith("/") ? href : `/${href}`}`;
    const response = await fetch(target, {
      method: "GET",
      headers: { Accept: "text/css,*/*;q=0.1" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    assert.equal(
      response.status,
      200,
      `Expected HTTP 200 for stylesheet ${target}, got ${response.status}`
    );
    const css = await response.text();
    chunks.push(css);
  }

  return chunks.join("\n");
}

export async function openBrowserSession({
  baseUrl = BASE_URL,
  viewport = { width: 1280, height: 800 },
} = {}) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  let playwright;
  try {
    playwright = await import("playwright");
  } catch (error) {
    const reason = error?.message || "Optional dependency 'playwright' is not installed";
    if (process.env.E2E_REQUIRE_BROWSER === "1") {
      throw new Error(
        `Playwright browser session required (E2E_REQUIRE_BROWSER=1), but failed to import playwright: ${reason}`
      );
    }
    return {
      available: false,
      reason,
      baseUrl: normalizeBaseUrl(baseUrl),
      browser: null,
      context: null,
      page: null,
      consoleErrors,
      pageErrors,
      failedRequests,
      async close() {},
    };
  }

  const chromium = playwright.chromium || playwright.default?.chromium;
  if (!chromium) {
    const reason = "Playwright module loaded without chromium launcher";
    if (process.env.E2E_REQUIRE_BROWSER === "1") {
      throw new Error(reason);
    }
    return {
      available: false,
      reason,
      baseUrl: normalizeBaseUrl(baseUrl),
      browser: null,
      context: null,
      page: null,
      consoleErrors,
      pageErrors,
      failedRequests,
      async close() {},
    };
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err?.message || String(err));
  });
  page.on("response", (res) => {
    if (res.status() >= 500) {
      failedRequests.push({ url: res.url(), status: res.status() });
    }
  });
  page.on("requestfailed", (req) => {
    failedRequests.push({
      url: req.url(),
      status: 0,
      reason: req.failure()?.errorText || "requestfailed",
    });
  });

  page.__gcErrors = { consoleErrors, pageErrors, failedRequests };

  return {
    available: true,
    reason: null,
    baseUrl: normalizeBaseUrl(baseUrl),
    browser,
    context,
    page,
    consoleErrors,
    pageErrors,
    failedRequests,
    async close() {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}

export async function visitAndSettle(
  page,
  routePath,
  { role, userId, waitForSelector, waitForNetworkIdle = true, baseUrl = BASE_URL } = {}
) {
  assert.ok(page, "visitAndSettle requires an active Playwright page");
  const targetUrl = buildUrl(routePath, undefined, baseUrl);
  const tracker = page.__gcErrors;
  const startConsoleLen = tracker ? tracker.consoleErrors.length : 0;
  const startPageErrLen = tracker ? tracker.pageErrors.length : 0;

  const extraHeaders = actorHeaders(role, userId);
  if (Object.keys(extraHeaders).length > 0 && typeof page.context === "function") {
    await page.context().setExtraHTTPHeaders(extraHeaders);
  }

  if (role || userId) {
    await page.addInitScript(
      ({ r, u }) => {
        try {
          if (r) window.sessionStorage.setItem("gc_selected_role", r);
          if (u) window.sessionStorage.setItem("gc_selected_user_id", u);
        } catch {
          // Ignore storage errors on opaque origins
        }
      },
      { r: role || null, u: userId || null }
    );
  }

  const response = await page.goto(targetUrl, {
    waitUntil: waitForNetworkIdle ? "networkidle" : "load",
    timeout: 25000,
  });
  if (response) {
    assert.ok(
      response.status() < 400,
      `Expected non-error HTTP status navigating to ${targetUrl}, got ${response.status()}`
    );
  }

  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: 10000 });
  }

  if (tracker) {
    const newConsole = tracker.consoleErrors.slice(startConsoleLen);
    const newPageErrs = tracker.pageErrors.slice(startPageErrLen);
    assert.equal(
      newConsole.length,
      0,
      `Console errors on ${routePath}: ${newConsole.join(" | ")}`
    );
    assert.equal(
      newPageErrs.length,
      0,
      `Uncaught page errors on ${routePath}: ${newPageErrs.join(" | ")}`
    );
  }

  const title = await page.title();
  const textContent = await page.evaluate(() => document.body?.innerText || "");
  const html = await page.content();

  return {
    url: targetUrl,
    title,
    textContent,
    html,
  };
}

const REQUIRED_WARM_TOKENS = [
  { name: "#FFFDF4", hex: /#fffdf4\b/i, rgb: /rgb\(\s*255\s*[,\s]\s*253\s*[,\s]\s*244\b/i },
  { name: "#FAF6E8", hex: /#faf6e8\b/i, rgb: /rgb\(\s*250\s*[,\s]\s*246\s*[,\s]\s*232\b/i },
  { name: "#FBF6E3", hex: /#fbf6e3\b/i, rgb: /rgb\(\s*251\s*[,\s]\s*246\s*[,\s]\s*227\b/i },
  { name: "#155E4B", hex: /#155e4b\b/i, rgb: /rgb\(\s*21\s*[,\s]\s*94\s*[,\s]\s*75\b/i },
  { name: "#FFF76A", hex: /#fff76a\b/i, rgb: /rgb\(\s*255\s*[,\s]\s*247\s*[,\s]\s*106\b/i },
];

const BANNED_BANNER_REGEX =
  /Demo dataset active|Public Reading Showcase|Illustrative demo metrics|Zero cloud credentials required/i;

function hasDisallowedBorderClass(classListString) {
  const tokens = classListString.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (
      token === "border-0" ||
      token === "border-none" ||
      token === "border-transparent" ||
      token === "border-collapse" ||
      token === "border-separate" ||
      token.startsWith("border-spacing")
    ) {
      continue;
    }
    if (
      token === "border" ||
      /^border-(?:[124]|\[1px\]|\[#ECE5CC\]|\[#DFD6B5\]|gray-\d+|slate-\d+|neutral-\d+|zinc-\d+)$/i.test(
        token
      ) ||
      /^border-[trblxy](?:-(?:[124]|\[1px\]))?$/i.test(token)
    ) {
      return token;
    }
  }
  return null;
}

export async function assertDesignCompliance({
  html = "",
  textContent = "",
  cssText = "",
  routeName = "unknown",
  page = null,
} = {}) {
  const resolvedHtml = html || (page ? await page.content() : "");
  const resolvedText =
    textContent || (page ? await page.evaluate(() => document.body?.innerText || "") : stripHtmlToText(resolvedHtml));

  // 1. Zero em dashes (\u2014) in visible text and <title>
  const titleMatch = resolvedHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : "";
  assert.equal(
    titleText.includes("\u2014"),
    false,
    `[${routeName}] <title> contains disallowed em dash (\\u2014): "${titleText}"`
  );
  assert.equal(
    resolvedText.includes("\u2014"),
    false,
    `[${routeName}] Rendered text contains disallowed em dash (\\u2014)`
  );

  // 2. Zero banned demo / fake-live banners
  const bannerMatch = resolvedText.match(BANNED_BANNER_REGEX) || resolvedHtml.match(BANNED_BANNER_REGEX);
  assert.equal(
    bannerMatch,
    null,
    `[${routeName}] Found banned demo/fake-live banner copy: "${bannerMatch?.[0]}"`
  );

  // 3. Required warm palette tokens in CSS/HTML/computed styles
  let browserPaletteText = "";
  if (page) {
    browserPaletteText = await page.evaluate(() => {
      const vals = [];
      for (const sheet of Array.from(document.styleSheets || [])) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            vals.push(rule.cssText);
          }
        } catch {
          // Cross-origin stylesheet
        }
      }
      const bodyStyle = getComputedStyle(document.body);
      vals.push(bodyStyle.backgroundColor, bodyStyle.color);
      return vals.join("\n");
    });
  }

  const combinedDesignSource = `${cssText}\n${resolvedHtml}\n${browserPaletteText}`;
  if (cssText.trim().length > 0 || page) {
    for (const token of REQUIRED_WARM_TOKENS) {
      const found =
        token.hex.test(combinedDesignSource) || token.rgb.test(combinedDesignSource);
      assert.ok(
        found,
        `[${routeName}] Required warm palette token ${token.name} missing from CSS/DOM`
      );
    }

    // 4. .tabular-nums presence
    assert.ok(
      /tabular-nums/i.test(combinedDesignSource),
      `[${routeName}] Expected .tabular-nums typography utility in CSS/DOM`
    );
  }

  // 5. Zero 1px borders on .m3-btn and ChartCard tonal surfaces
  const tagRegex = /<([a-z0-9-]+)\b([^>]*)>/gi;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(resolvedHtml)) !== null) {
    const attrs = tagMatch[2];
    const classMatch = attrs.match(/\bclass=["']([^"']+)["']/i);
    if (!classMatch) continue;
    const classValue = classMatch[1];
    const isTargetSurface =
      /\bm3-btn\b/.test(classValue) ||
      /\bdata-testid=["']chart-card["']/i.test(attrs);
    if (!isTargetSurface) continue;
    const badBorder = hasDisallowedBorderClass(classValue);
    assert.equal(
      badBorder,
      null,
      `[${routeName}] Disallowed border utility "${badBorder}" found on tonal element (${classValue})`
    );
  }

  if (page) {
    const borderViolations = await page.evaluate(() => {
      const bad = [];
      const els = document.querySelectorAll('.m3-btn, [data-testid="chart-card"]');
      for (const el of Array.from(els)) {
        const s = getComputedStyle(el);
        const widths = [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth];
        const styles = [s.borderTopStyle, s.borderRightStyle, s.borderBottomStyle, s.borderLeftStyle];
        for (let i = 0; i < 4; i++) {
          if (styles[i] !== "none" && widths[i] !== "0px") {
            bad.push(`${el.tagName}.${el.className}: ${widths[i]} ${styles[i]}`);
            break;
          }
        }
      }
      return bad;
    });
    assert.equal(
      borderViolations.length,
      0,
      `[${routeName}] Non-zero computed border on tonal surfaces: ${borderViolations.join("; ")}`
    );

    const tabularBad = await page.evaluate(() => {
      const els = document.querySelectorAll(".tabular-nums");
      return Array.from(els)
        .filter((el) => !getComputedStyle(el).fontVariantNumeric.includes("tabular-nums"))
        .map((el) => el.textContent?.trim() || el.tagName);
    });
    assert.equal(
      tabularBad.length,
      0,
      `[${routeName}] Elements with .tabular-nums missing computed tabular-nums: ${tabularBad.join(", ")}`
    );
  }

  // 6. Zero 'bolt' icon inside AWS connect buttons or compute cards
  const awsBoltPatterns = [
    /(?:Connect AWS|aws-connect|ec2|compute)[\s\S]{0,300}?(?:>bolt<|bolt-filled\.svg)/i,
    /(?:>bolt<|bolt-filled\.svg)[\s\S]{0,300}?(?:Connect AWS|aws-connect)/i,
  ];
  for (const pattern of awsBoltPatterns) {
    assert.equal(
      pattern.test(resolvedHtml),
      false,
      `[${routeName}] Disallowed 'bolt' icon detected inside AWS connect or compute surface`
    );
  }

  if (page) {
    const boltViolations = await page.evaluate(() => {
      const hits = [];
      const icons = document.querySelectorAll(".material-symbols-outlined");
      for (const icon of Array.from(icons)) {
        if ((icon.textContent || "").trim().toLowerCase() !== "bolt") continue;
        const containerText = (
          icon.closest("button, a, [data-testid], section, div")?.textContent || ""
        ).toLowerCase();
        if (
          containerText.includes("connect aws") ||
          containerText.includes("ec2") ||
          containerText.includes("compute")
        ) {
          hits.push(containerText.slice(0, 80));
        }
      }
      return hits;
    });
    assert.equal(
      boltViolations.length,
      0,
      `[${routeName}] Disallowed 'bolt' Material icon inside AWS/compute container: ${boltViolations.join("; ")}`
    );
  }
}

const VALID_DATA_STATUSES = new Set([
  "actual",
  "estimated",
  "forecast",
  "sandbox_fixture",
  "unavailable",
]);

export async function assertChartCardContract(chartOrHtml, opts = {}) {
  let effectiveOpts = opts;
  let inspected;

  // Support both assertChartCardContract(htmlOrObj, opts) and assertChartCardContract(page, testIdOrTitle, opts)
  if (
    chartOrHtml &&
    typeof chartOrHtml === "object" &&
    typeof chartOrHtml.evaluate === "function"
  ) {
    const page = chartOrHtml;
    const selectorOrTitle = typeof opts === "string" ? opts : opts?.selector || opts?.title || "";
    effectiveOpts = arguments[2] && typeof arguments[2] === "object" ? arguments[2] : {};

    inspected = await page.evaluate((target) => {
      const cards = Array.from(document.querySelectorAll('[data-testid="chart-card"]'));
      const matched = target
        ? cards.find(
            (c) =>
              c.getAttribute("data-chart-id") === target ||
              (c.textContent || "").includes(target)
          )
        : cards[0];
      if (!matched) return null;
      const styles = getComputedStyle(matched);
      const paths = Array.from(matched.querySelectorAll("svg path")).map(
        (p) => p.getAttribute("d") || ""
      );
      return {
        html: matched.outerHTML,
        text: matched.innerText || matched.textContent || "",
        title:
          matched.querySelector("[data-testid='chart-title'], h2, h3, h4")?.textContent?.trim() ||
          "",
        unit: matched.getAttribute("data-unit") || "",
        dataStatus: matched.getAttribute("data-status") || "",
        freshnessTimestamp: matched.getAttribute("data-freshness") || "",
        borderWidth: styles.borderTopWidth,
        svgCount: matched.querySelectorAll("svg").length,
        svgPaths: paths,
      };
    }, selectorOrTitle);

    assert.ok(inspected, `ChartCard "${selectorOrTitle}" not found on page`);
  } else if (typeof chartOrHtml === "string") {
    const html = chartOrHtml;
    const text = stripHtmlToText(html);
    const paths = Array.from(html.matchAll(/\bd=["']([^"']*)["']/gi)).map((m) => m[1]);
    const unitAttr = html.match(/\bdata-unit=["']([^"']+)["']/i)?.[1] || "";
    const statusAttr = html.match(/\bdata-status=["']([^"']+)["']/i)?.[1] || "";
    const freshnessAttr = html.match(/\bdata-freshness=["']([^"']+)["']/i)?.[1] || "";
    const titleMatch = html.match(/<(?:h2|h3|h4)[^>]*>([\s\S]*?)<\/(?:h2|h3|h4)>/i);
    inspected = {
      html,
      text,
      title: titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, "")).trim() : "",
      unit: unitAttr,
      dataStatus: statusAttr,
      freshnessTimestamp: freshnessAttr,
      svgCount: (html.match(/<svg\b/gi) || []).length,
      svgPaths: paths,
    };
  } else if (chartOrHtml && typeof chartOrHtml === "object") {
    inspected = {
      html: chartOrHtml.html || "",
      text: chartOrHtml.text || "",
      title: chartOrHtml.title || "",
      unit: chartOrHtml.unit || "",
      dataStatus: chartOrHtml.dataStatus || "",
      freshnessTimestamp: chartOrHtml.freshnessTimestamp || "",
      svgCount: chartOrHtml.svgCount ?? (chartOrHtml.svgPaths ? chartOrHtml.svgPaths.length : 1),
      svgPaths: chartOrHtml.svgPaths || [],
      borderWidth: chartOrHtml.borderWidth,
    };
  } else {
    assert.fail("assertChartCardContract requires an HTML string, ChartCard object, or Playwright page");
  }

  assert.ok(
    inspected.title && inspected.title.trim().length > 0,
    "ChartCard must expose a non-empty title"
  );
  assert.equal(
    inspected.title.includes("\u2014") || inspected.text.includes("\u2014"),
    false,
    `ChartCard "${inspected.title}" must not contain em dashes (\\u2014)`
  );

  if (effectiveOpts.expectedUnit) {
    const unitPresent =
      inspected.unit === effectiveOpts.expectedUnit ||
      inspected.text.includes(effectiveOpts.expectedUnit);
    assert.ok(
      unitPresent,
      `ChartCard "${inspected.title}" expected unit "${effectiveOpts.expectedUnit}", got "${inspected.unit}"`
    );
  } else {
    assert.ok(
      inspected.unit || /\b(USD|\$|gCO2e|kgCO2e|tCO2e|kWh|%|ms|cores|GiB|GB)\b/i.test(inspected.text),
      `ChartCard "${inspected.title}" must display an explicit unit`
    );
  }

  const resolvedStatus =
    inspected.dataStatus ||
    Array.from(VALID_DATA_STATUSES).find((s) => new RegExp(`\\b${s}\\b`, "i").test(inspected.text)) ||
    "";
  assert.ok(
    VALID_DATA_STATUSES.has(resolvedStatus.toLowerCase()),
    `ChartCard "${inspected.title}" has invalid/missing dataStatus: "${resolvedStatus}"`
  );
  if (effectiveOpts.expectedDataStatus) {
    assert.equal(
      resolvedStatus.toLowerCase(),
      effectiveOpts.expectedDataStatus.toLowerCase(),
      `ChartCard "${inspected.title}" expected dataStatus "${effectiveOpts.expectedDataStatus}", got "${resolvedStatus}"`
    );
  }

  if (
    resolvedStatus.toLowerCase() !== "unavailable" &&
    !effectiveOpts.allowMissingFreshness &&
    !effectiveOpts.allowEmpty
  ) {
    const hasFreshness =
      Boolean(inspected.freshnessTimestamp) ||
      /\b\d{4}-\d{2}-\d{2}|\b(?:ago|fresh|updated|synced|unavailable)\b/i.test(inspected.text);
    assert.ok(
      hasFreshness,
      `ChartCard "${inspected.title}" must expose freshnessTimestamp or freshness disclosure`
    );
  }

  for (const d of inspected.svgPaths || []) {
    assert.equal(
      /NaN|Infinity/i.test(d),
      false,
      `ChartCard "${inspected.title}" rendered invalid SVG path coordinates: ${d}`
    );
  }

  if (inspected.borderWidth !== undefined) {
    assert.equal(
      inspected.borderWidth,
      "0px",
      `ChartCard "${inspected.title}" must have 0px border width, got ${inspected.borderWidth}`
    );
  }

  if (effectiveOpts.allowEmpty === false) {
    assert.ok(
      inspected.svgCount > 0,
      `ChartCard "${inspected.title}" expected rendered SVG chart when allowEmpty=false`
    );
  }
}

export function buildFocusPayload(overrides = {}) {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const provider = overrides.provider || "aws";
  const region =
    overrides.region ||
    overrides.primaryRegion ||
    (provider === "gcp" ? "us-central1" : provider === "azure" ? "eastus" : "us-east-1");
  const externalAccountId =
    overrides.externalAccountId || overrides.accountId || `e2e-acc-${uniqueSuffix}`;
  const accountName =
    overrides.accountName || `E2E FOCUS ${provider.toUpperCase()} ${uniqueSuffix}`;
  const resourceId = overrides.resourceId || `i-e2e-${uniqueSuffix}`;

  const defaultRecord = {
    ProviderName: provider.toUpperCase(),
    SubAccountId: externalAccountId,
    SubAccountName: accountName,
    RegionId: region,
    ServiceName:
      overrides.serviceName ||
      (provider === "gcp"
        ? "Compute Engine"
        : provider === "azure"
        ? "Virtual Machines"
        : "AmazonEC2"),
    ServiceCategory: overrides.serviceCategory || "Compute",
    ChargeCategory: overrides.chargeCategory || "Usage",
    ChargePeriodStart: overrides.chargePeriodStart || new Date().toISOString().slice(0, 10),
    BilledCost: overrides.billedCost ?? 120.5,
    EffectiveCost: overrides.effectiveCost ?? overrides.billedCost ?? 120.5,
    BillingCurrency: overrides.currency || "USD",
    ResourceId: resourceId,
    ResourceType:
      overrides.resourceType ||
      (provider === "gcp" ? "gce_vm" : provider === "azure" ? "azure_vm" : "ec2"),
    InstanceType: overrides.instanceType || "m5.large",
    LifecycleState: overrides.lifecycleState || "running",
    CpuPercent: overrides.cpuPercent !== undefined ? overrides.cpuPercent : 2.1,
    Tags: overrides.tags || { env: "staging", team: "finops", e2e: "true" },
  };

  return {
    provider,
    primaryRegion: region,
    externalAccountId,
    accountName,
    records: Array.isArray(overrides.records) ? overrides.records : [defaultRecord],
  };
}

export function trackAccount(id) {
  if (id && typeof id === "string") {
    trackedAccountIds.add(id);
  }
  return id;
}

export function trackAssignment(id) {
  if (id && typeof id === "string") {
    trackedAssignmentIds.add(id);
  }
  return id;
}

export function trackArtifactPath(filePath) {
  if (!filePath || typeof filePath !== "string") return null;
  const resolved = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(REPO_ROOT, filePath);
  const basename = path.basename(resolved);
  if (PROTECTED_ARTIFACT_BASENAMES.has(basename)) {
    throw new Error(`Refusing to track protected artifact path: ${resolved}`);
  }
  const ticketsDir = path.resolve(REPO_ROOT, "tickets") + path.sep;
  const prsDir = path.resolve(REPO_ROOT, "pull_requests") + path.sep;
  if (!resolved.startsWith(ticketsDir) && !resolved.startsWith(prsDir)) {
    throw new Error(
      `Refusing to track artifact outside tickets/ or pull_requests/: ${resolved}`
    );
  }
  trackedArtifactPaths.add(resolved);
  return resolved;
}

export async function createIsolatedTestAccount(overrides = {}, { baseUrl = BASE_URL } = {}) {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const provider = overrides.provider || "aws";
  const externalAccountId = overrides.externalAccountId || `e2e-${uniqueSuffix}`;
  const name = overrides.name || `E2E ${provider.toUpperCase()} ${uniqueSuffix}`;

  if (PROTECTED_ENTITY_NAMES.has(name)) {
    throw new Error(`Refusing to create test account with protected name "${name}"`);
  }

  const payload = {
    provider,
    externalAccountId,
    name,
    primaryRegion:
      overrides.primaryRegion ||
      (provider === "gcp" ? "us-central1" : provider === "azure" ? "eastus" : "us-east-1"),
    ...overrides,
  };

  const res = await apiRequest("/api/cloud-accounts", {
    method: "POST",
    role: "admin",
    body: payload,
    baseUrl,
    expectStatus: [200, 201],
  });

  assert.ok(res.json?.id, "Created test account response must include id");
  trackAccount(res.json.id);
  return res.json;
}

export async function cleanupTestArtifacts({ baseUrl = BASE_URL } = {}) {
  const deletedAssignments = [];
  const deletedAccounts = [];
  const deletedArtifacts = [];
  const errors = [];

  for (const assignmentId of Array.from(trackedAssignmentIds)) {
    try {
      const res = await apiRequest(`/api/rbac/assignments/${encodeURIComponent(assignmentId)}`, {
        method: "DELETE",
        role: "admin",
        baseUrl,
      });
      if (res.status === 200 || res.status === 204 || res.status === 404) {
        deletedAssignments.push(assignmentId);
      } else {
        errors.push(`DELETE /api/rbac/assignments/${assignmentId} -> HTTP ${res.status}`);
      }
    } catch (err) {
      errors.push(`assignment ${assignmentId}: ${err.message}`);
    } finally {
      trackedAssignmentIds.delete(assignmentId);
    }
  }

  // Delete explicitly tracked accounts plus any leftover e2e-* accounts
  const candidateIds = new Set(trackedAccountIds);
  try {
    const listRes = await apiRequest("/api/cloud-accounts", {
      method: "GET",
      role: "admin",
      baseUrl,
    });
    if (listRes.status === 200 && Array.isArray(listRes.json)) {
      for (const acc of listRes.json) {
        if (
          acc?.id &&
          typeof acc.externalAccountId === "string" &&
          acc.externalAccountId.startsWith("e2e-") &&
          !PROTECTED_ENTITY_NAMES.has(acc.name)
        ) {
          candidateIds.add(acc.id);
        }
      }
    }
  } catch (err) {
    errors.push(`list accounts during cleanup: ${err.message}`);
  }

  for (const accountId of Array.from(candidateIds)) {
    try {
      const res = await apiRequest(`/api/cloud-accounts/${encodeURIComponent(accountId)}`, {
        method: "DELETE",
        role: "admin",
        baseUrl,
      });
      if (res.status === 200 || res.status === 204 || res.status === 404) {
        deletedAccounts.push(accountId);
      } else {
        errors.push(`DELETE /api/cloud-accounts/${accountId} -> HTTP ${res.status}`);
      }
    } catch (err) {
      errors.push(`account ${accountId}: ${err.message}`);
    } finally {
      trackedAccountIds.delete(accountId);
    }
  }

  for (const artifactPath of Array.from(trackedArtifactPaths)) {
    try {
      const basename = path.basename(artifactPath);
      if (PROTECTED_ARTIFACT_BASENAMES.has(basename)) continue;
      await fs.unlink(artifactPath);
      deletedArtifacts.push(artifactPath);
    } catch (err) {
      if (err?.code !== "ENOENT") {
        errors.push(`unlink ${artifactPath}: ${err.message}`);
      }
    } finally {
      trackedArtifactPaths.delete(artifactPath);
    }
  }

  return {
    deletedAssignments,
    deletedAccounts,
    deletedArtifacts,
    errors,
  };
}

const LIFECYCLE_GRAPH = {
  detected: ["recommended", "dismissed", "expired"],
  recommended: ["awaiting_approval", "dismissed", "expired"],
  awaiting_approval: ["approved", "recommended", "dismissed"],
  approved: ["dry_run", "dismissed"],
  dry_run: ["executing", "approved", "failed"],
  executing: ["verifying", "failed", "rolled_back"],
  verifying: ["verified", "failed", "rolled_back"],
  failed: ["rolled_back", "recommended"],
  verified: ["rolled_back"],
  dismissed: [],
  expired: [],
  rolled_back: [],
};

function findLifecyclePath(fromState, targetState) {
  if (fromState === targetState) return [];
  const queue = [[fromState]];
  const visited = new Set([fromState]);

  while (queue.length > 0) {
    const currentPath = queue.shift();
    const current = currentPath[currentPath.length - 1];
    const neighbors = LIFECYCLE_GRAPH[current] || [];
    for (const next of neighbors) {
      if (visited.has(next)) continue;
      const nextPath = [...currentPath, next];
      if (next === targetState) {
        return nextPath.slice(1);
      }
      visited.add(next);
      queue.push(nextPath);
    }
  }
  return null;
}

function resolveTransitionActor(fromState, toState, actors) {
  if (toState === "awaiting_approval" || toState === "recommended" || toState === "dismissed") {
    return {
      role: actors.requesterRole || "finops",
      userId: actors.requesterUserId,
    };
  }
  if (toState === "approved") {
    return {
      role: actors.approverRole || "admin",
      userId: actors.approverUserId,
    };
  }
  if (
    toState === "dry_run" ||
    toState === "executing" ||
    toState === "verifying" ||
    toState === "rolled_back" ||
    toState === "failed"
  ) {
    return {
      role: actors.executorRole || "devops",
      userId: actors.executorUserId,
    };
  }
  if (toState === "verified") {
    return {
      role: actors.verifierRole || "finops",
      userId: actors.verifierUserId,
    };
  }
  return {
    role: actors.approverRole || "admin",
    userId: actors.approverUserId,
  };
}

export async function advanceRecommendationToState(
  recId,
  targetState,
  actors = {},
  { baseUrl = BASE_URL } = {}
) {
  assert.ok(recId, "advanceRecommendationToState requires recId");
  assert.ok(targetState, "advanceRecommendationToState requires targetState");

  const resolvedActors = {
    requesterRole: "finops",
    approverRole: "admin",
    executorRole: "devops",
    verifierRole: "finops",
    ...actors,
  };

  let currentState = resolvedActors.currentState;
  if (!currentState) {
    const listRes = await apiRequest("/api/recommendations", {
      method: "GET",
      role: "admin",
      baseUrl,
      expectStatus: 200,
    });
    const recs = Array.isArray(listRes.json?.recommendations)
      ? listRes.json.recommendations
      : Array.isArray(listRes.json)
      ? listRes.json
      : [];
    const found = recs.find((r) => r.id === recId);
    assert.ok(found, `Recommendation ${recId} not found via GET /api/recommendations`);
    currentState = found.lifecycleState || "recommended";
  }

  const steps = findLifecyclePath(currentState, targetState);
  assert.ok(
    steps !== null,
    `No valid lifecycle transition path from "${currentState}" to "${targetState}"`
  );

  const transitions = [];
  let prev = currentState;
  for (const nextState of steps) {
    const actor = resolveTransitionActor(prev, nextState, resolvedActors);
    const res = await apiRequest(
      `/api/recommendations/${encodeURIComponent(recId)}/transition`,
      {
        method: "POST",
        role: actor.role,
        userId: actor.userId,
        baseUrl,
        body: {
          toState: nextState,
          reason: `E2E transition ${prev} -> ${nextState}`,
        },
        expectStatus: 200,
      }
    );

    const artifactPath =
      res.json?.artifactPath || res.json?.transition?.artifactPath || res.json?.outputPath;
    if (typeof artifactPath === "string" && (artifactPath.includes("tickets/") || artifactPath.includes("pull_requests/"))) {
      try {
        trackArtifactPath(artifactPath);
      } catch {
        // Ignore if path is outside workspace artifact dirs
      }
    }

    transitions.push({
      fromState: prev,
      toState: nextState,
      actorRole: actor.role,
      response: res.json,
    });
    prev = nextState;
  }

  return {
    recommendationId: recId,
    finalState: prev,
    transitions,
  };
}

export async function runCliCommand(command, args = [], opts = {}) {
  const cwd = opts.cwd || REPO_ROOT;
  const timeoutMs = opts.timeoutMs ?? 60000;
  const useShell =
    opts.shell !== undefined
      ? opts.shell
      : process.platform === "win32" && /^(npx|npm)$/i.test(command);

  const startedAt = performance.now();

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...(opts.env || {}) },
      shell: useShell,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
      const exitCode = timedOut ? 124 : (code ?? 1);
      const result = {
        exitCode,
        ok: exitCode === 0,
        stdout,
        stderr,
        durationMs,
        timedOut,
      };
      if (opts.expectZero && exitCode !== 0) {
        reject(
          new Error(
            `CLI command failed (${exitCode}): ${command} ${args.join(" ")}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`
          )
        );
        return;
      }
      resolve(result);
    });
  });
}
