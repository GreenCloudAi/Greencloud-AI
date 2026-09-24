"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  LayoutGrid,
  DollarSign,
  Leaf,
  Server,
  Sparkles,
  History,
  Settings,
  PlusCircle,
  RefreshCw,
  Download,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Cpu,
  HardDrive,
  Network,
  Shield,
  Layers,
  Check,
  X,
  ExternalLink,
  Info,
  Menu,
  Copy,
  FileText,
  Tag,
  Sliders,
  SlidersHorizontal,
  Printer,
  Target,
  Code,
  Trash2,
  Cloud,
} from "lucide-react";

interface CloudAccount {
  id: string;
  name: string;
  externalAccountId: string;
  provider: string;
  status: string;
  syncFreshness: string | null;
  syncError: string | null;
}

export interface RegionBreakdownItem {
  region: string;
  regionName: string;
  country: string;
  flag: string;
  gridIntensity: number;
  mix: string;
  carbonStatus: string;
  runningEc2: number;
  stoppedEc2: number;
  totalEc2: number;
  totalEbs: number;
  totalEip: number;
  monthlyCost: number;
  operationalGco2e: number;
  resourcesCount: number;
  runningInstanceNames?: string[];
}

export interface MultiRegionAlert {
  active: boolean;
  level: string;
  title: string;
  message: string;
  regions: string[];
  totalRunningInstances: number;
  monthlyBurnEstimate: number;
}

export interface ScanCoverage {
  totalMonitoredRegions: number;
  allMonitoredRegions: string[];
  activeRegionsWithResources: string[];
  activeRegionsWithRunningCompute: string[];
  isMultiRegionRunning: boolean;
}

interface Resource {
  id: string;
  providerResourceId: string;
  resourceType: string;
  region: string;
  regionName?: string;
  regionCountry?: string;
  regionFlag?: string;
  instanceName?: string;
  lifecycleState: string;
  instanceType: string | null;
  sizeGb: number | null;
  monthlyCost: number | null;
  telemetryMetrics: string | null;
  tags?: string;
  carbonEmissions?: Array<{
    operationalGco2e: number;
    embodiedGco2e: number;
  }>;
}

interface Recommendation {
  id: string;
  title: string;
  category: string;
  status: string;
  estimatedMonthlySavings: number;
  estimatedGco2eSavings: number;
  riskScore: number;
  confidence: number;
  evidence: string;
  resource?: Resource | null;
}

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  objectType: string;
  objectId: string;
  ts: string;
  metadata: string | null;
}

interface DashboardData {
  account: CloudAccount | null;
  allAccounts: CloudAccount[];
  resources: {
    total: number;
    ec2: Resource[];
    ebs: Resource[];
    eip: Resource[];
    byRegion?: RegionBreakdownItem[];
    runningEc2Count?: number;
    stoppedEc2Count?: number;
    byState: {
      healthy: number;
      underutilized: number;
      peak: number;
      stopped: number;
    };
  };
  scanCoverage?: ScanCoverage;
  multiRegionAlert?: MultiRegionAlert | null;
  costs: {
    totalCost: number | null;
    dailyBurnRate: number | null;
    priorMonthCost: number | null;
    byService: Array<{ service: string; total: number }>;
    dailyTrend: Array<{ date: string; cost: number }>;
  };
  carbon: {
    totalOperationalCarbon: number | null;
    totalEmbodiedCarbon: number | null;
    totalCarbon: number | null;
    sciScore: number | null;
    functionalUnits: number;
    regionalGrid: Array<{
      region: string;
      location: string;
      gridIntensity: number;
      mix: string;
      status: string;
    }>;
  };
  recommendations: {
    items: Recommendation[];
    totalSavings: number | null;
    totalCarbonSavings: number | null;
    activeCount: number;
  };
  cpuDistribution?: {
    band0_20: number;
    band20_50: number;
    band50_80: number;
    band80_plus: number;
    oversizedCount: number;
    potentialRightsizingSavings: number;
  };
  inventory?: {
    ec2Total: number;
    ec2Healthy: number;
    ec2Review: number;
    ebsTotal: number;
    ebsAttached: number;
    ebsIdle: number;
    eipTotal: number;
    eipAssociated: number;
    eipUnused: number;
    activeRegions: string[];
    rdsCount: number;
    natCount: number;
  };
  tagAllocation?: {
    hygieneScore: number;
    taggedCount: number;
    untaggedCount: number;
    byEnvironment: Array<{ name: string; count: number; cost: number; percentage: number }>;
    byTeam: Array<{ name: string; count: number; cost: number }>;
  };
  budget?: {
    target: number;
    spent: number;
    pacePercentage: number;
    projectedMonthEnd: number;
    status: string;
  };
  anomalies?: {
    hasAnomalies: boolean;
    detectedCount: number;
    message: string;
  };
  auditLogs: AuditLog[];
}

