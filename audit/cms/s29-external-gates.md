# S29 — kvarvarande externa grindar

Kod som kan göras i repot fortsätter på `codex/s29-studio-separate-workspaces`. Följande kräver extern konfiguration och ska inte ersättas med mockdata.

## Förhandsvisning

Kod finns redan för skyddad draft-preview, `noindex/no-store`, draft-session och server-rendering.

Återstår utanför koden:
- sätt `SANITY_STUDIO_PREVIEW_ORIGIN=https://esencial-staging-lvid-s-projects.vercel.app` i Studio-miljön;
- sätt en server-only `SANITY_PREVIEW_TOKEN` i staging, aldrig i Studio/browsern;
- verifiera att `CMS_ORIGIN` motsvarar den faktiskt deployade Studio-originen;
- verifiera Sanity CORS/origins för Studio + staging;
- kör ett riktigt opublicerat SV/EN-projekt genom desktop/tablet/mobile preview.

## Resultat/statistik

Dashboard och fail-closed API finns. `.env.example` innehåller nu de verkliga icke-hemliga Vercel-ID:na.

Återstår utanför koden:
- skapa/anslut read-only Vercel Analytics credential;
- verifiera/aktivera Web Analytics för rätt production-projekt;
- verifiera Search Console-property `sc-domain:esencial.se` och ge server-side service account access;
- godkänn controller, ändamål, retention, leverantörer och SV/EN privacy/cookie-text innan consent aktiveras.

## Publicering

Webhook + GitHub release gate finns redan. Före skarp användning återstår:
- konfigurera Sanity webhook secret och GitHub dispatch-token i respektive secret store;
- genomför ett fullständigt verkligt draft → preview → publish → webhook → validated build-test;
- godkänn därefter separat eventuell production/domain cutover.

## Plattform

Vercel API rapporterar för närvarande Node `24.x` på både `esencial` och `esencial-staging`, medan repot tidigare har ett Node 22-kontrakt. Versionslinjen måste göras konsekvent före slutlig release; uppgradera eller nedgradera inte blint utan att köra hela release-gaten.
