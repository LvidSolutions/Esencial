# Statistik, samtycke och integritetskontroller

Status: tekniska kontroller finns lokalt; kontoaktivering, publik information och juridiskt godkännande återstår.

`Analys och samtycke` visar bara verklig, aggregerad leverantörsdata. En källa som inte är ansluten, saknar data eller ger fel har ett eget synligt läge. Tidigare värden, exempelvärden och uppskattningar används aldrig som reserv.

## Beslutad teknisk lösning

- **Vercel Web Analytics** ger sidvisningar, summa dagliga besökare och toppsidor. `api/analytics.js` använder den publika Web Analytics-API:ns `visits/aggregate` grupperad per dag för 7, 30 och 90 dagar. Varje dags besökarvärde summeras till `dailyVisitorsSum`; samma person kan därför räknas en gång per dag och flera gånger under en period. Aktuell och föregående period beräknas på exakt samma sätt.
- **Google Search Console** är en senare, valfri källa för den slutliga produktionsdomänen. Den ger klick, visningar, CTR, position, toppsidor och sökfraser. Search Console kan utelämna detaljrader och slutlig data har normalt några dagars fördröjning.
- **Cookiebot by Usercentrics** är den valda samtyckestjänsten. S19:s publika kontroll använder Cookiebots dokumenterade SDK-metoder men laddar inte Vercels statistikresurs förrän ett aktuellt, versionsgiltigt och maskinellt icke-utgånget statistikval både finns lokalt och har synkroniserats med Cookiebot.
- `api/analytics.js` körs som Vercel Function. Leverantörsnycklar finns bara i servermiljön. Studio skickar ingen API-nyckel, leverantörstoken eller annan webbläsarhemlighet.

Vercels besökarvärde i en daggrupperad aggregatrad gäller den dagen. Summan av raderna är därför **summa dagliga besökare**, inte periodunika personer. Vercels besökarhash återställs dessutom dagligen, så återkommande besökare visas alltid som **inte tillgängligt med den valda integritetsnivån**. Ingen cookie-baserad eller beräknad ersättning används.

## Tre bygglägen

### 1. All konfiguration saknas

Bygget genererar ingen Cookiebot- eller Vercel-resurs. Detta är det normala lokala och CI-läget och är fail-closed.

### 2. Endast `COOKIEBOT_CBID` finns

Detta bevarar S11-kontraktet: Cookiebot laddas och Vercel-resursen ligger som manuellt blockerad `type="text/plain"` med `data-cookieconsent="statistics"`. Banner, information, version och återkallelsekontroll måste då vara korrekt konfigurerade i Cookiebot-kontot.

### 3. Full S19-konfiguration finns

Den lokala, minimala kontrollen aktiveras bara när samtliga offentliga fält nedan finns. Om en del saknas avbryts bygget i stället för att visa ofullständig information eller starta mätning.

Kontrollen:

- visar avvisa och acceptera samtidigt som två likadant utformade native-knappar;
- har endast den nödvändiga valinformationen och den valbara kategorin statistik, eftersom ingen annan icke-nödvändig kategori implementeras;
- tolkar aldrig passivitet som samtycke;
- lagrar `{version, statistics, decidedAt}` under `localStorage`-nyckeln `esencial.consent`;
- godtar bara ett kanoniskt ISO-datum som inte ligger i framtiden och vars ålder är mindre än det ägargodkända heltalsvärdet `CONSENT_CHOICE_RETENTION_DAYS`;
- raderar ogiltiga eller utgångna val, återkallar ett eventuellt kvarvarande statistikval hos Cookiebot och visar valet på nytt utan att ladda statistik;
- frågar på nytt när versionen ändras;
- visar en beständig knapp för att öppna valet igen;
- tar bort statistikskriptet, återkallar Cookiebot-valet och laddar om sidan vid återkallelse, så att redan installerade statistiklyssnare inte fortsätter;
- lämnar webbplatsen fullt användbar vid avvisning eller fel i Cookiebot;
- växlar till engelska på dokument vars `html[lang]` börjar med `en`.

Detta verifierar beteende, inte om den slutliga texten, lagringstiden eller kategoriseringen är juridiskt tillräcklig.

## Offentlig byggkonfiguration

Dessa värden hamnar i den publika sidan och får inte innehålla hemligheter. De ska godkännas av behörig ägare/jurist innan full S19-aktivering.

