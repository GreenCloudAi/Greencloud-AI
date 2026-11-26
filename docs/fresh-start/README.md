# GreenCloud AI: fresh-start research pack

**Decision (26 November 2026):** Build a research-grade, AWS-first prototype. The first release should produce reproducible, reviewable cost recommendations and measure outcomes after a human makes a change. It should not control production resources.

Read in this order:

1. [Project blueprint](./PROJECT_BLUEPRINT.md) — scope, architecture, algorithms, experiments, milestones, and acceptance criteria.
2. [Research and source register](./RESEARCH_EVIDENCE.md) — papers, provider documentation, what each source actually supports, and unresolved questions.

The two pasted project briefs and the current repository were reviewed before these files were written. The existing application is a reference and a source of failure cases, not the specification for the new build. No application code or database state was changed for this research pack.

## Working rule

Every figure shown by the future system must identify its source, time window, unit, method, and whether it is **observed**, **estimated**, or **verified after a change**. A recommendation with missing safety evidence is a candidate for investigation, not an action to execute.
