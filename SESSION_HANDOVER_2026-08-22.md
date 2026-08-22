# Esencial — kontoöverlämning 2026-08-22

## Stabil stoppunkt

- Arbetsmapp: `C:\Users\lucas\Documents\Codex\2026-08-21\sta\work\Esencial-orchestrator-bootstrap`
- Gren: `codex/orchestrator-bootstrap`
- Senast verifierade commit före detta dokument: `757ee5d`
- Status: ren integration; S0–S12 `DONE`; S13 `READY`; S14 väntar; S15 `BLOCKED_HUMAN`; S16–S22 väntar.
- Kör aldrig från den äldre checkpoint-mappen `...\Esencial` när nya steg ska integreras.
- Ingen push, PR, deploy, DNS-ändring, produktionsskrivning eller extern kontoändring har gjorts.

Kontrollera alltid först:

```powershell
cd "C:\Users\lucas\Documents\Codex\2026-08-21\sta\work\Esencial-orchestrator-bootstrap"
git branch --show-current
git status --short
node orchestration/status.mjs
node --test orchestration/status.test.mjs
```

Förväntat: rätt gren, tom `git status`, 11/11 orkestreringstester och endast S13 `READY`.

## Projektet i korthet

Esencial är en återställd statisk, tvåspråkig webbplats som visuellt ska förbli identisk med `https://www.esencial.se/`. Den har 56 indexerbara sidor: fyra skalrutter och 52 projektsidor från 26 svenska/engelska projektpar. Källor och generatorer styr genererad HTML; genererade projektfiler får inte handredigeras.

Slutfört S0–S12:

- verifierad live/lokal visuell och funktionell paritet;
- teknisk SEO, metadata, hreflang, semantik, projekt- och bild-SEO;
- en saklig JSON-LD-entitetsgraf och synliga breadcrumbs;
- tillgängliga filterkontroller utan visuell förändring;
- samtyckesstyrd Vercel Web Analytics med fail-closed API och inga påhittade mått;
- deterministiska responsiva grid-bilder och prestandagrind;
- Sanity-skydd: endast draft-skrivning, tvåspråkig koppling, stabil slug, media/rights/alt, publiceringschecklista och atomisk exportvalidering.

Senast integrerade verifiering:

- 40 live/lokala viewport-par och fyra interaktioner: noll avvikelser;
- 56 tillgänglighetsrutter, 216 bilder, 70 rubriker: noll fel;
- sex prestandafall: lokal grind PASS;
- full build: 56 sidor, 56 canonicals/sitemap-URL:er, 52 CreativeWork, 104 projektbilder och interna länkar PASS;
- Studio build PASS; 30 Studio-skydd och 11 negativa/positiva CMS-fixtures PASS.

Ärlig kvarvarande risk: Lighthouse mobil-LCP är fortfarande 5,57 s på startsidan, 4,10 s på om-sidan och 2,56 s på projektsidan. Fält-INP och verkliga produktions-CWV saknas. Studio byggdes lokalt med Sanity `6.4.0`, medan runtime meddelade `6.10.1`; versionslinjen ska granskas, inte uppgraderas blint.

## Metod och filkontrakt

- `orchestration/stages.json` är sanningskällan för state, beroenden, ägare, modell/effort, acceptans och bevis.
- `node orchestration/status.mjs` härleder `READY`; ändra aldrig beroenden för att forcera ett steg.
- `ESENCIAL_PARALLEL_CODEX_RUNBOOK.md` styr alla fönster.
- En arbetare gör ett steg i isolerad worktree/branch och lämnar en lokal PASS-commit. Koordinatorn granskar, integrerar och kör om korsfunktionella tester innan `DONE` registreras.
- W0 äger delade hotspots och integration. Ingen parallell redigering av samma fil.
- Byggkörningar på Windows kan ge enbart radslutsskillnader i `public/**`; verifiera med `git diff --ignore-space-at-eol` och commit aldrig brus.

## Sanity-behörighet

Lokal fil finns här och är Git-ignorerad:

`C:\Users\lucas\Documents\Codex\2026-08-21\sta\work\Esencial-orchestrator-bootstrap\.env.local`

