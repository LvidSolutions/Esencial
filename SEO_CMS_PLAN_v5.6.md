# Esencial SEO + CMS Plan v5.6

**Status:** Plan for implementation

**Goal:** Make Esencial easy for Google, AI search systems, and people to understand, while giving the team a safe and simple way to update projects, images, texts, and SEO data.

This plan replaces the earlier planning document for the next delivery phase. It is based on the recovered static site and the SEO work already completed. It deliberately avoids adding generic, visible SEO text to the front page.

## 1. Principles

1. The visual portfolio remains the priority. SEO content must belong to the page it describes and read like normal editorial material.
2. Metadata and structured data are machine-readable. They belong in the HTML `<head>` and are not visible on the page.
3. Google and AI systems cannot be "tricked" with keyword blocks or hidden text. Clear, original project facts, accessible HTML, images with context, and stable URLs are the durable approach.
4. Every published page must have one clear purpose, one primary language, a canonical URL, a helpful title and description, and crawlable content.
5. A CMS editor must be able to update content without touching templates, URL rules, schema code, or tracking code.

## 2. Confirmed Starting Point

The public frontend is a static recovery of a historical WordPress export. The four public routes are:

- `/` Swedish projects overview
- `/om-oss/` Swedish about page
- `/projects/` English projects overview
- `/about/` English about page

The current static pages have working titles, descriptions, canonical URLs, Swedish/English alternate links, one H1 per page, image alt text, JSON-LD in the `<head>`, `robots.txt`, and `sitemap.xml`. The project grids currently expose 54 crawlable project anchors. The stale WordPress discovery links have been removed.

The WordPress theme, plugin, and upload paths in the recovered site are evidence of the former WordPress + WP2Static workflow. The old backend is not assumed recoverable until hosting access and server logs have been checked.

## 3. What "Complete SEO for Google and AI" Means

There is no separate magic format that guarantees inclusion in Google AI Overviews, Google AI Mode, ChatGPT, Perplexity, or other answer engines. The work is to make the public source material trustworthy, crawlable, well-scoped, and easy to cite.

| Area | Required outcome | What it means for Esencial |
| --- | --- | --- |
| Crawlability | Important public URLs can be fetched and indexed | Keep `robots.txt`, sitemap, canonical URLs, internal links, and 200 responses correct. Do not use `noindex` or `nosnippet` on pages intended to be found. |
| Page meaning | Each URL answers a distinct question | Give every project its own permanent URL with a title, short factual introduction, project facts, images, and related links. |
| Entity clarity | Search systems can identify the studio | Maintain one accurate Organization/ProfessionalService schema record with real name, logo, website, contact details, and social profiles. |
| Evidence | Claims can be verified in the page | Include only approved, concrete project facts: location, year, client when publishable, scope, materials, status, credits, and source images. |
| Images | Images are discoverable and understood | Use standard `<img>` elements, descriptive filenames, concise alt text, dimensions, compression, and nearby captions or project text. |
| Language | Swedish and English versions are correctly linked | Use equivalent Swedish/English project URLs and `hreflang`; never send different languages to one canonical URL. |
| Measurement | Decisions are based on observed search data | Configure Search Console, GA4, consent handling if required, and a monthly SEO review. |

Important: structured data is not visible content. It remains in a `<script type="application/ld+json">` element inside `<head>`. It must describe the same real content that is visible on the corresponding page.

## 4. Target Information Architecture

The current project anchors are a useful visual gallery, but they do not provide enough independent information for a search result or an AI answer to cite. The target should retain the overview pages while adding individual project pages.

```text
/
  Swedish project overview
/projekt/{slug}/
  Swedish project detail page
/om-oss/
  Swedish studio page
/tjanster/{slug}/
  Swedish service page
/projects/
  English project overview
/projects/{slug}/
  English project detail page
/about/
  English studio page
/services/{slug}/
  English service page
/insikter/{slug}/ (only when there is a real article to publish)
```

