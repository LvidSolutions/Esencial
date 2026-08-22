# Staging på Vercel – Esencial

Den här instruktionen skapar en **separat** stagingmiljö för ersättningssajten. Den ändrar inte den nuvarande live-domänen, DNS eller befintlig hosting.

## Vad som redan är klart i repot

- `vercel.json` bygger den statiska sajten med `npm run build`, lämnar `public` som output och exponerar analysfunktionen på `/api/analytics`.
- CMS-publicering kör GitHub Actions som validerar Sanity-innehåll innan den skriver den genererade sajten till `main`.
- En Vercel Git-koppling till `main` ger staging-deploy efter en godkänd CMS-build. Pull requests och brancher får egna preview-deployer.

## Engångsinstallation i Vercel

1. Logga in på Vercel med det konto/team som ska äga Esencial.
2. Importera GitHub-repot `LvidSolutions/Esencial` som ett **nytt** projekt, exempelvis `esencial-staging`.
3. Låt Vercel läsa `vercel.json`. Kontrollera att Build Command är `npm run build` och Output Directory är `public`.
4. Tilldela ingen befintlig Esencial-domän och gör inga DNS-ändringar. Använd en Vercel-adress eller en ny, tillfällig staging-subdomän som är helt separat från live.
5. I Settings → Git, behåll `main` som staging-projektets produktionsgren. Preview-deployer för andra brancher ska vara påslagna.
6. Lägg bara till de miljövariabler som beskrivs i [ANALYTICS_SETUP.md](ANALYTICS_SETUP.md) när Vercel Web Analytics och Cookiebot är redo. Search Console ansluts först för den slutliga produktionsdomänen. Utan variablerna fungerar webbplatsen, men ingen statistikresurs laddas och panelen visar ett tydligt otillgängligt läge.
7. Gör första deployen från `main` och kontrollera startsida, projekt, svenska/engelska språkväxling, sitemap och `/api/analytics`.

## CMS-koppling

1. Lägg en read-only `SANITY_API_TOKEN` som GitHub Actions-secret i repot.
2. Skapa en finmaskig GitHub-token eller GitHub App-token med minsta behörighet för `repository_dispatch` och spara den endast i Sanity-webhookens hemlighetsfält.
3. I Sanity, skapa webhook mot GitHubs repository-dispatch-endpoint med event-typen `sanity-published`.
4. Gör en avsiktligt ogiltig ändring i ett testprojekt (saknad alt-text eller engelska version) och bekräfta att Actions stoppar byggningen utan att staging ändras.
5. Återställ testet, publicera ett godkänt projekt och bekräfta att en ny Vercel-deploy visas på staging.

## Rollback

Vercel behåller tidigare deployer. Om staging blir fel: öppna den senaste fungerande deployen i Vercel och välj **Promote to Production** för stagingprojektet. Gör sedan en separat felsökningsändring i Git/Sanity. Detta påverkar fortfarande inte den gamla live-sajten.

## När detta inte längre räcker

Koppla inte nuvarande live-domän förrän pilotflödet, Cookiebot-samtycke, SEO-kontroller och rollback har godkänts skriftligt. Produktionsbytet är en separat aktivitet i fas 6 av [fortsättningsplanen](CONTINUATION_PLAN.md).
