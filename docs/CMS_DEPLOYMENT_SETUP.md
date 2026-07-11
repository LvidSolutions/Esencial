# CMS deployment setup

This is the handover checklist for the two connections that cannot be safely created in source code: the read-only Sanity credential and the publishing webhook.

## Create a read-only build token

In Sanity Manage for project `g6xm8j7l`, create a robot token with read access to dataset `production`. Name it `GitHub published site build`.

Add its value in GitHub repository settings under `Secrets and variables` > `Actions` as `SANITY_API_TOKEN`. Never put this token in a file, commit, Studio field, screenshot, or chat message.

The workflow `.github/workflows/cms-build.yml` uses the token only to read documents whose status is `published`.

## Test a manual CMS build

In GitHub Actions, select `CMS production build` and choose `Run workflow`. A successful run will:

1. Fetch published Swedish and English projects from Sanity.
2. Reject missing facts, image descriptions, duplicate URLs, or a missing language version.
3. Generate project pages, sitemap, metadata, language links, and structured data.
4. Run the existing SEO and internal-link checks.
5. Commit only changed generated website files to `main`.

The live domain is not changed by this workflow. Hosting and DNS remain a separate launch decision.

## Add automatic publishing

After the manual test is reliable, create a Sanity webhook:

- Dataset: `production`
- Trigger: document create, update, and delete
- Filter: `_type == "project" && status == "published"`
- URL: GitHub repository dispatch endpoint
- Event type: `sanity-published`

The GitHub request needs a fine-grained GitHub token with permission to dispatch workflows for this repository. Store it only in Sanity's webhook configuration. Use a webhook secret and verify its signature in a small proxy when a hosting provider is selected; direct GitHub dispatch is acceptable only for a restricted, private Sanity project during the initial rollout.

## Preview and launch remain protected

The repository deliberately does not expose draft content. The Presentation Tool needs a selected preview host, authenticated draft endpoint, and CORS origin. Configure those only after choosing Cloudflare Pages, Netlify, or Vercel. Until then, the Studio and production build operate safely without a public preview URL.
