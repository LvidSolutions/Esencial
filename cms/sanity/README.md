# Sanity schema compatibility path

The authoritative content model is `cms/studio/schemaTypes/`. `schema.ts` re-exports that project type so older references cannot drift into a second, weaker schema.

The repository does not activate Sanity, change a dataset, or write production content. See `docs/CMS_USER_GUIDE.md` for the guarded local and editorial workflow.
