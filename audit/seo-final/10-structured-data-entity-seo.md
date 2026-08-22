# Structured Data and Entity SEO

Status: PASS

## Baseline and timestamp

- Worker/stage: W2 / S8.
- Branch: `codex/worker-b-s8`.
- Baseline and integration SHA: `77935aacd3fab3bb454600bcfe4c775eaa04f982` (`codex/orchestrator-bootstrap`).
- Inspection timestamp: `2026-08-22T14:53:34.5091601+02:00` (Europe/Stockholm).
- Preflight: the required worktree was clean and on the expected branch/SHA; `node orchestration/status.mjs --json` returned `valid: true`, no errors, and S8 `effectiveState: READY` with S3, S4, and S6 complete.

## Scope inspected and pre-existing implementation

- Inspected all 56 sitemap/indexable pages: four Swedish/English shell pages and 52 bilingual project pages.
- Inspected visible titles, descriptions, H1s, canonical links, Open Graph images, project images, project breadcrumbs, the visible `Esencial AB` about-page fact, `content/projects/{sv,en}.json`, `scripts/build-project-pages.js`, the core static pages, and the existing SEO/international/image/semantic generators and validators.
- Before S8, the four shell pages contained separately hand-authored graphs while project generation emitted a standalone `CreativeWork`. The homepage additionally asserted `ProfessionalService`, `PostalAddress`, people, area served, and service/topic-like claims that were not safe for one minimal, consistently sourced graph.
- No address, rating, review, award, client, service, search action, local-business, offer, or other unsupported factual claim was accepted into the S8 graph.

## Files changed and why

- `scripts/lib/schema/entity-graph.js`: central deterministic builder for the shared `Organization` and `WebSite`, page-specific WebPage subtype and `ImageObject`, and project-only `CreativeWork` and visible `BreadcrumbList` relationships.
- `scripts/lib/schema/generate-structured-data.js`: derives the four core-page graphs from their canonical visible/head metadata and replaces exactly one JSON-LD block without hand-editing each page.
- `scripts/build-project-pages.js`: replaces the standalone project schema with the shared graph builder and derives project names, descriptions, language, images, canonical URLs, and two-item breadcrumbs from the same approved page source.
- `scripts/check-structured-data.js`: independently crawls all 56 sitemap pages; checks parsability, exact node shapes, stable entity IDs, canonical/language/title/description/image parity, local image existence, visible project images and breadcrumbs, graph references, 28/28 language coverage, and rejects unsupported claim types/properties.
- `package.json`: adds `build:structured-data` and `check-structured-data`; makes generation and validation mandatory in the normal build.
- Generated output: `public/index.html`, `public/om-oss/index.html`, `public/projects/index.html`, `public/about/index.html`, and all 52 `public/projekt/{slug}/index.html` / `public/projects/{slug}/index.html` project pages were regenerated deterministically. No sitemap URL content changed.

The shared organization is deliberately minimal: `Organization` / `https://www.esencial.se/#organization`, name `Esencial`, visible legal name `Esencial AB`, and canonical site URL. Every page references the same `WebSite` / `#website`. Core pages use `CollectionPage` or `AboutPage`; project pages use `WebPage` with a `CreativeWork` main entity. Primary images match each page's `og:image`; every project schema image is visibly rendered and exists locally. Breadcrumb schema appears only on project pages with the corresponding visible two-item breadcrumb.

## Commands, tests, and exact outcomes

- `node --check scripts/lib/schema/entity-graph.js`, `node --check scripts/lib/schema/generate-structured-data.js`, `node --check scripts/check-structured-data.js`, and `node --check scripts/build-project-pages.js`: PASS, exit 0.
- `corepack pnpm run check-structured-data`: PASS, exit 0 — 56 pages, 52 `CreativeWork` entities, 52 visible breadcrumb trails, 56 primary images, and one consistent `Organization`/`WebSite` entity pair.
- `corepack pnpm run build`: PASS, exit 0 — includes structured-data generation/validation plus 56-page technical SEO, international SEO, semantic HTML, 52-page project SEO, 104 project image uses, project architecture fixture, and internal links; zero reported errors.
- `corepack pnpm run check-seo`: PASS, exit 0 — 56 indexable pages, 56 sitemap URLs, 56 unique canonicals.
- `corepack pnpm run check-international-seo`: PASS, exit 0 — 56 pages, 28 Swedish, 28 English.
- Deterministic rebuild: PASS — SHA-256 manifest of all 56 HTML pages plus `sitemap.xml` remained `8151230c98414cb6e2fab5b34f47834bfe79ffee8847f1d7c5e5f6de12418c8c` before and after a full build (`files=57`, `deterministic=True`).
- Official Schema.org Markup Validator, direct read-only markup submissions: PASS, HTTP 200 and `validatorErrorItems=0` for `/`, `/about/`, `/projekt/domkyrkoforum/`, and `/projects/visioner-i-norr-rum-for-egenmakt-ett-mikrosystem-for-manga-mojliga-framtider/`.
- `git diff --check`: PASS, zero whitespace errors.

## Rendered-page inspection

Repository Playwright was used because the optional `agent-browser` executable was unavailable. Eight local views passed with HTTP 200, one parseable rendered JSON-LD block, matching canonical/page entity, expected language and page type, non-empty H1, zero broken rendered images, and expected project/breadcrumb presence:

- Desktop `1440x1000`: `/`, `/about/`, `/projekt/domkyrkoforum/`, and `/projects/visioner-i-norr-rum-for-egenmakt-ett-mikrosystem-for-manga-mojliga-framtider/` — 4/4 PASS.
- Mobile `390x844`: the same four routes — 4/4 PASS.
- Summary: `views=8 failures=0 pre-existing-favicon-404-warnings=1`. The isolated warning is Chromium's default request for missing `/favicon.ico` on the first generated project page; declared content images, JSON-LD, and all S8 checks passed.
- No screenshot/visual diff was required because JSON-LD changes only the document head and the rendered DOM/content geometry was not changed.

## Residual risks, manual needs, and prohibited actions not taken

- The official validator sample covers each representative graph shape; the deterministic local validator provides exhaustive 56-page coverage. Revalidate the integrated output and an authorized deployed URL before release because production headers/content can differ.
- Validator success does not promise search-engine rich-result eligibility. S8 makes no such claim and uses generic factual `CreativeWork` markup for projects.
- A canonical organization logo URL was not invented from the inline SVG. Address, founders/people, ratings/reviews, awards, clients, services, area served, search action, and local-business data remain omitted until explicit approved source data and an appropriate visible presentation exist.
- The pre-existing implicit `/favicon.ico` 404 on generated project pages is outside structured-data scope; W0 may route a later favicon fix to the appropriate technical/shared-file owner.
- No orchestration state file, external account, production content, Sanity dataset, deployment, DNS, redirect, secret, push, PR, or live site was changed.

## Final local commit and recommended merge order

- Containing commit subject: `SEO-S8 PASS: unify structured data across 56 pages` on `codex/worker-b-s8`.
- W0 should integrate this S8 commit onto the `77935aac...` checkpoint after reviewing the shared `package.json`, `scripts/build-project-pages.js`, and generated `public/**` changes, then rerun the build. S8 may be integrated independently of the other Wave B stages but must land before S13; resolve any later shared-generator conflict at source and regenerate rather than retaining hand-edited HTML.
