# S24 – Studio information architecture and visual polish

Status: PASS

## Baslinje och avgränsning

- Worker: W1 / Worker A
- Gren: `codex/worker-a-s24`
- Baslinje/integrations-SHA: `d518ec6b04df1efca1bd7aea0645b98faa74f41e`
- Startstatus: ren worktree; `node orchestration/status.mjs --json` rapporterade S24 som effektivt `READY`, utan fel eller varningar.
- Tidpunkt för slutlig lokal validering: 2026-08-23T18:38:23+02:00 (Europe/Stockholm)
- Omfattning: endast `cms/studio/sanity.config.ts`, `cms/studio/deskStructure.ts`, `cms/studio/theme/**`, `cms/studio/components/workspace-shell/**` och denna rapport.
- Befintlig implementation som bevarats: `Arbetsyta` med S17–S19:s tre stabila funktionsgränser, Sanitys egna dokumentvalidering/publicering, skyddad preview, draft-only-skrivningar och den publika frontendens exakta identitet.

## Genomförd informationsarkitektur

`Arbetsyta` är fortsatt första och primära Studio-verktyget. Dess interna navigation använder nu vardagliga uppgifter i stället för systembegrepp:

1. **Redigera projekt**
2. **Kontrollera sidan**
3. **Följ resultat**

Navigationen benämns som tre steg, medan avsnittsrubrikerna fortfarande förklarar det faktiska innehållet. Den inbyggda Structure-funktionen finns kvar sist i verktygsordningen som **Innehåll & publicering (avancerat)**. Dess interna rubrik gör samma avancerade reserv-/säkerhetsroll tydlig. Där finns fortsatt fullständig schemavalidering, historik och den enda publiceringsvägen.

`releases.enabled` och `scheduledDrafts.enabled` är uttryckligen `false`. Därmed finns inte tre konkurrerande publiceringsmodeller för redaktören: specialverktyget sparar kladd och den avancerade native-vyn validerar/publicerar ett dokument explicit.

Det dubblerade top-level Dashboard-verktyget och dess imports är borttagna ur runtime-konfigurationen. Projekt- och användarwidgetarna kopierades inte, eftersom de är administrativ metadata och inte dagliga redaktionella köer.

## Bevarad statusinformation i Arbetsyta

Dashboardens fyra nyttiga redaktionella köer finns nu i en read-only överblick överst i `Arbetsyta`:

- **Klar att publicera** – högst 6 synliga projekt i granskningsläge.
- **Senast ändrat** – högst 6 synliga projekt.
- **Saknar SEO eller huvudbild** – högst 12 synliga pågående projekt.
- **Översättning att slutföra** – högst 12 synliga projekt utan komplett/godkänd språkparning.

Överblicken läser med `perspective: 'drafts'` och `useCdn: false`, prioriterar ett kladd framför dess publicerade tvilling och skriver aldrig till Sanity. Varje rad visar projektnamn, språk, begriplig status och lokalt formaterat ändringsdatum samt länkar till den avancerade dokumentvyn. När en kö är längre anges hur många ytterligare projekt som finns där.

Laddning, läsfel och tomma köer har explicit text. Ett läsfel säger att ingen publicerad information ändrades och erbjuder **Försök igen**. Antal/status förmedlas med text och inte enbart färg.

## Visuell och tillgänglig polish

- Esencials befintliga Roboto-baserade, monokroma identitet är bevarad med varma neutrala ytor, tunna linjer, liten radie och utan dekorativa effekter.
- Rubrikspårning och brödtextens radavstånd är semantiska tema-tokens; inga globala eller instabila Sanity-selektorer infördes.
- Statuskorten använder ett 2-kolumnsläge på stor skärm och ett vertikalt flöde på platta, mobil och 200 %-motsvarande reflow.
- Länkar och knappar är minst 44 px höga, text får radbrytas och inga köer använder egen scrollregion.
- Skip-länken går till överblicken; rubrikordningen är H1 → H2 → H3; statuskortens listor har namn och varje dokumentlänk har ett beskrivande namn.
- Synligt 3 px fokus, reduced-motion och Windows forced-colors stöds. Hover är endast en visuell förstärkning, inte den enda åtkomstvägen.
- Ingen publik fil, bild, CSS eller frontendroute ändrades.

UI/UX Pro Max-checklistan användes för slutgranskningen av semantik, kontraststrategi, 44 px-mål, fokus, textskalning, responsivitet, återkoppling och reducerad rörelse. Skill-paketets sökskript kunde inte köras eftersom dess lokala pekare löstes till den saknade katalogen `C:\Users\lucas\src\ui-ux-pro-max\scripts`; den fullständigt lästa checklistan användes direkt i stället.

## Ändrade filer

