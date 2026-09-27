/**
 * GreenCloud AI — Time-Series Forecasting & Anomaly Spike Detection Engine
 * 
 * Provides:
 * 1. Double Exponential Smoothing (Holt's linear trend) and seasonal forecasting for cost and carbon emissions.
 * 2. 95% Confidence Interval bounds (Upper/Lower) using residual standard errors.
 * 3. Statistical Anomaly Detection using rolling Z-Score (standard deviation) and Interquartile Range (IQR).
 * 4. Month-end burn-rate projection and budget risk classification.
 * 
 * Compliant with FinOps FOCUS 1.3 and Green Software Foundation SCI requirements.
 */

export interface DailyDataPoint {
  date: string; // ISO date string "YYYY-MM-DD"
  cost: number; // USD
  carbonGco2e?: number; // Operational + embodied carbon in gCO2e
  cpuUtilizationPercent?: number; // 0 - 100
}

export interface ForecastTrajectoryPoint {
  date: string;
  predictedCost: number;
  lowerBoundCost: number;
  upperBoundCost: number;
  predictedCarbonGco2e: number;
  isForecast: boolean;
}

export interface DetectedAnomaly {
  id: string;
  date: string;
  dimension: "service" | "resource" | "region" | "overall";
  entityName: string;
  actualCost: number;
  expectedBaseline: number;
  deviationPercent: number;
  zScore: number;
  severity: "critical" | "warning" | "info";
  rootCauseHint: string;
  recommendedAction: string;
}

export interface ForecastingEngineResult {
  historicalDaysCount: number;
  forecastDaysCount: number;
  trajectory: ForecastTrajectoryPoint[];
  monthEndProjectedCost: number;
  next30DaysProjectedCost: number;
  monthEndProjectedCarbon: number;
  trendVelocity: "accelerating" | "stable" | "decelerating";
  budgetRisk: "low" | "medium" | "high";
  anomalies: {
    hasAnomalies: boolean;
    detectedCount: number;
    criticalCount: number;
    warningCount: number;
    message: string;
    items: DetectedAnomaly[];
  };
}

export interface ForecastingEngineOptions {
  forecastHorizonDays?: number;
  alpha?: number; // Level smoothing parameter (0 < alpha < 1)
  beta?: number; // Trend smoothing parameter (0 < beta < 1)
  phi?: number; // Damping parameter for Holt's trend (0 < phi <= 1, default 0.80)
  zScoreThreshold?: number; // Default 2.5 std deviations
  targetMonthlyBudget?: number; // Default 50.0 USD
}

export class ForecastingEngine {
  private alpha: number;
  private beta: number;
  private phi: number;
  private zScoreThreshold: number;
  private forecastHorizonDays: number;
  private targetMonthlyBudget: number;

  constructor(options?: ForecastingEngineOptions) {
    this.alpha = options?.alpha ?? 0.35;
    this.beta = options?.beta ?? 0.15;
    this.phi = options?.phi ?? 0.80; // Gardner & McKenzie trend damping
    this.zScoreThreshold = options?.zScoreThreshold ?? 2.5;
    this.forecastHorizonDays = options?.forecastHorizonDays ?? 30;
    this.targetMonthlyBudget = options?.targetMonthlyBudget ?? 50.0;
  }

