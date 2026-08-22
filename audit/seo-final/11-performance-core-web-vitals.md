# Stage 9 — Performance and Core Web Vitals

Status: PASS

Baseline/integration SHA: `77935aacd3fab3bb454600bcfe4c775eaa04f982`

Final measurement timestamp: `2026-08-22T15:31:41.6924180+02:00`

Branch: `codex/worker-c-s9`

## Outcome

The verified image-loading bottlenecks were reduced without a measured visual, structural, console, or interaction regression. The home page no longer downloads duplicate CSS backgrounds behind semantic images, later grid images load only near the viewport, and overview/feature rendering uses deterministic responsive WebP derivatives while retaining original sources in crawlable HTML and as runtime fallbacks.

Desktop Lighthouse LCP is now good on all representative routes. Mobile Lighthouse improved materially but remains above the 2.5 s target on the uncompressed local recovery server for the home and about pages; this is reported as a residual risk, not presented as a pass against the target. CLS remained good. No valid field INP was available locally, so only clearly labelled synthetic interaction latency was recorded.

## Scope inspected and pre-existing implementation

- Images: 54 overview-grid images, two about feature images, 52 project-detail source images and existing Stage 7 variants.
- Fonts: three local Roboto TTF files (134,312 source bytes) and the recovered font stylesheet.
- CSS: `tachyons.css`, `styles.css`, project-page CSS, inline backgrounds and media sizing.
- JavaScript: jQuery, the recovered interaction script and Vercel Analytics loader.
- Rendering: eager/lazy priority, intrinsic dimensions, layout-shift observers, long tasks and first-view image request behavior.
- Caching/hosting: local static-server behavior and `vercel.json`; no production response-header claim was possible.
- Existing strengths retained: intrinsic dimensions on project images, eager/high-priority first detail image, responsive photo variants, zero measured CLS, zero representative long tasks and zero reference-parity failures.

## Verified bottlenecks and changes

1. Home loaded 55 images and 16.43 MB of image transfer because identical inline CSS backgrounds remained active behind semantic `<img>` elements. CSS now suppresses only those redundant backgrounds.
2. Native lazy loading still fetched many full-resolution images within Chromium's preload distance. The footer script now removes later grid sources before layout and restores them through `IntersectionObserver` as they approach the viewport. The first card remains eager/high-priority. Original `src` values remain in static HTML and the no-JavaScript path still uses native loading.
3. Several legitimately visible overview drawings were 0.7–2.5 MB each. A deterministic generator now creates 54 overview-only 640 px WebPs; drawings use WebP lossless mode and photos quality 90. Detail-page drawing delivery remains unchanged.
4. The two about images were 1,126,804 and 608,617 bytes. Mobile derivatives are 101,300 and 46,734 bytes; desktop derivatives are 352,280 and 163,776 bytes.
5. A DOM-ready implementation produced a repeatable timing race in one draft evidence set. Loading now starts immediately when the footer script executes, before DOMContentLoaded/layout. Three fresh home runs per form factor then produced identical request/byte totals.

Lossless recompression of the largest PNGs was rejected: decoded pixels matched, but savings were only about 2–7%, and one already-efficient LCP drawing grew. Font-display changes and broad CSS removal were also rejected because the measured bottleneck was media transfer and those changes would add typography/layout risk. `vercel.json` cache headers were not changed because production behavior was not locally verified and stable WordPress-style URLs are not safe to mark immutable indiscriminately.

## Before/after evidence

Pinned environment: Lighthouse `12.8.2`, Chrome `151.0.7922.170`, Node `24.16.0`, simulated Lighthouse throttling. Baseline uses two runs per case. Final uses two runs per case and three runs for the race-sensitive home route. Values below are medians.

| Case | Score | LCP | CLS | Transfer | Requests |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home desktop | 75 → 98 | 8.61 s → 1.03 s | 0 → 0 | 16.22 MiB → 3.27 MiB | 65 → 27 |
| Home mobile | 66 → 70 | 25.44 s → 5.57 s | 0 → 0 | 16.22 MiB → 3.00 MiB | 65 → 23 |
| About desktop | 90 → 98 | 2.09 s → 1.05 s | 0 → 0 | 2.00 MiB → 0.86 MiB | 12 → 13 |
| About mobile | 69 → 81 | 12.01 s → 4.10 s | 0 → 0 | 2.00 MiB → 0.51 MiB | 12 → 13 |
| Project desktop | 100 → 100 | 0.53 s → 0.53 s | 0 → 0 | 0.35 MiB → 0.35 MiB | 7 → 7 |
| Project mobile | 96 → 96 | 2.56 s → 2.56 s | 0 → 0 | 0.35 MiB → 0.35 MiB | 8 → 7 |

