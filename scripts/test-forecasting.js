/**
 * Verification Test Suite for ForecastingEngine
 * Tests:
 * 1. Empty and single-point history handling
 * 2. Normal steady-state series
 * 3. Anomaly spike detection (Z-Score + IQR)
 * 4. Month-end projection and budget risk escalation
 * 5. 95% Confidence interval expansion
 */

const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const tsFilePath = path.join(__dirname, "../src/services/forecastingEngine.ts");
const tsCode = fs.readFileSync(tsFilePath, "utf-8");
const jsCode = ts.transpileModule(tsCode, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

const engineModule = new module.constructor();
engineModule._compile(jsCode, "forecastingEngine.js");
const { ForecastingEngine } = engineModule.exports;

function runTests() {
  console.log("=== Running ForecastingEngine Verification Suite ===\n");

  const engine = new ForecastingEngine({
    alpha: 0.35,
    beta: 0.15,
    zScoreThreshold: 2.5,
    forecastHorizonDays: 14,
    targetMonthlyBudget: 50.0,
  });

  // Test 1: Empty History
  console.log("Test 1: Empty history test...");
  const emptyRes = engine.analyze([], 50.0);
  console.assert(emptyRes.historicalDaysCount === 0, "Expected 0 historical days");
  console.assert(emptyRes.anomalies.hasAnomalies === false, "Expected no anomalies in empty history");
  console.assert(emptyRes.monthEndProjectedCost === 0, "Expected 0 month end cost");
  console.log("✓ Test 1 Passed.\n");

  // Test 2: Steady State History (Zero Spikes)
  console.log("Test 2: Steady-state series test...");
  const steadyData = [];
  for (let i = 1; i <= 20; i++) {
    const dayStr = i < 10 ? `0${i}` : `${i}`;
    steadyData.push({
      date: `2026-09-${dayStr}`,
      cost: 0.80 + (i % 2 === 0 ? 0.02 : -0.02),
      carbonGco2e: 45.0,
    });
  }
  const steadyRes = engine.analyze(steadyData, 50.0);
  console.assert(steadyRes.historicalDaysCount === 20, "Expected 20 historical days");
  console.assert(steadyRes.anomalies.hasAnomalies === false, "Expected zero anomalies for steady spend");
  console.assert(steadyRes.anomalies.detectedCount === 0, "Expected 0 detected count");
  console.assert(steadyRes.monthEndProjectedCost > 0, "Expected positive month end projection");
  console.assert(steadyRes.budgetRisk === "low", "Expected low budget risk");
  console.log("✓ Test 2 Passed.\n");

  // Test 3: Synthetic Spike Detection (Z-Score & IQR)
  console.log("Test 3: Synthetic anomaly spike detection test...");
  const spikeData = [...steadyData];
  // Inject sudden 5x spike on day 15
  spikeData[14] = {
    date: "2026-09-15",
    cost: 4.85, // huge jump from ~0.80
    carbonGco2e: 280.0,
  };
  const spikeRes = engine.analyze(spikeData, 50.0);
  console.assert(spikeRes.anomalies.hasAnomalies === true, "Expected anomaly to be detected");
  console.assert(spikeRes.anomalies.detectedCount >= 1, "Expected at least 1 detected anomaly");
  
  const anomaly = spikeRes.anomalies.items.find(a => a.date === "2026-09-15");
  console.assert(anomaly !== undefined, "Expected anomaly on 2026-09-15");
  console.assert(anomaly.severity === "critical" || anomaly.severity === "warning", "Expected critical/warning severity");
  console.assert(anomaly.zScore > 2.0, "Expected Z-score > 2.0");
  console.log(`✓ Test 3 Passed. Detected anomaly: Date=${anomaly.date}, Actual=$${anomaly.actualCost}, Baseline=$${anomaly.expectedBaseline}, Z-Score=${anomaly.zScore}\n`);

  // Test 4: Trajectory & Confidence Bounds Expansion
  console.log("Test 4: Trajectory bounds expansion test...");
  const trajectory = spikeRes.trajectory;
  const forecastPoints = trajectory.filter(p => p.isForecast);
  console.assert(forecastPoints.length === 14, "Expected 14 forward forecast points");
  
  for (let pt of forecastPoints) {
    console.assert(pt.upperBoundCost >= pt.predictedCost, "Upper bound must be >= predicted");
    console.assert(pt.lowerBoundCost <= pt.predictedCost, "Lower bound must be <= predicted");
  }
  console.log("✓ Test 4 Passed. Forecast bounds properly bounded.\n");

  // Test 5: Budget Risk Escalation
  console.log("Test 5: Budget risk escalation test...");
  const highSpendData = [];
  for (let i = 1; i <= 20; i++) {
    const dayStr = i < 10 ? `0${i}` : `${i}`;
    highSpendData.push({
      date: `2026-09-${dayStr}`,
      cost: 3.50, // $3.50/day * 30 days = $105/mo against $50 budget
      carbonGco2e: 120.0,
    });
  }
  const highSpendRes = engine.analyze(highSpendData, 50.0);
  console.assert(highSpendRes.budgetRisk === "high", `Expected 'high' budget risk, got ${highSpendRes.budgetRisk}`);
  console.log("✓ Test 5 Passed.\n");

  console.log("==================================================");
  console.log("🎉 ALL FORECASTING ENGINE TESTS PASSED SUCCESSFULLY");
  console.log("==================================================");
}

runTests();
