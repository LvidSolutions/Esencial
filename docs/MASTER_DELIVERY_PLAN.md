# Esencial: Master Delivery Plan

**Purpose:** a complete, implementation-ready handover plan for completing the visual CMS, staging, publishing, analytics, testing, and later production launch.

**How to use this after `/kompakt`:** treat each stage as an independent work package. Start only when the previous stage's acceptance criteria pass. Each stage states the repository work that can be implemented by Codex and the account-side work that requires an authorised human. No live-domain, DNS, or current-hosting change belongs before Stage 9.

## Product definition

The finished product is a single-person website workspace, not a generic CMS form:

```text
Left, dominant workspace                 Right, adaptive preview
-------------------------------------    ---------------------------------
Project text and SEO                     Exact project or homepage layout
Hero-image drop zone                     Updates from the current draft
Gallery drop zone and drag order         Desktop, tablet and mobile widths
Floor-plan drop zone                     Swedish and English route switch
Publish checks and one clear action      Click an item to edit its source

Small separate dashboard: traffic, returning visitors, Search Console growth,
publication health, and only actionable warnings.
```

There are two intentionally different previews:

1. **Live draft preview** is the right-hand CMS panel. It is protected and may show unsaved content; it never becomes public or indexable.
2. **Staging** is the real static website produced by the same build pipeline as launch. It is where the editor approves the complete output before production.

## Locked technical decisions

| Area | Decision |
| --- | --- |
| Content | Existing Sanity project `g6xm8j7l`, dataset `production` |
| Everyday users | One web editor; no separate reviewer, publisher, or administrator workflow |
| Public website | Static HTML generated from Sanity, retained for speed and SEO |
| Staging | A new, separate Vercel project named `esencial-staging`, importing `LvidSolutions/Esencial`, branch `main` |
| Visual CMS preview | Protected Sanity Presentation-style workspace backed by a Vercel preview runtime; it shares render rules with the static builder |
| Publishing | Sanity webhook -> GitHub Actions quality gate -> `main` -> Vercel staging deploy |
| Analytics | Matomo Cloud + Cookiebot for consent; Google Search Console for organic search data |
| Backend | Sanity, GitHub Actions, and small Vercel Functions only. No custom database, login system, or application server |
| Production switch | A separate, written approval after staging/pilot; never part of normal CMS publishing |

## Current baseline

Already in `main`:

- Separated hero image, gallery, and floor-plan content fields, including drag ordering, alt text, credit, and rights confirmation.
- Homepage featured-project ordering, project quality validation, static build, SEO checks, sitemap, and empty-export protection.
- A basic Studio preview tool and a compact analytics dashboard shell.
- Vercel build configuration, protected aggregate analytics endpoint, Matomo/Cookiebot injection support, environment-variable template, and staging/analytics documentation.
- Single-editor status labels: **Under arbete**, **Klar att publicera**, and **Publicerad**.

Not yet complete:

- A right-hand preview that updates from unsaved edits while the editor works.
- Visual drop zones integrated into a dominant editing workspace.
- A connected Vercel staging project, webhook, secrets, Matomo, Cookiebot, and Search Console.
- Browser-based Studio/staging end-to-end tests and a completed editorial pilot.

## Universal safety rules

- Never put a secret in Git, Sanity content, a Studio environment variable, browser JavaScript, a screenshot, or a chat message.
- Keep the current live domain and DNS untouched until Stage 9.
- Use a read-only Sanity token for static CMS builds; use a separate preview-only token for draft preview.
- Keep production and staging analytics/cookie configurations separate.
- Never make a failed CMS validation overwrite staging. The existing build must remain atomic.
- Keep unrelated local changes out of commits: `audit/crawl-state.json`, `audit/discovered-urls.md`, and the three `public/**/ESENCIAL%20%7C%20PROJEKT/` export directories.

---

## Stage 0 — Governance and clean working baseline

**Goal:** make ownership, recovery, and scope clear before adding accounts or new behaviour.

### Repository work

- Add a one-page operational ownership record: GitHub organisation, Sanity project, Vercel team, domain registrar, Matomo, Cookiebot, Search Console, and password-manager location.
- Add an explicit `CODEOWNERS` or equivalent only if the owner wants GitHub review rules. Do not add mandatory approval gates for the one-person publishing flow.
- Record the exact rollback procedure for GitHub, Vercel, and Sanity content.
- Keep the master plan and existing staging/analytics guides cross-linked.

### Manual work required