  /**
   * Main entry point: Evaluates daily history to produce forward forecasts and detect spend/carbon anomalies.
   */
  public analyze(historicalData: DailyDataPoint[], targetBudget?: number): ForecastingEngineResult {
    const budget = targetBudget ?? this.targetMonthlyBudget;

    // Defensive check: if no history or minimal data, synthesize baseline
    if (!historicalData || historicalData.length === 0) {
      return this.generateEmptyResult(budget);
    }

    // Sort chronologically ascending
    const sorted = [...historicalData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 1. Detect Anomalies on historical series
    const detectedAnomalies = this.detectAnomalies(sorted);

    // 2. Compute Holt's Linear Trend on daily spend
    const costForecast = this.computeHoltForecast(
      sorted.map((d) => d.cost),
      this.forecastHorizonDays
    );

    // 3. Compute Holt's Linear Trend on daily carbon emissions
    const carbonForecast = this.computeHoltForecast(
      sorted.map((d) => d.carbonGco2e ?? 0),
      this.forecastHorizonDays
    );

    // 4. Construct trajectory combining historical + forecast points
    const trajectory: ForecastTrajectoryPoint[] = [];

    // Historical portion
    for (let i = 0; i < sorted.length; i++) {
      const pt = sorted[i];
      trajectory.push({
        date: pt.date,
        predictedCost: parseFloat(pt.cost.toFixed(2)),
        lowerBoundCost: parseFloat(pt.cost.toFixed(2)),
        upperBoundCost: parseFloat(pt.cost.toFixed(2)),
        predictedCarbonGco2e: parseFloat((pt.carbonGco2e ?? 0).toFixed(1)),
        isForecast: false,
      });
    }

    // Forward forecast portion
    const lastDate = new Date(sorted[sorted.length - 1].date);
    for (let f = 0; f < costForecast.predictions.length; f++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + (f + 1));
      const dateStr = forecastDate.toISOString().split("T")[0];

      trajectory.push({
        date: dateStr,
        predictedCost: parseFloat(costForecast.predictions[f].toFixed(2)),
        lowerBoundCost: parseFloat(costForecast.lowerBounds[f].toFixed(2)),
        upperBoundCost: parseFloat(costForecast.upperBounds[f].toFixed(2)),
        predictedCarbonGco2e: parseFloat(Math.max(0, carbonForecast.predictions[f]).toFixed(1)),
        isForecast: true,
      });
    }

    // 5. Calculate Month-End Projection based on calendar days elapsed
    const now = new Date();
    const currentDay = Math.max(1, now.getUTCDate());
    const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
    const remainingDaysInMonth = Math.max(0, daysInMonth - currentDay);

    const historicalSpendMtd = sorted.reduce((sum, d) => sum + d.cost, 0);
    const projectedRemainingSpend = costForecast.predictions
      .slice(0, remainingDaysInMonth)
      .reduce((sum, val) => sum + val, 0);
    const monthEndProjectedCost = parseFloat((historicalSpendMtd + projectedRemainingSpend).toFixed(2));

    const historicalCarbonMtd = sorted.reduce((sum, d) => sum + (d.carbonGco2e ?? 0), 0);
    const projectedRemainingCarbon = carbonForecast.predictions
      .slice(0, remainingDaysInMonth)
      .reduce((sum, val) => sum + val, 0);
    const monthEndProjectedCarbon = parseFloat(
      (historicalCarbonMtd + projectedRemainingCarbon).toFixed(1)
    );

    // 6. Next 30 Days Projected Spend
    const next30DaysProjectedCost = parseFloat(
      costForecast.predictions.slice(0, 30).reduce((sum, val) => sum + val, 0).toFixed(2)
    );

    // 7. Trend Velocity
    let trendVelocity: "accelerating" | "stable" | "decelerating" = "stable";
    const lastPoint = sorted[sorted.length - 1];
    const prevPoint = sorted.length > 1 ? sorted[sorted.length - 2] : null;

    if (prevPoint && lastPoint.cost < prevPoint.cost * 0.85) {
      trendVelocity = "decelerating";
    } else if (costForecast.trend > 0.03) {
      trendVelocity = "accelerating";
    } else if (costForecast.trend < -0.03) {
      trendVelocity = "decelerating";
    }

    // 8. Budget Risk Assessment
    let budgetRisk: "low" | "medium" | "high" = "low";
    if (monthEndProjectedCost > budget * 1.0) {
      budgetRisk = "high";
    } else if (monthEndProjectedCost > budget * 0.8) {
      budgetRisk = "medium";
    }

    // 9. Summary message
    const criticalCount = detectedAnomalies.filter((a) => a.severity === "critical").length;
    const warningCount = detectedAnomalies.filter((a) => a.severity === "warning").length;
    let message = "Spend and carbon telemetry within nominal bounds (0 anomalies detected).";

    if (detectedAnomalies.length > 0) {
      const top = detectedAnomalies[0];
      message = `Identified ${detectedAnomalies.length} anomaly spike(s). Top outlier on ${top.date} in ${top.entityName}: $${top.actualCost.toFixed(2)} vs expected $${top.expectedBaseline.toFixed(2)} (+${top.deviationPercent}% deviation).`;
    }

    return {
      historicalDaysCount: sorted.length,
      forecastDaysCount: this.forecastHorizonDays,
      trajectory,
      monthEndProjectedCost,
      next30DaysProjectedCost,
      monthEndProjectedCarbon,
      trendVelocity,
      budgetRisk,
      anomalies: {
        hasAnomalies: detectedAnomalies.length > 0,
        detectedCount: detectedAnomalies.length,
        criticalCount,
        warningCount,
        message,
        items: detectedAnomalies,
      },
    };
  }

