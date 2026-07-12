# Statistikpanelen – extern konfiguration

`Webbplatsens utveckling` visar bara verklig, aggregerad data. Innan anslutning visar den ett tydligt tomt läge – den använder aldrig exempeldata.

## Rekommenderad första anslutning

Använd Plausible för integritetsvänlig trafikstatistik och Google Search Console för organisk synlighet. Placera `api/analytics.js` i den framtida Vercel-deployen (eller översätt samma kontrakt till den valda hostingens serverfunktion). Låt Sanity Studio anropa den säkrade endpointen via `SANITY_STUDIO_ANALYTICS_ENDPOINT` när Studio byggs om.

## Hostingens miljövariabler

Lägg in följande i hostingens krypterade miljövariabler, aldrig i Git, Sanity-dataset eller Studio-konfiguration:

| Variabel | Krävs för | Värde |
| --- | --- | --- |
| `CMS_ORIGIN` | åtkomstskydd | `https://esencial-cms.sanity.studio` |
| `PLAUSIBLE_API_KEY` | trafik | Plausible Stats API-nyckel (read-only) |
| `PLAUSIBLE_SITE_ID` | trafik | domänen som registrerats i Plausible |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | SEO | exakt Search Console-egendom, t.ex. `sc-domain:example.com` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | SEO | hela service-account JSON som en enda krypterad hemlighet |

Skapa ett separat Google service account med endast `webmasters.readonly` och ge dess e-postadress åtkomst till den aktuella Search Console-egendomen. Funktionen använder kortlivade OAuth-tokens och exponerar bara summerad statistik till Studio.

`SANITY_STUDIO_ANALYTICS_ENDPOINT` är en publik konfigurationsvariabel vid Studio-byggning och ska innehålla URL:en till serverfunktionen, exempelvis `https://preview.example.com/api/analytics`. Den är inte en hemlighet. Använd en separat preview-/CMS-origin tills hosting och domän har beslutats.

## Säkerhetskontroll före anslutning

- Verifiera att endpointen svarar med `403` från andra origins än `CMS_ORIGIN`.
- Kontrollera att inga miljövariabler hamnar i byggloggar, Git eller Sanity-dokument.
- Testa med 7 dagar; Search Console-data kan ha fördröjning.
- Plausible Stats API saknar ett jämförbart aggregerat mått för återkommande besökare. Panelen visar därför `–` i stället för en gissning. Välj senare en trafikkälla som kan ge måttet om det är ett absolut krav.

Plausible Stats API använder `POST /api/v2/query` med en read-only API-nyckel. Google Search Console använder `searchAnalytics.query` med scope `webmasters.readonly`.
