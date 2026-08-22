# Live Reference Audit — Stage 1 Baseline

Status: Focused parity baseline complete; the broader live SEO/headers/network audit remains a later phase.

## LIVE CURRENT

Verified on 2026-08-21:

| Route | Final status | Redirects | Title | `html lang` | Main visible behavior |
| --- | ---: | ---: | --- | --- | --- |
| `/` | 200 | 0 | `ESENCIAL \| PROJEKT` | `en` | 27-card Swedish portfolio, five filters, expandable cards |
| `/om-oss/` | 200 | 0 | `ESENCIAL \| OM OSS` | `en` | Swedish about page with two featured items and practice/team information |
| `/projects/` | 200 | 0 | `ESENCIAL \| PROJECTS` | `en` | 27-card English portfolio, five filters, expandable cards |
| `/about/` | 200 | 0 | `ESENCIAL \| ABOUT` | `en` | English about page with two featured items and practice/team information |

The Swedish live routes incorrectly declare `lang="en"`; the repository's corrected language declaration is an intentional non-visual improvement and will be assessed fully in the international SEO stage.

## REPO CURRENT

The four reference routes reproduce live geometry and behavior while adding existing semantic/SEO markup: meaningful titles, descriptions, headings, lists, semantic images, project links, language metadata, canonical/hreflang data, and structured data. These changes are machine-visible but do not require a visual redesign.

## HISTORICAL DOCUMENTATION

The older `audit/` reports described only six viewports and predate this Stage 1 run. Their claims were treated as historical evidence, then independently re-tested against the live site.

## Scope limitation

This report records only what Stage 1 needed for parity. A complete audit of headers, caching, compression, analytics requests, all discovered routes, accessibility, and SEO metadata remains pending.
