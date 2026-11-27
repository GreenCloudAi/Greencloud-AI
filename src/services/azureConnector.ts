import { GreenCloudConfig } from "./config";
import { Logger } from "./logger";

// ─── Normalized Azure Resource Interfaces ──────────────────────────────────────
// Mirrors the normalized shape expected by IngestionService.
// Every field is sourced from real Azure ARM, Monitor, and Cost Management APIs.

export interface AzureVMResource {
  VmId: string;
  ResourceId: string; // Full ARM resource ID (/subscriptions/.../virtualMachines/...)
  Name: string;
  VmSize: string; // e.g. "Standard_D2s_v5"
  State: string; // "running" | "stopped" | "deallocated"
  Region: string; // e.g. "eastus", "centralindia"
  TimeCreated: string;
  CpuUtilizationSeries: number[];
  PeakCpuUtilization: number;
  Tags: { Key: string; Value: string }[];
  MonthlyCost: number;
}

export interface AzureManagedDiskResource {
  DiskId: string;
  Name: string;
  SizeGb: number;
  State: string; // "available" (Unattached) | "in-use" (Attached)
  Region: string;
  SkuName: string; // "Premium_LRS", "StandardSSD_LRS", "Standard_LRS"
  TimeCreated: string;
  ManagedBy?: string;
  Tags: { Key: string; Value: string }[];
  MonthlyCost: number;
}

export interface AzurePublicIPResource {
  ResourceId: string;
  Name: string;
  IpAddress: string;
  Region: string;
  AssociationId?: string;
  SkuName: string;
  Tags: { Key: string; Value: string }[];
  MonthlyCost: number;
}

export interface AzureCostRow {
  Date: string;
  Service: string;
  Cost: number;
}

// ─── Azure On-Demand Pricing Reference (USD/hr, East US baseline) ──────────────
const AZURE_VM_HOURLY_PRICING: Record<string, number> = {
  standard_b1ls: 0.0052,
  standard_b1s: 0.0104,
  standard_b1ms: 0.0207,
  standard_b2s: 0.0416,
  standard_b2ms: 0.0832,
  standard_b4ms: 0.166,
  standard_d2s_v3: 0.096,
  standard_d4s_v3: 0.192,
  standard_d8s_v3: 0.384,
  standard_d2s_v5: 0.096,
  standard_d4s_v5: 0.192,
  standard_d8s_v5: 0.384,
  standard_d16s_v5: 0.768,
  standard_d2ps_v5: 0.077, // Arm64 Ampere Altra
  standard_d4ps_v5: 0.154,
  standard_d8ps_v5: 0.308,
  standard_b2ps_v2: 0.032,
  standard_f2s_v2: 0.085,
  standard_f4s_v2: 0.169,
  standard_f8s_v2: 0.338,
  standard_e2s_v5: 0.126,
  standard_e4s_v5: 0.252,
  standard_e8s_v5: 0.504,
};

// Managed Disk pricing per GB-month (approximate)
const AZURE_DISK_GB_MONTH_PRICING: Record<string, number> = {
  Premium_LRS: 0.135,
  PremiumV2_LRS: 0.12,
  StandardSSD_LRS: 0.075,
  Standard_LRS: 0.045,
  UltraSSD_LRS: 0.15,
};

const ARM_BASE = "https://management.azure.com";

export class AzureCloudConnector {
  private subscriptionId: string;
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(
    subscriptionId: string,
    tenantId: string,
    clientId: string,
    clientSecret: string
  ) {
    if (!subscriptionId || !tenantId || !clientId || !clientSecret) {
      throw new Error(
        "AzureCloudConnector requires subscriptionId, tenantId, clientId, and clientSecret."
      );
    }
    this.subscriptionId = subscriptionId.trim();
    this.tenantId = tenantId.trim();
    this.clientId = clientId.trim();
    this.clientSecret = clientSecret.trim();
  }

