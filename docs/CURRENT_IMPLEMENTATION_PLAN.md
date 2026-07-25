# Aktuell genomforandeplan - Esencial

**Galler fran 25 juli 2026.** Denna plan ersatter tidigare beslut om Matomo for det nya stagingflodet. Den nuvarande live-domanen, DNS och hosting ligger utom scope tills ett separat, skriftligt lanseringsbeslut finns.

## Fast riktning

| Omrade | Beslut |
| --- | --- |
| CMS | Sanity Studio, en ensam daglig anvandare |
| Publicering | Sanity publicering -> GitHub Actions -> Vercel staging |
| Trafik | Vercel Web Analytics, aggregerad forstapartsmatning |
| Samtycke | Cookiebot Free for den aktuella stagingdomanen |
| SEO | Google Search Console for den slutliga domanegendomen |
| Backend | Endast Vercel Function for skyddad, aggregerad statistik; ingen egen databas eller server |

Vercel Web Analytics visar besokare, sidvisningar och toppsidor. Den ger inte ett tillforlitligt langtidsmatt pa aterkommande besokare; den rutan i CMS ska i stallet visas som **inte tillganglig med den valda integritetsnivan**. Vi hittar inte pa ett matt med en cookie-baserad tolkning.

## Fas 1 - Aktivera och anslut staginganalys

**Resultat:** staging samlar in anonym trafik och Cookiebot visas pa sajten.

1. Aktivera Web Analytics i Vercels Analytics-vy for `esencial-staging`.
2. Skapa Cookiebot-konfiguration for `esencial-staging.vercel.app` och spara CBID i `COOKIEBOT_CBID` for stagingprojektets Production-miljo.
3. Skapa en separat Vercel-token for den server-side lasningen och spara `VERCEL_ANALYTICS_TOKEN`, `VERCEL_ANALYTICS_TEAM_ID` och `VERCEL_ANALYTICS_PROJECT_ID` i samma miljo. Tokenen far aldrig laggas i Git eller Sanity.
4. Deploya den uppdaterade byggningen och kontrollera att `/_vercel/insights/script.js` laddas fran staging.

**Manuell aterstod:** Analytics-vaxeln och tokenen ar kontoatgarder och maste goras av kontoinnehavaren. Codex kan aldrig lasa eller spara tokenens vardet.

**Godkant nar:** Vercels Analytics-vy visar minst en stagingbesokare och Cookiebot-banner visas med korrekt sprak.

## Fas 2 - Visa verklig trafik i CMS

**Resultat:** den inramade statistikdelen i `Arbetsyta` visar vald period, besokare, sidvisningar, toppsidor och datakalla.

1. Anpassa den skyddade `/api/analytics`-funktionen till Vercels Web Analytics API.
2. Testa API:t med stagingprojektets las-token och kontrollera att 7, 30 och 90 dagar ger samma aggregerade tal som Vercel.
3. Behall strikt CORS mot `https://esencial-cms.sanity.studio` och returnera aldrig token eller individdata.
4. Publicera Studio med `SANITY_STUDIO_ANALYTICS_ENDPOINT=https://esencial-staging.vercel.app/api/analytics`.

**Manuell aterstod:** ingen, utom att data maste fa samlas in efter Fas 1.

**Godkant nar:** Studio visar data eller ett tydligt tomt lage - aldrig exempeldata eller missvisande aterkommande-besokare.

## Fas 3 - En arbetsyta for den enda webbredaktoren

**Resultat:** vardagsarbetet kraver bara fliken `Arbetsyta`.

Layouten pa dator ska vara:

```text
VANSTER, cirka halva vyn        HOGER
Stor inramad redigering         Liten preview av aktiv sektion
text, SEO och bildfaltet        Inramad kompakt statistik
hero | galleri | planritning

Nedtill over hela bredden: arbetsoversikt | struktur | projektinformation | publiceringsstatus
```

1. Samla projektredigering, startsida, publiceringsstatus och statistik pa samma sida.
2. Behall tydliga, separata bildzoner for projektskort/huvudbild, galleri och planritningar.
3. Visa aktiv bild/textrads placering i previewn och bygg mobil/desktop-val i samma yta.
4. Lat dragordning, alt-text, bildkredit och rattsbekraftelse vara direkt tillgangliga utan att lamna arbetsytan.

**Manuell aterstod:** redaktoren gor en pilot med tva riktiga projekt och bekräftar att benamningar och bildplacering motsvarar vardagsspraket.

**Godkant nar:** en person kan uppdatera bild, planritning och svensk/engelsk text, forhandsgranska och publicera utan instruktioner fran utvecklare.

## Fas 4 - SEO-data och kvalitetskontroll

**Resultat:** CMS visar organisk utveckling, och publicering stoppar trasigt innehall.

1. Nar den framtida produktionsdomanen ar klar: skapa eller anvand Search Console-egendomen for den riktiga domanen, inte staging.
2. I Google Cloud: aktivera Search Console API, skapa service account, ge den `Restricted` lasbehorighet i Search Console och lagra JSON-nyckeln enbart som Vercel-hemlighet.
3. Anslut `GOOGLE_SEARCH_CONSOLE_SITE_URL` och `GOOGLE_SERVICE_ACCOUNT_JSON` till statistikfunktionen.
4. Kor Playwright for desktop och mobil i Studio, och testa ett lyckat publiceringsflode plus saknad alt-text, saknad oversattning och tom CMS-export.

**Manuell aterstod:** Search Console-agande och Google Cloud-nyckel maste skapas i agarkontot. Andra inte DNS for detta stagingarbete.

**Godkant nar:** CMS visar Search Console-klick, visningar, CTR, position, toppsidor och sokfraser med synlig datakallaforklaring.

## Fas 5 - Lanseringsberedskap, inte lansering

**Resultat:** ett skriftligt go/no-go-underlag finns fore senare domanbyte.

1. Kontrollera mobil/dator, sidor, bildrattigheter, cookieflode, sitemap, canonical, hreflang, JSON-LD och rollback.
2. Dokumentera den senast godkanda Vercel-deployen som rollback.
3. Planera doman/DNS-andringen som en egen godkand aktivitet och anslut Cookiebot samt Search Console till produktionsdomanen da.

**Godkant nar:** det finns en godkand stagingversion och en reproducerbar rollback. Ingen DNS- eller live-andring goras i denna fas.
