"use client";

import React, { useState, useMemo } from "react";
import {
  Server,
  Search,
  Filter,
  Cpu,
  HardDrive,
  Network,
  Leaf,
  Globe,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface ResourceCarbonViewProps {
  data: any;
  onNavigateSubTab: (subTab: string) => void;
}

export function ResourceCarbonView({ data, onNavigateSubTab }: ResourceCarbonViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const ec2List: any[] = data?.resources?.ec2 || [];
  const ebsList: any[] = data?.resources?.ebs || [];
  const eipList: any[] = data?.resources?.eip || [];
  const allResources = [...ec2List, ...ebsList, ...eipList];

  const filteredResources = useMemo(() => {
    return allResources.filter((res) => {
      const name = res.instanceName || res.providerResourceId || "";
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.resourceType.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedType !== "all" && res.resourceType !== selectedType) return false;
      return true;
    });
  }, [allResources, searchQuery, selectedType]);

  const cleanCount = allResources.filter((r) => r.regionFlag === "🇺🇸" && r.region === "us-west-2").length;
  const highCarbonCount = allResources.filter((r) => r.region === "ap-south-1" || r.region === "ap-southeast-1").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-[#ECE5CC] p-6 shadow-warm-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ECE5CC] gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6E8] border border-[#ECE5CC] flex items-center justify-center text-[#9A6B00]">
                <Server className="w-4 h-4" />
              </div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">Resource Carbon Attribution</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E2F5EF] text-[11px] font-bold text-[#1F8A70] border border-[#BDEBDD]">
                {allResources.length} Tracked Assets
              </span>
            </div>
            <p className="text-[13px] text-[#686450] mt-1">
              Per-instance carbon accounting across active compute, attached storage volumes, and network primitives.
            </p>
          </div>

          <span className="text-[12px] font-mono font-bold text-[#8D8975]">
            Embodied + Operational Footprint Ledger
          </span>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Total Monitored Resources
            </span>
            <span className="text-[26px] font-black text-[#2E2B1A]">
              {allResources.length} Assets
            </span>
            <span className="text-[11px] text-[#1F8A70] block mt-1 font-semibold">
              {ec2List.length} EC2 · {ebsList.length} EBS · {eipList.length} EIP
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              Ultra Clean Grid Placements
            </span>
            <span className="text-[26px] font-black text-[#1F8A70]">
              {cleanCount} Assets
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1">
              Deployed in low-emission hydro/wind zones
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6E8]/40 border border-[#ECE5CC]">
            <span className="text-[11px] font-mono text-[#8D8975] uppercase font-bold block mb-1">
              High Carbon Thermal Zones
            </span>
            <span className={`text-[26px] font-black ${highCarbonCount > 0 ? "text-[#9A6B00]" : "text-[#1F8A70]"}`}>
              {highCarbonCount} Assets
            </span>
            <span className="text-[11px] text-[#8D8975] block mt-1">
              Candidates for carbon-aware regional migration
            </span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#8D8975] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by resource, region, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAF6E8]/50 border border-[#ECE5CC] text-[12.5px] text-[#2E2B1A] placeholder-[#8D8975] focus:outline-none focus:border-[#1F8A70]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {[
              { id: "all", label: `All (${allResources.length})` },
              { id: "ec2", label: `EC2 (${ec2List.length})` },
              { id: "ebs", label: `EBS (${ebsList.length})` },
              { id: "eip", label: `EIP (${eipList.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-all cursor-pointer ${
                  selectedType === tab.id
                    ? "bg-[#1F8A70] text-white shadow-2xs"
                    : "bg-[#FAF6E8] text-[#686450] hover:text-[#2E2B1A] border border-[#ECE5CC]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resource Carbon Table */}
        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-[#ECE5CC] font-mono text-[11px] text-[#8D8975] uppercase">
                <th className="py-2.5">Resource Name / ID</th>
                <th className="py-2.5">Type &amp; Region</th>
                <th className="py-2.5">Operational (Scope 2)</th>
                <th className="py-2.5">Embodied (Scope 3)</th>
                <th className="py-2.5">Gross Footprint</th>
                <th className="py-2.5">Grid Factor</th>
                <th className="py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECE5CC]/50">
              {filteredResources.length > 0 ? (
                filteredResources.map((res: any) => {
                  const isEc2 = res.resourceType === "ec2";
                  const isEbs = res.resourceType === "ebs";
                  const isEip = res.resourceType === "eip";
                  const IconComp = isEc2 ? Cpu : isEbs ? HardDrive : Network;

                  const carbon = res.carbonEmissions?.[0];
                  const op = carbon?.operationalGco2e || 0;
                  const emb = carbon?.embodiedGco2e || 0;
                  const total = op + emb;

                  const isHighCarbon = res.region === "ap-south-1" || res.region === "ap-southeast-1";

                  return (
                    <tr key={res.id} className="hover:bg-[#FAF6E8]/40 transition-colors">
                      <td className="py-3 font-bold text-[#2E2B1A]">
                        <div className="flex items-center gap-2">
                          <IconComp className="w-3.5 h-3.5 text-[#8D8975] shrink-0" />
                          <div>
                            <span className="block">{res.instanceName || res.providerResourceId}</span>
                            <span className="font-mono text-[10.5px] text-[#8D8975]">
                              {res.providerResourceId} {res.instanceType ? `· ${res.instanceType}` : ""} {res.sizeGb ? `· ${res.sizeGb} GB` : ""}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <span>{res.regionFlag || "🌐"}</span>
                          <span className="font-mono text-[11px] text-[#2E2B1A] font-semibold">{res.region}</span>
                        </div>
                      </td>
                      <td className="py-3 font-mono font-bold text-[#1F8A70]">
                        {op.toFixed(1)} gCO2e
                      </td>
                      <td className="py-3 font-mono text-[#9A6B00]">
                        {emb.toFixed(1)} gCO2e
                      </td>
                      <td className="py-3 font-mono font-bold text-[#2E2B1A]">
                        {total.toFixed(1)} gCO2e
                      </td>
                      <td className="py-3 text-[11px] font-mono text-[#686450]">
                        {isHighCarbon ? "680 g/kWh" : "420 g/kWh"}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          isHighCarbon
                            ? "bg-[#FFF3D6] text-[#9A6B00] border border-[#ECE5CC]"
                            : "bg-[#E2F5EF] text-[#1F8A70] border border-[#BDEBDD]"
                        }`}>
                          {isHighCarbon ? "High Carbon" : "Moderate"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#8D8975]">
                    No resources found matching your search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
