"use client";

import React, { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { ResourceDetailDrawer } from "./ResourceDetailDrawer";
import { DashboardData, DashboardTab, Ec2ResourceItem } from "./types";

interface ResourcesTabProps {
  data: DashboardData;
  onSelectTab: (tab: DashboardTab) => void;
}

type AssetView = "ec2" | "ebs" | "eip" | "regions";

export function ResourcesTab({ data, onSelectTab }: ResourcesTabProps) {
  const { resources, recommendations } = data;
  const [assetView, setAssetView] = useState<AssetView>("ec2");
  const [query, setQuery] = useState("");
  const [inspectedResource, setInspectedResource] = useState<Ec2ResourceItem | null>(null);

  const q = query.trim().toLowerCase();

  const filteredEc2 = useMemo(
    () =>
      (resources.ec2 || []).filter(
        (i) =>
          !q ||
          i.providerResourceId.toLowerCase().includes(q) ||
          i.accountName.toLowerCase().includes(q) ||
          i.provider.toLowerCase().includes(q) ||
          i.region.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          i.instanceType.toLowerCase().includes(q)
      ),
    [q, resources.ec2]
  );

  const filteredEbs = useMemo(
    () =>
      (resources.ebs || []).filter(
        (v) =>
          !q ||
          v.providerResourceId.toLowerCase().includes(q) ||
          v.accountName.toLowerCase().includes(q) ||
          v.region.toLowerCase().includes(q)
      ),
    [q, resources.ebs]
  );

  const filteredEips = useMemo(
    () =>
      (resources.eip || []).filter(
        (e) =>
          !q ||
          e.providerResourceId.toLowerCase().includes(q) ||
          e.accountName.toLowerCase().includes(q) ||
          e.region.toLowerCase().includes(q) ||
          e.publicIp.toLowerCase().includes(q)
      ),
    [q, resources.eip]
  );

  return (
    <div className="gc-panel-swap space-y-5">
      {/* Sub-tabs & Search Bar */}
      <div className="rounded-[24px] bg-[#FAF6E8] p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="m3-connected-h">
          {[
            { id: "ec2" as const, label: `Compute (${resources.ec2.length})` },
            { id: "ebs" as const, label: `Storage (${resources.ebs.length})` },
            { id: "eip" as const, label: `Elastic IPs (${resources.eip.length})` },
            { id: "regions" as const, label: `Regions (${resources.byRegion.length})` },
          ].map((tab) => {
            const selected = assetView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-selected={selected ? "true" : "false"}
                onClick={() => setAssetView(tab.id)}
                className={`m3-seg ${
                  selected
                    ? "bg-[#FFF76A] text-[#2E2B1A]"
                    : "bg-[#FFFDF4] text-[#686450] hover:text-[#2E2B1A]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#8D8975] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter ID, account, cloud, or region..."
            className="w-full rounded-full bg-[#FFFDF4] pl-9 pr-4 py-2 text-[12.5px] text-[#2E2B1A] placeholder:text-[#8D8975] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/30"
          />
        </div>
      </div>

      {/* Tables */}
      <div className="rounded-[28px] bg-[#FAF6E8] p-4 sm:p-5 overflow-x-auto">
        {assetView === "ec2" && (
          <>
            <div className="pb-2 text-[12px] text-[#686450]">
              Click any compute row to inspect CloudWatch CPU time-series, tags, and CO2e math.
            </div>
            <table className="w-full text-left border-separate border-spacing-y-2 min-w-[700px]">
              <thead>
                <tr className="text-[11.5px] font-bold text-[#686450]">
                  <th className="py-2 px-3">Instance</th>
                  <th className="py-2 px-3">Account / Cloud</th>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3">Region</th>
                  <th className="py-2 px-3">State</th>
                  <th className="py-2 px-3">Avg CPU</th>
                  <th className="py-2 px-3 text-right">Monthly</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {filteredEc2.length > 0 ? (
                  filteredEc2.map((inst) => (
                    <tr
                      key={inst.id}
                      onClick={() => setInspectedResource(inst)}
                      className="bg-[#FFFDF4] hover:bg-[#FFF9E2] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 rounded-l-[14px]">
                        <div className="font-bold text-[#2E2B1A] flex items-center gap-1.5">
                          <span>{inst.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#8D8975]" />
                        </div>
                        <div className="text-[11.5px] text-[#8D8975] code-font">
                          {inst.providerResourceId}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[12px]">
                        <div className="font-semibold text-[#2E2B1A]">{inst.accountName}</div>
                        <div className="text-[#8D8975] uppercase">{inst.provider}</div>
                      </td>
                      <td className="py-3 px-3 code-font text-[12.5px]">{inst.instanceType}</td>
                      <td className="py-3 px-3 text-[#686450]">{inst.region}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold text-[12px] ${
                            inst.lifecycleState === "running" ? "text-[#155E4B]" : "text-[#8D8975]"
                          }`}
                        >
                          {inst.lifecycleState}
                        </span>
                      </td>
                      <td className="py-3 px-3 tabular-nums">
                        {inst.avgCpu !== null ? `${inst.avgCpu.toFixed(1)}%` : "--"}
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums rounded-r-[14px]">
                        ${inst.monthlyCost.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[13px] text-[#686450]">
                      No compute instances matched across the selected accounts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {assetView === "ebs" && (
          <table className="w-full text-left border-separate border-spacing-y-2 min-w-[640px]">
            <thead>
              <tr className="text-[11.5px] font-bold text-[#686450]">
                <th className="py-2 px-3">Volume ID</th>
                <th className="py-2 px-3">Account / Cloud</th>
                <th className="py-2 px-3">Type & Size</th>
                <th className="py-2 px-3">Region</th>
                <th className="py-2 px-3">Attachment</th>
                <th className="py-2 px-3 text-right">Monthly</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {filteredEbs.length > 0 ? (
                filteredEbs.map((vol) => (
                  <tr key={vol.id} className="bg-[#FFFDF4]">
                    <td className="py-3 px-3 rounded-l-[14px] code-font text-[12.5px] font-semibold">
                      {vol.providerResourceId}
                    </td>
                    <td className="py-3 px-3 text-[12px]">
                      <div className="font-semibold text-[#2E2B1A]">{vol.accountName}</div>
                      <div className="text-[#8D8975] uppercase">{vol.provider}</div>
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      {vol.volumeType} · {vol.sizeGb} GB
                    </td>
                    <td className="py-3 px-3 text-[#686450]">{vol.region}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-bold text-[12px] ${
                          vol.lifecycleState === "available" || vol.lifecycleState === "unattached"
                            ? "text-[#9A6B00]"
                            : "text-[#155E4B]"
                        }`}
                      >
                        {vol.lifecycleState}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold tabular-nums rounded-r-[14px]">
                      ${vol.monthlyCost.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[13px] text-[#686450]">
                    No storage volumes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {assetView === "eip" && (
          <table className="w-full text-left border-separate border-spacing-y-2 min-w-[600px]">
            <thead>
              <tr className="text-[11.5px] font-bold text-[#686450]">
                <th className="py-2 px-3">Address</th>
                <th className="py-2 px-3">Account / Cloud</th>
                <th className="py-2 px-3">Region</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Monthly</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {filteredEips.length > 0 ? (
                filteredEips.map((ip) => (
                  <tr key={ip.id} className="bg-[#FFFDF4]">
                    <td className="py-3 px-3 rounded-l-[14px] code-font text-[12.5px] font-semibold">
                      {ip.publicIp}
                    </td>
                    <td className="py-3 px-3 text-[12px]">
                      <div className="font-semibold text-[#2E2B1A]">{ip.accountName}</div>
                      <div className="text-[#8D8975] uppercase">{ip.provider}</div>
                    </td>
                    <td className="py-3 px-3 text-[#686450]">{ip.region}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-bold text-[12px] ${
                          ip.lifecycleState === "unassociated"
                            ? "text-[#9A6B00]"
                            : "text-[#155E4B]"
                        }`}
                      >
                        {ip.lifecycleState}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold tabular-nums rounded-r-[14px]">
                      ${ip.monthlyCost.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[13px] text-[#686450]">
                    No Elastic IPs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {assetView === "regions" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {resources.byRegion.length > 0 ? (
              resources.byRegion.map((reg) => (
                <div key={reg.region} className="rounded-[20px] bg-[#FFFDF4] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[14px] font-bold text-[#2E2B1A]">{reg.region}</span>
                      <div className="text-[11.5px] text-[#8D8975]">{reg.name}</div>
                    </div>
                    <span className="text-[13px] font-extrabold text-[#9A6B00] tabular-nums">
                      ${reg.monthlyCost.toFixed(2)}/mo
                    </span>
                  </div>
                  <div className="text-[12px] text-[#686450] tabular-nums">
                    {reg.ec2Count} Compute · {reg.ebsCount} Storage · {reg.eipCount} IP ·{" "}
                    {reg.gridIntensity} g/kWh
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-[13px] text-[#686450]">
                No region resource allocations recorded yet.
              </div>
            )}
          </div>
        )}
      </div>

      <ResourceDetailDrawer
        resource={inspectedResource}
        recommendations={recommendations.items}
        onClose={() => setInspectedResource(null)}
        onJumpToActions={() => onSelectTab("actions")}
      />
    </div>
  );
}
