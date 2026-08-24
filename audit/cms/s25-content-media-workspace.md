# S25 – innehåll, bilder och kategorier i Arbetsyta

Datum: 2026-08-23  
Status: PASS lokalt; integrerad i Arbetsyta.

## Redaktörens enkla väg

1. **Redigera innehåll** – välj projekt och språkversion, ändra vanliga projekt-, SEO- och sammanfattningsfält och spara till kladd.
2. **Granska bilder** – se faktisk asset-förhandsvisning, alt-text, kredit, rättigheter och dimensioner. Ersättning/uppladdning öppnas i Sanitys säkra bildfält.
3. **Kategorier** – skapa eller redigera befintliga projektfilter på svenska och engelska, välj kompletta projektpar, ordning och synlighet. Samma `filterCategory`-modell används av grid och navigation; ingen parallell kategoriuppsättning skapades.
4. **Kontrollera sidan** – växla sedan till den skyddade previewn och kontrollera layouten. Den är medvetet blockerad tills en autentiserad preview-origin har konfigurerats.

## Säkerhetsgränser

- Alla skrivningar går till `drafts.*`; publicerad version och originalasset ändras aldrig direkt.
- Att ta bort bild innebär endast att referensen tas bort från kladden. Återställning finns så länge ingen senare ändring har gjorts; asseten raderas aldrig.
- Portable Text, referenser och Sanitys assetväljare använder native-formuläret för att behålla schemavalidering och uppladdningsflöde. Det är en tydligt märkt avancerad reservväg, inte det dagliga arbetssättet.
- Inga kategorier, projektfakta, översättningar, bildkrediter eller rättighetsuppgifter har skapats eller ändrats automatiskt.

## Verifiering

- `node --test scripts/check-cms-content-workspace.js` – PASS: full fälttäckning, draft-only, säker mediaborttagning/återställning, mobil/zoom-layout och återanvänd filtermodell.
- `npm --prefix cms/studio exec tsc -- --noEmit` – PASS.
- `npm --prefix cms/studio exec eslint -- components/studioTools.tsx components/workspace-shell features/content features/analytics --max-warnings=0` – PASS.
- `npm --prefix cms/studio run build` – PASS.

Extern granskning återstår för verklig Studio-inloggning, autentiserad frontend-preview och publicering. Ingen Sanity-mutation, assetborttagning, push eller deploy utfördes av S25.
