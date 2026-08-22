# Statistikpanelen – Vercel Web Analytics och Search Console

`Webbplatsens utveckling` visar bara verklig, aggregerad data. En källa som inte är ansluten, inte har data eller ger fel får ett eget tydligt läge. Tidigare värden, exempelvärden och uppskattningar används aldrig som reserv.

## Beslutad lösning

- **Vercel Web Analytics** ger besökare, sidvisningar och toppsidor från Vercels offentliga, aggregerade Web Analytics API.
- **Cookiebot** är samtyckesytan. Vercels statistikskript är manuellt blockerat som `statistics` och får inte hämtas före godkänt statistiksamtycke.
- **Google Search Console** är en senare, valfri källa för den slutliga produktionsdomänen. Den ger organiska klick, visningar, CTR, position, toppsidor och sökfraser.
- `api/analytics.js` körs som en Vercel Function. Leverantörsnycklarna finns bara i servermiljön och svaret innehåller endast summerade tal och källstatus.

Vercels besökaridentifierare återställs dagligen. Därför visas återkommande besökare alltid som **inte tillgängligt med den valda integritetsnivån**. Ingen cookie-baserad eller beräknad ersättning används.

## Samtycke och statisk byggning

Utan `COOKIEBOT_CBID` genererar byggningen ingen Vercel Analytics-resurs alls. Med ett giltigt CBID genereras Cookiebot och följande manuellt blockerade resurs:

```html
<script type="text/plain" data-cookieconsent="statistics" src="/_vercel/insights/script.js"></script>
```

`type="text/plain"` förhindrar webbläsaren från att köra statistikskriptet. Cookiebot får aktivera det först när besökaren har godkänt kategorin `statistics`. En avvisning eller uteblivet val laddar därför inte Vercels statistikresurs. Slutlig bannertext, lika enkla acceptera/avvisa-val och en beständig möjlighet att ändra eller återkalla samtycke är externa och manuella godkännandepunkter.

## Servermiljö i Vercel

Lägg värdena som krypterade miljövariabler för det separata stagingprojektet. Riktiga värden får aldrig ligga i Git, Sanity-dataset, Studio-konfiguration eller byggloggar.

| Variabel | Krävs för | Kommentar |
| --- | --- | --- |
| `CMS_ORIGIN` | API-åtkomst | Exakt HTTPS-origin, normalt `https://esencial-cms.sanity.studio` |
| `COOKIEBOT_CBID` | samtycke och klientmätning | Cookiebots CBID för exakt stagingdomän |
| `VERCEL_ANALYTICS_TOKEN` | statistikproxy | Separat server-token med minsta läsbehörighet |
| `VERCEL_ANALYTICS_TEAM_ID` | statistikproxy | Teamet som äger stagingprojektet |
| `VERCEL_ANALYTICS_PROJECT_ID` | statistikproxy | Stagingprojektets projekt-id |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | framtida SEO-data | Den slutliga produktionsdomänens Search Console-egendom |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | framtida SEO-data | Service account med enbart `webmasters.readonly` |

Studio byggs senare med den publika endpointadressen `SANITY_STUDIO_ANALYTICS_ENDPOINT=https://<staging-adress>/api/analytics`. Den adressen är inte en hemlighet.

## API-kontrakt och felbeteende

- Bara `GET` och en giltig CORS-preflight från exakt `CMS_ORIGIN` accepteras. Saknad eller annan `Origin` nekas.
- Vercel-token skickas endast i serverns `Authorization`-header till `api.vercel.com`; den placeras aldrig i en URL eller ett CMS-svar.
- Perioderna 7, 30 och 90 dagar hämtas som verkliga totalsiffror och toppsidor. Alla andra periodvärden faller deterministiskt tillbaka till 30 dagar.
- Saknade nycklar ger `unavailable`, komplett källa utan mätpunkter ger `empty`, ofullständig konfiguration ger `error`, och leverantörsfel ger HTTP 502 med ett sanerat meddelande.
- Ett oväntat eller typfelaktigt leverantörssvar avvisas. Text eller saknade fält konverteras inte till trovärdiga nollor.

## Externa steg före manuell godkännande

1. Kontoägaren aktiverar Web Analytics för `esencial-staging` i Vercel.
2. Kontoägaren skapar en separat lästoken och sparar de tre `VERCEL_ANALYTICS_*`-värdena som serverhemligheter.
3. Kontoägaren skapar Cookiebot-konfigurationen för exakt stagingdomän, godkänner svensk/engelsk ändamålstext och sparar CBID som servermiljövariabel.
4. Efter en auktoriserad stagingdeploy verifieras i webbläsarens nätverkspanel att `/_vercel/insights/script.js` inte hämtas vid avvisat eller uteblivet samtycke och hämtas först efter godkänt statistiksamtycke.
5. Search Console ansluts först när produktionsdomänens egendom och ett begränsat service account har skapats av behörig ägare. Ingen DNS-ändring ingår här.

Lokalt kör `corepack pnpm run check-analytics` samtyckesfria och samtyckesgivna fixtures, dubblett/legacy-kontroll, CMS-origin, serverhemligheter samt unavailable/empty/error/success-svar. Det aktiverar inga konton och gör inga externa leverantörsanrop.
