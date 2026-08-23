# Esencial Studio polish – S23–S28

## Outcome

Make `Arbetsyta` the clear daily CMS surface while preserving Sanitys native validation and publication path. Remove Content Releases/Scheduled Drafts, rename Structure functionality to **Innehåll & publicering**, make all project text/media editable as drafts, provide exact real-frontend preview, and add an accessible real-data trend graph.

## Five contexts

| Context | Stage | May start |
| --- | --- | --- |
| W0 Coordinator | S23, S28 | S23 now; S28 only after S24–S27 DONE |
| W1 Worker A | S24 | S23 DONE |
| W2 Worker B | S25 | S23 DONE |
| W3 Worker C | S27 | S24 and S25 DONE |
| W4 Worker D | S26 | S23 DONE |

S24, S25 and S26 run together. S27 follows S24+S25. S28 is last.

## Non-negotiable contracts

- Public visual identity and image experience are unchanged.
- LCP work may change delivery only, never image selection, crop, framing or visible quality.
- Custom editing writes only `drafts.*`; production publication remains explicit.
- No invented facts, translations, filters, credits, rights or legal wording.
- No browser-exposed token. Preview and analytics secrets remain server-side.
- Google/Vercel states are real, empty, unavailable or error; never demo data.
- A local fixture is not an exact preview.
- No push, Studio deploy, provider activation, Sanity publication or production deploy during worker stages.

## Integration order

1. Integrate S24, S25 and S26 independently after targeted tests.
2. Rebase/start S27 from the integrated S24+S25 state.
3. Resolve `studioTools.tsx`, config, package and test hotspots only in W0.
4. Run S28 on Node 22, including full SEO/build, CMS UX, Studio TypeScript/lint/build, preview, analytics/consent, accessibility, performance, parity and image quality.

## External gates

Real Search Console/Vercel statistics need owner credentials. Exact preview needs approved protected staging. Legal text, media rights and publication remain human decisions. Missing external access must produce a clear blocker, not a false PASS.

