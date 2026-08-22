# Stage 1 — Live/Repository Reference Parity

Status: Complete
Date: 2026-08-21
Reference: `https://www.esencial.se/`
Repository commit audited: `0980032b20ab069c49e94289954d9a27dd2a079d`

## Outcome first

The rebuilt repository now preserves the live site's layout and interaction model across every required desktop, tablet, and mobile viewport tested. Two genuine visual regressions were found and fixed. The final automated gate reports zero geometry, computed-style, structural, console, or tested-interaction mismatches across 40 page/viewport pairs.

## What was inspected

Routes:

- `/`
- `/om-oss/`
- `/projects/`
- `/about/`

Viewports:

- 1920×1080, 1440×1200, 1280×1000, 1024×900
- 820×1180, 768×1024
- 430×932, 390×844, 375×812, 360×800

Checks:

- full-page screenshots and Pixelmatch diffs;
- x/y/width/height measurements for header, navigation, logo, filters, grids, cards, about content, and footer;
- computed typography, spacing, positioning, color, opacity, transform, and transition styles;
- document width/height, overflow, card count, filter labels, and navigation labels;
- grid image fitting and crop behavior;
- hover state, filter behavior, expanded-project scrolling, and language-link mapping;
- browser console errors;
- response status for the four live routes;
- clean build, SEO validation, internal links, and repeat-build stability.

## Findings and issue records

### PARITY-001 — Semantic project images cropped differently

- ID: PARITY-001
- Category: Visual parity / image rendering
- Priority: P1
- Problem: semantic grid `<img>` elements used `object-fit: cover` while the live design uses `background-size: contain`.
- Evidence: initial raw screenshot differences reached 17.6253% on mobile portfolio pages, with visibly enlarged/cropped photographs and drawings.
- SEO impact: neutral; the semantic image remains crawlable.
- User impact: high because the architecture portfolio's image composition changed.
- Performance impact: none material.
- Implementation complexity: low.
- Regression risk: low; the rule is scoped to `img[data-seo-image="grid"]`.
- Recommended fix: make semantic grid images use `contain` while leaving featured-image crop behavior unchanged.
- Files affected: `public/wp-content/themes/esencial/css/styles.css`.
- Validation: ten-viewport screenshot recapture plus crop equivalence in `check-reference-parity.js`.
- Status: Fixed.

### PARITY-002 — Unapproved visible services block changed both about pages

- ID: PARITY-002
- Category: Visual/content parity
- Priority: P2
- Problem: both repository about pages contained a visible “Services and Projects” block absent from the live reference.
- Evidence: every about-page viewport had a larger local document height; for example, `/om-oss/` at 1440×1200 was 249 px taller before correction.
- SEO impact: removing generic added copy avoids design-led keyword stuffing; no verified factual source justified keeping it.
- User impact: medium because the page's rhythm and information hierarchy changed.
- Performance impact: negligible.
- Implementation complexity: low.
- Regression risk: low.
- Recommended fix: remove the two unapproved visible blocks and preserve the live information hierarchy.
- Files affected: `public/om-oss/index.html`, `public/about/index.html`.
- Validation: all about-page document heights and measured boxes now match live at ten viewports.
- Status: Fixed.

### PARITY-003 — Required viewport coverage was incomplete

- ID: PARITY-003
- Category: Automated visual QA
- Priority: P2
- Problem: the prior harness covered six viewports and omitted 1920px desktop, both tablet sizes, and 360px mobile.
- Evidence: `VIEWPORTS` previously contained only 1440, 1280, 1024, 430, 390, and 375 widths.
- SEO impact: indirect; responsive failures can hide crawlable/user-visible content.
- User impact: medium.
- Performance impact: test runtime increases, production does not.
- Implementation complexity: low.
- Regression risk: low.
- Recommended fix: use the full ten-viewport matrix from the brief.
- Files affected: `scripts/recovery-utils.js`, regenerated screenshot/evidence files.
- Validation: 40 live/local screenshot pairs captured.
- Status: Fixed.

### PARITY-004 — Prior checks did not verify behavior against live

- ID: PARITY-004
- Category: Functional QA
- Priority: P2
- Problem: the old functionality check tested local navigation at one mobile viewport but did not compare live and local interactions.
- Evidence: the old report covered only local route responses, first-link hover, and scroll height.
- SEO impact: indirect; broken filters or expansion can hide portfolio content from users.
- User impact: high if a regression occurs.
- Performance impact: test-only.
- Implementation complexity: medium.
- Regression risk: low.
- Recommended fix: add live/local state comparisons for geometry, styles, structure, crop behavior, hover, filtering, card expansion, scrolling, language links, and console errors.
- Files affected: `scripts/check-reference-parity.js`, `package.json`.
- Validation: 40 page/viewport pairs and four interaction scenarios pass.
- Status: Fixed.

### PARITY-005 — Raw pixel scores overcount harmless rendering differences

