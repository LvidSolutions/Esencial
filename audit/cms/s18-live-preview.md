# S18 live frontend preview and responsive layout guardrails

Status: PASS

- Lane: Esencial W3 / Worker C
- Branch: `codex/worker-c-s18`
- Starting and pre-commit HEAD: `7235840205326c453518fc30cabbed91ec5e003f`
- Registry baseline: `032bfeae23a2ec318d395bfc778d84cc542baa51`
- Completed locally: `2026-08-23T14:16:38.1774576+02:00`
- Required runtime: GPT-5.6 Sol / xhigh
- Original PASS commit: `5a2ba34831a299ebeff3c46d56eb74b0d6d51d87`
- Corrective fix commit: `2b17cd8f26d01fa3af5200c89e25e35321bac93b`
- Coordinator integration commits: `6a72dcd` (feature) and `5a0913b` (viewport re-handshake).

## Outcome

S18 replaces only the S16 `live-preview` extension slot with a versioned, protected frontend-renderer contract. The Studio surface now provides fixed desktop, tablet, mobile and small-mobile viewports; explicit draft, published and staging identity; real-time Sanity subscriptions with honest polling fallback; trusted renderer authentication state; and inline blocking diagnostics with route, field and corrective-action context.

The production site remains static and unchanged. A real preview requires a separate protected SSR/hybrid renderer at `SANITY_STUDIO_PREVIEW_ORIGIN`. The Studio never receives a Sanity read token, never emits a copyable draft URL, and never describes the deterministic local fixture as authenticated preview proof. When the origin is missing or invalid, the local fallback remains visibly unauthenticated and blocks editorial approval.

No public frontend file, image asset, image derivative, LCP behavior, crop, framing, compression setting, Sanity document, dataset, dependency, lockfile or orchestration state changed.

### Coordinator regression correction

W0 found that the original renderer-reset effect also depended on `viewportId`. A viewport selection updated the iframe width and height but did not guarantee a reload, while the child resize handler emitted diagnostics without repeating its ready message. That could leave a previously authenticated renderer stranded in `verifying`.

The corrective fix uses an explicit guarded viewport transition. In the same UI event it clears diagnostics, marks a configured renderer as `verifying`, selects the new viewport and keys the iframe by viewport identity. React therefore discards the previous child browsing context and creates a new iframe that must complete the exact-origin, exact-iframe ready handshake. Messages from the discarded iframe fail the existing `event.source` check. The general renderer-reset effect no longer depends on viewport identity, so no later passive effect can discard the fresh ready result.

`scripts/check-cms-layout.js` now deterministically asserts all four regression invariants: viewport controls use the guarded transition, stale diagnostics are cleared, verification is reset before selection, and the iframe is viewport-keyed for a guaranteed remount/re-handshake. Four negative source mutations remove each protection in turn and must be rejected by the same contract check.

W0 repeated the registered checks after S17/S18 composition. The integrated Windows worktree exposed a CRLF-only false failure in the negative source mutation; the DONE integration normalizes source line endings inside the test and labels every mutation, without changing preview behavior. Layout fixtures, TypeScript, lint, Studio build, 30 workspace safeguards, the full 56-page root build, image-quality validation and 40-pair/4-interaction reference parity then passed.

## Architecture and trust boundary

### Studio client

- `configuration.ts` accepts only an HTTPS origin or a loopback HTTP origin and rejects credentials, paths, query strings and fragments. The protected renderer route is fixed at `/__preview/render`; the standard draft-mode handshake is fixed at `/api/draft-mode/enable`.
- `LiveFrontendPreview.tsx` exposes `drafts`, `published` and `staging` as separate editorial identities. Its content query uses drafts only for the draft identity and published content for published/staging identity.
- Studio live reload uses the supported Sanity client `.listen()` API for project/home changes. If the subscription errors, the UI explicitly reports 15-second fallback polling instead of claiming a live connection.
- The configured renderer is accepted as authenticated only after a versioned ready message arrives from the exact configured origin, exact active iframe and matching route/perspective. Any absent, false or mismatched authentication state blocks review.
- Renderer issues are blocking and actionable. An edit intent can open the matching Sanity document/path; the iframe cannot write to Sanity.
- The iframe URL carries route, perspective, canonical document ID and a revision nonce only. It carries no read token, preview secret or content payload.

### Supported Sanity 6.10.1 integration

