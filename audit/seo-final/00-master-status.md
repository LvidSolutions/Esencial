# Esencial SEO Finalization — Master Status

Last updated: 2026-08-22

## Repository provenance

- Requested repository: `https://github.com/LvidSolutions/Esencial`
- Audited commit: `0980032b20ab069c49e94289954d9a27dd2a079d`
- Branch: `main`
- The brief's original `C:\Users\andreas.hiller\...` path did not exist in this environment. A clean checkout was created at `work/Esencial`; all repository changes remain inside it.
- No push, pull request, merge, deployment, DNS change, or production write was performed.

## Stage status

| Stage | Scope | Status | Primary report |
| --- | --- | --- | --- |
| 0 | Baseline and architecture | Not executed by request; only the dependency baseline needed for Stage 1 was recorded | `01-repository-audit.md` |
| 1 | Live/repository visual and functional parity | Complete | `03-reference-parity.md` |
| 2 | Legacy/dead code | Complete | `04-code-hygiene.md` |
| 3 | Indexability, canonicals, status codes, robots, sitemap | Complete in repository; production cutover verification pending | `05-technical-seo.md` |
| 4 | Metadata and international SEO | Complete in repository; approved excerpt translations remain external content work | `09-international-seo.md` |
| 5 | Semantic HTML and page structure | Complete | `06-content-semantic-seo.md` |
| 6 | Project-page SEO | Complete in repository; factual content enrichment is awaiting client approval | `07-project-seo.md` |
| 7 | Image SEO | Complete in repository; credits/rights enrichment remains editorial work | `08-image-seo.md` |
| 8 | Structured data/entities | Not started | `10-structured-data-entity-seo.md` |
| 9 | Performance/Core Web Vitals | Not started | `11-performance-core-web-vitals.md` |
| 10 | Accessibility | Not started | `12-accessibility-seo.md` |
| 11 | Analytics and measurement | Not started | `14-analytics-measurement.md` |
| 12 | CMS publishing safeguards | Not started | `06-content-semantic-seo.md` and CMS documentation |
| 13 | CI/release quality gates | Not started; Stage 1 added a parity gate that will feed this stage | `17-automated-seo-quality-gates.md` |
| 14 | Final validation | Not started | `18-final-validation.md` |

## Stage 1 outcome

- All 40 combinations of four reference routes and ten required viewports match in measured bounding boxes, computed styles, document dimensions, card counts, filter labels, and navigation labels.
- Four representative interaction scenarios pass: hover, project filtering, card expansion/scrolling, and language-link mapping on desktop and mobile.
- Screenshot pairs have identical dimensions. The maximum antialias-tolerant pixel difference is 1.5743%; raw maximum is 2.5875%. Visual inspection and exact geometry/style checks classify the residual as rasterization plus the existing semantic-image rendering path, not a layout mismatch.
- Two genuine reference regressions were fixed: an unapproved visible services block on both about pages and `cover` cropping on semantic project-grid images.
- The production build, SEO validation, and internal-link validation pass. Two consecutive builds produce identical `public/` hashes.

## Stage 2 outcome

- Removed 60 proven-dead legacy fragments from the four core pages and deleted 10 obsolete WordPress/plugin/font assets.
- Reduced `public/` by 860,165 bytes (2.68%) and the four core HTML files by 102,340 bytes (17.42%).
- Removed the ExactMetrics/Google Analytics compatibility stack; retained Vercel Web Analytics as the current clean implementation pending Stage 11 measurement design.
- Retained active jQuery core, theme/upload paths, three used Roboto weights, recovery tooling, and documented future Matomo tooling because they are not dead code.
- Added an idempotent cleanup guard to the production build. Two consecutive final builds produce the identical `public/` fingerprint `A133EEDAE75FC7ECCE74990D2FBC45CBA14C7E5DA3268BC952173A7E0CD8C83C`.
- Revalidated 40 page/viewport pairs, four interaction scenarios, 40 screenshot pairs, four functionality routes, all 56 sitemap URLs, and the browser console with zero functional/reference failures.

