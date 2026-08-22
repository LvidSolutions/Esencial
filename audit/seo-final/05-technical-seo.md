# Stage 3 — Technical SEO: indexability, redirects, canonicals, robots, and sitemap

Status: **Complete in the repository; production cutover verification remains deployment-dependent.**

Audit date: 2026-08-22
Canonical origin: `https://www.esencial.se`
Stage model: **GPT-5.6 Sol — high**

## Outcome first

The candidate build now has one explicit URL contract and deterministic release checks for it:

- 56 HTML pages are discoverable, indexable, and represented exactly once in the XML sitemap.
- All 56 pages have one unique, absolute, HTTPS, `www` self-canonical.
- All document paths are lowercase and use a trailing slash, except `/`.
- All 56 canonical routes return local HTTP 200; all 55 non-root slashless forms return one 308 to the slash form.
- Missing and uppercase test routes return genuine 404 responses, not soft 404 pages.
- `robots.txt` and `sitemap.xml` return 200 locally with correct text/XML media types.
- The apex host is configured for a permanent redirect to `www` on Vercel.
- Vercel preview hosts and `/api/*` responses receive `X-Robots-Tag: noindex, nofollow`; production HTML remains indexable.
- The production build, all internal-link checks, four Playwright functionality routes, and the full 40-pair reference-parity suite pass.

The current Netlify-hosted production site is not this candidate build. At audit time its canonical origin works, its missing URLs return real 404s, and its ordinary slash normalization works, but `/robots.txt` and `/sitemap.xml` both return 404. The repository fixes those resources; they cannot be considered live until an authorized deployment and post-deploy crawl confirm them.

## What was inspected

### Repository and generated output

- `vercel.json`, build scripts, static-server behavior, and package commands.
- Every `public/**/index.html` file, not only pages already present in the sitemap.
- All canonical, robots, and hreflang link elements in the 56-page output.
- `public/robots.txt` and the generated `public/sitemap.xml`.
- Project URL generation for Swedish `/projekt/{slug}/` and English `/projects/{slug}/` routes.
- Case, slash, query-string, staging-host, duplicate-canonical, orphan-page, and missing-target behavior.
- Sitemap namespace, absolute URLs, host/protocol/path policy, duplicates, membership, and optional `lastmod` syntax.

### Live HTTP observations

The live site was queried with redirects disabled and followed. Results are observations of the existing Netlify deployment, not evidence that the repository candidate has been deployed.

| Request | First response | Final result | Observation |
| --- | ---: | --- | --- |
| `http://esencial.se/` | 301 to `https://esencial.se/` | 200 after 2 redirects | Existing two-hop chain should be rechecked at cutover |
| `http://www.esencial.se/` | 301 | 200 at canonical origin after 1 redirect | Correct target |
| `https://esencial.se/` | 301 | 200 at canonical origin after 1 redirect | Correct target |
| `https://www.esencial.se/` | 200 | 200, no redirect | Preferred origin works |
| `/om-oss` | 301 to `/om-oss/` | 200 | Existing slash normalization works |
| `/projects` | 301 to `/projects/` | 200 | Existing slash normalization works |
| `/PROJEKT/` | 404 | 404 | No case-duplicate page |
| `/definitely-not-real-stage3-test/` | 404 | 404 | Genuine missing-page status |
| `/?utm_source=stage3` | 200 | 200 | Query variant is consolidated by the root self-canonical |
| `/?s=arkitektur` and `/?p=123` | 200 | 200 | Legacy query shapes render home and inherit its canonical |
| `/wp-admin/` and `/wp-json/` | 404 | 404 | No exposed WordPress application routes |
| `/robots.txt` | 404 | 404 | Fixed in repository; deployment pending |
| `/sitemap.xml` | 404 | 404 | Fixed in repository; deployment pending |
| `/projekt/5-hus/` and `/projects/5-hus/` | 404 | 404 | New repository project routes are not live yet |

