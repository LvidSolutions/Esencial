# Fortsättningsplan: Esencial CMS och ny webbplats

**Beslutsstatus:** beslutad teknisk riktning. Planen ändrar inte nuvarande live-domän, DNS, hosting, Sanity-data eller externa konton.

## Målet

En person ska kunna uppdatera webbplatsen tryggt utan utvecklarstöd i vardagen:

```text
Uppdatera projekt i Sanity
        ↓
Kontrollera bilder, språk och SEO i Studio
        ↓
Publicera till staging automatiskt
        ↓
Kontrollera staging på dator och mobil
        ↓
Godkänn och släpp till ny produktion när den är redo
```

Personen kallas i denna plan **webbredaktör**. Det finns inga separata roller för redaktör, granskare, publicerare eller administratör i det dagliga flödet. Kontrollerna byggs i stället in i CMS, byggningen och stagingmiljön.

## Beslut som är låsta

| Område | Beslut | Varför |
| --- | --- | --- |
| Hosting | **Vercel** | Passar den befintliga statiska webbplatsen, ger preview-deployer från GitHub och kan köra den redan påbörjade serverfunktionen för analys. |
| Innehåll | **Sanity Studio** | Redan implementerat, med bildhantering, startsida, SEO och svensk/engelsk struktur. |
| Publicering | **Sanity webhook → GitHub Actions → Vercel** | Behåller statisk HTML, tydliga kvalitetsgrindar och ett granskbart byggspår. |
| Staging | **Separat Vercel-produktion på en tillfällig staging-adress** | Nuvarande live-domän lämnas helt orörd tills ersättningen är godkänd. |
| Trafik | **Matomo Cloud** | Väljs framför Vercel Web Analytics och Plausible eftersom kravet omfattar återkommande besökare, vilket kräver en varaktig förstapartsidentifierare. |
| SEO-data | **Google Search Console API** | Primär källa för klick, visningar, CTR, position, sidor och sökfraser. |
| Samtycke | **Cookiebot + Matomo cookie consent** | Ett enkelt redaktörsflöde och ett uttryckligt val för besökaren; återkommande besökare visas bara från godkänd mätning. |
| Backend | **Ingen egen databas eller egen API-server** | Sanity äger innehåll; GitHub/Vercel hanterar byggning och deploy; Vercel Functions används endast för hemliga integrationer. |

## Varför Matomo Cloud för trafik

Vercel Web Analytics är en bra, integritetsvänlig standard för sidvisningar och unika besökare, men dess besökarhash återställs varje dag. Den kan därför inte ge ett meningsfullt mått på återkommande besökare över tid. Plausibles Stats API ger aggregerade unika besökare, sessioner och sidvisningar, men exponerar inte ett särskilt mått för återkommande besökare i den aktuella API-modellen.

Matomo använder förstapartscookies för korrekt igenkänning av nya och återkommande besökare. Det kräver samtycke för denna användning; utan cookies blir just dessa mått osäkra. Cookiebot blir därför den enda extra operativa ytan för webbredaktören: kontrollera att samtyckestexten är godkänd, inte hantera data eller kod.

Matomo Cloud väljs framför egen Matomo-installation eftersom en egen instans skapar patchning, backup, databasdrift och incidentansvar som inte är rimligt för en ensamanvändare.

## Enkelt redaktörsflöde i CMS

### Så ska vardagen fungera

1. Öppna ett projekt i Sanity.
2. Lägg huvudbild, projektgalleri och planritningar i respektive sektion.
3. Dra bilder och startsidans projekt till önskad ordning.
4. Fyll alt-text, kredit och rättighetsbekräftelse.
5. Kontrollera svensk och engelsk version samt SEO-fälten.
6. Öppna Sidförhandsvisning och kontrollera placeringen.
7. Välj **Klar att publicera**.
8. Publicera och kontrollera automatiskt skapad staging-deploy.

### Förenkling som ska göras före pilot

Nuvarande arbetsläge ska förenklas visuellt till tre tydliga lägen:

- **Under arbete** – syns inte på webbplatsen.
- **Klar att publicera** – kontrollerna är uppfyllda och nästa publicering får ta med ändringen.
- **Publicerad** – innehållet finns i senast godkända deploy.

Fält för särskild granskare och roller behålls inte som ett vardagskrav. Automatiken ska visa exakt vad som måste rättas, snarare än att kräva att en andra person intygar arbetet.

