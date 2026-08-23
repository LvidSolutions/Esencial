# S21 CMS usability, accessibility and editorial acceptance

Status: PASS

- Lane: Esencial W1 / Worker A
- Stage: S21
- Model/effort: GPT-5.6 Sol / high (tool-confirmed PASS)
- Branch: `codex/worker-a-s21`
- Starting HEAD: `fb24f2f9b3b312e8d892010ad97f6baef4f032b2`
- Review completed locally: 2026-08-23 (Europe/Stockholm)
- Host runtime: Node v24.16.0; repository/CI requirement: Node 22.x

## Outcome

The integrated S16–S20 workspace passes deterministic editorial UX, keyboard, accessibility, hostile-copy and responsive acceptance with no known serious local product defect. The established Esencial visual identity and all public frontend/image output remain unchanged.

Two serious local-editor risks were found and fixed:

1. The workspace claimed all S17 changes were saved while values could still exist only in form memory. It now reports only that the latest read/save operation completed, while each dirty form gives an explicit unsaved status.
2. Saving one language heading could reset an unsaved heading in the other language because both values shared one synchronization effect. Swedish and English fields now synchronize independently.

The first navigation guard then exposed a recovery dead end for invalid unsaved values. Headings, filter categories and grid settings now have visible keyboard-operable reset buttons that restore the exact currently loaded values. Project/category switches and validation/publication escape links are disabled while the relevant form is dirty or saving. No confirmation with an implicit destructive choice was introduced.

Additional corrections programmatically label preview control groups and rename/label grid removal as **Ta bort från kladd**, making its draft-only scope explicit. No custom delete or publication operation exists.

## Acceptance matrix

| Area | Result | Evidence |
| --- | --- | --- |
| Downward visual/reading order | PASS | Fixed `projects-filters` → `live-preview` → `analytics-consent` composition; one H1, section H2s, child H3/H4 order; no positive tabindex. |
| Keyboard and focus | PASS | Skip link and source-order Tab flow; visible 3 px focus; native controls; keyboard Upp/Ned plus keyboard reset recovery. |
| Labels, instructions and touch | PASS | Inputs/selects have native or explicit accessible labels; preview groups use `role="group"`/`aria-labelledby`; all tested controls are at least 44 px. |
| Status and recovery | PASS | Explicit loading, saving/saved-operation, unsaved, error, blocked and unavailable text; no color-only state; errors say published content was unchanged. |
| Responsive/reflow | PASS | Eight Playwright cases: 375 px, 768 px, 1440 px and 720 px 200%-equivalent reflow, each with long Swedish/English strings; no page-level horizontal scroll, clipping or control overlap. |
| Reduced motion | PASS | Reduced-motion cases compute transition duration at or below 0.01 ms. |
| Project/filter safety | PASS | Custom writes target `drafts.*`; published IDs are not patched; native document publication remains separate; explicit membership/inclusion/order only; no drag dependency or custom delete/publish action. |
| Public/generated reach | PASS | Exact `git diff --quiet HEAD -- public` and `public/assets` both exit 0 after the full build. |
| Protected real preview | **BLOCKED_HUMAN** | No authorised staging origin/session was present. Local fixture evidence is intentionally insufficient. This is neither PASS nor a product defect. |
| Analytics truth/privacy | PASS locally / BLOCKED_HUMAN for activation | Strict nested real-data validation, daily visitor sums labelled non-unique, no browser Authorization, consent/provider path disabled without complete approval; CORS is not authentication. |
| Subjective editor/legal acceptance | **BLOCKED_HUMAN** | Owner/editor wording, project facts, memberships, privacy decisions and legal approval require authorised humans. |

## Deterministic S21 coverage

`node scripts/check-cms-ux.js` combines source-contract checks with a local noindex/no-store Playwright fixture that imports the active S16–S19 CSS. It checks:

- ordered landmarks/headings and keyboard focus order;
- visible focus and 44 px controls;
- explicit field/group labels and text states;
- long Swedish/English text at phone, tablet, desktop and 200%-equivalent reflow;
- page overflow, clipping and control overlap;
- reduced motion;
- keyboard Upp/reset behavior;
- invalid blank heading and invalid filter membership recovery;
- selection/publication-view guards while local edits are dirty;
- draft-only writes and errors that preserve published content;
- exact-origin/source/versioned preview handshake, fresh viewport remount, fixture labelling, server-only token/noindex/no-store contract;
- strict analytics response validation, daily visitor sum wording, unavailable returning visitors, consent gating and CORS/authentication distinction.

Result: PASS — eight responsive editorial cases and all static contracts. Authenticated protected preview is emitted as `BLOCKED_HUMAN` when authorised staging/session is absent.

## Files changed

Owned S21 paths:

