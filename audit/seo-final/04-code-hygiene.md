# Stage 2 — Dead Code and WordPress Legacy Cleanup

Status: Complete
Date: 2026-08-22
Repository commit audited: `0980032b20ab069c49e94289954d9a27dd2a079d` plus the uncommitted Stage 1 worktree
Protected reference: `https://www.esencial.se/`

## Outcome first

Only legacy code proven unnecessary at runtime was removed. The cleanup deletes 10 obsolete files and 60 repeated markup fragments from the four recovered core pages, reducing `public/` by 860,165 bytes while preserving exact measured geometry, selected computed styles, document dimensions, browser behavior, and the established screenshot baseline.

The old ExactMetrics/Google Analytics wrapper is gone. Vercel Web Analytics remains the single active repository-injected analytics implementation. jQuery core, the theme CSS/JavaScript, WordPress upload paths, three used Roboto weights, recovery utilities, and the dormant Matomo integration utility were deliberately retained because they are either active dependencies or documented future/recovery tooling.

## What was inspected

The audit searched source, output, scripts, documentation, asset maps, and runtime markup for:

- `wp-content`, `wp-includes`, `wp-json`, `xmlrpc`, WordPress generator and shortlink markup;
- Simply Static/WP2Static traces, `simply_static_page`, staging/development domains, and old production URLs;
- ExactMetrics, MonsterInsights, Google tag/collect copies, Matomo, Cookiebot, and duplicated analytics paths;
- jQuery, jQuery Migrate, theme interaction dependencies, inline JavaScript, speculation rules, and unreachable/commented code;
- Gutenberg/global/classic-theme CSS, WordPress admin-bar/P404 CSS, dashicons and their fonts;
- Roboto font declarations and actual theme font-weight use;
- duplicate image hashes, unreferenced upload images, source maps, empty assets, and generated versus intentional recovery tooling;
- browser-loaded styles/scripts and filter, feed-opening, scroll-position, and carousel behavior.

## Classification summary

| Classification | Examples | Decision |
| --- | --- | --- |
| Proven dead runtime code | ExactMetrics bootstrap/event plugin, local Google tag copy, WordPress admin/P404 styles, Gutenberg/global styles, generator/shortlink/speculation markup | Removed |
| Obsolete compatibility layer | jQuery Migrate 3.4.1 | Removed after interaction testing showed no dependency |
| Orphaned assets | dashicons CSS/fonts, zero-byte analytics collect response, unused Roboto 100/700 files | Removed |
| Active legacy-path dependency | jQuery core 3.7.1, theme CSS/JS, upload media | Retained |
| Intentional tooling | crawl/download/rewrite scripts, Matomo injector documented by the CMS workflow | Retained; not shipped as active page code |
| Deferred media dependency | absolute production image URLs in carousel data | Retained because later carousel images are not all localized; review in Stage 7 |

## Findings and issue records

### HYGIENE-001 — Obsolete ExactMetrics wrapper duplicated analytics behavior

- ID: HYGIENE-001
- Category: Analytics legacy / dead JavaScript
- Priority: P1
- Problem: each core page loaded a copied Google tag library, a 6.9 KB inline ExactMetrics compatibility bootstrap, the ExactMetrics event plugin, and stale `simply_static_page` locations.
- Evidence: all four pages contained ExactMetrics 9.1.3 markup and `G-184CTVXJM4`; the recovery also stored a 430,669-byte Google tag copy, a 31,695-byte plugin script, and a zero-byte collect response.
- SEO impact: indirect but material; stale page locations can contaminate landing-page attribution and make organic measurement unreliable.
- User impact: unnecessary tracking code and avoidable JavaScript execution.
- Performance impact: 462,364 repository bytes plus repeated inline markup removed; the exact compressed network saving depends on deployment compression and cache state.
- Implementation complexity: medium because analytics ownership and consent behavior had to be separated from visual dependencies.
- Regression risk: medium; measurement can silently disappear if no replacement exists.
- Recommended fix: remove the obsolete WordPress wrapper, retain the already implemented Vercel Web Analytics injection, and design final measurement in Stage 11.
- Files affected: four core HTML files and the deleted ExactMetrics/Google analytics assets listed below.
- Validation: runtime DOM/resource inspection, legacy-pattern scan, build, console checks, and full parity suite.
- Status: Fixed. Final analytics requirements remain a Stage 11 decision.

### HYGIENE-002 — WordPress editor and admin styles shipped to public visitors

