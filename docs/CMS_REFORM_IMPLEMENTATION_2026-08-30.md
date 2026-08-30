# CMS-reform: genomförande

## Levererat

- Arbetsytan har fyra tydliga delar: **Projekt**, **Filter och ordning**, **Förhandsvisning** och **Resultat**.
- **Skapa nytt projekt** skapar svenska och engelska kladdar i en transaktion. Texter fylls alltid i separat per språk.
- Projektredigeraren innehåller: Projektnamn, Byggnadsår, Plats, Byggherre, Arkitekt, Handläggare, Medarbetare, Landskap, Foto, Konstnärlig utsmyckning, Bruttoarea och Löptext.
- **Kortbilder** består av exakt Kortbild 1 och 2. De blir de två första bilderna i bildspelet. **Övriga bilder i bildspelet** visas därefter och kan ordnas, granskas eller lossas från kladden utan att asseten raderas.
- Bilddata, slug, språknyckel och kortbakgrund är gemensamma för språkparet. Svensk bilddata används automatiskt i engelsk webbbyggning; svensk text kopieras aldrig till engelska.
- Kortbakgrund är en säker förinställning från Esencials befintliga kortytor och påverkar endast projektkortet.
- Filter har medlemskap, egen ordning, drag-sortering och tillgängliga Upp/Ned-knappar. Position 1 är uppe till vänster, 2 uppe till höger och 3 under position 1.
- Den publika byggaren behåller originalbilder, responsiva bildvarianter och LCP-prioriterar endast första synliga kortbilden.

## Verifierat

- Studio TypeScript-kontroll, Studio-byggning och interna Studio-tester.
- CMS-, layout-, tillgänglighets-, innehålls- och CI-kontroller.
- Full webbbyggning med SEO, internationell SEO, strukturerad data, semantik och bildgrindar.
- Playwright-test för filter, startordning, per-filter-ordning, tangentbordsansluten interaktion och återgång till startvyn: 6/6 godkända.
- Responsiva CMS-kontrakt: 375 px, surfplatta, desktop, 200 %-motsvarande omflöde, lång svensk/engelsk text och minskad rörelse.

## Extern kontroll före publicering

1. Logga in i Studio och öppna **Arbetsyta**. Den lokala automatiserade Studio-kontrollen stoppades korrekt på Sanitys inloggningsskärm; den kan inte använda en persons konto.
2. Kontrollera ett riktigt projekt i varje av de fyra delarna, särskilt bildbyte och språkpar.
3. Publicera endast efter Studio-validering och kontroll i den skyddade staging-previewn.
4. Publicerad webb, DNS och hemligheter har inte ändrats av denna reform.

Skärmbilder av den autentiseringsspärrade Playwright-körningen finns lokalt i `screenshots/cms-reform/` och ska inte behandlas som ett ersättningsbevis för en inloggad redaktionell kontroll.