The old portfolio interaction uses URL fragments. A fragment such as `/#5_hus` is never sent to the server, so it cannot be the source of an HTTP redirect. No speculative redirects were added without a verified historical URL-to-project mapping. Redirecting unknown URLs to the home page was also rejected because irrelevant mass redirects can become soft 404s.

## Canonical and indexability policy

The enforced document form is:

```text
https://www.esencial.se/<lowercase-path>/
```

The root remains `https://www.esencial.se/`. Query strings and fragments are excluded from canonical and sitemap URLs. Every indexable document self-canonicalizes; no Swedish page canonicals to its English counterpart or vice versa. Hreflang content semantics remain Stage 4 scope, but Stage 3 verifies that every alternate target is absolute, canonical-hosted, present on disk, and included in the sitemap.

The validator now rejects:

- missing or multiple canonical elements;
- non-self canonicals, duplicate canonicals, non-HTTPS/apex/staging hosts, query strings, fragments, uppercase paths, and missing trailing slashes;
- `noindex`, `nofollow`, or `nosnippet` on public pages, including an HTML `X-Robots-Tag` equivalent;
- multiple conflicting robots meta elements;
- sitemap URLs without files, indexable HTML omitted from the sitemap, and sitemap URLs that are not indexable pages;
- missing hreflang targets or targets outside the sitemap;
- invalid sitemap structure, namespace, duplicates, URL policy, or inconsistent `lastmod` coverage;
- a deployment configuration that omits host consolidation, slash normalization, preview noindex, or API noindex.

## Robots and preview protection

The public `robots.txt` is intentionally simple: wildcard crawlers may access the public site, and the canonical sitemap URL is declared exactly once. It does not attempt to hide API, preview, CMS, or confidential paths.

Two response-header controls are now source-controlled for Vercel:

- `*.vercel.app` preview hosts: `X-Robots-Tag: noindex, nofollow` for every path.
- `/api/*`: `X-Robots-Tag: noindex, nofollow`.

This prevents accidental search indexing when the configuration is deployed. It is not access control. Confidential previews still require Vercel Deployment Protection or equivalent authentication, which must be enabled and verified by an authorized project owner.

## Sitemap decision

The sitemap is generated from the same project data and route functions as the HTML pages. It contains:

- 4 overview/about pages;
- 26 Swedish project pages;
- 26 English project pages;
- 56 canonical URLs in total;
- 0 duplicate, redirecting, missing, non-indexable, query, fragment, apex-host, or staging-host URLs.

`lastmod` is omitted. There is no trustworthy per-page significant-update timestamp in the current content source, and using build time would falsely tell crawlers that all 56 pages materially changed on every build. The validator will accept `lastmod` later only when every value is a valid date/time; CMS truth and publishing safeguards belong to Stage 12.

An image sitemap extension was not added. The normal sitemap and page-level images are sufficient for the current architecture, while image delivery, responsive sources, filenames, and image-specific discovery will be audited in Stage 7. Adding an extension before that inventory would create an unverified second source of image URLs.

## Issue register

### TECH-001 — Live crawler resources return 404

- Category: sitemap / robots / indexability
- Problem: the current production deployment has no reachable root `robots.txt` or `sitemap.xml`.
- Evidence: direct GET requests to both canonical URLs returned HTTP 404 on 2026-08-22.
- SEO impact: crawlers receive no declared sitemap and cannot discover the repository's 52 new project documents through the sitemap.
- User impact: none for ordinary browsing; operators lose a standard crawl-discovery and diagnostic surface.
- Performance impact: negligible.
- Complexity: low in the repository; medium operationally because deployment and domain cutover are not authorized in this stage.
- Risk: high until deployment, low after post-deploy verification.
- Fix: retain root static resources, validate their content and media types, and fail builds if they disappear or diverge from the indexable-page set.
- Files: `public/robots.txt`, `public/sitemap.xml`, `scripts/build-project-pages.js`, `scripts/check-seo.js`, `scripts/check-local-url-behavior.js`.
- Validation: local resources return 200 as `text/plain` and `application/xml`; sitemap has 56 valid canonical entries.
- Status: **Fixed in repository; open for production deployment verification.**