- ID: PARITY-005
- Category: Visual regression methodology
- Priority: P3
- Problem: the prior report counted antialiasing as ordinary image difference and exposed only one number.
- Evidence: about-page text produces red raw-diff pixels despite exact boxes/styles and no visible layout change.
- SEO impact: none.
- User impact: none directly; misleading tests can cause unnecessary changes.
- Performance impact: test-only.
- Implementation complexity: low.
- Regression risk: low.
- Recommended fix: report both raw and antialias-tolerant Pixelmatch percentages and interpret them with DOM/style/interaction evidence.
- Files affected: `scripts/compare-screenshots.js`, regenerated visual diff reports.
- Validation: tolerant and raw metrics are both present for all 40 pairs.
- Status: Fixed.

### PARITY-006 — Intentional semantic differences from live

- ID: PARITY-006
- Category: Intentional improvement
- Priority: P3 documentation
- Problem: the repository is not byte-identical to live because earlier SEO work added semantic headings, lists, images, alt text, project-detail links, corrected language metadata, and other head metadata.
- Evidence: DOM inspection shows semantic elements locally that are absent from the live WordPress output, while geometry/style comparisons remain equal.
- SEO impact: positive in principle; correctness will be re-audited in later SEO stages.
- User impact: no intended visual change; project-title links also provide an explicit route to new project pages and therefore extend the live interaction model.
- Performance impact: not assessed in Stage 1.
- Implementation complexity: already implemented.
- Regression risk: medium until later semantic/SEO phases validate every detail.
- Recommended fix: retain for now, classify as `INTENTIONAL IMPROVEMENT`, and re-audit rather than assuming correctness.
- Files affected: existing overview HTML and project generators.
- Validation: visual/functional parity plus later SEO stages.
- Status: Accepted for Stage 1; requires later audit.

## Final validation results

### Geometry, styles, and behavior

- Page/viewport pairs: 40
- Pairs with bounding-box differences above 0.75 px: 0
- Pairs with selected computed-style differences: 0
- Pairs with structural/document-dimension differences: 0
- Pairs with console errors: 0
- Interaction scenarios: 4
- Interaction mismatches: 0

### Screenshot comparison

- Screenshot pairs: 40
- All live/local screenshot dimensions match.
- Maximum antialias-tolerant difference: 1.5743%.
- Mean antialias-tolerant difference: 0.5109%.
- Maximum raw difference: 2.5875%.
- Mean raw difference: 0.8511%.
- The highest residual occurs on the 768px about pages. Side-by-side inspection shows identical layout and content; exact box/style equality plus the tolerant/raw gap classifies it as text/image rasterization and semantic-image pipeline variation, not a reference mismatch.

## Changes made

- Added the four missing required viewports.
- Added a dedicated live/local parity gate and raw evidence outputs.
- Corrected semantic grid image fitting from `cover` to `contain`.
- Removed the unapproved services blocks from Swedish and English about pages.
- Made the local server return a no-op Vercel Analytics resource so local console checks model deployment behavior.
- Improved pixel reports to separate raw and antialias-tolerant differences.
- Made analytics-marker replacement whitespace-stable; consecutive production builds now produce identical output.

## Files changed

Source and tooling:

- `package.json`
- `scripts/check-reference-parity.js`
- `scripts/recovery-utils.js`
- `scripts/compare-screenshots.js`
- `scripts/inject-vercel-analytics.js`
- `public/wp-content/themes/esencial/css/styles.css`
- `public/om-oss/index.html`
- `public/about/index.html`

Evidence:

- `audit/seo-final/stage-1-parity-evidence.md`
- `audit/seo-final/stage-1-parity-evidence.json`
- `audit/visual-captures.json`
- `audit/visual-diff-report.md`
- `audit/visual-diff-report.json`
- `screenshots/live/`, `screenshots/local/`, and `screenshots/diff/`

## Commands run

```text
corepack pnpm install --frozen-lockfile
corepack pnpm run build
corepack pnpm run check-functionality
corepack pnpm run check-reference-parity
corepack pnpm run verify-visual
corepack pnpm run compare-screenshots
```

The production build generated 52 project pages, validated all 56 sitemap URLs, and passed internal-link validation. A second consecutive build changed zero `public/` hashes.

## Remaining uncertainty

- The live site can change after this dated capture.
- Chromium was the automated rendering engine; Safari/Firefox-specific rendering remains untested.
- The new project-detail pages have no direct live equivalent, so they were not classified as reference-matched pages.
- Keyboard/focus accessibility, reduced motion, performance, and full SEO correctness belong to later stages.
- Existing semantic project-title links intentionally extend the live interaction model; their final UX/accessibility treatment should be reviewed in Stages 5, 6, and 10.

## Beginner explanation

Pixel parity is not just “the screenshots look close.” A reliable comparison uses several layers:

1. Screenshots reveal crops, missing images, colors, and visual shifts.
2. Bounding boxes prove that important elements occupy the same coordinates and dimensions.
3. Computed styles prove that CSS resolves the same way.
4. Interaction tests prove that filters, hover, expansion, scrolling, and language navigation still work.
5. A small pixel difference can remain even when the page is functionally and visually equivalent because fonts and images are rasterized through slightly different DOM paths.

The most important Stage 1 lesson is that semantic SEO markup must inherit the reference design's rendering rules. An `<img>` is better for discovery and accessibility than a CSS background, but it still needs `object-fit: contain` here to preserve the architect's intended composition.
