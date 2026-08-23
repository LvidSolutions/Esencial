# Esencial CMS – kort redaktörsguide

## Börja i Arbetsyta

`Arbetsyta` är den dagliga redaktörsvyn. Läs den uppifrån och ned:

1. **Projekt och filter**
2. **Live preview**
3. **Analys och samtycke**

Använd länkarna högst upp för att hoppa till ett avsnitt. Allt går att använda med tangentbord. En blå fokusram visar vilket fält eller vilken knapp som är aktiv.

## Kladd är inte publicering

Knappar som heter **Spara … som kladd** ändrar bara ett Sanity-kladd. Den publicerade webbplatsen påverkas inte.

När en ändring finns i formuläret men ännu inte är sparad visas texten **Osparade … ändringar finns**. Då är byte av projekt eller kategori och länken till publiceringsvyn tillfälligt spärrade, så att inget tappas bort.

- Välj **Spara … som kladd** för att behålla ändringen.
- Välj **Återställ laddade …** för att gå tillbaka till de senast inlästa värdena. Det fungerar även om ett obligatoriskt fält har blivit tomt och därför inte kan sparas.
- **Läs om kladdar** hämtar innehållet på nytt efter ett läs- eller anslutningsfel.

Slutlig publicering sker separat i Sanitys fullständiga dokumentvy. Lös alla valideringsfel och gör faktakontroll, språkgranskning och stagingkontroll innan Sanitys vanliga publiceringsknapp används.

## Projektrubriker

Välj ett befintligt svenskt/engelskt projektpar. Redigera bara rubriken för det språk som fältet gäller. Arbetsytan skapar inte översättningar, språkpar eller projektfakta.

Om ett språk saknas öppnar du den fullständiga dokumentvyn och kopplar ett redan godkänt underlag. Gissa aldrig en översättning eller ett projektnamn för att komma förbi en varning.

## Filter, medlemskap och ordning

Filter kräver en godkänd svensk etikett, engelsk etikett, unik ordning och minst ett bekräftat publicerat språkpar. Medlemskap skapas bara genom dina uttryckliga val.

I projektrutnätet:

- **Visa** bestämmer om paret ingår i kladdkonfigurationen.
- **Upp** och **Ned** ändrar ordning och fungerar med tangentbord.
- **Ta bort från kladd** tar bara bort raden ur den lokala kladdkonfigurationen. Det raderar inget projekt och publicerar ingenting.
- **Återställ laddat rutnät** återgår till senast inlästa inställningar.

Slå inte på den redaktionella konfigurationen förrän rubriker, etiketter, medlemskap och hela ordningen är granskade. Om konfigurationen saknas, är avstängd eller ogiltig används den befintliga webbplatsen oförändrad.

## Live preview

Välj innehållsvy, rutt och fast bredd för dator, platta eller mobil. Ett breddbyte startar en ny kontroll av den skyddade sessionen.

Texten **Lokal layoutfixtur – inte autentiserad frontendpreview** betyder att vyn bara kan hjälpa till att hitta enkla text- och mediaproblem. Den bevisar inte verklig staging, riktig DOM/CSS, bilder eller autentisering och får aldrig godkännas som preview.

Redaktionellt godkännande kräver att en behörig redaktör använder en skyddad stagingmiljö och ser **Skyddad session verifierad**. Kontrollera verkliga svenska och engelska sidor i dator-, platt- och mobilbredder samt vid 200 % zoom. Klippning, överlappning, horisontell sidscroll, trasig media eller annan blockerande diagnostik måste lösas.

## Analys och samtycke

Statistikvyn visar bara strikt kontrollerad verklig leverantörsdata. **Inte ansluten**, **ingen data** och **fel** är riktiga lägen; gamla värden, exempel och uppskattningar används inte som reserv.

**Summa dagliga besökare** är summan av dagarnas värden. Samma person kan räknas flera dagar, så måttet är inte periodunika personer. Återkommande besökare är inte tillgängligt med den valda integritetsnivån.

Aktivera inte statistik eller samtyckestjänst innan behörig ägare/jurist har godkänt personuppgiftsansvarig, ändamål, kategorier, leverantörer, svensk och engelsk information samt lagringstid. CORS är inte inloggning eller API-autentisering.

## Om något går fel

- **Laddar**: vänta tills läsningen är klar.
- **Sparar kladd**: låt knappen vara inaktiv tills svaret kommer.
- **Senaste läsning eller sparning är klar**: serversteget är klart; kontrollera ändå formulärens egna meddelanden om osparade värden.
- **Fel**: följ återställnings- eller försök-igen-vägen. Felmeddelandet ska säga att ingen publicerad version ändrades.
- **Blockerad**: den visade orsaken måste lösas före godkännande.
- **Inte tillgänglig**: extern konfiguration eller behörighet saknas; inga reservvärden ska användas.

Skriv aldrig in token, lösenord eller leverantörsnycklar i Studio, webbadresser, dokument eller supportmeddelanden.

## Mänskliga steg före driftsättning

Följande kan inte godkännas av den lokala testen:

- verklig skyddad stagingpreview med behörig session;
- slutliga projektfakta, översättningar, filteretiketter och medlemskap;
- bildkrediter, rättigheter och bildval;
- personuppgiftsansvarig, juridisk text, kategorier, leverantörer och lagringstid;
- aktivering av Cookiebot, Vercel Web Analytics eller Search Console;
- Studio-/webbdeploy och produktionspublicering.
