# S17 project editor, filter taxonomy and grid navigation

Status: **PASS**

- Lane: Esencial W2 / Worker B
- Stage: S17
- Required model and effort: GPT-5.6 Sol / xhigh
- Branch: `codex/worker-b-s17`
- Starting HEAD: `7235840205326c453518fc30cabbed91ec5e003f`
- Worker PASS commit: `bba077fa2608d718629bfb9e93ad3e2abd4cd5ed`
- Integrated coordinator commit: `72cf09cf4627b1fd1b638b33fe46efc68b9f44eb`
- Verification date: 2026-08-23 (Europe/Stockholm)
- Sanity version: `6.10.1`

## Outcome

S17 provides an isolated `projects-filters` Studio feature package for S20 to compose into the S16 workspace. It adds guarded bilingual project-heading editing, editor-authored bilingual filter categories and navigation labels, explicit project membership, and explicit grid inclusion/order. All custom writes target `drafts.*` documents; publishing remains a native, validated Sanity action.

The feature does not register shared schema types or alter the public generator in this worker commit. This preserves the current Studio shell and exact public frontend until S20 performs the shared composition. Missing, disabled, or malformed navigation configuration resolves to the exact supplied legacy object, without inventing a category, translation, membership, label, project fact, or order.

## Implemented contract

- `ProjectHeadingEditor.tsx` edits titles only for existing Swedish and English project documents, shows the pair side by side, and links to the native document editor for validated publication. It does not create or infer a translation.
- `filterCategoryType.ts` defines a stable key, Swedish and English labels, unique explicit order, explicit visibility, and explicit membership by published Swedish side of a complete bilingual pair. Async validation rejects key mutation, duplicate key/order, missing labels, orphaned references, and incomplete pairs.
- `navigationSettingsType.ts` defines the singleton navigation configuration, opt-in enablement, bilingual headings/navbar labels, and ordered grid entries with explicit inclusion. Validation rejects duplicate/unpublished/incomplete pair references and an enabled configuration with no included project.
- `FilterCategoryEditor.tsx` and `GridNavigationEditor.tsx` provide editor controls over labels, membership, inclusion, and order. Every ordered row has visible `Upp`/`Ned` keyboard-operable buttons; drag-and-drop is neither required nor implemented.
- `drafts.ts` canonicalizes document IDs, clones an existing published document into its draft when necessary, and only patches/commits the draft ID.
- `navigationContract.mjs` is the deterministic S17/S20 boundary. Valid configured data yields explicit labels/categories/order/inclusion; absent, disabled, or invalid data returns the exact legacy input by identity.
- `ProjectsFiltersSection.tsx` exports `createProjectsFiltersSection()` with the S16 slot ID `projects-filters`, reads the draft perspective with CDN disabled, and reports status through the S16 extension contract.

## Deterministic fixtures

`cms/studio/features/projects/fixtures/navigationContract.test.mjs` contains seven fixtures covering:

1. Required schema field names.
2. Draft-only source safeguards, native publication, and non-drag ordering controls.
3. Explicit configured grid order, inclusion, bilingual navigation labels, and bilingual category labels.
4. Exact fallback for missing or disabled configuration.
5. Exact fail-closed fallback for malformed configured data.
6. Empty, orphaned, and incomplete category membership rejection.
7. Empty inclusion and unpublished navigation reference rejection.

## Final verification

All commands below passed from the S17 worktree after the resumed implementation was inspected:

- `node --test features/projects/fixtures/navigationContract.test.mjs` from `cms/studio`: 7/7 tests passed.
- `npx tsc --noEmit` from `cms/studio`: passed.
- `npx eslint . --max-warnings=0` from `cms/studio`: passed with zero warnings.
- `npx prettier --check features/projects schemaTypes/filterCategoryType.ts schemaTypes/navigationSettingsType.ts` from `cms/studio`: all new code matched repository formatting. The pinned `projectType.ts` baseline is intentionally compact and is not whole-file Prettier-clean; its cached S17 diff is exactly one field-line replacement, avoiding unrelated formatting churn.
- `npm --prefix cms/studio run build`: Sanity Studio production build passed.
- `node orchestration/status.mjs --json`: registry valid; only S17, S18, and S19 are effectively READY; zero errors/warnings.
- `node --test orchestration/status.test.mjs`: 11/11 tests passed.
- `node scripts/fetch-sanity-content.js --fixtures`: four invalid exports rejected; valid and explicit empty-home controls accepted.
- `corepack pnpm run check-studio-workspace`: 30 schema/workspace/export safeguards passed, including no canonical mutation or browser secret exposure.
- `corepack pnpm run check-content`: all 52 project records passed.
- `corepack pnpm run test-project-page-architecture`: confirmed that facts, narrative, and related links render only from confirmed source data.
- `corepack pnpm run build`: the full 56-page root build passed analytics, SEO, international SEO, structured data, semantic HTML, project SEO, image SEO, image quality, project architecture, and internal-link gates.
- Public-output comparison: `git diff --quiet HEAD -- public` returned success after the full build, proving no tracked public output changed.
- Image-quality result: 78 derivatives retained uncropped framing; 51 photos met SSIM similarity >= 0.975 (worst 0.9756); 27 drawing derivatives remained lossless.
- `git diff --cached --check`: passed. The staged allowlist contained only the five owned S17 path groups, and focused source scans found no environment/secret access, direct delete/canonical-create/canonical-patch/publish call, drag-and-drop implementation, or public image-delivery control.

Playwright parity/functionality was not rerun because this isolated S17 commit has no public-output reach: it changes no public file, generator, shared schema registration, or S16 composition. Authenticated integrated Studio interaction coverage belongs to S20/S21 after composition. The exact public-output diff and full image-quality/root gates were still rerun here.

The root commands emitted the existing engine warning because the host uses Node `v24.16.0` while the repository requests `22.x`; all listed checks passed. No dependency manifest or lockfile changed.

### Coordinator integration checks

W0 independently reviewed the draft-only data path and the editor UI against the accessibility, keyboard, labeling, error-feedback, responsive-layout and touch-target checklist. After integration it reran the seven S17 contract fixtures, TypeScript, focused ESLint, all 30 Studio safeguards, the Studio production build, the full 56-page root build with image-quality checks, and all 11 orchestration tests. All passed; generated public output and perceived image quality remained unchanged.

## Scope and safety

Intended commit scope is limited to:

- `cms/studio/features/projects/**`
- `cms/studio/schemaTypes/projectType.ts`
- `cms/studio/schemaTypes/filterCategoryType.ts`
- `cms/studio/schemaTypes/navigationSettingsType.ts`
- `audit/cms/s17-project-filters.md`

`projectType.ts` changes only the existing title field label/description so the selected-language heading can be edited without weakening any existing fact, slug, translation, status, SEO, or publication validation. No S18/S19 feature, shared shell/theme, shared schema index, root generator, public HTML, image, crop, framing, LCP, compression, orchestration, environment, token, provider, deployment, DNS, or production state was changed. No Sanity mutation or migration was run.

## Integration handoff for S20

1. Register `filterCategoryType` and `navigationSettingsType` in the shared schema index without duplicating or weakening existing S12/S16 project safeguards.
2. Import and compose `createProjectsFiltersSection()` into the S16 shared workspace slot. Preserve the stable `projects-filters` ID and vertical workspace order.
3. Extend the central published-content query/export to fetch published filter categories and the published `navigationSettings` singleton. Do not expose drafts to the public build.
4. Use `resolveProjectNavigation()` at the single shared generator boundary. Pass the current generated data as `legacy`; missing, disabled, or malformed configuration must continue returning that exact object.
5. Keep public generation disabled until an editor has deliberately authored, validated, and natively published complete bilingual labels, memberships, and grid order. Do not seed or infer editorial data.
6. After composition, rerun authenticated Studio keyboard/usability checks and the full Playwright visual/functionality suite, public-output diff, root build, and image-quality gates.

## Risks and blockers

- Blockers: none for the isolated S17 package.
- Until S20 registers/composes the package, the new schemas and controls are intentionally inactive and the frontend remains unchanged.
- The first real category set, labels, memberships, headings, and grid order require human editorial decisions and native Sanity publication; S17 deliberately supplies no invented defaults.
- Integrated authenticated Studio UI acceptance remains for S20/S21 because this worker used no credentials and made no external mutation.
- The local `ui-ux-pro-max` guide was applied for labeling, focus behavior, target sizing, responsive layout, and keyboard alternatives; its optional design-system query script was unavailable at the installed pointer, so no generated style recommendations were imported.

This report is included in the single local commit with subject `CMS-S17 PASS: add guarded project filters and grid navigation`. The resulting commit SHA is reported in the external handoff after commit creation.