- `presentation.ts` uses `presentationTool`, `defineDocuments` and `defineLocations` from `sanity/presentation`.
- The Presentation plugin is registered only for a valid configured origin. It uses the standard `previewMode.enable` handshake and keeps `shareAccess: false`.
- `allowOrigins` is restricted to the one configured renderer origin.
- The Presentation plugin is appended after the existing `Arbetsyta`, preserving the S16 default workspace and native Studio escape routes.

### Server-only renderer contract

`preview/README.md` defines the S20 renderer requirements:

1. Validate `sanity-preview-secret` at `/api/draft-mode/enable` with `@sanity/preview-url-secret`, set a short-lived `HttpOnly; Secure; SameSite=None` perspective cookie, then redirect after removing secret query parameters.
2. Keep the Sanity draft read token in the renderer's server-only environment. Draft reads use `perspective: "drafts"` and `useCdn: false`; published/staging reads use published content.
3. Require the protected session before rendering, respond with `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`, restrictive CSP and an exact Studio `frame-ancestors` rule.
4. Render the real Esencial DOM, CSS, assets and image presentation for the requested route. Placeholders and the local fixture are not valid proof.
5. Inject the authenticated meta marker only after server-side session verification, and inject the versioned diagnostics script only into preview responses.

Primary implementation references consulted:

- Sanity Presentation Tool configuration: <https://www.sanity.io/docs/visual-editing/configuring-the-presentation-tool>
- Sanity draft-mode implementation: <https://www.sanity.io/docs/visual-editing/implementing-draft-mode>
- Sanity JavaScript client realtime listeners: <https://www.sanity.io/docs/apis-and-sdks/js-client-realtime>

## Responsive layout and diagnostics

The fixed renderer viewports are:

| Identity | Width × height |
| --- | ---: |
| Desktop | 1440 × 900 |
| Tablet | 768 × 1024 |
| Mobile | 390 × 844 |
| Small mobile | 320 × 568 |

The frame keeps the selected frontend viewport width and scales only its Studio presentation container. This makes breakpoint review deterministic without altering the frontend itself. The Studio controls reflow into a single column, preserve browser zoom, wrap content rather than truncating it and keep touch controls at least 44px high.

`preview/layout-diagnostics.js` evaluates the real preview DOM and emits seven blocking issue classes:

| Code | Evidence and editor guidance |
| --- | --- |
| `horizontal-scroll` | Compares document scroll/client width and identifies route/root remediation. |
| `text-overflow` | Detects scroll dimensions beyond the field box and identifies the instrumented field. |
| `clipping` | Detects intentionally clipped content and reports the affected field/action. |
| `overlap` | Checks opt-in sibling groups and reports both field contexts. |
| `missing-media` | Detects absent media source/asset and identifies the content path. |
| `broken-media` | Detects failed or zero-dimension media and identifies the content path. |
| `unsafe-line-length` | Measures readable text width against the rendered font and suggests narrowing the text measure, not truncating the copy. |

Messages include route, perspective, field, message, suggested action and optional document/path context. The script rechecks after resize, font readiness, DOM mutation and image load/error. Click-to-edit messages are sent only from instrumented preview nodes.

## Changed files and ownership

### Owned feature boundary

- `cms/studio/features/preview/LiveFrontendPreview.tsx`
- `cms/studio/features/preview/configuration.ts`
- `cms/studio/features/preview/contracts.ts`
- `cms/studio/features/preview/index.ts`
- `cms/studio/features/preview/liveFrontendPreview.css`
- `cms/studio/features/preview/presentation.ts`
- `preview/README.md`
- `preview/layout-diagnostics.js`
- `preview/fixtures/index.html`
- `preview/fixtures/fixture.css`
- `preview/fixtures/fixture-runtime.js`
- `scripts/check-cms-layout.js`
- `audit/cms/s18-live-preview.md`

### Essential shared composition

| Shared file | Essential reason | Public output reach |
| --- | --- | --- |
| `cms/studio/components/studioTools.tsx` | Replaces only S16's `live-preview` child with `LiveFrontendPreview`; preserves the slot ID, ordering, shell and safeguard vocabulary. | Studio only |
| `cms/studio/sanity.config.ts` | Conditionally appends the supported Presentation plugin after `Arbetsyta`. | Studio only |

S17 project/filter code, S19 analytics code, workspace shell code, theme code and `scripts/build-project-pages.js` are untouched.

## Deterministic fixture evidence

