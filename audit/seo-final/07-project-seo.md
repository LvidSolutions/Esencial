# Stage 6 — Project-page SEO architecture

Status: Complete in the repository. Content enrichment requires Esencial’s factual and publication approvals.

## Outcome

Every individual project page already had its own URL, H1, canonical, language links, source-based introduction, images, and social metadata. This stage adds the missing durable content architecture: confirmed facts, narrative, and editorial relationships can now flow from the source/CMS to the appropriate language page, but none is fabricated for the recovered legacy portfolio.

## What was inspected

- Both source collections: 26 Swedish and 26 English project records.
- All 52 generated project pages and their title, H1, visible introduction, factual definition list, canonical/hreflang, structured data, social metadata, image gallery, and return links.
- The Sanity project schema, fetch projection, and editor guidance.
- The legacy content quality signal: generic introductions, short excerpts, facts absent from the recovered source, and deliberate `descriptionLanguage` exceptions from Stage 4.

## What changed

1. The generator now supports optional, approved `year`, `typology`, `client`, `team`, and `services` fields. When supplied, it renders them as a labeled `<dl>` in the correct language. Missing data is omitted.
2. An optional `body` supports approved long-form project paragraphs. It renders as a correctly headed “About the project” / “Om projektet” section only when source text exists.
3. Optional `relatedProjectIds` / CMS `relatedProjects` produce up to three manually selected, same-language project links. There is no automatic “related” algorithm, so the site never implies a relationship solely from a shared keyword.
4. The Sanity schema and fetch projection now carry these optional fields. CMS guidance explains the approval boundary and the project-content audit command.
5. `check-project-page-seo.js` checks all 52 generated pages against their source record. It fails the build if a confirmed title, introduction, fact, narrative, or related-project relationship disappears.
6. `test-project-page-architecture.js` uses a fully populated fixture to test the optional branch that the currently sparse legacy records cannot exercise.
7. `audit-project-content.js` generates a human editorial queue rather than failing the build for missing facts.

## Current content findings

The new audit found 52 recovered source records, with no approved year, typology, client, team, services, long-form body, or related-project fields in either language. It also records five Swedish and four English projects without a published location; six Swedish and nine English generic factual fallback introductions; and the Stage 4 language-tagged legacy excerpts.

These are content-approval tasks, not technical defects. Google’s guidance favors original, reliable, people-first information over mass-produced or search-first text, and explicitly rejects arbitrary word-count targets. The correct response is to obtain project knowledge from Esencial, not to generate plausible architecture copy. [Google’s people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## Why this matters

A portfolio detail page is its own potential answer for a project, place, typology, or practice query. The page needs facts that visitors can verify and understand—not a generic SEO template. The architecture now lets confirmed details become visible prose and structured page context consistently in Swedish and English. It also makes the cost of missing information visible to the editorial team without blocking an otherwise valid historical project from publishing.

The image gallery remains HTML `<img>` based and adjacent to project context, which is the right foundation for image discovery. Image-specific dimensions, derivatives, captions, and credit/license work are addressed in Stage 7. [Google image SEO best practices](https://developers.google.com/search/docs/appearance/google-images)

## Validation

- `npm run build` passed all 52 generated project pages, source/content, technical SEO, international SEO, semantic HTML, project-page SEO, and internal-link checks.
- `npm run check-project-page-seo` passed with current factual coverage: Swedish location 21/26; English location 22/26; all other new optional fields 0/26 in each language, deliberately omitted.
- `npm run test-project-page-architecture` passed its complete approved-facts fixture, including facts, two narrative paragraphs, a language-local related link, and omission of empty optional content.
- `npm run audit:project-content` generated `stage-6-project-content-evidence.json` and `stage-6-project-content-gaps.md` for the editorial queue.
- `npm run check-studio-workspace` passed. A direct Sanity Studio production build was not run because that nested workspace has no installed local `sanity` executable; no package was installed or deployment attempted.

## What requires client approval

- Exact year, typology, client, scope, team, and publishable location for each project.
- Original Swedish and English narrative text for projects where a short/generic introduction is inadequate.
- A real editorial reason for every related-project connection.
- Resolution of the Stage 4 language-tagged legacy excerpts through approved translation or replacement copy.

## Files of record

- `scripts/build-project-pages.js`
- `scripts/check-project-page-seo.js`
- `scripts/test-project-page-architecture.js`
- `scripts/audit-project-content.js`
- `cms/studio/schemaTypes/projectType.ts`
- `scripts/fetch-sanity-content.js`
- `docs/CMS_USER_GUIDE.md`
- `audit/seo-final/stage-6-project-content-gaps.md`

## Next stage

Stage 7 covers image SEO and responsive image implementation. Required model: **GPT-5.6 Sol — high**.
