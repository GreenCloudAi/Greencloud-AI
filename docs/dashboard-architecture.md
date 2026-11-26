# Multi-cloud dashboard architecture

GreenCloud gives an organization one place to understand its cloud estate and decide what to investigate or optimize. The shared Overview answers which accounts and workloads contributed to a number, how current the evidence is, and what action the current user has permission to take. AWS EC2 hosting, Azure SQL, GCP BigQuery, S3, and Kubernetes can contribute to the same workload while retaining separate inventory and billing identities.

## Organization and access model

Use Organization → Workspace → Provider connection → Account, subscription, or project → Region → Service → Resource as the navigation hierarchy. Model workloads as many-to-many resource relationships spanning providers, accounts, and regions. Store global resources with explicit global scope. Keep Azure tenant and resource group, GCP organization, folder and billing account, and AWS organization and payer as provider-specific attributes. A workspace selects a subset of organization accounts through explicit membership. Account IDs are unique within provider and provider partition or tenant where applicable. Resource keys include provider, account, and canonical provider resource ID.

The authenticated actor resolves to organization membership and workspace membership. Existing Tenant is the current workspace boundary and requires a migration to introduce organization membership. Reuse Role, Permission, RolePermission, and RoleAssignment after adding account and workspace constraints. Evaluate grants server-side per action and account, with explicit deny taking precedence. Intersect user filters with authorized account scope before querying, counting, aggregating, caching, or exporting. Require the same checks for details, audit events, jobs, and mutations. A role presentation switch does not grant permissions. Store worker identity and connection credentials independently of user roles.

## Information architecture

The persistent scope bar contains workspace, providers, account groups, selected accounts, reporting period, and advanced filters for region, service, resource type, environment, application, and owner. Preserve it across navigation and drill-down. Unknown ownership and unallocated costs are visible categories. An account health table shows raw source identity, status and coverage by source, last attempt, last success, resource count, and relevant freshness. Drill-down follows account → service → resource, with workload links crossing accounts.

| Overview | Primary question | First visualization | Drill-down |
|---|---|---|---|
| Workspace Admin | Which connections, approvals, and operations need attention? | Account health table and status timeline, followed by spend and emissions coverage | Connection, job attempts, governance events, approval queue |
| FinOps Engineer | What changed in spending and why? | Daily spend with forecast intervals, change waterfall, service and account bars | Invoice scope, anomaly evidence, unallocated cost, commitments |
| DevOps Engineer | Which resources have enough evidence to investigate? | Fleet state and coverage matrix, measured utilization distribution | Resource inspection, telemetry history, alerts, pending changes |
| Solutions Architect | Where are workloads deployed and where are the capacity risks? | Region and service distribution, then a topology graph when relationships are available | Workload, dependency edges, capacity and placement alternatives |
| Sustainability Lead | Which workloads drive estimated emissions? | Operational and embodied emissions by scope, SCI trend where comparable | Factor versions, energy inputs, data quality, proposed reductions |
| Read-Only Viewer | What changed across the accounts I can view? | Spend trend and provider comparison with budget and savings progress | Authorized read-only cost, carbon, and optimization evidence |

Costs provides stack bars and treemaps for cost distribution, a waterfall for matched-period changes, anomaly context, and a table for reconciliation. Resources provides utilization histograms, account and region heatmaps, a deployment map, and an inspection drawer with provider configuration, telemetry and availability, cost and its grain, workload dependencies, and recommendation evidence. Actions provides proposal and execution timelines with approval and outcome states. Carbon provides factor provenance, boundaries, estimates and SCI denominator. Use accessible tables alongside charts. Each visualization needs units, window, source, coverage, freshness, empty and error states, and a scoped navigation target. Roll out specialized charts when the source relevant to them exists.

## Default role-to-widget permissions

Default bundles below are proposals. Custom roles grant the same permissions independently by account or workspace. Limited scope applies to every cell.

| Capability | Admin | FinOps | DevOps | Architect | Sustainability | Viewer |
|---|---|---|---|---|---|---|
| Connection status and inventory summary | Read | Read | Read | Read | Read | Read |
| Add account, manage scopes, retry ingestion | Manage | No | No | No | No | No |
| Cost, anomalies and forecasts | Read | Read | Scoped summary | Scoped summary | No | Read |
| Set budgets and export billing | Policy grant | Policy grant | No | No | No | No |
| Resource inspection and telemetry | Read | Scoped context | Read | Read | Scoped context | Scoped summary |
| Emissions and methodology | Read | Scoped summary | Scoped context | Read | Read | Scoped summary |
| Recommendations | Read | Investigate | Review | Review | Investigate | Scoped summary |
| Approve changes | Separate grant | Separate grant | Separate grant | Separate grant | Separate grant | No |
| Execute changes | Separate worker and approval gate | No | Separate grant | No | No | No |
| Governance and security events | Read | Scoped audit grant | Scoped audit grant | No | No | No |