`scripts/check-cms-layout.js` starts a loopback-only fixture server, loads the diagnostics contract in Playwright and checks long Swedish and English content at 320, 390, 768, 1440 and 720px (1440px at 200%-equivalent reflow). Each of the 10 safe cases produced zero diagnostic issues and zero unexpected console errors. The deliberate failure matrix produced 8 issues covering all 7 blocking diagnostic classes, with route/field/action context and zero unexpected console errors.

The UI/UX review found that the first safe mobile fixture allowed arbitrary mid-word headline wrapping. The final fixture uses normal word boundaries with no hyphenation; no content is truncated and the deliberate unbroken-word failure remains isolated to its explicit negative fixture.

The in-app browser independently inspected:

- English safe fixture at 390 × 844: natural word-boundary wrapping, single-column header, no horizontal viewport escape and no warning/error console entries.
- Swedish safe fixture at 1440 × 900: readable text measure, stable hierarchy, no clipping and no warning/error console entries.
- Deliberate failure matrix at 390 × 844: visible clipping, unbroken overflow, unsafe measure, overlap, forced horizontal scroll and missing/broken media as expected.

The browser viewport override was reset, the tab was closed and the loopback server was stopped after capture. These local fixtures are test evidence only and are not authenticated staging evidence.

### Transient capture hashes

The generated captures were deliberately excluded from the commit. `work/` is a reproducible intermediate area, the acceptance command regenerates every file, and committing binary fixtures would add review noise without strengthening the source contract. Their hashes are recorded here before removing the exact `work/s18-layout-evidence` directory so the final worktree remains clean.

| Capture | Bytes | SHA-256 |
| --- | ---: | --- |
| `long-sv--mobile-320.png` | 25,588 | `df43533f219cce2edf9cdf37d5a112c052946d6351e8bd20b34956817354af91` |
| `long-sv--mobile-390.png` | 27,316 | `153ac02d76ceaaa5b6df12b0dd094d0e4a94b368a31e7499020666234f46ebad` |
| `long-sv--tablet-768.png` | 47,510 | `5c75a56372c5891c97e817f5b6e96235d433b0d906ff5d631299b2e83690bd1d` |
| `long-sv--desktop-1440.png` | 86,657 | `96b0c393ae2c7cf523369fa19460031217a1aa1318cca9825ff1c0132426e728` |
| `long-sv--reflow-200pct-equivalent.png` | 41,816 | `be7f53e6e4129cce26957e3427ade1e54b39d21d56c2c62f7f6b6aa9fcd0d840` |
| `long-en--mobile-320.png` | 27,362 | `8e6e33b745a6b29ae1ddfac8c30baa99fd984efaef574960a8f2364e92ec5f8e` |
| `long-en--mobile-390.png` | 29,122 | `bfc572b62f2602dbccd12475dafb0777aa893c4899d4846a528c4df94db6ed21` |
| `long-en--tablet-768.png` | 52,189 | `c6ea797cf7178c4039994487221388c12d002e304dad3e91c9cd109f3e2f0cde` |
| `long-en--desktop-1440.png` | 97,299 | `b50fee3fb59417106545fcfdfd781da5c9515a41bf2c11c79c33d6dff3af91c5` |
| `long-en--reflow-200pct-equivalent.png` | 48,344 | `61a668ae00b6b264badaa256398c1d931f53e44de0f9103ed9aca89c9c6759db` |
| `failure-matrix--mobile-390.png` | 21,917 | `8db4c2c5f0b6db48b05126b4a8a92b4a228e06e4d5075a5ffe2414d87b6ba46b` |

## Validation

