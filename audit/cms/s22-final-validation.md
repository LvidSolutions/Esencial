# S22 final CMS and workflow validation

Status: **PASS — engineering plan complete**

- Date: 2026-08-23 (Europe/Stockholm)
- Lane: Coordinator / S22
- Model/effort: GPT-5.6 Sol / xhigh
- Branch: `codex/orchestrator-bootstrap`
- Validated start: `50031f2072668fb9a1a57061b0e70a790980d90f`
- Runtime: Node `22.23.2`, pnpm `9.15.9`

## Outcome

S0–S21 are integrated and the complete SEO/CMS implementation passes the final local workflow. The public site keeps the reference visual identity; the CMS adds draft-only bilingual project headings, explicit filter membership/order, protected-preview contracts, strict analytics states, consent safeguards, accessible recovery and deterministic release gates.

No serious known local engineering defect remains. Navigation and analytics remain fail-closed until complete published CMS data and owner-approved external configuration exist. No production, provider or Sanity write action was taken.

## Final evidence

| Gate | Result |
| --- | --- |
| Node/pnpm | PASS on required Node 22.x: `22.23.2`; pinned pnpm `9.15.9`. |
| Registry/workflow | PASS: valid dependency graph, deterministic read-only status tool, four-lane ownership checks and all 11 orchestration fixtures. |
| Sanity access | PASS, explicit `--read-only`: project `g6xm8j7l`, dataset `production`, 66 visible documents, 52 published projects, 0 drafts; token withheld and no mutation endpoint called. |
| CMS editorial UX | PASS: 8 responsive Playwright cases covering 375 px, tablet, desktop, 200%-equivalent reflow, long Swedish/English copy, reduced motion, focus, 44 px targets, dirty-form guards and keyboard reset recovery. |
| S17–S20 integration | PASS: composition, navigation, exact fallback and grid/filter/feed behavior; combined Node suite 25/25 including orchestration, 14 focused CMS cases and Playwright interaction. |
| Preview diagnostics | PASS locally: 10 hostile-copy viewport cases, 7/7 blocker classes and fresh viewport handshake. Real authenticated staging remains `BLOCKED_HUMAN`. |
| Analytics/consent | PASS locally: strict origin/provider/schema/secret isolation, 21 malformed nested responses rejected, equal consent paths and withdrawal/expiry controls; analytics stays disabled without approved configuration. |
| Studio | PASS on Node 22: TypeScript, full ESLint with zero warnings, 30 safeguards and Sanity `6.10.1` production build. |
| CI contract | PASS: 2 workflows, 14 ordered release gates, immutable actions, frozen installs, least privilege, secret isolation and negative fixtures. |
| Full public build | PASS: 52 project pages, 56 indexable/sitemap URLs, 28 Swedish + 28 English, metadata/hreflang/schema/semantics/project/content/link gates. |
| HTTP/functionality | PASS: 56 canonical responses, 55 redirects, correct 404/resource behavior and 4 core interaction pages. |
| Accessibility | PASS: 56 routes, 216 images, 70 headings, 0 errors. |
| Performance | PASS: 6 route/viewport cases; 0 LCP, CLS, long-task or synthetic-latency budget failures. |
| Reference parity | PASS: 40 live/local page/viewport pairs and 4 interaction scenarios. |
| Public/assets identity | PASS: exact Git diff empty. `public/index.html` blob `df083d7a8fb067c707216e70b5e2b3ca00419e94`; `public/projects/index.html` blob `68b6aeb9aef1653f929dc741358fb2b011c06340`. |
| Image experience | PASS: 78 derivatives retain uncropped framing; 51 photos meet SSIM >= 0.975 (worst 0.9756); 27 drawings remain lossless. No image selection, crop, framing, compression or LCP visual change. |

The first Sanity-access invocation without a safety flag was correctly refused by the script. The explicit read-only rerun passed. Two preliminary Studio command wrappers used invalid npm syntax and stopped before tests; the direct Node 22 TypeScript, ESLint and Sanity commands then passed. These were invocation errors, not product failures.

## Human/external gates

These are intentionally outside local engineering completion and must remain blocked until separately authorised:

1. Authenticated protected-staging preview using the exact HTTPS origin/session, real frontend DOM/CSS/assets, fresh width handshakes, `noindex`/`no-store` and no exposed credential.
2. Owner/editor approval of Swedish/English facts, headings, filter labels, memberships, order and media rights.
3. Legal approval of controller identity, purposes, categories, providers, retention and bilingual privacy/cookie wording.
4. Approved API authentication/Deployment Protection; CORS alone is not authentication.
5. Cookiebot, Vercel Web Analytics and optional Search Console configuration/activation.
6. Sanity Studio/web deployment, production publication, DNS/hosting changes, push or PR.

## Pessimistic quality assessment

- **Engineering implementation: 9/10.** Strong deterministic coverage, exact visual preservation, fail-closed data paths and accessible recovery.
- **Current production readiness: 7/10.** The missing points are external acceptance and configuration: real protected preview, owner-edited CMS taxonomy/content, legal approval, provider activation and authorised deployment.
- After those human gates pass without regressions, expected production quality is **9/10**. A 10/10 claim would require real-user/editor observation and post-launch field data.

## Safety record

No `.env`/token content was copied or displayed; no Sanity mutation, migration, import or publication; no analytics/provider activation; no deployment, push, PR, DNS, hosting or production action; no invented project fact, translation, taxonomy or legal wording; and no public image/frontend change occurred.
