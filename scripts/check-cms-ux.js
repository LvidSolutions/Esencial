const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const {chromium} = require('playwright')

const ROOT = path.resolve(__dirname, '..')
const HOST = '127.0.0.1'
const files = {
  shell: 'cms/studio/components/workspace-shell/WorkspaceShell.tsx',
  shellCss: 'cms/studio/components/workspace-shell/workspaceShell.css',
  composition: 'cms/studio/components/studioTools.tsx',
  projects: 'cms/studio/features/projects/ProjectsFiltersSection.tsx',
  headingEditor: 'cms/studio/features/projects/ProjectHeadingEditor.tsx',
  filterEditor: 'cms/studio/features/projects/FilterCategoryEditor.tsx',
  gridEditor: 'cms/studio/features/projects/GridNavigationEditor.tsx',
  drafts: 'cms/studio/features/projects/drafts.ts',
  projectsCss: 'cms/studio/features/projects/projectsFilters.css',
  preview: 'cms/studio/features/preview/LiveFrontendPreview.tsx',
  previewConfig: 'cms/studio/features/preview/configuration.ts',
  previewContracts: 'cms/studio/features/preview/contracts.ts',
  previewReadme: 'preview/README.md',
  analytics: 'cms/studio/features/analytics/AnalyticsConsentFeature.tsx',
  analyticsClient: 'cms/studio/features/analytics/analyticsClient.ts',
  analyticsContract: 'cms/studio/features/analytics/analyticsContract.ts',
  consent: 'scripts/inject-vercel-analytics.js',
  analyticsDocs: 'docs/ANALYTICS_SETUP.md',
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/\r\n/g, '\n')
}

function includesAll(source, markers, contract) {
  for (const marker of markers) {
    assert(source.includes(marker), `${contract}: missing ${JSON.stringify(marker)}`)
  }
}

