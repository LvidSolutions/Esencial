# S19 Analytics Dashboard, Consent and Privacy Controls

Status: PASS

Date: 2026-08-23
Lane: Worker D
Stage: S19
Required model/effort: GPT-5.6 Sol / xhigh
Branch: `codex/worker-d-s19`
Verified starting HEAD: `7235840205326c453518fc30cabbed91ec5e003f`
Final local commit: the single commit containing this report, with subject `CMS-S19 PASS: add consent-gated analytics workspace`; its SHA is reported in the handoff.

## Outcome

S19 adds an isolated, source-labelled Sanity Studio analytics feature, a server-only real-data adapter, and a minimal public consent control. The dashboard has 7/30/90-day periods, preceding-period comparisons, top traffic pages, Search Console pages and queries, source freshness, limitations, and explicit loading, unavailable, empty, and error states. It never substitutes examples, cached values, or estimates for provider data.

The public path remains disabled when approved consent configuration is absent. A complete configuration gives reject and accept equal placement and styling, blocks the Vercel Analytics resource until an active versioned statistics choice is also confirmed by Cookiebot, stores only the choice version/category/time, exposes a persistent reopen control, and removes the resource plus reloads after withdrawal. Missing provider state, local storage, origin, credentials, partial configuration, malformed provider data, and consent-service failure all fail closed.

This is an engineering PASS, not legal certification. No controller identity, purpose expansion, retention period, production domain, provider account, or final legal wording was invented or activated.

## Implemented scope

- `cms/studio/features/analytics/AnalyticsConsentFeature.tsx`: accessible real-data-only dashboard and engineering/legal-status summary.
- `cms/studio/features/analytics/analyticsClient.ts`: exact HTTPS endpoint validation, `credentials: 'omit'`, no browser authorization header, timeout, and response-shape gate.
- `cms/studio/features/analytics/analyticsFeature.css`: Studio-token-aware responsive cards/tables, 375 px reflow, focus-compatible native controls, numeric alignment, and reduced-motion handling.
- `cms/studio/features/analytics/types.ts` and `index.ts`: isolated S20 integration contract.
- `api/analytics.js`: strict CMS origin, server-only Vercel/Search Console credentials, sanitised logs/errors, aggregate daily current/previous traffic, top pages, source freshness, and explicit unavailable/empty/error states.
- `scripts/inject-vercel-analytics.js`: disabled, S11-compatible legacy, and complete S19 build modes; deterministic CSP hashes; accessible bilingual notice; versioned choice and withdrawal.
- `scripts/check-consent.js`: positive/negative consent, provider, origin, CSP, storage, output, aggregate, and secret-isolation fixtures.
- `.env.example`: placeholders for public owner-approved consent metadata only; no token or real identity.
- `docs/ANALYTICS_SETUP.md`: architecture, configuration, provider limits, security boundaries, human blockers, and primary sources.

No S17/S18 file, shared Studio shell/theme, `studioTools.tsx`, `vercel.json`, orchestration file, image, image derivative, LCP setting, compression rule, crop, or framing rule changed. The isolated feature deliberately remains for S20 to integrate after S17/S18 land.

## Provider contract and real-data behavior

- Vercel traffic totals are sums of `visits/aggregate` rows grouped by `day` for both the selected inclusive range and the preceding equal-length range. The API does not use the lifetime-oriented count endpoint for real S19 comparisons.
- The top-pages query uses the same selected range grouped by `requestPath`; `Others` is excluded rather than presented as a page.
- Vercel response version, arrays, dimensions, and finite non-negative metrics are validated. Unsupported/malformed responses return sanitised HTTP 502 without fallback numbers.
- Search Console queries use final data for the selected and prior periods, plus page/query/date dimensions. Source limitations and last available date are surfaced.
- All provider tokens and the Google service-account material remain in the function environment and outbound server `Authorization` headers. The Studio client sends no credentials, cookies, provider token, or browser secret.
- Exact `CMS_ORIGIN` is enforced for CORS requests. Origin is not claimed to be authentication; the eventual Vercel Deployment Protection/API exposure model remains a human S20/security decision.

## Consent engineering evidence

- Before choice: no `/_vercel/insights/script.js` element or request.
- Equal choice: reject and accept are native buttons in the same two-column group, with the same CSS, dimensions, border, background, colour, and minimum 48 px height. They stack equally at 375 px.
- Acceptance: analytics is created only when the stored choice matches the configured notice version, `statistics` is true, and Cookiebot also reports statistics consent.
- Rejection: the site remains usable and stores a false statistics choice even if Cookiebot is unavailable.
- Reopen/withdraw: the persistent `Kakinställningar`/`Cookie settings` button returns focus to reject; withdrawal removes the resource, calls the documented provider withdrawal path, records false, and reloads to stop already-installed listeners.
- Version/storage: an absent, malformed, or old-version choice is removed and analytics remains off; local-storage failure also remains off.
- Partial public consent configuration aborts the build. With no configuration, all 56 generated pages contain only the disabled marker. The one-variable legacy mode preserves the integrated S11 manual-blocking contract.
- CSP: the exact inline controller/style have deterministic SHA-256 hashes; a changed controller fails the fixture. S19 does not add a shared CSP header because doing so requires central script inventory and parity work.

## Verification record

All commands ran locally without Sanity writes, deployment, provider activation, or other external mutation.