### TECH-002 — Canonical host and slash policy was implicit

- Category: redirects / URL normalization
- Problem: the output used slash-ending canonicals, but deployment configuration did not enforce a matching URL form or apex-host redirect.
- Evidence: the original `vercel.json` had neither `trailingSlash` nor redirect rules. Vercel's undefined slash setting may serve both forms without redirecting. The current live `http://esencial.se/` path also takes two redirects.
- SEO impact: duplicate crawlable URL variants and diluted canonical signals are possible after platform migration.
- User impact: inconsistent URLs in sharing, analytics, and browser history.
- Performance impact: avoidable redirect hops on non-canonical requests.
- Complexity: low.
- Risk: medium; platform routing must still be checked on the real domains after cutover.
- Fix: set `trailingSlash: true`, permanently redirect the apex host to `https://www.esencial.se`, and mirror slash behavior in the local verification server.
- Files: `vercel.json`, `scripts/recovery-utils.js`.
- Validation: all 55 non-root slashless routes return one local 308 to the canonical path; query strings are preserved; the current Vercel JSON schema accepts the selected host condition.
- Status: **Fixed in repository; production chain verification pending.**

### TECH-003 — Existing SEO validator trusted the sitemap too much

- Category: automated indexability validation
- Problem: the old checker read its route list from the sitemap, so an orphan indexable HTML page omitted from that sitemap could pass unnoticed. It did not prove canonical uniqueness, origin/path policy, crawler-resource integrity, or deployment routing.
- Evidence: code review of the original `scripts/check-seo.js` showed only required-path substring checks and per-route canonical equality.
- SEO impact: future releases could silently publish duplicate, orphaned, blocked, or staging-canonical pages.
- User impact: indirect through reduced discovery and incorrect search destinations.
- Performance impact: negligible build-time work; fewer wasteful crawler requests in production.
- Complexity: medium.
- Risk: low.
- Fix: independently discover every HTML document, compare the exact indexable and sitemap sets, validate canonical uniqueness/targets, validate robots/sitemap structure, and check Vercel routing policy.
- Files: `scripts/check-seo.js`, `package.json`, `README.md`.
- Validation: deterministic evidence reports 56 discovered, checked, indexable, sitemap, and unique-canonical records with zero warnings/errors.
- Status: **Resolved.**

### TECH-004 — HTTP status behavior was not a release gate

- Category: status codes / redirects / soft 404
- Problem: file existence checks did not prove served 200/308/404 behavior or crawler-resource content types.
- Evidence: no automated server-level status test existed.
- SEO impact: a routing regression could publish duplicate slash variants or a soft 404 while static file checks still pass.
- User impact: broken or misleading navigation on invalid URLs.
- Performance impact: the new check adds only a short local test run.
- Complexity: low.
- Risk: low.
- Fix: add an isolated HTTP checker that starts the repository server, requests all canonical and slashless routes, probes query preservation, uppercase/missing routes, and verifies robots/sitemap media types.
- Files: `scripts/check-local-url-behavior.js`, `scripts/recovery-utils.js`, `package.json`.
- Validation: 56 canonical 200 responses, 55 canonicalizing 308 responses, two correct 404 probes, query preservation, and correct resource types.
- Status: **Resolved.**

### TECH-005 — Preview and API indexing policy was absent

- Category: preview / non-HTML indexability
- Problem: Vercel preview hosts and public API responses had no source-controlled indexing directive.
- Evidence: the original deployment config contained no headers.
- SEO impact: discoverable preview URLs or JSON endpoints could enter search indexes and compete with canonical pages.
- User impact: search users could land on temporary or machine-oriented resources.
- Performance impact: negligible.
- Complexity: low.
- Risk: low for indexing after the fix; confidentiality remains an operational concern.
- Fix: host-conditional preview and path-conditional API `X-Robots-Tag: noindex, nofollow` headers.
- Files: `vercel.json`, `scripts/check-seo.js`.
- Validation: repository validator confirms both rules and rejects staging/local hosts in canonical or hreflang URLs.
- Status: **Resolved for indexing; authentication remains a deployment-owner action.**