Keep existing URLs live. When a project moves from a `#anchor` to its own page, retain the old overview anchor and link it to the new detail page. Create server-side 301 redirects for any retired URLs only after the new URL is live.

## 5.6 Complete SEO Implementation Plan

### 5.6.1 Technical foundation

| Task | Priority | Deliverable | Acceptance check |
| --- | --- | --- | --- |
| Maintain one preferred HTTPS host | Critical | Redirect map and hosting configuration | All non-preferred host/protocol variants redirect once to `https://www.esencial.se/`. |
| Maintain crawl directives | Critical | Version-controlled `robots.txt` and sitemap generation | No public page has `noindex`, `nofollow`, or `nosnippet` by mistake; sitemap contains only canonical, indexable URLs. |
| Automate canonical and language links | Critical | Template-generated canonical and `hreflang` tags | Every Swedish/English equivalent pair self-canonicalizes and references its alternate. |
| Remove crawl noise | High | No broken internal links, retired WordPress discovery references, or duplicate exports | Scheduled crawl reports zero broken internal URLs and no accidental staging URLs. |
| Add redirects when URLs change | High | Redirect registry owned by the CMS/deployment | Old URLs return a single 301 to the relevant replacement, never a generic home-page redirect. |
| Deploy cache and compression rules | High | Brotli/gzip, immutable asset caching, modern image delivery | Lighthouse and real-user measurements improve without visual regressions. |
| Add a release gate | High | Automated page crawl and metadata checks in deployment | A release fails when title, canonical, H1, schema, image alt, sitemap, or internal-link checks fail. |

### 5.6.2 Project and service content

Create individual project detail pages before adding broad marketing articles. Each project needs unique, approved information; no invented project history, location, client, or awards.

Required visible content for every published project page:

- Project name and project type
- A 50-120 word project introduction in the current language
- Location and year when approved for publication
- Status, scope, and client only when confirmed and publishable
- A concise description of the architectural idea, constraints, and result
- Image gallery with individual alt text; drawings get an alt text that describes what is shown
- Credits and collaborators when relevant
- Links to related projects and relevant services

Build service pages only for services Esencial actively provides. Each page should explain the actual service, who it is for, what the work includes, selected linked projects, and a contact route. Do not create pages for search phrases that do not reflect a real offering.

### 5.6.3 Structured data and entity information

Use JSON-LD generated from the CMS. It remains invisible and must never contain information absent from, or unsupported by, the page.

| Page type | Schema | Minimum data |
| --- | --- | --- |
| Swedish studio page | `Organization` or the most specific applicable professional/local business type | Name, URL, logo, email/phone/address only if public, `sameAs`, description, language. |
| English studio page | Same organization entity | Same factual data and alternate-language relation. |
| Project page | `CreativeWork` or another appropriate schema.org subtype after content review | Name, URL, description, image, date created where known, creator, location where approved. |
| Article/news page | `Article` | Headline, date published/modified, author, image, canonical URL. |
| Breadcrumb navigation | `BreadcrumbList` | Only if visible breadcrumbs are introduced on the page. |
| Site search | No schema until a real internal search function exists | Never add `SearchAction` for a search experience that does not work. |

Before release, validate the markup in Google's Rich Results Test and Schema Markup Validator. Passing validation does not guarantee a rich result; it confirms that the data can be interpreted.

### 5.6.4 Google and AI crawl policy

The default recommendation is to allow reputable search crawlers to access public portfolio and service content. Google uses its normal crawling and indexing rules for web results, Images, Discover, AI Overviews, and AI Mode. Blocking Googlebot or applying `nosnippet` reduces the opportunity to appear in those experiences.

The business must make an explicit policy decision for third-party AI crawlers. The CMS/deployment should keep this choice in one documented `robots.txt` template rather than relying on ad hoc server rules.