- ID: HYGIENE-002
- Category: Dead CSS / WordPress legacy
- Priority: P1
- Problem: the public export included Gutenberg presets, classic-theme rules, global block styles, the admin bar, dashicons, and a P404 admin dropdown despite containing no public admin bar or Gutenberg blocks.
- Evidence: public markup used none of the WordPress/admin selectors. The only live rule needed outside those systems was `.screen-reader-text`; admin CSS also supplied a 32/46 px `scroll-padding-top` that affected project-opening behavior.
- SEO impact: reduced render-blocking CSS and less irrelevant WordPress fingerprinting; the semantic H1 remains available to crawlers and assistive technology.
- User impact: no intended visual change. During testing, removing the admin CSS exposed a 32 px desktop / 46 px mobile scroll-anchor mismatch, which was corrected with two generic theme rules.
- Performance impact: 192,252 asset bytes removed for admin CSS, dashicons CSS, and dashicon font files, plus repeated inline CSS removed from every core page.
- Implementation complexity: medium because two useful behaviors had to be extracted from otherwise dead stylesheets.
- Regression risk: initially medium, reduced to low after ten-viewport geometry and interaction parity.
- Recommended fix: keep only the screen-reader utility and breakpoint scroll offsets in the theme stylesheet.
- Files affected: `public/wp-content/themes/esencial/css/styles.css`, four core HTML files, deleted files under `public/wp-includes/css/` and `public/wp-includes/fonts/`.
- Validation: hidden H1 computed style, 40 reference pairs, 4 interaction scenarios, and 40 screenshot pairs.
- Status: Fixed.

### HYGIENE-003 — jQuery Migrate loaded although no deprecated API was required

- ID: HYGIENE-003
- Category: JavaScript dependency hygiene
- Priority: P2
- Problem: every core page loaded jQuery Migrate in addition to jQuery core.
- Evidence: the theme uses ordinary jQuery 3.7-compatible selectors, events, class changes, traversal, and animations; direct browser tests and the full parity gate passed without Migrate.
- SEO impact: indirect through lower script work and payload.
- User impact: none intended.
- Performance impact: 13,579 bytes and one linked script per core page removed before transport compression.
- Implementation complexity: low.
- Regression risk: low after filter, feed-open, scrolling, and image-cycle checks.
- Recommended fix: remove Migrate, retain jQuery core until the active interaction script is intentionally rewritten and tested.
- Files affected: four core HTML files; deleted `public/wp-includes/js/jquery/jquery-migrate.min.js`.
- Validation: direct browser interactions, parity interaction scenarios, console report.
- Status: Fixed. jQuery core is intentionally retained.

### HYGIENE-004 — Static export exposed stale WordPress-only metadata and prefetch rules

- ID: HYGIENE-004
- Category: HTML/metadata legacy
- Priority: P2
- Problem: WordPress generator metadata, PHP-style shortlinks, favicon-plugin comments, and speculation rules targeting `/esencial/wp-*` remained in static pages.
- Evidence: these fragments appeared once per core page and pointed at functionality that the static deployment does not expose.
- SEO impact: removes misleading discovery hints and legacy crawl/prefetch noise. Canonical and hreflang correctness is reserved for Stages 3–4.
- User impact: none.
- Performance impact: small HTML reduction and avoided irrelevant prefetch evaluation.
- Implementation complexity: low.
- Regression risk: low.
- Recommended fix: remove the stale fragments while retaining favicon, canonical, hreflang, and other active metadata.
- Files affected: four core HTML files and `scripts/clean-legacy-export.js`.
- Validation: idempotent cleanup run plus forbidden-pattern scan.
- Status: Fixed.

### HYGIENE-005 — Two Roboto font weights were declared but not used

- ID: HYGIENE-005
- Category: Font asset hygiene
- Priority: P2
- Problem: Roboto 100 and 700 were downloaded and declared although the four Roboto-based pages explicitly use only 300, 400, and 500. Generated project pages use Arial and do not load this font stylesheet.
- Evidence: theme CSS and core markup contain no effective Roboto 100/700 use; `<strong>` inside the feed is explicitly normalized by the theme.
- SEO impact: indirect through lower asset inventory and potential font transfer.
- User impact: none; the used weights remain byte-identical.
- Performance impact: 89,608 bytes removed.
- Implementation complexity: low.
- Regression risk: low.
- Recommended fix: remove the two unused `@font-face` blocks and files.
- Files affected: local Google-font CSS and two deleted `.ttf` files.
- Validation: computed font/geometry parity and screenshot comparison.
- Status: Fixed.

### HYGIENE-006 — Some legacy-looking paths are active, not dead

- ID: HYGIENE-006
- Category: Intentional retention
- Priority: P3 documentation
- Problem: path names alone can make active assets look removable.
- Evidence: jQuery core drives filters, feed expansion, scrolling, text toggles, and carousel animation; theme CSS/JS and upload images are referenced throughout 56 pages; recovery scripts reproduce the original capture; Matomo tooling is documented by the planned CMS workflow but is not injected by the production build.
- SEO impact: neutral now. Premature removal would break user-visible content and behavior.
- User impact: high if removed blindly.
- Performance impact: jQuery remains a future optimization candidate, but replacing active behavior is not a dead-code deletion.
- Implementation complexity: medium to high for a native rewrite and full compatibility testing.
- Regression risk: high without a dedicated rewrite.
- Recommended fix: retain and document. Reassess jQuery during performance work, Matomo during analytics work, and absolute carousel media URLs during image work.
- Files affected: retained assets under `public/wp-content/`, `public/wp-includes/js/jquery/jquery.min.js`, recovery scripts, and `scripts/inject-matomo-tracker.js`.
- Validation: static reference mapping plus direct browser behavior.
- Status: Accepted intentional retention.

