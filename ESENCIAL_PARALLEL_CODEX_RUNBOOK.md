# Esencial SEO — Parallel Codex Runbook

## Use

Open **5 Codex context windows total**: `W0` coordinator/integrator plus `W1–W4` workers. This is the best balance of speed, review depth, and merge risk. Give each window: **“Read this file fully; operate only as Wn.”**

**Required setting:** use the exact per-stage model and effort in `orchestration/stages.json`. In its first reply each window must state its window ID, stage, selected model and effort. If these differ or cannot be verified, it must tell the user to switch them manually and stop until confirmed. Never silently continue with another setting.

## Mission and fixed context

- Repository: `https://github.com/LvidSolutions/Esencial`
- Local integration worktree: `C:\Users\lucas\Documents\Codex\2026-08-21\sta\work\Esencial-orchestrator-bootstrap`
- Live visual reference: `https://www.esencial.se/`
- Goal: finish and validate technical, content, image, accessibility, performance, analytics, CMS, and quality-gate SEO work without changing Esencial's visual identity.
- The recovered static frontend is the visual contract. No redesign, generic homepage SEO block, invented copy/facts, or avoidable layout/interaction change.
- Use Playwright against live and local at matched routes, viewport, browser, font readiness, animation state, and capture timing. Judge screenshots plus computed styles, geometry, interaction, and responsive behavior.
- Never hand-edit generated `public/projekt/**`, `public/projects/{slug}/**`, or generated sitemap output. Change their source/generator, rebuild, and commit source plus deterministic output only when repository convention requires it.
- No Git push, PR, deployment, production/live-domain change, DNS/hosting change, external account mutation, secret creation/rotation, or Sanity production-data write unless separately authorized in writing. Local branches, commits, tests, and reports are allowed.
- Never expose secrets or use an owner's primary credentials in automation. Do not delete legacy assets/code merely because they look unused; prove non-use and preserve visual/function parity.

## Verified repository baseline

Checked against GitHub `main` on **2026-08-22** at `0980032b20ab069c49e94289954d9a27dd2a079d` (`Unify CMS editor workspace`):

- Static Swedish/English shell routes: `/`, `/om-oss/`, `/projects/`, `/about/`.
- `26` Swedish and `26` English project records; generated detail routes under `/projekt/{slug}/` and `/projects/{slug}/`.
- `public/robots.txt` and a sitemap currently containing `56` URLs.
- Build validates SEO and internal links; separate checks cover CMS content, Studio workspace, functionality, screenshots, computed styles, and bounding boxes.
- Sanity Studio, project/service/home/settings schemas, CMS import/build/fetch scripts, protected analytics function, Vercel config, `seo.yml`, and `cms-build.yml` exist.
- Recovery audits/screenshots exist; the README's 24-pair/1.0365% visual result is historical evidence, not a current pass. Rerun it.
- `docs/CURRENT_IMPLEMENTATION_PLAN.md` dated 2026-07-25 is the current decision source: **Vercel Web Analytics + Cookiebot**, with returning visitors explicitly unavailable at that privacy level. Older documents still naming Matomo are stale on this point. Do not reintroduce Matomo without explicit approval.

Precedence when sources disagree:

1. User's latest written instruction.
2. Actual code/data and reproducible tests on the integration baseline.
3. `docs/CURRENT_IMPLEMENTATION_PLAN.md`.
4. `docs/MASTER_DELIVERY_PLAN.md`, `docs/CONTINUATION_PLAN.md`, `SEO_CMS_PLAN_v5.6.md`, then README/history.

## Shared operating protocol

### W0 setup

1. Confirm the primary checkout is clean; preserve and report any unowned changes instead of stashing, resetting, or overwriting them.
2. Fetch read-only, record `origin/main` SHA, create/reuse local branch `codex/seo-integration`, and never push it.
3. Create one sibling worktree/branch per worker:

| Window | Worktree | Local branch |
| --- | --- | --- |
| W1 | `...\Esencial-w1` | `codex/seo-w1-parity` |
| W2 | `...\Esencial-w2` | `codex/seo-w2-technical` |
| W3 | `...\Esencial-w3` | `codex/seo-w3-content` |
| W4 | `...\Esencial-w4` | `codex/seo-w4-performance` |
| W5 | `...\Esencial-w5` | `codex/seo-w5-platform` |

Base all worktrees on `codex/seo-integration`. W1–W5 must stop if their assigned worktree/branch is missing, dirty with unknown work, or attached to another window.

### Before every stage

Each window must:

