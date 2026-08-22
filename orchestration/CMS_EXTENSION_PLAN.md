# Esencial CMS extension — S15–S22

## Outcome

After the SEO plan passes S14, build one calm, vertically scrolling Sanity `Arbetsyta` that feels like Esencial's frontend. It must let an editor create and organize projects, see real draft changes at representative viewports, detect layout risk before publication, and understand traffic without exposing secrets or loading non-essential tracking before consent.

The existing frontend remains the visual contract. This is an editorial interface improvement, not a public redesign. No production content write, Studio deploy, analytics activation, DNS change or legal sign-off is included.

## Sanity access gate

1. Create a project-scoped robot token for project `g6xm8j7l`, role `Editor`, preferably expiring in 30–90 days.
2. Store it only in ignored root `.env.local` as `SANITY_API_TOKEN`. Use `SANITY_PROJECT_ID=g6xm8j7l` and `SANITY_DATASET=production` for read-only verification.
3. S15 may query project metadata/content to prove access but may not mutate documents, datasets, roles or deployments.
4. If write testing becomes necessary, W0 must first create/approve a separate development dataset and record its rollback. Production remains read-only.
5. Revoke or rotate the robot token after the work or at expiry. Never use or reveal a personal token.

## Product contract

### One workspace

- One top-level `Arbetsyta`; sections flow downward in this order: status, project editor, project ordering/filters, live preview, layout warnings, statistics, publishing readiness.
- Wide screens may use editor + sticky preview columns inside a section; narrow screens stack in the same reading order.
- Reuse frontend typography, monochrome palette, spacing rhythm, image treatment and restrained motion. Studio controls remain keyboard-accessible and clearly labelled in Swedish.

### Projects, headings and filters

- Create Swedish/English projects with explicit translation relationship, stable slug, title, summary/body, facts, SEO and separated hero/gallery/floor-plan media.
- A filter category has Swedish/English label, stable key, order, visibility and an explicit project selector. Preview shows the resulting grid before publication.
- Navbar and grid use the same published filter source. Empty, duplicate or orphaned categories fail validation. Workers implement the system but do not invent category names or memberships.

### Real preview and text safety

- Prefer Sanity Presentation/Visual Editing connected to the real frontend renderer: draft/published perspective, live update, route resolution, desktop/tablet/mobile and click-to-edit.
- Keep a deterministic local fixture fallback when authenticated preview is unavailable.
- Test real rendered DOM for horizontal overflow, clipping, overlap, occluded controls, unexpected line count and layout shift at agreed breakpoints. Character counters are guidance only.
- Unsafe content produces a visible field/preview warning and blocks review/publish. Do not hide the problem through arbitrary truncation. Provide editorial guidance and safe component behavior for long unbroken text.

### Statistics and consent

- Show only real aggregated data from the provider selected in the current implementation plan; include period, source, freshness, comparison and honest empty/error states. Secrets stay behind `api/analytics.js`.
- Non-essential analytics is disabled until informed consent. The first layer gives equally easy accept/reject choices, explains purposes, and links to details. A persistent control lets visitors change or withdraw consent.
- Swedish and English consent copy, provider list, storage duration and controller/privacy information require owner/legal approval. Automated checks verify behavior, not legal sufficiency.

## Stages and parallelism

| Stage | Owner | Gate | Result |
| --- | --- | --- | --- |
| S15 | W0 | S14 + token | Read-only access proof and safe-dataset decision |
| S16 | W1 | S15 | Frontend-aligned design system, modular single-workspace shell |
| S17 | W2 | S16 | Project editor, bilingual filter taxonomy, navbar/grid contract |
| S18 | W3 | S16 | Real live preview, responsive modes and layout diagnostics |
| S19 | W4 | S11 + S15 + S16 | Aggregated statistics and consent/privacy controls |
| S20 | W4 | S17–S19 | Shared integration and end-to-end synchronization |
| S21 | W1 | S20 | Editorial usability, accessibility, hostile-content QA and guide |
| S22 | W0 | S21 | Clean full validation, evidence and human acceptance checklist |

S17, S18 and S19 are the only new implementation stages designed to run simultaneously. Their owned paths are separated in `stages.json`; W0 resolves shared hotspots after isolated PASS handoffs.

## Release-quality gates

- Studio and frontend clean builds; deterministic output and secret scan.
- Playwright coverage for create/edit/filter/order/preview/consent flows at desktop and mobile.
- No serious known accessibility, privacy, security, content-integrity or visual-parity defect.
- Drafts cannot become public accidentally; filter changes cannot break canonical project URLs.
- Rejecting consent produces no analytics request or non-essential storage; withdrawal takes effect.
- Final human review covers category naming, analytics provider/account, privacy text, retention, controller details and production authorization.

Primary implementation references: [Sanity robot tokens](https://www.sanity.io/docs/content-lake/http-auth), [Sanity preview and page building](https://www.sanity.io/docs/user-guides/preview-and-page-building), [PTS cookie-consent findings](https://pts.se/contentassets/7b02c828f0984bfba1d1614dc666ab1a/underrattelse-folkhalsomyndigheten-kaktillsyn.pdf), and [IMY cookie-data decision](https://www.imy.se/globalassets/dokument/beslut/2025/tillsynsbeslut-aller-media-ab.pdf).
