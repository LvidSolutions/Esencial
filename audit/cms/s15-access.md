# S15 Sanity Access Gate

Status: BLOCKED_HUMAN

## Safe verification completed

- Repository `.env.local` exists and Git ignores it.
- `SANITY_PROJECT_ID` matches `g6xm8j7l`; `SANITY_DATASET` matches `production`.
- The token is present, non-placeholder, whitespace-free, ASCII, and matches Sanity token form. Its value was never printed, copied, committed, or included in evidence.
- Sanity Access API and Projects API both returned HTTP 200, proving that the token itself authenticates.
- The Access API returned zero permission records for project `g6xm8j7l`.
- The Content Lake read-only query returned HTTP 401 because the authenticated token has no project content permission.
- No mutation, document read result, role change, import, migration, webhook, deploy, push, or external write occurred.

## Required human action

In Sanity Manage, open project `g6xm8j7l` → Settings → API → Tokens. Give this robot a built-in Viewer/content-read role for dataset `production`, or create a replacement project robot token with that role and replace only `SANITY_API_TOKEN` in ignored `.env.local`.

Do not paste the token into chat. Editor is unnecessary for S15 and ordinary CMS builds; use a separately authorized short-lived write credential only for a later migration that genuinely requires it.

After the role is assigned, rerun:

```powershell
node scripts/check-sanity-access.js --read-only
corepack pnpm run check-studio-workspace
```

S16 must remain locked until both commands pass and this report is updated to `PASS`.