| Variabel | Innehåll | Blockerare |
| --- | --- | --- |
| `COOKIEBOT_CBID` | Cookiebots publika domain-group-id för exakt domän | Konto/domän får inte aktiveras av arbetsflödet |
| `CONSENT_NOTICE_VERSION` | Kort version, exempelvis ett godkänt policydatum eller revisions-id | Versionen ska kopplas till godkänd information |
| `CONSENT_CONTROLLER_NAME` | Godkänt namn på personuppgiftsansvarig | Får inte gissas från varumärket |
| `CONSENT_PRIVACY_URL` | Godkänd rot-relativ eller absolut HTTPS-länk | Integritetsinformationen måste finnas och granskas |
| `CONSENT_ANALYTICS_RETENTION` | Godkänd offentlig beskrivning av statistikens lagringstid | Beror på valt Vercel-konto/plan och avtal |
| `CONSENT_CHOICE_RETENTION` | Godkänd offentlig beskrivning av samtyckesvalets lagringstid | Ska stämma med det maskinella antalet dagar och Cookiebot-konfigurationen |
| `CONSENT_CHOICE_RETENTION_DAYS` | Ägargodkänt heltal 1–365 som maskinellt begränsar valets ålder | Teknisk maxgräns, inte ett juridiskt förslag; måste stämma med offentlig text och Cookiebot |

`scripts/inject-vercel-analytics.js` avvisar `javascript:`-länkar, HTTP-länkar, HTML-tecken i textfält, dagar utanför 1–365 och partiell S19-konfiguration.

## Servermiljö

Riktiga värden ska ligga som krypterade miljövariabler i det separata stagingprojektet. De får aldrig ligga i Git, Sanity-dataset, Studio-konfiguration eller byggloggar.

| Variabel | Krävs för | Kommentar |
| --- | --- | --- |
| `CMS_ORIGIN` | API-origin | Exakt HTTPS-origin, normalt `https://esencial-cms.sanity.studio` |
| `VERCEL_ANALYTICS_TOKEN` | Statistikproxy | Separat server-token med minsta nödvändiga läsbehörighet |
| `VERCEL_ANALYTICS_TEAM_ID` | Statistikproxy | Teamet som äger stagingprojektet |
| `VERCEL_ANALYTICS_PROJECT_ID` | Statistikproxy | Stagingprojektets projekt-id |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | Framtida SEO-data | Den slutliga produktionsdomänens Search Console-egendom |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Framtida SEO-data | Service account med endast `webmasters.readonly` |

Studio byggs efter S20 med den publika endpointadressen `SANITY_STUDIO_ANALYTICS_ENDPOINT=https://<staging-adress>/api/analytics`. Adressen är inte en hemlighet. S19-komponenten skickar `credentials: omit` och ingen `Authorization`-header.

## API-kontrakt och skydd

- Bara `GET` och en giltig CORS-preflight från exakt `CMS_ORIGIN` accepteras. Saknad, annan eller icke-HTTPS-origin nekas. CORS/origin är en webbläsargräns, inte en ersättning för autentisering; stagingens åtkomstskydd och slutliga exponeringsmodell är ett manuellt säkerhetsbeslut.
- Vercel-token skickas endast i serverns `Authorization`-header till `api.vercel.com`. Google-nyckeln används endast server-side för en kortlivad OAuth-token. Ingen hemlighet placeras i URL, CORS-svar eller CMS-data.
- Saknad leverantörsautentisering ger `unavailable`; partiella hemligheter ger HTTP 503; nekad/felaktig providerautentisering ger sanitiserat HTTP 502.
- Alla anrop har 8 sekunders timeout och kontrollerar dokumenterad svarsversion, datatyper och icke-negativa tal.
- Studio godtar inte API-svaret enbart utifrån top-level-fält. Den lokala kontraktsvakten kontrollerar tillåtna lägen, exakt 7/30/90-dagars period och sammanhängande datumintervall, kanoniska tidsstämplar, de två förväntade källorna, lägesöverensstämmelse, stränglistor, kompletta trafik-/sökrader, färskhet samt ändliga icke-negativa tal; CTR måste ligga mellan 0 och 1. Ett saknat, ofullständigt eller feltypat underfält ger det säkra felet utan att någon statistik renderas.
- Strukturerade HTTP 503/502-svar innehåller uttryckligen `traffic: null` och `search: null`, så ett legitimt konfigurations-/leverantörsfel kan visas sanitiserat samtidigt som ett felaktigt svar fortfarande nekas.
- `traffic.dailyVisitorsSum` är summan av dagradernas `visitors`, inte ett periodunikt personmått. Begränsningen finns både i API-svaret och direkt vid Studio-måttet. Jämförelsen använder samma dagliga summa för båda perioderna.
- Svaret innehåller vald/föregående period, genereringstid och senaste verkliga mätpunkt per källa. Tom källa visas som `empty`, aldrig som ett gammalt cachevärde.
- Studio validerar hela svarskontraktet före rendering: tillåtna lägen och perioder, sammanhängande datumintervall, källor, begränsningar, observationer, nästlade trafik-/sökfält, rader, freshness och ändliga icke-negativa mått. Felaktiga eller ofullständiga svar stoppas utan att gamla eller delvisa siffror visas.
- Funktionsloggen innehåller bara route, request-id, status, källäge och tid. Ingen token, provider-body eller statistikrad loggas.