1. Inspect `git status`, worktrees, branches, integration log, relevant code/reports, and current tests. Do not trust plan checkboxes or old prose.
2. Fast-forward/merge the latest local `codex/seo-integration` into its own clean branch before new edits.
3. Determine state using the rules below. Do no implementation when dependencies are not passed.
4. Commit a unique report at `audit/parallel/stage-XX-<slug>.md`; start with `Status: IN_PROGRESS` and commit subject `SEO-SXX START: <scope>`.
5. Stay inside assigned files. Ask W0 for shared-file work; do not race-edit.

### Stage-state detection

- **PASS:** integration history contains `SEO-SXX PASS:` and the integrated report says `Status: PASS` with passing evidence.
- **IN PROGRESS:** the owning worker branch contains a newer `SEO-SXX START:` without PASS/BLOCKED.
- **BLOCKED:** the newest owning-branch marker/report is `SEO-SXX BLOCKED:` and names the exact external input or failed prerequisite.
- **READY:** every dependency is PASS and no newer claim exists.
- **NOT READY:** any dependency is not PASS.
- Existing code is only evidence. The owner may produce an audit-only PASS commit when all acceptance checks already pass.
- W0 alone accepts PASS into `codex/seo-integration`. A worker-branch PASS is pending review, not project truth.

Useful checks:

```powershell
git log codex/seo-integration --oneline --grep='SEO-S'
git log --all --oneline --grep='SEO-SXX'
git worktree list
git status --short
```

### Report and handoff contract

Every stage report must contain only:

- `Status: IN_PROGRESS | PASS | BLOCKED`
- baseline/integration SHA and timestamp
- scope inspected; relevant pre-existing implementation
- files changed and why
- commands/tests and exact outcomes
- Playwright routes/viewports and visual-diff results when relevant
- unresolved risks, external/manual needs, and prohibited actions not taken
- final local commit(s) and recommended merge order

Finish with one local commit `SEO-SXX PASS: <outcome>` or `SEO-SXX BLOCKED: <reason>`, then tell W0 the branch, commit, report, dependencies, and shared/generated files. Do not merge or push.

## Windows, ownership, and stages

| Window | Stages | Primary ownership |
| --- | --- | --- |
| **W0** | S0, integration, S14, S15, S22 | baseline, status decisions, merges, access gates, shared hotspots, final reports |
| **W1 / Worker A** | S1, S5, S10, S16, S21 | visual behavior, semantics, accessibility, CMS visual system and editorial QA |
| **W2 / Worker B** | S3, S4, S8, S17 | technical/international SEO, schema, project editor and filter taxonomy |
| **W3 / Worker C** | S6, S7, S9, S18 | project/image SEO, performance and frontend-connected preview |
| **W4 / Worker D** | S2, S11, S12, S13, S19, S20 | cleanup, analytics/consent, CMS safeguards, CI and CMS integration |

Shared hotspots owned by **W0** unless explicitly handed off in writing: `package.json`, lockfiles, `vercel.json`, workflow files, `scripts/build-project-pages.js`, `public/robots.txt`, `public/sitemap.xml`, generated project HTML, and any file needed by two active windows. A specialist may submit a precise recommendation or a new isolated helper/test; W0 performs/writes the shared integration.

Ownership transfers only after the prior owner's PASS is integrated: W1 → W3 for performance edits to base CSS/JS/assets; W2 → W4 for final CI enforcement; W1 → W2/W3/W4 after the shared CMS shell is integrated. No two windows edit the same file concurrently.

## Dependency graph and work packages

