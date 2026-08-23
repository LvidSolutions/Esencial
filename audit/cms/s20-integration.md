# S20 Integrated CMS Workspace and Frontend Synchronization

Status: PASS

Date: 2026-08-23
Lane: Worker D
Stage: S20
Model/effort: GPT-5.6 Sol / high
Branch: `codex/worker-d-s20`
Verified starting HEAD: `bdcd64a97e25eb4d835ef83d647b6eb5cfe15e1b`

## Outcome

S17 project/filter editing, S18 protected live preview and S19 consent-gated analytics are composed into the three official S16 vertical workspace slots. The active Studio uses the native S17 editor and draft helper; the obsolete S16 project/home placeholder and the second, unvalidated analytics dashboard path are no longer callable. Stable slot order is enforced and duplicate, missing or unexpected composition fails instead of silently replacing a feature.

The published Sanity boundary now exports navigation settings and filter membership with the already-published project snapshot and routes them through S17's `resolveProjectNavigation()`. Only a complete, explicitly enabled, published configuration changes the project overview. Missing, disabled, incomplete, malformed, draft-tainted or conflicting input returns the exact legacy overview bytes passed to the resolver. Configured project exclusions apply to both the grid and matching feed; included grid cards and feed containers receive the same authored `all` and category attributes, preserving the existing filter/open interaction and permanent project URLs.

No category, label, membership, heading, order, project fact or legal wording was invented. With no local published navigation snapshot, the full build used the legacy path and produced no normalized public or asset diff.

## Integrated implementation

- `cms/studio/components/studioTools.tsx` now contains only the S16 shell composition for S17, S18 and S19. The dormant `WorkspaceAnalytics`, `GrowthTool`, `AnalyticsDashboard`, `PagePreviewTool`, old project/home workspaces and their helper code were removed.
- `cms/studio/components/studioTools.css` was removed because every selector served only the deleted placeholder implementation. Active S17/S18/S19 and S16 shell styles remain independently owned.
- `cms/studio/components/workspaceComposition.mjs`, its declaration and integration test enforce the official accessible vertical order and reject composition conflicts.
- `cms/studio/schemaTypes/index.ts` centrally registers `filterCategory` and `navigationSettings` without removing or weakening any S12 project, homepage or media schema.
- `cms/studio/deskStructure.ts` exposes the category list and the fixed `navigationSettings` singleton in native Studio structure.
- `scripts/fetch-sanity-content.js` adds one published-perspective navigation query to the existing atomic export boundary, includes project `translationKey`, rejects draft-tainted or malformed navigation, and writes `navigation.json` only after the complete snapshot validates.
- `scripts/build-project-pages.js` loads S17's resolver only for a Sanity navigation snapshot, guards all drafts, transforms the established overview markup, and fails back to its exact legacy input on any contract or markup mismatch. Configured grid/feed selection, order and membership are changed together.
- `scripts/build-project-pages-navigation.test.mjs` covers configured output, exact missing/disabled/malformed fallback, drafts, incomplete pairs, conflicting taxonomy and a real `scripts.js` Playwright category/All/grid-to-feed interaction.
- `scripts/check-studio-workspace.js` was retargeted from deleted placeholder markers to active S17/S18/native schema paths. Its forbidden canonical-mutation and browser-secret scans now cover the active projects, preview, `AnalyticsConsentFeature`, `analyticsClient` and analytics contract modules; dedicated S19 checks remain separate.

## Shared hotspots

Each shared edit was essential and kept at the existing contract boundary:

| Hotspot | Reason |
| --- | --- |
| `cms/studio/schemaTypes/index.ts` | Central registration is required for native Studio schema availability. Existing S12 schemas and order were retained. |
| `scripts/fetch-sanity-content.js` | The existing single published Sanity query/export boundary is the only safe place to add navigation data. |
| `scripts/build-project-pages.js` | The existing deterministic generator is the only public synchronization boundary. |
| `scripts/check-studio-workspace.js` | The workspace safeguard otherwise tested deleted code and omitted the active S19 browser modules. |

No package manifest, lockfile, orchestration file, image, image-selection rule, crop, framing, compression, LCP visual setting, deployment or provider configuration changed.

## Verification

All checks ran locally. No Sanity mutation, migration, import or publication; preview deployment; provider activation; token display/copy; push; PR; DNS; hosting or production action occurred.

