"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [externalId, setExternalId] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!/^\d{12}$/.test(accountId)) {
      setError("AWS Account ID must be exactly 12 digits.");
      setLoading(false);
      return;
    }

    if (!roleArn.startsWith("arn:aws:iam::")) {
      setError("Role ARN must follow format: arn:aws:iam::<account-id>:role/<role-name>");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/cloud-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "aws",
          externalAccountId: accountId,
          name,
          roleArn
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      setSuccess(true);
      setName("");
      setAccountId("");
      setRoleArn("");
      setExternalId("");
    } catch (err: any) {
      setError(err.message || "Failed to connect cloud account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <header className="page-header">
        <div className="page-title">
          <h1>Connect AWS Account</h1>
          <p>Establish secure integration using cross-account IAM role assumption.</p>
        </div>
      </header>

      {success ? (
        <div className="card" style={{ borderColor: "var(--accent-green)", textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "3rem", color: "var(--accent-green)", marginBottom: "1rem" }}>✓</div>
          <h2 style={{ marginBottom: "1rem" }}>AWS Account Connected!</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
            The cloud account was connected using IAM OIDC cross-account role integration. No static keys were stored or shared.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => router.push("/")}>
              Go to Dashboard
            </button>
            <button className="btn btn-secondary" onClick={() => setSuccess(false)}>
              Connect Another Account
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Main Form */}
          <form className="card glow-green" onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: "1.5rem" }}>Role-Based Access Control Connection</h3>

            {error && (
              <div className="card" style={{ borderColor: "var(--accent-red)", padding: "1rem", marginBottom: "1.5rem", backgroundColor: "rgba(255, 0, 0, 0.05)" }}>
                <p style={{ color: "hsl(0, 85%, 60%)", fontWeight: 600, fontSize: "0.9rem" }}>Error: {error}</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Connection Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. AWS Production Billing" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                A recognizable title for this cloud account connection.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">AWS 12-Digit Account ID</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. 123456789012" 
                maxLength={12}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target IAM Role ARN</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="arn:aws:iam::123456789012:role/GreenCloudReadRole" 
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                required
              />
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                The ARN of the role GreenCloud AI will assume.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">External ID (Optional / Recommended)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. greencloud_external_sec_token" 
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
              />
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                Used in the STS assume role session to prevent confused deputy attacks.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={loading}>
              {loading ? "Validating Role Connection..." : "Securely Connect AWS Account"}
            </button>
          </form>

          {/* Security details cards */}
          <section className="card" style={{ borderLeft: "4px solid var(--accent-blue)" }}>
            <h4 style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Security Policy & Least-Privilege IAM Setup
            </h4>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              GreenCloud connects via cross-account IAM role assumption. We never require or store static security keys (such as AWS Access Key IDs and Secret Access Keys), removing credential leakage risks entirely.
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              To initialize the connection, create an IAM Role in your AWS Console with the following trust policy, granting **Read-Only Permissions** (no write operations are required):
            </p>
            <pre style={{ 
              backgroundColor: "var(--bg-surface)", 
              padding: "1rem", 
              borderRadius: "8px", 
              border: "1px solid var(--border-color)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              overflowX: "auto",
              color: "var(--text-secondary)"
            }}>
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::888877776666:root" // GreenCloud SaaS Account
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "greencloud_external_sec_token"
        }
      }
    }
  ]
}`}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}
