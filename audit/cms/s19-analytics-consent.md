# S19 Analytics Dashboard, Consent and Privacy Controls

Status: PASS

Date: 2026-08-23
Lane: Worker D
Stage: S19
Required model/effort: GPT-5.6 Sol / xhigh
Branch: `codex/worker-d-s19`
Verified starting HEAD: `7235840205326c453518fc30cabbed91ec5e003f`
Initial PASS commit: `6f346c802d295e4a81d3ad450a77a985360c5c4c` (`CMS-S19 PASS: add consent-gated analytics workspace`).
Retention/visitor-sum fix: `aae5248819cdc8b68bd4d0f4b0bfa133e2d93ff0` (`CMS-S19 FIX: enforce consent expiry and clarify visitor sum`).
Response-contract follow-up: this separate fix commit preserves both earlier commits; its SHA is reported in the final handoff.

## Outcome

S19 adds an isolated, source-labelled Sanity Studio analytics feature, a server-only real-data adapter, and a minimal public consent control. The dashboard has 7/30/90-day periods, preceding-period comparisons, top traffic pages, Search Console pages and queries, source freshness, limitations, and explicit loading, unavailable, empty, and error states. It never substitutes examples, cached values, or estimates for provider data.

The public path remains disabled when approved consent configuration is absent. A complete configuration gives reject and accept equal placement and styling, blocks the Vercel Analytics resource until an active, versioned and unexpired statistics choice is also confirmed by Cookiebot, stores only the choice version/category/time, exposes a persistent reopen control, and removes the resource plus reloads after withdrawal. Missing provider state, local storage, origin, credentials, partial configuration, malformed/expired/future choice time, malformed provider data, and consent-service failure all fail closed.

This is an engineering PASS, not legal certification. No controller identity, purpose expansion, retention period, production domain, provider account, or final legal wording was invented or activated.

## Implemented scope

- `cms/studio/features/analytics/AnalyticsConsentFeature.tsx`: accessible real-data-only dashboard and engineering/legal-status summary.
- `cms/studio/features/analytics/analyticsClient.ts`, `analyticsContract.ts` and `analyticsClient.test.ts`: exact HTTPS endpoint validation, `credentials: 'omit'`, no browser authorization header, timeout, strict nested response validation, and focused fail-closed fixtures.
- `cms/studio/features/analytics/analyticsFeature.css`: Studio-token-aware responsive cards/tables, 375 px reflow, focus-compatible native controls, numeric alignment, and reduced-motion handling.
- `cms/studio/features/analytics/types.ts` and `index.ts`: isolated S20 integration contract.
- `api/analytics.js`: strict CMS origin, server-only Vercel/Search Console credentials, sanitised logs/errors, explicit `dailyVisitorsSum` for current/previous traffic, top pages, source freshness, and unavailable/empty/error states.
- `scripts/inject-vercel-analytics.js`: disabled, S11-compatible legacy, and complete S19 build modes; deterministic CSP hashes; accessible bilingual notice; versioned, bounded and expiring choice; withdrawal.
- `scripts/check-consent.js`: positive/negative consent, provider, origin, CSP, storage, output, aggregate, and secret-isolation fixtures.
- `.env.example`: placeholders for public owner-approved consent metadata only; no token or real identity.
- `docs/ANALYTICS_SETUP.md`: architecture, configuration, provider limits, security boundaries, human blockers, and primary sources.

No S17/S18 file, shared Studio shell/theme, `studioTools.tsx`, `vercel.json`, orchestration file, image, image derivative, LCP setting, compression rule, crop, or framing rule changed. The isolated feature deliberately remains for S20 to integrate after S17/S18 land.

## Provider contract and real-data behavior