| Check | Result |
| --- | --- |
| Branch/HEAD/registry | PASS; branch and starting HEAD matched; registry valid; S17/S18/S19 DONE and S20 effective READY. Coordinator separately marked S20 RUNNING. |
| S17 resolver + generator tests | PASS; 12/12 combined contract/integration tests, including configured grid/feed synchronization, exact fallback, draft/incomplete/malformed/conflict negatives and the Playwright filter/All/open interaction. |
| Sanity export fixtures | PASS; six invalid project/home exports plus malformed and draft navigation fail closed; missing navigation retains legacy mode. |
| S18 layout/re-handshake | PASS; 10 long-copy viewport cases, 7/7 blocking diagnostic classes and zero unexpected console errors. |
| S19 consent/API/client | PASS; 56-page consent suite, strict origin/provider/secret isolation, ready/unavailable/empty/error positives and 21 malformed nested client contracts rejected. |
| Studio composition, TypeScript, lint and production build | PASS; 2/2 conflict/order tests; `tsc --noEmit`; full ESLint with zero warnings; Sanity Studio production build. |
| Studio safeguards | PASS; all 30 schema/workspace/export checks, no direct canonical mutation and no browser-delivered server secret. |
| CI contract negative fixtures | PASS; 14 ordered release gates and six missing/skipped/reordered/automatic-publication/no-op contracts rejected. |
| Full public build/content/SEO/links | PASS; 52 project pages, 56 sitemap/indexable pages, 28 Swedish + 28 English, 56 H1s, 52 CreativeWork entities, 104 generated image uses and all internal links. |
| HTTP/functionality/performance/accessibility | PASS; 56 canonical responses, 55 redirects, four functionality pages, six performance cases with zero budget failures, 56 accessibility routes/216 images/70 headings with zero errors. |
| Reference parity | PASS; 40 page/viewport pairs and four interaction scenarios. |
| Exact inactive fallback | PASS; normalized `public/**` and `public/assets/**` diffs are empty after the full build. Baseline/current blob hashes: `public/index.html` `df083d7a8fb067c707216e70b5e2b3ca00419e94`; `public/projects/index.html` `68b6aeb9aef1653f929dc741358fb2b011c06340`. |
| Image quality | PASS; 78 derivatives retain uncropped framing; 51 photos meet SSIM >= 0.975 (worst 0.9756); 27 drawings remain lossless. |

The local runtime was Node v24.16.0 while the repository and CI require Node 22.x. Frozen installs and every listed validation passed; S21/CI must repeat on the pinned Node 22 runtime.

## Protected preview acceptance and human blockers

S18's exact-origin iframe handshake, fresh viewport re-handshake, `noindex`/`no-store` contract, real frontend DOM/CSS/assets and draft perspective are preserved. No read token is sent to the browser. This worktree had no authorised protected staging origin/session, so authenticated preview review remains honestly blocked. Local fixtures prove layout and messaging only; they are not real preview acceptance.

S21 must perform the following on an authorised staging environment:

1. Sign in through the approved protection layer and verify the configured origin is exact HTTPS and the iframe receives the expected origin-bound handshake.
2. Verify draft-only edits render with the real frontend DOM, CSS and assets at desktop, tablet and mobile widths; reload and switch widths to prove every re-handshake.
3. Confirm preview responses and containing Studio route remain non-indexable and non-cacheable, and inspect browser/network state to prove that no Sanity read token or other credential is exposed.
4. Exercise keyboard order, focus visibility, headings, 375 px reflow, 200% zoom, long content, reduced motion and all blocked/unavailable/error recovery messages with editors.

Analytics remains disabled because complete owner-approved consent configuration is absent. Controller identity, bilingual legal/purpose/provider wording, retention, Cookiebot domain group, Vercel/Search Console accounts, least-privilege server credentials, provider comparisons and activation require authorised owners. Exact CORS origin is not authentication; the API authentication/Deployment Protection model must be approved and tested before staging activation.

## S21 handoff

Run editorial usability and accessibility acceptance against this integrated workspace, concentrating on the three-section reading/keyboard order, native project/filter workflow, authenticated real preview, honest unavailable states and analytics/legal controls. Repeat the complete release gates on Node 22. Do not treat fixture preview, local analytics states or CORS as staging authentication evidence, and do not enable navigation or analytics until the authored CMS and owner-approved external configuration are complete.
