import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {chromium} from 'playwright'

const read = (path) => readFileSync(new globalThis.URL(path, import.meta.url), 'utf8')
const css = [
  read('./workspaceShell.css'),
  read('../../features/content/contentMediaWorkspace.css'),
  read('../../features/projects/projectsFilters.css'),
  read('../../features/preview/liveFrontendPreview.css'),
  read('../../features/analytics/analyticsFeature.css'),
].join('\n')

const variables = `
  --esencial-workspace-ink:#fff; --esencial-workspace-muted:#c9c9c9;
  --esencial-workspace-paper:#121212; --esencial-workspace-canvas:#000;
  --esencial-workspace-wash:#1b1b1b; --esencial-workspace-border:#474747;
  --esencial-workspace-border-strong:#777; --esencial-workspace-focus:#ffd54a;
  --esencial-workspace-focus-soft:#4a3b00; --esencial-workspace-draft-ink:#fff1a8;
  --esencial-workspace-draft-surface:#2d2608; --esencial-workspace-draft-border:#d8bb32;
  --esencial-workspace-critical-ink:#ffc1b8; --esencial-workspace-font:Arial,sans-serif;
  --esencial-workspace-measure:68ch; --esencial-workspace-heading-tracking:-.025em;
  --esencial-workspace-label-tracking:.1em; --esencial-workspace-content-line-height:1.55;
  --esencial-workspace-motion-duration:160ms; --esencial-workspace-motion-easing:ease;
  --esencial-workspace-section-space:72px;
`

const html = `<!doctype html><html lang="sv"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{${variables}} html,body{margin:0;background:#000;color:#fff;font:16px/1.55 Arial,sans-serif} ${css}
.fixture-card,.fixture-input{border:1px solid var(--esencial-workspace-border);background:var(--esencial-workspace-paper);color:var(--esencial-workspace-ink)}
.fixture-card{padding:16px}.fixture-input{width:100%;padding:10px}.fixture-button{min-height:44px;padding:10px 14px;border:1px solid #777;background:#121212;color:#fff;font:inherit}.fixture-button:focus-visible{outline:3px solid #ffd54a;outline-offset:3px}
</style></head><body><main class="esencial-workspace-shell"><div class="esencial-workspace-shell__container">
<header class="esencial-workspace-shell__header"><p class="esencial-workspace-shell__eyebrow">Esencial CMS</p><h1>Arbetsyta</h1><p class="esencial-workspace-shell__subtitle">Redigera innehåll och bilder utan visuellt brus.</p></header>
<nav class="esencial-workspace-shell__tabs"><ol><li><a href="#project">Projekt</a></li><li><a href="#filters">Filter och ordning</a></li><li><a href="#preview">Förhandsvisning</a></li><li><a href="#results">Resultat</a></li></ol></nav>
<section class="esencial-workspace-shell__section" id="project"><header class="esencial-workspace-shell__section-header"><p class="esencial-workspace-shell__eyebrow">Steg 01</p><div><h2>Projekt</h2><p class="esencial-workspace-shell__section-summary">Välj och redigera ett projekt.</p></div></header><div class="esencial-content-media"><div class="esencial-content-media__picker"><div class="esencial-content-media__actions"><button class="fixture-button">Skapa nytt projekt</button></div><div class="esencial-content-media__project-select"><label>Projekt att redigera<select><option>Ett långt projektnamn · SV · Kladd</option></select></label><p>Byt projekt här utan att få en stor kortlista i vägen.</p></div></div><div class="esencial-content-media__form-grid"><fieldset class="esencial-content-media__fieldset"><legend>Text</legend><label>Projektnamn<input class="fixture-input" value="Exempel" readonly></label></fieldset><fieldset class="esencial-content-media__fieldset"><legend>Kortbilder</legend><div class="esencial-content-media__media-grid"><div class="fixture-card esencial-content-media__media-card"><div class="esencial-content-media__preview-missing">Kortbild 1</div><button class="fixture-button">Ersätt via Sanity</button><button class="fixture-button">Ta bort referensen</button></div><div class="fixture-card esencial-content-media__media-card"><div class="esencial-content-media__preview-missing">Tidigare bild</div><button class="fixture-button">Byt bildadress</button><button class="fixture-button">Ta bort referensen</button></div></div></fieldset></div></div></section>
<section class="esencial-workspace-shell__section" id="filters"><header class="esencial-workspace-shell__section-header"><p class="esencial-workspace-shell__eyebrow">Steg 02</p><div><h2>Filter och ordning</h2></div></header><div class="esencial-projects-feature"><div class="esencial-projects-feature__heading-block"><h3>Projekt, filter och rutnätsnavigation</h3><span>Ändra rubriker, skapa filter och ordna projekt utan att rubriken och förklaringen hamnar på samma rad.</span></div><fieldset class="esencial-projects-feature__fieldset"><legend>Nytt filter</legend><label class="esencial-projects-feature__check-row"><input type="checkbox"> Projekt med lång titel</label><button class="fixture-button">Spara filter</button></fieldset><div class="esencial-projects-feature__heading-block"><h3>Filterkategorier och navigation</h3><span>Välj projektpar och använd samma källa för både filter och rutnät.</span></div><div class="esencial-projects-feature__heading-block"><h3>Inkludering och ordning i projektrutnätet</h3><span>Projektordningen visas radvis från vänster till höger.</span></div><ol class="esencial-projects-feature__order-list"><li class="esencial-projects-feature__order-row"><span>1. Projekt med lång titel</span><button class="fixture-button">Flytta ned</button></li></ol></div></section>
<section class="esencial-workspace-shell__section" id="preview"><header class="esencial-workspace-shell__section-header"><p class="esencial-workspace-shell__eyebrow">Steg 03</p><div><h2>Förhandsvisning</h2></div></header><div class="esencial-frontend-preview"><div class="fixture-card esencial-preview-control-row"><button class="fixture-button">Kladd</button><button class="fixture-button">Publicerat</button><button class="fixture-button">Mobil</button></div><div class="esencial-preview-stage"><div class="esencial-preview-fallback"><main><h3>Frontendpreview</h3></main></div></div></div></section>
<section class="esencial-workspace-shell__section" id="results"><header class="esencial-workspace-shell__section-header"><p class="esencial-workspace-shell__eyebrow">Steg 04</p><div><h2>Resultat</h2></div></header><div class="esencial-analytics"><div class="esencial-analytics__chart-wrap"><svg class="esencial-analytics__chart" viewBox="0 0 400 160"><line class="esencial-analytics__chart-grid" x1="0" y1="80" x2="400" y2="80"/></svg><div class="esencial-analytics__chart-tooltip">Senaste mätning <strong>12</strong></div></div></div></section>
</div></main></body></html>`