| Stage | Owner | Starts when | Required result / acceptance |
| ---: | --- | --- | --- |
| **S0 Baseline + architecture** | W0 | immediately | Clean known baseline; current branch/SHA and dirty-state disposition recorded; build/run instructions verified; routes, generators, generated files, content/CMS flow, analytics decision, reports, and ownership mapped; worktrees created. |
| **S1 Visual/function parity** | W1 | S0 PASS | Playwright live/local comparison for four shell routes at existing 1024/1280/1440 desktop and 375/390/430 mobile sizes; navigation/interactions, computed styles, and key geometry checked; no unexplained regression beyond the recorded per-route baseline. |
| **S2 Legacy/dead-code analysis** | W4 | S0 PASS | Evidence-based dependency/reachability inventory; classify keep/remove/quarantine. Remove only proven-dead items within ownership and only with S1 parity unchanged; never purge historical WordPress paths blindly. |
| **S3 Technical SEO audit** | W2 | S0 PASS | Crawl all built canonical URLs; 200/indexability, robots, sitemap, status behavior, canonical host, duplicates, internal links, language pairing, and crawl noise verified. No live redirect/DNS changes. |
| **S4 Metadata + hreflang** | W2 | S3 PASS | Unique factual title/description, one self-canonical, correct reciprocal `sv`/`en` plus justified `x-default`, language attributes, and social metadata per indexable page; generated from sources, not hand-patched. |
| **S5 Semantic HTML** | W1 | S1 + S3 PASS | One meaningful H1, logical headings/landmarks, crawlable anchors, correct buttons/links/lists/figures; visuals and interaction unchanged. |
| **S6 Project SEO** | W3 | S0 PASS; use S3 findings | Audit all 26 bilingual pairs and permanent URLs; improve only approved facts; preserve overview grids/anchors; validate translation relationships, related links, and content uniqueness. Missing facts/rights become blockers—never inventions. |
| **S7 Image SEO** | W3 | S6 PASS | Every informative image has accurate contextual alt, dimensions/source relation/credit/rights status; decorative alt is empty; filenames/captions are useful without stuffing; meaningful images remain `<img>`/`picture`. Coordinate derivatives with W4. |
| **S8 Schema/entity** | W2 | S3 + S4 + S6 PASS | One consistent Esencial entity and page-specific JSON-LD reflecting visible approved facts; valid URLs/images/language; no unsupported claims, fake ratings, breadcrumbs, search, service, or local-business data. Validate parsability and official validators where available. |
| **S9 Performance/CWV** | W4 | S1 + S7 PASS | Measure before editing; optimize images/fonts/CSS/JS/cache hints without visual drift; no layout shift from media/fonts; record desktop/mobile Lighthouse/Web Vitals and asset totals; no measured regression, with target good thresholds (LCP ≤2.5s, CLS ≤0.1, INP ≤200ms where measurable). |
| **S10 Accessibility** | W1 | S1 + S5 PASS | Keyboard flow, visible focus, skip/landmarks, names, alt handling, heading order, `lang`, contrast, zoom/reflow, reduced motion, and automated axe/Playwright checks; WCAG 2.2 AA basics with zero serious/critical known violations; exact identity retained. |
| **S11 Analytics cleanup** | W4 | S0 + S3 PASS | Preserve the current analytics + consent decision; no duplicate tracking, secrets, fabricated metrics, or unsupported returning-visitor claim; consent/source/error states and strict CMS-origin API behavior verified. External activation/token work is reported, not performed. |
| **S12 CMS/Sanity safeguards** | W4 | S0 PASS; align with S6/S7 | Validate schemas/workspace for required bilingual SEO, slugs, hero/gallery/floor plans, alt/credit/rights, publication states, preview safety, empty export, and editor-friendly errors. No Sanity production writes. |
| **S13 CI/SEO quality gates** | W4 | S3–S12 PASS | CI runs deterministic install/build, CMS content, SEO, links, Studio, relevant Playwright/visual/a11y tests, and controlled failure fixtures; invalid content cannot replace a valid build; summaries identify the first actionable failure. No remote workflow run/push. |
| **S14 Final integrated validation** | W0 | S1–S13 PASS and all accepted | Freeze candidate; rebuild from clean install; run full tests/crawl/parity/performance/a11y/security review; independent read-only audits; correct findings; rerun to green; issue final evidence report and local commit map. No release action. |
| **S15 Sanity access gate** | W0 | S14 PASS + local robot token | Verify project-scoped access read-only without displaying the token. Keep `.env.local` ignored. No Studio deploy, dataset migration, role change, or production content write. |
| **S16 CMS visual system** | W1 | S15 PASS | Build one calm vertically scrolling `Arbetsyta` using Esencial typography, spacing, color and interaction language; modularize shared shell so later workers own separate feature folders. |
| **S17 Projects + filters** | W2 | S16 PASS | Add safe project creation, bilingual headings, filter-category documents, explicit project membership and order/visibility controls; generate navbar/grid filters without invented classifications or broken permanent URLs. |
| **S18 Live preview + layout guards** | W3 | S16 PASS | Connect protected draft preview to the real frontend renderer; desktop/tablet/mobile, draft/published views, click-to-edit where viable, and deterministic overflow/overlap/clipping diagnostics. Text that can disturb layout blocks review instead of being silently truncated. |
| **S19 Statistics + consent** | W4 | S11 + S15 + S16 PASS | Place aggregated provider data in the same workspace; keep secrets server-side and show honest empty/error states. Block non-essential analytics before consent; accept/reject equally easy; provide persistent change/withdraw control and bilingual purpose/provider information. |
| **S20 CMS integration** | W4 | S17–S19 PASS | Integrate the three feature packages into one workspace and frontend content path; resolve shared files centrally; validate draft, publish, filter, preview, analytics and consent behavior together. |
| **S21 Editorial QA** | W1 | S20 PASS | Playwright/manual desktop and mobile review, keyboard/accessibility, hostile text/media/filter fixtures, editor guide and no serious known visual, privacy or workflow defect. |
| **S22 Final CMS validation** | W0 | S21 PASS | Clean builds and full frontend/CMS regression suite; evidence and human-acceptance checklist. No production release, Studio deploy, analytics activation or legal sign-off. |