- Vercel `visits/aggregate` grouped by `day` returns daily visitor values. S19 exposes their sum only as `traffic.dailyVisitorsSum` / **Summa dagliga besökare**, never as periodunika besökare. The same person may count on multiple days. Current and preceding equal-length ranges use the identical calculation for an apples-to-apples comparison.
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
- Version/storage/clock: an absent, malformed, old-version, expired, future-dated, or non-canonical timestamp is removed and analytics remains off. The owner-approved `CONSENT_CHOICE_RETENTION_DAYS` integer is machine-enforced from 1 through 365 days; local-storage failure also remains off.
- Partial public consent configuration aborts the build. With no configuration, all 56 generated pages contain only the disabled marker. The one-variable legacy mode preserves the integrated S11 manual-blocking contract.
- CSP: the exact inline controller/style have deterministic SHA-256 hashes; a changed controller fails the fixture. S19 does not add a shared CSP header because doing so requires central script inventory and parity work.

## Verification record

All commands ran locally without Sanity writes, deployment, provider activation, or other external mutation.

| Command/check | Result |
| --- | --- |
| `node orchestration/status.mjs` | PASS; registry valid; only S17, S18, and S19 effectively READY |
| `node orchestration/status.mjs --json` | PASS; deterministic valid machine output |
| `node --test orchestration/status.test.mjs` | PASS; 11/11 tests |
| `node scripts/check-consent.js` | PASS; 56 generated pages plus pre-consent, symmetry, accept/reject, withdrawal/reopen, version/storage, deterministic expiry boundary, future/invalid clock, CSP, origin, explicit daily visitor sum, fail-closed provider, secret isolation, idempotence, and S11 fixtures |
| `corepack pnpm run check-analytics` | PASS; 56 pages and strict origin/unavailable/empty/error/provider-schema/secret-isolation checks |
| `npm exec tsx -- features/analytics/analyticsClient.test.ts` (Studio) | PASS; complete ready/unavailable/empty/error positives and 21 malformed nested contracts rejected fail-closed |
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

### W0 corrective review rerun

The 2026-08-23 W0 review identified and this follow-up corrected two accuracy gaps without changing the initial PASS commit:

1. `decidedAt` is now enforced against the separate owner-approved `CONSENT_CHOICE_RETENTION_DAYS` limit. The build rejects non-integers and values outside 1–365. Runtime rejects non-canonical, invalid, future, exactly-expired, and older timestamps; it clears the record, withdraws provider statistics consent when present, reopens the notice, and makes no analytics request. A deterministic fixture one millisecond inside the boundary remains valid.
2. The sum of Vercel day rows is now `dailyVisitorsSum` / **Summa dagliga besökare**. The API, Studio card, comparison, type contract, fixtures, and limitations state that the same person may be counted on multiple days. Top-page visitor values remain source-labelled row values and are not added into a period-unique total.

Corrective reruns passed: `node scripts/check-consent.js`; `corepack pnpm run check-analytics`; Studio `tsc --noEmit`, feature ESLint and `sanity build`; all 30 Studio safeguards; full root build; standalone image quality; and a normalized no-diff gate for `public/**` and `public/assets/**`. No external provider or Sanity write occurred.

### W0 final response-contract correction

The initial Studio client checked only the response envelope, so malformed nested provider data could pass the claimed shape gate and fail during rendering. The final corrective commit moves validation to `analyticsContract.ts` and verifies every consumed nested field, allowed state, supported period, contiguous date range, source identity, row, freshness value, state relationship, string list and finite non-negative metric; CTR is bounded to 0–1. Complete provider error envelopes keep their sanitised message, while malformed data produces the existing safe error and no values.

The locally rerun focused suite covers complete `ready`, `unavailable`, `empty` and sanitised HTTP 502 `error` responses plus 21 negative mutations. It also proves that the Studio request uses `credentials: omit` and no browser `Authorization` header. The same local-assertion fixture is both Studio-typecheckable and directly runnable with the installed `tsx` runner. Focused TypeScript, feature ESLint, consent/API checks, JavaScript syntax, Sanity 6.10.1 Studio build, and all 30 Studio safeguards passed. Broader root, image-quality and parity suites were not rerun because this narrow follow-up changes only the Studio contract/client/test, two nullable fields in structured API errors, and documentation; normalized public and orchestration diffs are empty. No provider call, Sanity write or external mutation occurred.

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
2. Approve complete Swedish and English purposes, categories, provider/subprocessor disclosures, privacy text, legal basis, international-transfer assessment, retention wording, the 1–365 day machine value, and its alignment with Cookiebot.
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
