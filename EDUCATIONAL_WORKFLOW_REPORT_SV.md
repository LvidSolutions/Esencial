# Utbildningsrapport — Esencial SEO/CMS-workflow

## Vad som byggdes

Workflowet delar ett stort webbprojekt i numrerade steg med tydliga beroenden. En koordinator (W0) bestämmer vad som är redo, medan högst fyra arbetare (W1–W4) gör avgränsade uppgifter i separata Git-worktrees. Fem Codex-fönster är därför optimal maxnivå: tillräckligt för CMS-fasens tre samtidiga funktionspaket, men få nog för att hålla integrationen kontrollerbar.

`orchestration/stages.json` är maskinens arbetslista. Varje steg anger beroenden, ägare, modell, reasoning effort, filområde, tester, rapport och manuella hinder. `orchestration/status.mjs` validerar grafen och härleder `READY`. Ett steg blir inte klart bara för att kod finns; arbetaren lämnar ett lokalt PASS, koordinatorn granskar och integrerar, kör om gemensamma tester och registrerar därefter `DONE` med bevis.

## Hur proceduren fungerar

1. Koordinatorn kontrollerar ren gren, känd commit och statusgraf.
2. Endast arbetaren som äger ett `READY`-steg får börja.
3. Arbetaren använder en isolerad worktree, ändrar endast sitt filområde, testar och skriver rapport.
4. Koordinatorn granskar diffen och löser delade filer. Gamla testbevis återanvänds inte efter en merge; relevant test körs mot den sammanslagna koden.
5. Fel stannar i det steg som orsakat dem. Externa beslut blir `BLOCKED_HUMAN` i stället för antaganden.
6. Slutstegen kör hela systemet, inte bara enskilda komponenttester.

Metoden har redan slutfört S0–S12: teknisk och internationell SEO, semantik, projekt/bild-SEO, schema, prestanda, tillgänglighet, samtyckesstyrd analys och Sanity-publiceringsskydd. Den integrerade versionen har 56 validerade sidor, 52 tvåspråkiga projektsidor, noll uppmätta visuella avvikelser i 40 live/lokala par och en ren Studio-/webbbuild.

## Varför säkerhetsgrindarna behövs

Parallella fönster sparar tid men kan annars skriva över varandra. Filägande, worktrees och W0-integration gör förändringar spårbara. Ingen arbetare får pusha, driftsätta, ändra DNS, aktivera externa konton eller skriva Sanity-produktion. CMS-exporten validerar ett komplett publicerat snapshot innan någon genererad fil ändras; Studio skriver endast drafts.

Sanity-token lagras enbart i Git-ignorerad `.env.local`. S15 använder den först efter SEO-slutvalideringen och endast för read-only åtkomstbevis. Sanity rekommenderar projektspecifika robot-token och tidsbegränsning: https://www.sanity.io/docs/content-lake/http-auth. Riktig draft-preview bör byggas med Sanitys preview/Presentation-mönster: https://www.sanity.io/docs/user-guides/preview-and-page-building.

Analys får inte laddas före samtycke. Första lagret ska göra acceptera och avvisa lika enkelt, och samtycke ska kunna återkallas. Automatiska tester bevisar tekniskt beteende men inte juridisk tillräcklighet; svensk text, leverantör, lagringstid och personuppgiftsansvarig behöver mänsklig/juridisk kontroll. Underlag: PTS https://pts.se/contentassets/7b02c828f0984bfba1d1614dc666ab1a/underrattelse-folkhalsomyndigheten-kaktillsyn.pdf och IMY https://www.imy.se/globalassets/dokument/beslut/2025/tillsynsbeslut-aller-media-ab.pdf.

## Återstående arbete och realistisk kvalitet

S13 bygger lokala CI-grindar. S14 gör slutlig SEO-integration. S15 verifierar Sanity. S16 skapar den gemensamma Esencial-anpassade Studio-arbetsytan. Därefter kan projekt/filter (S17), live-preview/layoutskydd (S18) och statistik/samtycke (S19) utvecklas samtidigt. S20 integrerar, S21 användbarhets- och tillgänglighetstestar och S22 slutvaliderar.

Pessimistiskt är en felfri plan värd **8/10 som slutprodukt** och **9/10 som plan**. Begränsningarna är verkliga: filter och innehåll kräver klientbeslut, juridik kan inte automatiseras, redaktörsupplevelse kräver riktiga användare, Sanity-preview behöver staging och verkliga CWV/analytics kräver driftdata. En redaktörspilot, juridisk granskning, godkänt innehåll, riktig staging-preview och fältmätning kan höja resultatet till **9–9,5/10**.

Den centrala lärdomen är att automationen inte ersätter mänskliga beslut. Den gör dem tydliga, placerar dem vid rätt grind och säkerställer att allt annat kan utföras snabbt, parallellt och reproducerbart.
