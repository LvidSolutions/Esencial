# Utbildningsrapport: Esencial orchestration-bootstrap

**Datum:** 22 augusti 2026
**Omfattning:** högst fem Codex-kontexter, inga workers startade
**Checkpoint:** `codex/seo-stages-1-7` vid `032bfeae23a2ec318d395bfc778d84cc542baa51`

## Resultat

Esencial har nu en säker grund för framtida parallell körning: en koordinator och fyra specialiserade workers. Grunden startar ännu inga fönster. Den läser en maskinläsbar stage-lista, kontrollerar beroenden och visar vad som är redo. Därmed kan nästa automation byggas ovanpå en verifierad sanningskälla i stället för att fem fönster gissar vad de ska göra.

Stage 1–7 låg tidigare som 267 ändrade filer utan lokal checkpoint. Ändringarna jämfördes med respektive stage-rapport och verifierades. Två byggningar gav identiskt `public/`-innehåll. Alla 56 sitemap-URL:er klarade SEO och interna länkar; 56 sidor klarade språk/metadata och semantik; 52 projektsidor klarade källkoppling; 104 bildanvändningar klarade bild-SEO; CMS-innehållet klarade 52 projekt; och Playwright klarade 40 live/lokala viewport-par samt fyra interaktionsscenarier. Arbetet sparades därefter lokalt på en egen branch. Ingen push, PR eller deployment gjordes.

## Proceduren i enkel form

1. **Stabilisera nuläget.** Först säkerställdes att det gamla SEO-fönstret var inaktivt. Smutsiga filer raderades eller gömdes inte. Endast filer som kunde kopplas till Stage 1–7 togs med i checkpointen; orchestration-runbooken hölls separat.
2. **Isolera automationen.** En ny worktree, `Esencial-orchestrator-bootstrap`, skapades från checkpointen på branchen `codex/orchestrator-bootstrap`. Automationens filer kan därför utvecklas utan att röra den tidigare arbetarens checkout.
3. **Skapa en sanningskälla.** `orchestration/stages.json` beskriver S0–S14 med status, beroenden, modell/effort, filägare, tester, rapporter och mänskliga blockerare. JSON-schemat låser strukturen till fem kontexter och fyra workers.
4. **Beräkna READY säkert.** `status.mjs` läser registryn utan att skriva. Den stoppar okända eller dubbla stage-ID:n, saknade beroenden, cykler, fel modell, DONE utan bevis, fler än fyra aktiva workers och överlappande filägarskap. `PENDING` blir endast effektivt `READY` när alla beroenden är `DONE`.
5. **Bevisa determinism.** Testsviten täcker korrekt graph, saknat beroende, cykel, READY-logik, DONE utan bevis, filkonflikt, fyra samtidiga worker-lanes, identisk JSON och att CLI-kommandot inte ändrar sina filer. Status och tester körs två gånger och resultaten jämförs före commit.

## Nuvarande workflow

```text
stages.json
    ↓ valideras
read-only statusmotor
    ↓
READY per worker-lane
    ↓ senare, efter granskning
launcher → isolerad worktree → tester → handoff → koordinator
```

S0–S7 är `DONE` med integrerade rapporter och bevis. Beroendena gör S8, S9, S10, S11 och S12 redo. Det betyder inte att fem workers får starta: det finns fyra worker-lanes, och Worker D äger både S11 och S12. En framtida launcher ska därför välja högst ett arbete per lane, exempelvis S8/B, S9/C, S10/A och S11/D, medan S12 ligger kvar i kön. S13 väntar på S8–S12 och S14 väntar på samtliga implementationssteg.

Filägande är den viktigaste säkerhetsregeln. Workers äger avgränsade filer. `package.json`, generatorn, genererade HTML-filer, gemensam CSS, workflows och andra hotspots måste integreras av koordinatorn. På så sätt undviks två korrekta ändringar som förstör varandra vid sammanslagning.

## Verifierat resultat

- Registry och schema: giltiga, inga ägandekonflikter.
- READY: S8, S9, S10, S11 och S12; S13–S14 väntar.
- Testsvit: 9/9 godkända i två separata körningar.
- Maskin-JSON: identisk i båda körningarna, SHA-256 `4b09e1b35f7344175407746df96c148eafdd94516a3b5ba7f9be805d05833dbc`.
- Read-only-bevis: Git-status och kontrollfiler var oförändrade efter körningarna.
- Workers skapade: noll.

## Vad som fortfarande kräver en människa

Automation får inte hitta på projektfakta, översättningar, bildrättigheter eller juridiska beslut. Den får inte heller skapa hemligheter, ändra DNS, skriva till Sanity production, deploya eller pusha utan separat tillstånd. Sådana behov ska bli `BLOCKED_HUMAN` med en exakt fråga. Vanliga kodfel ska däremot testas, rättas och köras om automatiskt.

## Rekommenderat nästa uppdrag

> Implementera en dry-run launcher ovanpå den validerade registryn. Välj högst en READY-stage per Worker A–D, verifiera modell/effort och filägande, och visa vilka fyra Codex-tasks och worktrees som skulle skapas. Starta inga tasks, gör inga commits utanför orchestration-branchen och gör inga externa ändringar. Lägg till tester för köordning, kraschsäker återstart, dublettskydd och BLOCKED_HUMAN. Avsluta med en granskningsbar launch-plan.

Efter att dry-run-resultatet har granskats kan en separat explicit instruktion aktivera riktig task- och worktree-skapning.
