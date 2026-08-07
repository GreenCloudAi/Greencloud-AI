export interface CarbonCalculationResult {
  energyKwh: number;
  operationalGco2e: number;
  embodiedGco2e: number;
  method: string;
}

export class CarbonEngine {
  // Region Grid Carbon Intensity Factors in gCO2e/kWh (Simulated/Electricity Maps baseline)
  private static gridIntensity: Record<string, number> = {
    "us-east-1": 420.0, // Virginia (High coal/gas grid mix)
    "us-west-2": 80.0,  // Oregon (High hydroelectric mix - low carbon!)
    "eu-west-1": 310.0, // Ireland (Wind + Gas mix)
    "ap-southeast-1": 480.0, // Singapore (High fossil fuel mix)
    "default": 350.0
  };

  // Hardware Manufacturing/Lifespan constants for Embodied Carbon
  // Server lifespans are standard 4 years (35,040 hours)
  private static physicalServerEmbodiedGco2e = 1200000; // 1.2 metric tonnes of CO2e
  private static lifespanHours = 35040;
  private static physicalServerVcpus = 64;

  /**
   * Returns regional grid carbon intensity (gCO2e/kWh)
   */
  static getCarbonIntensity(region: string): number {
    return this.gridIntensity[region] || this.gridIntensity.default;
  }

  /**
   * Calculates carbon footprint metrics for an EC2 Instance over a specified day.
   */
  static calculateEC2Carbon(
    instanceType: string,
    region: string,
    avgCpuPercentage: number,
    durationHours: number = 24
  ): CarbonCalculationResult {
    // 1. Operational Energy Estimation (based on vCPU power drawing)
    // Estimate vCPUs for typical instance types
    let vcpus = 2;
    if (instanceType.includes("large")) vcpus = 2;
    else if (instanceType.includes("medium")) vcpus = 2;
    else if (instanceType.includes("micro") || instanceType.includes("nano")) vcpus = 1;
    else if (instanceType.includes("xlarge")) vcpus = 4;

    // Power consumption estimates (Watts/vCPU) - based on CCF coefficients
    const idlePowerWatts = 15; // Power consumed by CPU/RAM/Host while idle
    const peakPowerWatts = 45; // Power consumed at full load
    
    const cpuFactor = avgCpuPercentage / 100;
    const powerDrawWatts = vcpus * (idlePowerWatts + (peakPowerWatts - idlePowerWatts) * cpuFactor);
    const energyKwh = (powerDrawWatts / 1000) * durationHours;

    // 2. Operational Carbon
    const intensity = this.getCarbonIntensity(region);
    const operationalGco2e = energyKwh * intensity;

    // 3. Embodied Carbon (manufacturing allocated to instance size)
    const serverHourlyEmbodied = this.physicalServerEmbodiedGco2e / this.lifespanHours;
    const instanceHourlyEmbodied = serverHourlyEmbodied * (vcpus / this.physicalServerVcpus);
    const embodiedGco2e = instanceHourlyEmbodied * durationHours;

    return {
      energyKwh: parseFloat(energyKwh.toFixed(4)),
      operationalGco2e: parseFloat(operationalGco2e.toFixed(2)),
      embodiedGco2e: parseFloat(embodiedGco2e.toFixed(2)),
      method: "GSF-SCI-v1"
    };
  }

  /**
   * Calculates carbon footprint metrics for an EBS Volume over a day.
   */
  static calculateEBSCarbon(
    sizeGb: number,
    region: string,
    durationHours: number = 24
  ): CarbonCalculationResult {
    // 1. Operational Energy
    // SSD/HDD energy use is estimated around 0.0005 Wh per GB per hour (CCF standard)
    const energyFactorWh = 0.0005; 
    const energyKwh = (sizeGb * energyFactorWh * durationHours) / 1000;

    // 2. Operational Carbon
    const intensity = this.getCarbonIntensity(region);
    const operationalGco2e = energyKwh * intensity;

    // 3. Embodied Carbon for storage
    // Allocated manufacturing emissions: ~0.0002 gCO2e per GB per hour
    const embodiedHourlyRate = 0.0002;
    const embodiedGco2e = sizeGb * embodiedHourlyRate * durationHours;

    return {
      energyKwh: parseFloat(energyKwh.toFixed(6)),
      operationalGco2e: parseFloat(operationalGco2e.toFixed(2)),
      embodiedGco2e: parseFloat(embodiedGco2e.toFixed(2)),
      method: "CCF-Storage-v1.5"
    };
  }

  /**
   * Calculates the GSF SCI score for a workload.
   * SCI = (Operational Carbon + Embodied Carbon) / Functional Unit
   */
  static calculateSciScore(
    totalOperationalGco2e: number,
    totalEmbodiedGco2e: number,
    functionalUnits: number
  ): number {
    if (functionalUnits <= 0) return 0;
    const totalEmissions = totalOperationalGco2e + totalEmbodiedGco2e;
    return parseFloat((totalEmissions / functionalUnits).toFixed(5));
  }
}
