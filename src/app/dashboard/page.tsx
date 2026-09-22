"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavigationBar } from "@/components/common/NavigationBar";
import { ScopeIndicator } from "@/components/common/ScopeIndicator";
import { ComplianceFooter } from "@/components/common/ComplianceFooter";

interface CloudAccount {
  id: string;
  provider: string;
  name: string;
  status: string;
  externalAccountId: string;
  syncFreshness: string | null;
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cloud-accounts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAccounts(data);
        }
      })
      .catch((err) => console.warn("Failed to fetch cloud accounts:", err))
      .finally(() => setLoading(false));
  }, []);

  const activeAccount = accounts[0];

  return (
    <div className="min-h-screen bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between selection:bg-[#FFF76A] selection:text-[#2E2B1A]">
      <NavigationBar />

      {activeAccount && (
        <ScopeIndicator
          accountName={activeAccount.name}
          externalAccountId={activeAccount.externalAccountId}
          syncFreshness={activeAccount.syncFreshness}
          readOnly={true}
        />
      )}

      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 w-full flex-grow py-8">
        {!activeAccount && !loading ? (
          <div className="max-w-xl mx-auto text-center p-8 bg-[#FAF6E8] rounded-[24px] border border-[#ECE5CC] shadow-warm-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF3D6] text-[#9A6B00] flex items-center justify-center mx-auto mb-4 border border-[#ECE5CC]">
              <span className="material-symbols-outlined text-[24px]">cloud_off</span>
            </div>
            <h2 className="text-[22px] font-bold text-[#2E2B1A] mb-2">No Cloud Account Connected</h2>
            <p className="text-[14px] text-[#686450] mb-6 leading-relaxed">
              Connect your AWS account via a read-only IAM role to start continuous cost and carbon analysis.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FFF76A] hover:bg-[#F5EC50] text-[#2E2B1A] font-bold text-[14px] border border-[#DFD6B5] shadow-sm"
            >
              <span>Start Cloud Setup</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#ECE5CC]">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#9A6B00] uppercase tracking-wider block mb-1">
                  STAGE 5: CLOUD OVERVIEW
                </span>
                <h1 className="text-[26px] font-black text-[#2E2B1A]">
                  Cloud Control Plane
                </h1>
              </div>
              <Link
                href="/onboarding"
                className="px-4 py-2 rounded-full bg-[#FAF6E8] hover:bg-[#FBF6E3] text-[#2E2B1A] border border-[#ECE5CC] text-[12.5px] font-bold font-mono inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Connect Account</span>
              </Link>
            </div>

            <div className="p-6 bg-[#FAF6E8] rounded-[22px] border border-[#ECE5CC]">
              <h3 className="font-bold text-[16px] text-[#2E2B1A] mb-1">Connected Environment</h3>
              <p className="text-[13px] text-[#686450]">
                Active AWS Account: <strong className="font-mono text-[#2E2B1A]">{activeAccount?.name} ({activeAccount?.externalAccountId})</strong>
              </p>
            </div>
          </div>
        )}
      </main>

      <ComplianceFooter />
    </div>
  );
}
