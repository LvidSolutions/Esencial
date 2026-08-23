# S26 – Google SEO- och trafiktrend i Arbetsyta

Datum: 2026-08-23

Worker: D

Start-SHA: `d518ec6b04df1efca1bd7aea0645b98faa74f41e`

Status i worker-lanen: genomförd och lokalt godkänd; väntar på koordinatorns integration och externa kontoåtgärder.

## Resultat

Den befintliga server-only-adaptern för Vercel Web Analytics och Google Search Console returnerar nu strikt validerade dagliga serier för vald period 7, 30 eller 90 dagar. Arbetsytan visar en kompakt responsiv linjegraf med verkliga leverantörspunkter, föregående period, källa och färskhet. Exakta värden kan nås med tangentbord i grafen och i en intilliggande HTML-tabell.

Ingen provider aktiverades och inga konton, Sanity-dokument, publika sidor eller produktionsmiljöer muterades. Leverantörshemligheter finns fortsatt bara i servermiljön och accepteras aldrig från webbläsaren.

## Vad redaktören ser

- Periodknappar för 7, 30 och 90 dagar med tydligt datumintervall.
- Vardagliga måttnamn och korta förklaringar: besökare, sidvisningar, klick från Google, visningar i Google, klickfrekvens och genomsnittlig plats.
- En valbar dagserie åt gången, så att mycket olika skalor inte blandas i samma graf.
- Periodsumma jämförd med föregående lika långa period.
- Källa, senaste verkliga mätpunkt och vilket slutdatum som begärdes.
- En kort sammanfattning med antal returnerade datum samt högsta och lägsta exakta värde.
- Tydliga laddnings-, tom-, fel- och ej-ansluten-lägen. Vid periodbyte tas gamla siffror bort direkt i stället för att visas under fel period.
- En uttrycklig varning att grafen visar samvariation, inte att SEO har orsakat förändringen. Kampanjer, säsong, publiceringstakt, press och andra händelser kan påverka trafik.

## Tillgänglighet och responsivitet

Grafen är ett namngivet SVG-diagram med textbeskrivning. Bara en punkt ligger i tabbordningen; vänster/höger eller upp/ned flyttar mellan dagar, medan `Home` och `End` går till första respektive sista punkten. Synlig fokusmarkering och den intilliggande värderaden visar valt datum och värde. Alla punkter finns dessutom i en semantisk tabell under **Visa exakta dagsvärden**.

Grafkort, väljare och tabell håller sig inom Arbetsytans bredd. Väljaren har minst 44 px höjd, tabellen får kontrollerad intern overflow och mobilregeln vid 40 rem staplar värderaden och ger väljaren full bredd. Ingen animation behövs; reducerad rörelse är därför oförändrat säker.

## Server- och datakontrakt

### Vercel Web Analytics

`visits/aggregate?by=day` ger datum, dagliga besökare och sidvisningar. Aktuell och föregående period valideras mot sina exakta datumfönster. Den aktuella serien returneras till Studio; föregående period används för jämförelsesumman. `dailyVisitorsSum` betyder fortfarande summan av varje dags besökarvärde och är inte periodunika personer.

### Google Search Console

Datumfrågan med dimensionen `date` ger datum, klick och visningar. Den separata totalsfrågan fortsätter ge periodens klick, visningar, CTR och viktade genomsnittsposition. Det gör att dagserien kan visas utan att låtsas att Search Consoles eventuellt utelämnade detaljrader är kompletta.

### Luckor och validering

Leverantörsrader sorteras och måste ha:

- ett verkligt kanoniskt datum inom vald period;
- högst en punkt per datum och högst en punkt per perioddag;
- strikt stigande datum i API-kontraktet;
- fullständiga, ändliga och icke-negativa mått;
- ett senaste färskhetsdatum som stämmer med seriens sista punkt.

Saknade datum lämnas som luckor. Linjen bryts där dagar saknas och inga nollor, uppskattningar eller demoresultat skapas. Dubbletter, ogiltiga datum, fel ordning, datum utanför perioden, saknade fält, negativa tal, `NaN` eller `Infinity` gör att svaret nekas helt.

## Filer