| Crawler group | Proposed default | Decision owner | Notes |
| --- | --- | --- | --- |
| Googlebot and Googlebot-Image | Allow public pages and public images | Esencial | Needed for Google Search and Google Images. |
| Bingbot | Allow public pages and public images | Esencial | Useful for Bing and services that use its index. |
| OpenAI search crawler | Allow public pages if Esencial wants ChatGPT discovery | Esencial | Use the current official user-agent name in `robots.txt`; confirm it during implementation. |
| Training crawlers | Separate policy decision | Esencial management | Allowing search discovery and allowing model training are different decisions. |
| Staging, previews, CMS admin, private files | Disallow and protect with authentication | Development | Do not rely on `robots.txt` alone for private material. |

Do not add `noai`, `noimageai`, or other non-standard directives as a substitute for a clear policy. They are not a universal control. Do not put confidential drawings, unpublished addresses, client data, or unlicensed imagery on a public URL.

### 5.6.5 Image, accessibility, and performance work

1. Create a source-image checklist: ownership approved, subject confirmed, filename, alt text, credit, project relation, and language-neutral file naming.
2. Produce responsive AVIF/WebP derivatives while retaining source originals in the CMS asset library.
3. Use width, height, lazy loading below the fold, and preload only the actual first visual content image where beneficial.
4. Keep images as HTML image elements, not CSS backgrounds, when they carry portfolio meaning.
5. Review every image alt text. Decorative images get empty alt text; informative images get concise, specific descriptions. Alt text does not need to repeat the project title unless that fact improves clarity.
6. Check keyboard navigation, visible focus, color contrast, heading order, link names, language attributes, and motion behavior during every template release.
7. Establish performance budgets: no unnecessary JavaScript, no uncompressed multi-megabyte images in the initial viewport, and no layout shift from images or fonts.

### 5.6.6 Local discovery and trust

- Claim and maintain the Google Business Profile only if there is a real public business location or eligible service-area setup.
- Keep company name, public contact details, website, and social profiles consistent across the site, the business profile, and major architecture directories.
- Add a real contact page or clear contact section only after the public contact details are confirmed.
- Use project locations only where publication is approved. A city/region is often enough; do not expose sensitive addresses.
- Collect credible mentions, awards, press links, and professional directory profiles. Do not buy links or publish fabricated testimonials.

### 5.6.7 Measurement and operating rhythm

| Cadence | Work | Owner |
| --- | --- | --- |
| Every release | Crawl, metadata, schema, accessibility, mobile, and visual checks | Development |
| Monthly | Search Console coverage, queries, pages, image performance, Core Web Vitals, broken links | SEO/content owner |
| Quarterly | Refresh project facts, services, media permissions, redirects, and crawler policy | Esencial + development |
| When publishing | Confirm project permission, language, SEO fields, image rights, links, and preview | Content editor |

Set up Google Search Console verification and submit the live sitemap. Configure GA4 only after the measurement and consent requirements are approved. Search Console is the main source for indexing and search performance; analytics is the source for on-site behaviour.

## 6. CMS Recommendation

### Recommended path

**Short term:** retain the current static frontend while creating structured content files and template helpers for project pages. This delivers new indexable project URLs without a visual redesign and keeps deployment low-risk.

**Long term:** rebuild the static frontend into a small, content-driven site using **Astro + Sanity**. Astro produces fast static HTML that is easy to crawl. Sanity gives non-technical editors a polished asset library, drafts, scheduled collaboration, structured fields, and image metadata. The existing design is reproduced deliberately rather than redesigned.

### Why this path

| Option | Short-term speed | Editor experience | SEO control | Risk | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Repair old WordPress + WP2Static | Unknown until server access is obtained | Familiar but historically fragile | Adequate | High: legacy plugins, PHP, export dependencies | Recover only to extract content or if the host confirms a small repair. |
| Keep static HTML forever | Fast for tiny changes | Poor: requires developer edits | Good but manual | Medium: content drift and release mistakes | Temporary only. |
| Git-based CMS | Fast and inexpensive | Acceptable for trained editors | Good | Medium: login and publishing workflow depend on hosting | Fallback when budget is very limited. |
| Astro + Sanity | Medium initial build | Strong for non-technical editors | Strong and automated | Low after migration | Recommended durable solution. |
| Full visual redesign + CMS | Slow | Can be good | Strong | High scope risk | Not part of this plan. |