function assertStaticContracts() {
  const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]))

  includesAll(
    source.shell,
    [
      '<main className="esencial-workspace-shell"',
      'Hoppa till arbetsytans innehåll',
      '<Heading as="h1"',
      '<Heading as="h2"',
      'aria-live={status.state === \'error\' ? \'assertive\' : \'polite\'}',
      'role="status"',
      'tabIndex={-1}',
      'WORKSPACE_SECTION_ORDER.map',
    ],
    'workspace semantics',
  )
  assert(!/tabIndex=\{?[1-9]/.test(source.shell), 'workspace must not create a positive tab order')
  includesAll(
    source.shellCss,
    [
      'min-height: 44px',
      ':focus-visible',
      'outline: 3px solid var(--esencial-workspace-focus)',
      '@media (max-width: 56rem)',
      '@media (prefers-reduced-motion: reduce)',
      'overflow-x: clip',
    ],
    'workspace focus, touch and reflow',
  )
  includesAll(
    source.composition,
    [
      'createProjectsFiltersSection(setProjectStatus)',
      "id: 'live-preview'",
      "id: 'analytics-consent'",
      'Alla redaktionella ändringar sparas som kladd',
    ],
    'single downward workspace composition',
  )

  includesAll(
    source.projects,
    [
      "perspective: 'drafts'",
      'useCdn: false',
      'Senaste läsning eller sparning är klar',
      'Ingen publicerad version ändrades',
      'Publicering sker endast i den',
      'fullständiga dokumentvyn efter native validering',
    ],
    'draft-only project workflow and honest states',
  )
  includesAll(
    source.drafts,
    [
      'const draftId = `drafts.${publishedId}`',
      'client.patch(draftId)',
      'client.createIfNotExists(draft',
    ],
    'draft mutation boundary',
  )
  assert(!/client\.(?:delete|create|patch)\(publishedId/.test(source.drafts), 'published IDs must not be mutated')
  assert(!/\.publish\s*\(/.test(source.projects + source.drafts), 'custom project workspace must not publish')
  includesAll(
    source.headingEditor,
    [
      "setTitleSv(pair?.sv?.title || '')",
      "}, [pair?.sv?._id, pair?.sv?.title])",
      "setTitleEn(pair?.en?.title || '')",
      "}, [pair?.en?._id, pair?.en?.title])",
      'disabled={hasUnsavedHeading || saving}',
      'Osparade rubrikändringar finns',
      'text="Återställ laddade rubriker"',
      'aria-label="Återställ båda rubrikerna till senast laddade värden"',
      'disabled={navigationBlocked}',
    ],
    'independent bilingual drafts and unsaved guard',
  )
  assert(
    !source.headingEditor.includes(
      '[pair?.en?._id, pair?.en?.title, pair?.sv?._id, pair?.sv?.title]',
    ),
    'saving one language must not reset the other unsaved heading',
  )
  includesAll(
    source.filterEditor,
    [
      'disabled={hasUnsavedChanges || saving}',
      'Osparade filterändringar finns',
      'text="Återställ laddat filter"',
      'aria-label="Återställ filterkategorin till senast laddade värden"',
      '<label htmlFor=',
    ],
    'filter labels and unsaved guard',
  )
  includesAll(
    source.gridEditor,
    [
      'text="Upp"',
      'text="Ned"',
      'aria-label={`Flytta',
      'text="Ta bort från kladd"',
      'aria-label={`Ta bort',
      'Rutnätet har osparade ändringar. Den publicerade webbplatsen är oförändrad.',
      'text="Återställ laddat rutnät"',
      'aria-label="Återställ rutnät och filteretiketter till senast laddade värden"',
      'disabled={!settings || hasUnsavedChanges || saving}',
    ],
    'keyboard ordering and reversible draft wording',
  )
  assert(!/drag|draggable|onDrag/i.test(source.gridEditor), 'grid order must not depend on drag and drop')
  includesAll(
    source.projectsCss,
    ['min-height: 44px', '@media (max-width: 56rem)', 'grid-template-columns: 1fr'],
    'project touch and reflow styles',
  )

  includesAll(
    source.preview,
    [
      'role="group"',
      'aria-labelledby={labelId}',
      'Lokal layoutfixtur – inte autentiserad frontendpreview',
      'reviewBlocked = !authenticatedRenderer || issues.length > 0',
      'event.origin !== previewOrigin.origin',
      'event.source !== iframeRef.current?.contentWindow',
      'key={viewportId}',
      'setRendererIssues([])',
      "setRendererState(previewOrigin.kind === 'configured' ? 'verifying' : 'fallback')",
      'referrerPolicy="no-referrer"',
    ],
    'truthful protected preview and labelled controls',
  )
  includesAll(
    source.previewConfig,
    [
      "desktop: {label: 'Dator 1440'",
      "tablet: {label: 'Platta 768'",
      "mobile: {label: 'Mobil 390'",
      "'mobile-small': {label: 'Mobil 320'",
      "parsed.protocol !== 'https:'",
      'parsed.username || parsed.password || parsed.search || parsed.hash',
    ],
    'preview origin and viewport contract',
  )
  includesAll(
    source.previewContracts,
    ['PREVIEW_MESSAGE_VERSION', "renderer: 'frontend'", "authenticated: boolean"],
    'versioned renderer handshake',
  )
  includesAll(
    source.previewReadme,
    [
      'Cache-Control: private, no-store',
      'X-Robots-Tag: noindex, nofollow',
      'real frontend DOM/CSS/assets',
      'server-only environment',
      'No token or draft payload may be serialized',
    ],
    'server-only preview boundary',
  )
  assert(!/SANITY_(?:API_)?TOKEN/.test(source.preview + source.previewConfig), 'Studio preview must not reference a browser token')

  includesAll(
    source.analytics,
    [
      'Endast verklig, aggregerad leverantörsdata',
      'Summa dagliga besökare',
      'Samma person kan räknas på flera dagar',
      "label: 'Återkommande besökare', value: 'Inte tillgängligt'",
      'Kräver mänskligt godkännande',
      'role="alert"',
      'aria-live="polite"',
    ],
    'truthful analytics and accessible states',
  )
  includesAll(
    source.analyticsClient,
    [
      'isAnalyticsResponse(payload)',
      "credentials: 'omit'",
      "headers: {Accept: 'application/json'}",
      'Inga värden visas',
    ],
    'strict browser analytics client',
  )
  assert(!/Authorization/i.test(source.analyticsClient), 'Studio analytics must not send Authorization')
  includesAll(
    source.analyticsContract,
    ['Number.isFinite(value)', 'value <= 1', "PERIOD_DAYS = new Set([7, 30, 90])", 'isAnalyticsResponse'],
    'nested analytics validation',
  )
  includesAll(
    source.analyticsDocs,
    [
      'summa dagliga besökare',
      'inte periodunika personer',
      'CORS/origin är en webbläsargräns, inte en ersättning för autentisering',
      'Mänskliga och externa blockerare',
    ],
    'analytics privacy boundary',
  )
  includesAll(
    source.consent,
    ['CONSENT_CHOICE_RETENTION_DAYS', 'data-cookieconsent="statistics"', 'esencial.consent'],
    'fail-closed consent implementation',
  )
}

function contentType(file) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  }[path.extname(file)] || 'application/octet-stream'
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://fixture.invalid')
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    const target = path.resolve(ROOT, relative || 'tests/cms/editorial-workspace.html')
    if (!target.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'})
      response.end('Not found')
      return
    }
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'",
      'Content-Type': contentType(target),
      'X-Robots-Tag': 'noindex, nofollow',
    })
    fs.createReadStream(target).pipe(response)
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, HOST, () => resolve(server))
  })
}

