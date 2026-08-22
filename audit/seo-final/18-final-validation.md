# Final Integrated Validation

Status: PASS for the local SEO/CMS foundation. This is not production-release authorization.

## Candidate and scope

- Integrated starting candidate: `218af03833645b0e75d9ada60e3fca374f14e304`; S14 orchestration start: `ef659337af618235dc35c283403ae9f25745c3ff`.
- Four isolated specialist audits covered visual/accessibility, technical SEO/schema, performance, and CMS/analytics/CI security. The coordinator independently reran all claimed acceptance checks on the integration worktree.
- No push, PR, remote CI, deployment, DNS change, Sanity write, production mutation, or secret disclosure occurred.

## Audit findings corrected

1. Normal SEO and CMS CI now execute six fail-closed fixtures. The static contract also rejects a no-op root build and automatic CMS publication.
2. CMS content must pass the exact integrated build chain, HTTP SEO, project audit, functionality, performance, and accessibility before an artifact exists.
3. `repository_dispatch` is validation-only. A push to `main` requires a separate manual `workflow_dispatch` with `authorize_publish=true`; the write job receives no Sanity secret and consumes only the exact validated artifact.
4. The package contract locks the complete ordered root build, immutable actions, runtime pins, permissions, timeouts, artifacts, and secret boundaries.
5. Studio auto-updates are disabled. `sanity`/`@sanity/vision` are pinned to 6.10.1, React/React DOM to matching 19.2.8, and the frozen Studio tree reports zero npm vulnerabilities.
6. Image generation is timestamp-free and deterministic. Adaptive WebP encoding raises quality only when required; no derivative may crop, distort aspect ratio, or fall below the perceptual threshold.

## Integrated results

- Root/SEO: 56 indexable pages, 56 sitemap URLs and canonicals, 28 Swedish plus 28 English pages, 52 `CreativeWork` entities, 52 visible breadcrumbs, 56 primary images, and all internal links passed.
- Content: 52 bilingual project pages passed source, schema, translation, image-rights, and publication safeguards.
- Visual/function: 40 live/local page-viewport pairs and four interaction scenarios passed with zero measured geometry, style, structural, console, or interaction mismatch; four shell routes and internal navigation passed.
- Accessibility: 56 routes, 216 images, 70 headings, zero errors.
- Runtime performance: six route/viewport cases, 58 grid derivatives, zero local LCP/CLS/long-task/synthetic-latency budget failures; derivative total 7,987,646 bytes remains below 8 MiB.
- Image experience: 78 total derivatives retain uncropped framing; 51 photos meet SSIM similarity `>= 0.975` (worst `0.9756`); 27 grid drawings remain lossless and project drawings retain their originals. Only three photos needed quality 92 instead of 90. Manual original/derivative review of the two unique raised-quality photos found no visible crop, blur, block, halo, tone, texture, or color regression.
- Determinism: two image builds were byte-identical. Consecutive exact Node 22.19.0 root builds produced 255 files with SHA-256 tree digest `7759FD921A7B8DEEE55E91A2F8872CFB7D1B164BB1EC2895F349264F3D8B73EE`.
- Studio: frozen install, zero-vulnerability npm audit, safeguard check, and exact Node 22.19.0 production build passed with auto-updates disabled.
- Orchestration/CI: registry tests 11/11; workflow YAML formatting passed; 14 ordered SEO gates and six negative fixtures passed; tracked secret scan and `git diff --check` passed.

## Commands accepted

- `corepack pnpm run build`
- `corepack pnpm run check-http-seo`
- `corepack pnpm run audit:project-content`
- `corepack pnpm run check-functionality`
- `corepack pnpm run check-performance`
- `corepack pnpm run check-accessibility`
- `corepack pnpm run check-reference-parity`
- `corepack pnpm run check-image-quality -- --evidence audit/performance/image-quality-evidence.json`
- `corepack pnpm run check-ci-gates` and `node scripts/check-ci-gates.js --fixtures`
- `npm ci --ignore-scripts`, `npm audit`, and exact Node 22.19.0 Sanity build from `cms/studio`
- exact Node 22.19.0 deterministic root rerun and `node --test orchestration/status.test.mjs`

## Remaining release blockers

- Simulated mobile Lighthouse from S9 remains above the 2.5-second LCP target on the uncompressed local recovery server (home 5.57 s, about 4.10 s, representative project 2.56 s). Quality was not reduced to hide this. Re-measure an authorized compressed/CDN preview and use field RUM/CrUX before production go/no-go.
- The current aggregate analytics endpoint validates browser origin but origin is not authentication. Provider secrets remain server-only and providers are unconfigured, but S19 must add authenticated Studio access before analytics data is enabled in production.
- Cookie categories, consent copy, retention, vendors, controller facts, Search Console ownership, and legal/privacy sign-off require verified human decisions.
- Production push, deployment, DNS and final release remain separately authorized human actions. S14 does not authorize them.

## Handoff

S15 may verify the local project-scoped Sanity token with read-only requests after this PASS is integrated. S16-S22 remain responsible for the visual CMS workspace, editor/filter controls, authenticated live preview and analytics, integration, editorial QA, and final workflow validation.