A reviewer cannot approve their own request where separation of duties applies. Read-only provider identities stay read-only. Approval, proposal creation, execution, rollback, and verified outcome are distinct events.

## KPI definitions

| Signal | Calculation and reporting rule |
|---|---|
| Billing actuals and trends | Sum signed usage and adjustment facts by authorized scope, accounting metric, currency and charge period. Label provider-estimated billing periods separately from finalized invoices. Keep actual billed and effective or amortized costs separate. Show zero only when the source reports zero or an eligible population is confirmed empty. Reconcile to the same provider scope, date boundaries, currency, and metric. |
| MTD, budget pace and forecast variance | MTD starts at the calendar month boundary defined by the budget. Compute utilization as actual divided by the matching budget. Show forecast minus budget with confidence interval. Suppress comparisons when budget scope, currency, period or history is missing. |
| Allocation and commitments | Unallocated cost is actual spend without a supported owner mapping. Idle spend requires a defensible price or cost attribution and an evidence-backed idle rule. Commitment coverage uses eligible usage as its denominator, while utilization uses purchased commitment. Carry discounts, credits and refunds as signed amounts. |
| Connection and coverage | Last attempt and last success are per source. Coverage is observed entities or intervals divided by eligible entities or intervals. A source failure preserves the last successful snapshot and exposes its age. An empty successful response is recorded distinctly from failure. |
| Fleet state and health | Count active inventory by provider lifecycle state and distinguish unknown. Health requires a provider health or alert source. CPU, memory, disk, IOPS, network and saturation use supported per-resource signals and consistent units. |
| Utilization and headroom | Calculate percentiles on valid samples in a defined window with sample count and coverage. Headroom uses explicit capacity limits. Underutilization is a candidate supported by measurements, sample coverage and policy threshold. Stopped resources and missing telemetry are separate states. |
| Cost anomalies and savings | Compare actual spend against an explicit baseline and identify the contributing account or service where evidence exists. Potential savings use a documented model. Approved savings refer to approved proposals. Verified savings require a measured post-change period and defensible counterfactual, with billing lag and confounders disclosed. |
| Carbon, energy and SCI | Operational CO₂e equals estimated kWh times the applicable regional factor. Embodied emissions are allocated by documented equipment assumptions. SCI is operational plus embodied emissions divided by a validated functional unit. Report boundary, interval, factor version, coverage and uncertainty. Do not aggregate incompatible functional units. |

## Provider data sources and refresh

The following cadences are initial worker targets. Provider reporting delays, throttling, cost and configured resolution determine actual freshness.

| Provider | Discovery and inventory | Metrics and recommendations | Billing |
|---|---|---|---|
| AWS | AWS Organizations ListAccounts where the organization authorizes discovery, then per-account STS AssumeRole. EC2 describe APIs deliver instances, EBS and Elastic IPs. Add service-specific readers for S3 and other services. | CloudWatch GetMetricData scoped to enabled regions. Memory requires configured guest telemetry. Read Compute Optimizer findings when enrolled and authorized. Poll inventory hourly and supported metric batches every 15–60 minutes. | Cost Explorer offers daily account/service summaries, with paginated requests. CUR 2.0/Data Exports is the long-term resource-grain source where resource IDs are present. Use read access to the export and AWS Pricing for estimates. Ingest daily and reprocess changed partitions. |
| Azure | Enumerate authorized subscriptions, query Resource Graph across those scopes, and enrich through ARM resource-specific reads. Read roles at the intended subscription or resource group. | Azure Monitor metric definitions drive capabilities per resource. Agent or diagnostic settings may be needed. Read Advisor recommendations with scoped access. Poll inventory hourly, then metrics at a configured cadence. | Consume scheduled Cost Management exports from authorized blob paths. Provisioning exports has different privileges from reading them. Preserve actual or amortized metrics and dataset scope. |
| Google Cloud | Discover authorized projects using Resource Manager and use Cloud Asset Inventory for inventory and relationship feeds where supported. Grant project or organization read permissions explicitly. | Cloud Monitoring time series define supported signals, including agent-backed guest metrics. Read Recommender with scoped list permissions. Use inventory feeds where appropriate and periodically reconcile. | Read standard or detailed Cloud Billing exports in BigQuery. Grant dataset read and query-job permissions to the connector identity. Process changed partitions as they arrive, with late adjustments handled idempotently. |
| Kubernetes | Discover clusters and namespaces only from authorized registrations. | Source workload utilization from supported metrics backends. OpenCost provides allocation periods, idle cost, and separate pricing sources. | Keep cluster allocation linked to account billing to prevent duplication. |

