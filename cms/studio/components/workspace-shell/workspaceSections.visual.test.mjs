import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {chromium} from 'playwright'

const read = (path) => readFileSync(new globalThis.URL(path, import.meta.url), 'utf8')
const css = [
  read('./workspaceShell.css'),
  read('./workspaceNavigation.css'),
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
`

const html = `<!doctype html><html lang="sv"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{${variables}} html,body{margin:0;background:#000;color:#fff;font:16px/1.55 Arial,sans-serif} ${css}
.fixture-card,.fixture-input{border:1px solid var(--esencial-workspace-border);background:var(--esencial-workspace-paper);color:var(--esencial-workspace-ink)}
.fixture-card{padding:16px}.fixture-input{width:100%;padding:10px}.fixture-button{width:100%;min-height:52px;padding:10px 14px;border:0;background:#000;color:#fff;font:600 12px/1.35 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase}.fixture-button[aria-current=page]{background:#fff;color:#000}
</style></head><body><main class="esencial-workspace-shell"><div class="esencial-workspace-shell__container">
<header class="esencial-workspace-shell__header"><p class="esencial-workspace-shell__eyebrow">Esencial CMS</p><h1>Arbetsyta</h1></header>
<nav class="esencial-workspace-shell__tabs" aria-label="Arbetsytor"><ol><li><button class="fixture-button" aria-current="page">Projekt</button></li><li><button class="fixture-button">Filter och ordning</button></li><li><button class="fixture-button">Förhandsvisning</button></li><li><button class="fixture-button">Resultat</button></li></ol></nav>
<section class="esencial-workspace-shell__section" id="esencial-workspace-current"><header class="esencial-workspace-shell__section-header"><h2>Projekt</h2></header><div class="esencial-content-media"><div class="esencial-content-media__picker"><div class="esencial-content-media__actions"><button class="fixture-button">Skapa nytt projekt</button></div><div class="esencial-content-media__project-select"><label>Projekt att redigera<select><option>Ett långt projektnamn · SV · Kladd</option></select></label></div></div><div class="esencial-content-media__form-grid"><fieldset class="esencial-content-media__fieldset"><legend>Text</legend><label>Projektnamn<input class="fixture-input" value="Exempel" readonly></label></fieldset><fieldset class="esencial-content-media__fieldset"><legend>Kortbilder</legend><div class="esencial-content-media__media-grid"><div class="fixture-card esencial-content-media__media-card"><div class="esencial-content-media__preview-missing">Kortbild 1</div><button class="fixture-button">Ersätt</button></div></div></fieldset></div></div></section>
</div></main></body></html>`

test('separated workspace navigation retains a black high-contrast responsive layout', async () => {
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
          sectionCount: document.querySelectorAll('.esencial-workspace-shell__section').length,
          activeTabs: document.querySelectorAll('.esencial-workspace-shell__tabs [aria-current="page"]').length,
          shell: {
            background: getComputedStyle(shell).backgroundColor,
            color: getComputedStyle(shell).color,
          },
          controls: interactive.map((element) => {
            const rect = element.getBoundingClientRect()
            return {
              left: rect.left,
              right: rect.right,
              height: rect.height,
              requiresTargetSize: element.tagName !== 'INPUT' || element.type !== 'checkbox',
            }
          }),
        }
      })
      assert.equal(report.scrollWidth, report.viewportWidth, `${viewport.name}: horizontal overflow`)
      assert.equal(report.sectionCount, 1, `${viewport.name}: more than one workspace is visible`)
      assert.equal(report.activeTabs, 1, `${viewport.name}: active workspace state is ambiguous`)
      assert.equal(report.shell.background, 'rgb(0, 0, 0)', `${viewport.name}: canvas is not black`)
      assert.equal(report.shell.color, 'rgb(255, 255, 255)', `${viewport.name}: text is not white`)
      for (const control of report.controls) {
        assert(
          control.left >= -0.5 && control.right <= viewport.width + 0.5,
          `${viewport.name}: clipped control`,
        )
        if (control.requiresTargetSize) assert(control.height >= 44, `${viewport.name}: undersized control`)
      }
      await page.close()
    }
  } finally {
    await browser.close()
  }
})