## Målarkitektur

```text
Sanity Studio
  ├─ Projekt, bilder, startsida och SEO
  └─ Webhook vid publicering
            ↓
GitHub Actions
  ├─ Läser enbart publicerat Sanity-innehåll
  ├─ Stoppar tom export, språkfel, bild- och SEO-brister
  ├─ Bygger statisk HTML, sitemap, canonical, hreflang och JSON-LD
  └─ Commiterar endast godkänd byggning
            ↓
Vercel
  ├─ Staging-adress tills lansering
  ├─ Immutable deploy och enkel rollback
  └─ Vercel Function: skyddad aggregerad analysproxy
            ↓
Matomo Cloud + Google Search Console
  └─ Endast aggregerad statistik tillbaka till Studio
```

## Säkerhet och hemligheter

Följande får endast finnas i GitHub Actions- eller Vercel-miljövariabler, aldrig i Git eller Sanity:

- `SANITY_API_TOKEN` – read-only och begränsad till byggningen.
- `GITHUB_DISPATCH_TOKEN` – finmaskig token eller GitHub App-token enbart för webhook-trigger.
- `MATOMO_API_TOKEN` och `MATOMO_SITE_ID` – read-only statistikåtkomst.
- `GOOGLE_SERVICE_ACCOUNT_JSON` och `GOOGLE_SEARCH_CONSOLE_SITE_URL` – endast läsåtkomst till Search Console.
- `CMS_ORIGIN` – den exakta Sanity Studio-origin som får anropa analysfunktionen.
- `SANITY_STUDIO_ANALYTICS_ENDPOINT` – publik endpoint-adress, men aldrig en hemlighet.

Serverfunktionen returnerar endast aggregerade tal. Den ska avvisa andra origins än Studio, logga tekniska fel utan hemliga värden och aldrig lagra råa besökaruppgifter.

## Faser och accepterade resultat

### Fas 0 – Stabil grund och städning

**Mål:** göra repot till en trygg startpunkt för staging.

- Bekräfta att de orelaterade crawl-/exportfilerna är avsiktliga eller rensa dem i ett separat beslut.
- Kontrollera att GitHub Actions är grön på `main`.
- Lägg till en kort driftdokumentation med ägarskap för konton, domän och återställning.
- Förenkla CMS-statusarna till ensamanvändarflödet ovan.

**Godkänt när:** arbetskatalogen är ren, `main` är grön och en webbredaktör kan förstå publiceringsflödet utan rollfördelning.

### Fas 1 – Vercel-staging

**Mål:** publicera ersättningssajten utan att beröra live-domänen.

- Skapa ett separat Vercel-projekt kopplat till `LvidSolutions/Esencial`.
- Konfigurera byggkommando och output för den befintliga statiska sajten.
- Sätt en tillfällig Vercel- eller staging-adress som produktion för det nya projektet.
- Aktivera preview-deployer för pull requests och brancher.
- Dokumentera rollback: en tidigare lyckad Vercel-deploy ska kunna återställas utan ny byggning.

**Godkänt när:** en commit kan ge en isolerad preview och staging-adressen fungerar på dator och mobil, utan koppling till nuvarande domän.

### Fas 2 – Säkert CMS till staging

**Mål:** låta publicerat CMS-innehåll skapa en verifierad staging-build.

- Skapa read-only Sanity-token i Sanity och lagra den som GitHub-secret.
- Konfigurera Sanity-webhook med minsta möjliga GitHub-behörighet för `repository_dispatch`.
- Koppla befintlig `cms-build.yml` till stagingflödet.
- Lägg till tydlig byggstatus i Studio: lyckad, pågår eller misslyckad med nästa åtgärd.
- Kör ett avsiktligt feltest: saknad engelsk version, saknad alt-text och noll publicerade projekt ska stoppa byggningen med tydligt meddelande.

**Godkänt när:** en publicering av ett godkänt testprojekt syns på staging, och en ogiltig publicering inte ändrar staging.

### Fas 3 – Bild- och innehållspilot

**Mål:** bevisa att CMS:et är enkelt nog för den enda webbredaktören.