## Validation record

| Check | Result |
| --- | --- |
| `npm run build` | Pass; 52 project pages generated, 56 SEO pages and all internal links pass |
| `npm run audit:technical-seo` | Pass; both deterministic evidence files written |
| Static/indexability audit | 56/56 indexable; 56/56 sitemap; 56/56 unique canonical; 0 warnings; 0 errors |
| Local HTTP audit | 56/56 canonical 200; 55/55 slashless 308; valid 404s and media types |
| `npm run check-functionality` | Pass on 4 core routes; navigation 200; no captured console errors |
| `npm run check-reference-parity` | Pass on 40 page/viewport pairs and 4 interaction scenarios; 0 failures |
| `git diff --check` | Pass; line-ending notices only, no whitespace errors |
| Deterministic `public/` fingerprint | `A133EEDAE75FC7ECCE74990D2FBC45CBA14C7E5DA3268BC952173A7E0CD8C83C` (unchanged from Stage 2) |

Evidence files:

- `audit/seo-final/stage-3-technical-evidence.json`
- `audit/seo-final/stage-3-http-evidence.json`
- `audit/seo-final/stage-1-parity-evidence.json`
- `audit/functionality-report.json`

## Files changed in Stage 3

- `vercel.json`
- `package.json`
- `README.md`
- `scripts/check-seo.js`
- `scripts/check-local-url-behavior.js`
- `scripts/recovery-utils.js`
- `audit/seo-final/stage-3-technical-evidence.json`
- `audit/seo-final/stage-3-http-evidence.json`
- `audit/seo-final/05-technical-seo.md`
- `audit/seo-final/00-master-status.md`

The generated parity/functionality evidence was refreshed during regression validation. The parallel orchestration runbook was not modified.

## Remaining production actions

These require deployment/project ownership and were intentionally not performed:

1. Deploy the candidate build to an authorized preview and verify its host-conditional `X-Robots-Tag` response.
2. Confirm Vercel Deployment Protection or equivalent authentication for confidential previews.
3. Attach and redirect both apex and `www` production domains; verify that all HTTP/HTTPS variants reach the canonical URL with the minimum possible redirect chain.
4. Re-crawl all 56 canonical routes, 55 slashless variants, missing/uppercase routes, `/robots.txt`, `/sitemap.xml`, and `/api/*` against the actual deployment.
5. Submit the live sitemap in Google Search Console after ownership and production authorization are available.
6. Use verified analytics, backlink, Search Console, or server-log evidence before adding any historical retired-URL redirects.

## Educational note

Canonicalization is strongest when signals agree. Here the redirect policy, self-canonical element, internal route, and sitemap URL all name the same resource. `robots.txt` controls crawler access, not confidentiality or canonical selection. `noindex` requires crawlers to retrieve a response, which is why it is appropriate for preview/API responses but not a substitute for authentication. A sitemap is also a discovery and canonical hint rather than a guarantee of indexing, so its highest value comes from being exact, generated, and continuously validated.

Primary references used for the implementation decisions:

- Google Search Central: canonical consolidation and self-referential canonicals — <https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls>
- Google Search Central: permanent redirects and canonical signals — <https://developers.google.com/search/docs/crawling-indexing/301-redirects>
- Google Search Central: sitemap construction and trustworthy `lastmod` — <https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap>
- Google Search Central: the limits of `robots.txt` — <https://developers.google.com/search/docs/crawling-indexing/robots/intro>
- Vercel: `vercel.json`, redirects, headers, host conditions, and `trailingSlash` — <https://vercel.com/docs/project-configuration/vercel-json>

## Next stage

Stage 4 covers metadata and international SEO/hreflang content correctness.

Next stage model: **GPT-5.6 Sol — high**.
