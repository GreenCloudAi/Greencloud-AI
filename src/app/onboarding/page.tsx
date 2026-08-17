"use client";

import React, { useState } from "react";
import { ShieldCheck, Cloud, Key, CheckCircle, ArrowRight, ExternalLink, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const router = useRouter();
  const [accountName, setAccountName] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [externalAccountId, setExternalAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !roleArn) {
      setError("Account Name and IAM Role ARN are required.");
      return;
    }

    if (!roleArn.startsWith("arn:aws:iam::")) {
      setError("Role ARN must follow format: arn:aws:iam::<AccountID>:role/<RoleName>");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/cloud-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountName,
          provider: "aws",
          externalAccountId: externalAccountId || roleArn.split(":")[4] || "123456789012",
          roleArn
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        // Automatically trigger sync for new account
        await fetch(`/api/cloud-accounts/${data.account.id}/sync`, { method: "POST" });
        setTimeout(() => router.push("/"), 1500);
      } else {
        setError(data.error || "Failed to register AWS account");
      }
    } catch (err: any) {
      setError("An unexpected connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", paddingTop: "20px" }} className="animate-fade-in">
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div 
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            color: "#10b981"
          }}
        >
          <ShieldCheck style={{ width: "28px", height: "28px" }} />
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff" }}>Connect AWS Account</h2>
        <p style={{ fontSize: "0.9rem", color: "#9ca3af", marginTop: "4px" }}>
          Secure, read-only connection via AWS STS Cross-Account IAM Role. No static access keys required.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: "32px" }}>
        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <CheckCircle style={{ width: "48px", height: "48px", color: "#10b981", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff" }}>AWS Account Connected!</h3>
            <p style={{ color: "#9ca3af", marginTop: "8px" }}>Triggering initial billing & telemetry ingestion sync... Redirecting to dashboard.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {error && (
              <div 
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  color: "#fb7185",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <AlertCircle style={{ width: "16px", height: "16px" }} />
                {error}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#e5e7eb", marginBottom: "6px" }}>
                Cloud Account Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acme AWS Production"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border-subtle)",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#e5e7eb", marginBottom: "6px" }}>
                AWS IAM Cross-Account Role ARN
              </label>
              <input
                type="text"
                placeholder="arn:aws:iam::112233445566:role/GreenCloudReadOnlyRole"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid var(--border-subtle)",
                  color: "#fff",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "6px" }}>
                Requires ReadOnlyAccess permissions for EC2, EBS, CloudWatch, and Cost Explorer.
              </p>
            </div>

            <div style={{ padding: "16px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#34d399", marginBottom: "4px" }}>
                Security & Zero-Write Policy
              </h4>
              <p style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
                GreenCloud AI standard connector requires **zero write permissions** on your AWS account. All recommendations are presented for human review before execution.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#0a0d14",
                fontSize: "0.95rem",
                fontWeight: 700,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 20px rgba(16, 185, 129, 0.3)"
              }}
            >
              {loading ? "Validating IAM Role..." : "Connect AWS Account"}
              {!loading && <ArrowRight style={{ width: "18px", height: "18px" }} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