| Command / review | Result |
| --- | --- |
| `git branch --show-current` / `git rev-parse HEAD` | PASS — `codex/worker-c-s18` started at `7235840205326c453518fc30cabbed91ec5e003f`; original PASS commit preserved at `5a2ba34831a299ebeff3c46d56eb74b0d6d51d87`; corrective work began from a clean tree. |
| `node orchestration/status.mjs --json` | PASS — registry valid; exactly S17, S18 and S19 effective READY; zero errors/warnings. |
| `node --test orchestration/status.test.mjs` | PASS — 11/11. |
| `node scripts/check-cms-layout.js --evidence-dir work/s18-layout-evidence` | PASS — 10 long-copy viewport cases; 7/7 diagnostic classes; zero unexpected console errors; 11 captures recorded above. |
| `node scripts/check-cms-layout.js` | PASS — viewport renderer re-handshake contract including four rejected regression mutations, 10 long-copy viewport cases, 7/7 diagnostic classes and zero unexpected console errors. |
| `npx tsc --noEmit` in `cms/studio` | PASS. |
| `npx eslint . --max-warnings=0` in `cms/studio` | PASS with zero warnings. |
| `npm --prefix cms/studio run build` | PASS — Sanity Studio build completed. |
| `corepack pnpm run check-studio-workspace` | PASS — all 30 schema/workspace/export safeguards; no direct canonical mutation or browser secret exposure. |
| `corepack pnpm run build` | PASS — 56 pages; SEO, international SEO, structured data, semantics, project architecture, internal links and analytics safeguards all pass. |
| Integrated root image-quality gate | PASS — 78 derivatives keep uncropped framing; 51 photos meet SSIM ≥ 0.975 (worst 0.9756); 27 drawing derivatives are lossless. |
| `corepack pnpm run check-reference-parity` | PASS — 40 page/viewport pairs and 4 interaction scenarios; zero geometry, style, structure, console or interaction mismatch. |
| `git diff --name-only -- public` / `git diff --raw -- public` | PASS — no public content or object-hash diff after the root build. |
| Browser/Playwright responsive review | PASS for deterministic fixtures; authenticated Studio/staging review remains the explicit human blocker below. |
| UI/UX Pro Max checklist | PASS — wrapping over truncation, zoom/reflow, touch targets, readable line measure and no safe-fixture horizontal scroll. The packaged search-script pointer was unavailable, so the complete priority checklist was applied manually. |
| React best-practices review | PASS — direct internal imports, stable hooks, memoized configuration, cleaned subscriptions/timers, no new async waterfall or broad barrel import. |
| `git diff --check` | PASS. |
| Scope and secret scans | PASS — only owned paths plus the two authorized Studio composition files and this audit; no `.env`, credential material, token value, private key or public/image file staged. |

The root commands report Node `v24.16.0` while `package.json` requests Node `22.x`. Every gate passed; this is an environment warning, not an S18 code failure.

## Authenticated human/staging blocker

Authenticated Sanity preview cannot be certified locally without all of the following external state: an authorized editor session, a configured protected HTTPS renderer origin, a server-only Sanity read token in that renderer, and the renderer's validated preview cookie handshake. None was created, copied or invoked in S18.

Therefore the following remains a required human/staging acceptance step and is not represented as complete by fixture evidence:

1. An authorized editor opens `Arbetsyta` and the Presentation tool against the protected staging origin.
2. Confirm the renderer reports `Skyddad session verifierad` for draft, published and staging identities on `/`, `/projects/` and representative bilingual project routes.
3. Edit representative fields and verify subscription-driven refresh, route/perspective identity and click-to-edit intent.
4. Repeat desktop, tablet, 390px, 320px and 200% zoom/reflow review with real long Swedish/English content.
5. Confirm zero layout diagnostics, no copyable draft URL, no token/secret in URL/HTML/logs, and correct noindex/no-store/CSP/frame-ancestor headers.

Until that check passes, the UI must continue to display review as blocked. The local fallback and deterministic fixture must never be relabelled as authenticated preview.

## Risks and S20 integration contract

1. S20 must implement or connect the protected SSR/hybrid renderer. S18 deliberately supplies the client/renderer contract and diagnostics, not a production or staging deployment.
2. S20 must reuse the exact public templates, CSS, assets and image rendering. It must not change typography, spacing, responsive identity, LCP selection, image compression, crop or framing to satisfy preview.
3. Preview instrumentation must be injected into protected preview responses only. No diagnostics script, editor data attributes, preview cookie or noindex behavior may leak into the production static build.
4. Renderer authentication must be determined server-side. Studio must continue to trust only exact-origin, exact-iframe, versioned messages and must never infer authentication from a reachable URL.
5. The staging identity intentionally uses published content while remaining a distinct renderer/build identity. S20 must keep that distinction explicit and must not merge local drafts into staging.
6. S17 integration must preserve project route/document context; S19 integration must not place provider credentials or analytics payloads in the preview frame.
7. After integrating S17/S18/S19, S20 must rerun all 30 Studio safeguards, TypeScript, lint, Studio build, the exact layout gate, full root build, 40-pair parity, four interactions and the public image-quality gate.
8. Any shared-generator or public-output change in S20 requires a new exact public parity/image-quality proof. No such change exists in S18.

## Prohibited actions not taken

No reset, clean, checkout, stash, worktree recreation, fast-forward, merge, rebase, branch switch, orchestration edit, `.env` or token copy, Sanity mutation/migration/import, authenticated query, provider activation, deploy, push, PR, DNS/hosting change, image processing, external mutation or production action occurred.