Use the WordPress installation as a possible source of media/content, not as the foundation of the future publishing workflow unless a recovery audit proves it is secure, maintained, and simple to operate.

## 7. CMS Content Model

### Project

| Field | Required | Editor help / validation |
| --- | --- | --- |
| Swedish and English title | Yes | Use the published project name; no all-caps requirement. |
| Swedish and English slug | Yes | Lowercase URL; immutable after publication without a redirect. |
| Short introduction | Yes | 50-120 words, factual and clear. |
| Full project story | Yes | Explain idea, context, scope, and result. |
| Project facts | When approved | Type, location, year, status, client, scale, materials, credits. |
| Images | Yes | At least one approved image; each image has description, credit, and crop focus. |
| Related services/projects | Optional | Select existing published items only. |
| SEO title and description | Yes | Character guidance in the CMS; preview before publishing. |
| Social image | Optional | Use an approved horizontal image; fall back to project hero. |
| Publication state | Yes | Draft, in review, scheduled, published, archived. |

### Service

Fields: Swedish and English name, slug, short introduction, full description, deliverables/process, related projects, hero image, SEO title, SEO description, publication state.

### Studio / about page

Fields: Swedish and English introduction, studio story, team, contact details, office/public address policy, public social links, logo, default social image, organization SEO data.

### Article or news item

Fields: Swedish and English title/slug, excerpt, body, author, publication date, hero image, image descriptions, related project/service, SEO fields, draft/published state. Do not add this type to the navigation until there is a sustainable editorial commitment.

### Global settings

Fields: site name, logos, navigation, footer, social profiles, default SEO title pattern, default description, canonical host, crawler policy switch with developer-only approval, analytics identifiers, and redirects.

## 8. Implementation Sequence

### Phase A - Foundation and measurement (1-2 days)

- Confirm production hosting, DNS owner, deployment route, and Search Console ownership.
- Verify the live version contains the committed SEO improvements.
- Record a baseline: indexed pages, search clicks/impressions, top queries, mobile usability, Core Web Vitals, page weight, and current redirects.
- Decide the public contact/location and third-party AI crawler policies.

### Phase B - Content inventory and templates (2-4 days)

- Inventory every project, image, drawing, credit, language version, location permission, and source document.
- Agree on one project-page template and one service-page template with the design owner.
- Write and approve the first three Swedish/English project pages as the content and design pilot.
- Add automated metadata, schema, sitemap, alt-text, and link checks.

### Phase C - Project rollout (time depends on content approval)

- Publish project detail pages in batches, preserving the existing overview grid.
- Add relevant internal links between projects, services, and studio pages.
- Generate language alternates, canonical URLs, JSON-LD, image sitemap entries, and redirect entries from the content data.
- Request indexing for the initial priority pages in Search Console after release.

### Phase D - CMS build and migration (2-4 weeks)

- Build the Astro templates against the approved static design.
- Configure Sanity roles: Administrator, Editor, Reviewer.
- Build content schemas, required fields, image preparation, SEO previews, drafts, and publishing workflow.
- Migrate approved content, test a staging preview, then release after redirect and visual checks.
- Keep a rollback build of the current static site for the first 30 days.

### Phase E - Ongoing optimisation

- Use Search Console data to improve titles, project introductions, internal links, and image context.
- Publish new projects and occasional high-quality studio/news content when there is genuine material.
- Review crawler policy, schema accuracy, and performance quarterly.

## 9. CMS Technical Delivery

### Site structure

```text
src/
  layouts/
  pages/
    projekt/[slug].astro
    projects/[slug].astro
    tjanster/[slug].astro
    services/[slug].astro
  components/
    SeoHead.astro
    ProjectGrid.astro
    ProjectFacts.astro
    ImageGallery.astro
  lib/
    seo.ts
    schema.ts
    sitemap.ts
sanity/
  schemaTypes/
    project.ts
    service.ts
    page.ts
    article.ts
    settings.ts
```