1. Choose the long-term owner for each external account. The temporary developer Vercel account may own staging now; the Esencial-owned account should own production later.
2. Store recovery codes, billing ownership, and API-token rotation dates in the chosen password manager.
3. Decide whether the known unrelated crawl/export files should be retained or removed in a separate cleanup task. Do not mix that decision with CMS work.

### Acceptance criteria

- `main` is green and all future account owners are known.
- A new developer can identify every account and rollback path without asking for private credentials.

### If blocked

This stage needs no CLI. Do not proceed to account provisioning until ownership is documented; otherwise the finished system remains personally owned and difficult to transfer.

---

## Stage 1 — Isolated Vercel staging

**Goal:** give the replacement site a real URL without changing the live site.

### Repository work

- Verify `vercel.json`, `npm run build`, and `/api/analytics` on a Vercel build.
- Add a lightweight deployment health/checklist page or Studio link only after a real staging URL exists.
- Keep `main` as the staging project's production branch. Other branches/PRs receive Vercel preview URLs.

### Manual work required in Vercel

1. Sign in to the existing personal Vercel account or the future Esencial team.
2. Select **Add New → Project → Import Git Repository**.
3. Import `LvidSolutions/Esencial`; do not fork or duplicate the repository.
4. Name the new project `esencial-staging`.
5. Set **Production Branch** to `main`.
6. Confirm Vercel detects `npm run build` and output directory `public` from `vercel.json`.
7. Deploy without attaching `esencial.se`, without importing its DNS, and without changing the existing Vercel project.
8. Record the resulting `https://<project>.vercel.app` URL in the password manager and operational record.

### Optional CLI route

After the owner completes Vercel's device login, run from the repository root:

```powershell
npx vercel@latest login
npx vercel@latest link --yes --project esencial-staging --scope <team-slug>
npx vercel@latest inspect <staging-url>
```

The login is interactive by design. A command that waits for browser approval is not a Codex failure; complete the device-flow prompt in the browser, then rerun the command.

### Acceptance criteria

- A `main` deploy is `READY` at the new Vercel URL.
- Homepage, project routes, `/sitemap.xml`, language links, and `/api/analytics?days=30` respond.
- The old live site and domain have not changed.

### If blocked

No Vercel session, team permission, or GitHub-repository access means Codex can prepare code only. The account owner must import the project in the Vercel dashboard or complete `vercel login`; never share a personal access token in chat.

---

## Stage 2 — Safe CMS-to-staging publishing

**Goal:** make a valid Sanity publish update staging automatically, while invalid content leaves staging unchanged.

### Repository work

- Add visible build-status feedback to Studio: last successful build, current state, and a concise failure next step.
- Make the GitHub workflow write a human-readable summary of the validated project count, build commit, and failure reason.
- Add a test fixture or controlled test mode for the three failure cases: no published projects, missing translation, and incomplete visible image metadata.
- Keep the existing concurrency lock so two publishes cannot race.

### Manual work required in Sanity and GitHub

1. In Sanity, create a token with read access only for the production dataset. Do not reuse a write token.
2. In GitHub repository settings, add it as the `SANITY_API_TOKEN` Actions secret.
3. Create a fine-grained GitHub token or GitHub App credential limited to dispatching events for `LvidSolutions/Esencial`.
4. In Sanity **Settings → API → Webhooks**, create a webhook:
   - URL: `https://api.github.com/repos/LvidSolutions/Esencial/dispatches`
   - Event: publish/update of the content documents used by the build
   - Header: `Accept: application/vnd.github+json`
   - Header: `Authorization: Bearer <dispatch-token>`
   - Body: `{"event_type":"sanity-published"}`
5. Send one webhook test and check the `CMS staging build` GitHub Action.

### Acceptance criteria

- A valid published test project changes staging after the GitHub Action succeeds.
- Each deliberate invalid case fails before `git push` and staging stays on the previous Vercel deployment.
- A web editor receives an understandable failure instruction, not a raw stack trace.

### If blocked

Webhook creation and GitHub secrets require account administration. Do not emulate them with hard-coded tokens or a public endpoint. Codex can implement the status UI and tests while waiting.

---

## Stage 3 — Shared rendering foundation for an exact preview

**Goal:** prevent the CMS preview from becoming a visual approximation that drifts from the public website.

### Repository work

- Extract the project page, image, gallery, floor-plan, and homepage presentation rules from `scripts/build-project-pages.js` into shared renderer modules.
- Make the static builder consume those modules unchanged.
- Create a protected Vercel preview runtime that renders the same modules from draft data, with no public-cache headers and `X-Robots-Tag: noindex, nofollow`.
- Add a narrow preview API that receives only the selected document/route and never returns a broad export of drafts.
- Add visual regression fixtures for hero image, gallery order, hidden gallery image, floor plan, long title, mobile crop, Swedish, and English.