- `scripts/check-cms-ux.js` — deterministic integrated editorial UX gate.
- `tests/cms/editorial-workspace.html`
- `tests/cms/editorial-workspace.css`
- `tests/cms/editorial-workspace.js` — local hostile-text, keyboard, recovery and status fixture.
- `docs/CMS_USER_GUIDE.md` — concise Swedish nontechnical editor guide.
- `audit/cms/s21-editorial-qa.md` — this evidence.

Essential Studio-only shared fixes:

- `cms/studio/features/projects/ProjectHeadingEditor.tsx` — independent language synchronization, dirty guard and exact reset.
- `cms/studio/features/projects/FilterCategoryEditor.tsx` — dirty guard, exact reset and guarded publication-view navigation.
- `cms/studio/features/projects/GridNavigationEditor.tsx` — explicit draft-removal label, dirty status, exact reset and guarded publication-view navigation.
- `cms/studio/features/projects/ProjectsFiltersSection.tsx` — honest operation-complete status wording.
- `cms/studio/features/projects/projectsFilters.css` — existing-token unsaved-state text styling.
- `cms/studio/features/preview/LiveFrontendPreview.tsx` — accessible programmatic control-group labels.

No public frontend, image, crop, framing, compression, LCP, schema, generator, lockfile, package manifest, orchestration or provider configuration changed.

## Verification

| Check | Result |
| --- | --- |
| S21 deterministic UX | PASS — 8 responsive cases; keyboard order/reset; invalid recovery; labels, focus, targets, headings, reflow, long sv/en, states and reduced motion. |
| S17 + S20 contract/integration | PASS — 14/14 tests, including Playwright filter/All/grid-to-feed interaction; six invalid Sanity exports rejected. |
| S18 layout/preview | PASS — fresh viewport handshake contract, 10 long-copy cases, 7/7 blocker classes, zero unexpected console errors. |
| S19 consent/API/client | PASS — 56-page consent suite; strict origin/provider/secret isolation; ready/unavailable/empty/error positives and 21 malformed nested responses rejected. |
| Studio TypeScript and full lint | PASS — zero errors/warnings. |
| Studio production build | PASS — Sanity 6.10.1 build. |
| Studio safeguards | PASS — all 30, including no canonical mutation/browser secret. |
| Full root build | PASS — 52 generated project pages, 56 sitemap/indexable pages, SEO/international/schema/semantics/project/image/content/internal-link gates. |
| Functionality | PASS — four core pages. |
| Accessibility | PASS — 56 routes, 216 images, 70 headings, zero errors. |
| Performance | PASS — six route/viewport cases, zero LCP/CLS/long-task/synthetic-latency budget failures. |
| Reference parity | PASS — 40 live/local page/viewport pairs and four interaction scenarios. |
| Public/assets diff | PASS — exact Git diff exit 0 for `public/**` and `public/assets/**`; no path emitted. |
| Image quality | PASS — 78 derivatives uncropped; 51 photos SSIM ≥ 0.975 (worst 0.9756); 27 drawings lossless. |
| `git diff --check` | PASS. |

The accessibility and parity harnesses both reserve loopback port 3000, so an attempted parallel invocation produced `EADDRINUSE`. Both were rerun serially and passed. This was a test-run scheduling conflict, not product behavior.

## BLOCKED_HUMAN: protected preview

S21 had no authorised authenticated staging origin/session. A human with approved access must:

1. Confirm the exact HTTPS preview origin and protected session.
2. Verify draft, published and staging identities on representative Swedish/English overview and project routes.
3. Switch desktop/tablet/mobile widths and confirm each receives a fresh exact-origin, exact-iframe handshake.
4. Inspect real DOM, CSS, assets and imagery at 200% zoom with long content and reduced motion.
5. Confirm `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`, restrictive framing/CSP and no token/secret in URL, HTML, browser code or logs.

Until then the product correctly shows review as blocked and the local fixture remains identified as a fixture.

## Other human blockers

- Owner/editor approval of final Swedish/English headings, filter labels, membership, order, project facts and media rights.
- Controller identity, purposes, categories, providers, retention, bilingual privacy information and legal approval.
- Approved staging API authentication/Deployment Protection; exact CORS origin alone is not authentication.
- Cookiebot, Vercel Web Analytics and optional Search Console account/configuration/least-privilege credential activation and real-provider comparison.
- Sanity Studio/web deployment, provider activation, production publication and release approval.

## S22 handoff

Repeat S21 and the full CMS/release suite on CI's required Node 22.x runtime. Then complete authenticated protected-preview acceptance and owner/editor/legal checklists without treating fixture results as staging evidence. Keep navigation/analytics disabled until authored CMS data and owner-approved external configuration are complete.

## Prohibited actions not taken

No `.env` or token read/copy/display, Sanity mutation/migration/import/publication, provider activation, deploy, push, PR, DNS/hosting/production action, orchestration edit, invented fact/translation/category/membership/legal wording, destructive cleanup, public visual/image change or image processing occurred.
