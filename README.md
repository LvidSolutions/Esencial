# Esencial Static Recovery

This repository contains a static recovery copy of the live `https://www.esencial.se` frontend.

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
