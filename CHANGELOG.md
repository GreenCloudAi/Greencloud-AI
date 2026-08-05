# Changelog & Project Roadmap

All notable changes, milestone releases, and development progress for GreenCloud AI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) standards.

---

## [Unreleased] - Project Development Roadmap

### Phase 1: Ingestion & FOCUS Normalization
- [ ] Connect AWS Cost & Usage Reports (CUR) and CloudWatch Telemetry APIs.
- [ ] Ingest Azure Cost Management and Resource Graph exports.
- [ ] Ingest GCP Billing Export and Recommender APIs.
- [ ] Implement FOCUS v1.3 cost schema normalizer engine.

### Phase 2: Resource Graph & Carbon Engine
- [ ] Construct time-aware resource graph linking cloud accounts, regions, and Kubernetes namespaces.
- [ ] Integrate Kepler eBPF metrics exporter for container energy consumption.
- [ ] Integrate Electricity Maps API for location-based carbon intensity data.
- [ ] Implement Green Software Foundation SCI (Software Carbon Intensity) calculator.

### Phase 3: AI Recommendation & Policy Engine
- [ ] Build multi-objective ranking algorithm (Cost Savings + Carbon Reduction - Risk).
- [ ] Integrate Prophet / StatsForecast demand forecasting models.
- [ ] Implement OPA (Open Policy Agent) Rego policy guardrails for automation safety.
- [ ] Build RAG assistant query endpoint for grounded evidence citations.

### Phase 4: Remediation & Safety Loop
- [ ] Implement automated Terraform Pull Request generator.
- [ ] Implement Jira / ServiceNow ticket integration.
- [ ] Build post-remediation SLO verification watcher and auto-rollback trigger.

## [0.1.0] - 2026-08-06 (Initial Architecture & Research Specification)

### Added
- Created comprehensive master research paper in `report.md` synthesizing literature review, competitor analysis, and system specifications.
- Established modular `docs/` documentation hub:
  - Architecture & Deployment Topology in `docs/architecture/deployment.md`.
  - Database ER Diagram and relational schemas (27 tables) in `docs/design/ER.md`.
  - Software Domain Class Model in `docs/design/classdiagram.md`.
  - Functional Requirements (FR-001–FR-022) & User Stories in `docs/requirements/usecase.md`.
  - Technical Glossary and acronym reference in `docs/glossary.md`.

- Added developer contribution guidelines in `CONTRIBUTING.md`.
- Added security disclosure & credentials policy in `SECURITY.md`.
- Configured Apache 2.0 License with Primary Copyright notice in `LICENSE`.
- Published project landing page in `README.md`.
