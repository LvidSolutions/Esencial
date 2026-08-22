# Sanity access for Esencial

## Local storage

Store the real project robot token only in repository-root `.env.local`:

```dotenv
SANITY_PROJECT_ID=g6xm8j7l
SANITY_DATASET=production
SANITY_API_TOKEN=the-project-robot-token
```

`.env.local` is Git-ignored. Never put the value in source, Studio configuration, screenshots, reports, prompts, chat, browser code, or the account-handover folder. Rotate it in Sanity Manage if exposure is suspected.

## Permission boundary

- S15 uses authenticated GET requests only: a `raw` Content Lake count query and optional introspection of the token's own project permissions.
- The robot token is for server/local automation. Future Studio editing uses the signed-in editor's Sanity session; the token must never enter the static Studio bundle.
- Read access is sufficient for S15 and CMS builds. Grant Editor only when a separately authorized migration or server-side write truly needs it, then remove or rotate that credential afterward.
- A successful access check does not authorize document changes, imports, migrations, schema deployment, Studio deployment, role changes, webhooks, or production publication.

## Verification

Run from the repository root:

```powershell
node scripts/check-sanity-access.js --read-only
```

The command prints only project/dataset identifiers, aggregate document counts, and permission-name counts. It never prints the token or provider response bodies on failure.

If it reports zero project permissions, open Sanity Manage → project `g6xm8j7l` → Settings → API → Tokens. Assign the robot a built-in Viewer/content-read role for dataset `production`, or create a replacement project token with that role and replace only the ignored `.env.local` value. A deploy-only token cannot read Content Lake.
