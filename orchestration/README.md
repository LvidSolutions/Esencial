# Esencial orchestration bootstrap

This directory is the read-only control plane for five future Codex contexts: one coordinator and four workers.

## Commands

```powershell
node orchestration/status.mjs
node orchestration/status.mjs --json
node --test orchestration/status.test.mjs
```

`stages.json` is the only operational stage registry. `ESENCIAL_PARALLEL_CODEX_RUNBOOK.md` remains the human policy and acceptance reference. When they disagree, stop and reconcile them; never silently guess.

The status command validates structure, dependencies, evidence, model settings, worker allocation, and active file ownership. It derives `READY` only from completed dependencies. It is deliberately read-only and does not create tasks, worktrees, branches, commits, or external changes.

## Five-context allocation

- Coordinator: shared files, integration, and S0/S14.
- Worker A: parity, semantic HTML, accessibility.
- Worker B: technical/international SEO and structured data.
- Worker C: project/image SEO and performance after handoff.
- Worker D: legacy cleanup, analytics, CMS, and CI.

Only one stage may run in a worker lane at a time. More stages may be `READY` than there are worker slots; a later launcher must queue the excess. Shared hotspots remain coordinator-owned.

## Current boundary

This bootstrap calculates status only. Worker creation and automated integration require a separate reviewed implementation. No branch is pushed and no deployment, PR, DNS, hosting, Sanity production-data, or external-account mutation is authorized.
