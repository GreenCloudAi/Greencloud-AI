import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureServerReady, normalizeBaseUrl } from "./helpers.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIER_FILES = new Map([
  ["1", { tier: "1", label: "Tier 1 (Feature Coverage)", file: path.join(__dirname, "tier1.test.mjs") }],
  ["2", { tier: "2", label: "Tier 2 (Boundary & Guardrails)", file: path.join(__dirname, "tier2.test.mjs") }],
  ["3", { tier: "3", label: "Tier 3 (Cross-Feature Pairwise)", file: path.join(__dirname, "tier3.test.mjs") }],
  ["4", { tier: "4", label: "Tier 4 (Multi-Persona Scenarios)", file: path.join(__dirname, "tier4.test.mjs") }],
]);

function printUsage() {
  console.log(`GreenCloud AI Opaque-Box E2E Test Runner

Usage:
  node tests/e2e/runner.mjs [options]

Options:
  --tier=all|1|2|3|4     Select which E2E tier(s) to execute (default: all)
  --base-url=<url>       Target server URL (default: BASE_URL / E2E_BASE_URL / http://127.0.0.1:3000)
  --require-browser      Require Playwright headless Chromium (sets E2E_REQUIRE_BROWSER=1)
  --help, -h             Show this help message and exit

Environment Variables:
  BASE_URL / E2E_BASE_URL   Target GreenCloud AI server base URL
  E2E_TIER                  Default tier selector when --tier is omitted (all|1|2|3|4)
  E2E_REQUIRE_BROWSER       Set to "1" to fail if Playwright is unavailable
  E2E_READY_TIMEOUT_MS      Health check timeout in milliseconds (default: 8000)
`);
}

function parseArgs(argv) {
  let tier = (process.env.E2E_TIER || "all").toLowerCase();
  let baseUrl = process.env.BASE_URL || process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
  let requireBrowser = process.env.E2E_REQUIRE_BROWSER === "1";
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--require-browser") {
      requireBrowser = true;
    } else if (arg.startsWith("--tier=")) {
      tier = arg.slice("--tier=".length).trim().toLowerCase();
    } else if (arg === "--tier" && i + 1 < argv.length) {
      tier = argv[++i].trim().toLowerCase();
    } else if (arg.startsWith("--base-url=")) {
      baseUrl = arg.slice("--base-url=".length).trim();
    } else if (arg === "--base-url" && i + 1 < argv.length) {
      baseUrl = argv[++i].trim();
    } else {
      throw new Error(`Unknown option "${arg}". Run with --help for usage.`);
    }
  }

  if (!["all", "1", "2", "3", "4"].includes(tier)) {
    throw new Error(`Invalid --tier "${tier}". Expected one of: all, 1, 2, 3, 4.`);
  }

  return {
    tier,
    baseUrl: normalizeBaseUrl(baseUrl),
    requireBrowser,
    help,
  };
}

function parseNodeTestMetrics(output) {
  const testsMatch = output.match(/^[ℹ#]\s+tests\s+(\d+)/m);
  const passMatch = output.match(/^[ℹ#]\s+pass\s+(\d+)/m);
  const failMatch = output.match(/^[ℹ#]\s+fail\s+(\d+)/m);
  const skipMatch = output.match(/^[ℹ#]\s+skipped\s+(\d+)/m);
  return {
    tests: testsMatch ? Number(testsMatch[1]) : null,
    pass: passMatch ? Number(passMatch[1]) : null,
    fail: failMatch ? Number(failMatch[1]) : null,
    skipped: skipMatch ? Number(skipMatch[1]) : null,
  };
}

async function runSingleTier(entry, env) {
  const startedAt = performance.now();
  return await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--test", "--test-reporter=spec", entry.file],
      {
        cwd: path.resolve(__dirname, "../.."),
        env,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let combinedOutput = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      combinedOutput += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      combinedOutput += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      const durationMs = Math.round(performance.now() - startedAt);
      const metrics = parseNodeTestMetrics(combinedOutput);
      resolve({
        tier: entry.tier,
        label: entry.label,
        file: path.relative(path.resolve(__dirname, "../.."), entry.file),
        exitCode: code ?? 1,
        passed: code === 0,
        durationMs,
        ...metrics,
      });
    });
  });
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`[E2E Runner Error] ${err.message}`);
    process.exit(2);
  }

  if (parsed.help) {
    printUsage();
    process.exit(0);
  }

  const selectedEntries =
    parsed.tier === "all"
      ? Array.from(TIER_FILES.values())
      : [TIER_FILES.get(parsed.tier)];

  console.log("============================================================");
  console.log(" GreenCloud AI Opaque-Box E2E Suite");
  console.log(` Target Base URL : ${parsed.baseUrl}`);
  console.log(` Selected Tier(s): ${parsed.tier}`);
  console.log(` Browser Mode    : ${parsed.requireBrowser ? "required" : "optional"}`);
  console.log("============================================================");

  try {
    await ensureServerReady({ baseUrl: parsed.baseUrl });
    console.log(`[READY] Server responded HTTP 200 at ${parsed.baseUrl}/api/workspace/config`);
  } catch (err) {
    console.error(`\n[SERVER UNREACHABLE] ${err.message}`);
    process.exit(1);
  }

  const missingFiles = [];
  for (const entry of selectedEntries) {
    try {
      await fs.access(entry.file);
    } catch {
      missingFiles.push(entry.file);
    }
  }
  if (missingFiles.length > 0) {
    console.error("\n[MISSING TEST FILES] Expected tier test file(s) not found:");
    for (const f of missingFiles) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  }

  const childEnv = {
    ...process.env,
    BASE_URL: parsed.baseUrl,
    E2E_BASE_URL: parsed.baseUrl,
    ...(parsed.requireBrowser ? { E2E_REQUIRE_BROWSER: "1" } : {}),
  };

  const results = [];
  for (const entry of selectedEntries) {
    console.log(`\n>>> Running ${entry.label} (${path.basename(entry.file)})`);
    const result = await runSingleTier(entry, childEnv);
    results.push(result);
  }

  console.log("\n============================================================");
  console.log(" E2E Summary");
  console.log("============================================================");

  let allPassed = true;
  let totalTests = 0;
  let totalPass = 0;
  let totalFail = 0;

  for (const r of results) {
    const statusLabel = r.passed ? "PASS" : "FAIL";
    if (!r.passed) allPassed = false;
    if (typeof r.tests === "number") totalTests += r.tests;
    if (typeof r.pass === "number") totalPass += r.pass;
    if (typeof r.fail === "number") totalFail += r.fail;

    const counts =
      r.tests !== null
        ? `${r.pass ?? 0}/${r.tests} passed, ${r.fail ?? 0} failed`
        : `exit ${r.exitCode}`;
    console.log(` [${statusLabel}] ${r.label} (${counts}, ${r.durationMs}ms)`);
  }

  console.log("------------------------------------------------------------");
  console.log(
    ` Overall: ${allPassed ? "PASS" : "FAIL"} | Tiers: ${results.filter((r) => r.passed).length}/${results.length} passed | Tests: ${totalPass}/${totalTests} passed (${totalFail} failed)`
  );
  console.log("============================================================");

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("[E2E Runner Fatal Error]", err);
  process.exit(1);
});
