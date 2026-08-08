# GreenCloud AI - Production Master Implementation Roadmap (agent.md)

## 📌 Project Overview & Master Goal
GreenCloud AI is a FinOps and GreenOps decision platform designed to connect cloud billing, resource inventory, telemetry, and carbon-intensity data into evidence-backed recommendations with safe human-in-the-loop automation.

This file tracks the **10-Chunk Modular Implementation Plan**. Implementation is executed chunk-by-chunk with explicit tracking.

---

## 🚦 Master Progress Tracker

| Chunk | Module / Feature Scope | Status | Completion % | Key Artifacts & Changes |
| :--- | :--- | :---: | :---: | :--- |
| **Chunk 1** | Schema Expansion & AWS Real CloudWatch/EC2 Telemetry Connector | ✅ **Completed** | 100% | `schema.prisma`, `awsConnector.ts`, `ingestion.ts`, `carbonEngine.ts`, `recommendationEngine.ts` |
| **Chunk 2** | Multi-Cloud Ingestion (Azure & GCP Read-Only Connectors) | ⏳ Pending | 0% | `azureConnector.ts`, `gcpConnector.ts` |
| **Chunk 3** | Carbon Footprint Engine (CCF + Electricity Maps + SCI Model) | ⏳ Pending | 0% | Grid Intensity API, SCI Metrics |
| **Chunk 4** | Evidence-Backed Recommendation Engine & Quantitative Risk Scoring | ⏳ Pending | 0% | Advanced Risk Scoring heuristics |
| **Chunk 5** | Kubernetes Cost Allocation & OpenCost Metric Integration | ⏳ Pending | 0% | `k8sService.ts`, Pod cost metrics |
| **Chunk 6** | Demand Forecasting & Cost/Carbon Anomaly Spike Detection | ⏳ Pending | 0% | `forecastingService.ts`, Anomaly Engine |
| **Chunk 7** | Policy-as-Code, Terraform PR Generator & Jira Ticket Sync | ⏳ Pending | 0% | PR Engine, Jira Bidirectional Sync |
| **Chunk 8** | Execution Engine, Dry-Run Guardrails & Auto-Rollback Watcher | ⏳ Pending | 0% | `executionEngine.ts`, SLO Watcher |
| **Chunk 9** | Interactive Next.js Dashboard UI (FinOps, GreenOps & Action Center) | ⏳ Pending | 0% | `src/app/*`, Recharts & Dark Mode |
| **Chunk 10**| Enterprise RBAC, Multi-Tenant Audit Logging & Comprehensive E2E Suite | ⏳ Pending | 0% | RBAC Middleware & E2E Validation |

**Overall Project Completion: 10% (1 of 10 Chunks Completed)**

---

## 🛠️ Chunk 1 Summary of Completed Work

### 1. Database Schema (`prisma/schema.prisma`)
- Added `telemetryMetrics` JSON field to store historical CPU/Memory telemetry series per resource.
- Expanded `CloudAccount` status tracking with `syncFreshness` and `syncError`.
- Configured SQLite database `dev.db` and synchronized via `npx prisma db push`.

### 2. Real AWS Connector (`src/services/awsConnector.ts`)
- Implemented AWS STS `AssumeRoleCommand` for cross-account IAM role session authorization without static access keys.
- Integrated `@aws-sdk/client-cloudwatch` (`GetMetricDataCommand`) to query real 7-day average and peak CPU metrics.
- Added live query handlers for EC2 (`DescribeInstances`), EBS (`DescribeVolumes`), Elastic IPs (`DescribeAddresses`), and Cost Explorer (`GetCostAndUsage`) with fallback simulation.

### 3. Carbon Engine (`src/services/carbonEngine.ts`)
- Implemented operational carbon footprint calculation (`Energy (kWh) * Grid Intensity (gCO2e/kWh)`).
- Included thermal design power (TDP) per EC2 instance type and embodied carbon metrics.

### 4. Recommendation & Evidence Engine (`src/services/recommendationEngine.ts`)
- Added rule evaluators for unattached EBS volume deletion, unassociated Elastic IP release, and EC2 rightsizing.
- Created trace evidence generation containing exact calculation formulas and suggested human actions.

### 5. Ingestion Engine (`src/services/ingestion.ts`)
- Connected database, cloud connector, carbon engine, and recommendation engine into a resilient ingestion pipeline.
- Added audit log tracking (`AuditLog`) for ingestion completion and error metadata.

### 6. E2E Test Suite (`scripts/run-e2e.js`)
- Comprehensive test suite covering multi-tenant access isolation, IAM role ARN verification, sync freshness timestamps, evidence traceability, and human approval workflow.

---

## 📝 Next Deliverable: Chunk 2
- **Scope**: Azure & GCP Read-Only Connectors (`azureConnector.ts` and `gcpConnector.ts`) normalizing multi-cloud resources into FOCUS schema format.