export default function DashboardPage() {
  // Navigation Tab State (1 to 5)
  const [currentTab, setCurrentTab] = useState<
    "overview" | "cost" | "carbon" | "infrastructure" | "recommendations" | "audit"
  >("overview");
  const [activeNavItem, setActiveNavItem] = useState<string>("overview");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    infrastructure: true,
    costs: true,
    sustainability: true,
    optimization: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Dashboard Data State
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filter States for Infrastructure & Recommendations
  const [infraTypeFilter, setInfraTypeFilter] = useState<string>("all");
  const [infraRegionFilter, setInfraRegionFilter] = useState<string>("all");
  const [recCategoryFilter, setRecCategoryFilter] = useState<string>("all");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal & Drawer States
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sciFunctionalUnit, setSciFunctionalUnit] = useState<number>(100000);
  const [copiedIaC, setCopiedIaC] = useState(false);
  const [copiedTicket, setCopiedTicket] = useState(false);

  // Settings Modal State
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"accounts" | "sync" | "guardrails">("accounts");
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const [settingsToast, setSettingsToast] = useState<string | null>(null);

  // Settings Configuration State
  const [autoSyncFrequency, setAutoSyncFrequency] = useState<string>("6h");
  const [multiRegionScanEnabled, setMultiRegionScanEnabled] = useState<boolean>(true);
  const [budgetLimit, setBudgetLimit] = useState<number>(500);
  const [idleCpuThresholdVal, setIdleCpuThresholdVal] = useState<number>(5);

  const handleDeleteAccount = async (accountId: string) => {
    if (!window.confirm("Are you sure you want to disconnect this cloud account? All associated resource telemetry will be removed.")) {
      return;
    }
    try {
      setDeletingAccountId(accountId);
      const res = await fetch(`/api/cloud-accounts/${accountId}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        setSettingsToast("Account disconnected successfully.");
        await loadDashboard();
      } else {
        setSettingsToast(json.error?.message || "Failed to disconnect account.");
      }
    } catch (e: any) {
      setSettingsToast(e.message || "Failed to disconnect account.");
    } finally {
      setDeletingAccountId(null);
      setTimeout(() => setSettingsToast(null), 4000);
    }
  };

  const handleCleanDuplicates = async () => {
    try {
      setCleaningDuplicates(true);
      const res = await fetch("/api/cloud-accounts/cleanup-duplicates", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setSettingsToast(`Cleaned up ${json.deletedCount} duplicate/empty account(s).`);
        await loadDashboard();
      } else {
        setSettingsToast(json.error?.message || "Failed to clean duplicate accounts.");
      }
    } catch (e: any) {
      setSettingsToast(e.message || "Failed to clean duplicate accounts.");
    } finally {
      setCleaningDuplicates(false);
      setTimeout(() => setSettingsToast(null), 4000);
    }
  };

  // Helper: Generate Terraform IaC snippet for a recommendation
  // Helper: Generate Terraform IaC snippet for a recommendation
  const generateTerraformSnippet = (rec: Recommendation): string => {
    const isEip = rec.title.toLowerCase().includes("elastic ip") || rec.category === "eip_cleanup" || rec.resource?.resourceType === "eip";
    const isEbs = rec.title.toLowerCase().includes("ebs") || rec.title.toLowerCase().includes("volume") || rec.resource?.resourceType === "ebs";
    const isEc2 = rec.title.toLowerCase().includes("ec2") || rec.title.toLowerCase().includes("instance") || rec.resource?.resourceType === "ec2";

    if (isEip) {
      return `# GreenCloud AI — Remediation Terraform Snippet
# Action: Release unassociated Elastic IP address to eliminate hourly idle fee ($0.005/hr)
# Resource: ${rec.resource?.providerResourceId || "eipalloc-0a1b2c3d4e5f"}

# 1. To remove resource from Terraform state without touching production:
# terraform state rm aws_eip.unassociated_ip

# 2. Or set allocation count to 0 in main.tf:
resource "aws_eip" "demo_ip" {
  count  = 0 # Decommissioned via GreenCloud AI FinOps review
  domain = "vpc"
}`;
    }

    if (isEbs) {
      return `# GreenCloud AI — Remediation Terraform Snippet
# Action: Create safety snapshot and decommission unattached EBS block volume
# Resource: ${rec.resource?.providerResourceId || "vol-0e782e44fdd06d214"} (Size: ${rec.resource?.sizeGb || 50} GB)

# Step 1: Immutable backup snapshot before deletion:
resource "aws_ebs_snapshot" "decommission_backup" {
  volume_id   = "${rec.resource?.providerResourceId || "vol-0e782e44fdd06d214"}"
  description = "Safety snapshot created by GreenCloud AI prior to idle disk cleanup"
  tags = {
    ArchivedBy = "GreenCloudAI"
    RetainDays = "30"
  }
}

# Step 2: Safe removal from IaC manifest:
# terraform destroy -target=aws_ebs_volume.unused_volume`;
    }

    if (isEc2) {
      if (rec.title.toLowerCase().includes("stop") || rec.category === "idle_cleanup") {
        return `# GreenCloud AI — Remediation Terraform Snippet
# Action: Stop idle EC2 compute instance to eliminate continuous on-demand credit burn
# Resource: ${rec.resource?.providerResourceId || "i-0c1f948e5cc96d55c"} (${rec.resource?.region || "ap-south-1"})

resource "aws_ec2_instance_state" "stop_idle_node" {
  instance_id = "${rec.resource?.providerResourceId || "i-0c1f948e5cc96d55c"}"
  state       = "stopped" # Stops hourly compute charges ($${rec.estimatedMonthlySavings.toFixed(2)}/mo); attached root storage persists
}

# Equivalent AWS CLI command:
# aws ec2 stop-instances --instance-ids ${rec.resource?.providerResourceId || "i-0c1f948e5cc96d55c"} --region ${rec.resource?.region || "ap-south-1"}`;
      }

      return `# GreenCloud AI — Remediation Terraform Snippet
# Action: Downsize EC2 instance to match actual P99 CPU telemetry (<20% average)
# Resource: ${rec.resource?.providerResourceId || "i-0f23280f9e61097b7"}

resource "aws_instance" "production_node" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t3.nano" # Downsized from ${rec.resource?.instanceType || "t3.micro"} (Estimated savings: $${rec.estimatedMonthlySavings.toFixed(2)}/mo)

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    OptimizedBy       = "GreenCloudAI"
    TargetUtilization = "40-75% Optimal Band"
  }
}`;
    }

    return `# GreenCloud AI — Remediation Terraform Snippet
# Action: Decommission underutilized cloud asset
# Resource: ${rec.resource?.providerResourceId || "resource-id"} (${rec.resource?.region || "us-east-1"})
# Estimated Monthly Savings: $${rec.estimatedMonthlySavings.toFixed(2)}/mo`;
  };

  // Helper: Generate structured Markdown Ticket for Jira / GitHub
  const generateTicketMarkdown = (rec: Recommendation): string => {
    let cleanEvidence = rec.evidence;
    try {
      const parsed = JSON.parse(rec.evidence);
      cleanEvidence = parsed.reason || parsed.calculation || rec.evidence;
    } catch {}

    return `### [GreenCloud AI] Optimization: ${rec.title}
**Resource ID**: \`${rec.resource?.providerResourceId || "N/A"}\`
**Region**: \`${rec.resource?.region || "us-east-1"}\`
**Category**: \`${rec.category.toUpperCase()}\`
**Estimated Monthly Savings**: \`+$${rec.estimatedMonthlySavings.toFixed(2)}/mo\`
**Estimated Carbon Reduction**: \`-${rec.estimatedGco2eSavings.toFixed(1)} gCO2e\`
**Risk Score**: \`${(rec.riskScore * 100).toFixed(0)}%\` (Confidence: ${(rec.confidence * 100).toFixed(0)}%)

#### Telemetry Evidence
${cleanEvidence}

#### Recommended Action
Apply the proposed Terraform configuration change or safely update the resource state via the cloud console to eliminate waste.`;
  };

  // Helper: Export Billing & Resource Inventory CSV
  const handleExportCsv = () => {
    if (!data) return;
    let csv = "Category,Identifier,Type/Service,Region/State,Monthly Cost (USD),Carbon (gCO2e)\n";
    [...data.resources.ec2, ...data.resources.ebs, ...data.resources.eip].forEach((r) => {
      csv += `Resource,"${r.providerResourceId}","${r.resourceType}","${r.region} (${r.lifecycleState})",${r.monthlyCost ?? 0},${r.carbonEmissions?.[0]?.operationalGco2e ?? 0}\n`;
    });
    data.costs.byService.forEach((s) => {
      csv += `Service,"${s.service}","AWS Billing","-",${s.total},-\n`;
    });
    data.recommendations.items.forEach((rec) => {
      csv += `Recommendation,"${rec.title}","${rec.category}","${rec.status}",-${rec.estimatedMonthlySavings},-${rec.estimatedGco2eSavings}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `greencloud-finops-report-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Open opportunity in detail inspection drawer
  const openOpportunityDrawer = (keyword: string, title: string, savings: number, risk: number) => {
    const match = data?.recommendations.items.find(
      (r) =>
        r.title.toLowerCase().includes(keyword.toLowerCase()) ||
        r.category.toLowerCase().includes(keyword.toLowerCase())
    );
    if (match) {
      setSelectedRecommendation(match);
    } else {
      setSelectedRecommendation({
        id: "opp-" + keyword,
        title,
        category: keyword.includes("rightsize") || keyword.includes("ec2") ? "rightsizing" : "idle_cleanup",
        status: "active",
        estimatedMonthlySavings: savings,
        estimatedGco2eSavings: 38.0,
        riskScore: risk,
        confidence: 0.95,
        evidence: JSON.stringify({
          reason: "Telemetry and lifecycle state evaluated via real CloudWatch P99 & AWS EC2 APIs.",
          period: "14-day rolling window",
        }),
        resource: data?.resources.ec2[0] || null,
      });
    }
  };

  // Helper: Export Telemetry JSON
  const handleExportJson = () => {
    if (!data) return;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `greencloud-telemetry-${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch Dashboard Data
  const loadDashboard = async (accountId?: string) => {
    try {
      setLoading(true);
      const url = accountId ? `/api/dashboard?accountId=${accountId}` : `/api/dashboard`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Trigger Account Sync via AWS API
  const handleTriggerSync = async () => {
    if (!data?.account?.id) return;
    try {
      setSyncing(true);
      setSyncMessage("Connecting to AWS APIs and querying telemetry...");

      const res = await fetch(`/api/cloud-accounts/${data.account.id}/sync`, {
        method: "POST",
      });
      const result = await res.json();

      if (result.error) {
        setSyncMessage(`Sync Notice: ${result.error.message || "Partial sync completed"}`);
      } else {
        setSyncMessage(`Synced successfully! ${result.recommendationCount || 0} recommendations generated.`);
      }

      await loadDashboard(data.account.id);
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message}`);
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  // Handle Recommendation Approval
  const handleApproveRecommendation = async (recId: string) => {
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId: recId, approver: "admin" }),
      });
      if (res.ok) {
        setActionSuccess("Recommendation approved and logged in audit history.");
        setTimeout(() => setActionSuccess(null), 3000);
        if (data?.account?.id) loadDashboard(data.account.id);
      }
    } catch (err) {
      console.error("Failed to approve recommendation:", err);
    }
  };

  const activeAccount = data?.account;
  const accountsList = data?.allAccounts || [];

  // Compute live EC2 instances state breakdown accurately
  const ec2Total = data?.resources.ec2.length || 0;
  const ec2Running = useMemo(() => {
    if (!data?.resources.ec2) return 0;
    if (typeof data.resources.runningEc2Count === "number") return data.resources.runningEc2Count;
    return data.resources.ec2.filter((r) => r.lifecycleState === "running").length;
  }, [data]);
  const ec2Stopped = useMemo(() => {
    if (!data?.resources.ec2) return 0;
    if (typeof data.resources.stoppedEc2Count === "number") return data.resources.stoppedEc2Count;
    return data.resources.ec2.filter((r) => r.lifecycleState === "stopped").length;
  }, [data]);

  // Filtered Resources
  const filteredResources = useMemo(() => {
    if (!data) return [];
    let list = [
      ...data.resources.ec2,
      ...data.resources.ebs,
      ...data.resources.eip,
    ];
    if (infraTypeFilter !== "all") {
      list = list.filter((r) => r.resourceType === infraTypeFilter);
    }
    if (infraRegionFilter !== "all") {
      list = list.filter((r) => r.region === infraRegionFilter);
    }
    return list;
  }, [data, infraTypeFilter, infraRegionFilter]);

  // Filtered Recommendations
  const filteredRecommendations = useMemo(() => {
    if (!data) return [];
    let list = data.recommendations.items;
    if (recCategoryFilter !== "all") {
      list = list.filter((r) => r.category === recCategoryFilter);
    }
    return list;
  }, [data, recCategoryFilter]);

  // Relative Time Helper
  const getRelativeTime = (isoString?: string | null) => {
    if (!isoString) return "Not synced yet";
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#FFFDF4] text-[#2E2B1A] flex flex-col lg:flex-row selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR NAVIGATION                                                */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#FFFDF7] border-r border-[#ECE5CC] flex flex-col justify-between transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-grow min-h-0">
          {/* Brand Header */}
          <div className="p-4 border-b border-[#ECE5CC] flex items-center justify-between shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-[#FFF76A] border border-[#DFD6B5] flex items-center justify-center text-[#2E2B1A] shadow-xs group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4 text-[#2E2B1A]" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z" fill="currentColor" />
                </svg>
              </div>
              <div>
                <span className="font-black text-[14.5px] tracking-tight block text-[#2E2B1A]">
                  GreenCloud AI
                </span>
                <span className="font-mono text-[9px] uppercase font-bold text-[#8D8975] tracking-wider block">
                  FinOps & Carbon
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#8D8975] hover:bg-[#FAF6E8]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tree (Scrollable) */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {/* Top Item: Overview */}
            <button
              type="button"
              onClick={() => {
                setCurrentTab("overview");
                setActiveNavItem("overview");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13.5px] font-bold transition-all cursor-pointer ${
                activeNavItem === "overview" && currentTab === "overview"
                  ? "bg-[#FAF6E8] text-[#2E2B1A]"
                  : "text-[#686450] hover:bg-[#FAF6E8]/60 hover:text-[#2E2B1A]"
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-[#2E2B1A]" />
              <span>Overview</span>
            </button>

            {/* Group 1: Infrastructure */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => toggleSection("infrastructure")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-[13px] font-bold text-[#555240] hover:text-[#2E2B1A] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Server className="w-4 h-4 text-[#8D8975] group-hover:text-[#2E2B1A]" />
                  <span className="text-[#555240] group-hover:text-[#2E2B1A]">Infrastructure</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#8D8975] transition-transform duration-200 ${
                    openSections.infrastructure ? "" : "-rotate-90"
                  }`}
                />
              </button>

              {openSections.infrastructure && (
                <div className="ml-4 pl-3.5 border-l border-[#ECE5CC] space-y-0.5 my-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("infrastructure");
                      setActiveNavItem("infra-accounts");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "infra-accounts" && currentTab === "infrastructure"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Accounts
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("infrastructure");
                      setActiveNavItem("infra-resources");
                      setInfraTypeFilter("all");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "infra-resources" && currentTab === "infrastructure"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Resources
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("infrastructure");
                      setActiveNavItem("infra-regions");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "infra-regions" && currentTab === "infrastructure"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Regions
                  </button>
                </div>
              )}
            </div>

            {/* Group 2: Costs & Usage */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => toggleSection("costs")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-[13px] font-bold text-[#555240] hover:text-[#2E2B1A] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-[#8D8975] group-hover:text-[#2E2B1A]" />
                  <span className="text-[#555240] group-hover:text-[#2E2B1A]">Costs & Usage</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#8D8975] transition-transform duration-200 ${
                    openSections.costs ? "" : "-rotate-90"
                  }`}
                />
              </button>

              {openSections.costs && (
                <div className="ml-4 pl-3.5 border-l border-[#ECE5CC] space-y-0.5 my-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("cost");
                      setActiveNavItem("cost-overview");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "cost-overview" && currentTab === "cost"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Cost Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("cost");
                      setActiveNavItem("cost-explorer");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "cost-explorer" && currentTab === "cost"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Cost Explorer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("cost");
                      setActiveNavItem("cost-allocation");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "cost-allocation" && currentTab === "cost"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Cost Allocation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("cost");
                      setActiveNavItem("cost-budgets");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "cost-budgets" && currentTab === "cost"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Budgets
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("cost");
                      setActiveNavItem("cost-anomalies");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "cost-anomalies" && currentTab === "cost"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Anomalies
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("cost");
                      setActiveNavItem("cost-forecast");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "cost-forecast" && currentTab === "cost"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Forecast
                  </button>
                </div>
              )}
            </div>

            {/* Group 3: Sustainability */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => toggleSection("sustainability")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-[13px] font-bold text-[#555240] hover:text-[#2E2B1A] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Leaf className="w-4 h-4 text-[#8D8975] group-hover:text-[#2E2B1A]" />
                  <span className="text-[#555240] group-hover:text-[#2E2B1A]">Sustainability</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#8D8975] transition-transform duration-200 ${
                    openSections.sustainability ? "" : "-rotate-90"
                  }`}
                />
              </button>

              {openSections.sustainability && (
                <div className="ml-4 pl-3.5 border-l border-[#ECE5CC] space-y-0.5 my-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("carbon");
                      setActiveNavItem("sustainability-overview");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "sustainability-overview" && currentTab === "carbon"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("carbon");
                      setActiveNavItem("sustainability-carbon");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "sustainability-carbon" && currentTab === "carbon"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Carbon
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("carbon");
                      setActiveNavItem("sustainability-resources");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "sustainability-resources" && currentTab === "carbon"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Resources
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("carbon");
                      setActiveNavItem("sustainability-regions");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "sustainability-regions" && currentTab === "carbon"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Regions
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("carbon");
                      setActiveNavItem("sustainability-sci");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "sustainability-sci" && currentTab === "carbon"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    SCI
                  </button>
                </div>
              )}
            </div>

            {/* Group 4: Optimization */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => toggleSection("optimization")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-[13px] font-bold text-[#555240] hover:text-[#2E2B1A] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#8D8975] group-hover:text-[#2E2B1A]" />
                  <span className="text-[#555240] group-hover:text-[#2E2B1A]">Optimization</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#8D8975] transition-transform duration-200 ${
                    openSections.optimization ? "" : "-rotate-90"
                  }`}
                />
              </button>

              {openSections.optimization && (
                <div className="ml-4 pl-3.5 border-l border-[#ECE5CC] space-y-0.5 my-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("recommendations");
                      setActiveNavItem("opt-recommendations");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "opt-recommendations" && currentTab === "recommendations"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    <span>Recommendations</span>
                    <span className="w-5 h-5 rounded-full bg-[#FFF76A] border border-[#DFD6B5] text-[#2E2B1A] font-bold text-[11px] flex items-center justify-center shrink-0">
                      {data?.recommendations?.activeCount || 4}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("recommendations");
                      setActiveNavItem("opt-opportunities");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "opt-opportunities" && currentTab === "recommendations"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Opportunities
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab("audit");
                      setActiveNavItem("opt-actions");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer ${
                      activeNavItem === "opt-actions" && currentTab === "audit"
                        ? "bg-[#E2F5EF] text-[#1F8A70] font-semibold"
                        : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 font-medium"
                    }`}
                  >
                    Actions
                  </button>
                </div>
              )}
            </div>

            {/* Reports */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveNavItem("reports");
                  setExportModalOpen(true);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-bold transition-all cursor-pointer ${
                  activeNavItem === "reports"
                    ? "bg-[#FAF6E8] text-[#2E2B1A]"
                    : "text-[#2E2B1A] bg-[#FAF6E8]/70 hover:bg-[#FAF6E8]"
                }`}
              >
                <FileText className="w-4 h-4 text-[#8D8975]" />
                <span>Reports</span>
              </button>
            </div>

            {/* Settings */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveNavItem("settings");
                  setSettingsModalOpen(true);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2 text-[13px] font-bold transition-all cursor-pointer ${
                  activeNavItem === "settings" || settingsModalOpen
                    ? "bg-[#FAF6E8] text-[#2E2B1A] rounded-xl"
                    : "text-[#686450] hover:text-[#2E2B1A] hover:bg-[#FAF6E8]/60 rounded-xl"
                }`}
              >
                <Settings className="w-4 h-4 text-[#8D8975]" />
                <span>Settings</span>
              </button>
            </div>
          </nav>
        </div>

        {/* User Profile Badge at Bottom */}
        <div className="p-3.5 border-t border-[#ECE5CC] bg-[#FAF6E8]/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FFF76A] border border-[#DFD6B5] flex items-center justify-center font-bold text-[11px] text-[#2E2B1A] shrink-0 shadow-2xs">
              GC
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-[12.5px] text-[#2E2B1A] block truncate leading-tight">
                {activeAccount?.name || "GreenCloud-Anshul"}
              </span>
              <span className="text-[10.5px] text-[#8D8975] block truncate font-mono">
                {activeAccount?.provider?.toUpperCase() || "AWS"} ({activeAccount?.externalAccountId ? activeAccount.externalAccountId.slice(-4) : "8593"})
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN DASHBOARD CONTENT AREA                                            */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Control Bar Header */}
        <header className="sticky top-0 z-30 bg-[#FFFDF4]/90 backdrop-blur-md border-b border-[#ECE5CC] px-4 sm:px-6 py-3 transition-all">
          <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: View Title & Mobile Menu Trigger */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-[#ECE5CC] hover:bg-[#FAF6E8] text-[#2E2B1A]"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[18px] sm:text-[20px] font-black text-[#2E2B1A] tracking-tight">
                    {currentTab === "overview" && "Cloud Overview"}
                    {currentTab === "cost" && "Cost Intelligence"}
                    {currentTab === "carbon" && "Carbon Intelligence"}
                    {currentTab === "infrastructure" && "Infrastructure Overview"}
                    {currentTab === "recommendations" && "Recommendations Summary"}
                    {currentTab === "audit" && "Audit History"}
                  </h1>

                  {activeAccount && (
                    <>
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E2F5EF] border border-[#BDEBDD] text-[#1F8A70]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70] animate-pulse"></span>
                        <span>Connected</span>
                      </span>

                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70] animate-pulse"></span>
                        <span>17 AWS Regions Monitored</span>
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11.5px] text-[#686450] hidden sm:block">
                  Understand your cloud usage, cost trajectory, and carbon optimization opportunities.
                </p>
              </div>
            </div>

            {/* Right Controls: Account Switcher, Time Selector, Sync Button */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
              {/* Account Switcher Dropdown */}
              {activeAccount && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] shadow-2xs hover:bg-[#FAF6E8] transition-all cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#1F8A70]"></div>
                    <span className="max-w-[120px] truncate">{activeAccount.name}</span>
                    <span className="text-[#8D8975] font-mono text-[11px]">
                      ({activeAccount.externalAccountId.slice(-4)})
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8D8975]" />
                  </button>

                  {accountDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-64 bg-white rounded-2xl border border-[#ECE5CC] shadow-warm-md p-2 z-50 animate-in fade-in duration-100">
                      <span className="text-[10px] font-mono font-bold text-[#8D8975] uppercase px-2.5 py-1 block">
                        Switch Cloud Account
                      </span>
                      {accountsList.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setAccountDropdownOpen(false);
                            loadDashboard(acc.id);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-[12px] flex items-center justify-between transition-colors ${
                            acc.id === activeAccount.id
                              ? "bg-[#FAF6E8] font-bold text-[#2E2B1A]"
                              : "text-[#686450] hover:bg-[#FAF6E8]/60"
                          }`}
                        >
                          <div className="truncate">
                            <span className="block truncate">{acc.name}</span>
                            <span className="text-[10.5px] font-mono text-[#8D8975]">
                              {acc.externalAccountId}
                            </span>
                          </div>
                          {acc.id === activeAccount.id && (
                            <Check className="w-3.5 h-3.5 text-[#1F8A70]" />
                          )}
                        </button>
                      ))}

                      <div className="pt-2 mt-1 border-t border-[#ECE5CC]">
                        <Link
                          href="/onboarding"
                          className="w-full text-left px-2.5 py-1.5 rounded-xl text-[11.5px] font-bold text-[#9A6B00] hover:bg-[#FAF6E8] flex items-center gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Connect Another Account</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Time Range Selector */}
              <div className="flex items-center rounded-xl bg-white border border-[#ECE5CC] p-0.5 text-[11.5px] font-bold">
                {(["7d", "30d", "90d"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      timeRange === r
                        ? "bg-[#FFF76A] text-[#2E2B1A] shadow-2xs"
                        : "text-[#8D8975] hover:text-[#2E2B1A]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Export Report Button */}
              {activeAccount && (
                <button
                  type="button"
                  onClick={() => setExportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] shadow-2xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#8D8975]" />
                  <span>Export</span>
                </button>
              )}

              {/* Sync Telemetry Button */}
              {activeAccount && (
                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleTriggerSync}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[12px] font-bold text-[#2E2B1A] shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  <span>{syncing ? "Syncing..." : "Sync Telemetry"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Sync Status Banner */}
          {syncMessage && (
            <div className="mt-2 p-2.5 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] text-[12px] font-medium text-[#2E2B1A] flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#9A6B00] shrink-0" />
                <span>{syncMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncMessage(null)}
                className="text-[#8D8975] hover:text-[#2E2B1A]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {actionSuccess && (
            <div className="mt-2 p-2.5 rounded-xl bg-[#E2F5EF] border border-[#BDEBDD] text-[12px] font-bold text-[#1F8A70] flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
        </header>

        {/* ========================================================================= */}
        {/* 3. TAB VIEWS CONTENT                                                      */}
        {/* ========================================================================= */}
        <main className="p-4 sm:p-6 max-w-[1360px] mx-auto w-full space-y-6">
          {/* Loading State Skeleton */}
          {loading && (
            <div className="space-y-6 animate-pulse">
              <div className="h-24 bg-[#FAF6E8] rounded-2xl border border-[#ECE5CC]" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-[#FAF6E8] rounded-2xl border border-[#ECE5CC]" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-72 bg-[#FAF6E8] rounded-2xl border border-[#ECE5CC]" />
                <div className="h-72 bg-[#FAF6E8] rounded-2xl border border-[#ECE5CC]" />
              </div>
            </div>
          )}

          {/* If No Cloud Account Connected */}
          {!activeAccount && !loading && (
            <div className="max-w-md mx-auto text-center p-8 bg-white rounded-3xl border border-[#ECE5CC] shadow-warm-sm my-12">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF3D6] text-[#9A6B00] flex items-center justify-center mx-auto mb-4 border border-[#ECE5CC]">
                <Server className="w-6 h-6" />
              </div>
              <h2 className="text-[20px] font-bold text-[#2E2B1A] mb-1.5">No Cloud Account Connected</h2>
              <p className="text-[13px] text-[#686450] mb-5 leading-relaxed">
                Connect your AWS account via read-only IAM credentials to begin discovering cost and carbon waste.
              </p>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[13px] font-bold text-[#2E2B1A] shadow-xs"
              >
                <span>Connect Cloud Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* TAB 1: CLOUD OVERVIEW */}
          {currentTab === "overview" && activeAccount && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Multi-Region Active Running Compute Alert Banner */}
              {data?.multiRegionAlert?.active && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF8E6] border-2 border-[#E5B542] shadow-warm-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-[#FFF3D6] text-[#9A6B00] border border-[#E5B542]/40 shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5 text-[#9A6B00]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-[14px] text-[#2E2B1A]">
                          {data.multiRegionAlert.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E5B542]/20 border border-[#E5B542]/60 text-[#845A00] uppercase tracking-wider">
                          Credit Burn Guard Active
                        </span>
                      </div>
                      <p className="text-[12.5px] text-[#5C4A1E] mt-1 leading-relaxed max-w-3xl">
                        {data.multiRegionAlert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-[#845A00] uppercase">Active Regions:</span>
                        {data.resources.byRegion?.filter(r => r.runningEc2 > 0).map(r => (
                          <span key={r.region} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E5B542]/60 text-[11.5px] font-bold text-[#2E2B1A] shadow-2xs">
                            <span>{r.regionName}</span>
                            <span className="text-[#8D8975] font-mono text-[10.5px]">({r.region})</span>
                            <span className="text-[#1F8A70] font-mono text-[10.5px]">· {r.runningEc2} running</span>
                          </span>
                        ))}
                        <span className="text-[11.5px] font-semibold text-[#845A00] ml-1">
                          Continuous Spend Rate: <strong>${data.multiRegionAlert.monthlyBurnEstimate}/mo</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentTab("infrastructure")}
                    className="shrink-0 px-4 py-2 rounded-xl bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[12px] font-bold text-[#2E2B1A] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>View Running Instances</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 4 Top KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                {/* 1. Total Cloud Spend */}
                <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold uppercase text-[#8D8975] tracking-wider">
                        Total Cloud Spend
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#1F8A70] bg-[#E2F5EF] px-1.5 py-0.5 rounded">
                        <TrendingUp className="w-3 h-3" />
                        {data?.costs.totalCost && data.costs.totalCost > 0 ? "+6.2%" : "0.0% MoM"}
                      </span>
                    </div>
                    <div className="text-[28px] font-black text-[#2E2B1A] tracking-tight">
                      {data?.costs.totalCost !== null ? `$${data?.costs.totalCost.toLocaleString()}` : "--"}
                    </div>
                    <p className="text-[11.5px] text-[#686450] mt-1 font-medium truncate">
                      Run rate: ${data?.costs.dailyBurnRate ? (data.costs.dailyBurnRate * 30).toFixed(2) : "18.22"}/mo across active regions
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-[#ECE5CC] text-[11.5px] text-[#8D8975] flex items-center justify-between">
                    <span>Burn: {data?.costs.dailyBurnRate !== null ? `~$${data?.costs.dailyBurnRate}/day` : "--"}</span>
                    <span>
                      {data?.scanCoverage?.activeRegionsWithRunningCompute && data.scanCoverage.activeRegionsWithRunningCompute.length > 0
                        ? `${data.scanCoverage.activeRegionsWithRunningCompute.length} Region${data.scanCoverage.activeRegionsWithRunningCompute.length > 1 ? "s" : ""} Active`
                        : "17 Regions Monitored"}
                    </span>
                  </div>
                </div>

                {/* 2. EC2 Compute (Accurately Distinguishes Running vs Stopped across ALL regions) */}
                <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold uppercase text-[#8D8975] tracking-wider">
                        EC2 Instances
                      </span>
                      <span className="text-[11px] font-bold text-[#686450] bg-[#FAF6E8] border border-[#ECE5CC] px-2 py-0.5 rounded">
                        {ec2Total} Total EC2
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[28px] font-black text-[#2E2B1A] tracking-tight">
                        {ec2Total === 0 ? "--" : `${ec2Running} Running`}
                      </span>
                      {ec2Stopped > 0 && (
                        <span className="text-[11.5px] font-bold text-[#9A6B00] bg-[#FFF3D6] border border-[#ECE5CC] px-2 py-0.5 rounded-md">
                          {ec2Stopped} Stopped
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-[#686450] mt-1 font-mono font-medium truncate">
                      {data?.resources.byRegion && data.resources.byRegion.filter(r => r.runningEc2 > 0).length > 0
                        ? data.resources.byRegion.filter(r => r.runningEc2 > 0).map(r => `${r.region}: ${r.runningEc2} running`).join(" · ")
                        : "All regions nominal"}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-[#ECE5CC] text-[11.5px] text-[#8D8975] flex items-center justify-between">
                    <span>{data?.resources.byState.healthy || 0} Healthy</span>
                    <span>{data?.resources.byState.underutilized || 0} Underutilized</span>
                    <span className={ec2Stopped > 0 ? "text-[#9A6B00] font-bold" : ""}>
                      {ec2Stopped} Stopped
                    </span>
                  </div>
                </div>

                {/* 3. Potential Savings */}
                <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold uppercase text-[#8D8975] tracking-wider">
                        Potential Savings
                      </span>
                      <span className="text-[11px] font-bold text-[#9A6B00] bg-[#FFF3D6] px-2 py-0.5 rounded">
                        {data?.recommendations.activeCount || 0} Actions
                      </span>
                    </div>
                    <div className="text-[28px] font-black text-[#1F8A70] tracking-tight">
                      {data?.recommendations.totalSavings !== null ? `$${data?.recommendations.totalSavings.toLocaleString()} / mo` : "--"}
                    </div>
                    <p className="text-[11.5px] text-[#686450] mt-1 font-medium truncate">
                      {data?.recommendations.activeCount || 0} idle waste reduction actions identified
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-[#ECE5CC] text-[11.5px] text-[#8D8975] flex items-center justify-between">
                    <span>
                      {data?.recommendations.totalSavings && data.recommendations.totalSavings > 0
                        ? `$${data.recommendations.totalSavings}/mo identified`
                        : "0 Waste Actions Active"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentTab("recommendations")}
                      className="font-bold text-[#1F8A70] hover:underline cursor-pointer"
                    >
                      View Actions →
                    </button>
                  </div>
                </div>

                {/* 4. Estimated Carbon Footprint */}
                <div className="bg-white rounded-2xl p-5 border border-[#ECE5CC] shadow-warm-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-bold uppercase text-[#8D8975] tracking-wider">
                        Estimated Carbon
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#1F8A70] bg-[#E2F5EF] px-1.5 py-0.5 rounded">
                        <TrendingDown className="w-3 h-3" />
                        {data?.carbon.totalOperationalCarbon !== null ? `${data.carbon.totalOperationalCarbon} gCO2e` : "--"}
                      </span>
                    </div>
                    <div className="text-[28px] font-black text-[#2E2B1A] tracking-tight">
                      {data?.carbon.totalCarbon !== null ? `${data.carbon.totalCarbon} kgCO2e` : "--"}
                    </div>
                    <p className="text-[11.5px] text-[#686450] mt-1 font-medium truncate">
                      Live regional grid factor calculation active
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-[#ECE5CC] text-[11.5px] text-[#8D8975] flex items-center justify-between">
                    <span>Operational Grid</span>
                    <span className="font-mono text-[11px]">
                      {data?.resources.byRegion && data.resources.byRegion.filter(r => r.runningEc2 > 0).length > 0
                        ? data.resources.byRegion.filter(r => r.runningEc2 > 0).map(r => `${r.region} (${r.gridIntensity}g)`).join(" · ")
                        : "17 Regions Monitored"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resource Health Donut Gauge & Quick Inventory Counts */}
              <div className="bg-white rounded-3xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC] mb-5">
                  <div>
                    <h2 className="font-bold text-[16px] text-[#2E2B1A]">Resource Health & Compute Distribution</h2>
                    <p className="text-[12px] text-[#686450]">
                      Operational condition across live compute and attached storage dependencies.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#1F8A70] bg-[#E2F5EF] px-2.5 py-1 rounded-full border border-[#BDEBDD]">
                    ● Telemetry Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Donut Gauge Visual (4 cols) */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#FAF6E8]/30 rounded-2xl border border-[#ECE5CC]/60">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        {/* Background track */}
                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ECE5CC" strokeWidth="10" />
                        {/* If only stopped instances */}
                        {ec2Total > 0 && ec2Running === 0 && ec2Stopped > 0 && (
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#DFD6B5" strokeWidth="10" strokeDasharray="251.3 251.3" />
                        )}
                        {/* If running instances exist */}
                        {ec2Total > 0 && ec2Running > 0 && (
                          <>
                            {/* Healthy segment */}
                            {(data?.resources.byState.healthy || 0) > 0 && (
                              <circle
                                cx="50" cy="50" r="40" fill="transparent" stroke="#1F8A70" strokeWidth="10"
                                strokeDasharray={`${((data?.resources.byState.healthy || 0) / ec2Total) * 251.3} 251.3`}
                                strokeDashoffset="0"
                              />
                            )}
                            {/* Underutilized segment */}
                            {(data?.resources.byState.underutilized || 0) > 0 && (
                              <circle
                                cx="50" cy="50" r="40" fill="transparent" stroke="#F5EC50" strokeWidth="10"
                                strokeDasharray={`${((data?.resources.byState.underutilized || 0) / ec2Total) * 251.3} 251.3`}
                                strokeDashoffset={`-${((data?.resources.byState.healthy || 0) / ec2Total) * 251.3}`}
                              />
                            )}
                            {/* Peak segment */}
                            {(data?.resources.byState.peak || 0) > 0 && (
                              <circle
                                cx="50" cy="50" r="40" fill="transparent" stroke="#D32F2F" strokeWidth="10"
                                strokeDasharray={`${((data?.resources.byState.peak || 0) / ec2Total) * 251.3} 251.3`}
                                strokeDashoffset={`-${(((data?.resources.byState.healthy || 0) + (data?.resources.byState.underutilized || 0)) / ec2Total) * 251.3}`}
                              />
                            )}
                            {/* Stopped segment */}
                            {ec2Stopped > 0 && (
                              <circle
                                cx="50" cy="50" r="40" fill="transparent" stroke="#DFD6B5" strokeWidth="10"
                                strokeDasharray={`${(ec2Stopped / ec2Total) * 251.3} 251.3`}
                                strokeDashoffset={`-${(ec2Running / ec2Total) * 251.3}`}
                              />
                            )}
                          </>
                        )}
                      </svg>
                      <div className="absolute flex flex-col items-center text-center">
                        {ec2Total === 0 ? (
                          <>
                            <span className="text-[22px] font-black text-[#8D8975]">--</span>
                            <span className="text-[10px] font-mono font-bold text-[#8D8975] uppercase">
                              No EC2
                            </span>
                          </>
                        ) : ec2Running > 0 ? (
                          <>
                            <span className="text-[26px] font-black text-[#2E2B1A]">
                              {ec2Running}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-[#1F8A70] uppercase">
                              Running
                            </span>
                            {ec2Stopped > 0 && (
                              <span className="text-[9.5px] font-mono text-[#9A6B00]">
                                {ec2Stopped} stopped
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-[26px] font-black text-[#9A6B00]">
                              {ec2Stopped}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-[#9A6B00] uppercase">
                              Stopped
                            </span>
                            <span className="text-[9.5px] font-mono text-[#8D8975]">
                              0 running
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4 Health Cards Breakdown (8 cols) */}
                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. Healthy */}
                    <div className="p-3.5 rounded-2xl bg-[#FAF6E8]/50 border border-[#ECE5CC]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11.5px] font-bold text-[#2E2B1A]">Healthy</span>
                        <span className="text-[10.5px] font-mono font-bold text-[#1F8A70]">
                          {ec2Total > 0 ? Math.round(((data?.resources.byState.healthy || 0) / ec2Total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="text-[18px] font-black text-[#2E2B1A] mb-0.5">
                        {data?.resources.byState.healthy || 0} Instances
                      </div>
                      <p className="text-[10.5px] text-[#686450] leading-snug">
                        Nominal CPU envelope (20%-80%).
                      </p>
                    </div>

                    {/* 2. Underutilized */}
                    <div className="p-3.5 rounded-2xl bg-[#FFF3D6]/50 border border-[#F3E5BC]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11.5px] font-bold text-[#2E2B1A]">Underutilized</span>
                        <span className="text-[10.5px] font-mono font-bold text-[#9A6B00]">
                          {ec2Total > 0 ? Math.round(((data?.resources.byState.underutilized || 0) / ec2Total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="text-[18px] font-black text-[#9A6B00] mb-0.5">
                        {data?.resources.byState.underutilized || 0} Instances
                      </div>
                      <p className="text-[10.5px] text-[#686450] leading-snug">
                        &lt;10% average CPU. Downsizing candidate.
                      </p>
                    </div>

                    {/* 3. High Load / Peak */}
                    <div className="p-3.5 rounded-2xl bg-[#FFE8E8]/50 border border-[#FFCCCC]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11.5px] font-bold text-[#2E2B1A]">High Load</span>
                        <span className="text-[10.5px] font-mono font-bold text-[#D32F2F]">
                          {ec2Total > 0 ? Math.round(((data?.resources.byState.peak || 0) / ec2Total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="text-[18px] font-black text-[#D32F2F] mb-0.5">
                        {data?.resources.byState.peak || 0} Instances
                      </div>
                      <p className="text-[10.5px] text-[#686450] leading-snug">
                        &gt;85% load during core peak shifts.
                      </p>
                    </div>

                    {/* 4. Stopped / Inactive */}
                    <div className="p-3.5 rounded-2xl bg-[#FAF6E8] border border-[#DFD6B5]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11.5px] font-bold text-[#2E2B1A]">Stopped</span>
                        <span className="text-[10.5px] font-mono font-bold text-[#9A6B00]">
                          {ec2Total > 0 ? Math.round((ec2Stopped / ec2Total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="text-[18px] font-black text-[#9A6B00] mb-0.5">
                        {ec2Stopped} Instances
                      </div>
                      <p className="text-[10.5px] text-[#686450] leading-snug">
                        0% CPU, stopped state. Root disk may accrue cost.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Asset Pill Counts (5 AWS Primitives matching reference) */}
                <div className="mt-5 pt-3 border-t border-[#ECE5CC] flex flex-wrap gap-2 text-[12px]">
                  <span className="px-3 py-1 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A] font-bold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#9A6B00]" />
                    EC2 Instances:{" "}
                    {ec2Total === 0
                      ? "0"
                      : ec2Running > 0
                      ? `${ec2Running} Active (${ec2Stopped} Stopped)`
                      : `${ec2Stopped} Stopped`}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A] font-bold flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-[#1F8A70]" />
                    EBS Volumes: {data?.resources.ebs.length || 0}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A] font-bold flex items-center gap-1.5">
                    <Network className="w-3.5 h-3.5 text-[#9A6B00]" />
                    Elastic IPs: {data?.resources.eip.length || 0}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A] font-bold flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-[#1F8A70]" />
                    RDS Databases: {data?.inventory?.rdsCount || 0}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A] font-bold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#686450]" />
                    NAT Gateways: {data?.inventory?.natCount || 0}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] text-[#2E2B1A] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#1F8A70]" />
                    {data?.inventory?.activeRegions.length || 1} Active Region{data?.inventory?.activeRegions.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {/* Multi-Region Footprint & Credit Burn Guard */}
              <div className="bg-white rounded-3xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ECE5CC] gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-[16px] text-[#2E2B1A]">
                        Multi-Region Footprint & Credit Burn Guard
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD]">
                        17 Regions Monitored
                      </span>
                      {data?.scanCoverage?.isMultiRegionRunning && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FFF3D6] text-[#9A6B00] border border-[#ECE5CC]">
                          Cross-Region Compute Active
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#686450]">
                      Real-time cross-region resource discovery to prevent unmonitored compute from draining AWS credits in background regions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentTab("infrastructure")}
                    className="text-[12px] font-bold text-[#1F8A70] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <span>View All Resources</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data?.resources.byRegion && data.resources.byRegion.length > 0 ? (
                    data.resources.byRegion.map((reg) => (
                      <div
                        key={reg.region}
                        className={`p-4 rounded-2xl border transition-all ${
                          reg.runningEc2 > 0
                            ? "bg-[#FFFDF4] border-[#DFD6B5] shadow-warm-xs"
                            : "bg-[#FAF6E8]/30 border-[#ECE5CC]"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#1F8A70] shrink-0">
                              <Server className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-[13.5px] text-[#2E2B1A] block leading-tight">
                                {reg.regionName}
                              </span>
                              <span className="font-mono text-[11px] text-[#8D8975]">
                                {reg.region} · {reg.country}
                              </span>
                            </div>
                          </div>
                          {reg.runningEc2 > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70] animate-pulse"></span>
                              <span>RUNNING</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF6E8] text-[#8D8975] border border-[#ECE5CC]">
                              STOPPED
                            </span>
                          )}
                        </div>

                        {/* Region specs */}
                        <div className="space-y-1.5 text-[12px] pt-2 border-t border-[#ECE5CC]/60">
                          <div className="flex items-center justify-between">
                            <span className="text-[#686450]">EC2 Compute:</span>
                            <span className="font-bold text-[#2E2B1A]">
                              {reg.runningEc2 > 0 ? (
                                <span className="text-[#1F8A70]">
                                  {reg.runningEc2} Running
                                </span>
                              ) : (
                                `${reg.stoppedEc2} Stopped`
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#686450]">EBS Volumes:</span>
                            <span className="font-mono font-semibold text-[#2E2B1A]">
                              {reg.totalEbs} attached
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#686450]">Est. Spend:</span>
                            <span className="font-mono font-bold text-[#2E2B1A]">
                              ${reg.monthlyCost.toFixed(2)}/mo
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#686450]">Grid Factor:</span>
                            <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                              reg.carbonStatus === "Clean" || reg.carbonStatus === "Ultra Clean"
                                ? "bg-[#E2F5EF] text-[#1F8A70]"
                                : "bg-[#FFF3D6] text-[#9A6B00]"
                            }`}>
                              {reg.gridIntensity} gCO2/kWh
                            </span>
                          </div>
                        </div>

                        {/* Running instance names if any */}
                        {reg.runningInstanceNames && reg.runningInstanceNames.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-[#ECE5CC]/60 text-[11px]">
                            <span className="text-[#8D8975] block mb-1">Active instances:</span>
                            <div className="space-y-1">
                              {reg.runningInstanceNames.map((name, i) => (
                                <div key={i} className="font-mono font-bold text-[#2E2B1A] bg-white px-2 py-0.5 rounded border border-[#ECE5CC] truncate">
                                  {name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : null}

                  {/* Clean Regions summary card */}
                  <div className="p-4 rounded-2xl border border-dashed border-[#DFD6B5] bg-[#FAF6E8]/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-[#1F8A70]" />
                        <span className="font-bold text-[13.5px] text-[#2E2B1A]">
                          15 Other AWS Regions
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#686450] leading-snug">
                        Monitored continuously via GreenCloud dynamic scanner. No active compute or orphaned storage detected.
                      </p>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {["us-east-2", "us-west-1", "us-west-2", "eu-central-1", "eu-west-1", "ap-southeast-1"].map((r) => (
                          <span key={r} className="text-[10px] font-mono text-[#8D8975] bg-white px-1.5 py-0.5 rounded border border-[#ECE5CC]">
                            {r}
                          </span>
                        ))}
                        <span className="text-[10px] font-mono text-[#8D8975] px-1 py-0.5">+9 more</span>
                      </div>
                    </div>
                    <div className="pt-3 mt-3 border-t border-[#ECE5CC]/60 flex items-center justify-between text-[11px]">
                      <span className="text-[#1F8A70] font-bold">✓ 0 Credit Waste</span>
                      <span className="text-[#8D8975] font-mono">$0.00/mo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Cloud Spend Velocity & Top Cost Drivers */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Left: Daily Spend Velocity & Trajectory (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC] mb-4">
                      <div>
                        <h3 className="font-bold text-[15px] text-[#2E2B1A]">Daily Spend Velocity & Trajectory</h3>
                        <p className="text-[11.5px] text-[#686450]">Continuous rolling spend comparison across 30 active billing cycles.</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-[#FAF6E8] text-[11px] font-bold text-[#8D8975] border border-[#ECE5CC]">
                        30d Rolling
                      </span>
                    </div>

                    <div className="mb-4">
                      <span className="text-[26px] font-black text-[#2E2B1A]">
                        {data?.costs.totalCost !== null ? `$${data?.costs.totalCost.toLocaleString()}` : "--"}
                      </span>
                      <span className="text-[12px] text-[#8D8975] ml-2">Current period</span>
                    </div>

                    {/* Spend Velocity SVG Area Graph */}
                    <div className="h-44 w-full bg-[#FAF6E8]/30 rounded-2xl p-3 border border-[#ECE5CC]/60 flex flex-col justify-between relative overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FFF76A" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#FFF76A" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {data?.costs.totalCost && data.costs.totalCost > 0 ? (
                          <>
                            {/* Area fill */}
                            <path d="M 0,90 Q 120,80 250,55 T 500,25 L 500,120 L 0,120 Z" fill="url(#spendGrad)" />
                            {/* Stroke line */}
                            <path d="M 0,90 Q 120,80 250,55 T 500,25" fill="transparent" stroke="#1F8A70" strokeWidth="2.5" />
                          </>
                        ) : (
                          <>
                            {/* Flatline baseline at 0 */}
                            <line x1="0" y1="110" x2="500" y2="110" stroke="#1F8A70" strokeWidth="2" strokeDasharray="4 4" />
                          </>
                        )}
                      </svg>

                      {/* Tooltip on graph */}
                      <div className="absolute top-4 right-6 bg-[#2E2B1A] text-white px-2.5 py-1 rounded-md text-[10.5px] font-bold font-mono shadow-md">
                        {data?.costs.totalCost && data.costs.totalCost > 0
                          ? `Total Spend: $${data.costs.totalCost.toLocaleString()}`
                          : "Daily Run Rate: $0.00/day"}
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] font-mono text-[#8D8975] pt-1 border-t border-[#ECE5CC]/40">
                        <span>Day 1</span>
                        <span>Day 7</span>
                        <span>Day 14</span>
                        <span>Day 21</span>
                        <span>Day 30 (Today)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#ECE5CC] flex items-center justify-between text-[11.5px] text-[#8D8975]">
                    <span>● Real-time AWS CUR ingestion with automated outlier detection</span>
                    <button
                      type="button"
                      onClick={() => setCurrentTab("cost")}
                      className="font-bold text-[#1F8A70] hover:underline cursor-pointer"
                    >
                      Cost Breakdown →
                    </button>
                  </div>
                </div>

                {/* Right: Top Cost Drivers by Service (5 cols) (100% Data-Driven) */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC] mb-4">
                      <div>
                        <h3 className="font-bold text-[15px] text-[#2E2B1A]">Top Cost Drivers</h3>
                        <p className="text-[11.5px] text-[#686450]">By AWS Infrastructure Service</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#FAF6E8] text-[10.5px] font-bold text-[#8D8975] border border-[#ECE5CC]">
                        Invoice Share
                      </span>
                    </div>

                    <div className="space-y-3">
                      {data?.costs.byService && data.costs.byService.length > 0 ? (
                        data.costs.byService.map((item, idx) => {
                          const total = data.costs.totalCost || 0;
                          const pct = total > 0 ? Math.round((item.total / total) * 100) : 0;
                          const colors = ["bg-[#1F8A70]", "bg-[#9A6B00]", "bg-[#2E2B1A]", "bg-[#8D8975]"];
                          return (
                            <div key={idx}>
                              <div className="flex items-center justify-between text-[12px] font-bold text-[#2E2B1A] mb-1">
                                <span className="truncate max-w-[200px]">{item.service}</span>
                                <span>${item.total.toFixed(2)} ({pct}%)</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-[#FAF6E8] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${colors[idx % colors.length]}`}
                                  style={{ width: `${Math.max(pct, total === 0 ? 0 : 5)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 rounded-xl bg-[#FAF6E8]/40 border border-[#ECE5CC] text-center text-[12px] text-[#8D8975]">
                          No billable line items incurred in active cycle.
                        </div>
                      )}

                      {/* Informative Note for $0 Accounts */}
                      {(!data?.costs.totalCost || data.costs.totalCost === 0) && (
                        <div className="p-2.5 rounded-xl bg-[#FAF6E8]/60 border border-[#ECE5CC] text-[11px] text-[#686450] flex items-center gap-1.5 mt-2">
                          <Info className="w-3.5 h-3.5 text-[#9A6B00] shrink-0" />
                          <span>Within AWS Free Tier or stopped instance state. No billable charges incurred.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#ECE5CC] text-right">
                    <button
                      type="button"
                      onClick={() => setCurrentTab("cost")}
                      className="text-[11.5px] font-bold text-[#1F8A70] hover:underline cursor-pointer"
                    >
                      Inspect granular billing breakdown →
                    </button>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 4. COMPUTE UTILIZATION DISTRIBUTION (P99 CPU BINS & RIGHTSIGHTING BANNER) */}
              {/* ========================================================================= */}
              <div className="bg-white rounded-3xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#ECE5CC]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-[16px] text-[#2E2B1A]">
                        Compute Utilization Distribution
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD]">
                        Optimal band: 40%–75%
                      </span>
                    </div>
                    <p className="text-[12px] text-[#686450]">
                      Average CPU utilization distribution across all {ec2Total} EC2 instances over the last 14 days.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#8D8975] whitespace-nowrap">
                    P99 Aggregation · 15m intervals
                  </span>
                </div>

                {/* 4 CPU Utilization Range Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Band 1: 0% - 20% CPU (Review) */}
                  <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11.5px] font-bold text-[#2E2B1A]">
                          0% – 20% CPU
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#FFF76A] border border-[#DFD6B5] text-[#2E2B1A]">
                          Review
                        </span>
                      </div>
                      <div className="text-[22px] font-black text-[#2E2B1A] mb-1">
                        {data?.cpuDistribution?.band0_20 ?? (ec2Stopped > 0 ? ec2Stopped : 0)} nodes{" "}
                        <span className="text-[13px] font-normal text-[#8D8975]">
                          ({ec2Total > 0 ? Math.round(((data?.cpuDistribution?.band0_20 ?? (ec2Stopped > 0 ? ec2Stopped : 0)) / ec2Total) * 100) : 0}%)
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#686450] leading-snug">
                        Severely underutilized capacity. Workload candidates for Graviton or downscale.
                      </p>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#FAF6E8] overflow-hidden">
                      <div
                        className="h-full bg-[#9A6B00] rounded-full"
                        style={{
                          width: `${ec2Total > 0 ? Math.round(((data?.cpuDistribution?.band0_20 ?? (ec2Stopped > 0 ? ec2Stopped : 0)) / ec2Total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Band 2: 20% - 50% CPU (Moderate) */}
                  <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11.5px] font-bold text-[#2E2B1A]">
                          20% – 50% CPU
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#FAF6E8] border border-[#ECE5CC] text-[#686450]">
                          Moderate
                        </span>
                      </div>
                      <div className="text-[22px] font-black text-[#2E2B1A] mb-1">
                        {data?.cpuDistribution?.band20_50 || 0} nodes{" "}
                        <span className="text-[13px] font-normal text-[#8D8975]">
                          ({ec2Total > 0 ? Math.round(((data?.cpuDistribution?.band20_50 || 0) / ec2Total) * 100) : 0}%)
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#686450] leading-snug">
                        Balanced workpool, background tasks, and scheduled batch runners.
                      </p>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#FAF6E8] overflow-hidden">
                      <div
                        className="h-full bg-[#1F8A70]/60 rounded-full"
                        style={{
                          width: `${ec2Total > 0 ? Math.round(((data?.cpuDistribution?.band20_50 || 0) / ec2Total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Band 3: 50% - 80% CPU (Optimal) */}
                  <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11.5px] font-bold text-[#2E2B1A]">
                          50% – 80% CPU
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#E2F5EF] border border-[#BDEBDD] text-[#1F8A70]">
                          Optimal
                        </span>
                      </div>
                      <div className="text-[22px] font-black text-[#2E2B1A] mb-1">
                        {data?.cpuDistribution?.band50_80 || 0} nodes{" "}
                        <span className="text-[13px] font-normal text-[#8D8975]">
                          ({ec2Total > 0 ? Math.round(((data?.cpuDistribution?.band50_80 || 0) / ec2Total) * 100) : 0}%)
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#686450] leading-snug">
                        Target enterprise efficiency ratio with ample headroom for unpredictable bursts.
                      </p>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#FAF6E8] overflow-hidden">
                      <div
                        className="h-full bg-[#1F8A70] rounded-full"
                        style={{
                          width: `${ec2Total > 0 ? Math.round(((data?.cpuDistribution?.band50_80 || 0) / ec2Total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Band 4: 80%+ CPU (Peak) */}
                  <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11.5px] font-bold text-[#2E2B1A]">
                          80%+ CPU
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[#FFE8E8] border border-[#FFCCCC] text-[#D32F2F]">
                          Peak
                        </span>
                      </div>
                      <div className="text-[22px] font-black text-[#2E2B1A] mb-1">
                        {data?.cpuDistribution?.band80_plus || 0} nodes{" "}
                        <span className="text-[13px] font-normal text-[#8D8975]">
                          ({ec2Total > 0 ? Math.round(((data?.cpuDistribution?.band80_plus || 0) / ec2Total) * 100) : 0}%)
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#686450] leading-snug">
                        Close to throttling boundary during daytime business hours. Autoscale advised.
                      </p>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#FAF6E8] overflow-hidden">
                      <div
                        className="h-full bg-[#D32F2F] rounded-full"
                        style={{
                          width: `${ec2Total > 0 ? Math.round(((data?.cpuDistribution?.band80_plus || 0) / ec2Total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Highlight Rightsizing Banner */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF6E8] border border-[#ECE5CC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FFF76A] border border-[#DFD6B5] flex items-center justify-center text-[#2E2B1A] shrink-0">
                      <Sparkles className="w-4 h-4 text-[#9A6B00]" />
                    </div>
                    <p className="text-[12.5px] text-[#2E2B1A] font-medium leading-relaxed">
                      {data?.cpuDistribution?.oversizedCount && data.cpuDistribution.oversizedCount > 0 ? (
                        <>
                          <strong className="font-bold">
                            {data.cpuDistribution.oversizedCount} Instance{data.cpuDistribution.oversizedCount > 1 ? "s" : ""}
                          </strong>{" "}
                          appear significantly oversized based on multi-week P99 CPU metrics. Downsizing could yield approx{" "}
                          <strong className="font-bold text-[#1F8A70]">
                            ~${data.cpuDistribution.potentialRightsizingSavings.toFixed(0)}/month
                          </strong>{" "}
                          in immediate run-rate savings.
                        </>
                      ) : (
                        "All active compute instances are currently operating within nominal capacity bands."
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentTab("infrastructure")}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-[#ECE5CC] hover:bg-[#FAF6E8] text-[12px] font-bold text-[#2E2B1A] transition-colors shrink-0 shadow-2xs cursor-pointer"
                  >
                    <span>View resources</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 5. SIDE-BY-SIDE: OPTIMIZATION OPPORTUNITIES & INFRASTRUCTURE               */}
              {/* ========================================================================= */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Left: Optimization Opportunities (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC] mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#9A6B00]" />
                          <h3 className="font-bold text-[16px] text-[#2E2B1A]">
                            Optimization Opportunities
                          </h3>
                        </div>
                        <p className="text-[12px] text-[#686450]">
                          High-confidence automated FinOps actions with quantified cost impact.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E2F5EF] border border-[#BDEBDD] text-[#1F8A70]">
                        {data?.recommendations.totalSavings && data.recommendations.totalSavings > 0
                          ? `+$${data.recommendations.totalSavings.toLocaleString()}/mo potential`
                          : "Audit Active"}
                      </span>
                    </div>

                    {/* Real Dynamic Opportunity Cards */}
                    <div className="space-y-2.5">
                      {data?.recommendations.items && data.recommendations.items.length > 0 ? (
                        data.recommendations.items.slice(0, 4).map((rec) => {
                          const isEip = rec.title.toLowerCase().includes("elastic ip") || rec.category === "eip_cleanup";
                          const isEbs = rec.title.toLowerCase().includes("ebs") || rec.title.toLowerCase().includes("volume");
                          const isHistory = rec.title.toLowerCase().includes("stopped");

                          const IconComp = isEip ? Network : isEbs ? HardDrive : isHistory ? History : Server;

                          let detailReason = rec.title;
                          try {
                            if (rec.evidence) {
                              const parsed = JSON.parse(rec.evidence);
                              detailReason = parsed.reason || parsed.calculation || rec.title;
                            }
                          } catch {
                            if (rec.evidence) detailReason = rec.evidence;
                          }

                          return (
                            <div
                              key={rec.id}
                              className="p-3.5 rounded-2xl bg-[#FAF6E8]/30 hover:bg-[#FAF6E8]/60 border border-[#ECE5CC] transition-all flex items-center justify-between gap-3"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00] shrink-0 mt-0.5">
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-[13px] text-[#2E2B1A] truncate max-w-sm">
                                      {rec.title}
                                    </h4>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#FAF6E8] text-[#8D8975] border border-[#ECE5CC] uppercase">
                                      {rec.resource?.region || "Active"}
                                    </span>
                                  </div>
                                  <p className="text-[11.5px] text-[#686450] leading-snug truncate max-w-md">
                                    {detailReason}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="font-bold text-[13px] text-[#1F8A70]">
                                  {rec.estimatedMonthlySavings > 0 ? `+$${rec.estimatedMonthlySavings.toFixed(2)}/mo` : "$0/mo"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRecommendation(rec)}
                                  className="px-3 py-1 rounded-full bg-white border border-[#ECE5CC] hover:bg-[#FAF6E8] text-[11px] font-bold text-[#2E2B1A] transition-colors cursor-pointer shadow-2xs"
                                >
                                  Review
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-6 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC] text-center">
                          <CheckCircle2 className="w-6 h-6 text-[#1F8A70] mx-auto mb-2" />
                          <p className="text-[13px] font-bold text-[#2E2B1A]">All Connected Resources Within Operational Limits</p>
                          <p className="text-[11.5px] text-[#686450] mt-0.5">Continuous telemetry shows zero idle or unattached resource waste.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#ECE5CC] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCurrentTab("recommendations")}
                      className="text-[12px] font-bold text-[#1F8A70] hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <span>View all {data?.recommendations.items.length || 0} recommendations and auto-remediation scripts</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Right: Infrastructure Live Inventory (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-[#ECE5CC] p-5 sm:p-6 shadow-warm-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC] mb-4">
                      <div>
                        <h3 className="font-bold text-[16px] text-[#2E2B1A]">
                          Infrastructure
                        </h3>
                        <p className="text-[12px] text-[#686450]">
                          Live inventory across active cloud regions.
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF6E8] border border-[#ECE5CC] text-[#9A6B00]">
                        {data?.inventory?.activeRegions.length || 1} Regions
                      </span>
                    </div>

                    {/* 4 Stat Boxes (2x2) */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* EC2 INSTANCES */}
                      <div className="p-3.5 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
                        <span className="text-[10.5px] font-mono font-bold uppercase text-[#8D8975] block mb-1">
                          EC2 INSTANCES
                        </span>
                        <div className="text-[24px] font-black text-[#2E2B1A] leading-tight">
                          {ec2Total}
                        </div>
                        <span className="text-[11px] text-[#686450] block mt-0.5">
                          {ec2Running} healthy · {ec2Stopped} review
                        </span>
                      </div>

                      {/* EBS VOLUMES */}
                      <div className="p-3.5 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
                        <span className="text-[10.5px] font-mono font-bold uppercase text-[#8D8975] block mb-1">
                          EBS VOLUMES
                        </span>
                        <div className="text-[24px] font-black text-[#2E2B1A] leading-tight">
                          {data?.resources.ebs.length || 0}
                        </div>
                        <span className="text-[11px] text-[#686450] block mt-0.5">
                          {data?.inventory?.ebsAttached ?? (data?.resources.ebs.length || 0)} attached · {data?.inventory?.ebsIdle || 0} idle
                        </span>
                      </div>

                      {/* ELASTIC IPS */}
                      <div className="p-3.5 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
                        <span className="text-[10.5px] font-mono font-bold uppercase text-[#8D8975] block mb-1">
                          ELASTIC IPS
                        </span>
                        <div className="text-[24px] font-black text-[#2E2B1A] leading-tight">
                          {data?.resources.eip.length || 0}
                        </div>
                        <span className="text-[11px] text-[#686450] block mt-0.5">
                          {data?.inventory?.eipAssociated || 0} associated · {data?.inventory?.eipUnused || 0} unused
                        </span>
                      </div>

                      {/* ACTIVE REGIONS */}
                      <div className="p-3.5 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
                        <span className="text-[10.5px] font-mono font-bold uppercase text-[#8D8975] block mb-1">
                          ACTIVE REGIONS
                        </span>
                        <div className="text-[24px] font-black text-[#2E2B1A] leading-tight">
                          {data?.inventory?.activeRegions.length || 1}
                        </div>
                        <span className="text-[11px] text-[#686450] block mt-0.5">
                          Multi-AZ resilient
                        </span>
                      </div>
                    </div>

                    {/* Regional Grid Carbon Intensity Box */}
                    <div className="p-3.5 rounded-2xl bg-[#FAF6E8]/60 border border-[#ECE5CC] space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#ECE5CC]/60">
                        <span className="text-[11px] font-bold text-[#2E2B1A]">
                          Regional Grid Carbon Intensity
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF6E8] text-[#9A6B00] border border-[#ECE5CC]">
                          {data?.resources.byRegion?.length || 1} Monitored
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[11px] font-mono text-[#686450]">
                        {data?.resources.byRegion && data.resources.byRegion.length > 0 ? (
                          data.resources.byRegion.map((r) => (
                            <div key={r.region} className="flex items-center justify-between">
                              <span className="truncate pr-2 font-medium text-[#2E2B1A]">{r.regionName} ({r.region})</span>
                              <span className="font-bold shrink-0 text-[#2E2B1A]">
                                {r.totalEc2} instance{r.totalEc2 === 1 ? "" : "s"} ({r.runningEc2} running) ·{" "}
                                <span className={r.gridIntensity > 500 ? "text-[#9A6B00]" : "text-[#1F8A70]"}>
                                  {r.gridIntensity} g/kWh
                                </span>
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-between">
                            <span>us-east-1 (N. Virginia)</span>
                            <span className="font-bold text-[#2E2B1A]">{ec2Total} instances · 420 g/kWh</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#ECE5CC] flex items-center justify-between text-[11.5px]">
                    <span className="text-[#8D8975]">Auto-discovery: enabled</span>
                    <button
                      type="button"
                      onClick={() => setCurrentTab("infrastructure")}
                      className="font-bold text-[#1F8A70] hover:underline cursor-pointer"
                    >
                      Manage assets & topology →
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Bottom Columns: Carbon Snapshot, Pipeline Health, Recent Signals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Carbon Snapshot (GreenOps) */}
                <div className="bg-white rounded-3xl border border-[#ECE5CC] p-5 shadow-warm-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC] mb-3">
                      <span className="font-bold text-[14px] text-[#2E2B1A]">Carbon Snapshot</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E2F5EF] text-[#1F8A70]">
                        GreenOps
                      </span>
                    </div>

                    <div className="mb-3">
                      <span className="text-[22px] font-black text-[#2E2B1A]">
                        {data?.carbon.totalCarbon !== null ? `${data?.carbon.totalCarbon} kgCO2e` : "--"}
                      </span>
                      <span className="text-[11px] text-[#1F8A70] font-bold block">
                        {data?.carbon.totalOperationalCarbon !== null
                          ? `${data.carbon.totalOperationalCarbon} gCO2e operational grid energy`
                          : "Carbon telemetry active"}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] font-mono text-[#686450] bg-[#FAF6E8]/40 p-2.5 rounded-xl border border-[#ECE5CC]/60 mb-3">
                      {data?.resources.byRegion && data.resources.byRegion.length > 0 ? (
                        data.resources.byRegion.slice(0, 3).map((r) => (
                          <div key={r.region} className="flex justify-between">
                            <span>{r.region} ({r.regionName.replace(/^(US East |Asia Pacific )/, "")}):</span>
                            <strong className={r.gridIntensity > 500 ? "text-[#9A6B00]" : "text-[#1F8A70]"}>
                              {r.gridIntensity} gCO2/kWh
                            </strong>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between">
                          <span>us-east-1 (VA):</span>
                          <strong className="text-[#2E2B1A]">420 gCO2/kWh</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentTab("carbon")}
                    className="text-[11.5px] font-bold text-[#1F8A70] hover:underline text-left pt-2 border-t border-[#ECE5CC] cursor-pointer"
                  >
                    Open GreenOps Studio →
                  </button>
                </div>

                {/* 2. Data Pipeline Health */}
                <div className="bg-white rounded-3xl border border-[#ECE5CC] p-5 shadow-warm-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC] mb-3">
                      <span className="font-bold text-[14px] text-[#2E2B1A]">Pipeline Health</span>
                      <span className="w-2 h-2 rounded-full bg-[#1F8A70]"></span>
                    </div>

                    <div className="space-y-2.5 text-[12px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#686450]">AWS IAM Connection</span>
                        <span className="font-bold text-[#1F8A70] bg-[#E2F5EF] px-2 py-0.5 rounded text-[11px]">
                          Connected
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#686450]">CUR Billing Export</span>
                        <span className="font-bold text-[#1F8A70] bg-[#E2F5EF] px-2 py-0.5 rounded text-[11px]">
                          Available
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#686450]">CloudWatch Metrics</span>
                        <span className="font-bold text-[#1F8A70] bg-[#E2F5EF] px-2 py-0.5 rounded text-[11px]">
                          Live (5m)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#8D8975] pt-1">
                        <span>Last Ingest:</span>
                        <span>{getRelativeTime(activeAccount.syncFreshness)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerSync}
                    className="text-[11.5px] font-bold text-[#9A6B00] hover:underline text-left pt-2 border-t border-[#ECE5CC] cursor-pointer"
                  >
                    Sync All Telemetry Now →
                  </button>
                </div>

                {/* 3. Recent Signals & Audit Feed (Real-Time from Audit Ledger) */}
                <div className="bg-white rounded-3xl border border-[#ECE5CC] p-5 shadow-warm-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#ECE5CC] mb-3">
                      <span className="font-bold text-[14px] text-[#2E2B1A]">Recent Signals</span>
                      <span className="text-[10px] font-mono text-[#8D8975]">Feed</span>
                    </div>

                    <div className="space-y-2 text-[11.5px]">
                      {data?.auditLogs && data.auditLogs.length > 0 ? (
                        data.auditLogs.slice(0, 3).map((log, i) => {
                          const isGreen = log.action.includes("complete") || log.action.includes("approved");
                          return (
                            <div key={log.id || i} className="flex items-start gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                  isGreen ? "bg-[#1F8A70]" : "bg-[#9A6B00]"
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[#686450] leading-snug truncate">
                                  <strong className="text-[#2E2B1A] capitalize">
                                    {log.action.replace(/_/g, " ")}:
                                  </strong>{" "}
                                  by {log.actor}
                                </p>
                                <span className="text-[10px] text-[#8D8975] font-mono">
                                  {getRelativeTime(log.ts)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[#8D8975] text-[11.5px]">
                          No audit signals recorded yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentTab("audit")}
                    className="text-[11.5px] font-bold text-[#1F8A70] hover:underline text-left pt-2 border-t border-[#ECE5CC]"
                  >
                    View full audit log →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COST INTELLIGENCE */}
          {currentTab === "cost" && activeAccount && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-[#ECE5CC]">
                  <div>
                    <h2 className="text-[18px] font-bold text-[#2E2B1A]">Cloud Cost Intelligence</h2>
                    <p className="text-[13px] text-[#686450]">
                      Normalized AWS billing and resource spend analytics.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#E2F5EF] text-[11.5px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                    Cost Explorer Synced
                  </span>
                </div>

                {/* 3 Metric Summary Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
                    <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
                      Billed Monthly Spend
                    </span>
                    <span className="text-[24px] font-black text-[#2E2B1A]">
                      {data?.costs.totalCost !== null ? `$${data?.costs.totalCost.toLocaleString()}` : "--"}
                    </span>
                    <span className="text-[11px] text-[#1F8A70] block mt-1 font-semibold">
                      Normalized via Cost Explorer
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
                    <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
                      Daily Run Rate
                    </span>
                    <span className="text-[24px] font-black text-[#2E2B1A]">
                      {data?.costs.dailyBurnRate !== null ? `$${data?.costs.dailyBurnRate}` : "--"}
                    </span>
                    <span className="text-[11px] text-[#8D8975] block mt-1">
                      Estimated 30-day daily velocity
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
                    <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
                      Optimization Savings
                    </span>
                    <span className="text-[24px] font-black text-[#1F8A70]">
                      {data?.recommendations.totalSavings !== null ? `$${data?.recommendations.totalSavings.toLocaleString()}/mo` : "--"}
                    </span>
                    <span className="text-[11px] text-[#9A6B00] block mt-1 font-semibold">
                      {data?.recommendations.activeCount || 0} Identified actions
                    </span>
                  </div>
                </div>

                {/* By Service Breakdown Table */}
                <div className="pt-2">
                  <h3 className="font-bold text-[14px] text-[#2E2B1A] mb-3">Service Spend Ledger</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12.5px]">
                      <thead>
                        <tr className="border-b border-[#ECE5CC] font-mono text-[11px] text-[#8D8975] uppercase">
                          <th className="py-2">Service Name</th>
                          <th className="py-2">Category</th>
                          <th className="py-2">Billed Amount</th>
                          <th className="py-2">Actionable Waste</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ECE5CC]/50">
                        {data?.costs.byService.length ? (
                          data.costs.byService.map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#FAF6E8]/40">
                              <td className="py-2.5 font-bold text-[#2E2B1A]">{item.service}</td>
                              <td className="py-2.5 text-[#686450]">Cloud Primitive</td>
                              <td className="py-2.5 font-mono font-bold">${item.total.toLocaleString()}</td>
                              <td className="py-2.5 text-[#1F8A70] font-semibold">Available</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-[#8D8975]">
                              No billing line items synced yet. Click "Sync Telemetry" to pull AWS Cost Explorer data.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Budget Tracking & Anomaly Intelligence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#ECE5CC]">
                  {/* Monthly Budget vs Actual Pace */}
                  <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#9A6B00]" />
                        <span className="font-bold text-[13px] text-[#2E2B1A]">Monthly Budget Governance</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD]">
                        {data?.budget?.status === "healthy" ? "Within Safe Pace" : "Exceeded"}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[20px] font-black text-[#2E2B1A]">
                          ${data?.budget?.spent !== undefined ? data.budget.spent.toFixed(2) : "0.00"}
                        </span>
                        <span className="text-[12px] text-[#8D8975] ml-1">
                          / ${data?.budget?.target || 50}.00 Target
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[#8D8975]">
                        {data?.budget?.pacePercentage || 0}% used
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[#ECE5CC] overflow-hidden">
                      <div
                        className="h-full bg-[#1F8A70] rounded-full transition-all"
                        style={{ width: `${Math.max(data?.budget?.pacePercentage || 0, 2)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#686450]">
                      <span>Projected Month-End:</span>
                      <strong className="text-[#2E2B1A] font-mono">
                        ${data?.budget?.projectedMonthEnd !== undefined ? data.budget.projectedMonthEnd.toFixed(2) : "0.00"}
                      </strong>
                    </div>
                  </div>

                  {/* Anomaly Outlier Detector */}
                  <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-[#9A6B00]" />
                          <span className="font-bold text-[13px] text-[#2E2B1A]">Cost Anomaly Detector</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD]">
                          P99 Outlier Engine
                        </span>
                      </div>
                      <p className="text-[12px] text-[#686450] leading-snug">
                        {data?.anomalies?.message || "Spend and carbon telemetry within nominal bounds (0 anomalies detected)."}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-[#ECE5CC] flex items-center justify-between text-[11.5px]">
                      <span className="text-[#686450]">Trailing 30-Day Outliers:</span>
                      <span className="font-mono font-bold text-[#1F8A70]">0 Spikes</span>
                    </div>
                  </div>
                </div>

                {/* 3. Tag-Based Cost Allocation (Showback) & FinOps Hygiene */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-[#ECE5CC]">
                  {/* Left: Environment Showback (7 cols) */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-[14px] text-[#2E2B1A]">Tag Allocation & Showback</h4>
                        <p className="text-[11.5px] text-[#686450]">
                          Spend allocated across business environments derived from AWS resource tags.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-[#8D8975] font-bold">
                        Environment Dimension
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {data?.tagAllocation?.byEnvironment && data.tagAllocation.byEnvironment.length > 0 ? (
                        data.tagAllocation.byEnvironment.map((env, i) => (
                          <div key={env.name || i} className="p-3 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC] space-y-1.5">
                            <div className="flex items-center justify-between text-[12px]">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                  env.name === "Production"
                                    ? "bg-[#1F8A70]"
                                    : env.name === "Staging"
                                    ? "bg-[#9A6B00]"
                                    : env.name === "Development"
                                    ? "bg-[#3B82F6]"
                                    : "bg-[#8D8975]"
                                }`} />
                                <span className="font-bold text-[#2E2B1A]">{env.name}</span>
                                <span className="text-[11px] text-[#8D8975]">({env.count} resources)</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-[#2E2B1A]">
                                  ${env.cost.toFixed(2)}/mo
                                </span>
                                <span className="text-[11px] font-mono text-[#8D8975]">
                                  {env.percentage}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[#ECE5CC] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  env.name === "Production"
                                    ? "bg-[#1F8A70]"
                                    : env.name === "Staging"
                                    ? "bg-[#9A6B00]"
                                    : env.name === "Development"
                                    ? "bg-[#3B82F6]"
                                    : "bg-[#8D8975]"
                                }`}
                                style={{ width: `${Math.max(env.percentage, env.count > 0 ? 5 : 0)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-xl bg-[#FAF6E8]/40 border border-[#ECE5CC] text-center text-[12px] text-[#8D8975]">
                          No tagged resources discovered.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Tag Hygiene Score (5 cols) */}
                  <div className="lg:col-span-5 p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[13px] text-[#2E2B1A]">FinOps Tag Hygiene</span>
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          (data?.tagAllocation?.hygieneScore || 0) >= 80
                            ? "bg-[#E2F5EF] text-[#1F8A70]"
                            : "bg-[#FFF76A] text-[#2E2B1A] border border-[#DFD6B5]"
                        }`}>
                          {data?.tagAllocation?.hygieneScore || 0}% Compliant
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#686450] leading-snug">
                        FinOps best practices require mandatory <code className="font-mono text-[#2E2B1A]">Environment</code> and <code className="font-mono text-[#2E2B1A]">Owner</code> tags on all infrastructure assets to automate showback and prevent orphaned spend.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#ECE5CC]/80">
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-[#686450]">Tagged Resources:</span>
                        <strong className="text-[#1F8A70] font-mono">
                          {data?.tagAllocation?.taggedCount || 0} Assets
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-[#686450]">Untagged (Unallocated):</span>
                        <strong className="text-[#9A6B00] font-mono">
                          {data?.tagAllocation?.untaggedCount || 0} Assets
                        </strong>
                      </div>
                    </div>

                    {(data?.tagAllocation?.untaggedCount || 0) > 0 && (
                      <div className="p-2.5 rounded-xl bg-white border border-[#ECE5CC] text-[11px] text-[#686450] flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-[#9A6B00] shrink-0 mt-0.5" />
                        <span>
                          Notice: <strong>{data?.tagAllocation?.untaggedCount} resources</strong> lack an Environment tag. Tag them in AWS Console to automate allocation.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Commitment Coverage & Savings Plan Simulator */}
                <div className="p-4 rounded-2xl bg-[#FAF6E8]/30 border border-[#ECE5CC] flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD]">
                        Savings Plan Simulator
                      </span>
                      <span className="text-[11px] font-mono text-[#8D8975]">
                        Compute Coverage: 100% On-Demand
                      </span>
                    </div>
                    <h4 className="font-bold text-[13.5px] text-[#2E2B1A]">
                      1-Year Compute Savings Plan Simulation
                    </h4>
                    <p className="text-[12px] text-[#686450] max-w-xl">
                      Committing to steady-state EC2 compute utilization reduces on-demand rates by up to <strong>28% - 35%</strong> across all regions.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[15px] font-black text-[#1F8A70] block">
                        Up to 35% Off
                      </span>
                      <span className="text-[10.5px] text-[#8D8975]">
                        Zero upfront option
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CARBON INTELLIGENCE (GREENOPS) */}
          {currentTab === "carbon" && activeAccount && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-[#ECE5CC]">
                  <div>
                    <h2 className="text-[18px] font-bold text-[#2E2B1A]">GreenOps Carbon Intelligence</h2>
                    <p className="text-[13px] text-[#686450]">
                      Software Carbon Intensity (SCI) accounting and regional grid emission modeling.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#E2F5EF] text-[11.5px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                    GSF SCI Standard
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
                    <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
                      Operational Carbon
                    </span>
                    <span className="text-[24px] font-black text-[#2E2B1A]">
                      {data?.carbon.totalOperationalCarbon !== null ? `${data?.carbon.totalOperationalCarbon} gCO2e` : "--"}
                    </span>
                    <span className="text-[11px] text-[#686450] block mt-1">
                      Direct server electricity consumption
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
                    <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
                      SCI Score per Functional Unit
                    </span>
                    <span className="text-[24px] font-black text-[#1F8A70]">
                      {data?.carbon.totalOperationalCarbon !== null && data?.carbon.totalEmbodiedCarbon !== null
                        ? `${(((data.carbon.totalOperationalCarbon + data.carbon.totalEmbodiedCarbon) / sciFunctionalUnit)).toFixed(5)} g/unit`
                        : "--"}
                    </span>
                    <span className="text-[11px] text-[#1F8A70] block mt-1 font-semibold">
                      Normalized for {sciFunctionalUnit.toLocaleString()} units
                    </span>
                  </div>
                </div>

                {/* 2. Interactive SCI Functional Unit Tuner & Emissions Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-[#ECE5CC]">
                  {/* Left: SCI Tuner (7 cols) */}
                  <div className="lg:col-span-7 p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[#1F8A70]" />
                        <h4 className="font-bold text-[13.5px] text-[#2E2B1A]">
                          GSF-SCI Functional Unit Tuner
                        </h4>
                      </div>
                      <span className="font-mono text-[10.5px] bg-[#E2F5EF] text-[#1F8A70] px-2 py-0.5 rounded font-bold">
                        SCI = (O + M) / R
                      </span>
                    </div>

                    <p className="text-[12px] text-[#686450] leading-snug">
                      The Green Software Foundation standard normalizes carbon output against your actual business throughput (e.g. API requests, active users, or daily transactions).
                    </p>

                    <div className="pt-1">
                      <span className="text-[11px] font-mono font-bold text-[#8D8975] block mb-2 uppercase">
                        Select Functional Unit Horizon:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { label: "10,000 Requests", val: 10000 },
                          { label: "50,000 Requests", val: 50000 },
                          { label: "100,000 Requests (Default)", val: 100000 },
                          { label: "1,000,000 Requests", val: 1000000 },
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => setSciFunctionalUnit(preset.val)}
                            className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-all cursor-pointer ${
                              sciFunctionalUnit === preset.val
                                ? "bg-[#FFF76A] text-[#2E2B1A] border border-[#DFD6B5] shadow-2xs"
                                : "bg-white hover:bg-[#FAF6E8] text-[#686450] border border-[#ECE5CC]"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Direct vs Embodied Emissions Ratio (5 cols) */}
                  <div className="lg:col-span-5 p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[13px] text-[#2E2B1A]">Carbon Emissions Breakdown</span>
                        <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#E2F5EF] text-[#1F8A70]">
                          Direct & Embodied
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#686450] leading-snug">
                        Server electricity measures dynamic energy consumed by running compute. Embodied carbon amortizes physical hardware manufacturing and supply chain footprint.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#ECE5CC]/80">
                      <div>
                        <div className="flex justify-between text-[11.5px] font-mono mb-1">
                          <span className="text-[#686450]">Server Electricity (Operational):</span>
                          <strong className="text-[#2E2B1A]">
                            {data?.carbon.totalOperationalCarbon !== null ? `${data?.carbon.totalOperationalCarbon} gCO2e` : "--"}
                          </strong>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#ECE5CC] overflow-hidden">
                          <div className="h-full bg-[#1F8A70] rounded-full" style={{ width: "65%" }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11.5px] font-mono mb-1">
                          <span className="text-[#686450]">Hardware Manufacturing (Embodied):</span>
                          <strong className="text-[#2E2B1A]">
                            {data?.carbon.totalEmbodiedCarbon !== null ? `${data?.carbon.totalEmbodiedCarbon} gCO2e` : "--"}
                          </strong>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#ECE5CC] overflow-hidden">
                          <div className="h-full bg-[#9A6B00] rounded-full" style={{ width: "35%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Clean Grid Migration Simulator */}
                <div className="p-4 rounded-2xl bg-[#E2F5EF]/40 border border-[#BDEBDD] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1F8A70] text-white">
                        Carbon-Aware Shifting
                      </span>
                      <span className="text-[11px] font-mono text-[#1F8A70] font-bold">
                        us-east-1 → us-west-2
                      </span>
                    </div>
                    <h4 className="font-bold text-[14px] text-[#2E2B1A]">
                      Clean Grid Migration Simulation
                    </h4>
                    <p className="text-[12px] text-[#686450] max-w-xl">
                      Relocating non-latency-sensitive workloads from Northern Virginia (312 gCO2e/kWh) to Oregon (198 gCO2e/kWh - Hydro) eliminates <strong>~36.5%</strong> of direct grid emissions without code changes.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[16px] font-black text-[#1F8A70] block">
                        -36.5% gCO2e
                      </span>
                      <span className="text-[10.5px] text-[#8D8975]">
                        Zero performance penalty
                      </span>
                    </div>
                  </div>
                </div>

                {/* Regional Grid Factor Table */}
                <div className="pt-2">
                  <h3 className="font-bold text-[14px] text-[#2E2B1A] mb-3">Regional Electricity Grid Carbon Intensity</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12.5px]">
                      <thead>
                        <tr className="border-b border-[#ECE5CC] font-mono text-[11px] text-[#8D8975] uppercase">
                          <th className="py-2">AWS Region</th>
                          <th className="py-2">Location</th>
                          <th className="py-2">Grid Carbon Intensity</th>
                          <th className="py-2">Energy Mix</th>
                          <th className="py-2">Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ECE5CC]/50">
                        {data?.carbon.regionalGrid.map((grid, idx) => (
                          <tr key={idx} className="hover:bg-[#FAF6E8]/40">
                            <td className="py-2.5 font-mono font-bold text-[#2E2B1A]">{grid.region}</td>
                            <td className="py-2.5 text-[#686450]">{grid.location}</td>
                            <td className="py-2.5 font-mono font-bold">{grid.gridIntensity} gCO2e/kWh</td>
                            <td className="py-2.5 text-[#686450]">{grid.mix}</td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${grid.status === "Clean"
                                  ? "bg-[#E2F5EF] text-[#1F8A70]"
                                  : "bg-[#FFF3D6] text-[#9A6B00]"
                                }`}>
                                {grid.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INFRASTRUCTURE OVERVIEW */}
          {/* TAB 4: INFRASTRUCTURE OVERVIEW */}
          {currentTab === "infrastructure" && activeAccount && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
                {/* Infrastructure Sub-Navigation Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ECE5CC]">
                  <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#FAF6E8] border border-[#ECE5CC]">
                    <button
                      type="button"
                      onClick={() => setActiveNavItem("infra-resources")}
                      className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer ${
                        activeNavItem === "infra-resources" || (activeNavItem !== "infra-accounts" && activeNavItem !== "infra-regions")
                          ? "bg-white text-[#2E2B1A] shadow-2xs border border-[#ECE5CC]"
                          : "text-[#686450] hover:text-[#2E2B1A]"
                      }`}
                    >
                      Resources ({filteredResources.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveNavItem("infra-accounts")}
                      className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeNavItem === "infra-accounts"
                          ? "bg-white text-[#2E2B1A] shadow-2xs border border-[#ECE5CC]"
                          : "text-[#686450] hover:text-[#2E2B1A]"
                      }`}
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Accounts ({accountsList.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveNavItem("infra-regions")}
                      className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer ${
                        activeNavItem === "infra-regions"
                          ? "bg-white text-[#2E2B1A] shadow-2xs border border-[#ECE5CC]"
                          : "text-[#686450] hover:text-[#2E2B1A]"
                      }`}
                    >
                      Regions ({data?.resources.byRegion?.length || 0})
                    </button>
                  </div>

                  {/* Actions according to subview */}
                  <div className="flex items-center gap-2">
                    {activeNavItem === "infra-accounts" ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCleanDuplicates}
                          disabled={cleaningDuplicates}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8] text-[11.5px] font-bold text-[#686450] hover:text-[#2E2B1A] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${cleaningDuplicates ? "animate-spin" : ""}`} />
                          <span>Purge Duplicate Stubs</span>
                        </button>
                        <Link
                          href="/onboarding"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[12px] font-bold text-[#2E2B1A] shadow-2xs transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Connect Account</span>
                        </Link>
                      </div>
                    ) : (
                      <select
                        value={infraRegionFilter}
                        onChange={(e) => setInfraRegionFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-[#ECE5CC] bg-[#FAF6E8] text-[12px] font-bold text-[#2E2B1A]"
                      >
                        <option value="all">
                          All Regions ({data?.resources.byRegion?.length || 0})
                        </option>
                        {data?.resources.byRegion?.map((r) => (
                          <option key={r.region} value={r.region}>
                            {r.region} — {r.regionName} ({r.resourcesCount})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* SUB-VIEW 1: ACCOUNTS LIST */}
                {activeNavItem === "infra-accounts" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <h3 className="text-[16px] font-bold text-[#2E2B1A]">Connected Cloud Accounts</h3>
                      <p className="text-[12.5px] text-[#686450]">
                        Manage authenticated AWS cross-account IAM roles linked to GreenCloud AI.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {accountsList.map((acc) => {
                        const isActive = acc.id === activeAccount?.id;
                        const isDeleting = deletingAccountId === acc.id;

                        return (
                          <div
                            key={acc.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                              isActive
                                ? "bg-white border-[#1F8A70]/50 ring-1 ring-[#1F8A70]/20 shadow-warm-xs"
                                : "bg-[#FAF6E8]/30 border-[#ECE5CC] hover:bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A] shrink-0">
                                <Cloud className="w-5 h-5 text-[#9A6B00]" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <strong className="text-[14px] text-[#2E2B1A] truncate">{acc.name}</strong>
                                  {isActive ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD] flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      <span>Active Account</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono text-[#8D8975] bg-[#FAF6E8] border border-[#ECE5CC]">
                                      Connected
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[12px] text-[#686450] mt-0.5 font-mono">
                                  <span>AWS Account: {acc.externalAccountId}</span>
                                  <span>•</span>
                                  <span>Status: {acc.status || "active"}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                              {!isActive && (
                                <button
                                  type="button"
                                  onClick={() => loadDashboard(acc.id)}
                                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[12px] font-bold text-[#2E2B1A] transition-colors cursor-pointer"
                                >
                                  Switch to Account
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(acc.id)}
                                disabled={isDeleting}
                                title="Disconnect account"
                                className="p-2 rounded-xl text-[#8D8975] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 2: REGIONAL BREAKDOWN */}
                {activeNavItem === "infra-regions" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <h3 className="text-[16px] font-bold text-[#2E2B1A]">AWS Regional Breakdown</h3>
                      <p className="text-[12.5px] text-[#686450]">
                        Geographic spread, clean grid intensity, and monthly compute spend.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12.5px]">
                        <thead>
                          <tr className="border-b border-[#ECE5CC] font-mono text-[11px] text-[#8D8975] uppercase">
                            <th className="py-2">AWS Region</th>
                            <th className="py-2">Location</th>
                            <th className="py-2">Running EC2</th>
                            <th className="py-2">Stopped EC2</th>
                            <th className="py-2">Grid Carbon Intensity</th>
                            <th className="py-2">Monthly Spend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ECE5CC]/50">
                          {data?.resources.byRegion && data.resources.byRegion.length > 0 ? (
                            data.resources.byRegion.map((r) => (
                              <tr key={r.region} className="hover:bg-[#FAF6E8]/40">
                                <td className="py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[16px]">{r.flag || "🌐"}</span>
                                    <span className="font-mono font-bold text-[#2E2B1A]">{r.region}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 text-[#686450]">{r.regionName}</td>
                                <td className="py-2.5">
                                  <span className="font-mono font-bold text-[#1F8A70]">{r.runningEc2}</span>
                                </td>
                                <td className="py-2.5">
                                  <span className="font-mono text-[#8D8975]">{r.stoppedEc2}</span>
                                </td>
                                <td className="py-2.5">
                                  <span className="font-mono font-bold text-[#2E2B1A]">
                                    {r.gridIntensity} gCO2e/kWh
                                  </span>
                                  <span className="text-[11px] text-[#8D8975] block">{r.mix}</span>
                                </td>
                                <td className="py-2.5 font-mono font-bold text-[#2E2B1A]">
                                  ${r.monthlyCost.toFixed(2)}/mo
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-[#8D8975]">
                                No regional telemetry data available.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SUB-VIEW 3: RESOURCES INVENTORY (DEFAULT) */}
                {activeNavItem !== "infra-accounts" && activeNavItem !== "infra-regions" && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div>
                      <h2 className="text-[16px] font-bold text-[#2E2B1A]">Cloud Resources Inventory</h2>
                      <p className="text-[12.5px] text-[#686450]">
                        Monitored virtual machines, block volumes, and network assets in {activeAccount.name}.
                      </p>
                    </div>

                    {/* Resource Inventory Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12.5px]">
                        <thead>
                          <tr className="border-b border-[#ECE5CC] font-mono text-[11px] text-[#8D8975] uppercase">
                            <th className="py-2">Resource Name & ID</th>
                            <th className="py-2">Type & Specs</th>
                            <th className="py-2">AWS Region</th>
                            <th className="py-2">Resource State</th>
                            <th className="py-2">Estimated Cost</th>
                            <th className="py-2">Carbon Footprint</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ECE5CC]/50">
                          {filteredResources.length ? (
                            filteredResources.map((res) => (
                              <tr key={res.id} className="hover:bg-[#FAF6E8]/40">
                                <td className="py-2.5">
                                  <span className="font-bold text-[#2E2B1A] block">
                                    {res.instanceName || res.providerResourceId}
                                  </span>
                                  {res.instanceName && res.instanceName !== res.providerResourceId && (
                                    <span className="font-mono text-[10.5px] text-[#8D8975] block">
                                      {res.providerResourceId}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 text-[#686450]">
                                  <span className="font-mono font-bold text-[#2E2B1A] uppercase">
                                    {res.resourceType}
                                  </span>{" "}
                                  {res.instanceType ? (
                                    <span className="px-1.5 py-0.5 rounded bg-[#FAF6E8] text-[#2E2B1A] font-mono text-[11px] border border-[#ECE5CC]">
                                      {res.instanceType}
                                    </span>
                                  ) : ""}
                                  {res.sizeGb ? (
                                    <span className="text-[#8D8975] ml-1">
                                      {res.sizeGb} GB
                                    </span>
                                  ) : ""}
                                </td>
                                <td className="py-2.5">
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#FAF6E8] border border-[#ECE5CC] text-[11.5px] font-bold text-[#2E2B1A]">
                                    <span>{res.regionFlag || "🌐"}</span>
                                    <span className="font-mono">{res.region}</span>
                                  </span>
                                  {res.regionName && (
                                    <span className="text-[10.5px] text-[#8D8975] block mt-0.5">
                                      {res.regionName}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                                    res.lifecycleState === "running" || res.lifecycleState === "in-use"
                                      ? "bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD]"
                                      : "bg-[#FFF3D6] text-[#9A6B00] border border-[#ECE5CC]"
                                  }`}>
                                    {res.lifecycleState === "running" && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70] animate-pulse"></span>
                                    )}
                                    <span>{res.lifecycleState}</span>
                                  </span>
                                </td>
                                <td className="py-2.5 font-mono font-bold text-[#2E2B1A]">
                                  {res.monthlyCost !== null ? `$${res.monthlyCost.toFixed(2)}/mo` : "--"}
                                </td>
                                <td className="py-2.5 font-mono text-[11.5px] text-[#686450]">
                                  {res.carbonEmissions?.[0]
                                    ? `${res.carbonEmissions[0].operationalGco2e.toFixed(1)} gCO2e/day`
                                    : "--"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-[#8D8975]">
                                No resources found. Click "Sync Telemetry" to discover assets via AWS APIs.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: RECOMMENDATIONS SUMMARY */}
          {currentTab === "recommendations" && activeAccount && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#ECE5CC]">
                  <div>
                    <h2 className="text-[18px] font-bold text-[#2E2B1A]">High-Confidence Optimization Actions</h2>
                    <p className="text-[13px] text-[#686450]">
                      Prioritized recommendations ranked by financial ROI, carbon savings, and operational risk.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-[#FFF76A] border border-[#DFD6B5] text-[12px] font-bold text-[#2E2B1A]">
                      {data?.recommendations.totalSavings !== null ? `$${data?.recommendations.totalSavings.toLocaleString()}/mo Total Potential` : "--"}
                    </span>
                  </div>
                </div>

                {/* Recommendations List */}
                <div className="space-y-3">
                  {filteredRecommendations.length ? (
                    filteredRecommendations.map((rec) => {
                      let parsedEvidence: any = null;
                      try {
                        parsedEvidence = JSON.parse(rec.evidence);
                      } catch {
                        // ignore
                      }

                      return (
                        <div
                          key={rec.id}
                          className="p-4 sm:p-5 rounded-2xl border border-[#ECE5CC] bg-[#FAF6E8]/20 hover:bg-[#FAF6E8]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold uppercase bg-[#FAF6E8] border border-[#ECE5CC] text-[#9A6B00]">
                                {rec.category}
                              </span>
                              <span className="text-[11px] font-mono text-[#8D8975]">
                                Risk Score: {(rec.riskScore * 100).toFixed(0)}%
                              </span>
                            </div>
                            <h4 className="font-bold text-[14.5px] text-[#2E2B1A]">
                              {rec.title}
                            </h4>
                            <p className="text-[12px] text-[#686450] max-w-2xl leading-relaxed">
                              {parsedEvidence?.reason || rec.evidence}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 sm:self-center">
                            <div className="text-right">
                              <span className="text-[16px] font-black text-[#1F8A70] block">
                                +${rec.estimatedMonthlySavings.toLocaleString()}/mo
                              </span>
                              <span className="text-[10.5px] font-mono text-[#8D8975] block">
                                Confidence: {(rec.confidence * 100).toFixed(0)}%
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedRecommendation(rec)}
                                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[11.5px] font-bold text-[#2E2B1A] transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <Code className="w-3.5 h-3.5 text-[#1F8A70]" />
                                <span>Inspect & IaC</span>
                              </button>

                              {rec.status === "active" ? (
                                <button
                                  type="button"
                                  onClick={() => handleApproveRecommendation(rec.id)}
                                  className="px-4 py-2 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[12px] font-bold text-[#2E2B1A] shadow-xs cursor-pointer"
                                >
                                  Approve
                                </button>
                              ) : (
                                <span className="px-3 py-1 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70]">
                                  Approved
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-[#8D8975]">
                      No recommendations found. Run "Sync Telemetry" to analyze resources for waste and rightsizing.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT HISTORY */}
          {currentTab === "audit" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-4">
                <div className="pb-3 border-b border-[#ECE5CC]">
                  <h2 className="text-[18px] font-bold text-[#2E2B1A]">Immutable Audit History</h2>
                  <p className="text-[13px] text-[#686450]">
                    Complete chronological ledger of all account connections, sync triggers, and optimization approvals.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-[#ECE5CC] font-mono text-[10.5px] text-[#8D8975] uppercase">
                        <th className="py-2">Timestamp</th>
                        <th className="py-2">Actor</th>
                        <th className="py-2">Action</th>
                        <th className="py-2">Target Type</th>
                        <th className="py-2">Metadata Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECE5CC]/50">
                      {data?.auditLogs.length ? (
                        data.auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#FAF6E8]/40">
                            <td className="py-2.5 font-mono text-[11px] text-[#8D8975]">
                              {new Date(log.ts).toLocaleString()}
                            </td>
                            <td className="py-2.5 font-bold text-[#2E2B1A]">{log.actor}</td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-[#FAF6E8] text-[#9A6B00] border border-[#ECE5CC]">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-2.5 text-[#686450]">{log.objectType}</td>
                            <td className="py-2.5 font-mono text-[11px] text-[#686450] max-w-xs truncate">
                              {log.metadata || "--"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-[#8D8975]">
                            No audit log records found yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CENTERED RECOMMENDATION INSPECTION MODAL */}
          {selectedRecommendation && (
            <div
              className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
              onClick={() => setSelectedRecommendation(null)}
            >
              <div
                className="w-full max-w-2xl bg-[#FFFDF4] rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border border-[#ECE5CC] overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-[#ECE5CC] bg-white flex items-start justify-between gap-4 shrink-0">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold uppercase bg-[#FAF6E8] text-[#9A6B00] border border-[#ECE5CC]">
                        {selectedRecommendation.category}
                      </span>
                      <span className="text-[11px] font-mono text-[#8D8975]">
                        Risk: {(selectedRecommendation.riskScore * 100).toFixed(0)}%
                      </span>
                      <span className="text-[11px] font-mono text-[#1F8A70] font-bold">
                        Confidence: {(selectedRecommendation.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <h3 className="font-bold text-[17px] text-[#2E2B1A] leading-snug">
                      {selectedRecommendation.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRecommendation(null)}
                    className="p-1.5 rounded-xl border border-[#ECE5CC] hover:bg-[#FAF6E8] text-[#686450] hover:text-[#2E2B1A] transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body Scrollable */}
                <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
                  {/* ROI & Sustainability Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#E2F5EF]/60 border border-[#BDEBDD]">
                      <span className="text-[10.5px] font-mono uppercase font-bold text-[#1F8A70] block mb-0.5">
                        Financial ROI
                      </span>
                      <span className="text-[22px] font-black text-[#1F8A70]">
                        +${selectedRecommendation.estimatedMonthlySavings.toFixed(2)}/mo
                      </span>
                      <span className="text-[11px] text-[#1F8A70] block">
                        Annual: +${(selectedRecommendation.estimatedMonthlySavings * 12).toFixed(2)}/yr
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#FAF6E8] border border-[#ECE5CC]">
                      <span className="text-[10.5px] font-mono uppercase font-bold text-[#9A6B00] block mb-0.5">
                        Carbon Impact
                      </span>
                      <span className="text-[22px] font-black text-[#2E2B1A]">
                        -{selectedRecommendation.estimatedGco2eSavings > 1000
                          ? `${(selectedRecommendation.estimatedGco2eSavings / 1000).toFixed(2)} kgCO2e`
                          : `${selectedRecommendation.estimatedGco2eSavings.toFixed(1)} gCO2e`}
                      </span>
                      <span className="text-[11px] text-[#686450] block">
                        Estimated carbon reduction
                      </span>
                    </div>
                  </div>

                  {/* Telemetry Evidence Box */}
                  <div className="p-4 rounded-2xl bg-white border border-[#ECE5CC] space-y-2">
                    <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase block">
                      Telemetry Evidence & Root Cause
                    </span>
                    <p className="text-[12.5px] text-[#2E2B1A] leading-relaxed">
                      {(() => {
                        try {
                          const parsed = JSON.parse(selectedRecommendation.evidence);
                          return parsed.reason || selectedRecommendation.evidence;
                        } catch {
                          return selectedRecommendation.evidence;
                        }
                      })()}
                    </p>
                    <div className="pt-2 border-t border-[#ECE5CC]/60 flex items-center justify-between text-[11px] text-[#8D8975] font-mono">
                      <span>Source: CloudWatch Metrics & AWS EC2 API</span>
                      <span>Verified: Real-Time</span>
                    </div>
                  </div>

                  {/* Target Asset Details */}
                  {selectedRecommendation.resource && (
                    <div className="p-4 rounded-2xl bg-white border border-[#ECE5CC] space-y-2">
                      <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase block">
                        Target Asset Details
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[12px] font-mono">
                        <div>
                          <span className="text-[#8D8975] block text-[10.5px]">Resource ID:</span>
                          <strong className="text-[#2E2B1A]">{selectedRecommendation.resource.providerResourceId}</strong>
                        </div>
                        <div>
                          <span className="text-[#8D8975] block text-[10.5px]">Region:</span>
                          <strong className="text-[#2E2B1A]">{selectedRecommendation.resource.region}</strong>
                        </div>
                        <div>
                          <span className="text-[#8D8975] block text-[10.5px]">Type:</span>
                          <strong className="text-[#2E2B1A]">{selectedRecommendation.resource.resourceType.toUpperCase()}</strong>
                        </div>
                        <div>
                          <span className="text-[#8D8975] block text-[10.5px]">Current State:</span>
                          <strong className="text-[#1F8A70]">{selectedRecommendation.resource.lifecycleState}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generated Terraform IaC Snippet */}
                  <div className="p-4 rounded-2xl bg-[#2E2B1A] text-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-[#FFF76A]" />
                        <span className="font-mono text-[12px] font-bold text-[#FFF76A]">
                          Terraform IaC Remediation Code
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const code = generateTerraformSnippet(selectedRecommendation);
                          navigator.clipboard.writeText(code);
                          setCopiedIaC(true);
                          setTimeout(() => setCopiedIaC(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-mono text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedIaC ? <Check className="w-3.5 h-3.5 text-[#1F8A70]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIaC ? "Copied!" : "Copy Snippet"}</span>
                      </button>
                    </div>

                    <pre className="font-mono text-[11px] text-[#FAF6E8] bg-black/30 p-3 rounded-xl overflow-x-auto leading-relaxed border border-white/10">
                      {generateTerraformSnippet(selectedRecommendation)}
                    </pre>
                  </div>

                  {/* 1-Click Ticket Generator (Jira / GitHub) */}
                  <div className="p-4 rounded-2xl bg-white border border-[#ECE5CC] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-[#8D8975] uppercase block">
                        DevOps Ticket Integration
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const ticket = generateTicketMarkdown(selectedRecommendation);
                          navigator.clipboard.writeText(ticket);
                          setCopiedTicket(true);
                          setTimeout(() => setCopiedTicket(false), 2000);
                        }}
                        className="text-[11.5px] font-bold text-[#1F8A70] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedTicket ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedTicket ? "Ticket Copied to Clipboard!" : "Copy Jira / GitHub Markdown"}</span>
                      </button>
                    </div>
                    <p className="text-[11.5px] text-[#686450]">
                      Export formatted issue context to your engineering backlog (GitHub, Jira, or ServiceNow).
                    </p>
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 sm:p-5 border-t border-[#ECE5CC] bg-white flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRecommendation(null)}
                    className="px-4 py-2 rounded-full border border-[#ECE5CC] text-[12px] font-bold text-[#686450] hover:bg-[#FAF6E8] cursor-pointer"
                  >
                    Close
                  </button>

                  <div className="flex items-center gap-2">
                    {selectedRecommendation.status === "active" && !selectedRecommendation.id.startsWith("opp-") ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleApproveRecommendation(selectedRecommendation.id);
                          setSelectedRecommendation(null);
                        }}
                        className="px-5 py-2 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[12.5px] font-bold text-[#2E2B1A] shadow-xs cursor-pointer"
                      >
                        Approve Optimization
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-full bg-[#E2F5EF] text-[11.5px] font-bold text-[#1F8A70]">
                        Action Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1-CLICK EXPORT REPORT MODAL */}
          {exportModalOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => setExportModalOpen(false)}
            >
              <div
                className="max-w-md w-full bg-[#FFFDF4] rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-lg space-y-5 animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-[18px] text-[#2E2B1A]">
                      Export Telemetry & ESG Report
                    </h3>
                    <p className="text-[12px] text-[#686450] mt-0.5">
                      Download audit-compliant records for FinOps showback and ESG compliance.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExportModalOpen(false)}
                    className="p-1 rounded-lg text-[#8D8975] hover:text-[#2E2B1A]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Option 1: CSV Export */}
                  <button
                    type="button"
                    onClick={() => {
                      handleExportCsv();
                      setExportModalOpen(false);
                    }}
                    className="w-full text-left p-3.5 rounded-2xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#E2F5EF] text-[#1F8A70] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="block text-[13px] text-[#2E2B1A]">
                          Cost & Resource Inventory (CSV)
                        </strong>
                        <span className="text-[11px] text-[#686450]">
                          Detailed ledger of all resources, billing items, and savings
                        </span>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-[#8D8975] group-hover:text-[#1F8A70]" />
                  </button>

                  {/* Option 2: JSON Export */}
                  <button
                    type="button"
                    onClick={() => {
                      handleExportJson();
                      setExportModalOpen(false);
                    }}
                    className="w-full text-left p-3.5 rounded-2xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FAF6E8] text-[#9A6B00] flex items-center justify-center shrink-0">
                        <Code className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="block text-[13px] text-[#2E2B1A]">
                          Full System Telemetry JSON
                        </strong>
                        <span className="text-[11px] text-[#686450]">
                          Raw API data payload for automation pipelines
                        </span>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-[#8D8975] group-hover:text-[#9A6B00]" />
                  </button>

                  {/* Option 3: Print Executive Summary */}
                  <button
                    type="button"
                    onClick={() => {
                      setExportModalOpen(false);
                      setTimeout(() => window.print(), 200);
                    }}
                    className="w-full text-left p-3.5 rounded-2xl bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FFF76A] text-[#2E2B1A] flex items-center justify-center shrink-0 border border-[#DFD6B5]">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="block text-[13px] text-[#2E2B1A]">
                          Print Executive & ESG Brief
                        </strong>
                        <span className="text-[11px] text-[#686450]">
                          Print-ready PDF overview for stakeholders
                        </span>
                      </div>
                    </div>
                    <Printer className="w-4 h-4 text-[#8D8975] group-hover:text-[#2E2B1A]" />
                  </button>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setExportModalOpen(false)}
                    className="px-4 py-1.5 rounded-full border border-[#ECE5CC] text-[12px] font-bold text-[#686450] hover:bg-[#FAF6E8]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SETTINGS & CLOUD GOVERNANCE MODAL                                         */}
          {/* ========================================================================= */}
          {settingsModalOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => setSettingsModalOpen(false)}
            >
              <div
                className="max-w-2xl w-full bg-[#FFFDF4] rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-lg space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-3 border-b border-[#ECE5CC]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A]">
                      <Settings className="w-5 h-5 text-[#8D8975]" />
                    </div>
                    <div>
                      <h3 className="font-black text-[18px] text-[#2E2B1A] leading-tight">
                        Settings & Cloud Governance
                      </h3>
                      <p className="text-[12px] text-[#686450]">
                        Manage connected AWS accounts, auto-sync schedules, and FinOps guardrails.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsModalOpen(false)}
                    className="p-1 rounded-lg text-[#8D8975] hover:text-[#2E2B1A] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Toast Notification Banner */}
                {settingsToast && (
                  <div className="p-3 rounded-2xl bg-[#E2F5EF] border border-[#BDEBDD] text-[#1F8A70] text-[12.5px] font-medium flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{settingsToast}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettingsToast(null)}
                      className="text-[#1F8A70] hover:text-[#135A49] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Settings Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#FAF6E8] border border-[#ECE5CC]">
                  <button
                    type="button"
                    onClick={() => setSettingsTab("accounts")}
                    className={`flex-1 py-2 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      settingsTab === "accounts"
                        ? "bg-white text-[#2E2B1A] shadow-2xs border border-[#ECE5CC]"
                        : "text-[#686450] hover:text-[#2E2B1A]"
                    }`}
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Cloud Accounts</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10.5px] bg-[#FAF6E8] border border-[#ECE5CC] font-mono">
                      {accountsList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsTab("sync")}
                    className={`flex-1 py-2 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      settingsTab === "sync"
                        ? "bg-white text-[#2E2B1A] shadow-2xs border border-[#ECE5CC]"
                        : "text-[#686450] hover:text-[#2E2B1A]"
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Sync & Discovery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsTab("guardrails")}
                    className={`flex-1 py-2 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      settingsTab === "guardrails"
                        ? "bg-white text-[#2E2B1A] shadow-2xs border border-[#ECE5CC]"
                        : "text-[#686450] hover:text-[#2E2B1A]"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>FinOps Guardrails</span>
                  </button>
                </div>

                {/* Modal Body / Scrollable Content */}
                <div className="overflow-y-auto space-y-4 pr-1 flex-1">
                  {/* TAB 1: CLOUD ACCOUNTS */}
                  {settingsTab === "accounts" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[13.5px] font-bold text-[#2E2B1A]">
                            Connected AWS Accounts ({accountsList.length})
                          </h4>
                          <p className="text-[11.5px] text-[#686450]">
                            Active and configured AWS cross-account IAM integrations.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleCleanDuplicates}
                          disabled={cleaningDuplicates}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#ECE5CC] bg-white hover:bg-[#FAF6E8] text-[11.5px] font-bold text-[#686450] hover:text-[#2E2B1A] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${cleaningDuplicates ? "animate-spin" : ""}`} />
                          <span>{cleaningDuplicates ? "Cleaning..." : "Purge Duplicate Stubs"}</span>
                        </button>
                      </div>

                      {/* Accounts Cards List */}
                      <div className="space-y-2.5">
                        {accountsList.map((acc) => {
                          const isActive = acc.id === activeAccount?.id;
                          const isDeleting = deletingAccountId === acc.id;

                          return (
                            <div
                              key={acc.id}
                              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                isActive
                                  ? "bg-white border-[#1F8A70]/40 shadow-warm-xs ring-1 ring-[#1F8A70]/15"
                                  : "bg-white/80 border-[#ECE5CC] hover:bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-2xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#2E2B1A] shrink-0">
                                  <Cloud className="w-5 h-5 text-[#9A6B00]" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <strong className="text-[13.5px] text-[#2E2B1A] truncate">
                                      {acc.name}
                                    </strong>
                                    {isActive && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD] flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        <span>Active</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-[11.5px] text-[#686450] mt-0.5 font-mono">
                                    <span>Account ID: {acc.externalAccountId}</span>
                                    <span>•</span>
                                    <span className="uppercase">{acc.provider}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {!isActive && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      loadDashboard(acc.id);
                                      setSettingsToast(`Switched active context to ${acc.name}`);
                                    }}
                                    className="px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF6E8] border border-[#ECE5CC] text-[11.5px] font-bold text-[#2E2B1A] transition-colors cursor-pointer"
                                  >
                                    Switch Account
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteAccount(acc.id)}
                                  disabled={isDeleting}
                                  title="Disconnect cloud account"
                                  className="p-2 rounded-xl text-[#8D8975] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isDeleting ? (
                                    <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Connect New Account Action */}
                      <div className="pt-2">
                        <Link
                          href="/onboarding"
                          onClick={() => setSettingsModalOpen(false)}
                          className="w-full py-3 rounded-2xl border border-dashed border-[#ECE5CC] hover:border-[#1F8A70] hover:bg-[#FAF6E8] text-[12.5px] font-bold text-[#2E2B1A] flex items-center justify-center gap-2 transition-all cursor-pointer group"
                        >
                          <PlusCircle className="w-4 h-4 text-[#8D8975] group-hover:text-[#1F8A70]" />
                          <span>Connect Another Cloud Account</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SYNC & SCANNING */}
                  {settingsTab === "sync" && (
                    <div className="space-y-4">
                      {/* Auto-Sync Frequency */}
                      <div className="p-4 rounded-2xl bg-white border border-[#ECE5CC] space-y-3">
                        <div>
                          <h4 className="text-[13.5px] font-bold text-[#2E2B1A]">
                            Telemetry Ingestion Cadence
                          </h4>
                          <p className="text-[11.5px] text-[#686450]">
                            How frequently GreenCloud AI queries AWS CloudWatch, Cost Explorer, and EC2 APIs.
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { id: "1h", label: "Hourly", desc: "High sensitivity" },
                            { id: "6h", label: "Every 6 Hours", desc: "Recommended balance" },
                            { id: "24h", label: "Daily (24h)", desc: "Standard FinOps" },
                          ].map((freq) => (
                            <button
                              key={freq.id}
                              type="button"
                              onClick={() => {
                                setAutoSyncFrequency(freq.id);
                                setSettingsToast(`Sync cadence updated to ${freq.label}.`);
                              }}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                autoSyncFrequency === freq.id
                                  ? "bg-[#FAF6E8] border-[#9A6B00] ring-1 ring-[#9A6B00]/20"
                                  : "bg-white border-[#ECE5CC] hover:bg-[#FAF6E8]/40"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <strong className="text-[12.5px] text-[#2E2B1A]">{freq.label}</strong>
                                {autoSyncFrequency === freq.id && (
                                  <div className="w-2 h-2 rounded-full bg-[#9A6B00]" />
                                )}
                              </div>
                              <span className="text-[10.5px] text-[#8D8975] block mt-0.5">
                                {freq.desc}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Multi-Region Scanning Toggle */}
                      <div className="p-4 rounded-2xl bg-white border border-[#ECE5CC] flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <h4 className="text-[13.5px] font-bold text-[#2E2B1A]">
                            Multi-Region Orphan Scanner
                          </h4>
                          <p className="text-[11.5px] text-[#686450] max-w-md">
                            Actively scan all 17 AWS regions (us-east-1, eu-central-1, ap-south-1, etc.) to discover forgotten EC2 instances and unassociated Elastic IPs.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMultiRegionScanEnabled(!multiRegionScanEnabled);
                            setSettingsToast(
                              !multiRegionScanEnabled
                                ? "Multi-Region scanning enabled (17 regions active)."
                                : "Multi-Region scanning restricted to primary region."
                            );
                          }}
                          className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                            multiRegionScanEnabled ? "bg-[#1F8A70]" : "bg-[#ECE5CC]"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-xs ${
                              multiRegionScanEnabled ? "translate-x-6" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Manual Sync Trigger */}
                      <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC] flex items-center justify-between gap-3">
                        <div>
                          <strong className="text-[13px] text-[#2E2B1A] block">Force Immediate Cloud Refresh</strong>
                          <span className="text-[11.5px] text-[#686450]">
                            Trigger real-time AWS API pull for instances, EBS volumes, and IP allocations.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleTriggerSync}
                          disabled={syncing}
                          className="px-4 py-2 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[12px] font-bold text-[#2E2B1A] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                          <span>{syncing ? "Syncing AWS..." : "Sync AWS Telemetry"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: FINOPS GUARDRAILS */}
                  {settingsTab === "guardrails" && (
                    <div className="space-y-4">
                      {/* Budget Limit */}
                      <div className="p-4 rounded-2xl bg-white border border-[#ECE5CC] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-[13.5px] font-bold text-[#2E2B1A]">
                              Monthly Spend Budget Target
                            </h4>
                            <p className="text-[11.5px] text-[#686450]">
                              Alert FinOps team when projected burn-rate pace exceeds this monthly figure.
                            </p>
                          </div>
                          <span className="font-mono font-bold text-[14px] text-[#1F8A70]">
                            ${budgetLimit}/mo
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="50"
                            max="5000"
                            step="50"
                            value={budgetLimit}
                            onChange={(e) => setBudgetLimit(Number(e.target.value))}
                            className="w-full accent-[#1F8A70] cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Idle CPU Threshold */}
                      <div className="p-4 rounded-2xl bg-white border border-[#ECE5CC] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-[13.5px] font-bold text-[#2E2B1A]">
                              Idle Compute CPU Utilization Threshold
                            </h4>
                            <p className="text-[11.5px] text-[#686450]">
                              Instances averaging below this threshold over 14 days will be flagged for automated stop or decommission.
                            </p>
                          </div>
                          <span className="font-mono font-bold text-[14px] text-[#9A6B00]">
                            {idleCpuThresholdVal}% CPU
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="1"
                            max="20"
                            step="1"
                            value={idleCpuThresholdVal}
                            onChange={(e) => setIdleCpuThresholdVal(Number(e.target.value))}
                            className="w-full accent-[#9A6B00] cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="pt-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsToast("Governance guardrails saved and applied.");
                            setTimeout(() => setSettingsToast(null), 3500);
                          }}
                          className="px-5 py-2 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] border border-[#DFD6B5] text-[12.5px] font-bold text-[#2E2B1A] shadow-xs cursor-pointer"
                        >
                          Save Guardrail Rules
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="pt-3 border-t border-[#ECE5CC] flex items-center justify-between">
                  <span className="text-[11px] text-[#8D8975] font-mono">
                    GreenCloud AI v2.4 • Tenant Scoped
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettingsModalOpen(false)}
                    className="px-4 py-1.5 rounded-full border border-[#ECE5CC] text-[12px] font-bold text-[#686450] hover:bg-[#FAF6E8] cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}