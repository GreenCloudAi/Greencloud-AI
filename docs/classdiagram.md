# Software Domain Class Diagram & Object Model

## Class Diagram


```mermaid
classDiagram
  class Tenant {+UUID id +String name +String plan}
  class CloudAccount {+UUID id +Provider provider +String externalId +sync()}
  class CloudResource {+UUID id +String type +String region +Map tags +getMetrics()}
  class Workload {+UUID id +String name +SLO slo +criticality}
  class CostEngine {+allocateCosts() +amortizeDiscounts() +unitEconomics()}
  class CarbonEngine {+calculateOperational() +calculateEmbodied() +calculateSCI()}
  class ForecastEngine {+train() +predict() +detectDrift()}
  class RecommendationEngine {+generate() +rank() +explain()}
  class Recommendation {+UUID id +Category category +Money savings +double carbonSavings +Risk risk +Status status}
  class AutomationPolicy {+Guardrails guardrails +boolean enabled +evaluate()}
  class AutomationExecutor {+dryRun() +execute() +rollback()}
  class EvidenceSource {+String url +String type +Confidence confidence}
  class LlmAgent {+retrieveEvidence() +plan() +draftPR()}

  Tenant "1" --> "many" CloudAccount
  CloudAccount "1" --> "many" CloudResource
  Workload "1" --> "many" CloudResource
  CostEngine --> CloudResource
  CarbonEngine --> CloudResource
  ForecastEngine --> Workload
  RecommendationEngine --> CostEngine
  RecommendationEngine --> CarbonEngine
  RecommendationEngine --> ForecastEngine
  RecommendationEngine --> Recommendation
  Recommendation --> EvidenceSource
  AutomationPolicy --> AutomationExecutor
  AutomationExecutor --> Recommendation
  LlmAgent --> EvidenceSource
  LlmAgent --> Recommendation
```

**Explanation:** This class diagram separates domain entities from decision engines. Recommendations are not just text; they carry savings, carbon impact, risk, status, and evidence.

## 14.3 Activity Diagram — Optimization Workflow

```mermaid
flowchart TD
  A[Start scheduled sync] --> B[Ingest billing, metrics, resources]
  B --> C[Normalize and build resource graph]
  C --> D[Calculate cost and carbon baselines]
  D --> E[Run forecasts and anomaly detection]
  E --> F[Generate candidate recommendations]
  F --> G[Score savings, carbon, risk, confidence]
  G --> H{Policy allows automation?}
  H -- No --> I[Create recommendation and notify owner]
  H -- Yes --> J{Risk below threshold?}
  J -- No --> I
  J -- Yes --> K[Dry-run action]
  K --> L{Dry-run safe?}
  L -- No --> I
  L -- Yes --> M[Create PR or approval request]
  M --> N{Approved?}
  N -- No --> O[Mark deferred]
  N -- Yes --> P[Execute change]
  P --> Q[Monitor SLO, cost, carbon]
  Q --> R{Regression?}
  R -- Yes --> S[Rollback and open incident]
  R -- No --> T[Mark success and update model]
```

**Explanation:** The workflow is intentionally human-in-the-loop for risk. Even allowed automation must pass policy, risk, dry-run, approval, and post-change monitoring.

## 14.4 Sequence Diagram — Recommendation Execution

```mermaid
sequenceDiagram
  participant U as FinOps/DevOps User
  participant UI as Dashboard
  participant API as API Gateway
  participant RE as Recommendation Engine
  participant PE as Policy Engine
  participant EX as Automation Executor
  participant CP as Cloud Provider API
  participant OBS as Monitoring
  participant AUD as Audit Log

  U->>UI: Approve recommendation
  UI->>API: POST /recommendations/{id}/approve
  API->>RE: Load recommendation and evidence
  RE->>PE: Evaluate guardrails
  PE-->>RE: Approved by policy
  RE->>EX: Dry run action
  EX->>CP: Validate change/read-only simulation
  CP-->>EX: Dry-run result
  EX-->>RE: Safe
  RE->>EX: Execute
  EX->>CP: Apply change
  CP-->>EX: Change accepted
  EX->>OBS: Start post-change watch
  OBS-->>EX: SLO/cost/carbon metrics
  EX->>AUD: Store execution result
  EX-->>UI: Success or rollback status
```

**Explanation:** The sequence emphasizes auditability and rollback monitoring.

## 14.5 Component Diagram

```mermaid
flowchart LR
  subgraph Frontend
    Dash[Dashboard]
    Assistant[AI Assistant UI]
  end
  subgraph Backend
    APIGW[API Gateway]
    AuthSvc[Auth Service]
    CostSvc[Cost Service]
    CarbonSvc[Carbon Service]
    RecSvc[Recommendation Service]
    ForecastSvc[Forecast Service]
    AutomationSvc[Automation Service]
    RagSvc[RAG Service]
  end
  subgraph Data
    PG[(PostgreSQL)]
    CH[(ClickHouse)]
    OBJ[(Object Storage)]
    VEC[(Vector DB)]
  end
  subgraph External
    Cloud[AWS/Azure/GCP APIs]
    CarbonAPI[Electricity Maps/Provider Carbon]
    Git[Git/ITSM/ChatOps]
  end
  Dash --> APIGW
  Assistant --> APIGW
  APIGW --> AuthSvc
  APIGW --> CostSvc
  APIGW --> CarbonSvc
  APIGW --> RecSvc
  APIGW --> RagSvc
  CostSvc --> CH
  CarbonSvc --> PG
  CarbonSvc --> CarbonAPI
  RecSvc --> ForecastSvc
  RecSvc --> AutomationSvc
  AutomationSvc --> Cloud
  AutomationSvc --> Git
  RagSvc --> VEC
  CostSvc --> OBJ
  RecSvc --> PG
```

**Explanation:** Components are isolated so carbon, cost, forecast, recommendations, and automation can evolve independently.