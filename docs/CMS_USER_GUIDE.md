# Esencial Content Guide

This guide describes the interim content workflow in this repository and the matching workflow for the planned CMS.

## Before publishing

Only publish facts and images that Esencial has permission to show. Check client confidentiality, photographer/image rights, names, locations, drawings, credits, and language versions first.

## Project fields

Every project has one Swedish and one English record in `content/projects/`.

- `id`: internal identifier. Do not change it.
- `slug`: the permanent part of the web address. Change it only with a redirect plan.
- `title`: the published project name.
- `location`: publish only the approved level of detail, for example city rather than a sensitive street address.
- `year`, `typology`, `client`, `team`, and `services` (optional): publish each only after the project facts, names, confidentiality, and language version are approved. These are factual fields, not search-keyword fields.
- `description`: the visible project introduction and the basis for the search description. Use a short factual paragraph, not keyword lists.
- `body` (optional): an approved longer project story. Add only material that tells visitors something the images and short introduction cannot; there is no target word count.
- `relatedProjectIds` / `relatedProjects` (optional): manually chosen editorial relationships. Do not add links merely because two projects share a generic keyword.
- `descriptionLanguage` (optional): set this only when an approved visible excerpt is intentionally in a language other than the page. The build tags that excerpt with the correct `lang` value and creates a conservative page-language metadata fallback until an approved translation is available.
- `images`: every image needs a `src` path and an accurate `alt` description. Keep the file only when image rights are confirmed.

## Adding a project

1. Add approved image files under `public/wp-content/uploads/` or the future CMS media library.
2. Add the Swedish record to `content/projects/sv.json` and the matching English record to `content/projects/en.json`.
3. Use the same `id` and `slug` in both languages.
4. Write original introductions in each language. Do not use automatic translation without review. If a legacy excerpt must temporarily remain in another language, record its real language with `descriptionLanguage`; this is not a substitute for translation approval.
5. Add concise image descriptions. Describe what the image shows; do not repeat a list of search phrases.
6. Run `npm run build`.
7. Run `npm run audit:project-content` to review missing approved facts and generic/short introductions. This is an editorial queue, not permission to invent content.
8. Open the generated Swedish and English project pages, then check mobile and desktop presentation.
9. Request review before publishing the repository build.

## Updating a project

Edit the appropriate language file, run `npm run build`, and inspect the generated page. Do not alter generated `public/projekt/` or `public/projects/{slug}/` files manually: the build recreates them from the content files.

## Writing search fields well

The project title and description are used to build the page title, description, social preview, structured data, and sitemap URL. A good description states what the project is, where it is when approved, and one meaningful design fact. It should be understandable without surrounding images.

## Image guidance

- Use images you are licensed to publish.
- Export an efficient web derivative before upload; retain an original separately.
- Use descriptive filenames where practical.
- Use empty alt text only for decorative images. Portfolio images and drawings normally need descriptions.
- Credit photographers and collaborators in the project description or the future CMS credits field after the facts are confirmed.

## Do not change

Do not manually change canonical links, `hreflang`, JSON-LD, `robots.txt`, sitemap generation, analytics settings, deployment rules, or redirects. These are template/developer-controlled attributes because a small mistake can make many pages disappear from search.

## Publishing checklist

- Content and image rights approved
- Swedish and English records checked
- Project URL intentionally chosen
- Images have useful alt descriptions
- `npm run build` passes
- Desktop and mobile preview checked
- Reviewer approves the release
