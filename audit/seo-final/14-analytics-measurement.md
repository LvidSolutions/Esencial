# Analytics cleanup and measurement

Status: PASS

## Baseline

- Worker/stage: W4 / S11 only. S12 remained queued and was not started.
- Branch: `codex/worker-d-s11`
- Starting and integration SHA: `77935aacd3fab3bb454600bcfe4c775eaa04f982`
- Verified at: `2026-08-22T14:52:25+02:00`
- `node orchestration/status.mjs --json`: registry valid; S11 effective state `READY`; S0 and S3 dependencies `DONE`; S12 also `READY` but explicitly not launched.
- Worktree/branch preflight: exact isolated worktree and branch, required starting SHA, and clean working tree.

## Scope inspected and pre-existing implementation

- Read `ESENCIAL_PARALLEL_CODEX_RUNBOOK.md`, `orchestration/stages.json`, and `docs/CURRENT_IMPLEMENTATION_PLAN.md` fully before editing.
- Audited `api/analytics.js`, the analytics injector and all 56 generated HTML pages, Studio analytics components, environment placeholders, Vercel routing, setup documentation, package scripts, and repository-wide analytics references.
- The pre-existing adapter and setup guide still selected Matomo, returned an unsupported returning-visitor metric, allowed requests with no Origin, collapsed provider failures into ambiguous configuration states, and lacked the required `scripts/check-analytics.js` acceptance command.
- All 56 generated pages loaded `/_vercel/insights/script.js` unconditionally; no Cookiebot loader was present in the checked-in output. This contradicted the current Vercel Web Analytics + Cookiebot decision and the requirement to block non-essential measurement before consent.

## Files changed and why

- `api/analytics.js`: replaced Matomo with Vercel's public aggregated Web Analytics API; kept optional future Search Console server-side; added exact-origin/method enforcement, complete/partial configuration validation, provider schema validation and separate unavailable/empty/error/ready states; removed every returning-visitor field and added the explicit privacy limitation.
- `scripts/check-analytics.js`: added deterministic consent-disabled/enabled, duplicate/legacy, generated-page, CMS-origin, method, configuration, provider success/empty/error/malformed-response, and secret-isolation fixtures. No fixture calls an external provider.
- `scripts/inject-vercel-analytics.js`: made injection idempotent; without `COOKIEBOT_CBID` it emits no analytics resource; with a valid CBID it emits one Cookiebot loader and one `type="text/plain" data-cookieconsent="statistics"` Vercel script.
- `cms/studio/components/studioTools.tsx`: removed unsupported traffic fields and claims; shows the returning-visitor card as unavailable at the selected privacy level; distinguishes source unavailable, empty and fetch-error states without fallback figures.
- `docs/ANALYTICS_SETUP.md` and `docs/STAGING_SETUP.md`: reconciled operational guidance with the current Vercel Web Analytics + Cookiebot decision and documented external/manual gates.
- `package.json`: registered `check-analytics` and placed it after deterministic analytics injection in the clean build gate.
- Generated output: all 56 checked-in `public/**/index.html` files were regenerated through repository scripts. With no local CBID they contain one disabled marker and zero Vercel/Cookiebot/Matomo/GA/GTM runtime loads. No generated page was hand-edited.
- `audit/seo-final/14-analytics-measurement.md`: replaced the placeholder with this evidence and handoff report.
- No orchestration state file, lockfile, `vercel.json`, external account, workflow, DNS, deployment, or production resource changed.

## Commands and exact outcomes

