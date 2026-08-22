# Stage 7 — Image SEO and responsive delivery

Status: Complete in the repository.

## Outcome

Project pages now use actual intrinsic image dimensions and responsive WebP candidates for photographic primary images where a smaller faithful derivative exists. High-detail drawings deliberately retain their original PNGs. All 104 project-page image uses have automated alt, dimension, loading, and delivery checks.

## What changed

- `scripts/build-image-variants.js` measures the 52 unique project assets, classifies drawings from approved descriptions/filenames, and writes `content/image-variants.json`.
- Generated 20 640px quality-90 WebP photo derivatives (about 1.49 MB total); originals remain compatible, high-quality fallbacks and are never overwritten.
- The generator now emits real `width`/`height`, photo `srcset`/`sizes`, eager/high-priority first images, and lazy async-decoded later images.
- Drawings receive real dimensions but no lossy derivative, preserving line detail and legibility.
- `check-image-seo.js` now protects source/alt, dimensions, loading policy, responsive-photo candidates, and drawing preservation across all bilingual project pages.

## Why this matters

Actual dimensions prevent layout shifts. Responsive files avoid sending an unnecessarily large photograph to a smaller viewport. Standard HTML images and nearby project context support image discovery, while CSS background images do not provide the same signal. [Google image SEO guidance](https://developers.google.com/search/docs/appearance/google-images)

## Findings and boundaries

- The upload archive contains 109 image files (56 JPEG, 53 PNG), about 30.1 MB total.
- Several legacy photos are only 533–800px wide. The build never upscales them; it adds a 640px candidate only where the original permits it.
- Credits, rights, captions, filename migration, and any image sitemap require confirmed editorial/legal information or an approved media workflow and were not invented.

## Validation

- `npm run build:image-variants`: 52 measured sources and 20 WebP variants.
- `npm run check-image-seo`: passed 104 generated image uses, 40 responsive-photo uses, and 52 preserved drawing uses.
- `npm run build`: all technical, international, semantic, project, image, and link checks passed.
- Browser inspection confirmed responsive attributes, actual dimensions, high fetch priority, and a rendered project primary image.

## Next stage

Stage 8 covers structured data and the entity graph. Required model: **GPT-5.6 Sol — xhigh**.