Use provider-native UI conventions for drill-down from account to service and for source-specific recommendations. CloudHealth and the FinOps Framework inform scope, normalized FOCUS billing, ownership, reporting and allocation. Provider docs define supported metrics and permissions. [AWS Cost Explorer API](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html) · [AWS Compute Optimizer](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html) · [AWS Data Exports](https://docs.aws.amazon.com/cur/latest/userguide/what-is-data-exports.html) · [Azure Resource Graph](https://learn.microsoft.com/en-us/azure/governance/resource-graph/overview) · [Azure exports](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-improved-exports) · [Azure monitoring coverage](https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/monitoring-coverage) · [Azure Advisor](https://learn.microsoft.com/en-us/azure/advisor/advisor-reference-cost-recommendations) · [Google Cloud Asset Inventory](https://docs.cloud.google.com/asset-inventory/docs/asset-inventory-overview) · [Google Cloud Billing exports](https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-setup) · [Google Cloud Recommender](https://docs.cloud.google.com/recommender/docs/overview) · [OpenCost](https://opencost.io/docs/integrations/api/) · [CloudHealth](https://www.broadcom.com/products/software/finops/cloudhealth) · [FinOps Allocation](https://framework.finops.org/framework/capabilities/allocation/) · [SCI specification](https://sci.greensoftware.foundation/)

## Ingestion and dashboard API

Run provider adapters behind worker operations for discovery, inventory, metrics, billing and recommendations. Each operation returns normalized rows, cursor, provider timestamps, capabilities and typed errors. Prefer federated short-lived identities and secure references to connector secrets. Validate scopes during onboarding and keep setup privileges separate from runtime readers.

Schedule jobs per workspace, account and source. Use durable leases, retry transient errors with bounded backoff and jitter, honor throttles, and record attempts using SyncJob and DataQualityReport. Commit complete billing partitions atomically and checkpoint afterward. Inventory sweeps mark resources absent only after a successful covering scan. Append historical metric samples with source, unit, resource key, granularity and observed time. Do not retire records when a scope fails. Source-specific status records preserve the last good result and a user-safe explanation on failure.

Store normalized billing facts under one authoritative source for each account, window and cost metric. Persist signed amounts, currency, source, metric, period, estimation status, identifier grain and deduplication keys. Handle payer and member account overlap explicitly. Keep price estimates in a separate model. Index by workspace, source scope, date and resource, with keyset pagination for large inventories. Use the same canonical scope for aggregations, page navigation, and resource inspection. Return capabilities, coverage and provenance alongside every dataset.

## Implementation sequence and verification

The current main working tree already has six Overview presentations, shared selection controls and account coverage. The beta-dev reference at 75a57d0 groups infrastructure and recommendations and includes a machine catalog and experimental agent workflows. Reuse navigation and evidence ideas. Validate price data and resource policy before bringing over any catalog or actions. Main currently has live AWS EC2/EBS/Elastic IP discovery and Cost Explorer, and FOCUS import for AWS, Azure and GCP.

1. Stabilize AWS billing ingestion in the existing connector and persist scoped summaries using an atomic window replacement. Verify pagination, signed amounts, currency, scope, failure recovery and absence of fabricated resource assignments.
2. Add authenticated organization and workspace memberships, granular grants and an authorized dashboard query layer. Add predictable global filters and scope-preserving navigation. Use direct access tests for allowed and denied accounts and mixed role grants.
3. Wire job persistence, scheduling and per-source status into Overview and the connector adapters. Build account health, date and currency rollups, coverage, and scoped resource details. Test one failing account alongside successful accounts, empty results, throttling, retry and large paginated inventories.
4. Add Azure subscription inventory and cost exports, then GCP project inventory and BigQuery billing. Verify using multiple isolated scopes per provider. Label fixture and imported sources, and reconcile against each provider before enabling combined totals.
5. Add historical telemetry, availability signals, OpenCost, workload relationships and role-specific visualizations. Exercise missing memory, incomplete sampling, mixed currencies, zero spend, late billing and partial scans. Compare every metric against source fixtures or a verified live reference.
6. Add provider recommendation ingestion, scoped approvals, and verified outcomes before execution capabilities. Test approval identity, audit attribution, reversibility, and workload health and cost baselines in a sandbox.

Release shared organization access after backend scope checks, source reconciliation, and partial-failure tests pass. Track feature availability per provider and source.