async function inspectPage(browser, origin, testCase) {
  const page = await browser.newPage({
    viewport: {width: testCase.width, height: testCase.height},
    reducedMotion: testCase.reducedMotion ? 'reduce' : 'no-preference',
  })
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.goto(`${origin}/tests/cms/editorial-workspace.html`, {waitUntil: 'load'})
  await page.evaluate((language) => {
    document.documentElement.lang = language
    const sv = 'En redaktionellt granskad svensk beskrivning med många naturliga ordmellanrum som bevarar läsbarhet, tydliga instruktioner och den befintliga visuella identiteten även när texten blir betydligt längre än normalt.'
    const en = 'An editorially reviewed English description with many natural word boundaries that preserves readable instructions and the established visual identity even when the content becomes substantially longer than usual.'
    for (const node of document.querySelectorAll('[data-long-copy]')) node.textContent = language === 'sv' ? sv : en
  }, testCase.language)

  const inspection = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    const controls = [...document.querySelectorAll('[data-control]')].map((element) => {
      const rect = element.getBoundingClientRect()
      return {name: element.getAttribute('aria-label') || element.textContent.trim() || element.id, left: rect.left, right: rect.right, width: rect.width, height: rect.height}
    })
    const labelledFields = [...document.querySelectorAll('input, select')].map((element) => ({
      id: element.id,
      labelled: Boolean(element.getAttribute('aria-label') || element.labels?.length),
    }))
    const headingLevels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((heading) => Number(heading.tagName.slice(1)))
    const groups = [...document.querySelectorAll('.esencial-projects-feature__actions, .esencial-preview-control-row, .fixture-state-actions, .fixture-order-row')]
    const overlaps = []
    for (const group of groups) {
      const items = [...group.querySelectorAll('[data-control]')].filter((item) => !item.disabled)
      for (let left = 0; left < items.length; left += 1) {
        for (let right = left + 1; right < items.length; right += 1) {
          const a = items[left].getBoundingClientRect()
          const b = items[right].getBoundingClientRect()
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([items[left].textContent, items[right].textContent])
        }
      }
    }
    return {
      viewportWidth,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      controls,
      labelledFields,
      headingLevels,
      overlaps,
    }
  })

  assert.equal(inspection.scrollWidth, inspection.viewportWidth, `${testCase.name}: horizontal page scroll`)
  assert(inspection.controls.length > 0, `${testCase.name}: no controls inspected`)
  for (const control of inspection.controls) {
    assert(control.height >= 44, `${testCase.name}: ${control.name} is shorter than 44px`)
    assert(control.width > 0 && control.left >= -0.5 && control.right <= inspection.viewportWidth + 0.5, `${testCase.name}: ${control.name} is clipped`)
  }
  assert(inspection.labelledFields.every((field) => field.labelled), `${testCase.name}: unlabelled input/select`)
  for (let index = 1; index < inspection.headingLevels.length; index += 1) {
    assert(inspection.headingLevels[index] <= inspection.headingLevels[index - 1] + 1, `${testCase.name}: skipped heading level`)
  }
  assert.deepEqual(inspection.overlaps, [], `${testCase.name}: controls overlap`)
  assert.deepEqual(consoleErrors, [], `${testCase.name}: console errors`)

  if (testCase.name === 'mobile-375-sv') {
    const focusOrder = []
    for (let index = 0; index < 4; index += 1) {
      await page.keyboard.press('Tab')
      focusOrder.push(await page.evaluate(() => document.activeElement?.textContent?.trim()))
    }
    assert.deepEqual(focusOrder, [
      'Hoppa till arbetsytans innehåll',
      '01Projekt & filter',
      '02Live preview',
      '03Analys & samtycke',
    ])
    const focusStyle = await page.locator(':focus').evaluate((element) => {
      const style = getComputedStyle(element)
      return {style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth)}
    })
    assert.notEqual(focusStyle.style, 'none', 'keyboard focus must be visible')
    assert(focusStyle.width >= 3, 'keyboard focus ring must be at least 3px')

    const secondUp = page.locator('[data-project="B"] [data-move="up"]')
    await secondUp.focus()
    await page.keyboard.press('Enter')
    assert.deepEqual(await page.locator('[data-project]').evaluateAll((rows) => rows.map((row) => row.dataset.project)), ['B', 'A'])
    await expectText(page, '[data-testid="order-status"]', 'Den publicerade webbplatsen är oförändrad')
    const resetOrder = page.locator('[data-action="reset-order"]')
    await resetOrder.focus()
    await page.keyboard.press('Enter')
    assert.deepEqual(await page.locator('[data-project]').evaluateAll((rows) => rows.map((row) => row.dataset.project)), ['A', 'B'])
    await expectText(page, '[data-testid="order-status"]', 'återställd till senast laddade värden')

    await page.locator('#heading-en').fill('')
    assert(await page.locator('#project-pair').isDisabled(), 'project switch must be blocked while a heading is unsaved')
    assert(await page.locator('[data-action="open-validation"]').isDisabled(), 'document navigation must be blocked while a heading is unsaved')
    assert(await page.locator('[data-action="save"]').isDisabled(), 'invalid blank heading must not be saveable')
    await expectText(page, '[data-testid="draft-status"]', 'Osparade rubrikändringar finns')
    const resetHeadings = page.locator('[data-action="reset-headings"]')
    await resetHeadings.focus()
    await page.keyboard.press('Enter')
    assert(!(await page.locator('#project-pair').isDisabled()), 'reset must recover project selection after an invalid edit')
    assert(!(await page.locator('[data-action="open-validation"]').isDisabled()), 'reset must recover document navigation')
    await page.locator('#heading-en').fill('An unsaved English heading')
    await page.locator('[data-action="save"]').click()
    assert(!(await page.locator('#project-pair').isDisabled()), 'project switch must reopen after draft save')

    await page.locator('#filter-sv').fill('')
    await page.locator('#filter-member').uncheck()
    assert(await page.locator('#filter-category').isDisabled(), 'filter switch must be blocked while local edits are unsaved')
    assert(await page.locator('[data-action="open-filter-validation"]').isDisabled(), 'filter publication navigation must be blocked while dirty')
    assert(await page.locator('[data-action="save-filter"]').isDisabled(), 'invalid filter must not be saveable')
    await expectText(page, '[data-testid="filter-status"]', 'Osparade filterändringar finns')
    const resetFilter = page.locator('[data-action="reset-filter"]')
    await resetFilter.focus()
    await page.keyboard.press('Enter')
    assert(!(await page.locator('#filter-category').isDisabled()), 'filter reset must recover category selection')
    assert(!(await page.locator('[data-action="open-filter-validation"]').isDisabled()), 'filter reset must recover publication navigation')
    assert(await page.locator('#filter-member').isChecked(), 'filter reset must restore loaded membership')

    for (const state of ['loading', 'saved', 'error', 'blocked', 'unavailable']) {
      await page.locator(`[data-state-action="${state}"]`).click()
      const message = await page.locator('[data-testid="state-message"]').textContent()
      assert(message && message.length > 12, `${state} state must have explicit text`)
      if (state === 'error') assert(message.includes('ingen publicerad version ändrades'))
    }
  }

  if (testCase.reducedMotion) {
    const transition = await page.locator('.esencial-workspace-shell__tabs a').first().evaluate((element) => getComputedStyle(element).transitionDuration)
    assert(transition.split(',').every((duration) => Number.parseFloat(duration) <= 0.01), 'reduced motion must suppress transitions')
  }
  await page.close()
}

