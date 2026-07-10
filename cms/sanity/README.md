# Planned Sanity CMS Integration

This repository now uses JSON content files as a safe interim content layer. The next CMS delivery can import the same fields into Sanity without changing project URLs or page templates.

Sanity is not activated by this repository alone because it requires a separate Sanity project, editor accounts, authentication configuration, and a hosting/deployment decision. `schema.ts` is the implementation-ready content model for that setup.

Until then, edit only the documented JSON content files and run `npm run build`.