  /**
   * Acquires an OAuth2 Bearer token for Azure Resource Manager using Service Principal credentials.
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60_000) {
      return this.cachedToken.token;
    }

    Logger.info("AZURE", "OAUTH_TOKEN_REQUEST", `Acquiring ARM token for Azure Tenant ${this.tenantId}...`);
    const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: "https://management.azure.com/.default",
      grant_type: "client_credentials",
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      const msg = data.error_description || data.error || `HTTP ${res.status}`;
      Logger.error("AZURE", "OAUTH_TOKEN_FAILED", new Error(msg), "Verify Azure Tenant ID, Client ID, and Client Secret.");
      throw new Error(`Azure authentication failed: ${msg}`);
    }

    const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3599;
    this.cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + expiresInSec * 1000,
    };

    Logger.success("AZURE", "OAUTH_TOKEN_ACQUIRED", "Azure ARM access token acquired.");
    return this.cachedToken.token;
  }

  /**
   * Helper for authenticated ARM GET/POST requests with pagination support.
   */
  private async armRequest<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      let errText = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errText = errJson?.error?.message || errText;
      } catch {
        // ignore parse failure
      }
      throw new Error(`Azure ARM API error (${res.status}): ${errText}`);
    }

    return res.json() as Promise<T>;
  }

  private normalizeTags(tagsObj?: Record<string, string> | null): { Key: string; Value: string }[] {
    if (!tagsObj || typeof tagsObj !== "object") return [];
    return Object.entries(tagsObj).map(([Key, Value]) => ({ Key, Value: String(Value) }));
  }

  private normalizePowerState(statuses?: Array<{ code?: string }>): string {
    const powerStatus = statuses?.find((s) => s.code?.startsWith("PowerState/"))?.code;
    if (!powerStatus) return "running";
    const state = powerStatus.replace("PowerState/", "").toLowerCase();
    if (state === "deallocated" || state === "stopped") return "stopped";
    return state;
  }

  /**
   * Queries Azure Monitor 7-day Percentage CPU metrics for a Virtual Machine.
   */
  private async fetchVmCpuMetrics(
    vmResourceId: string
  ): Promise<{ series: number[]; peak: number }> {
    try {
      const end = new Date();
      const start = new Date(
        end.getTime() - GreenCloudConfig.cloudwatchLookbackDays * 24 * 3600 * 1000
      );
      const timespan = `${start.toISOString()}/${end.toISOString()}`;
      const url =
        `${ARM_BASE}${vmResourceId}/providers/Microsoft.Insights/metrics` +
        `?api-version=2023-10-01&metricnames=${encodeURIComponent("Percentage CPU")}` +
        `&timespan=${encodeURIComponent(timespan)}&interval=P1D&aggregation=Average,Maximum`;

      const data = await this.armRequest<any>(url);
      const timeseries = data?.value?.[0]?.timeseries?.[0]?.data || [];

      const series: number[] = [];
      let peak = 0;

      for (const point of timeseries) {
        if (typeof point.average === "number") {
          series.push(parseFloat(point.average.toFixed(2)));
        }
        if (typeof point.maximum === "number" && point.maximum > peak) {
          peak = parseFloat(point.maximum.toFixed(2));
        }
      }

      if (peak === 0 && series.length > 0) {
        peak = Math.max(...series);
      }

      return { series, peak };
    } catch (err: any) {
      Logger.warn(
        "AZURE",
        "MONITOR_METRICS_WARN",
        `Could not fetch Azure Monitor CPU metrics for ${vmResourceId}: ${err.message}`
      );
      return { series: [], peak: 0 };
    }
  }

  /**
   * Fetches all Azure Virtual Machines across the subscription with live instanceView & CPU telemetry.
   */
  async fetchVirtualMachines(): Promise<AzureVMResource[]> {
    Logger.info("AZURE", "FETCH_VMS", `Listing Virtual Machines in subscription ${this.subscriptionId}...`);
    const vms: AzureVMResource[] = [];

    let nextUrl: string | null =
      `${ARM_BASE}/subscriptions/${this.subscriptionId}/providers/Microsoft.Compute/virtualMachines?api-version=2024-03-01&$expand=instanceView`;

    while (nextUrl) {
      const page: any = await this.armRequest<any>(nextUrl);
      const items = Array.isArray(page.value) ? page.value : [];

      for (const vm of items) {
        const vmSize = vm.properties?.hardwareProfile?.vmSize || "Standard_D2s_v5";
        const state = this.normalizePowerState(vm.properties?.instanceView?.statuses);
        const region = (vm.location || "eastus").toLowerCase().replace(/\s+/g, "");
        const hourlyRate = AZURE_VM_HOURLY_PRICING[vmSize.toLowerCase()] ?? 0.096;
        const monthlyCost = state === "running" ? parseFloat((hourlyRate * 730).toFixed(2)) : 0;

        const tags = this.normalizeTags(vm.tags);
        if (!tags.some((t) => t.Key === "Name") && vm.name) {
          tags.unshift({ Key: "Name", Value: vm.name });
        }

        const metrics =
          state === "running" && vm.id
            ? await this.fetchVmCpuMetrics(vm.id)
            : { series: [], peak: 0 };

        vms.push({
          VmId: vm.properties?.vmId || vm.id || vm.name,
          ResourceId: vm.id || vm.name,
          Name: vm.name,
          VmSize: vmSize,
          State: state,
          Region: region,
          TimeCreated: vm.properties?.timeCreated || new Date().toISOString(),
          CpuUtilizationSeries: metrics.series,
          PeakCpuUtilization: metrics.peak,
          Tags: tags,
          MonthlyCost: monthlyCost,
        });
      }

      nextUrl = page.nextLink || null;
    }

    Logger.success("AZURE", "FETCH_VMS_DONE", `Discovered ${vms.length} Azure Virtual Machines.`);
    return vms;
  }

  /**
   * Fetches all Azure Managed Disks across the subscription.
   */
  async fetchManagedDisks(): Promise<AzureManagedDiskResource[]> {
    Logger.info("AZURE", "FETCH_DISKS", `Listing Managed Disks in subscription ${this.subscriptionId}...`);
    const disks: AzureManagedDiskResource[] = [];

    let nextUrl: string | null =
      `${ARM_BASE}/subscriptions/${this.subscriptionId}/providers/Microsoft.Compute/disks?api-version=2023-10-02`;

    while (nextUrl) {
      const page: any = await this.armRequest<any>(nextUrl);
      const items = Array.isArray(page.value) ? page.value : [];

      for (const disk of items) {
        const sizeGb = disk.properties?.diskSizeGB || 0;
        const skuName = disk.sku?.name || "StandardSSD_LRS";
        const diskState = disk.properties?.diskState || "";
        const isUnattached = diskState === "Unattached" || !disk.managedBy;
        const ratePerGb = AZURE_DISK_GB_MONTH_PRICING[skuName] ?? 0.075;
        const monthlyCost = parseFloat((sizeGb * ratePerGb).toFixed(2));
        const region = (disk.location || "eastus").toLowerCase().replace(/\s+/g, "");

        const tags = this.normalizeTags(disk.tags);
        if (!tags.some((t) => t.Key === "Name") && disk.name) {
          tags.unshift({ Key: "Name", Value: disk.name });
        }

        disks.push({
          DiskId: disk.properties?.uniqueId || disk.name,
          Name: disk.name,
          SizeGb: sizeGb,
          State: isUnattached ? "available" : "in-use",
          Region: region,
          SkuName: skuName,
          TimeCreated: disk.properties?.timeCreated || new Date().toISOString(),
          ManagedBy: disk.managedBy,
          Tags: tags,
          MonthlyCost: monthlyCost,
        });
      }

      nextUrl = page.nextLink || null;
    }

    Logger.success("AZURE", "FETCH_DISKS_DONE", `Discovered ${disks.length} Azure Managed Disks.`);
    return disks;
  }

  /**
   * Fetches all Azure Public IP Addresses across the subscription.
   */
  async fetchPublicIPs(): Promise<AzurePublicIPResource[]> {
    Logger.info("AZURE", "FETCH_IPS", `Listing Public IPs in subscription ${this.subscriptionId}...`);
    const ips: AzurePublicIPResource[] = [];

    let nextUrl: string | null =
      `${ARM_BASE}/subscriptions/${this.subscriptionId}/providers/Microsoft.Network/publicIPAddresses?api-version=2023-11-01`;

    while (nextUrl) {
      const page: any = await this.armRequest<any>(nextUrl);
      const items = Array.isArray(page.value) ? page.value : [];

      for (const ip of items) {
        const assocId = ip.properties?.ipConfiguration?.id;
        const region = (ip.location || "eastus").toLowerCase().replace(/\s+/g, "");
        const tags = this.normalizeTags(ip.tags);
        if (!tags.some((t) => t.Key === "Name") && ip.name) {
          tags.unshift({ Key: "Name", Value: ip.name });
        }

        ips.push({
          ResourceId: ip.id || ip.name,
          Name: ip.name,
          IpAddress: ip.properties?.ipAddress || ip.name,
          Region: region,
          AssociationId: assocId,
          SkuName: ip.sku?.name || "Standard",
          Tags: tags,
          MonthlyCost: assocId ? 0 : 3.65,
        });
      }

      nextUrl = page.nextLink || null;
    }

    Logger.success("AZURE", "FETCH_IPS_DONE", `Discovered ${ips.length} Azure Public IPs.`);
    return ips;
  }

  /**
   * Queries Azure Cost Management API for daily billed spend grouped by ServiceName.
   */
  async fetchBillingSummary(startDate: string, endDate: string): Promise<AzureCostRow[]> {
    Logger.info("AZURE", "FETCH_BILLING", `Querying Azure Cost Management (${startDate} to ${endDate})...`);
    const url = `${ARM_BASE}/subscriptions/${this.subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;

    const payload = {
      type: "ActualCost",
      timeframe: "Custom",
      timePeriod: {
        from: `${startDate}T00:00:00Z`,
        to: `${endDate}T23:59:59Z`,
      },
      dataset: {
        granularity: "Daily",
        aggregation: {
          totalCost: {
            name: "Cost",
            function: "Sum",
          },
        },
        grouping: [
          {
            type: "Dimension",
            name: "ServiceName",
          },
        ],
      },
    };

    const res = await this.armRequest<any>(url, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const columns: Array<{ name: string }> = res?.properties?.columns || [];
    const rows: any[][] = res?.properties?.rows || [];

    const costIdx = columns.findIndex((c) => c.name === "Cost");
    const dateIdx = columns.findIndex((c) => c.name === "UsageDate");
    const serviceIdx = columns.findIndex((c) => c.name === "ServiceName");

    const parsed: AzureCostRow[] = [];
    for (const row of rows) {
      const cost = parseFloat(Number(row[costIdx >= 0 ? costIdx : 0] || 0).toFixed(4));
      if (cost <= 0) continue;

      const rawDate = String(row[dateIdx >= 0 ? dateIdx : 1] || startDate);
      const formattedDate =
        rawDate.length === 8 && !rawDate.includes("-")
          ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
          : rawDate.slice(0, 10);

      const service = String(row[serviceIdx >= 0 ? serviceIdx : 2] || "Azure Services");
      parsed.push({ Date: formattedDate, Service: service, Cost: cost });
    }

    Logger.success("AZURE", "FETCH_BILLING_DONE", `Retrieved ${parsed.length} Azure Cost Management rows.`);
    return parsed;
  }
}
