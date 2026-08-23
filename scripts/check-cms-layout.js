const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const {chromium} = require('playwright')

const ROOT = path.resolve(__dirname, '..')
const FIXTURES = path.join(ROOT, 'preview', 'fixtures')
const DIAGNOSTICS = path.join(ROOT, 'preview', 'layout-diagnostics.js')
const HOST = '127.0.0.1'
const evidenceArgument = process.argv.indexOf('--evidence-dir')
const evidenceDirectory =
  evidenceArgument >= 0 && process.argv[evidenceArgument + 1]
    ? path.resolve(ROOT, process.argv[evidenceArgument + 1])
    : undefined

const viewportCases = [
  {name: 'mobile-320', width: 320, height: 568},
  {name: 'mobile-390', width: 390, height: 844},
  {name: 'tablet-768', width: 768, height: 1024},
  {name: 'desktop-1440', width: 1440, height: 900},
  {name: 'reflow-200pct-equivalent', width: 720, height: 900},
]

function contentType(file) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  }[path.extname(file)] || 'application/octet-stream'
}

function fixtureTarget(pathname) {
  if (pathname === '/fixtures/' || pathname === '/fixtures/index.html') {
    return path.join(FIXTURES, 'index.html')
  }
  if (pathname === '/fixtures/fixture.css') return path.join(FIXTURES, 'fixture.css')
  if (pathname === '/fixtures/fixture-runtime.js') return path.join(FIXTURES, 'fixture-runtime.js')
  if (pathname === '/layout-diagnostics.js') return DIAGNOSTICS
  return undefined
}

function startFixtureServer(port = 0) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://fixture.invalid')
    const target = fixtureTarget(url.pathname)
    if (!target || !fs.existsSync(target)) {
      response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'})
      response.end('Not found')
      return
    }
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self' data:; img-src 'self' data:; script-src 'self'; style-src 'self'; frame-ancestors 'self'",
      'Content-Type': contentType(target),
      'X-Robots-Tag': 'noindex, nofollow',
    })
    fs.createReadStream(target).pipe(response)
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, HOST, () => resolve(server))
  })
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function assertViewportHandshakeContract(componentSource) {
  assert(
    componentSource.includes('key={viewportId}'),
    'Viewport changes must remount the renderer and require a fresh ready handshake',
  )
  assert(
    componentSource.includes('onClick={() => selectViewport(value)}'),
    'Viewport controls must use the guarded renderer transition',
  )
  const viewportTransition = componentSource.match(
    /const selectViewport = \(nextViewportId: PreviewViewportId\) => \{([\s\S]*?)\n  \}/,
  )?.[1]
  assert(viewportTransition, 'Viewport renderer transition must be defined')
  assert(
    viewportTransition.includes('setRendererIssues([])') &&
      viewportTransition.includes("setRendererState(previewOrigin.kind === 'configured' ? 'verifying' : 'fallback')") &&
      viewportTransition.includes('setViewportId(nextViewportId)'),
    'Viewport changes must clear stale diagnostics, reset verification, then select the new viewport',
  )
  assert(
    !/\[perspective, previewOrigin\.kind, previewUrl, route, viewportId\]/.test(componentSource),
    'A viewport-only render must not reset authentication without an explicit iframe re-handshake',
  )
}

function assertClientContract() {
  const featureRoot = path.join(ROOT, 'cms', 'studio', 'features', 'preview')
  const files = fs.readdirSync(featureRoot).filter((file) => /\.(?:ts|tsx|css)$/.test(file))
  const source = files.map((file) => fs.readFileSync(path.join(featureRoot, file), 'utf8')).join('\n')
  const componentSource = fs.readFileSync(path.join(featureRoot, 'LiveFrontendPreview.tsx'), 'utf8')
  assert(!/SANITY_(?:API_)?TOKEN/.test(source), 'Studio preview feature must not reference a Sanity token')
  assert(source.includes('shareAccess: false'), 'Presentation Tool must disable shareable draft URLs')
  assert(source.includes(".listen('*[_type in"), 'Studio preview must subscribe to Sanity live updates')
  assert(source.includes('Lokal layoutfixtur – inte autentiserad frontendpreview'), 'Fallback must be labelled honestly')
  assert(!/text-overflow\s*:\s*ellipsis|-webkit-line-clamp/.test(source), 'S18 must not truncate unsafe content')
  assert(!/object-fit\s*:/.test(source), 'S18 must not change preview image crop or framing')
  assertViewportHandshakeContract(componentSource)
  const viewportRegressions = [
    componentSource.replace('key={viewportId}', ''),
    componentSource.replace('onClick={() => selectViewport(value)}', 'onClick={() => setViewportId(value)}'),
    componentSource.replace(
      "    setRendererState(previewOrigin.kind === 'configured' ? 'verifying' : 'fallback')\n    setViewportId(nextViewportId)",
      '    setViewportId(nextViewportId)',
    ),
    componentSource.replace(
      '[perspective, previewOrigin.kind, previewUrl, route]',
      '[perspective, previewOrigin.kind, previewUrl, route, viewportId]',
    ),
  ]
  for (const regression of viewportRegressions) {
    assert.throws(
      () => assertViewportHandshakeContract(regression),
      {name: 'AssertionError'},
      'Viewport handshake regression mutation must be rejected',
    )
  }
}