- Välj två till tre representativa projekt: ett bildtungt, ett med planritningar och ett tvåspråkigt.
- Migrera endast bilder med bekräftade rättigheter.
- Kontrollera ordning, fokuspunkt, alt-text, kredit, mobil beskärning och synlighet för varje bild.
- Testa startsidans prioritering oberoende av galleriets ordning.
- Genomför ett helt flöde från ny bild till staging utan utvecklarinsats.

**Godkänt när:** webbredaktören kan göra pilotflödet själv, förstå alla varningar och hitta rätt fält från Sidförhandsvisning.

### Fas 4 – Statistik och SEO-utveckling

**Mål:** fylla Studio-panelen med äkta, begripliga data.

- Skapa Matomo Cloud-egendom för staging först och installera spårning via samtyckesstyrd laddning.
- Konfigurera Cookiebot-text och samtyckesflöde; få innehåll och juridisk text godkänd av ägaren innan produktionsstart.
- Skapa separat Google service account med `webmasters.readonly` och ge den åtkomst till Search Console-egendomen.
- Byt den förberedda analysadaptern från Plausible till Matomo Reporting API och behåll samma Studio-kontrakt.
- Visa besök, unika besökare, återkommande besökare, sidvisningar, toppsidor, organiska klick, visningar, CTR, position, toppsidor och sökfraser.
- Visa alltid samtyckesbegränsning vid återkommande-besökar-måttet: det avser samtyckande besökare, inte all trafik.

**Godkänt när:** panelen visar minst 30 dagars staging- eller produktionsdata utan exempelvärden, och en felaktig/missing integration ger ett begripligt tomt läge.

### Fas 5 – Skyddad full preview (endast om piloten kräver den)

**Mål:** lägga till en verklig utkastsvy utan att exponera opublicerat innehåll.

- Behåll dagens Sidförhandsvisning som standard.
- Lägg till Vercel Preview + Sanity Presentation Tool endast om kunden behöver godkänna utkast visuellt före publicering.
- Skydda draft-mode med hemlig token och verifiera att den inte indexeras eller kan öppnas offentligt.

**Godkänt när:** klick i förhandsvisning öppnar korrekt Sanity-fält, och oautentiserade besökare aldrig ser utkast.

### Fas 6 – Produktionslansering och domänbyte

**Mål:** ersätta nuvarande webbplats först när ersättningen är bevisad.

- Kontrollera URL:er, mobilvyer, tillgänglighetsgrunder, cookiesamtycke, bilder, sitemap, canonical, `hreflang` och strukturerad data.
- Ha en namngiven rollback-deploy och instruktion på en sida.
- Frys innehåll under själva bytet.
- Ändra domän/DNS först efter skriftligt klartecken.
- Kontrollera Search Console, sitemap och tekniska fel samma dag och veckovis under första månaden.

**Godkänt när:** ingen prioriterad URL, SEO-signal eller redaktörsrutin försämras av bytet och rollback är prövad.

## Teststrategi

| Nivå | Vad testas | När |
| --- | --- | --- |
| Kod | Studio-build, statisk build, CMS-innehåll, SEO och länkar | Varje ändring |
| CMS | Bildordning, planritningsseparation, språk, alt-text och rättigheter | Varje publiceringsflöde |
| Staging | Dator, mobil, interna länkar, sitemap, metadata och 404-sidor | Före godkännande |
| Publicering | Positivt flöde och avsiktliga fel som ska stoppas | Varje ny integration |
| Drift | Vercel-loggar, webhook, analysproxy och rollback | Efter deploy och månadsvis |

Playwright ska köras mot en inloggad staging/Studio-miljö efter att rätt CORS-origin är godkänd i Sanity. Lokal Studio utan godkänd CORS-origin räcker bara för byggkontroll, inte för ett fullständigt visuellt flödestest.

## Vad som inte ska byggas nu

- Egen databas, kundinloggning eller administrativ backend.
- Realtidsuppdaterad frontend eller server-rendering.
- Egen BI-lösning, rådataarkiv eller avancerad data warehouse.
- Full Presentation Tool före att den enklare förhandsvisningen är bevisad i pilot.
- Ändring av nuvarande live-domän, DNS eller hosting före Fas 6.

## Första konkreta nästa aktivitet

Starta Fas 0 och Fas 1 i följande ordning: städa arbetskatalogen, förenkla ensamanvändarstatusen i Studio, skapa Vercel-projektet och publicera första staging-deployen. Därefter kopplas CMS-publicering till staging – inte till den nuvarande live-domänen.
