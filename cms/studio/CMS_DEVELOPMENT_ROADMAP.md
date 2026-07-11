# Esencial CMS Development Roadmap

**Status:** Planning only. No work in this roadmap starts until the project owner selects the decision points at the end.

## 1. Destination

The final system should let an Esencial editor create or update a Swedish and English project, upload approved images, preview the result on desktop and mobile, request review, publish it, and have the website rebuild with correct SEO automatically.

```text
Editor in Sanity
      ↓
Draft / review / publish workflow
      ↓
Protected preview site
      ↓
GitHub build triggered by approved content
      ↓
Static production site
      ↓
Sitemap, SEO metadata, language links and structured data regenerated
```

The public site remains fast static HTML. Sanity is the editorial source of truth. GitHub remains the source of code, tests, and deployment configuration.

## 2. Current State

Already complete:

- Hosted Sanity Studio at `https://esencial-cms.sanity.studio/`
- Private `production` dataset
- 52 imported Swedish/English project records and global settings
- Project, service, and site-settings schemas
- Editorial statuses, validation, Swedish/English navigation, and dashboard queues
- Static site project archive, sitemap generation, SEO checks, and internal-link checks
- GitHub quality gate for the static website

Not yet connected:

- The public website still reads Git-managed JSON and generated HTML, not published Sanity data
- Sanity images are not yet uploaded to the Sanity asset library
- No protected frontend preview, visual editing, or automatic rebuild after CMS publication
- No production hosting/DNS cutover for the replacement website

## 3. Product Decisions Before Development

### Decision A: Frontend integration model

**Recommended: static build from Sanity.** The site fetches published Sanity data during a GitHub/hosting build and outputs static HTML. This preserves speed, crawlability, low running cost, and the current visual approach.

Alternative: server-rendered frontend. This gives more direct live updates but adds hosting complexity and is not necessary for a portfolio site.

### Decision B: Preview model

**Recommended: protected staging preview plus Sanity Presentation Tool.** Editors see drafts in a separate preview environment. Production remains static and only receives reviewed/published content.

Alternative: preview link only. Faster to implement, but less visual and without click-to-edit overlays.

### Decision C: Publishing authority

**Recommended roles:**

- Editor: creates and edits drafts
- Reviewer: approves language, project facts, image rights, and SEO content
- Publisher: triggers public release
- Administrator: manages Studio, access, schema, integrations, and deployment

For a small team, one person may hold Editor + Reviewer while a designated owner holds Publisher + Administrator.

### Decision D: Hosting

**Recommended options:**

- Cloudflare Pages: strong static hosting, caching, and domain controls
- Netlify: simple preview deployments and build hooks
- Vercel: excellent preview/developer experience, particularly if the future frontend becomes Next.js

The hosting choice determines the build hook, preview URL, environment variables, redirects, and eventual domain cutover. It does not change the editorial CMS.

## 4. Phase 1 - Make Sanity the Content Source of Truth

### Goal

End duplicate editing. A project should have one authoritative record in Sanity, not one in Sanity and another JSON file.

### Work

1. Add a build-time Sanity client to the website code.
2. Define GROQ queries for projects, services, global settings, and language pairs.
3. Replace the current JSON project input with published Sanity documents.
4. Generate Swedish and English project pages from Sanity content.
5. Generate titles, descriptions, canonicals, `hreflang`, JSON-LD, sitemap entries, and internal links from the same document.
6. Keep the existing static JSON files as a rollback snapshot until launch is stable.
7. Add a build check that fails when a published project lacks required website data.

### Acceptance criteria

- Editing a published project in Sanity changes the next generated static build.
- No public project data needs manual HTML editing.
- Existing URLs remain stable.
- The build passes SEO and link validation for every generated page.

## 5. Phase 2 - Media Library and Image Migration

### Goal

Move approved portfolio images into a managed media workflow without losing credits, alt text, or image rights context.

### Work

1. Create an image-rights checklist: owner, photographer, licence, publication approval, project, language-neutral filename, alt text, and credit.
2. Upload approved images to Sanity in batches.
3. Map legacy image references to Sanity asset references.
4. Add focal-point/crop choices for grid, detail, and social preview usage.
5. Generate responsive image URLs from Sanity image parameters.
6. Preserve source originals separately; use web derivatives in the public build.
7. Remove legacy image-reference fields only after each project has verified media migration.

### Acceptance criteria

- Every published project has at least one Sanity-managed hero image.
- Every meaningful image has a description and optional credit.
- No unapproved or duplicate media is exposed publicly.
- Website image markup remains crawlable, responsive, and dimensioned.

## 6. Phase 3 - Editorial Workflow and Quality Gates

### Goal

Make the CMS guide editors toward safe, complete publication.

### Work

1. Add `lastReviewedAt`, `reviewOwner`, `imageRightsConfirmed`, and `translationStatus` fields.
2. Add a dashboard queue for missing SEO, missing media, missing translation, and stale content.
3. Add review notes or Sanity Comments for feedback inside a draft.
4. Add a mandatory pre-publish checklist.
5. Add an editorial activity log with editor, reviewer, publish date, and build result.
6. Set Studio roles and invite the actual editorial team.
7. Create a short internal publishing policy: what can be published, what needs client approval, and when to ask development for help.

### Acceptance criteria

- An editor can tell why a project cannot be published.
- A reviewer can see what changed and who approved it.
- Stale content and missing translations are visible without searching through every project.