## Stage 3 outcome

- Established one canonical URL contract: lowercase HTTPS `www` document URLs with a trailing slash except the root.
- Validated 56 discovered/indexable HTML pages against exactly 56 sitemap URLs and 56 unique self-canonicals, with zero warnings or errors.
- Added permanent apex-host consolidation, Vercel trailing-slash normalization, preview-host noindex, and API noindex to deployment configuration.
- Added a deterministic HTTP release check: 56 canonical 200 responses, 55 slashless 308 responses, real 404 behavior, query preservation, and correct robots/sitemap media types.
- Confirmed the current Netlify production site still returns 404 for `/robots.txt` and `/sitemap.xml`; repository resources are ready but require an authorized deployment and post-cutover crawl.
- Omitted sitemap `lastmod` until the content model provides trustworthy significant-update dates; no speculative historical redirects or image sitemap were added.
- Revalidated the production build, internal links, four core functionality routes, 40 live/local viewport pairs, and four interaction scenarios with zero failures. The `public/` fingerprint remains `A133EEDAE75FC7ECCE74990D2FBC45CBA14C7E5DA3268BC952173A7E0CD8C83C`.

## Stage 4 outcome

- Added a dedicated international metadata release gate covering all 56 sitemap pages: root language, exact/reciprocal `sv`/`en`/`x-default` clusters, paired source records, title/description uniqueness per language, and Open Graph/Twitter consistency.
- Corrected generated project `x-default` clusters so both language versions consistently name the Swedish fallback; no automatic visitor redirects were added.
- Made four core social-preview images absolute canonical-host URLs and added `twitter:image` to generated project pages.
- Preserved nine approved legacy excerpts that are not in the page language, marked each with its actual local language, and emitted factual page-language metadata fallbacks without inventing translations.
- `npm run build`, `npm run check-content`, `npm run check-international-seo`, technical SEO validation, and internal-link validation pass with zero Stage 4 errors.

## Stage 5 outcome

- Replaced only structural wrappers on the four core pages with native header, main, and named navigation landmarks while preserving all legacy classes, layout, and JavaScript hooks.
- Converted about-page section labels into visually identical H2 headings; all 56 sitemap documents now have exactly one non-empty H1, one header, and one main.
- Added an idempotent semantic normalizer and a deterministic semantic HTML release check to `npm run build`; core pages must expose three named navigation landmarks and project pages one footer.
- A local browser inspection confirmed the intended landmark tree and direct live/local styling of the converted heading is identical.
- Fresh visual/functionality parity validation passed: 40 page/viewport pairs and four interaction scenarios, zero mismatches or console errors.

## Stage 6 outcome

- Extended the project source/CMS-to-page architecture for approved year, typology, client, team, scope, long-form narrative, and explicitly related projects; absent facts are omitted rather than guessed.
- Added source-to-generated-page validation and a populated fixture test, ensuring approved project facts cannot silently disappear and empty optional sections never render.
- Produced a 52-record editorial approval queue: no current source record contains approved year, typology, client, team, scope, long-form narrative, or related-project data. The queue also identifies generic/short intros, missing locations, and language-tagged legacy excerpts.
- Validated the full website build and project page paths; the nested Sanity Studio cannot be locally built until its own dependencies are installed, which was intentionally not changed in this stage.

## Open issue register

Stage 1 issues and full evidence are documented in `03-reference-parity.md`. Stage 2 issues and retention decisions are documented in `04-code-hygiene.md`. Stage 3 issues and deployment dependencies are documented in `05-technical-seo.md`. No Stage 1, Stage 2, or repository-fixable Stage 3 P0 issues remain open.

## Next authorized stage

Stage 8: establish structured data and the entity graph.

Required model for Stage 8: **GPT-5.6 Sol — xhigh**.