- `api/analytics.js` – dagliga provider-serier, datum-/dubblettkontroll och begränsningsinformation.
- `cms/studio/features/analytics/types.ts` – typat trafik-/sökserie-kontrakt.
- `cms/studio/features/analytics/analyticsContract.ts` – strikt browsergräns för serie, period och färskhet.
- `cms/studio/features/analytics/AnalyticsTrend.tsx` – SVG-graf, roving keyboard focus, sammanfattning och tabellalternativ.
- `cms/studio/features/analytics/trendModel.ts` – lucksegment, tangentbordsförflyttning och exakta extremvärden.
- `cms/studio/features/analytics/AnalyticsConsentFeature.tsx` – ärlig laddning, grafplacering och vardagliga måttförklaringar.
- `cms/studio/features/analytics/analyticsFeature.css` – fokus, 44 px-kontroll, responsiv graf och kontrollerad tabelloverflow.
- `cms/studio/features/analytics/analyticsClient.test.ts` – positiva svar och 29 fail-closed mutationer.
- `cms/studio/features/analytics/analyticsServer.test.mjs` – serverns provider-rader och negativa datum-/måttfall.
- `cms/studio/features/analytics/trendModel.test.ts` och `analyticsAccessibility.test.mjs` – luckor, tangentbord, tabell, enkel svenska, orsaksvarning och responsiv kontraktskontroll.
- `docs/ANALYTICS_SETUP.md` – uppdaterad drift-, data- och användningsdokumentation.

## Verifiering

| Kontroll | Resultat |
| --- | --- |
| `node orchestration/status.mjs --json` | PASS – S26 effektivt `READY` före start. |
| `npm exec tsx -- features/analytics/analyticsClient.test.ts` | PASS – ready/unavailable/empty/error och 29 negativa kontraktsmutationer. |
| `npm exec tsx -- features/analytics/trendModel.test.ts` | PASS – luckor, exakta sammanfattningar och avgränsad tangentbordsfokus. |
| `node --test cms/studio/features/analytics/analyticsServer.test.mjs cms/studio/features/analytics/analyticsAccessibility.test.mjs` | PASS – 5 tester, 0 fel. |
| `npm exec tsc -- --noEmit` | PASS. |
| `npm exec eslint -- features/analytics --max-warnings=0` | PASS. |
| `node scripts/check-consent.js` | PASS – 56 sidor samt samtycke, origin, hemlighetsisolering och S11-regression. |
| `corepack pnpm run check-analytics` | PASS – 56 sidor samt unavailable/empty/error/provider-schema och hemlighetsisolering. |
| `npm --prefix cms/studio run build` | PASS – Sanity Studio produktionsbygge. |

Worker-miljön körde Node `v24.16.0`; rootpaketet varnar för att den slutliga releasegrinden ska köras på Node 22. S26:s tester och byggsteg passerade, men koordinatorn ska enligt S28-planen upprepa hela integrationen på Node 22.

## Hotspots och avgränsning

Inga koordinator-hotspots ändrades: `cms/studio/components/studioTools.tsx`, `scripts/check-consent.js`, `.env.example` och `vercel.json` är orörda. Komponenten nås genom den befintliga analytics-funktionen och kräver därför ingen ny registrering i `studioTools.tsx`.

UI/UX-checklistan styrde en enda serie per graf, tydliga etiketter, synlig fokus, tabellalternativ, 44 px-kontroll, låg dekoration, mobil reflow och avsaknad av färg som ensam informationsbärare. Den valfria rekommendationsskriptfilen i den lokala skill-installationen var en trasig pekare; den fullständigt inlästa checklistan användes direkt och arbetet blockerades inte.

## Externa blockerare

Den aktuella lokala miljön har inga aktiva Vercel/Search Console-provideruppgifter. Verklig data förblir därför avsiktligt `unavailable` tills en behörig ägare utför följande efter separat godkännande:

1. aktiverar Vercel Web Analytics i rätt produktionsprojekt och skapar en lästoken med minsta behörighet;
2. verifierar Search Console-egendomen och ger ett servicekonto endast `webmasters.readonly`;
3. lägger servervariablerna i skyddad staging utan att exponera dem i Studio, Git eller loggar;
4. sätter godkänd `CMS_ORIGIN` och publik `SANITY_STUDIO_ANALYTICS_ENDPOINT`;
5. granskar samtycke, lagringstid, personuppgiftsansvarig och svensk/engelsk integritetstext;
6. verifierar verkliga värden mot providerernas egna gränssnitt efter en separat auktoriserad stagingdeploy.

Push, provideraktivering, deploy, produktionsmutation och juridiskt godkännande ingick inte i S26.
