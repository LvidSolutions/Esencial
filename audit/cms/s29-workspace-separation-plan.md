# S29 — Studio workspace separation and copy reduction

Status: IMPLEMENTATION IN PROGRESS

Goals:
- Make Project, Filter and ordering, Preview, and Results truly separate Studio views rather than anchors on one long page.
- Preserve the existing visual system, validation, publishing protections, and advanced Sanity structure tool.
- Remove repetitive explanatory copy; keep help text only where it prevents a real mistake or explains an irreversible/publication-sensitive action.
- Do not fake external preview or analytics data. External provider configuration remains fail-closed.

Implementation scope:
- `cms/studio/components/workspace-shell/*`
- `cms/studio/components/studioTools.tsx`
- targeted user-facing copy in Studio components/schema where it is clearly implementation detail rather than editorial guidance.

External items not solvable by source changes alone:
- authenticated HTTPS staging preview origin/session and server-only draft renderer credential;
- provider credentials/activation for real analytics and Search Console;
- owner/legal approval for consent/privacy wording and data-retention policy;
- production publication/DNS/provider changes.
