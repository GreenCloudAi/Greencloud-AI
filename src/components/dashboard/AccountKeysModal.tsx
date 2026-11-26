"use client";

import React, { useState } from "react";
import { Check, KeyRound, Trash2, X } from "lucide-react";
import { CloudAccountSummary } from "./types";

interface AccountKeysModalProps {
  account: CloudAccountSummary | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function AccountKeysModal({
  account,
  open,
  onClose,
  onUpdated,
}: AccountKeysModalProps) {
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  if (!open || !account) return null;

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    setStatusMsg(null);

    if (!accessKeyId.trim() || !secretAccessKey.trim()) {
      setErrMsg("Provide both Access Key ID and Secret Access Key.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/cloud-accounts/${account.id}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || "Failed to save credentials.");
      }
      setAccessKeyId("");
      setSecretAccessKey("");
      setStatusMsg("Credentials encrypted with AES-256-GCM and stored.");
      onUpdated();
    } catch (err: any) {
      setErrMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePurgeKeys = async () => {
    setBusy(true);
    setErrMsg(null);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/cloud-accounts/${account.id}/credentials`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || "Failed to remove credentials.");
      }
      setStatusMsg("Stored credentials removed from database.");
      onUpdated();
    } catch (err: any) {
      setErrMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setErrMsg(null);
    try {
      const res = await fetch(`/api/cloud-accounts/${account.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to disconnect account.");
      }
      onUpdated();
      onClose();
    } catch (err: any) {
      setErrMsg(err.message);
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2E2B1A]/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="gc-panel-swap w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-[28px] bg-[#FFFDF4] p-6 shadow-warm-xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF6E8] flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-[#155E4B]" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#2E2B1A]">
                Account & IAM Credentials
              </h2>
              <p className="text-[12.5px] text-[#686450]">
                {account.name} · <span className="code-font">{account.externalAccountId}</span>
              </p>
            </div>
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

        {account.roleArn && (
          <div className="rounded-[18px] bg-[#FAF6E8] p-3.5 space-y-1">
            <div className="text-[11.5px] font-bold text-[#686450]">IAM Role ARN</div>
            <div className="text-[12px] code-font text-[#2E2B1A] break-all">
              {account.roleArn}
            </div>
          </div>
        )}

        {statusMsg && (
          <div className="p-3 rounded-[16px] bg-[#E2F5EF] text-[#155E4B] text-[12.5px] font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errMsg && (
          <div className="p-3 rounded-[16px] bg-[#FEE2E2] text-[#991B1B] text-[12.5px] font-semibold">
            {errMsg}
          </div>
        )}

        <form onSubmit={handleSaveKeys} className="rounded-[22px] bg-[#FAF6E8] p-4 space-y-3.5">
          <div className="text-[13px] font-bold text-[#2E2B1A]">
            Update Static IAM Access Keys (Optional)
          </div>
          <p className="text-[12px] text-[#686450]">
            Encrypted with AES-256-GCM before saving. Leave unused if runtime uses STS IAM roles.
          </p>
          <div className="space-y-2.5">
            <input
              type="text"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="AWS Access Key ID (AKIA...)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF4] text-[12.5px] code-font text-[#2E2B1A] placeholder:text-[#8D8975] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/35"
            />
            <input
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              placeholder="AWS Secret Access Key"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFDF4] text-[12.5px] code-font text-[#2E2B1A] placeholder:text-[#8D8975] focus:outline-none focus:ring-2 focus:ring-[#155E4B]/35"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={handlePurgeKeys}
              className="text-[12px] font-semibold text-[#686450] hover:text-[#991B1B] transition-colors cursor-pointer"
            >
              Purge saved keys
            </button>
            <button
              type="submit"
              disabled={busy}
              className="m3-btn m3-btn-compact m3-pastel-sun text-[12.5px]"
            >
              {busy ? "Saving..." : "Save encrypted keys"}
            </button>
          </div>
        </form>

        <div className="rounded-[20px] bg-[#FBE7CB]/60 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-bold text-[#2E2B1A]">Disconnect account</div>
            <div className="text-[12px] text-[#686450]">
              Removes stored telemetry and credentials for this AWS account.
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleDisconnect}
            className="m3-btn m3-btn-compact bg-[#FEE2E2] hover:bg-[#FECACA] text-[#991B1B] text-[12px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );
}