async function readDiagnostics(page) {
  await page.waitForFunction(
    () => Boolean(window.__ESENCIAL_PREVIEW_DIAGNOSTICS__),
    undefined,
    {timeout: 10_000},
  )
  await page.waitForTimeout(180)
  return page.evaluate(() => window.EsencialPreviewDiagnostics.run())
}

async function capture(page, name, evidence) {
  if (!evidenceDirectory) return
  fs.mkdirSync(evidenceDirectory, {recursive: true})
  const file = path.join(evidenceDirectory, `${name}.png`)
  await page.screenshot({path: file, fullPage: true})
  const stats = fs.statSync(file)
  evidence.screenshots.push({name, file: path.relative(ROOT, file), bytes: stats.size, sha256: sha256(file)})
}

async function validateSafeFixture(browser, origin, variant, viewport, evidence) {
  const page = await browser.newPage({viewport: {width: viewport.width, height: viewport.height}})
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.goto(`${origin}/fixtures/?variant=${variant}`, {waitUntil: 'load'})
  const diagnostics = await readDiagnostics(page)
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }))
  assert.equal(geometry.scrollWidth, geometry.clientWidth, `${variant}/${viewport.name} has horizontal scroll`)
  assert.deepEqual(diagnostics.issues, [], `${variant}/${viewport.name} produced layout issues`)
  assert.deepEqual(consoleErrors, [], `${variant}/${viewport.name} emitted console errors`)
  assert.equal(diagnostics.viewport.width, viewport.width, `${variant}/${viewport.name} used the wrong CSS viewport`)
  evidence.cases.push({variant, viewport: viewport.name, width: viewport.width, issueCount: 0, consoleErrors: 0})
  await capture(page, `${variant}--${viewport.name}`, evidence)
  await page.close()
}

async function validateFailureMatrix(browser, origin, evidence) {
  const page = await browser.newPage({viewport: {width: 390, height: 844}})
  const consoleErrors = []
  page.on('console', (message) => {
    const expectedBrokenMediaError =
      message.text().includes('does-not-exist.jpg') ||
      message.text().includes('status of 404 (Not Found)')
    if (message.type() === 'error' && !expectedBrokenMediaError) {
      consoleErrors.push(message.text())
    }
  })
  await page.goto(`${origin}/fixtures/?variant=failure-matrix`, {waitUntil: 'load'})
  const diagnostics = await readDiagnostics(page)
  const codes = new Set(diagnostics.issues.map((issue) => issue.code))
  for (const expected of [
    'horizontal-scroll',
    'text-overflow',
    'clipping',
    'overlap',
    'missing-media',
    'broken-media',
    'unsafe-line-length',
  ]) {
    assert(codes.has(expected), `failure matrix did not report ${expected}`)
  }
  for (const issue of diagnostics.issues) {
    assert.equal(issue.severity, 'blocker', `${issue.code} must block review`)
    assert(issue.route.startsWith('/'), `${issue.code} is missing route context`)
    assert(issue.field, `${issue.code} is missing field context`)
    assert(issue.message && issue.suggestion, `${issue.code} is missing actionable guidance`)
  }
  assert.deepEqual(consoleErrors, [], 'failure fixture emitted an unexpected console error')
  evidence.failureMatrix = {
    route: diagnostics.route,
    issueCount: diagnostics.issues.length,
    codes: [...codes].sort(),
    unexpectedConsoleErrors: 0,
  }
  await capture(page, 'failure-matrix--mobile-390', evidence)
  await page.close()
}

async function main() {
  assertClientContract()
  const serveOnly = process.argv.includes('--serve')
  const portArgument = process.argv.indexOf('--port')
  const requestedPort =
    portArgument >= 0 && process.argv[portArgument + 1]
      ? Number(process.argv[portArgument + 1])
      : 0
  assert(Number.isInteger(requestedPort) && requestedPort >= 0 && requestedPort <= 65_535, 'Invalid --port')
  const server = await startFixtureServer(requestedPort)
  const address = server.address()
  const origin = `http://${HOST}:${address.port}`
  if (serveOnly) {
    console.log(`CMS layout fixtures: ${origin}/fixtures/?variant=long-sv`)
    return new Promise(() => {})
  }
  const browser = await chromium.launch({headless: true})
  const evidence = {origin: 'loopback fixture server', cases: [], failureMatrix: null, screenshots: []}

  try {
    for (const variant of ['long-sv', 'long-en']) {
      for (const viewport of viewportCases) {
        await validateSafeFixture(browser, origin, variant, viewport, evidence)
      }
    }
    await validateFailureMatrix(browser, origin, evidence)
  } finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
  }

  if (evidenceDirectory) {
    const evidenceFile = path.join(evidenceDirectory, 'layout-evidence.json')
    fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`)
    console.log(`Evidence: ${path.relative(ROOT, evidenceFile)}`)
  }
  console.log(
    `CMS layout PASS: viewport renderer re-handshake contract, ${evidence.cases.length} long-copy viewport cases, 7/7 blocking diagnostic classes, zero unexpected console errors.`,
  )
}

main().catch((error) => {
  console.error(`CMS layout FAIL: ${error.stack || error.message}`)
  process.exitCode = 1
})