test('all workspace sections retain a black high-contrast responsive layout', async () => {
  const browser = await chromium.launch({headless: true})
  try {
    for (const viewport of [
      {name: 'mobile', width: 375, height: 900},
      {name: 'tablet', width: 768, height: 1024},
      {name: 'desktop', width: 1440, height: 900},
      {name: 'zoom-200', width: 720, height: 900},
    ]) {
      const page = await browser.newPage({viewport})
      await page.setContent(html, {waitUntil: 'load'})
      const report = await page.evaluate(() => {
        const shell = document.querySelector('.esencial-workspace-shell')
        const interactive = [...document.querySelectorAll('button, a, input, select')]
        return {
          scrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
          viewportWidth: document.documentElement.clientWidth,
          shell: {
            background: getComputedStyle(shell).backgroundColor,
            color: getComputedStyle(shell).color,
          },
          controls: interactive.map((element) => {
            const rect = element.getBoundingClientRect()
            return {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              height: rect.height,
              requiresTargetSize: element.tagName !== 'INPUT' || element.type !== 'checkbox',
            }
          }),
          textRects: [...document.querySelectorAll('*')].flatMap((element) =>
            [...element.childNodes]
              .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
              .flatMap((node) => {
                const range = document.createRange()
                range.selectNodeContents(node)
                const owner =
                  element.closest('button, a, label, h1, h2, h3, h4, h5, h6, p, legend, li') ||
                  element
                return [...range.getClientRects()]
                  .filter((rect) => rect.width > 1 && rect.height > 1)
                  .map((rect) => ({
                    text: node.textContent.trim().slice(0, 48),
                    owner: [...document.querySelectorAll('*')].indexOf(owner),
                    left: rect.left,
                    right: rect.right,
                    top: rect.top,
                    bottom: rect.bottom,
                  }))
              }),
          ),
        }
      })
      assert.equal(
        report.scrollWidth,
        report.viewportWidth,
        `${viewport.name}: horizontal overflow`,
      )
      assert.equal(report.shell.background, 'rgb(0, 0, 0)', `${viewport.name}: canvas is not black`)
      assert.equal(report.shell.color, 'rgb(255, 255, 255)', `${viewport.name}: text is not white`)
      for (const control of report.controls) {
        assert(
          control.left >= -0.5 && control.right <= viewport.width + 0.5,
          `${viewport.name}: clipped control`,
        )
        if (control.requiresTargetSize) {
          assert(control.height >= 44, `${viewport.name}: undersized control`)
        }
      }
      for (let index = 0; index < report.controls.length; index += 1) {
        for (let nextIndex = index + 1; nextIndex < report.controls.length; nextIndex += 1) {
          const first = report.controls[index]
          const second = report.controls[nextIndex]
          const overlapWidth =
            Math.min(first.right, second.right) - Math.max(first.left, second.left)
          const overlapHeight =
            Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top)
          assert(
            overlapWidth <= 1 || overlapHeight <= 1,
            `${viewport.name}: interactive controls overlap`,
          )
        }
      }
      for (let index = 0; index < report.textRects.length; index += 1) {
        for (let nextIndex = index + 1; nextIndex < report.textRects.length; nextIndex += 1) {
          const first = report.textRects[index]
          const second = report.textRects[nextIndex]
          if (first.owner === second.owner) continue
          const overlapWidth =
            Math.min(first.right, second.right) - Math.max(first.left, second.left)
          const overlapHeight =
            Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top)
          assert(
            overlapWidth <= 1 || overlapHeight <= 1,
            `${viewport.name}: visible text overlaps (${first.text} / ${second.text})`,
          )
        }
      }
      await page.close()
    }
  } finally {
    await browser.close()
  }
})
