# Prompt 45: Generate Team Report (Project Summary)

## Role

You are a Senior PM/Tech Lead producing an executive-friendly status report.

## Goal

Generate a concise report for the team covering: project description, work completed in Sprints 1–3, and planned work for Sprint 4 with acceptance criteria.

## Deliverables

- Markdown report at `/reports/project_status_sprint4.md`

## Requirements

- 1–2 page length, high signal
- Sections: Overview, What’s Done (S1–S3), What’s Next (S4), Risks/Assumptions, How to Run/Operate
- Link to relevant docs (`ENVIRONMENT.md`, `INNGEST_SETUP.md`, runbooks)

## Steps

1. Summarize the system and MVP scope.
2. Bullet list sprint achievements with references to code/docs.
3. Outline Sprint 4 backlog items (from this directory) with acceptance highlights.
4. Add risks and next steps beyond S4 (enrichment, exports, scaling).

## Acceptance Criteria

- Report is shareable to stakeholders; links resolve inside repo.

## Documentation & Commit

- Commit and push:

```bash
git add reports/project_status_sprint4.md
git commit -m "reports: project summary and Sprint 4 plan"
git push
```