### Security design

- Static staging reads published Sanity content only.
- Draft preview uses a separate `SANITY_PREVIEW_TOKEN` with viewer-level access and a separate `DRAFT_PREVIEW_SECRET`.
- The token is server-side only. The initial Studio-to-preview handshake creates a short-lived, HttpOnly preview session; it is not a reusable public URL.
- Preview routes reject absent/expired sessions, emit `noindex`, and are not linked from the public site or sitemap.

### Manual work required

1. In Sanity, create the separate preview token with the least privilege that can read drafts; record its purpose and expiry owner.
2. Add `SANITY_PREVIEW_TOKEN` and `DRAFT_PREVIEW_SECRET` as sensitive environment variables in **Vercel staging only**.
3. In Sanity project API settings, add the exact staging/preview origin to the CORS allow-list only if browser-side preview functionality requires it. Do not enable credentials unless the implementation explicitly requires them.

### Acceptance criteria

- Given the same content, static staging and preview match in route, ordering, typography, images, metadata, and responsive layout.
- An unauthenticated browser cannot open a draft preview.
- Preview pages are absent from sitemap/robots and cannot be indexed.

### If blocked

This stage can be coded without a Vercel login, but it cannot be safely validated without staging secrets and a real origin. Do not replace the static public site with a full dynamic app merely to obtain preview; the protected preview runtime is deliberately a separate surface.

---

## Stage 4 — Dominant visual editing workspace

**Goal:** deliver the exact right-hand, live-updating editor experience requested for everyday use.

### Repository work

- Add a Studio tool named **Arbetsyta** as the default project editing entry point.
- Use a two-column layout: large structured editing form on the left and a sticky responsive preview on the right.
- Update the preview from the current unsaved Sanity draft using debounced patches; do not require Publish, Save, or a static rebuild to see a text/image change.
- Add desktop, tablet, and mobile width controls; project/homepage mode; Swedish/English switch; and an obvious “open real staging” action.
- Make preview elements click-to-edit: hero image -> `heroImage`, gallery item -> its array item, floor plan -> `floorPlans[index]`, heading/body/SEO -> corresponding field.
- Preserve the existing `Sidförhandsvisning` during migration, then retire it only after the new workspace passes the pilot.

### Content editing layout

1. **Project facts and text:** title, place, year, summary, body, Swedish/English connection, search title, and search description.
2. **Hero image:** one large labelled drop zone: “Project card and page hero.” Require alt text, credit, rights, hotspot, and preview crop.
3. **Gallery:** a clear multi-image drop zone with thumbnail cards, drag ordering, visible/hidden state, caption, and deletion confirmation. First visible item has an explicit placement label.
4. **Floor plans:** a visually separate drop zone, never mixed into gallery, with plan name/type/area and its own preview section.
5. **Homepage:** featured projects in independently draggable order, showing the actual project-card image and placement number.
6. **Publish panel:** compact checklist, validation results, status selector, last build state, and one unambiguous staging action.

### Manual work required

1. Add the staging preview origin in Sanity's CORS settings when the implementation identifies the exact required origin.
2. After code is ready, deploy Studio so the public Studio URL receives the new workspace:

```powershell
Set-Location 'C:\Users\andreas.hiller\Desktop\Lucas Lvid solutions\Esencial\cms\studio'
$env:SANITY_STUDIO_ANALYTICS_ENDPOINT = 'https://<staging-url>/api/analytics'
npm run build
npm run deploy
```

3. Complete Sanity's browser/device login if prompted. The environment variable is public configuration; do not place any preview or analytics secret in it.

### Acceptance criteria

- Editing text or moving an image visibly updates the right panel without publishing.
- A web editor can identify exactly where a hero image, gallery image, and floor plan will appear.
- Mobile preview catches crop/order issues before staging.
- The editor can complete a representative project without opening raw document JSON or a developer tool.

### If blocked

The custom workspace can be implemented locally. Final verification requires an authenticated Sanity Studio deploy and the protected staging preview from Stage 3. If either is unavailable, keep the current preview tool in place and do not claim “exact live preview” is complete.

---

## Stage 5 — Compact traffic and SEO dashboard

**Goal:** show a small, trustworthy dashboard, not a second analytics product.

### Repository work