## Parallel schedule

| Wave | May run simultaneously | Gate to next wave |
| --- | --- | --- |
| **A — complete** | S0–S7 | Verified checkpoint `032bfea` |
| **B** | W1:S10 · W2:S8 · W3:S9 · W4:S11 | Four isolated PASS handoffs; S12 remains queued behind W4 |
| **C** | W4:S12 | S8–S12 PASS |
| **D** | W4:S13 | S13 PASS |
| **E** | W0:S14; W1–W4 perform scoped read-only audits | Full SEO plan PASS |
| **F** | W0:S15 | Sanity robot token verified locally; explicit access report |
| **G** | W1:S16 | Shared CMS shell and ownership split integrated |
| **H** | W2:S17 · W3:S18 · W4:S19 | Three isolated CMS feature PASS handoffs |
| **I** | W4:S20 | Integrated CMS workspace PASS |
| **J** | W1:S21 | Editorial QA PASS |
| **K** | W0:S22; W1–W4 perform scoped read-only audits | Final evidence green; human acceptance remains |

If a window reaches a NOT READY stage, it reports the missing PASS marker and stops; it does not poll, sleep, or start another window's work.

## Integration rules for W0

1. Review worker report and diff; reject scope creep, unverified generated output, secrets, facts without sources, and unrelated formatting churn.
2. Merge local worker branches into `codex/seo-integration` one at a time. After each merge, regenerate deterministic output and run the stage's focused tests plus build/SEO/link checks.
3. Resolve shared-file changes centrally. Never accept “ours/theirs” wholesale or rewrite unrelated user work.
4. A failed merge verification returns to the owning window; no PASS marker is accepted until corrected.
5. After integration, notify that worker to fast-forward/merge the new integration head before its next stage.
6. Keep local commit history and final report sufficient for later human review. Do not push, open a PR, or deploy.

## Final validation minimum

From a clean dependency install and clean tree, S14 must verify:

```text
build
SEO validator
internal-link validator
CMS-content validator
Studio-workspace validator
functionality checks
Playwright live/local parity at all agreed viewports
screenshot diff + key computed-style/bounding-box checks
project-language/canonical/hreflang/schema crawl
accessibility automation + keyboard/manual checks
performance measurements before/after
analytics consent/origin/error behavior
git secret scan and no draft/private indexing exposure
```

Acceptance is **zero unexplained failures**, not merely command exit code 0. Record unavailable external validators/accounts as manual gates; never fake a pass. Live visual differences caused by live-site drift must be demonstrated with timestamped evidence and owner review.

## Mandatory stop conditions

Stop, mark BLOCKED, and tell the user/W0 when:

- model/effort is wrong or unverifiable;
- dependency PASS is absent, another window owns/touches the file, or the worktree contains unknown changes;
- work needs invented project facts, unapproved translation, image rights/credit assumptions, or an irreversible content migration;
- a secret, paid/external account, authenticated primary-user session, Sanity production write, Git push/PR, deployment, DNS/hosting/live-domain action, or production redirect is required;
- exact visual/function parity would regress and no verified equivalent exists;
- current code conflicts with a decision source and precedence above does not resolve it;
- destructive cleanup or scope expansion is proposed;
- tests remain non-deterministic or fail for reasons the window cannot safely resolve within its ownership.

When blocked, preserve the last known-good state, include the smallest concrete decision/input needed, and do not continue into dependent stages.

## Quality bar

- Evidence before edits; root-cause fixes before patches; minimal reversible diffs.
- Exact typography, spacing, imagery, ordering, breakpoints, and interaction on existing pages.
- Factual Swedish/English content only; no keyword stuffing, hidden SEO text, unsupported schema, doorway pages, or AI-search gimmicks.
- Stable crawlable HTML, permanent URLs, accessible media, secure draft handling, deterministic generation, and actionable CI failures.
- Test representative and edge content on desktop and mobile. Review source, rendered DOM, network/status behavior, screenshots, and generated artifacts.
- No stage is PASS with known serious accessibility, broken-link, indexability, schema, privacy, security, or parity regression.
