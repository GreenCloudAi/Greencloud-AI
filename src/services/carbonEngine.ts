export interface CarbonCalculationResult {
  energyKwh: number;
  operationalGco2e: number;
  embodiedGco2e: number;
  method: string;
}

export class CarbonEngine {
  // Region Grid Carbon Intensity Factors in gCO2e/kWh (CEA / Electricity Maps baseline)
  private static gridIntensity: Record<string, number> = {
    // AWS Regions
    "ap-south-1": 680.0, // Mumbai / India (High thermal & coal grid mix)
    "us-east-1": 420.0, // Virginia (Gas & coal grid mix)
    "us-east-2": 410.0, // Ohio (Coal & gas mix)
    "us-west-1": 210.0, // N. California (Renewables & gas)
    "us-west-2": 80.0,  // Oregon (High hydroelectric mix - low carbon!)
    "eu-central-1": 340.0, // Frankfurt / Germany (Wind, coal & solar)
    "eu-west-1": 310.0, // Ireland (Wind + Gas mix)
    "eu-west-2": 220.0, // London / UK (Wind & nuclear)
    "eu-north-1": 45.0,  // Stockholm / Sweden (Hydro & nuclear - ultra clean!)
    "ap-southeast-1": 480.0, // Singapore (High fossil fuel mix)
    "ap-northeast-1": 470.0, // Tokyo / Japan (LNG & coal mix)
    // Azure Regions
    "centralindia": 680.0,
    "southindia": 650.0,
    "eastus": 420.0,
    "eastus2": 420.0,
    "westus": 210.0,
    "westus2": 80.0,
    "westus3": 390.0,
    "centralus": 450.0,
    "northeurope": 310.0,
    "westeurope": 320.0,
    "uksouth": 220.0,
    "germanywestcentral": 340.0,
    "francecentral": 75.0,
    "swedencentral": 45.0,
    "southeastasia": 480.0,
    "japaneast": 470.0,
    "canadacentral": 120.0,
    "brazilsouth": 110.0,
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
    durationHours: number = 24,
    vCpuOverride?: number
  ): CarbonCalculationResult {
    // 1. Operational Energy Estimation (based on vCPU power drawing)
    // Estimate vCPUs for AWS EC2 and Azure VM sizes
    let vcpus = vCpuOverride && vCpuOverride > 0 ? vCpuOverride : 2;
    if (!vCpuOverride) {
      const lowerType = instanceType.toLowerCase();
      const azureMatch = lowerType.match(/standard_[a-z]+(\d+)/);
      if (azureMatch) {
        vcpus = Math.max(1, parseInt(azureMatch[1], 10));
      } else if (lowerType.includes("16xlarge")) vcpus = 64;
      else if (lowerType.includes("8xlarge")) vcpus = 32;
      else if (lowerType.includes("4xlarge")) vcpus = 16;
      else if (lowerType.includes("2xlarge")) vcpus = 8;
      else if (lowerType.includes("xlarge")) vcpus = 4;
      else if (lowerType.includes("large")) vcpus = 2;
      else if (lowerType.includes("medium")) vcpus = 2;
      else if (lowerType.includes("micro") || lowerType.includes("nano")) vcpus = 1;
    }

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