- Keep `Webbplatsens utveckling` compact: visits, unique visitors, returning visitors, page views, organic clicks, impressions, CTR, average position, top pages, and top queries.
- Show 7/30/90 day ranges and comparison with the previous equal period.
- Add clear source labels and the limitation that returning visitors means consented visitors only.
- Improve empty/error states: “not connected,” “waiting for Search Console data,” and “source unavailable” must never look like zero traffic.
- Add API tests for Matomo success/error, Search Console success/error, origin handling, and no secret leakage.

### Manual work required

1. Create a separate Matomo Cloud site for the staging URL; do not reuse live reporting during testing.
2. Configure Cookiebot for the same staging URL and categorise Matomo as statistics.
3. Create a read-only Matomo reporting token.
4. Create a Google service account with only `webmasters.readonly`, then grant that account read access to the relevant Search Console property.
5. In Vercel staging, enter the variables from `.env.example` as encrypted environment variables:
   - `MATOMO_TRACKER_URL`, `MATOMO_SITE_ID`, `COOKIEBOT_CBID` (public static tracking configuration)
   - `MATOMO_URL`, `MATOMO_API_TOKEN` (server-only Matomo reporting)
   - `CMS_ORIGIN`
   - `GOOGLE_SEARCH_CONSOLE_SITE_URL`, `GOOGLE_SERVICE_ACCOUNT_JSON` (server-only)
6. Redeploy staging and redeploy Studio with `SANITY_STUDIO_ANALYTICS_ENDPOINT` set to the staging API URL.
7. Test both consent choices: reject must make no Matomo request; accept must register one visit.

### Acceptance criteria

- The dashboard shows real aggregated staging data once available and never example values.
- Returning-visitor reporting is clearly consent-limited.
- No token appears in browser developer tools, Git history, Vercel build logs, or Studio content.

### If blocked

Matomo, Cookiebot, Search Console ownership, and legal wording are external decisions. The dashboard should remain intentionally empty until they exist; do not substitute Google Analytics, a personal token, or fictional data.

---

## Stage 6 — Automated verification and quality gates

**Goal:** prove that the CMS experience and staged website work before a human sees a regression.

### Repository work

- Add Playwright tests for Studio workspace navigation, text updates, image drop-zone labelling, gallery reordering, floor-plan separation, click-to-edit, responsive controls, and validation messages.
- Add Playwright staging tests for home, project, language, sitemap, canonical, hreflang, structured data, cookie accept/reject, and noindex preview.
- Add screenshot comparison for representative desktop and mobile project pages.
- Run the existing build, CMS validation, SEO, and link checks in CI on every relevant change.
- Run the CMS webhook failure cases as controlled integration tests.

### Manual work required

1. Create a non-personal Sanity test/editor account or a secure test session usable by Playwright; do not automate with the owner's primary credentials.
2. Allow the exact local/CI origin in Sanity CORS only for the test environment, then remove it if the test infrastructure changes.
3. Add any test secrets only to GitHub Actions/Vercel secrets, scoped to test/staging and never production.

### Acceptance criteria

- All automated tests pass on a representative staging deployment.
- A failing image/translation/SEO rule blocks the publish flow predictably.
- The visual preview and generated site match on the defined test fixtures.

### If blocked

Authenticated browser automation cannot be completed safely from an unauthorised local browser session. Implement all unauthenticated tests first; the account owner then supplies a dedicated test user/session through the approved secret store.

---

## Stage 7 — Editorial pilot and simplification pass

**Goal:** prove that one person can operate the CMS unaided.

### Repository work

- Fix pilot findings only when they remove repeated confusion or publishing risk.
- Add inline Swedish help where the pilot shows hesitation; avoid adding a separate training workflow or administrative fields.
- Produce a one-page “update a project” guide and a short rollback guide from the actual tested flow.

### Manual work required

1. Select three projects: one image-heavy, one with floor plans, and one Swedish/English pair.
2. Verify image rights before upload.
3. Have the intended web editor complete the flow alone: edit, preview desktop/mobile, publish to staging, inspect staging, and recover from one intentional validation failure.
4. Record only friction that occurred during the task, not speculative feature requests.

### Acceptance criteria

- The editor can finish all three examples without developer intervention.
- The editor understands image placement, floor-plan separation, warnings, staging, and the meaning of every dashboard metric.
- No critical error is found in desktop/mobile preview or staged output.

### If blocked

Do not start production migration without a real editor pilot. A developer successfully demonstrating the workflow is not evidence that the intended one-person editor can use it.

---

## Stage 8 — Production readiness review

**Goal:** make a go/no-go decision with evidence, without yet changing the live domain.

### Repository work