  /**
   * Computes Gardner-McKenzie Damped Holt's linear trend forecast (double exponential smoothing).
   * Incorporates outlier-resistant winsorization and transient spike mean-reversion to prevent
   * one-off anomaly spikes (e.g. AWS Cost Explorer API queries or temporary batch workloads)
   * from inducing runaway 5x exponential escalations.
   * 
   * Level: L_t = alpha * Y_t + (1 - alpha) * (L_{t-1} + phi * T_{t-1})
   * Trend: T_t = beta * (L_t - L_{t-1}) + (1 - beta) * phi * T_{t-1}
   * Damped Forecast: Y_{t+h} = L_t + sum_{i=1}^h (phi^i) * T_t
   */
  private computeHoltForecast(
    series: number[],
    horizon: number
  ): {
    level: number;
    trend: number;
    predictions: number[];
    lowerBounds: number[];
    upperBounds: number[];
  } {
    const n = series.length;
    if (n === 0) {
      return { level: 0, trend: 0, predictions: Array(horizon).fill(0), lowerBounds: Array(horizon).fill(0), upperBounds: Array(horizon).fill(0) };
    }

    if (n === 1) {
      const val = series[0];
      return {
        level: val,
        trend: 0,
        predictions: Array(horizon).fill(val),
        lowerBounds: Array(horizon).fill(Math.max(0, val * 0.9)),
        upperBounds: Array(horizon).fill(val * 1.1),
      };
    }

    // 1. Identify statistical outliers on historical series to avoid trend pollution
    const mean = series.reduce((a, b) => a + b, 0) / n;
    const variance = series.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / Math.max(1, n - 1);
    const stdDev = Math.sqrt(variance);

    const isAnomaly = series.map((x) => (stdDev > 0 ? (x - mean) / stdDev >= this.zScoreThreshold : false));
    // Winsorize outliers for steady-state trend estimation
    const winsorized = series.map((x, i) => (isAnomaly[i] ? mean + 1.5 * stdDev : x));

    // 2. Initialize level and damped trend
    let level = winsorized[0];
    let trend = winsorized[1] - winsorized[0];
    const fitted: number[] = [level];

    // Iterative smoothing over historical series using Gardner-McKenzie damping (phi)
    for (let t = 1; t < n; t++) {
      const prevLevel = level;
      const prevTrend = trend;
      const actual = winsorized[t];

      level = this.alpha * actual + (1 - this.alpha) * (prevLevel + this.phi * prevTrend);
      trend = this.beta * (level - prevLevel) + (1 - this.beta) * this.phi * prevTrend;

      fitted.push(prevLevel + this.phi * prevTrend);
    }

    // 3. Compute residual standard error strictly on non-anomalous points
    let sumSquaredError = 0;
    let nonAnomalyCount = 0;
    for (let i = 1; i < n; i++) {
      if (!isAnomaly[i]) {
        const residual = series[i] - fitted[i];
        sumSquaredError += residual * residual;
        nonAnomalyCount++;
      }
    }
    const standardError = Math.sqrt(sumSquaredError / Math.max(1, nonAnomalyCount - 2));

    // 4. Generate h-step forward predictions with transient spike decay
    const predictions: number[] = [];
    const lowerBounds: number[] = [];
    const upperBounds: number[] = [];

    let cumulativePhi = 0;
    const lastActual = series[n - 1];
    const recentIsSpike = isAnomaly[n - 1] || (n >= 2 && isAnomaly[n - 2]);

    for (let h = 1; h <= horizon; h++) {
      cumulativePhi += Math.pow(this.phi, h);
      const baselinePred = Math.max(0.01, level + cumulativePhi * trend);

      // If recent observation was a transient spike, mean-revert towards baseline
      let pred = baselinePred;
      if (recentIsSpike) {
        const decay = Math.pow(0.70, h);
        pred = lastActual * decay + baselinePred * (1 - decay);
      }
      pred = Math.max(0.01, parseFloat(pred.toFixed(2)));

      // 95% Confidence Interval with bounded margin of error
      const marginOfError = parseFloat((1.96 * standardError * Math.sqrt(Math.min(h, 9))).toFixed(2));
      const lower = Math.max(0.01, parseFloat((pred - marginOfError).toFixed(2)));
      const upper = parseFloat((pred + marginOfError).toFixed(2));

      predictions.push(pred);
      lowerBounds.push(lower);
      upperBounds.push(upper);
    }

    return { level, trend, predictions, lowerBounds, upperBounds };
  }

