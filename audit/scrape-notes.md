# Scrape Notes

## Confirmed Facts From Downloaded Code

- The live frontend includes WordPress-style paths such as `/wp-content/uploads/`, `/wp-content/themes/esencial/`, `/wp-includes/`, and `/wp-content/plugins/`.
- The theme asset path is `/wp-content/themes/esencial/`.
- The recovered HTML includes `meta name="generator" content="WordPress 6.9.4"`.
- The recovered HTML includes `meta name="robots" content="noindex, nofollow"`; this was intentionally preserved.
- The pages include ExactMetrics / Google Analytics traces, including plugin asset `google-analytics-dashboard-for-wp/assets/js/frontend-gtag.js`.
- The pages reference Google-hosted Roboto fonts; those font CSS/font files were downloaded into the local static copy.
- Public image assets were mostly under `/wp-content/uploads/`, with 2018, 2020, and 2023 upload paths found.
- The site uses class-based frontend structure such as `.css_header`, `.css_nav_container`, `.css_grid_container`, `.css_grid_card_container`, and `.css_nav_footer_container`.

## Educated Guesses

- The live website appears to be a static export of a WordPress site, consistent with the user's WP2Static context.
- The old WordPress backend or API is not required for the visible static frontend because all required rendering assets were publicly recoverable.
- The duplicated DOM issue encountered during recovery appears to be caused by site JavaScript reacting to the automated scroll/lazy-load pass; the crawler now saves the initial rendered DOM before scrolling for asset discovery.

## Unknowns

- The original CMS/backend source files were not available from the public site.
- No private WordPress admin or backend endpoint was accessed.
- No Sanity, Payload, or replacement CMS structure has been inferred or created.
- No SEO changes were made, including no changes to metadata or `noindex`.
