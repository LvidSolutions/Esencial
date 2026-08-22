# S16 CMS visual system and single-workspace architecture

Status: PASS

- Branch: `codex/worker-a-s16`
- Starting S16 commit: `f1e365b1e0ccd52640409f2217cd67c7535d0e52`
- Coordinator ref observed during preflight: `ec8ca06a12b601eb02e0b32a8f1560bd079a8545`
- Registry baseline: `032bfeae23a2ec318d395bfc778d84cc542baa51`
- Completed locally: `2026-08-22T23:08:51+02:00`
- Required runtime: GPT-5.6 Sol / xhigh

## Outcome

S16 provides one calm, vertically flowing `Arbetsyta` as the first Studio tool. It uses a Sanity-supported theme, scoped visual tokens and three stable extension slots for Projects & Filters, Live Preview, and Analytics & Consent. Native Dashboard and Structure remain available as advanced escape routes, so the new daily workspace does not replace or override Sanity's document validation and publication behavior.

The existing S12 safety model is unchanged: reads use the drafts perspective with CDN caching disabled, workspace writes go through the draft helper, final publication remains in Sanity's validated document view, and no canonical document mutation or browser-delivered secret was added.

No dependency, schema, dataset, orchestration state, public frontend, image, generated public page or lockfile changed.

## Architecture

### Theme and tokens

- `cms/studio/theme/tokens.ts` is the semantic source for ink, paper, warm canvas, muted text, structural borders, focus, draft/critical states, spacing, radius and motion.
- `cms/studio/theme/esencialTheme.ts` composes Sanity's installed `studioTheme` through `buildTheme()` from `@sanity/ui/theme`. It changes the editorial font stack, heading weights, spacing and radius while retaining Sanity's native color/state machinery.
- The workspace maps TypeScript tokens to scoped custom properties on `.esencial-workspace-shell`; no fragile `body`, Studio-internal selector or global component override was introduced.

### Single workspace

- `WorkspaceShell` owns the semantic `main`, skip link, title/status/safety header, section navigation and one vertical content flow.
- Navigation uses ordinary fragment links because all three sections remain present in document order. This is more robust for keyboard navigation, zoom and screen readers than claiming ARIA tab semantics while showing all panels.
- The visual tab row is three columns on wide screens and one column below `56rem`; there is no nested horizontal scroll.
- The `Arbetsyta` plugin is registered first in `sanity.config.ts`, making it the calm default landing tool while preserving Dashboard and Structure.
- Existing editor, local protected preview and honest analytics states are composed into the new sections. S16 adds no filter taxonomy, protected frontend preview, consent behavior or analytics provider behavior.

### Accessibility and interaction

- A skip link targets the first workspace section.
- Every extension section is a labelled native `section` with a stable fragment ID and programmatic focus target.
- Status changes use a polite live region; failures switch to assertive announcement.
- Focus uses a 3px blue ring with a 5.78:1 contrast ratio against the canvas.
- Primary controls and form controls have a 44px minimum target; narrow form text is 16px to avoid mobile auto-zoom.
- Text fields now have explicit native labels. Checkboxes have clickable labelled rows. Upload inputs remain visually hidden but keyboard focusable, with focus shown on the drop zone.
- Motion is limited to short color transitions and is effectively removed under `prefers-reduced-motion: reduce`.
- The shell does not disable browser zoom. At narrow and 200%-equivalent layouts the navigation and section headers become single-column.

## Visual mapping to Esencial

| Frontend identity | Studio mapping |
| --- | --- |
| Roboto-led restrained typography | Roboto/Arial/system editorial stack; headings use regular weight instead of dashboard-heavy bold |
| Black and white base | `#1f1f1d` ink on white/`#fbfbfa` canvas |
| Warm project-card backgrounds | restrained `#f5f5f1` wash and `#fff6cc` safety notice, used only where hierarchy or draft safety requires it |
| Uppercase, letter-spaced labels | eyebrow and section/tab labels at `0.1em`/`0.06em` tracking |
| Generous architectural spacing | 4/8-based component rhythm and 72px section rhythm |
| Thin graphic rules | 1px borders, with the essential structural rule at 3.36:1 contrast |
| Existing blue keyboard safeguard | `#005fcc` focus ring, 3px wide and never removed without a replacement |

