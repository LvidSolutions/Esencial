# S28 — Studio correction validation and release handoff

Date: 2026-08-24  
Scope: final composition of S24–S26; no frontend redesign, public-image rewrite, Sanity dataset mutation, or Studio deployment.

## Delivered

- `Arbetsyta` now starts with **Redigera innehåll**: draft-only project text, SEO fields and media review/recovery.
- Existing bilingual project and filter controls follow next; category membership remains explicit and new categories are hidden until deliberately made visible.
- Protected preview and layout diagnostics retain their existing exact-preview contract. A local fixture is never presented as exact.
- The final analytics step supplies validated 7/30/90-day trends, accessible tabular equivalents and clear unavailable states. No fabricated numbers are shown.
- Releases and Scheduled Drafts remain disabled. Advanced native publishing is retained as the clearly named safe escape hatch.
- `@sanity/ui` is pinned directly to the Studio-compatible 3.3.5 API after dashboard-package removal.

## Evidence passed locally

- Studio TypeScript, ESLint and production build.
- Content/media contract: 4 tests; Studio composition: 6 tests.
- Workspace safeguards: 30; UX: 8 responsive editorial scenarios.
- Consent, analytics, layout and orchestration state checks.
- Full site build, 40 visual route/viewport pairs, 4 interactions, 56-page accessibility and performance gates.
- Image output remains visually protected: 78 derivatives, with 51 photos at SSIM >= 0.975 and 27 drawings lossless.

## Deliberate external gates

Exact draft preview requires an approved HTTPS staging origin/session and server-only renderer credential. Real traffic/Search Console data requires provider credentials and legal approval. These conditions fail closed; they are not replaced with mock data or a misleading preview.

## Release result

GitHub `main` and both Git-connected Vercel projects are `READY` at `69db1e9` (2026-08-24): production `https://esencial-c05g6coht-lvid-s-projects.vercel.app` and staging `https://esencial-staging-cmtcpoey8-lvid-s-projects.vercel.app`. Vercel's protected deployment URLs intentionally return `noindex`; the public domain must remain the indexing target. Local validation ran on Node 24 because Node 22 was unavailable on this workstation; Vercel correctly used the repository's Node 22 contract.
