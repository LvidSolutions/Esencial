# Esencial Static Site and SEO Build

This repository contains the replacement static site for `https://www.esencial.se`. The currently live domain is not the deployment target during development; the domain moves only after the new build is approved.

The recovery preserves the current public frontend only. No CMS, SEO, metadata cleanup, image optimization, backend work, or redesign has been started.

## What Was Recovered

- `/`
- `/om-oss/`
- `/projects/`
- `/about/`
- Public WordPress theme assets under `/wp-content/themes/esencial/`
- Public upload assets under `/wp-content/uploads/`
- The one retained WordPress include asset (`jquery.min.js`) still needed by the recovered interaction code
- External Roboto font CSS/font files needed for visual fidelity

## Build and validate

The content source is under `content/projects/`. The generated project pages under `public/projekt/` and `public/projects/{slug}/` must not be edited by hand.

```bash
npm run build
```

This generates project pages and `sitemap.xml`, then validates every indexable HTML page and sitemap URL for status mapping, unique self-canonical URLs, crawl rules, language-link targets, JSON-LD, and image alt attributes. It also verifies the canonical host/trailing-slash deployment policy and API `X-Robots-Tag` protection.

Run `npm run audit:technical-seo` to validate both generated files and local HTTP behavior and to write the deterministic evidence files used by the Stage 3 report.

See [the editor guide](docs/CMS_USER_GUIDE.md), [crawler policy](docs/AI_CRAWLER_POLICY.md), and [domain cutover checklist](docs/DOMAIN_CUTOVER.md).

## Install

```bash
pnpm install
```

If `pnpm` is not on PATH, use the bundled Codex runtime used for this recovery:

```powershell
& "C:\Users\andreas.hiller\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd" install
```

## Run Locally

```bash
npm run serve
```

Then open:

```txt
http://127.0.0.1:3000/
```

If `npm`/`node` is not on PATH, run:

```powershell
& "C:\Users\andreas.hiller\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\static-server.js
```

## Recovery Scripts

```bash
npm run crawl
npm run download-assets
npm run rewrite-paths
```

or:

```bash
npm run recover
```

## Verification Scripts

```bash
npm run verify-visual
npm run compare-screenshots
npm run inspect-computed-styles
npm run inspect-bounding-boxes
npm run check-functionality
```

Screenshots and diff images are saved under `screenshots/`.

Audit reports are saved under `audit/`.

## Current Verification Result

- 40 live/local screenshot pairs were compared across ten required desktop, tablet, and mobile viewports.
- The largest antialias-tolerant visual difference is `1.5743%`; exact geometry and selected computed styles match.
- Four live/local interaction scenarios pass for hover, filtering, card opening/scrolling, and language links.
- Local navigation checks returned `200` for all four recovered routes.

## Known Limitations

- WordPress upload and theme paths remain for URL compatibility; their path names do not make actively used files dead code.
- jQuery core remains because the recovered filter, feed, and carousel interactions still depend on it. jQuery Migrate and unused WordPress admin/plugin assets were removed in Stage 2.
- The obsolete ExactMetrics/Google Analytics wrapper was removed. Vercel Web Analytics remains active; final measurement architecture is reserved for the analytics stage.
- Project carousel data still contains production-domain image URLs for media that has not yet been localized. Image dependency cleanup belongs to the image stage.

## Recommended Next Step

Review `audit/final-recovery-report.md`, then decide whether the next phase should be CMS planning, SEO cleanup, or maintainable frontend restructuring.
