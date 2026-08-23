# Esencial orchestration bootstrap

This directory is the control plane for five Codex contexts: one coordinator and four workers. The SEO plan is S0–S14, the first Sanity extension is S15–S22, and the Studio correction is S23–S28 in `STUDIO_POLISH_EXTENSION_PLAN.md`.

## Commands

```powershell
node orchestration/status.mjs
node orchestration/status.mjs --json
node --test orchestration/status.test.mjs
```

`stages.json` is the only operational stage registry. `ESENCIAL_PARALLEL_CODEX_RUNBOOK.md` remains the human policy and acceptance reference. When they disagree, stop and reconcile them; never silently guess.

The status command validates structure, dependencies, evidence, model settings, worker allocation, and active file ownership. It derives `READY` only from completed dependencies. It is deliberately read-only and does not create tasks, worktrees, branches, commits, or external changes.

## Five-context allocation

- Coordinator: shared files, integration, S0/S14, Sanity access gate S15, final CMS validation S22, report architecture S23 and Studio correction validation S28.
- Worker A: parity, semantics, accessibility, CMS visual system and editorial QA.
- Worker B: technical/international SEO, structured data, projects and filter taxonomy.
- Worker C: project/image SEO, performance and live frontend preview.
- Worker D: cleanup, analytics/consent, CMS safeguards, CI and CMS integration.

Only one stage may run in a worker lane at a time. More stages may be `READY` than there are worker slots; a later launcher must queue the excess. Shared hotspots remain coordinator-owned.

## Current boundary

The status command calculates and validates state only. Task creation and integration remain coordinator actions. No branch is pushed and no deployment, PR, DNS, hosting, Sanity production-data, analytics-account, or other external mutation is authorized. S15 stays `BLOCKED_HUMAN` until the local robot-token gate is explicitly verified.
