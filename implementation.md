# GreenCloud AI - Production Master Implementation Roadmap (agent.md)

## 📌 Project Overview & Master Goal
GreenCloud AI is a FinOps and GreenOps platform designed to connect cloud billing, resource inventory, telemetry, and carbon-intensity data into evidence-backed recommendations with safe human-in-the-loop automation.

This file tracks the **10-Chunk Modular Implementation Plan**. To avoid context limit overflow and ensure high code quality, implementation is executed chunk-by-chunk with explicit tracking.

---

## 🚦 Master Progress Tracker

| Chunk | Module / Feature Scope | Status | Completion % | Artifacts / Changes |
| :--- | :--- | :---: | :---: | :--- |
| **Chunk 1** | Schema Expansion & AWS Real CloudWatch/EC2 Telemetry Connector | 🔄 **In Progress** | 0% | Prisma Schema, `awsConnector.ts`, `ingestion.ts` |
| **Chunk 2** | Multi-Cloud Ingestion (Azure & GCP Read-Only Connectors) | ⏳ Pending | 0% | `azureConnector.ts`, `gcpConnector.ts` |
| **Chunk 3** | Carbon Footprint Engine (CCF + Electricity Maps + SCI Model) | ⏳ Pending | 0% | `carbonEngine.ts`, Grid API |
| **Chunk 4** | Evidence-Backed Recommendation Engine & Quantitative Risk Scoring | ⏳ Pending | 0% | `recommendationEngine.ts` |
| **Chunk 5** | Kubernetes Cost Allocation & OpenCost Metric Integration | ⏳ Pending | 0% | `k8sService.ts` |
| **Chunk 6** | Demand Forecasting & Cost/Carbon Anomaly Spike Detection | ⏳ Pending | 0% | `forecastingService.ts`, Anomaly Engine |
| **Chunk 7** | Policy-as-Code, Terraform PR Generator & Jira Ticket Sync | ⏳ Pending | 0% | `ticketService.ts`, PR Generator |
| **Chunk 8** | Execution Engine, Dry-Run Guardrails & Auto-Rollback Watcher | ⏳ Pending | 0% | `executionEngine.ts`, Watcher Service |
| **Chunk 9** | Interactive Next.js Dashboard UI (FinOps, GreenOps & Action Center) | ⏳ Pending | 0% | `src/app/*`, Chart components |
| **Chunk 10**| Enterprise RBAC, Multi-Tenant Audit Logging & Comprehensive E2E Suite | ⏳ Pending | 0% | Audit suite, `run-e2e.js` |

**Overall Project Completion: 0%**

---

## 🛠️ Chunk 1 Detailed Plan: Standardized Schema & AWS Real Connector Engine
**Goal**: Transition from mock simulators to a robust, resilient data connector and extended database schema.

### Scope & Deliverables for Chunk 1:
1. **Prisma Schema Expansion**:
   - Add fields for telemetry CPU/Memory metrics history, cloud tags, region, account status, and metric data points.
   - Update SQLite DB via `prisma db push`.
2. **AWS Cloud Connector Refactoring (`awsConnector.ts`)**:
   - Implement real AWS STS cross-account IAM role assumption (`AssumeRoleCommand`).
   - Implement real CloudWatch client (`CloudWatchClient`, `GetMetricDataCommand`) to retrieve real 7-day average/peak CPU and Memory metrics.
   - Implement EC2 (`DescribeInstances`), EBS (`DescribeVolumes`), EIP (`DescribeAddresses`), and Cost Explorer (`GetCostAndUsage`).
   - Handle API errors gracefully (rate limits, missing permissions) with automatic fallback flags and detailed diagnostic error logging.
3. **Ingestion Service Update (`ingestion.ts`)**:
   - Update sync pipeline to ingest real CloudWatch metrics, store exact telemetry series, and log audit entries for every ingestion sync.
4. **Verification**:
   - Verify DB schema push and unit/integration verification script for Chunk 1.

---

## 📝 Progress Log & History
- **2026-08-08**: Master roadmap created in `agent.md`. Chunk 1 defined for immediate execution upon approval. 