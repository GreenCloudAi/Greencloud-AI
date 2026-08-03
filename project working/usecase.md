## 14.1 Use Case Diagram

```mermaid
flowchart LR
  Admin((Admin))
  Company((Company Owner))
  Dev((Developer))
  FinOps((FinOps Engineer))
  DevOps((DevOps Engineer))

  UC1[Connect cloud accounts]
  UC2[Configure RBAC and SSO]
  UC3[View cost dashboard]
  UC4[View carbon/SCI dashboard]
  UC5[Investigate anomaly]
  UC6[Review recommendation]
  UC7[Approve automation]
  UC8[Create IaC pull request]
  UC9[Execute safe remediation]
  UC10[Configure policies]
  UC11[Ask AI assistant]
  UC12[Generate reports]

  Admin --> UC1
  Admin --> UC2
  Company --> UC3
  Company --> UC4
  Company --> UC12
  FinOps --> UC3
  FinOps --> UC5
  FinOps --> UC6
  FinOps --> UC7
  FinOps --> UC10
  DevOps --> UC6
  DevOps --> UC8
  DevOps --> UC9
  DevOps --> UC10
  Dev --> UC6
  Dev --> UC8
  Dev --> UC11
```

**Explanation:** This diagram shows GreenCloud AI as a collaboration platform. Admins connect accounts and configure access. FinOps owns visibility and governance. DevOps executes controlled changes. Developers receive recommendation context and PRs. Company owners consume reports.