## Weight impact

### Repository output

| Metric | Before Stage 2 | After Stage 2 | Change |
| --- | ---: | ---: | ---: |
| `public/` files | 186 | 176 | -10 |
| `public/` bytes | 32,088,295 | 31,228,130 | -860,165 (-2.68%) |
| Four core HTML pages | 587,403 | 485,063 | -102,340 (-17.42%) |

### Core HTML by page

| Page | Before | After | Change |
| --- | ---: | ---: | ---: |
| `/` | 263,982 | 238,408 | -25,574 |
| `/projects/` | 239,421 | 213,832 | -25,589 |
| `/om-oss/` | 41,987 | 16,398 | -25,589 |
| `/about/` | 42,013 | 16,425 | -25,588 |

Each core page also stops linking 555,239 uncompressed bytes of obsolete analytics/admin/Migrate assets. Dashicon fonts added up to another 112,956 bytes if requested. These are source-byte figures, not a claim about compressed transfer or Core Web Vitals; field performance belongs to Stage 9.

## Files changed

Implementation:

- `scripts/clean-legacy-export.js` — deterministic, idempotent cleanup and forbidden-fragment guard.
- `package.json` — added `clean:legacy` and made cleanup the first production-build step.
- four core `public/**/index.html` files — removed 60 dead fragments.
- `public/wp-content/themes/esencial/css/styles.css` — retained only the screen-reader utility and scroll offsets needed for parity.
- local Roboto font CSS — removed unused 100/700 declarations.
- `README.md` — corrected dependency and verification documentation.

Deleted assets:

- ExactMetrics frontend JavaScript and the copied Google tag library;
- zero-byte Google Analytics collect response;
- WordPress admin-bar and dashicons CSS;
- dashicons EOT and TTF files;
- jQuery Migrate;
- Roboto 100 and 700 TTF files.

All deletions are tracked by Git and recoverable before or after a commit.

## Validation results

- Production build: pass; 52 project pages generated.
- SEO validation: pass.
- Internal links: pass across all 56 sitemap URLs.
- Cleanup idempotence: first run changed 4 pages/removing 60 fragments; second and subsequent runs changed 0.
- Deterministic output: two consecutive complete builds produced the same `public/` fingerprint, `A133EEDAE75FC7ECCE74990D2FBC45CBA14C7E5DA3268BC952173A7E0CD8C83C`.
- Reference geometry/style/structure: 40 pairs, 0 failures.
- Reference interactions: 4 scenarios, 0 mismatches.
- Console errors: 0.
- Functionality report: 4 pages, 0 bad checked links, hover pass on all.
- Screenshot pairs: 40 with identical dimensions.
- Pixel diff: max 1.5743% tolerant / 2.5875% raw; mean 0.5109% tolerant / 0.8512% raw, consistent with the Stage 1 rasterization baseline.
- Direct in-app browser: filter activation, feed opening, scroll landing, image cycling, forbidden-markup absence, and 1×1 px clipped semantic H1 verified.

## Commands run

```text
npm run clean:legacy
npm run build
npm run check-reference-parity
npm run verify-visual
npm run compare-screenshots
npm run check-functionality
node --check scripts/clean-legacy-export.js
```

## Remaining uncertainty and deferred work

- The live site can change after the dated capture.
- Chromium is the tested browser engine; Safari and Firefox remain untested.
- The carousel data still references production-domain images because many later carousel assets are not localized. Removing those URLs now would break image cycling; Stage 7 should localize/optimize the complete set.
- jQuery core is active. A native rewrite could save more weight, but it is an implementation migration rather than dead-code removal and should be protected by expanded carousel/text-toggle tests.
- Vercel Web Analytics is the current implementation. Whether Matomo/Cookiebot, GA4, or another measurement design is required remains an explicit Stage 11 decision.
- Historical recovery audit files intentionally still mention removed assets; they are provenance evidence, not shipped runtime references.

## Beginner explanation

“Old” does not mean “unused.” The safe way to clean a site is to trace what the browser actually loads and what each interaction calls. Here, most WordPress admin and plugin files truly had no public job, so they were removed. jQuery looks old too, but it still runs visible filters and the image viewer, so deleting it would be a regression. The result is smaller because proven baggage is gone, not because working features were gambled away.

STAGE 2 COMPLETE. Ready to proceed to Stage 3 after confirmation.

Next stage model: **GPT-5.6 Sol — high** for Stage 3 (indexability, redirects, canonicals, robots, and sitemap).
