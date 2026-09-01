import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {chromium} from 'playwright'

const shellCss = readFileSync(new globalThis.URL('./workspaceShell.css', import.meta.url), 'utf8')

const variables = `
  --esencial-workspace-ink: #ffffff;
  --esencial-workspace-muted: #c9c9c9;
  --esencial-workspace-paper: #121212;
  --esencial-workspace-canvas: #000000;
  --esencial-workspace-wash: #1b1b1b;
  --esencial-workspace-border: #474747;
  --esencial-workspace-border-strong: #777777;
  --esencial-workspace-focus: #ffd54a;
  --esencial-workspace-focus-soft: #4a3b00;
  --esencial-workspace-draft-border: #d8bb32;
  --esencial-workspace-critical-ink: #ffc1b8;
  --esencial-workspace-font: Roboto, Arial, sans-serif;
  --esencial-workspace-measure: 68ch;
  --esencial-workspace-heading-tracking: -0.025em;
  --esencial-workspace-label-tracking: 0.1em;
  --esencial-workspace-content-line-height: 1.55;
  --esencial-workspace-motion-duration: 160ms;
  --esencial-workspace-motion-easing: cubic-bezier(0.2, 0, 0, 1);
  --esencial-workspace-section-space: 72px;
`

const card = (id, title, description) => `
  <article class="esencial-editorial-status__card fixture-card" data-tone="${id === 'incomplete' ? 'critical' : 'caution'}">
    <header><h3>${title}</h3><span aria-label="2 projekt">2</span></header>
    <p>${description}</p>
    <ul class="esencial-editorial-status__list" aria-label="${title}">
      <li><a href="#project-a"><span class="esencial-editorial-status__project-title">Ett projektnamn med extra lång vardaglig text som måste få radbrytas</span><span class="esencial-editorial-status__meta"><span>Svenska</span><span>·</span><span>Kladd</span><span>·</span><time>23 aug. 2026</time></span></a></li>
      <li><a href="#project-b"><span class="esencial-editorial-status__project-title">Project B</span><span class="esencial-editorial-status__meta"><span>English</span><span>·</span><span>Granskning</span></span></a></li>
    </ul>
  </article>`

const html = `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      :root {${variables}}
      html, body {margin: 0; background: var(--esencial-workspace-canvas); color: var(--esencial-workspace-ink);}
      ${shellCss}
      .fixture-container {width: min(100%, 1280px); margin-inline: auto;}
      .fixture-card {padding: 16px; border: 1px solid var(--esencial-workspace-border);}
      .fixture-card > header {display: flex; align-items: center; justify-content: space-between; gap: 16px;}
      button {min-height: 44px; padding: 8px 12px; font: inherit;}
    </style>
  </head>
  <body>
    <main class="esencial-workspace-shell">
      <div class="esencial-workspace-shell__container fixture-container">
        <section class="esencial-editorial-status" id="esencial-workspace-status" tabindex="-1" aria-labelledby="status-heading">
          <div class="esencial-editorial-status__intro">
            <p class="esencial-workspace-shell__eyebrow">Överblick</p>
            <h2 id="status-heading">Att göra och senaste ändringar</h2>
            <p class="esencial-editorial-status__summary">Här ser du sparade kladdar som behöver uppmärksamhet. Den här långa hjälptexten ska förbli tydlig utan att skapa vågrät rullning.</p>
          </div>
          <button type="button">Uppdatera status</button>
          <div class="esencial-editorial-status__grid">
            ${card('ready', 'Klar att publicera', 'Färdiggranskade projekt som behöver en sista kontroll före publicering.')}
            ${card('recent', 'Senast ändrat', 'Projekt som någon nyligen har arbetat med.')}
            ${card('incomplete', 'Saknar SEO eller huvudbild', 'Pågående projekt där söktext eller huvudbild saknas.')}
            ${card('translation', 'Översättning att slutföra', 'Projekt där språkparet inte är färdigt eller godkänt.')}
          </div>
        </section>
      </div>
    </main>
  </body>
</html>`

test('editorial overview reflows, preserves 44px targets, and exposes keyboard focus', async () => {
  const browser = await chromium.launch({headless: true})
  const cases = [
    {name: 'mobile-375', width: 375, height: 812, columns: 1},
    {name: 'tablet-768', width: 768, height: 1024, columns: 1},
    {name: 'desktop-1440', width: 1440, height: 900, columns: 2},
    {name: 'reflow-200-percent', width: 720, height: 900, columns: 1, reducedMotion: true},
  ]

  try {
    for (const fixture of cases) {
      const page = await browser.newPage({
        viewport: {width: fixture.width, height: fixture.height},
        reducedMotion: fixture.reducedMotion ? 'reduce' : 'no-preference',
      })
      await page.setContent(html, {waitUntil: 'load'})
      const inspection = await page.evaluate(() => {
        const grid = globalThis.document.querySelector('.esencial-editorial-status__grid')
        const targets = [
          ...globalThis.document.querySelectorAll('button, .esencial-editorial-status__list a'),
        ]
        return {
          viewportWidth: globalThis.document.documentElement.clientWidth,
          scrollWidth: Math.max(
            globalThis.document.documentElement.scrollWidth,
            globalThis.document.body.scrollWidth,
          ),
          columns: globalThis.getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          colors: {
            canvas: globalThis.getComputedStyle(globalThis.document.querySelector('.esencial-workspace-shell')).backgroundColor,
            ink: globalThis.getComputedStyle(globalThis.document.querySelector('.esencial-workspace-shell')).color,
          },
          targets: targets.map((target) => {
            const rect = target.getBoundingClientRect()
            return {height: rect.height, left: rect.left, right: rect.right}
          }),
        }
      })

      assert.equal(
        inspection.scrollWidth,
        inspection.viewportWidth,
        `${fixture.name}: horizontal scroll`,
      )
      assert.equal(inspection.columns, fixture.columns, `${fixture.name}: unexpected column count`)
      assert.equal(inspection.colors.canvas, 'rgb(0, 0, 0)', `${fixture.name}: canvas must be black`)
      assert.equal(inspection.colors.ink, 'rgb(255, 255, 255)', `${fixture.name}: base text must be white`)
      for (const target of inspection.targets) {
        assert(target.height >= 44, `${fixture.name}: control is shorter than 44px`)
        assert(
          target.left >= -0.5 && target.right <= fixture.width + 0.5,
          `${fixture.name}: clipped control`,
        )
      }

      await page.locator('.esencial-editorial-status__list a').first().focus()
      const focus = await page.locator(':focus').evaluate((element) => {
        const style = globalThis.getComputedStyle(element)
        return {
          kind: element.tagName,
          outline: style.outlineStyle,
          width: Number.parseFloat(style.outlineWidth),
        }
      })
      assert.equal(focus.kind, 'A')
      assert.notEqual(focus.outline, 'none')
      assert(focus.width >= 3, `${fixture.name}: focus outline is thinner than 3px`)

      if (fixture.reducedMotion) {
        const durations = await page
          .locator('.esencial-editorial-status__list a')
          .first()
          .evaluate((element) => globalThis.getComputedStyle(element).transitionDuration)
        assert(
          durations.split(',').every((duration) => Number.parseFloat(duration) <= 0.01),
          'reduced motion must suppress status-link transitions',
        )
      }
      await page.close()
    }
  } finally {
    await browser.close()
  }
})