- Run full build and test suite from the launch commit.
- Freeze a release tag and record the exact Vercel deployment URL to promote/roll back to.
- Generate URL comparison, redirect map, sitemap check, metadata/hreflang report, accessibility baseline, and cookie-consent check.
- Verify public assets, image optimisation, 404 page, contact links, and legal/cookie links.

### Manual work required

1. Owner approves content, image rights, legal/cookie wording, and analytics collection.
2. Owner verifies domain registrar and DNS access plus the old-hosting rollback route.
3. Add production-scoped Vercel variables separately; never copy a staging secret blindly if a provider requires a production site ID/domain.
4. Obtain written permission to alter the live domain only after all checks pass.

### Acceptance criteria

- A documented release/rollback pair exists.
- Every priority URL has an intended destination and noindex preview cannot leak.
- The owner gives explicit written launch approval.

### If blocked

This is an approval gate, not a coding problem. Keep staging active and do not attach the real domain without written authorisation.

---

## Stage 9 — Production cutover and monitored rollback window

**Goal:** replace the live site safely, once and only once approved.

### Manual work required

1. Freeze content changes for the cutover window.
2. In the Esencial-owned Vercel team, import or transfer the final project if staging was built in a personal account. Importing the same GitHub repository and branch is sufficient; deployment history does not need to transfer.
3. Add production environment variables and create production Matomo/Cookiebot configuration for the real domain.
4. Attach the real domain to the approved Vercel project and make the required DNS change at the registrar.
5. Immediately test core routes, cookies, analytics call suppression before consent, language links, sitemap, and Search Console ownership.
6. If a critical fault appears, use Vercel **Promote**/rollback or restore the prior hosting/DNS route documented in Stage 8.

### Repository work

- Provide launch-day verification script/checklist and a short incident log template.
- Do not commit DNS credentials, production tokens, or domain configuration.

### Acceptance criteria

- The real domain serves the approved release.
- Search Console sitemap submission and monitoring are active.
- No critical regression remains during the agreed rollback window.

### If blocked

DNS and domain actions need the domain owner's authority. Codex should stop at the checklist and wait rather than guessing registrar settings.

---

## Stage 10 — Handover and sustainable operation

**Goal:** make the system independent of the developer's personal account and memory.

### Repository work

- Finalise editor guide, staging guide, analytics guide, operations record, and incident/rollback runbook.
- Add a quarterly reminder list: update dependencies, review users/tokens, inspect Vercel/Matomo billing, check Search Console coverage, and test a rollback.
- Remove unused temporary preview URLs/tokens/test users after the handover.

### Manual work required

1. Transfer or recreate Vercel, Matomo, Cookiebot, Search Console, GitHub, and Sanity access under Esencial ownership.
2. Rotate developer-created tokens after transfer.
3. Confirm the editor has a password-manager entry and can make one staging-only update alone.

### Acceptance criteria

- The owner, not a personal developer account, controls every production service.
- The editor can update content and read the dashboard; the owner can roll back without developer help.

## Required secret inventory

| Secret/configuration | Used by | Environment | Owner action |
| --- | --- | --- | --- |
| `SANITY_API_TOKEN` | GitHub CMS build | GitHub Actions | Create read-only token |
| GitHub dispatch token | Sanity webhook | Sanity only | Create least-privilege dispatch credential |
| `SANITY_PREVIEW_TOKEN` | Protected preview runtime | Vercel staging/production | Create separate draft viewer token |
| `DRAFT_PREVIEW_SECRET` | Preview session handshake | Vercel staging/production | Generate high-entropy secret |
| `MATOMO_API_TOKEN` | Analytics proxy | Vercel staging/production | Create read-only token |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Search Console proxy | Vercel staging/production | Create/read-only service account |
| `SANITY_STUDIO_ANALYTICS_ENDPOINT` | Built Studio | Studio build | Set to the relevant Vercel API URL; not a secret |

## Default implementation order after this plan

1. Stage 1: create the separate Vercel staging project.
2. Stage 2: connect the existing CMS build webhook and prove the failure safety cases.
3. Stage 3 and 4: build the shared renderer and dominant visual workspace. This is the primary remaining product feature.
4. Stage 5 and 6: connect real analytics and automate verification.
5. Stage 7: run the one-person editorial pilot.
6. Stages 8–10 only after explicit launch approval.

## Out of scope unless a new need is approved

- A custom database, user accounts, customer portal, CRM, ecommerce, or a bespoke backend.
- Public draft preview, draft indexing, or unsafely exposing Sanity tokens.
- Replacing the static public site with a full dynamic application merely for CMS convenience.
- Moving the current live domain, DNS, or hosting before Stage 9.
