# Automated SEO Quality Gates

Status: PASS

## Baseline and timestamp

- Worker/stage: W4 / S13.
- Starting branch and SHA: `codex/worker-d-s13-retry` at `af4bc6e8fb4c19496fda82da2e56de6a21b3f0e5`.
- Coordinator ref observed during final review: `codex/orchestrator-bootstrap` at `bbc76e9c8865660175ee667bf96f0aeeaf5868c4`; the starting SHA is its ancestor and the coordinator-only advance changes orchestration fixtures.
- Verification completed: `2026-08-22T15:18:31Z`.
- Starting state: clean worktree; S3-S12 effective `DONE`; S13 the sole effective `READY` stage.

## Scope inspected and pre-existing implementation

- Audited both GitHub workflows, root and Studio package contracts, lockfiles, Node/pnpm pins, S3-S12 acceptance commands and their validator/generator scripts, build mutation behavior, failure exits, evidence writes, browser coverage, Sanity secret flow and generated-file behavior.
- The root build already composed the static content, analytics, technical/international SEO, structured data, semantics, project-page, image and link validators. The prior SEO workflow only installed dependencies and ran that build; it omitted the CMS/Studio, local HTTP, performance, accessibility, functionality and reference-parity gates.
- The prior CMS workflow gave the secret-bearing build job `contents: write` and pushed directly from it. It had no immutable action pins, timeout, artifact boundary, exact-source publication guard or complete failure summary.
- S7's checked-in image variants remain validated by `check-image-seo`. `build:image-variants` is not part of the generic release build because it requires ImageMagick and writes a timestamped manifest; changing that S7-owned generator was outside S13 ownership.

## Files changed and why

- `.github/workflows/seo.yml`: added read-only permissions, branch/ref concurrency, a 45-minute timeout, immutable action SHAs, exact Node 22.19.0/pnpm 9.15.9 pins, frozen cached installs, ordered S3-S12 release gates, generated-output diff enforcement, Studio build, Playwright functionality/performance/accessibility/reference-parity checks, first-failure summary and retained evidence artifact.
- `.github/workflows/cms-build.yml`: split validation from publication. The Sanity token exists only in the read-only validation job; the write-capable job can consume only the validated artifact. Main-only validation, exact validated-source checkout and a non-fast-forward-safe `HEAD:main` push prevent stale or branch-selected output from replacing a valid build. Added immutable actions, frozen cached install, timeouts, scope check, artifact retention and first-failure summaries.
- `scripts/check-ci-gates.js`: added a dependency-free, deterministic static contract that rejects mutable actions, excessive permissions, missing pins/caches/timeouts/concurrency, secrets in the SEO job, secrets in the write-capable CMS job, missing artifacts/summaries and missing, skipped or reordered gates.
- `package.json`: added the `check-ci-gates` script and pinned the Node 22 runtime line plus pnpm 9.15.9. No lockfile changed.
- `audit/seo-final/17-automated-seo-quality-gates.md`: records this PASS evidence and handoff.

## Commands and exact outcomes

- `node orchestration/status.mjs --json` — PASS; registry valid, zero warnings/errors, S13 sole `READY` stage.
- `corepack pnpm install --frozen-lockfile` — PASS with pnpm 9.15.9; lockfile unchanged.
- `npm ci --prefix cms/studio --ignore-scripts` — PASS; Studio lockfile unchanged.
- `node --check scripts/check-ci-gates.js` — PASS.
- `corepack pnpm run check-ci-gates` — PASS; 2 workflows, 13 ordered release gates, immutable actions, frozen installs, permissions, timeouts, concurrency, summaries, artifacts and secret isolation enforced.
- `node scripts/check-ci-gates.js --fixtures` — PASS; missing accessibility, conditionally skipped performance and reordered CMS/build fixtures were all rejected fail closed.
- `cms/studio/node_modules/.bin/prettier --check .github/workflows/seo.yml .github/workflows/cms-build.yml` — PASS; both YAML files parsed and matched formatting.
- `corepack pnpm run build` — PASS on repeated runs; 56 indexable pages/URLs/canonicals, 52 `CreativeWork` entities, 104 image uses, 56 semantic pages, 52 project pages and all internal links passed.
- Node 22.19.0 execution of `pnpm run build` — PASS with the pinned pnpm 9.15.9 runtime.
- Deterministic rerun — PASS; consecutive root builds left the normalized tracked diff hash unchanged at `2c0df3af5a89bb575c1166b1766b528b593f3a1f`, created no public untracked file and staged no generated file. Windows CRLF stat noise was refreshed without content changes.
- `npm --prefix cms/studio run build` — PASS; Studio compiled locally.
- Node 22.19.0 execution of `node_modules/@sanity/cli/bin/run.js build` — PASS; Studio compiled with the workflow runtime.
- `node --test orchestration/status.test.mjs` — PASS; 11/11 tests.
- Filename-only tracked secret scan for GitHub, OpenAI-style, Google API and private-key signatures — PASS; no candidate file.
- `git diff --check` — PASS.
- Final generated-file scope review — PASS; no lockfile, `vercel.json`, application, orchestration or generated public file is in the S13 diff.

## Playwright coverage

- The fail-closed SEO workflow requires the existing local functionality check, six-case performance check, 56-page accessibility check and 40 live/local route-viewport reference-parity check in that order after build and Studio validation.
- S13 did not create replacement visual evidence locally. The integrated S9/S10 evidence remains the starting proof; a later authorized remote run must refresh the workflow artifact against the then-current live reference.

## Unresolved risks, manual needs and prohibited actions

- Remote GitHub Actions execution is a manual gate requiring a later authorized push. No remote workflow result is claimed here.
- The CMS workflow still requires a repository Sanity read token and GitHub write token at runtime. Neither was accessed locally; the contract scopes them to separate jobs.
- Reference parity depends on the live site's availability and can correctly fail when the live reference drifts. S14 must distinguish real regression from documented live drift.
- Sanity Studio warned that local `sanity`/`@sanity/vision` 6.4.0 differ from the auto-update runtime 6.10.1. No dependency or lockfile update was authorized in S13; S14 should decide whether to disable auto-updates or align versions before release.
- The frozen Studio install reported 10 moderate and 11 high npm advisory matches in the existing dependency tree. S13 did not change the Studio lockfile; S14 should triage exploitability and update dependencies in a separately owned change if required.
- S7 image regeneration remains ImageMagick-version-sensitive and its manifest contains `generatedAt`. CI validates the checked-in variants but does not claim cross-platform byte-for-byte regeneration. Any generator fix belongs to the S7 owner/coordinator.
- No secret, external account, push, PR, remote CI run, deployment, DNS/hosting change, Vercel action, Sanity production write, external configuration change or S14 work occurred.

## Final local commit and merge order

- Sole local commit subject: `SEO-S13 PASS: enforce fail-closed automated release gates`.
- Branch: `codex/worker-d-s13-retry`; the immutable commit SHA is supplied in the handoff because a commit cannot embed its own SHA.
- Dependencies: integrated S3-S12 PASS markers.
- Shared files: `.github/workflows/cms-build.yml`, `.github/workflows/seo.yml` and minimal `package.json`; no lockfile or generated file.
- Recommended order: coordinator reviews this diff, cherry-picks the sole S13 commit onto current `codex/orchestrator-bootstrap`, reruns `corepack pnpm run check-ci-gates`, `corepack pnpm run build`, Studio build and orchestration tests, then and only then begins S14.