- `cms/studio/sanity.config.ts` – stänger av Releases/Scheduled Drafts, tar bort Dashboard och placerar den avancerade native-vyn sist.
- `cms/studio/deskStructure.ts` – tydlig avancerad rubrik och rättade svenska navigationsetiketter.
- `cms/studio/theme/tokens.ts` – kompletterar den befintliga typografiska tokenmodellen.
- `cms/studio/components/workspace-shell/WorkspaceShell.tsx` – lägger överblicken före de tre vardagliga arbetsstegen och flyttar skip-målet.
- `cms/studio/components/workspace-shell/contracts.ts` – vardagliga navigationsetiketter och tydligare svenska rubriker.
- `cms/studio/components/workspace-shell/workspaceShell.css` – responsiv statuslayout, fokus, forced-colors och Esencial-anpassad hierarki.
- `cms/studio/components/workspace-shell/EditorialStatusOverview.tsx` – draft-aware read-only köer med laddning/fel/tomläge.
- `cms/studio/components/workspace-shell/editorialStatus.mjs` och `editorialStatusTypes.ts` – deterministisk deduplicering och köklassificering.
- `cms/studio/components/workspace-shell/editorialStatus.test.mjs` – negativa konfigurations-, klassificerings- och återhämtningskontrakt.
- `cms/studio/components/workspace-shell/editorialStatus.visual.test.mjs` – keyboard-, touch-, responsive- och reduced-motion-bevis.
- `cms/studio/components/workspace-shell/index.ts` – exporterar statusöverblicken.
- `audit/cms/s24-studio-information-architecture.md` – denna evidens- och handoffrapport.

## Tester och exakta utfall

| Kommando | Utfall |
| --- | --- |
| `node orchestration/status.mjs --json` | PASS: giltigt register; S24 `READY`; inga fel/varningar. |
| `npm --prefix cms/studio ci` | PASS: 1168 paket; 0 rapporterade sårbarheter. |
| `npm --prefix cms/studio run build` | PASS: Sanity Studio production build. |
| `npm exec -- tsc --noEmit` från `cms/studio` | PASS: 0 TypeScript-fel. |
| `npm exec -- eslint .` från `cms/studio` | PASS: 0 lintfel. |
| `corepack pnpm run check-studio-workspace` | PASS: 30 schema/workspace/export-skydd; ingen direkt canonical-mutation eller browser-secret. |
| `node scripts/check-cms-ux.js` | PASS: 8 fall på 375 px, 768 px, 1440 px och 200 %-motsvarande reflow; lång sv/en-text, keyboard, återställning samt loading/saved/error/blocked/unavailable och reduced motion. |
| `node --test cms/studio/components/workspace-shell/editorialStatus.test.mjs cms/studio/components/workspace-shell/editorialStatus.visual.test.mjs` | PASS: 5 tester; draft-deduplicering, fyra köregler, borttaget Dashboard, avstängda releasefunktioner, avancerad reservvy, läsfel/tomläge, 44 px, fokus, 375/768/1440/200 % och reduced motion. |
| `git diff --check` | PASS: inga whitespace-fel. |

Rotkommandot rapporterade en engine-varning eftersom denna worker kör Node `v24.16.0` medan repositoryts rotpaket anger Node `22.x`. Alla S24-kommandon passerade; S28:s slutvalidering ska enligt planen köras uttryckligen på Node 22.

## Coordinator-hotspots och rekommenderad integration

S24 ändrade inte delade hotspots. W0 bör vid integration göra följande små, separata justeringar:

1. Ta bort de nu oanvända paketen `@sanity/dashboard` och `sanity-plugin-dashboard-widget-document-list` ur `cms/studio/package.json` och `cms/studio/package-lock.json`.
2. Uppdatera `scripts/check-studio-workspace.js` så att den kräver `releases: {enabled: false}`, `scheduledDrafts: {enabled: false}`, frånvaro av Dashboard samt den avancerade Structure-etiketten.
3. Förenkla den synliga introduktionen i `cms/studio/components/studioTools.tsx`. Föreslagen vardaglig text: `Börja med att redigera projekt. Kontrollera sedan sidan och följ resultaten längre ned.` Publiceringsskyddet bör undvika `native-publicerade` och `stagingbygge`, men fortfarande säga att kladd inte ändrar den publicerade sajten och att externa skydd måste verifieras.

Rekommenderad mergeordning: integrera S24 före S27 och låt W0 göra hotspotjusteringarna konfliktmedvetet efter S24/S25/S26-handoffs.

## Begränsningar, externa behov och förbjudna åtgärder

- Ingen lokal S24-blockerare återstår.
- Autentiserad skyddad stagingpreview är fortsatt `BLOCKED_HUMAN` tills godkänd HTTPS-origin/session finns; detta är inte ett S24-krav och lokala fixturer räknas inte som exakt preview.
- En autentiserad visuell genomgång med verkliga Sanity-dokument utfördes inte, eftersom workerfasen inte ska använda extern session eller skriva data. Production build samt deterministiska layout-/UX-tester är lokalt gröna.
- Ingen push, deploy, Studio-publicering, Sanity-write, datasetändring, leverantörsaktivering eller publik frontendändring utfördes.

## Commit

En sammanhängande lokal `CMS-S24 PASS`-commit skapas efter denna rapport. Dess SHA returneras separat till W0; ingen merge eller push görs av workern.