## 7. Phase 4 - Visual Preview and Presentation Tool

### Goal

Let editors see where content lands on the website before it reaches production.

### Work

1. Create a protected preview deployment of the frontend.
2. Add draft-mode routes and authenticated preview tokens.
3. Connect the frontend to Sanity draft queries.
4. Configure the Sanity Presentation Tool with document-to-URL mapping.
5. Add desktop, tablet, and mobile preview sizes.
6. Add click-to-edit overlays for project heading, introduction, location, gallery, and SEO/social image.
7. Test Swedish and English versions independently.

### Acceptance criteria

- A draft opens in a protected site preview.
- Changes appear in the preview without production publishing.
- Clicking a project element takes the editor to the correct Sanity field.
- Public visitors cannot access draft content.

## 8. Phase 5 - Publishing Automation and Deployment

### Goal

Make publication reliable, traceable, and reversible.

### Work

1. Configure a Sanity webhook for approved/published changes.
2. Trigger a GitHub Action or hosting build hook.
3. Store read-only Sanity API credentials as GitHub/hosting secrets, never in the repository or Studio content.
4. Build the site from published content only.
5. Run SEO, schema, internal-link, and visual checks before deployment.
6. Publish an immutable deployment and retain a rollback target.
7. Surface the latest build state in the CMS dashboard.

### Acceptance criteria

- A publishing action results in one traceable build.
- Failed builds do not replace the current public website.
- The responsible person can see the build outcome and rollback route.

## 9. Phase 6 - SEO Operations Inside CMS

### Goal

Turn SEO from a one-off technical task into a maintained editorial process.

### Work

1. Add CMS indicators for title length, description length, missing image descriptions, missing language version, and missing project facts.
2. Add structured project facts: year, status, type, client when approved, scale when approved, materials, credits, and services.
3. Generate `CreativeWork`, Organization, Breadcrumb, and future Article schema only where visible content supports it.
4. Generate sitemap and image sitemap from published content.
5. Add Search Console review cadence and a quarterly content-refresh dashboard queue.
6. Create a lightweight service-page workflow only after the service offer is approved.

### Acceptance criteria

- Editors enter facts; templates generate technical SEO.
- No generic visible SEO block is added to the front page.
- Search Console and website builds identify issues before they become lasting crawl problems.

## 10. Phase 7 - Launch and Domain Cutover

### Goal

Move the domain only after the replacement site, CMS, preview, and rollback plan are proven.

### Work

1. Select hosting and connect a staging domain.
2. Test all public URLs, redirects, mobile layouts, accessibility basics, images, and caching.
3. Verify Google Search Console ownership and prepare the sitemap submission.
4. Freeze content briefly, publish the final verified build, and change the domain binding/DNS.
5. Check HTTPS, preferred host, robots, sitemap, redirects, analytics, and four priority pages immediately after launch.
6. Keep the old hosting available for at least 30 days.
7. Review Search Console coverage and crawl errors weekly during the first month.

## 11. Documentation and Training

### Deliverables

- Editor handbook with screenshots
- Five-minute “add a project” checklist
- Image preparation and rights checklist
- Swedish/English translation checklist
- SEO writing guide
- Publisher and rollback guide
- Developer runbook for schema, build, secrets, webhook, and deployment changes

### Training format

1. One 45-minute recorded walkthrough for editors
2. One live practice publication in staging
3. A short follow-up after the first real project update

## 12. Proposed Timeline

| Phase | Estimate | Depends on |
| --- | --- | --- |
| Phase 1: Sanity build integration | 3-5 working days | Hosting decision and read-only build credential |
| Phase 2: media migration | 2-6 working days | Image rights and content approval |
| Phase 3: workflow and quality gates | 2-3 working days | Editorial roles and review policy |
| Phase 4: visual preview | 4-7 working days | Frontend integration and preview hosting |
| Phase 5: publish automation | 2-4 working days | Hosting and GitHub/secret access |
| Phase 6: SEO operations | 2-4 working days | Approved project facts and service offering |
| Phase 7: launch | 1-2 working days plus monitoring | DNS, hosting, Search Console |

Some phases can overlap, but the order of dependencies should remain: content source, media, workflow, preview, automation, launch.

## 13. Risks and Controls

| Risk | Control |
| --- | --- |
| Editors accidentally expose unfinished work | Private drafts, protected preview, separate publish role |
| Old and new content differ | One source of truth after Phase 1, rollback snapshot retained |
| Broken URLs hurt search | Immutable slugs by default, redirect registry, automated checks |
| Image rights are unclear | Rights confirmation before Sanity asset migration and publication |
| Live preview exposes private data | Authenticated preview tokens and preview-only origin |
| CMS becomes overcomplicated | Add features only when they remove recurring editorial work |
| Build failure publishes a broken site | Quality gate, immutable deploys, and rollback target |

## 14. Decisions Required to Start

1. Approve the recommended static-build-from-Sanity integration model, or choose server-rendered frontend.
2. Choose hosting: Cloudflare Pages, Netlify, Vercel, or another provider.
3. Confirm whether preview should be the recommended full Presentation Tool experience or a simpler preview-link-only first release.
4. Name the Editor, Reviewer, Publisher, and Administrator roles.
5. Confirm that image migration may begin only for assets with known publication rights.
6. Confirm the first three priority projects for a full CMS-to-website pilot.
