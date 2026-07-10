# New Site Launch and Domain Cutover

The current public domain must not be modified while the replacement site is being prepared in GitHub.

## Before the DNS switch

1. Connect a temporary staging host to this repository.
2. Configure the temporary host with the final production URL in generated metadata, sitemap, canonical links, and `robots.txt` only when launch is approved.
3. Verify all 56 current sitemap URLs on staging, including mobile layouts, images, links, titles, language links, and JSON-LD.
4. Add redirects for any legacy URLs that will be replaced. A redirect must point to the closest equivalent page.
5. Verify ownership of the domain in Google Search Console and prepare the sitemap submission.
6. Freeze content changes on the old site shortly before launch.

## At launch

1. Publish the verified GitHub build to the new host.
2. Point the domain DNS or hosting binding to the new host.
3. Confirm HTTPS, the preferred `www` host, redirects, `robots.txt`, sitemap, and the home page from an external network.
4. Submit `https://www.esencial.se/sitemap.xml` in Search Console.
5. Keep the old hosting available for rollback until the new site has been stable for at least 30 days.

## After launch

Review Search Console coverage, crawl errors, Core Web Vitals, redirects, and top pages weekly for the first month. Do not judge SEO outcome by the first few days: re-crawling and re-indexing take time.