## Content Security Policy

S19-kontrollen har deterministisk inline-kod och inline-stil. Om en framtida blockerande CSP införs måste den auktoriserade byggningen använda exakt SHA-256-hash från `cspHashes()` och tillåta Cookiebots dokumenterade skript-origin. En hash för en äldre samtyckesversion får inte återanvändas.

```powershell
node -e "const c=require('./scripts/inject-vercel-analytics'); console.log(c.cspHashes())"
```

Ingen blockerande CSP läggs till i S19: den befintliga statiska frontendens alla skript måste inventeras och parity-testas centralt innan en sådan shared-header kan aktiveras.

## Lokala kontroller

```powershell
node scripts/check-consent.js
corepack pnpm run check-analytics
Push-Location cms/studio
npm exec tsx -- features/analytics/analyticsClient.test.ts
npm exec tsc -- --noEmit
npm exec eslint -- features/analytics --max-warnings=0
Pop-Location
npm --prefix cms/studio run build
corepack pnpm run build
```

`check-consent.js` har positiva och negativa fixtures för pre-consent-blockering, likvärdiga val, accept, avvisning, återöppning, återkallelse, versionsbyte, lokal lagring, exakt utgångsgräns, framtida/ogiltiga datum, providerfel, kontraktet för summa dagliga besökare, CSP-hash, CMS-origin, browser-secret-isolering, idempotent injektion och S11-regression. Klockan är deterministisk i fixtures. Fixture-värden är uttryckligen testdata och används inte i byggd publik output.

`analyticsClient.test.ts` använder lokala assertions och den installerade `tsx`-köraren, så samma fil både typkontrolleras av Studio och kan köras direkt. Positiva fixtures täcker `ready`, `unavailable`, `empty` och ett komplett sanitiserat `error`-svar. Tjugoen negativa fixtures för top-level- och nästlade lägen, perioder, källor, begränsningar/observationer, trafik, sökrader, färskhet, ofullständiga fält, `NaN`/`Infinity`, negativa tal och CTR utanför intervallet visar att klienten failar stängt med det säkra felet. Testet kontrollerar även `credentials: omit` och att ingen browser-`Authorization` skickas.

## Mänskliga och externa blockerare

Följande ingår inte och får inte markeras som godkänt av automatiska tester:

1. fastställa personuppgiftsansvarig och kontaktuppgifter;
2. godkänna svenska/engelska ändamål, kategori, leverantörslista och full integritetsinformation;
3. fastställa lagringstider mot verklig Vercel-plan, Cookiebot-inställning och avtal samt godkänna att `CONSENT_CHOICE_RETENTION`, `CONSENT_CHOICE_RETENTION_DAYS` och Cookiebot anger samma gräns;
4. aktivera Vercel Web Analytics eller Cookiebot och skapa minsta-behörighets-token;
5. besluta om staging-API:ts autentiserings-/Deployment Protection-modell;
6. efter en separat auktoriserad stagingdeploy verifiera nätverk, faktisk Cookiebot-domän, språk, samtyckeslogg och jämförelse mot Vercels dashboard;
7. slutlig juridisk och redaktionell bedömning.

## Primära källor

- [PTS: Kakor (cookies)](https://pts.se/internet-och-telefoni/kakor-cookies/) – aktivt, specifikt och informerat val; avvisa och acceptera i samma vy med liknande utformning; endast nödvändig lagring utan val; enkel återkallelse.
- [IMY: tillsyn av Aktiebolaget Trav och Galopp](https://www.imy.se/tillsyner/aktiebolaget-trav-och-galopp/) – beslut om vilseledande bannerdesign och att återkallelse inte var lika enkel som samtycke.
- [EU GDPR artikel 7](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=celex:32016R0679) och [EDPB Guidelines 05/2020](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en) – villkor för samtycke och lika enkel återkallelse.
- [Cookiebot: manual cookie blocking](https://support.cookiebot.com/hc/en-us/articles/4405978132242-Manual-cookie-blocking), [developer SDK](https://www.cookiebot.com/en/developer/) och [changing or withdrawing consent](https://support.cookiebot.com/hc/en-us/articles/360003798814-Changing-or-withdrawing-consent) – `data-cookieconsent`, events, `submitCustomConsent`, `renew` och `withdraw`.
- [Vercel: Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api), [privacy and compliance](https://vercel.com/docs/analytics/privacy-policy) och [limits/pricing](https://vercel.com/docs/analytics/limits-and-pricing) – count som ett totalfrågemönster, aggregate-by-day som dagliga rader/trender, identifieringsmodell, datapunkter och planberoende rapportfönster.
- [Google: Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) – datum, dimensioner, scopes, svarsfält och begränsningar för detaljrader.

Källorna styr tekniska kontroller. De utgör inte certifiering eller juridiskt godkännande av Esencials framtida produktionskonfiguration.
