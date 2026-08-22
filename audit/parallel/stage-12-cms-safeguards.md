# Stage S12 — CMS and Sanity SEO safeguards

Status: PASS

Branch: `codex/worker-d-s12`

Starting commit: `935d7892ccfbe01acc16211cec100da04d23fbbb`

## Outcome

S12 closes the repository-side CMS publication gaps without contacting Sanity or another external account. The authoritative Studio schema, visual workspace, local import generator, server-side fetcher, validation gates, and editor guide now share one strict contract for bilingual SEO, stable project identity/URLs, media placement, rights, publication state, previews, errors, and empty exports.

The `vercel:cms` workflow informed the draft/published separation and server-only token boundary. No Vercel or Sanity integration was activated.

## Root cause and remediation

- The visual workspace claimed draft autosave but patched selected canonical IDs and the canonical `homePage` singleton. All workspace mutations now create/patch `drafts.*`; the protected preview uses the drafts perspective with CDN disabled, and final publication is delegated to Sanity’s validated native document view.
- Translation keys were read-only but optional and pair integrity was not checked. Review/published documents now require a stable key, unique language membership, a matching counterpart/shared slug, approved translation state, and valid counterpart SEO.
- Slugs had no format/lock contract. They now use a lowercase stable pattern, must match across languages, and are locked while project status is published; redirect planning remains external.
- Alt-text severity could be downgraded to a warning by a chained rule. Missing alt text, credit, and rights are now blocking publication requirements for hero, gallery, and floor-plan media.
- The visual publication shortcut performed a shallow, bypassable check. It was replaced by an explicit issue list/checklist and a link to native validation/publication.
- The server export validated records while mutating/writing them sequentially, used SEO copy as visible body copy, lacked strict pair/publication/media/home checks, and printed provider error bodies. It now uses `summary` as visible description, requests `published` perspective, validates the complete in-memory snapshot/home references before staged writes, and emits bounded actionable errors without provider payloads.
- The legacy duplicate schema and production-replacing import command could drift or cause unsafe use. The compatibility schema now re-exports the authoritative type; local NDJSON preparation produces draft IDs only and no longer includes a dataset-import command.

## Validation evidence

| Command/check | Result |
| --- | --- |
| `corepack pnpm run check-content` | PASS — 52 project records |
| `corepack pnpm run check-studio-workspace` | PASS — 30 safeguards |
| `node scripts/check-cms-content.js --fixtures` | PASS — 11 unsafe exports rejected + valid control |
| `node scripts/fetch-sanity-content.js --fixtures` | PASS — 4 invalid exports rejected + valid/empty controls |
| `npx tsc --noEmit` (`cms/studio`) | PASS |
| `npx eslint . --max-warnings=0` (`cms/studio`) | PASS |
| `npm ci` (`cms/studio`) | PASS — 1,148 packages; 21 npm advisories reported |
| `npm run build` (`cms/studio`) | PASS — clean Sanity Studio build |
| `corepack pnpm run build` | PASS — 56 pages; S8 structured data and S11 analytics/consent checks included |
| Consecutive build snapshot | PASS — 196 public files byte-identical |
| Repeated local import generation | PASS — NDJSON byte-identical |
| Repository + built-Studio secret scan | PASS |
| Missing-token boundary fixture | PASS — no network/export; generated content unchanged |
| `git diff --check` | PASS before commit |

## Shared and generated files

- Shared hotspot changed: `scripts/fetch-sanity-content.js`.
- Shared hotspots inspected but unchanged: `scripts/build-project-pages.js`, root `package.json`, `.github/workflows/cms-build.yml`.
- Generated file changed: `cms/studio/import/esencial.ndjson` (52 project drafts plus draft site settings; no fabricated rights/credits).
- Root-generated `public/**` output was rebuilt twice and byte-identical to its first validated pass; no public file content is part of the S12 diff.
- Orchestration state files were not edited.

## External/manual gates

1. Sanity owner approves any dataset import, role, token, webhook, or Studio deployment.
2. Editor supplies verified credits/rights or migrates every legacy image before publication.
3. Editor pilots one Swedish/English pair through draft, review, native publish, and staging desktop/mobile review.
4. Developer prepares redirects before any published slug changes.
5. Align the Studio lockfile with the hosted auto-update Sanity runtime and review npm advisories before deployment.

## Residual risks

- Async pair validation and native publication were compiled but not exercised against the real dataset because external access was prohibited.
- The current draft import truthfully retains unknown legacy credits/rights; this is a deliberate publication blocker, not missing test coverage.
- Studio build warns that locked local `sanity`/`@sanity/vision` 6.4.0 differs from hosted auto-update 6.10.1. Dependency alignment is intentionally not mixed into S12.
- `npm ci` reports 10 moderate and 11 high dependency advisories; remediation requires a scoped dependency review rather than an unreviewed force-upgrade.

## Not performed

No robot token use, Sanity query/write, production content mutation, role/dataset change, Studio deploy, webhook/account activation, merge, push, pull request, Vercel deploy, DNS change, production touch, orchestration-state edit, or S13 work.