Measured WCAG contrast ratios:

- primary ink / canvas: 15.94:1
- muted text / canvas: 6.60:1
- draft notice text / surface: 8.12:1
- critical text / surface: 7.51:1
- focus ring / canvas: 5.78:1
- strong structural border / canvas: 3.36:1

## Extension contracts

The durable API is exported from `cms/studio/components/workspace-shell/index.ts`:

```ts
type WorkspaceSectionDefinition = {
  id: 'projects-filters' | 'live-preview' | 'analytics-consent'
  summary: string
  children: ReactNode
}
```

Ordering is fixed by `WORKSPACE_SECTION_ORDER`; DOM IDs come from `workspaceSectionDomId()`. Each rendered section also exposes `data-extension-slot` and `data-owner-stage` for deterministic integration inspection.

### S17 — Projects & Filters

- Slot: `projects-filters`
- Feature boundary: `cms/studio/features/projects/**`
- May replace the current section content with project/filter components.
- Must preserve `WorkspaceSectionDefinition`, the draft-only write helper, native final publication, stable slug/language safeguards and the vertical shell.
- Keyboard alternatives for drag ordering belong with S17's explicit order/visibility controls; S16 did not pre-implement them.

### S18 — Live Preview

- Slot: `live-preview`
- Feature boundary: `cms/studio/features/preview/**`
- May replace the local placement canvas with protected frontend preview and layout diagnostics.
- Must preserve the slot ID, viewport-independent shell, draft/published clarity, protected origin boundary, honest error state and no public draft URL.

### S19 — Analytics & Consent

- Slot: `analytics-consent`
- Feature boundary: `cms/studio/features/analytics/**`
- May replace the current honest analytics summary with aggregated analytics, consent and privacy controls.
- Must keep provider credentials server-side, retain unavailable/empty/error states, avoid example values, and load no non-essential analytics before valid consent.

## Shared-hotspot rationale

| Shared file | Why S16 had to change it | Public output reach |
| --- | --- | --- |
| `cms/studio/components/studioTools.tsx` | Composes the existing safeguarded editor/preview/analytics surfaces into the three stable sections; corrects heading order and native form labels without changing draft/publication logic | Studio only |
| `cms/studio/components/studioTools.css` | Removes the old sticky two-column preview assumption and makes upload/checkbox controls keyboard-visible and touch-sized | Studio only |
| `cms/studio/sanity.config.ts` | Applies the supported Sanity theme and registers `Arbetsyta` first | Studio only |

No shared hotspot can reach generated public output, so a frontend build/parity run was not required by the S16 contract. Public frontend files were not touched.

## Validation

### Preflight and baseline

| Command | Result |
| --- | --- |
| `git branch --show-current` / `git rev-parse HEAD` / `git status --porcelain=v1 --untracked-files=all` | PASS — exact branch, exact starting SHA, clean |
| `node orchestration/status.mjs --json` | PASS — valid registry; S16 was the sole effective READY stage; no warnings/errors |
| `npm --prefix cms/studio run build` | PASS — baseline Studio build |
| `corepack pnpm run check-studio-workspace` | PASS — baseline 30 safeguards |
| `npx tsc --noEmit` in `cms/studio` | PASS — baseline |
| `npx eslint . --max-warnings=0` in `cms/studio` | PASS — baseline |

### Final code checks

| Command | Result |
| --- | --- |
| `npm --prefix cms/studio run build` | PASS — final Sanity Studio build completed in 3.059s |
| `corepack pnpm run check-studio-workspace` | PASS — 30 schema/workspace/export safeguards; no canonical mutation or browser secret exposure |
| `npx tsc --noEmit` in `cms/studio` | PASS |
| `npx eslint . --max-warnings=0` in `cms/studio` | PASS |
| `git diff --check` | PASS |
| React best-practices review | PASS — no new waterfall, hook-order, inline-component or heavy-bundle issue; direct imports used internally |
| staged secret scan | PASS — no credential/token/private-key pattern and no environment/content payload file staged |
| final `git status --porcelain=v1 --untracked-files=all` | PASS — clean after the single final commit |

