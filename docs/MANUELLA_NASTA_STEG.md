# Esencial – manuella nästa steg

Detta är den korta checklistan för att gå från den lokala CMS-implementeringen till trygg staging. Ingen punkt nedan ska flytta `esencial.se`, ändra DNS eller ersätta den nuvarande live-webbplatsen.

## 1. Se den nya CMS-ytan lokalt nu

1. Öppna `http://127.0.0.1:3333/#/arbetsyta` i en webbläsare på denna dator.
2. Logga in med det Sanity-konto som redan har tillgång till Esencials projekt `g6xm8j7l`. Det kan vara Google-inloggning, e-post/inbjudan eller den metod som Sanity visar.
3. Välj **Arbetsyta**. Till vänster finns redigeringen och till höger förhandsvisningen. Testa dator, platta och mobil utan att publicera.
4. En ändring i Arbetsyta blir ett Sanity-kladd. Den syns inte på den publika webbplatsen förrän dokumentet publiceras och det säkra stagingbygget har lyckats.

För den tidigare Studio-versionen finns också `https://esencial-cms.sanity.studio/`; den får den nya Arbetsyta-funktionen först efter steg 3 nedan.

## 2. Verifiera GitHub och skicka upp den färdiga koden

**Inloggning som behövs:** GitHub-kontot med skrivbehörighet till `LvidSolutions/Esencial`.

1. Öppna [GitHub e-postinställningar](https://github.com/settings/emails).
2. Verifiera den e-postadress som GitHub kräver för att tillåta push.
3. Bekräfta i den här uppgiften när det är klart. Då kan Codex pusha de två lokala committerna: `b139367` och `d47f557`.
4. Kontrollera att `main` på GitHub innehåller båda committerna. Audit-filerna och de tre lokala exportmapparna följer inte med.

## 3. Publicera den nya Studio-upplevelsen

**Inloggning som behövs:** samma Sanity-konto som i steg 1, med rätt att deploya Studio.

Gör först detta efter att GitHub-pushen är klar:

```powershell
Set-Location 'C:\Users\andreas.hiller\Desktop\Lucas Lvid solutions\Esencial\cms\studio'
npm run build
npm run deploy
```

Om Sanity frågar, välj inloggning i webbläsaren. Bekräfta att deployen går till det befintliga projektet `g6xm8j7l`. Detta ändrar CMS-gränssnittet, inte live-domänen eller DNS.

Öppna sedan `https://esencial-cms.sanity.studio/#/arbetsyta` och gör ett litet kladdtest: ändra inte en publicerad text, utan kontrollera bara att projektvalet, bildzonerna och högerspaltens breddknappar visas.

## 4. Skapa separat Vercel-staging

**Inloggning som behövs:** Vercel-konto med rätt att skapa projekt. Det kan vara ditt konto under utvecklingen; det kan flyttas eller skapas om under ett Esencial-konto inför lansering.

1. Logga in på [Vercel](https://vercel.com/).
2. Välj **Add New → Project → Import Git Repository**.
3. Välj exakt `LvidSolutions/Esencial` – samma repository och samma branch, `main`.
4. Döp projektet till `esencial-staging` och behåll produktionsbranch `main`.
5. Låt `vercel.json` styra byggkommandot (`npm run build`) och utdatakatalogen (`public`).
6. Deploya utan att lägga till `esencial.se`, utan DNS-import och utan att röra det befintliga Vercel-projektet.
7. Spara den nya `https://...vercel.app`-adressen. Det är endast staging.

Kontroll efter deploy: startsida, en svensk projektsida, en engelsk projektsida och `/sitemap.xml` ska fungera på staging-adressen.

## 5. Koppla säkert CMS-publicering till staging

**Inloggningar som behövs:** GitHub-repo-administratör och Sanity-projektadministratör.

1. Skapa i Sanity en **read-only** API-token för det publicerade innehållet. Spara den aldrig i Git eller chatten.
2. I GitHub: **Repository Settings → Secrets and variables → Actions**, lägg den som `SANITY_API_TOKEN`.
3. Skapa en begränsad GitHub dispatch-token eller GitHub App-behörighet för just `LvidSolutions/Esencial`.
4. I Sanity: **Settings → API → Webhooks**, skapa en publish-webhook till:

```text
https://api.github.com/repos/LvidSolutions/Esencial/dispatches
```

Med headers:

```text
Accept: application/vnd.github+json
Authorization: Bearer <dispatch-token>
```

Och body:

```json
{"event_type":"sanity-published"}
```

5. Testa med ett redan korrekt projekt. GitHub Actions-flödet **CMS staging build** ska lyckas. Ett avsiktligt fel, exempelvis saknad synlig bildtext, ska misslyckas utan att staging ändras.

## 6. Anslut statistik först när staging fungerar

**Inloggningar som behövs:** Matomo Cloud, Cookiebot och Google Search Console. Ingen av dessa behövs för att se eller använda den lokala CMS-ytan.

1. Skapa en separat Matomo-webbplats för staging-adressen.
2. Skapa Cookiebot-konfiguration för samma staging-adress och kategorisera Matomo som statistik.
3. Skapa en read-only Matomo reporting-token.
4. Skapa ett Google service account med endast `webmasters.readonly` och ge den läsbehörighet i Search Console.
5. I Vercel staging lägger du in variablerna från `.env.example`. Tokens och service-account-JSON är serverhemligheter och får aldrig läggas i Studio eller Git.
6. Efter Vercel-adressen finns, deploya Studio igen med den publika konfigurationen `SANITY_STUDIO_ANALYTICS_ENDPOINT=https://<staging-url>/api/analytics`.
7. Bekräfta både cookie-val: avböj ska ge ingen Matomo-trafik, godkänn ska ge ett registrerat besök.

## Inloggningar du inte behöver nu

- Ingen domänregistrator eller DNS-inloggning.
- Ingen inloggning till den gamla live-hostingen.
- Inga privata API-tokens i Codex, Git, Sanity-innehåll eller chatten.

Mer detaljer och acceptanskriterier per fas finns i `docs/MASTER_DELIVERY_PLAN.md`. Staging och analytics har även egna guider i `docs/STAGING_SETUP.md` och `docs/ANALYTICS_SETUP.md`.
