# Security Policy

## 1. Cloud Credentials & Security First

GreenCloud AI interacts with cloud infrastructure telemetry across AWS, Azure, and Google Cloud. Security and least-privilege access are core requirements.

### Critical Rule: Zero Committed Credentials
- **Never commit cloud credentials**, IAM secret keys, access tokens, environment passwords, or private API keys to this repository.
- Use environment variables, secret managers (such as HashiCorp Vault or AWS Secrets Manager), or local configuration files excluded via `.gitignore`.

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability or credential leak within GreenCloud AI, please report it responsibly rather than opening a public GitHub issue.

### Reporting Procedure
1. Send an email to the project maintainers detailing the vulnerability.
2. Include the following details in your report:
   - Type of issue (e.g., credential exposure, SQL injection, improper authorization).
   - Location in code or configuration files.
   - Steps to reproduce the issue safely.
3. The maintainers will acknowledge receipt within 48 hours and work on a prompt resolution.

---

## 3. Least-Privilege Security Principles

When connecting cloud accounts to GreenCloud AI:
- **Default Access**: Always use **read-only IAM roles** for cost ingestion, metric collection, and inventory scanning.
- **Automation Execution**: Automation and write roles for pull requests or resource modifications must be configured separately with policy guardrails (OPA/Rego) and explicit approval controls.
