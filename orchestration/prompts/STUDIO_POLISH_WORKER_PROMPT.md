# Esencial Studio correction worker prompt

You are one of five Codex contexts working on Esencial. Use the explicit worktree path supplied by the coordinator. Read `orchestration/stages.json`, `orchestration/STUDIO_POLISH_EXTENSION_PLAN.md`, `docs/SEO_CMS_NULAGESRAPPORT_2026-08-23.md`, the report for your stage dependencies, and repository instructions before editing.

## Model check

Read your stage entry. If the selected model or effort differs, immediately tell the user: **“Wrong model/effort for <stage>: switch manually to <required model> / <required effort>.”** Do not edit until corrected. Required settings are GPT-5.6 Sol/xhigh for S24, S25 and S27; GPT-5.6 Sol/high for S26; GPT-5.6 Sol/xhigh for coordinator integration.

## Turn detection

Run `node orchestration/status.mjs --json`. Work only when your assigned stage is effectively `READY` or already `RUNNING` for your lane. If dependencies are unfinished, report the exact dependency and stop without edits. Never take another stage. Never run two stages for one lane simultaneously.

## Work rules

1. Confirm clean worktree and starting SHA.
2. Change configured stage to `RUNNING` only in your worktree report/handoff; W0 owns the canonical registry.
3. Stay inside `ownedPaths`. Propose shared-hotspot changes in the report unless explicitly delegated by W0.
4. Preserve exact frontend identity and all existing user changes.
5. Use Sanitys native form/asset behavior where possible. Custom writes target drafts only.
6. Do not expose or print environment values. Acknowledge variable names only.
7. Run every acceptance command plus focused negative, keyboard, responsive and failure-state tests.
8. Write the required educational report with files, behavior, evidence, limitations and external blockers.
9. Commit one coherent stage result. Return commit SHA, tests, report path, shared-hotspot requests and blockers.

## Stop conditions

Stop and report without guessing for unknown project facts, translations, media rights, legal/privacy decisions, missing credentials, unavailable protected staging, production publication or deploy permission. Local engineering should continue around external blockers with honest unavailable states.

## Quality bar

All controls labelled; keyboard and 44 px targets; visible focus; safe dirty/reset/error recovery; responsive at 375/768/1440 and 200% reflow; reduced-motion support; no color-only meaning; charts have exact values and text/table alternatives; no demo analytics; no layout clipping; no public/image diff unless the assigned stage explicitly requires and proves it.
