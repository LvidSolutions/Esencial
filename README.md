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
- Public WordPress include/plugin assets needed for rendering
- External Roboto font CSS/font files needed for visual fidelity

## Build and validate

The content source is under `content/projects/`. The generated project pages under `public/projekt/` and `public/projects/{slug}/` must not be edited by hand.

```bash
npm run build
```

This generates project pages and `sitemap.xml`, then validates every sitemap URL for title, description, canonical URL, H1, crawl rules, language links, JSON-LD, and image alt attributes.

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

- 24 live/local screenshot pairs were compared.
- The largest recorded visual difference is `1.0365%`.
- Home and projects are pixel-identical or near-pixel-identical in the captured desktop/mobile viewports.
- About and om-oss show small differences mostly from text antialiasing and live rendering variation.
- Computed styles and bounding boxes matched for inspected key elements.
- Local navigation checks returned `200` for all four recovered routes.

## Known Limitations

- The live site exposes WordPress/static-export traces that were intentionally preserved.
- `noindex` metadata was intentionally preserved.
- Analytics/external behavior was not cleaned or modernized.
- No CMS or SEO implementation has been started.

## Recommended Next Step

Review `audit/final-recovery-report.md`, then decide whether the next phase should be CMS planning, SEO cleanup, or maintainable frontend restructuring.