Den har projekt `g6xm8j7l`, dataset `production` och tom `SANITY_API_TOKEN`. Lucas skapar en separat projektspecifik robot-token med minsta rimliga behörighet och tidsbegränsning, klistrar den endast efter `SANITY_API_TOKEN=` och sparar. Token får aldrig hamna i chatt, Git, rapport eller terminalutskrift. S15 gör endast read-only verifiering. Produktion förblir read-only; skrivtest kräver separat godkänt utvecklingsdataset och rollback.

## Fortsättning på det andra Business-kontot

Gamla Codex-tasks tillhör föregående konto och ska betraktas som historik. Filer, commits och worktrees finns kvar på samma Windows-desktop. Logga in på det andra kontot, öppna integrationsmappen ovan som lokalt Git-projekt och skapa nya tasks.

Optimal kapacitet är fem fönster totalt: W0 koordinator + W1–W4 arbetare. Öppna inte alla för att redigera direkt; endast `READY`-ägaren får arbeta. Just nu behövs W0 och W4 för S13. Efter S16 kan W2/S17, W3/S18 och W4/S19 köras parallellt.

### Startprompt för nya W0

```text
Du är Esencial W0, koordinator och integratör. Kör GPT-5.6 Sol / xhigh och säg om vald modell/effort är fel så att Lucas kan byta manuellt. Arbeta i C:\Users\lucas\Documents\Codex\2026-08-21\sta\work\Esencial-orchestrator-bootstrap på codex/orchestrator-bootstrap. Läs SESSION_HANDOVER_2026-08-22.md, ESENCIAL_PARALLEL_CODEX_RUNBOOK.md, orchestration/stages.json och orchestration/CMS_EXTENSION_PLAN.md fullständigt. Kontrollera ren gren, node orchestration/status.mjs och 11/11 tester. S0–S12 är DONE och endast S13 ska vara READY. Starta inte om färdiga steg. Skapa/dirigera en isolerad W4-worktree för S13 med GPT-5.6 Sol / high, granska dess PASS-commit och integrera först efter alla lokala grindar. Genomför sedan S14 själv med GPT-5.6 Sol / xhigh. Stoppa vid S15 om .env.local saknar token; visa aldrig token. Efter read-only S15: S16, parallella S17/S18/S19, S20, S21 och S22 enligt registret. Ingen push, PR, deploy, DNS, extern kontoändring eller Sanity-produktionsskrivning utan ny uttrycklig behörighet. Bevara exakt visuell identitet och skriv rapport/bevis för varje steg.
```

### Återstående körordning

1. **S13, W4, Sol/high:** lokala CI- och SEO-releasegrindar; ingen remote push.
2. **S14, W0, Sol/xhigh:** ren slutintegration och oberoende helvalidering.
3. **S15, W0, Sol/high:** read-only Sanity-bevis; stoppa om token saknas.
4. **S16, W1, Sol/xhigh:** Esencial-anpassat visuellt system och en sammanhängande vertikal arbetsyta.
5. **Parallellt:** S17 W2 projekt/filter; S18 W3 riktig responsiv preview/layoutvarningar; S19 W4 statistik/samtycke.
6. **S20 W4:** integrera funktionerna. **S21 W1:** redaktörs-, a11y- och hostile-content-test. **S22 W0:** slutvalidering.

## Mänskliga slutgrindar

Planen kan inte godkänna projektfakta, översättningar, filtermedlemskap, bildrättigheter, personuppgiftsansvarig, lagringstid eller juridisk cookietext. Den kan inte heller bevisa verkliga CWV/analytics före godkänd staging/produktion. Efter S22 krävs pilot med 1–2 verkliga redaktörer, juridisk granskning, klientgodkänt innehåll och fältmätning efter separat auktoriserad lansering.

Pessimistisk kvalitet om planen genomförs felfritt: **8/10** som levererad produkt, **9/10** som arbetsplan. Med redaktörspilot, juridik, godkänt innehåll, riktig staging-preview och produktionsfältdata: **9–9,5/10**.
