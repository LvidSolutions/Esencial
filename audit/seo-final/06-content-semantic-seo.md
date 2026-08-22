# Stage 5 — Semantic HTML and page structure

Status: Complete in the repository.

## Outcome

The four recovered core pages now expose a stable page outline without changing their visual design or the class hooks used by the legacy theme JavaScript. Every one of the 56 indexable documents is checked for a single, non-empty H1 and exactly one `header` and `main` landmark. The 52 generated project pages retain their existing single footer landmark; the four core pages now provide named mobile, primary, and secondary navigation landmarks.

## What changed

1. `scripts/normalize-core-semantics.js` is an idempotent source normalizer for `/`, `/projects/`, `/om-oss/`, and `/about/`. It converts only the structural wrapper elements while retaining the existing class names and therefore the CSS/JavaScript contract:
   - mobile-menu wrapper to a named `nav`;
   - shell wrapper to `header`;
   - primary and social/language wrappers to separately named `nav` elements;
   - content wrapper boundary to a single `main`.
2. About-page labels (`Om oss`, founders, location, enquiries, team, jobs, site credit) are real H2 headings. Their legacy class remains intact, and a minimal `margin-top: 0` reset preserves the former `<div>` geometry.
3. `scripts/check-semantic-html.js` turns the contract into a release gate. It validates all 56 sitemap documents, including landmark counts, non-empty H1s, core navigation structure, and project-page footers.
4. `npm run build` runs semantic normalization and the semantic check after project generation, so future builds cannot silently revert the structure.

## Why this matters

Search engines and assistive technologies do not infer a page’s logical regions from CSS classes. Native landmarks distinguish navigation from primary content, and a heading hierarchy tells them which topics belong to the page. Here, the semantic layer is deliberately separate from the visual layer: the browser sees the same CSS classes and layout, while machines receive an unambiguous document outline.

## Validation

- `npm run build` passed: content generation, legacy cleanup, metadata, international SEO, semantic HTML, and internal-link validation all returned zero errors.
- `npm run check-semantics` passed: 56 pages, including 4 core and 52 project pages, with 56 non-empty H1s.
- Browser render inspection of `/om-oss/` confirmed one header, one main, three correctly named navigation landmarks, and the expected seven H2 sections.
- Direct live/local computed-style comparison of the first about-page label found identical typography, margins, and bounding box; only the tag changed from `DIV` to `H2`.
- A fresh reference-parity run passed all 40 live/local page-viewport pairs and all four desktop/mobile interaction scenarios, with zero geometry, computed-style, structural, console, or interaction mismatches. Evidence: `stage-1-parity-evidence.json` generated 2026-08-21T22:51:18.453Z.

## Deliberate boundaries

This stage does not redesign content, invent missing project prose, turn legacy filter controls into new widgets, or alter the visual information architecture. Keyboard interaction, focus treatment, alternative text quality, and other user-interaction requirements remain Stage 10 accessibility work. More detailed project-page content architecture remains Stage 6.

## Files of record

- `scripts/normalize-core-semantics.js`
- `scripts/check-semantic-html.js`
- `package.json`
- `public/wp-content/themes/esencial/css/styles.css`
- `audit/seo-final/stage-1-parity-evidence.json`

## Next stage

Stage 6 covers project-page SEO architecture. Required model: **GPT-5.6 Sol — xhigh**.

---

## Stage S12 addendum — CMS and Sanity SEO safeguards

Status: PASS in the repository; external CMS activation and content actions remain manual gates.

### Outcome

Sanity Studio and its server-side export path now enforce the same bilingual publication contract as the static site: one Swedish/English pair per stable translation key, one shared stable slug, approved translation status, bounded language-specific SEO fields, explicit publication states/checklist, and complete media metadata/rights. The visual workspace reads a protected draft perspective and writes only `drafts.*` documents; native Sanity document validation is the sole final publication path.

Hero images, gallery images, and floor plans remain distinct schema/export types. Missing alt text is a blocking error, credit and rights are required, hidden gallery media is excluded from the public image list, and floor-plan assets cannot be exported as hero/gallery media. The generated legacy import is draft-only and intentionally remains blocked until unknown credits/rights are supplied or media is migrated.

The server exporter requests Sanity’s `published` perspective, never exposes its token to Studio, validates the complete bilingual project/home snapshot before writing, withholds provider error bodies, rejects zero/partial/invalid exports, and preserves a deliberate empty-home state. The S8 structured-data and S11 consent/analytics gates pass unchanged in the integrated root build.

### Validation

- `corepack pnpm run check-content`: PASS — 52 repository projects.
- `corepack pnpm run check-studio-workspace`: PASS — 30 schema/workspace/export safeguards and no canonical document mutation/browser secret exposure.
- `node scripts/check-cms-content.js --fixtures`: PASS — 11 unsafe exports rejected; valid bilingual control accepted.
- `node scripts/fetch-sanity-content.js --fixtures`: PASS — 4 invalid exports rejected; valid and explicit empty-home controls accepted.
- `npx tsc --noEmit` in `cms/studio`: PASS.
- `npx eslint . --max-warnings=0` in `cms/studio`: PASS.
- `npm ci` in `cms/studio`: PASS — 1,148 packages installed; npm reported 21 dependency advisories for separate review.
- `npm run build` in `cms/studio`: PASS; Sanity reported an auto-update version-alignment warning (local 6.4.0, hosted runtime 6.10.1).
- `corepack pnpm run build`: PASS — 56 indexable pages, 52 project pages/CreativeWork entities, international SEO, structured data, consent-disabled/enabled analytics fixtures, semantic HTML, image SEO, project architecture, and internal links.
- Consecutive root builds: PASS — 196 public files byte-identical.
- Repeated `npm run prepare:import`: PASS — generated NDJSON byte-identical.
- Secret scan: PASS — no high-confidence credential material in repository files and no server-only secret names in the built Studio bundle.
- Missing-token boundary fixture: PASS — failed before network/export and left generated content unchanged.

### External/manual gates and residual risk

- No Sanity token, account, dataset, role, webhook, Studio deployment, or production content was accessed or changed. The owner must perform those actions separately.
- Pilot one complete Swedish/English pair in the authenticated Studio, confirm native async pair validation against the real dataset, then verify the published result on staging desktop/mobile.
- Supply verified legacy image credits/rights or migrate those images; the draft import and strict exporter intentionally refuse to claim unknown rights.
- Align locked local Sanity packages with the hosted auto-update runtime and review npm’s dependency advisories before a future Studio deployment.
- A published slug change still requires a developer-owned redirect plan; CMS validation cannot create that redirect.

### Files of record

- `cms/studio/schemaTypes/projectType.ts`
- `cms/studio/schemaTypes/imageTypes.ts`
- `cms/studio/schemaTypes/homePageType.ts`
- `cms/studio/components/studioTools.tsx`
- `scripts/check-cms-content.js`
- `scripts/check-studio-workspace.js`
- `scripts/fetch-sanity-content.js`
- `docs/CMS_USER_GUIDE.md`
- `audit/parallel/stage-12-cms-safeguards.md`
