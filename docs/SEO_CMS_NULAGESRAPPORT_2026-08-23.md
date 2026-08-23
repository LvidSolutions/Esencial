# Esencial – SEO- och CMS-rapport

Den publicerade Esencial-sajten är just nu tekniskt svagare än seriösa webbplatser från exempelvis Webflow, Wix eller större arkitektkontor, eftersom startsidan uttryckligen säger `noindex, nofollow` och därför ber sökmotorer att inte indexera den. **Produktionsläget får 2/10.** Den färdigvaliderade men ännu opushade versionen på lokal `main` har däremot en ovanligt komplett teknisk grund och får **8/10 totalt, 9/10 för själva implementationen**. I en likvärdig DOM-kontroll hade den lokala Esencial-startsidan en H1, fullständiga bilddimensioner, canonical, strukturerad data och en riktig sitemap; [Webflows välkända startsida](https://webflow.com/) hade två H1-rubriker och 52 av 176 bilder utan HTML-dimensioner. Esencial är alltså bättre på vissa smala, automatiserade hygienkontroller, men inte bevisat bättre i **övergripande SEO**: Webflow och stora varumärken har mycket större länkauktoritet, innehållsmängd, historik och verklig trafik. Sådant kan inte ersättas med bra kod.

Statusdatum: 2026-08-23, Europe/Stockholm. Bedömningen skiljer strikt på **liveproduktion**, **lokal releasekandidat** och **externa data som ännu inte är anslutna**.

## Betyg

Skalan är användarens: 5/10 är normal kommersiell nivå, 7/10 bra, 9/10 nästan perfekt och 10/10 innebär att alla rimliga åtgärder både är genomförda och verifierade i verklig drift.

| Område | Betyg | Ärlig förklaring |
| --- | ---: | --- |
| Publicerad sajt idag | **2/10** | `noindex, nofollow`, fel sidsspråk, ingen H1 eller JSON-LD och inga fungerande robots-/sitemap-resurser på de förväntade adresserna. |
| Lokal teknisk implementation på `main` | **9/10** | 56 indexerbara sidor, två språk, metadata, hreflang, schema, bild-SEO, semantik, tester, CMS-skydd och reproducerbara releasegrindar. |
| Lokal helhet före lansering | **8/10** | Stark implementation men ej pushad; verklig Search Console-data, skyddad preview, redaktörsgodkännande, juridisk text och provideraktivering återstår. |
| Förväntad nivå efter godkänd lansering och anslutning | **9/10** | Nästan perfekt teknisk och redaktionell grund, förutsatt att verklig data och fältmätning bekräftar resultatet. |
| 10/10 | **Inte möjligt att hävda nu** | Kräver felfri drift, verkliga Core Web Vitals, komplett indexering, innehåll/auktoritet, konverteringsdata och fortlöpande förbättring över tid. |

En genomsnittlig kommersiell webbplats ligger enligt skalan på 5/10. HTTP Archives 2025-data visar varför teknisk disciplin skiljer ut sig: endast 48 % av mobila webbplatser hade goda Core Web Vitals, cirka 67 % hade meta description och 50 % använde strukturerad data. Den lokala Esencial-versionen har alla dessa mekanismer, men laboratorietestet visar samtidigt att startsidans mobila LCP fortfarande är cirka 5,57 sekunder och därför behöver fortsatt optimering utan ändrat motiv, beskärning eller bildkvalitet. Källor: [Web Almanac SEO 2025](https://almanac.httparchive.org/en/2025/seo) och [Web Almanac Performance 2025](https://almanac.httparchive.org/en/2025/performance).

## Vad SEO betyder i praktiken

SEO hjälper Google och andra söktjänster att:

1. hitta varje publik sida;
2. förstå språk, ämne, bilder och relationer mellan sidor;
3. välja rätt titel, beskrivning och bild i sökresultatet;
4. bedöma om sidan är snabb, stabil, tillgänglig och användbar;
5. jämföra webbplatsens relevans och trovärdighet med andra källor.

Teknisk SEO kan säkerställa punkt 1–4. Punkt 5 kräver verkligt innehåll, omnämnanden/länkar, press, projektauktoritet och användarbeteende. Google beskriver själv unika, tydliga titlar, relevanta beskrivningar, logiska webbadresser, användbara länkar och bilder nära relevant text som grundläggande: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

## Verifierat nuläge

### Publik produktion

Kontroll av `https://www.esencial.se/` den 23 augusti 2026 gav:

- `meta robots="noindex, nofollow"`;
- `lang="en"` trots svensk huvudsida;
- noll H1-rubriker;
- noll JSON-LD-block;
- en mycket lång meta description i stället för en kort sökbeskrivning;
- `/robots.txt` och `/sitemap.xml` returnerar hemsidans innehåll i stället för respektive maskinfil.

Detta förklaras av att GitHubs `origin/main` och därmed Vercel fortfarande ligger på commit `0980032` från 25 juli. Den validerade lokala `main` är 51 commits före.

### Lokal releasekandidat på `main`

Den lokala startsidan har:

- `lang="sv"`, en synlighetsanpassad H1, unik title och kort meta description;
- `index, follow`, canonical till `https://www.esencial.se/` och korrekt hreflang;
- JSON-LD och konsekvent entitetsgraf;
- riktig robots.txt och sitemap med 56 URL:er;
- 28 svenska och 28 engelska indexerbara sidor;
- 52 individuella projektsidor;
- 104 genererade bildanvändningar med alt-text, dimensioner och laddningsregler;
- 56 tillgänglighetsgranskade rutter, 216 bilder, 70 rubriker och noll kända testfel;
- 40 visuella referenspar och fyra interaktionsflöden utan avsiktlig identitetsförändring.

Full intern evidens finns i [slutvalideringen](../audit/cms/s22-final-validation.md).

## Allt som har lagts till

### Sökbar sidstruktur

- Separata, permanenta projektsidor ersätter ett enda stort JavaScriptflöde som enda sökyta.
- Varje indexerbar sida finns i sitemap och har korrekt canonical.
- Svenska och engelska sidor kopplas med hreflang, inklusive självreferens och språkpar.
- Omdirigeringar och 404-beteende testas deterministiskt.

### Metadata och sökresultat

- Unika titlar och meta descriptions byggs och kontrolleras.
- Open Graph/social metadata följer sidans faktiska innehåll.
- Rubrik och synlig huvudrubrik hålls semantiskt konsekventa. Google använder flera av dessa signaler när en title link skapas: [Google om title links](https://developers.google.com/search/docs/appearance/title-link).

### Strukturerad data

- Organisation, webbplats, webbsida, brödsmulor och projektentiteter bildar en sammanhängande JSON-LD-graf.
- 52 projekt representeras som `CreativeWork` med stabila identifierare.
- Kvalitetsgrindar stoppar brutna referenser och dubbla identiteter.

### Semantik och tillgänglighet

- En H1 per sida, logisk rubrikordning, landmärken och begripliga länkar.
- Tangentbordsåtkomst, synlig fokusram, responsiv reflow och reducerad rörelse.
- Tillgänglighet hjälper människor direkt och gör samtidigt sidans struktur tydligare för sökmotorer.

### Bilder och LCP

- Responsiva bildvarianter, dimensioner och reservutrymme minskar onödiga överföringar och layoutskiften.
- 51 fotografiska derivat håller SSIM minst 0,975; sämsta uppmätta värde är 0,9756.
- 27 ritningar är förlustfria.
- Inget motiv, bildval, utsnitt, beskärning eller visuell inramning har ändrats.
- Fortsatt LCP-arbete får endast ändra leveransordning, prioritet, format/variantval, cache och responsiv storlek. Den synliga bildupplevelsen är en blockerande acceptansregel.

### Sanity CMS

- Svenska och engelska projektdokument med översättningskoppling och publiceringsstatus.
- Projektfakta, längre text, relaterade projekt, SEO-fält och publiceringschecklista.
- Huvudbild, galleri och planritningar med alt-text, kredit och rättighetsbekräftelse.
- Filterkategorier, medlemskap, rutnätsinkludering och ordning.
- En Esencial-anpassad `Arbetsyta` med projekt/filter, preview, layoutdiagnostik, statistik och samtyckesstatus.
- Alla anpassade skrivningar går till `drafts.*`; publicerad data ändras inte av specialverktyget.

### Analys, integritet och uppföljning

- Vercel Web Analytics är förberett för besök/sidvisningar.
- Google Search Console är förberett för klick, visningar, CTR, position, sidor och sökfraser.
- Hemligheter stannar i serverfunktionen `api/analytics.js`.
- Fel, tom data och ej ansluten provider visas ärligt; exempelvärden används aldrig.
- Statistik får inte laddas före ett giltigt samtycke och valet ska kunna återkallas.

Google rekommenderar Search Console som källa för vad som händer **i Google-sökningen** och Google Analytics för beteende **inne på webbplatsen**. Den nuvarande lösningen använder Search Console + Vercel Analytics, vilket täcker SEO-trend och integritetsvänlig webbtrafik utan att införa GA4 i onödan: [Google om Search Console och Analytics](https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console).

### Kvalitets- och releasekontroller

- Automatiska tester för SEO, språk, schema, semantik, bilder, länkar, tillgänglighet, prestanda, samtycke och CMS.
- Visuell parity med Playwright före godkännande.
- CI stoppar saknade, överhoppade eller omordnade grindar.
- Ingen produktionspublicering sker automatiskt från ett CMS-kladd.

## Sanity Studio – beslut och korrigeringskrav

### Releases tas bort

`Releases` bör tas bort tillsammans med `Scheduled Drafts`. Funktionen är gjord för samordnad/schemalagd publicering av många dokument och är dessutom planberoende. Esencials nuvarande arbetsflöde använder vanliga kladdar, explicit dokumentvalidering och en enkel publiceringsväg. En extra release-modell skapar två konkurrerande publiceringsbegrepp utan ett verifierat behov. Sanity stödjer uttryckligen `releases.enabled: false` och `scheduledDrafts.enabled: false`: [Sanity Content Releases configuration](https://www.sanity.io/docs/studio/content-releases-configuration).

### Structure-funktionen behålls men byter namn

Den synliga sektionen **Structure** ska inte finnas kvar under det tekniska namnet. Själva funktionen ska däremot behållas och heta **Innehåll & publicering**, eftersom den är Sanitys inbyggda, schemastyrda dokumentredigerare. Den ger redan alla textfält, bildgranskning, uppladdning/byte/borttagning, validering, historik och den säkra publiceringsknappen. Sanity beskriver Structure som verktyget för att bläddra bland och redigera dokument: [Sanity Studio tools](https://www.sanity.io/docs/studio/tool-api-reference).

Att ta bort funktionen innan Arbetsyta har full fält- och mediafunktion skulle göra produkten sämre och bryta kravet att allt innehåll ska kunna ändras. Målet blir därför:

1. `Arbetsyta` är den primära, sammanhängande dagliga vyn.
2. Alla projekttexter, SEO-fält och bilder ska kunna nås och ändras där med tydlig kladdstatus.
3. `Innehåll & publicering` är den fokuserade säkerhets- och reservvyn för full schema-validering och slutlig publicering.
4. Det separata Dashboard-verktygets nyttiga statuslistor flyttas in i Arbetsyta; därefter tas den dubblerade toppnivån bort.

### Text och bilder

Varje redigerbart textfält ska ha synlig etikett, tecken-/layoutvägledning, osparat/sparar/sparat/fel-status och säker återställning. Bildfält ska visa aktuell bild och metadata samt erbjuda Sanitys inbyggda väljare för uppladdning/befintlig bild, byte och borttagning. Destruktiva bildåtgärder ska vara separerade och tydliga; publicerad data får inte muteras direkt. Sanitys bildfält lagrar en referens till originalasseten och stödjer inbyggd asset-hantering: [Sanity image type](https://www.sanity.io/docs/studio/image-type).

### Exakt live-preview

En lokal layoutfixtur är inte tillräcklig. Godkänt läge kräver den verkliga frontendens DOM, CSS, fonter och bilder med `drafts`-perspektiv, `useCdn: false`, autentiserad server-side läsning och liveuppdatering. Klick-i-preview ska kunna öppna rätt dokument/fält. Detta följer Sanitys Presentation-/Visual Editing-kontrakt: [Sanity Presentation configuration](https://www.sanity.io/docs/visual-editing/configuring-the-presentation-tool).

Det användaren skriver sparas som kladd och visas direkt i preview. Den publika sajten ändras först när redaktören uttryckligen publicerar och ett godkänt bygge/deploy sker. Automatisk produktion per tangenttryckning vore osäkert och är inte samma sak som live-preview.

### Statistikgraf

Den befintliga statistikvyn har mätkort och tabeller men ingen tidsserie. Den ska kompletteras med en kompakt, responsiv linjegraf för 7/30/90 dagar som visar:

- organiska klick och Google-visningar från Search Console;
- besök/sidvisningar från Vercel Analytics;
- jämförelse med föregående period;
- källa, uppdateringstid och databegränsning;
- tangentbordsnåbara datapunkter och en tabell/textsammanfattning som alternativ till grafen;
- ärliga tom-, laddnings- och fellägen.

Grafen får aldrig antyda att SEO ensam orsakade en förändring. Den visar korrelation över tid. Kampanjer, säsong, publiceringstakt, press och andra händelser kan påverka trafiken.

## Externa anslutningar som återstår

Kod finns, men aktuell miljö har inga aktiva provider-variabler. För verklig anslutning krävs ägaråtgärder:

| System | Krävs |
| --- | --- |
| Google Search Console | Verifierad egendom för `https://www.esencial.se/`, ett servicekonto med endast läsrätt samt servervariablerna `GOOGLE_SEARCH_CONSOLE_SITE_URL` och `GOOGLE_SERVICE_ACCOUNT_JSON`. |
| Vercel Web Analytics | Aktivering i rätt produktionsprojekt och servervariablerna `VERCEL_ANALYTICS_TOKEN`, `VERCEL_ANALYTICS_TEAM_ID`, `VERCEL_ANALYTICS_PROJECT_ID`. |
| Studio-endpoint | `SANITY_STUDIO_ANALYTICS_ENDPOINT` till skyddad `/api/analytics` och exakt `CMS_ORIGIN`. |
| Preview | Exakt HTTPS-stagingorigin, preview-read-token endast server-side, autentiserad session, CORS och noindex/no-store. |
| Samtycke/juridik | Godkänd personuppgiftsansvarig, ändamål, kategorier, leverantörer, lagringstid och svensk/engelsk text. |

Inga kontonycklar får skrivas i Sanity-dokument, frontendkod, URL:er eller rapporter.

## Prioriterad väg till 9/10

1. Genomför Studio-korrigeringarna och alla lokala tester.