- `node orchestration/status.mjs --json` — PASS: valid registry; S11 effectively `READY`; no errors; warning only that Worker D must launch one of S11/S12, satisfied by launching S11 only.
- `corepack pnpm run check-analytics` — PASS: 56 generated pages; consent-disabled and consent-enabled fixtures; strict allowed/missing/foreign origin; OPTIONS/GET/unsupported method; unavailable, empty, provider success, provider error and malformed provider responses; credential isolation.
- `corepack pnpm run build` with `COOKIEBOT_CBID` absent — PASS: legacy cleanup 4/4; 52 project pages and sitemap built; analytics check 56/56; SEO 56 pages/56 sitemap URLs/56 unique canonicals; international SEO 56 pages (28 Swedish, 28 English); semantics 56/56; project SEO 52/52; image SEO 104 uses; architecture fixture PASS; internal links 56/56.
- Generated analytics inventory after build — PASS: 56 HTML files, 56 analytics markers, 56 disabled markers, 0 Vercel scripts, 0 Cookiebot scripts, 0 Matomo runtime references, and 0 unsupported returning-visitor fields in runtime code.
- Consent-enabled fixture — PASS: exactly one Cookiebot loader and exactly one Vercel resource marked `type="text/plain" data-cookieconsent="statistics"`; duplicate injection remained one marker/loader/resource.
- Origin fixtures — PASS: missing Origin `403`; foreign Origin `403` without `Access-Control-Allow-Origin`; exact CMS preflight `204`; unsupported method `405`; exact CMS GET exercised all response states.
- Secret scan over current tracked content and `git log -p --all --full-history` using high-confidence private-key, GitHub, Vercel, Google, Slack, AWS and generic key formats — PASS: 0 current files, 0 history matches, 1 tracked environment file (`.env.example`), 0 unexpected tracked environment files.
- `git diff --check` — PASS: no whitespace errors.
- `npm --prefix cms/studio run build` before dependency installation — NOT RUN TO COMPILATION: local `sanity` executable was absent.
- `npm --prefix cms/studio ci` — PASS: 1,148 locked packages installed; npm reported 21 pre-existing dependency advisories (10 moderate, 11 high) and one allow-scripts warning for `esbuild@0.28.1`; no lockfile changed.
- `npm --prefix cms/studio run build` after the clean install — PASS: output folder cleaned and Sanity Studio built in 11.365 seconds. Sanity warned that auto-update runtime versions differ from locked local `sanity`/`@sanity/vision` 6.4.0; no deploy occurred.

## External/manual gates, unresolved risks and prohibited actions

- Local S11 is complete without external access. An authorized owner must still activate Vercel Web Analytics, create and store a least-privilege read token/team/project identifiers, configure Cookiebot for the exact staging domain, and later create the production Search Console property/service account. These actions were not performed.
- An authorized staging deploy must verify in a real browser network trace that no Vercel analytics script or intake request occurs before/after rejection, that it begins only after statistics consent, and that consent can be changed or withdrawn. The local fixture proves generated markup and fail-closed behavior, not the external Cookiebot account configuration or legal correctness.
- The live Web Analytics API was not called because no external credential/account use was authorized. Tests use the response schema documented by Vercel and strict local provider fixtures; the first authorized staging connection must compare 7/30/90-day totals and top pages with Vercel's dashboard.
- Exact Origin/CORS enforcement protects the browser integration but is not authentication against a non-browser client capable of forging an Origin header. If aggregated statistics later require stronger confidentiality, add an authenticated server boundary rather than a Studio-embedded secret.
- The Studio's locked dependency tree currently reports 21 npm advisories and runtime auto-update version drift. This is pre-existing and outside S11's analytics ownership; review it before S16/S19 or final release without applying an unreviewed breaking `npm audit fix --force`.
- Cookiebot purpose/provider wording, equal prominence of accept/reject, retention/controller details and final legal approval remain human decisions.
- No Vercel Analytics, Cookiebot, Search Console, Sanity, GitHub or other external account was activated or mutated. No push, PR, merge, deploy, DNS, production, workflow or orchestration-state action occurred.

## Commit and recommended integration order

- Final local commit: this report is included in the single commit with subject `SEO-S11 PASS: consent-gated Vercel measurement`.
- Recommended order: W0 reviews and integrates this S11 commit after the current Wave B baseline, before Worker D starts S12 and before any later S19 analytics/consent workspace work. Regenerate output and rerun `corepack pnpm run check-analytics` plus `corepack pnpm run build` after conflict resolution, especially if another wave changed `package.json`, `cms/studio/components/studioTools.tsx`, generated HTML, or the injector.
