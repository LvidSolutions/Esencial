# Public Crawler Policy

The new site is intended to be discoverable in Google Search, Google Images, Bing, and answer/search systems that respect standard crawl controls. The current `public/robots.txt` therefore allows public paths for all user agents.

This does not make private material public. Drafts, preview URLs, CMS administration, client files, and unpublished drawings must require authentication and must never be placed in the public build.

Before launch, Esencial management must confirm whether third-party AI crawlers are allowed to access public pages. The default public `User-agent: *` rule currently permits them. If the policy changes, update `robots.txt` in one reviewed change and record the decision here with date, owner, and affected user-agent.

Google's normal indexing rules apply to Google Search, Images, Discover, AI Overviews, and AI Mode. Do not use `noindex` or `nosnippet` on a page that should be eligible for those surfaces.

Search discovery and model-training permissions are separate business decisions. Consult the current official crawler documentation before adding a specific third-party rule because user-agent names and policies can change.
