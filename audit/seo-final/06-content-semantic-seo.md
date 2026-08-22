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
