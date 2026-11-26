"use client";

import React, { useState } from "react";
import { Check, Upload, X } from "lucide-react";
import { CloudProviderId } from "./types";

interface FocusImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const SAMPLE_MULTI_CLOUD_FOCUS = JSON.stringify(
  [
    {
      ProviderName: "gcp",
      SubAccountId: "gcp-prod-analytics",
      SubAccountName: "GCP Analytics Prod",
      RegionId: "us-central1",
      ServiceName: "Compute Engine",
      ServiceCategory: "Compute",
      ChargeCategory: "Usage",
      ChargePeriodStart: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
      BilledCost: 142.8,
      EffectiveCost: 118.4,
      ResourceId: "gce-worker-pool-01",
      InstanceType: "n2-standard-4",
      LifecycleState: "running",
      CpuPercent: 18.5,
      Tags: { Environment: "Production", Team: "Data" },
    },
    {
      ProviderName: "azure",
      SubAccountId: "sub-8931-core",
      SubAccountName: "Azure Core Subscription",
      RegionId: "swedencentral",
      ServiceName: "Azure Virtual Machines",
      ServiceCategory: "Compute",
      ChargeCategory: "Usage",
      ChargePeriodStart: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
      BilledCost: 96.4,
      EffectiveCost: 82.0,
      ResourceId: "vm-api-edge-02",
      InstanceType: "Standard_D4s_v5",
      LifecycleState: "running",
      CpuPercent: 34.0,
      Tags: { Environment: "Production", Team: "Platform" },
    },
  ],
  null,
  2
);

export function FocusImportModal({ open, onClose, onImported }: FocusImportModalProps) {
  const [provider, setProvider] = useState<CloudProviderId>("gcp");
  const [accountName, setAccountName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [region, setRegion] = useState("us-central1");
  const [payloadText, setPayloadText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setPayloadText(text);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!payloadText.trim()) {
      setError("Paste CNCF FOCUS JSON records, upload a CSV/JSON export, or load sample schema.");
      return;
    }

    setBusy(true);
    try {
      let body: Record<string, any> = {
        provider,
        accountName: accountName.trim() || undefined,
        externalAccountId: externalId.trim() || undefined,
        primaryRegion: region,
      };

      const trimmed = payloadText.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed);
        body.records = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        body.csv = trimmed;
      }

      const res = await fetch("/api/cloud-accounts/import-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Import failed");
      }

      setSuccessMsg(
        `Imported ${json.lineItemsImported} FOCUS record(s) across ${json.accountsTouched} account(s).`
      );
      onImported();
    } catch (err: any) {
      setError(err.message || "Unable to parse or import FOCUS billing data.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2E2B1A]/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="gc-panel-swap w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-[28px] bg-[#FFFDF4] p-6 shadow-warm-xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-bold text-[#2E2B1A]">
              Import CNCF FOCUS Billing & Inventory
            </h2>
            <p className="text-[12.5px] text-[#686450]">
              Ingest AWS Data Exports, GCP BigQuery FOCUS exports, or Azure FOCUS datasets into your multi-cloud ledger.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-[#FAF6E8] hover:bg-[#F5EED6] flex items-center justify-center text-[#2E2B1A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-[16px] bg-[#FEE2E2] p-3 text-[12.5px] font-semibold text-[#991B1B]">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-[16px] bg-[#E2F5EF] p-3 text-[12.5px] font-semibold text-[#155E4B] flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11.5px] font-bold text-[#2E2B1A] mb-1">
                Default Provider
              </label>
              <select
                value={provider}
                onChange={(e) => {
                  const p = e.target.value as CloudProviderId;
                  setProvider(p);
                  if (p === "gcp") setRegion("us-central1");
                  else if (p === "azure") setRegion("swedencentral");
                  else setRegion("us-east-1");
                }}
                className="w-full rounded-xl bg-[#FAF6E8] px-3 py-2 text-[12.5px] font-semibold text-[#2E2B1A]"
              >
                <option value="gcp">Google Cloud (GCP)</option>
                <option value="azure">Microsoft Azure</option>
                <option value="aws">Amazon Web Services</option>
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-[#2E2B1A] mb-1">
                Account / Project Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Optional fallback name"
                className="w-full rounded-xl bg-[#FAF6E8] px-3 py-2 text-[12.5px] text-[#2E2B1A]"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-[#2E2B1A] mb-1">
                Account / Subscription ID
              </label>
              <input
                type="text"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="Optional fallback ID"
                className="w-full rounded-xl bg-[#FAF6E8] px-3 py-2 text-[12.5px] code-font text-[#2E2B1A]"
              />
            </div>
          </div>

          <div className="rounded-[20px] bg-[#FAF6E8] p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-[#2E2B1A]">
                FOCUS JSON / CSV Export Data
              </span>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-[12px] font-semibold text-[#155E4B] hover:underline inline-flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload CSV/JSON</span>
                  <input
                    type="file"
                    accept=".json,.csv,text/csv,application/json"
                    onChange={handleFilePick}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setPayloadText(SAMPLE_MULTI_CLOUD_FOCUS)}
                  className="text-[12px] font-semibold text-[#686450] hover:text-[#2E2B1A] cursor-pointer"
                >
                  Load FOCUS template
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              placeholder='Paste FOCUS CSV (ProviderName,SubAccountId,RegionId,ServiceName,BilledCost,EffectiveCost,...) or JSON array...'
              className="w-full rounded-xl bg-[#FFFDF4] p-3 text-[11.5px] code-font text-[#2E2B1A] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/30"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="m3-btn m3-btn-compact m3-pastel-oat">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="m3-btn m3-btn-compact m3-pastel-sun">
              {busy ? "Importing..." : "Ingest FOCUS data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