| Command/check | Result |
| --- | --- |
| `node orchestration/status.mjs` | PASS; registry valid; only S17, S18, and S19 effectively READY |
| `node orchestration/status.mjs --json` | PASS; deterministic valid machine output |
| `node --test orchestration/status.test.mjs` | PASS; 11/11 tests |
| `node scripts/check-consent.js` | PASS; 56 generated pages plus pre-consent, symmetry, accept/reject, withdrawal/reopen, version/storage, CSP, origin, official Vercel aggregate, fail-closed provider, secret isolation, idempotence, and S11 fixtures |
| `corepack pnpm run check-analytics` | PASS; 56 pages and strict origin/unavailable/empty/error/provider-schema/secret-isolation checks |
| `npm exec tsc -- --noEmit` (Studio) | PASS |
| `npm exec eslint -- features/analytics --max-warnings=0` | PASS |
| `npm --prefix cms/studio run build` | PASS with Sanity 6.10.1 |
| `corepack pnpm run check-studio-workspace` | PASS; 30 schema/workspace/export safeguards and no browser-secret exposure |
| `corepack pnpm run build` | PASS; all 56-page build/SEO/semantic/structured-data/link gates |
| `corepack pnpm run check-image-quality` | PASS; 78 derivatives uncropped, 51 photo derivatives SSIM >= 0.975 (worst 0.9756), 27 drawings lossless |
| `corepack pnpm run check-reference-parity` | PASS; 40 live/local page/viewport pairs and four interaction scenarios; refreshed shared timestamps were restored to baseline afterward |
| Tracked public-output and asset diff/hash checks | PASS; no normalized diff under `public/**` or `public/assets/**` after the full build |
| Temporary local Playwright harness using the real feature/controller | PASS; dashboard data/error/retry, no browser credentials, keyboard focus, 375 px, 200% zoom, reduced motion, consent symmetry, pre-consent blocking, acceptance, and persistent reopen; harness removed before final diff |

The installed environment reported Node `v24.16.0` while the repository requests Node 22.x. Frozen installation and every listed test/build passed, but S20/CI should repeat on the pinned Node 22 runtime.

## Primary official sources reviewed

Sources were read on 2026-08-22/23 and are cited for design constraints, not as certification:

- [Post- och telestyrelsen: Kakor (cookies)](https://pts.se/internet-och-telefoni/kakor-cookies/) — active, specific and informed choice; reject and accept in the same view with similar design; only necessary storage before choice; easy withdrawal.
- [IMY: tillsyn av Aktiebolaget Trav och Galopp](https://www.imy.se/tillsyner/aktiebolaget-trav-och-galopp/) — Swedish enforcement concerning misleading banner design and withdrawal that was not as easy as consent.
- [GDPR Article 7, EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=celex:32016R0679) and [EDPB Guidelines 05/2020](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en) — conditions for consent and withdrawal as easy as giving consent.
- [Cookiebot manual blocking](https://support.cookiebot.com/hc/en-us/articles/4405978132242-Manual-cookie-blocking), [Cookiebot developer SDK](https://www.cookiebot.com/en/developer/), and [changing or withdrawing consent](https://support.cookiebot.com/hc/en-us/articles/360003798814-Changing-or-withdrawing-consent) — manual category blocking, consent events, `submitCustomConsent`, `renew`, and `withdraw`.
- [Vercel Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api), [privacy and compliance](https://vercel.com/docs/analytics/privacy-policy), and [limits and pricing](https://vercel.com/docs/analytics/limits-and-pricing) — current aggregate API, daily/dimension grouping, visitor model, and plan-dependent reporting windows.
- [Google Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) — dates, dimensions, final data, scopes, response fields, and detail-row limitations.
- [Sanity Studio React hooks](https://www.sanity.io/docs/studio/studio-react-hooks) and [Sanity JS client](https://www.sanity.io/docs/apis-and-sdks/js-client-getting-started) — supported Studio/client boundaries. S19 performs no Sanity mutation or migration.

## Human blockers and residual risks

These are not engineering failures and must remain unresolved until an authorised human decides them:

1. Confirm the actual personuppgiftsansvarig/controller identity and contact information.
2. Approve complete Swedish and English purposes, categories, provider/subprocessor disclosures, privacy text, legal basis, international-transfer assessment, and retention periods.
3. Configure the exact Cookiebot domain group and verify consent logging/category behavior in the authorised staging account.
4. Enable Web Analytics only in the authorised Vercel staging project, create a least-privilege read token, and confirm the account plan/reporting window.
5. Confirm the production Search Console property and least-privilege read-only service account, if SEO data is approved.
6. Decide and test the API authentication/Deployment Protection model; exact CORS origin alone is not server authentication.
7. Verify real network requests, Cookiebot language/domain behavior, withdrawal, and provider-dashboard comparisons after a separately authorised staging deployment.

No legal compliance, certification, production readiness, or provider activation is claimed.

## S20 handoff

1. Integrate `AnalyticsConsentFeature` into S16’s analytics extension slot only after the isolated S17/S18/S19 commits are present; preserve their ownership boundaries.
2. Configure only the public Studio endpoint after the staging API protection model is approved; do not put provider credentials in Studio.
3. Re-run S17/S18/S19 focused tests, Studio TypeScript/lint/build, all 30 safeguards, root build, public-output/image-quality, narrow/zoom/keyboard/reduced-motion, and parity after integration.
4. Keep consent configuration incomplete and analytics disabled until all human blockers above are signed off. Activation, deployment, Sanity writes, migration, push, PR, DNS, and production work were not authorised by S19.
