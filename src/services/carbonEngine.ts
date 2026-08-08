/**
 * Carbon Footprint Calculation Engine
 * Operational carbon = Energy (kWh) * Grid Carbon Intensity (gCO2e / kWh)
 * Energy = (Average CPU Util % * TDP Watts * PUE * Hours) / 1000
 */

export interface CarbonCalculationInput {
  instanceType: string;
  cpuUtilPercent: number; // 0 - 100
  hours: number;
  region?: string;
  gridCarbonIntensityGco2ePerKwh?: number; // Default 385 gCO2e/kWh (US average)
}

export interface CarbonCalculationResult {
  energyKwh: number;
  operationalGco2e: number;
  embodiedGco2e: number;
  method: string;
  confidence: number;
}

export class CarbonEngine {
  // Approximate thermal design power (TDP) in Watts per instance type
  private static TDP_MAP: Record<string, number> = {
    "t3.micro": 8,
    "m5.large": 45,
    "c5.xlarge": 90,
    "r5.large": 60,
  };

  // Approximate embodied carbon gCO2e per instance-hour
  private static EMBODIED_MAP: Record<string, number> = {
    "t3.micro": 0.5,
    "m5.large": 2.1,
    "c5.xlarge": 4.2,
    "r5.large": 3.0,
  };

  // Cloud datacenter PUE (Power Usage Effectiveness)
  private static AWS_DEFAULT_PUE = 1.15;

  // Default Grid Intensity (gCO2e / kWh)
  private static DEFAULT_GRID_INTENSITY = 385.0;

  /**
   * Calculates operational and embodied carbon footprint using hybrid CCF method.
   */
  static calculateInstanceCarbon(input: CarbonCalculationInput): CarbonCalculationResult {
    const tdp = this.TDP_MAP[input.instanceType] || 40;
    const embodiedPerHour = this.EMBODIED_MAP[input.instanceType] || 2.0;
    const gridIntensity = input.gridCarbonIntensityGco2ePerKwh || this.DEFAULT_GRID_INTENSITY;

    // Minimum power draw at idle is ~25% of TDP, scaling linearly with CPU utilization
    const loadFraction = Math.max(0.25, input.cpuUtilPercent / 100);
    const powerWatts = tdp * loadFraction * this.AWS_DEFAULT_PUE;
    const energyKwh = (powerWatts * input.hours) / 1000;

    const operationalGco2e = energyKwh * gridIntensity;
    const embodiedGco2e = embodiedPerHour * input.hours;

    return {
      energyKwh: parseFloat(energyKwh.toFixed(4)),
      operationalGco2e: parseFloat(operationalGco2e.toFixed(2)),
      embodiedGco2e: parseFloat(embodiedGco2e.toFixed(2)),
      method: "hybrid_ccf_v1.2",
      confidence: 0.92
    };
  }
}
