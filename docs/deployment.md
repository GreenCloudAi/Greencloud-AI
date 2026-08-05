# Architecture & Deployment Topology

## 1. Deployment Diagram

```mermaid
flowchart TB
  subgraph SaaS_VPC[GreenCloud AI SaaS VPC]
    LB[Load Balancer]
    K8S[Kubernetes Cluster]
    DB[(Managed PostgreSQL/Timescale)]
    OLAP[(ClickHouse Cluster)]
    S3[(Object Storage)]
    Queue[(Kafka/Redpanda)]
    Vault[Secrets/KMS]
    Obs[Prometheus/Grafana/Loki/Tempo]
  end
  subgraph CustomerCloud[Customer Cloud Accounts]
    ReadRole[Read-only role]
    WriteRole[Optional automation role]
    BillingExports[Billing Exports]
    MetricsAPI[Metrics APIs]
  end
  subgraph DevWorkflow[Customer Dev Workflow]
    GitRepo[GitHub/GitLab]
    CICD[CI/CD]
  end
  User[Browser] --> LB --> K8S
  K8S --> DB
  K8S --> OLAP
  K8S --> S3
  K8S --> Queue
  K8S --> Vault
  K8S --> Obs
  K8S --> ReadRole
  K8S --> WriteRole
  K8S --> BillingExports
  K8S --> MetricsAPI
  K8S --> GitRepo
  GitRepo --> CICD
```

**Explanation:** Deployment is SaaS-first but can support private deployment for regulated customers.

---

## 2. State Diagram — Recommendation Lifecycle

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Active: evidence complete
  Active --> Claimed: owner assigned
  Claimed --> Approved: approval granted
  Claimed --> Dismissed: not applicable
  Active --> Expired: stale metrics
  Approved --> Scheduled: change window set
  Scheduled --> Executing
  Executing --> Monitoring
  Monitoring --> Successful: no regression
  Monitoring --> RolledBack: SLO/cost regression
  Successful --> Verified: savings confirmed
  Dismissed --> [*]
  Expired --> [*]
  Verified --> [*]
  RolledBack --> Active: regenerate safer recommendation
```

**Explanation:** Recommendations are first-class lifecycle objects, not one-time alerts.

---

## 3. System Design & Data Flow Diagrams (DFDs)

### 3.1 Context Diagram

```mermaid
flowchart LR
  Org[Customer Organization]
  Green[GreenCloud AI]
  AWS[AWS]
  Azure[Azure]
  GCP[Google Cloud]
  Carbon[Carbon Data Providers]
  Git[Git/CI/CD]
  ITSM[Slack/Jira/ServiceNow]
  Org --> Green
  Green --> AWS
  Green --> Azure
  Green --> GCP
  Green --> Carbon
  Green --> Git
  Green --> ITSM
```

### 3.2 DFD Level 0

```mermaid
flowchart TB
  User[User] --> P0[GreenCloud AI Platform]
  Cloud[Cloud Providers] --> P0
  Carbon[Carbon Data] --> P0
  P0 --> Reports[Reports/Dashboards]
  P0 --> Actions[Approved Actions/PRs]
  P0 --> Alerts[Alerts]
```

### 3.3 DFD Level 1

```mermaid
flowchart TB
  Cloud[Cloud APIs & Billing Exports] --> P1[Ingest Data]
  P1 --> D1[(Raw Data Lake)]
  P1 --> P2[Normalize Cost/Resource Data]
  P2 --> D2[(Resource & Cost Store)]
  Carbon[Carbon APIs] --> P3[Carbon Calculation]
  D2 --> P3
  P3 --> D3[(Carbon Store)]
  D2 --> P4[Forecast & Anomaly Detection]
  D3 --> P4
  P4 --> D4[(Forecast/Anomaly Store)]
  D2 --> P5[Recommendation Engine]
  D3 --> P5
  D4 --> P5
  P5 --> D5[(Recommendation Store)]
  D5 --> P6[Policy/Automation]
  P6 --> Git[PR/Ticket/Cloud API]
  P5 --> UI[Dashboard]
```

### 3.4 DFD Level 2 — Optimization Flow

```mermaid
flowchart TD
  A[Resource metrics] --> B[Utilization Analyzer]
  C[Cost line items] --> B
  D[Carbon intensity/emissions] --> B
  B --> E[Candidate Action Generator]
  E --> F[Risk Analyzer]
  E --> G[Savings Estimator]
  E --> H[Carbon Savings Estimator]
  F --> I[Recommendation Ranker]
  G --> I
  H --> I
  I --> J[Evidence Builder]
  J --> K[Human Review]
  K --> L[Automation Policy]
  L --> M[PR / Ticket / API Execution]
  M --> N[Post-change Verification]
```

---

## 4. Operational Execution & Data Flows

### 4.1 Data Ingestion & Processing Flow
1. Cloud billing and usage exports are ingested into object storage.
2. Billing is normalized into FOCUS-like cost records.
3. Resource inventory and metrics build a time-aware resource graph.
4. Carbon engine maps energy/use to carbon intensity and embodied estimates.
5. Forecast engine predicts demand and confidence intervals.
6. Recommendation engine ranks actions by savings, carbon reduction, confidence, and risk.
7. Policy engine creates ticket/PR/API execution.
8. Verification loop measures actual cost/carbon/SLO outcome.

### 4.2 API Authentication & Routing Flow
1. Client authenticates through OIDC/SAML.
2. API Gateway validates JWT, tenant, and RBAC.
3. Request routes to domain service.
4. Domain service checks object-level permissions.
5. Response includes evidence, confidence, and audit ID.

### 4.3 Cloud Resource Scan Flow
1. Cloud account connected with read-only role.
2. Optional automation role added separately.
3. Inventory scans resources.
4. Metrics and billing attach to resources.
5. Resource graph maps workloads and owners.

### 4.4 Optimization Execution Flow
1. Detect opportunity.
2. Estimate cost/carbon/SLO impact.
3. Attach evidence and confidence.
4. Apply policy and approval.
5. Execute via PR/ticket/API.
6. Verify and learn.

### 4.5 AI Decision Pipeline Flow

1. Retrieve relevant evidence: provider docs, internal policies, telemetry, previous outcomes.
2. Generate candidate action.
3. Score with deterministic cost/carbon models.
4. Use LLM only for explanation, planning, and workflow drafting unless constrained by tools.
5. Require policy approval for execution.