Repository asset total changed from 196 files / 32,735,598 bytes to 255 files / 40,721,775 bytes because originals and 58 responsive derivatives are retained together. This on-disk increase buys much lower first-view transfer; it is not represented as a smaller deployment artifact.

The local unthrottled Playwright gate recorded six route/viewport cases with LCP 92–296 ms, CLS 0–0.0046, longest task 0 ms and synthetic click-to-two-animation-frames latency 7.2–7.6 ms. That latency is not INP. Real INP and field CWV require authorized post-deployment RUM/CrUX observation.

## Visual/function validation

- Routes: `/`, `/projects/`, `/om-oss/`, `/about/` against the live reference.
- Viewports: 1920×1080, 1440×1200, 1280×1000, 1024×900, 820×1180, 768×1024, 430×932, 390×844, 375×812 and 360×800.
- Final parity: 40 page/viewport pairs, zero page failures, four interaction scenarios, zero interaction failures and zero console rows.
- Final functionality: four local shell routes, 200 responses for all internal route checks, expected scroll heights, hover behavior and no console errors.
- Intrinsic dimensions remain in HTML. Deferred images are hidden until decoded and occupy the pre-existing fixed image containers, preventing broken-image paint and media layout shift.

## Commands and exact outcomes

- `node orchestration/status.mjs --json`: valid registry; S9 effective state `READY`; S1 and S7 `DONE`.
- `corepack pnpm run build`: PASS; 52 generated project pages, 56 indexable/sitemap URLs, international/semantic/project/image/link checks all passed.
- `corepack pnpm run check-functionality`: PASS; four local shell pages, expected route responses and zero console errors.
- `corepack pnpm run check-reference-parity`: PASS; 40 pairs and four interactions, zero failures/errors.
- `corepack pnpm run build:performance-assets`: PASS; 56 source entries and 58 deterministic WebP derivatives.
- Consecutive derivative generation: PASS; 59 files including manifest, identical aggregate SHA-256 `FC46780DAC3F7463D76771C71085DCE83B2C9774ECCFCC97EF4FA0F4D0853D9B`.
- `corepack pnpm run check-performance`: PASS; six local cases and zero LCP/CLS/long-task/synthetic-latency budget failures.
- Lighthouse baseline/final: PASS as evidence collection; raw JSON retained. Mobile throttled LCP target failures are explicitly reported above.

## Files changed and why

Source/runtime:

- `package.json`: adds the required S9 build/check commands; no dependency or lockfile change.
- `scripts/build-performance-assets.js`: deterministic overview/feature derivative generator.
- `scripts/check-performance.js`: asset integrity and local browser performance gate.
- `scripts/summarize-performance-evidence.js`: reproducible Lighthouse median summary.
- `public/wp-content/themes/esencial/css/styles.css`: suppresses duplicate backgrounds and hides deferred images until load.
- `public/wp-content/themes/esencial/scripts.js`: early priority, manifest selection and viewport-based loading.

Generated/shared:

- `public/assets/images/grid/`: 58 WebPs plus manifest; originals retained.
- `audit/seo-final/stage-1-parity-evidence.*`: regenerated final parity evidence; the functionality report was regenerated but remained byte-equivalent after Git normalization.
- `audit/performance/`: baseline/final Lighthouse JSON, summary and runtime evidence.

No core HTML, generated project HTML, sitemap, project content, Stage 7 manifest, lockfile, `vercel.json`, workflow or orchestration state file is changed.

## Residual risks and manual/external needs

- Mobile simulated Lighthouse LCP remains above 2.5 s for home/about and narrowly above it for the representative project page. The local recovery server does not compress text or model production CDN caching, but production improvement is not assumed; remeasure an authorized preview deployment before release.
- Home mobile first-view transfer is still 3.00 MiB, dominated by legitimately visible detailed drawings. Further reduction needs owner-approved quality/format trade-offs or an image service, followed by renewed parity review.
- Recovered jQuery and broad CSS remain render-blocking in the uncompressed lab. Removing or splitting them is higher-risk shared refactoring and was not justified by Stage 9's parity constraint.
- The new derivative URLs contain a source-path hash and are safe candidates for long immutable caching, but W0 should add/verify deployment headers centrally rather than marking stable legacy URLs immutable.
- Chromium was measured; Safari/Firefox decode/render behavior and field CWV remain release checks.

## Prohibited actions not taken and integration order

No merge, push, PR, deployment, DNS/hosting change, production access, external-account mutation or orchestration-state edit occurred. Recommended order: integrate after accepted S8/S10 only as coordinator scheduling requires, then run S9 acceptance/build/parity from the integration branch before S13. The local PASS commit subject is `SEO-S9 PASS: optimize responsive media delivery and add CWV gate`.
