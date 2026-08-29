# CMS deployment setup

The code is on `main`. Preview and publication stay closed until the following owner-only secrets are configured.

## 1. GitHub build reader

In Sanity Manage, project `g6xm8j7l` → API → Tokens, create a least-privilege **Viewer** token for dataset `production` named `GitHub published site build`.

In GitHub → `LvidSolutions/Esencial` → Settings → Secrets and variables → Actions, add it as `SANITY_API_TOKEN`. The workflow reads only published content and publishes only its validated generated artifact.

## 2. Draft preview

In Vercel project **esencial-staging** → Settings → Environment Variables, set:

| Name | Purpose |
| --- | --- |
| `SANITY_PREVIEW_TOKEN` | Sanity Viewer token used only by the server to render drafts. |
| `CMS_ORIGIN` | `https://esencial-cms.sanity.studio` |

Use the Production environment for this staging project because its production alias is the protected preview host. Do not add either value to the public **esencial** project.

Open Studio → **Frontendpreview**. It calls `/api/draft-mode/enable`, sets an HTTP-only preview cookie, then opens the same Esencial layout at `https://esencial-staging.vercel.app`. Project pages and the project grid are available. The preview response is private and `noindex`; the normal public site never receives draft data.

## 3. Automatic publish after Sanity Publish

Create a fine-grained GitHub token limited to repository `LvidSolutions/Esencial` with **Contents: Read and write**. Do not use your personal token or expose it in Studio, Git, chat, or source code.

Generate and securely store one independent random webhook secret. In **esencial-staging** Vercel environment variables, add:

| Name | Value |
| --- | --- |
| `GITHUB_DISPATCH_TOKEN` | The fine-grained GitHub token above. |
| `SANITY_WEBHOOK_SECRET` | The same independent secret entered in Sanity's webhook. |

In Sanity Manage → API → Webhooks, create:

| Setting | Value |
| --- | --- |
| Dataset | `production` |
| URL | `https://esencial-staging.vercel.app/api/sanity-publish/` |
| Trigger | Create, update, delete |
| Filter | `_type in ["project", "filterCategory", "navigationSettings", "homePage"] && !(_id in path("drafts.**"))` |
| Secret | Exactly the `SANITY_WEBHOOK_SECRET` value |

The receiver verifies Sanity's raw-body HMAC signature, rejects stale or duplicate deliveries, then sends `sanity-published` to GitHub. GitHub runs every CMS/SEO/Playwright gate before it commits only the validated `public/` artifact to `main`; Vercel then deploys it. Any missing or invalid secret returns an error and cannot publish.

## 4. Final proof

1. Publish a harmless project text correction in Studio.
2. Confirm a `CMS staging build` run appears in GitHub Actions and passes.
3. Confirm its generated-site commit lands on `main`.
4. Confirm Vercel deploys that commit; test the staging URL first, then the public production alias.

No DNS or custom-domain change is part of this setup.