The root validator warns that the active Node runtime is 24.16.0 while the root package requests Node 22.x; the validator itself passed. This is an environment warning, not an S16 failure.

## Browser and visual evidence

The `vercel:agent-browser-verify` flow was selected, but its `agent-browser` executable is not installed. The fallback used Playwright 1.62.1 through `npx` with the installed Chrome channel; no repository dependency or lockfile changed.

The real local Studio at `http://127.0.0.1:3333` loaded at 1440×1000 and 390×844. Both nonblank captures stopped at Sanity's responsive login-provider boundary. Reusing Lucas's primary browser credentials or automating a login was prohibited, so the authenticated `Arbetsyta` itself could not be visually certified. The dev server reported no Vite/runtime error during either capture.

The shell CSS was then inspected with a local, content-free structural harness and neutral max-width container adapter at desktop, narrow and 200%-equivalent widths. This did not query Sanity, include a content payload or exercise feature logic. It verified visual flow, focus, wrapping and absence of horizontal overflow.

Transient capture paths and SHA-256 hashes (the files were removed before commit to keep the strict owned-file set and worktree clean):

| Capture | Local path | Bytes | SHA-256 | Finding |
| --- | --- | ---: | --- | --- |
| Real Studio desktop | `work/s16-evidence/studio-desktop.png` | 17,122 | `3cd6a2c4e892686caf8ed98a98578b8ad1262bbdafdcac16132e88d396d2b17a` | responsive Sanity auth boundary; custom tool blocked by authentication |
| Real Studio narrow | `work/s16-evidence/studio-narrow.png` | 12,806 | `fc9d751f3bb447de98f914cb3864f73b2a9514fbdc818827a04261788e003410` | responsive Sanity auth boundary; no clipping |
| Shell desktop | `work/s16-evidence/shell-desktop.png` | 64,907 | `76b7eb6d1d9eecf7a8c61e47bf191d7f73a109bc6f90bdccb1916e719d6fd951` | three-column section navigation, clear focus, calm vertical hierarchy |
| Shell narrow | `work/s16-evidence/shell-narrow.png` | 43,888 | `7269b52bdedd68a1024de7d27108ee59a88051c42399d842d1ec6a2205ed4482` | 390px single-column reflow, wrapped safety copy, no horizontal overflow |
| Shell 200%-equivalent | `work/s16-evidence/shell-200pct-equivalent.png` | 49,004 | `f79525a81bf122fbe359153749a2c903a1715731803f940c55420a56036ecf56` | 720px effective layout stacks navigation/section headers without loss |

## Risks and integration checks

1. Authenticated Studio visual QA remains a manual integration check. An authorized editor should open `Arbetsyta` at desktop and narrow widths, inspect all three sections, and repeat at 200% browser zoom without sharing credentials.
2. Existing drag-only media/home ordering predates S16. S17 must add explicit keyboard order controls when it owns project membership/order/visibility behavior.
3. Roboto is preferred to align with the frontend and falls back to Arial/system sans when it is not installed; no remote font request or new asset was introduced.
4. S18 must replace only the `live-preview` slot and must not reuse the local placement canvas as proof of the real frontend renderer.
5. S19 must replace only the `analytics-consent` slot and preserve server-only credentials, consent gating and honest unavailable/empty/error states.
6. S20 should verify the fixed slot IDs/order, one H1, sequential section headings, native publication path, and all 30 safeguards after integrating S17–S19.

## Prohibited actions not taken

No `.env.local` read/copy, mutation endpoint, Sanity document write, import/migration, role change, Studio deploy, dependency install in the repository, public build mutation, frontend visual change, image work, merge, rebase, fast-forward, branch switch, push, PR, DNS/hosting change or production deployment occurred.
