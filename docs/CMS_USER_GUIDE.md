# Esencial CMS user guide

This guide covers the repository content files and the protected Sanity Studio workflow. Neither route changes the current live domain by itself.

## Before editing

Only use approved facts and media. Confirm client confidentiality, project names and locations, collaborators, photographer/source credits, and publication rights. Missing information is an editor task; never invent it to clear a validation message.

The Studio browser bundle must never receive `SANITY_API_TOKEN` or another provider credential. The read-only CMS build token belongs only in the CI secret store. Account, dataset, role, webhook, Studio deployment, and production-content changes are external owner actions.

## One bilingual project

Each project has exactly one Swedish document and one English document.

- `Permanent webbadress` / `slug` is the stable URL segment. Use lowercase letters, numbers, and single hyphens. Both languages use the same value. A published value is locked in Studio; changing it requires a written redirect plan and a deliberate return to an earlier workflow state.
- `Språkkoppling` / `translationKey` joins the two documents. Use the same lowercase key with underscores in both, for example `mitt_projekt`. Never reuse it for another project.
- `Översättningsstatus` must be `Godkänd` only after both versions have been reviewed. Machine translation is not approval.
- `Projektnamn`, `Kort projektintroduktion`, `Titel i Google`, and `Beskrivning i Google` are written and reviewed in the document language. Google titles are at most 60 characters and descriptions at most 160.
- Optional project facts such as year, client, team, typology, and services are published only when verified.

For the repository fallback, the matching records live in `content/projects/sv.json` and `content/projects/en.json`. They must use the same `id` and `slug`; generated files under `public/projekt/` and `public/projects/` are never edited by hand.

## Media placement

The media fields are intentionally separate:

- `Huvudbild` is the project-page hero and project-card image.
- `Projektgalleri` contains ordinary project photographs/visualisations in editorial order. `Visa inte publikt` keeps an item out of the exported gallery.
- `Planritningar` contains only plans, sections, elevations, or site plans. A floor-plan asset must never also be exported as hero/gallery media.
- `Bilder från tidigare webbplats` is a read-only migration queue. Move each item to the correct modern field before CMS publication.

Every publishable image, including a floor plan, needs a meaningful alt text, photographer/source credit, and confirmed rights. The project-level rights checkbox and the four-item publication checklist must also be complete. An empty alt is only appropriate for truly decorative interface imagery, not portfolio media.

## Draft, review, and publication

Sanity draft state and the project’s `Publiceringsläge` serve different purposes:

1. Edit in `Arbetsyta`. Autosave writes only to the `drafts.` document; the published Sanity document is not patched.
2. Use `Under arbete` while facts, media, SEO, or translations are incomplete.
3. Choose `Klar att publicera` when both language documents, media, SEO, rights, and checklist are ready.
4. Resolve every item under `Åtgärda före publicering`.
5. Open `Slutlig kontroll och publicering`. The native Sanity document view runs the complete schema validation and performs the explicit publish action.
6. Inspect the resulting staging build on desktop and mobile. A failed CMS export/build leaves the prior staging content in place.

The workspace preview is an authenticated draft preview, clearly labelled as non-public. It is not a staging URL and must not be shared as proof of publication. The current live domain changes only after a separate written launch decision.

## Export and local validation

The server-side exporter requests Sanity’s `published` perspective and filters to project status `published`. It collects and validates the complete bilingual snapshot and home-page references before replacing local generated JSON. It stops on zero projects, a missing language pair, an unstable/mismatched slug, incomplete SEO, invalid publication state, unresolved home reference, incomplete media metadata/rights, or floor-plan/media mixing.

Local commands:

```text
corepack pnpm run check-content
corepack pnpm run check-studio-workspace
node scripts/check-cms-content.js --fixtures
node scripts/fetch-sanity-content.js --fixtures
corepack pnpm run build
```

To prepare a local NDJSON review file, run `npm run prepare:import` inside `cms/studio`. It creates draft documents only and never contacts Sanity. Importing a dataset is intentionally not scripted; dataset selection and import remain a separately approved owner action.

## Error and empty states

- A Studio load/save/upload error is shown as an error and states that no published document changed. Reload, verify the connection, then inspect the native document view.
- An empty public project export is an error, not a blank-site success.
- A missing home-page singleton is represented as an explicit empty featured-project list; invalid or unresolved references fail the build.
- Validation messages identify the language/project and field to fix. Do not bypass them by changing schema rules or inserting placeholder facts.

## Developer-controlled boundaries

Editors do not manually change canonical links, `hreflang`, JSON-LD, sitemap/robots generation, consent-controlled analytics, deployment rules, redirects, domains, or DNS. The full root build rechecks these shared contracts so the S8 structured-data and S11 consent behavior cannot silently regress.

## External/manual gates

- Sanity owner approves roles, dataset, and any import.
- An editor pilots one Swedish/English pair through draft, review, native publication, and staging verification.
- The owner supplies verified legacy image credits/rights or approves migration to modern media fields.
- A developer creates any needed redirect before a published slug is changed.
- Studio/webhook deployment and production launch require separate authorization.