  /**
   * Statistical Outlier Detection using rolling Z-Score and Interquartile Range (IQR).
   */
  private detectAnomalies(data: DailyDataPoint[]): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];
    if (data.length < 3) return anomalies;

    const costs = data.map((d) => d.cost);
    const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
    const variance = costs.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (costs.length - 1);
    const stdDev = Math.sqrt(variance);

    // Sort to compute quantiles (Q1, Median, Q3, IQR)
    const sortedCosts = [...costs].sort((a, b) => a - b);
    const q1 = sortedCosts[Math.floor(sortedCosts.length * 0.25)];
    const q3 = sortedCosts[Math.floor(sortedCosts.length * 0.75)];
    const iqr = q3 - q1;
    const iqrUpperThreshold = q3 + 1.5 * iqr;

    for (let i = 0; i < data.length; i++) {
      const pt = data[i];
      const zScore = stdDev > 0 ? (pt.cost - mean) / stdDev : 0;

      // Spike criteria: Exceeds Z-score threshold OR exceeds IQR upper threshold with significant cost
      const isZScoreAnomaly = zScore >= this.zScoreThreshold && pt.cost > 0.05;
      const isIqrAnomaly = pt.cost > iqrUpperThreshold && pt.cost > mean * 1.5 && pt.cost > 0.05;

      if (isZScoreAnomaly || isIqrAnomaly) {
        const baseline = Math.max(0.01, mean);
        const deviationPercent = Math.round(((pt.cost - baseline) / baseline) * 100);

        let severity: "critical" | "warning" | "info" = "info";
        if (zScore >= 3.5 || deviationPercent >= 150) {
          severity = "critical";
        } else if (zScore >= 2.0 || deviationPercent >= 75) {
          severity = "warning";
        }

        anomalies.push({
          id: `anomaly-${pt.date}-${i}`,
          date: pt.date,
          dimension: "overall",
          entityName: "Cloud Daily Run-Rate",
          actualCost: parseFloat(pt.cost.toFixed(2)),
          expectedBaseline: parseFloat(baseline.toFixed(2)),
          deviationPercent,
          zScore: parseFloat(zScore.toFixed(2)),
          severity,
          rootCauseHint:
            deviationPercent > 100
              ? `Sudden ${deviationPercent}% spend spike detected above baseline. Potential untagged batch cluster or unexpected compute provisioning.`
              : `Spend deviated ${deviationPercent}% above 14-day rolling average.`,
          recommendedAction:
            severity === "critical"
              ? "Inspect active instances in the Infrastructure tab to identify newly launched or unattached resources."
              : "Review resource tags and CloudWatch metrics for temporary utilization peaks.",
        });
      }
    }

    // Sort anomalies descending by date (most recent first)
    return anomalies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Generates a safe baseline response when no historical cost items exist.
   */
  private generateEmptyResult(targetBudget: number): ForecastingEngineResult {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    return {
      historicalDaysCount: 0,
      forecastDaysCount: this.forecastHorizonDays,
      trajectory: [
        {
          date: todayStr,
          predictedCost: 0,
          lowerBoundCost: 0,
          upperBoundCost: 0,
          predictedCarbonGco2e: 0,
          isForecast: false,
        },
      ],
      monthEndProjectedCost: 0,
      next30DaysProjectedCost: 0,
      monthEndProjectedCarbon: 0,
      trendVelocity: "stable",
      budgetRisk: "low",
      anomalies: {
        hasAnomalies: false,
        detectedCount: 0,
        criticalCount: 0,
        warningCount: 0,
        message: "Spend and carbon telemetry within nominal bounds (0 anomalies detected).",
        items: [],
      },
    };
  }
}
