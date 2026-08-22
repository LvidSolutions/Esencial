# Stage 4 — Metadata and international SEO

Status: **Complete in the repository.**

Stage model: **GPT-5.6 Sol — high**
Canonical origin: `https://www.esencial.se`

## Outcome

All 56 indexable pages now have an exact, validated language and metadata contract:

- 28 Swedish and 28 English documents declare the correct root `lang`.
- Every document has exactly one non-empty title and meta description.
- Title, description, canonical URL, Open Graph URL/title/description, and Twitter title/description agree.
- Every social image URL is absolute and on the canonical host.
- Every page has exactly `hreflang="sv"`, `hreflang="en"`, and `hreflang="x-default"`.
- Each language cluster is self-referential, reciprocal, maps its Swedish and English route pair exactly, and uses the Swedish page as the documented `x-default` fallback.
- Source records are paired by `id` and retain a shared slug.
- Nine legacy excerpts whose visible language differs from their surrounding page are now explicitly marked with `lang`; their page-language metadata uses only conservative facts already present in the source record.

## What changed

### A deterministic international release gate

Added `scripts/check-international-seo.js` and the `npm run check-international-seo` command. The production build now fails on:

- incorrect or missing root `lang`;
- missing, duplicate, non-reciprocal, or wrong-target hreflang entries;
- a self-hreflang that is not the canonical;
- missing Swedish/English source record pairs or changed paired slugs;
- duplicate title or description within a language;
- missing/contradictory title, description, canonical, Open Graph, or Twitter metadata;
- relative/non-canonical social images;
- a visible excerpt that is known to be in another language but lacks a local `lang` declaration.

The final evidence records 56 pages, 28 Swedish pages, 28 English pages, nine correctly tagged cross-language excerpts, and zero errors or warnings.

### Corrected `x-default` behaviour

The generated English project pages previously pointed `x-default` to themselves while their Swedish partners pointed it to Swedish. That produced inconsistent hreflang clusters. The generator now emits the same Swedish fallback from both pages in each pair. This is an intentional policy choice: Esencial has a Swedish primary market and no language-selector URL. It does not redirect people automatically; it tells crawlers which page to use when neither available language matches.

### Content-language honesty without invented copy

Several recovered entries are legally/factually usable excerpts but appear in Swedish or Spanish inside an English page, or in English/Spanish inside a Swedish page. Replacing them with automatic translations would create unapproved editorial claims. Instead, `descriptionLanguage` captures the actual language (`sv`, `en`, or `es`) when it differs from the page language.

The renderer then:

1. preserves the approved visible excerpt unchanged;
2. adds `lang` to that excerpt so assistive technology and language-aware parsers interpret it correctly;
3. uses a minimal factual page-language description for search/social metadata, built only from the project title, Esencial attribution, and the existing approved location.

This is a temporary technical safeguard, not a replacement for client-approved translation. The records needing approved editorial work remain:

- English pages with Swedish excerpts: Hamnbadet, Visioner i Norr, Kustträdgården, Norra Kanalområdets utomhusscen, and Ny verkstadsbyggnad Museene i Akterhus.
- Swedish pages with English excerpts: Sara Hildén Museum and Kemeri National Park Observation Tower.
- Swedish and English Plaza del Almacén pages with a Spanish excerpt.

## Metadata policy

Titles and descriptions are descriptive, page-specific, and generated from the approved project record where appropriate. Character counts are not used as release failures: search interfaces truncate by device/query and there is no universal safe count. The gate instead prevents empty, duplicate, contradictory, or non-page-specific metadata.

The core pages retain their editorial titles and descriptions. Their existing relative Open Graph/Twitter image paths were converted to absolute `https://www.esencial.se/...` URLs so external sharing clients receive an unambiguous image resource.

## Validation

| Check | Result |
| --- | --- |
| `npm run check-content` | Pass; 52 language-paired project records |
| `npm run build` | Pass; 52 project pages generated |
| `npm run check-international-seo` | Pass; 56 pages, 28 Swedish, 28 English |
| Technical SEO gate | Pass; 56 indexable/sitemap/canonical URLs |
| Internal-link validation | Pass; 56 sitemap URLs |
| Static syntax and whitespace checks | Pass |

Evidence: `audit/seo-final/stage-4-international-evidence.json`.

## Why this matters

`hreflang` is a relationship declaration, not a translation tool. Google needs each alternate URL to be reachable, canonical in its own language, and to point back to the same language set. A single inconsistent `x-default` or one-way alternate weakens that signal. Similarly, a root `lang` declares the primary language of a page, while a local `lang` declaration is the accurate tool for a real quotation or legacy excerpt in another language.

High-quality titles and descriptions improve the clarity of search results but do not guarantee the displayed title/snippet; search engines can choose visible page text instead. The implementation therefore aligns head metadata with visible, approved content and avoids keyword lists.

Primary references:

- Google Search Central, [localized versions and `x-default`](https://developers.google.com/search/docs/advanced/crawling/localized-versions)
- Google Search Central, [canonical and hreflang compatibility](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- Google Search Central, [title-link guidance](https://developers.google.com/search/docs/advanced/appearance/good-titles-snippets)
- Google Search Central, [meta-description guidance](https://developers.google.com/search/docs/appearance/snippet)

## Files changed

- `scripts/build-project-pages.js`
- `scripts/check-international-seo.js`
- `scripts/check-cms-content.js`
- `package.json`
- `content/projects/sv.json`
- `content/projects/en.json`
- `docs/CMS_USER_GUIDE.md`
- `public/index.html`
- `public/om-oss/index.html`
- `public/projects/index.html`
- `public/about/index.html`
- generated project pages under `public/projekt/` and `public/projects/`

## Remaining external/content work

- Obtain approval for the nine full-language replacements listed above before treating those excerpts as finished editorial translations.
- Verify rendered metadata, response headers, and hreflang in the authorized deployment; the current live Netlify site is still the old reference and does not expose the candidate project pages.
- Add a language-selector `x-default` only if Esencial later publishes a real selector. Do not create a selector merely for markup.

## Next stage

Stage 5 covers semantic HTML and page structure.

Next stage model: **GPT-5.6 Terra — high**.
