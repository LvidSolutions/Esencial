# Statistikpanelen – Matomo Cloud och Google Search Console

`Webbplatsens utveckling` visar bara verklig, aggregerad data. Innan en källa är ansluten visas ett tydligt tomt läge; den använder aldrig exempeldata.

## Beslutad lösning

- **Matomo Cloud** ger besök, unika besökare, sidvisningar, toppsidor och återkommande besökare.
- **Google Search Console** ger organiska klick, visningar, CTR, position, toppsidor och sökfraser.
- **Cookiebot** laddar Matomo först efter ett godkänt statistik-samtycke.
- `api/analytics.js` körs som en Vercel Function. Den behåller leverantörsnycklar på serversidan och returnerar bara summerade tal till Studio.

Återkommande besökare betyder unika återkommande besökare bland dem som godkänt statistikcookies. Det är medvetet inte ett mått på all trafik.

## Vercels miljövariabler

Lägg in följande i Vercels krypterade miljövariabler för **staging**. Sätt dem separat för produktion först när den nya webbplatsen ska lanseras. Värdena får aldrig ligga i Git, Sanity-dataset eller Studio-konfiguration.

| Variabel | Krävs för | Värde |
| --- | --- | --- |
| `CMS_ORIGIN` | åtkomstbegränsning | `https://esencial-cms.sanity.studio` |
| `MATOMO_TRACKER_URL` | spårning i den statiska sajten | t.ex. `https://konto.matomo.cloud/matomo.php` |
| `MATOMO_SITE_ID` | Matomo | webbplats-id från Matomo |
| `COOKIEBOT_CBID` | samtyckesbanner | Cookiebots CBID för stagingdomänen |
| `MATOMO_URL` | statistikproxy | t.ex. `https://konto.matomo.cloud` |
| `MATOMO_API_TOKEN` | statistikproxy | read-only Matomo API-token |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | SEO | exakt Search Console-egendom, t.ex. `sc-domain:example.com` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | SEO | hela service-account JSON som en krypterad hemlighet |

`.env.example` visar alla namn men innehåller inga riktiga hemligheter.

## Säker installation

1. Skapa en Matomo Cloud-egendom för den tillfälliga stagingadressen och kopiera webbplats-id samt tracker-adress.
2. Skapa Cookiebot-konfiguration för samma adress. Säkerställ att Matomo ligger i kategorin **statistics**.
3. Skapa en Matomo API-token som bara kan läsa rapporter för denna egendom.
4. Skapa ett separat Google service account med enbart scopet `webmasters.readonly`; ge dess e-postadress läsbehörighet till Search Console-egendomen.
5. Lägg miljövariablerna i Vercel och gör en ny staging-deploy. Byggsteget lägger automatiskt in Cookiebot och Matomo i HTML bara om alla tre publika spårningsvariabler finns.
6. Bygg Studio med `SANITY_STUDIO_ANALYTICS_ENDPOINT=https://<staging-adress>/api/analytics`. Den variabeln är publik och innehåller ingen hemlighet.

Matomo Reporting API används via server-till-server-POST. Studio kan inte läsa token eller Google-nyckel. Endpointen tillåter bara Studio-origin i webbläsaren och lämnar aldrig ut råa besöksdata.

## Kontroller före godkännande

- Acceptera statistikcookies och kontrollera att Matomo registrerar en sida.
- Avvisa statistikcookies och kontrollera att inga Matomo-anrop sker.
- Öppna `https://<staging-adress>/api/analytics?days=30` från en annan webbplats-origin och kontrollera att CORS blockeras i webbläsaren.
- Kontrollera att Studio visar siffror för 7, 30 och 90 dagar samt förändring mot föregående lika långa period.
- Kontrollera att inga nycklar syns i Git, Vercels build-loggar, Sanity-dokument eller Studio-kod.

Google Search Console kan ha flera dagars fördröjning. När källan saknar data ska panelen visa tomt läge eller nollor, aldrig uppskattningar.
