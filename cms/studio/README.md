# Esencial Sanity Studio

This Studio provides a protected draft workspace for the Esencial website. The browser receives no provider token, workspace mutations target Sanity drafts, and native document validation remains the only publication path.

Local verification:

```text
npm ci
npm run build
```

`npm run prepare:import` only regenerates `import/esencial.ndjson` with draft IDs. It does not contact Sanity. Dataset imports, roles, tokens, webhooks, Studio deployment, and production publication are manual owner gates documented in `docs/CMS_USER_GUIDE.md`.