async function expectText(page, selector, expected) {
  const value = await page.locator(selector).textContent()
  assert(value?.includes(expected), `${selector} must include ${expected}`)
}

async function main() {
  assertStaticContracts()
  const server = await startServer()
  const address = server.address()
  const origin = `http://${HOST}:${address.port}`
  const browser = await chromium.launch({headless: true})
  const cases = [
    {name: 'mobile-375-sv', width: 375, height: 812, language: 'sv'},
    {name: 'mobile-375-en', width: 375, height: 812, language: 'en'},
    {name: 'tablet-768-sv', width: 768, height: 1024, language: 'sv'},
    {name: 'tablet-768-en', width: 768, height: 1024, language: 'en'},
    {name: 'desktop-1440-sv', width: 1440, height: 900, language: 'sv'},
    {name: 'desktop-1440-en', width: 1440, height: 900, language: 'en'},
    {name: 'reflow-200pct-sv', width: 720, height: 900, language: 'sv', reducedMotion: true},
    {name: 'reflow-200pct-en', width: 720, height: 900, language: 'en', reducedMotion: true},
  ]

  try {
    for (const testCase of cases) await inspectPage(browser, origin, testCase)
  } finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }
  console.log(`CMS UX PASS: static safety/accessibility contracts and ${cases.length} responsive editorial cases (375px, tablet, desktop, 200%-equivalent reflow, long sv/en text, reduced motion). Authenticated protected preview remains BLOCKED_HUMAN without authorised staging/session.`)
}

main().catch((error) => {
  console.error(`CMS UX FAIL: ${error.stack || error.message}`)
  process.exitCode = 1
})
