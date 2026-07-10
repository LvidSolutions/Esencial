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
- `description`: the visible project introduction and the basis for the search description. Use a short factual paragraph, not keyword lists.
- `images`: every image needs a `src` path and an accurate `alt` description. Keep the file only when image rights are confirmed.

## Adding a project

1. Add approved image files under `public/wp-content/uploads/` or the future CMS media library.
2. Add the Swedish record to `content/projects/sv.json` and the matching English record to `content/projects/en.json`.
3. Use the same `id` and `slug` in both languages.
4. Write original introductions in each language. Do not use automatic translation without review.
5. Add concise image descriptions. Describe what the image shows; do not repeat a list of search phrases.
6. Run `npm run build`.
7. Open the generated Swedish and English project pages, then check mobile and desktop presentation.
8. Request review before publishing the repository build.

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