### Publishing safeguards

- Required title, slug, language, summary, primary image description, and SEO fields before publication.
- A changed slug creates a redirect request, never a silent broken URL.
- Schema and meta tags are generated by the template; editors enter facts, not code.
- Preview links are protected and not indexable.
- Production builds generate `sitemap.xml`, `robots.txt`, canonical links, language alternates, and page-specific JSON-LD.
- A publication checklist confirms client permission, image license, credits, language review, preview, and contact links.

### Access required before starting the CMS build

- Domain/DNS and hosting access for deployment and redirects
- Google Search Console ownership verification
- Current public contact details, social links, legal company name, and logo rights
- Approved project facts, image licenses, and publication permissions
- Decision on CMS budget and editor accounts
- Any WordPress hosting/backup access, only to recover original text/media or assess the old system

## 10. Beginner User Guide Plan

### Delivery format

Create a short illustrated guide in two forms:

1. A version-controlled Markdown manual in the repository, which is the maintained source of truth.
2. A polished PDF with screenshots for day-to-day editors.

The CMS itself should also contain short field help beside difficult inputs. A standalone `/manual` page on the public website is not recommended because publishing instructions, internal URLs, and operational details should not be public.

### Manual chapters

1. Signing in and keeping the account secure
2. Understanding draft, review, scheduled, and published status
3. Editing a page safely
4. Adding a new project step by step
5. Updating an existing project without changing its URL accidentally
6. Preparing photographs and drawings: permissions, filenames, file size, crop, credits
7. Writing image descriptions and alt text
8. Writing project summaries and longer project text
9. Writing a page title and search description
10. Adding Swedish and English versions
11. Previewing work before publication
12. Publishing, checking the live page, and requesting help
13. Updating contact details and social links
14. Adding a service or article
15. Common mistakes, what not to change, and when to contact development

### Editor quick checklist

- Is this information approved for public use?
- Does the Swedish/English version say the same factual thing?
- Does every meaningful image have an accurate description and credit?
- Does the page have an introduction, factual details, and related links?
- Is the page title specific and is the description written for a person deciding whether to click?
- Has the preview been checked on desktop and mobile?
- Has a reviewer approved publication?

## 11. Definition of Done

The SEO implementation is complete for the migrated scope when:

- Every public project/service/studio page has a permanent URL, visible original content, title, description, H1, canonical URL, correct language alternate, image descriptions, and valid page-specific schema.
- Public pages return 200, private/staging pages require authentication, and retired URLs redirect correctly.
- The sitemap is generated from published content and submitted to Search Console.
- Search Console has no unresolved crawl/indexing issue caused by the site implementation.
- The site passes the agreed release checks for internal links, structured data, accessibility basics, mobile layout, and performance budget.
- A non-technical editor can create a draft project, upload images, complete SEO fields, preview it, request review, and publish it by following the user guide.
- The old WordPress system is either formally recovered and secured, or formally retired after content extraction and a backup handover.

## 12. Immediate Next Actions

1. Confirm the desired CMS budget, who will edit content, and whether AI-search discovery should be allowed for third-party AI crawlers.
2. Obtain hosting/DNS and Google Search Console access, then establish the production baseline.
3. Collect approved facts and image rights for the first three priority projects.
4. Design and approve one project detail template before building the archive.
5. Implement the project-page pilot with no visible generic SEO block on the front page.
6. Choose between the short-term static content layer and the Astro + Sanity migration after the pilot proves the fields and workflow.

## References

- [Google: robots meta tags and AI search appearances](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google: Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Google: sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: image SEO guidance](https://developers.google.com/search/docs/appearance/google-images)
- [OpenAI: allowing web crawlers](https://help.openai.com/en/articles/20001243-advertiser-guidance-for-allowing-openai-web-crawlers)
