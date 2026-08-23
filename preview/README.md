# S18 protected frontend preview contract

This directory defines the boundary between Sanity Studio 6.10.1 and Esencial's real frontend renderer. The production site remains static; an authorized staging preview must use a separate protected SSR/hybrid renderer that reuses the same page templates, CSS, assets and image presentation.

## Studio configuration

- `SANITY_STUDIO_PREVIEW_ORIGIN` contains only the public origin, for example `https://protected-preview.example`.
- It must never contain a token, user information, path, query string or fragment.
- HTTPS is required except for `http://localhost` or `http://127.0.0.1` during local development.
- When the origin is absent or invalid, Studio shows the honest local layout fixture. That fixture is always labelled unauthenticated and blocks review.

## Required renderer endpoints

### `GET /api/draft-mode/enable`

This is the standard Sanity Presentation Tool handshake. The renderer must validate the generated `sanity-preview-secret` with `@sanity/preview-url-secret`, set a short-lived `HttpOnly; Secure; SameSite=None` perspective cookie and redirect after removing all secret query parameters. Shared preview access stays disabled in Studio, so S18 exposes no copyable draft URL.

The renderer's Sanity read token is a server-only environment variable. Draft requests use `perspective: "drafts"` and `useCdn: false`; published requests use `perspective: "published"`. No token or draft payload may be serialized into Studio configuration, browser JavaScript, HTML attributes, logs or a URL.

### `GET /__preview/render`

Accepted query parameters are:

| Parameter | Contract |
| --- | --- |
| `route` | Absolute Esencial path beginning with `/`; reject external URLs and traversal. |
| `perspective` | Exactly `drafts`, `published` or `staging`. |
| `document` | Optional canonical Sanity document ID; never a token. |
| `revision` | Non-secret integer cache-buster used for live reload. |

The renderer must require its protected session before returning content, emit `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`, a restrictive CSP and a `frame-ancestors` rule limited to the authorized Studio origin. It must return the real frontend DOM/CSS/assets for the requested route. A placeholder, local fixture or static placement canvas is not authenticated preview proof.

## DOM instrumentation

The renderer includes `/preview/layout-diagnostics.js` after the real page DOM. Content-bearing elements provide:

```html
<h1
  data-cms-field="title"
  data-cms-text
  data-cms-line-limit="75"
  data-cms-document-id="project-sv-example"
  data-cms-path="title"
  data-cms-edit-target
>…</h1>
```

- `data-cms-field` is the actionable field label.
- `data-cms-document-id` and `data-cms-path` enable click-to-edit where viable.
- `data-cms-text` opts into readable-line-length diagnostics.
- `data-cms-media` marks expected images.
- `data-cms-overlap-group` opts sibling controls into deterministic overlap checks; ordinary intentional visual overlays are not guessed.
- `body[data-cms-route]` and `body[data-cms-perspective]` identify the rendered state.

The server injects two meta values: the exact authorized Studio parent origin and `esencial-preview-authenticated=true` only after the protected session has been verified. Studio accepts messages only from its configured origin and the active iframe.

## Messages, diagnostics and S20 handoff

The versioned `postMessage` contract is implemented in `cms/studio/features/preview/contracts.ts`. It reports renderer readiness, explicit authentication state, layout issues and edit intents. Every issue is blocking and includes route, field, message, suggested action and optional document/path context.

S20 must connect the protected SSR/hybrid adapter to the existing Esencial page generator without changing public typography, spacing, images, crop, framing, compression or LCP behavior. It must add the instrumentation to preview responses only, verify the standard draft-mode secret flow, and rerun public parity if any shared generator or public output changes.

The fixtures under `preview/fixtures/` are deterministic test pages only. They are intentionally not described as the real frontend or as authenticated staging evidence.
