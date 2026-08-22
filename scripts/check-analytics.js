const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const handler = require('../api/analytics')
const {ROOT} = require('./recovery-utils')
const {snippet, htmlFiles, injectAnalytics} = require('./inject-vercel-analytics')

const CMS_ORIGIN = 'https://esencial-cms.sanity.studio'
const ANALYTICS_ENV = [
  'CMS_ORIGIN',
  'COOKIEBOT_CBID',
  'VERCEL_ANALYTICS_TOKEN',
  'VERCEL_ANALYTICS_TEAM_ID',
  'VERCEL_ANALYTICS_PROJECT_ID',
  'GOOGLE_SEARCH_CONSOLE_SITE_URL',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
]

function occurrences(value, pattern) {
  return (value.match(pattern) || []).length
}

async function withEnvironment(values, callback) {
  const previous = Object.fromEntries(ANALYTICS_ENV.map((name) => [name, process.env[name]]))
  for (const name of ANALYTICS_ENV) delete process.env[name]
  Object.assign(process.env, values)
  try {
    return await callback()
  } finally {
    for (const name of ANALYTICS_ENV) {
      if (previous[name] === undefined) delete process.env[name]
      else process.env[name] = previous[name]
    }
  }
}

function createResponse() {
  const headers = new Map()
  return {
    statusCode: 0,
    body: '',
    setHeader(name, value) { headers.set(name.toLowerCase(), String(value)) },
    getHeader(name) { return headers.get(name.toLowerCase()) },
    end(value = '') { this.body = String(value) },
  }
}

async function request({method = 'GET', origin, days = '30'} = {}) {
  const res = createResponse()
  const headers = origin === undefined ? {} : {origin}
  await handler({method, headers, query: {days}}, res)
  return {res, json: res.body ? JSON.parse(res.body) : undefined}
}

function assertBlockedAnalyticsMarkup(markup) {
  const tags = markup.match(/<script\b[^>]*\/_vercel\/insights\/script\.js[^>]*><\/script>/g) || []
  assert.equal(tags.length, 1, 'expected exactly one Vercel Web Analytics script')
  assert.match(tags[0], /type="text\/plain"/)
  assert.match(tags[0], /data-cookieconsent="statistics"/)
  assert.doesNotMatch(tags[0], /\b(?:async|defer)\b/)
}

async function checkConsentFixtures() {
  await withEnvironment({}, async () => {
    const disabled = snippet()
    assert.match(disabled, /Analytics disabled/)
    assert.doesNotMatch(disabled, /_vercel\/insights/)
    assert.doesNotMatch(disabled, /consent\.cookiebot\.com/)
  })

  await withEnvironment({COOKIEBOT_CBID: '00000000-0000-0000-0000-000000000000'}, async () => {
    const enabled = snippet()
    assert.equal(occurrences(enabled, /consent\.cookiebot\.com\/uc\.js/g), 1)
    assertBlockedAnalyticsMarkup(enabled)
  })

  await withEnvironment({COOKIEBOT_CBID: 'invalid'}, async () => {
    assert.throws(() => snippet(), /invalid format/)
  })

  const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'esencial-analytics-'))
  try {
    const fixture = path.join(fixtureDirectory, 'index.html')
    fs.writeFileSync(fixture, '<html><head><!-- ESENCIAL_ANALYTICS_START --><script defer src="/_vercel/insights/script.js"></script><!-- ESENCIAL_ANALYTICS_END --></head><body></body></html>')
    await withEnvironment({}, async () => {
      injectAnalytics(fixtureDirectory)
      injectAnalytics(fixtureDirectory)
      const disabled = fs.readFileSync(fixture, 'utf8')
      assert.equal(occurrences(disabled, /ESENCIAL_ANALYTICS_START/g), 1)
      assert.doesNotMatch(disabled, /_vercel\/insights/)
    })
    await withEnvironment({COOKIEBOT_CBID: '00000000-0000-0000-0000-000000000000'}, async () => {
      injectAnalytics(fixtureDirectory)
      injectAnalytics(fixtureDirectory)
      const enabled = fs.readFileSync(fixture, 'utf8')
      assert.equal(occurrences(enabled, /ESENCIAL_ANALYTICS_START/g), 1)
      assert.equal(occurrences(enabled, /consent\.cookiebot\.com\/uc\.js/g), 1)
      assertBlockedAnalyticsMarkup(enabled)
    })
  } finally {
    fs.rmSync(fixtureDirectory, {recursive: true, force: true})
  }
}

function checkGeneratedPages() {
  const files = htmlFiles(path.join(ROOT, 'public'))
  assert.ok(files.length > 0, 'no generated HTML files were found')
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8')
    assert.equal(occurrences(html, /ESENCIAL_ANALYTICS_START/g), 1, `${file} must have one analytics marker`)
    assert.equal(occurrences(html, /ESENCIAL_ANALYTICS_END/g), 1, `${file} must have one analytics end marker`)
    assert.doesNotMatch(html, /(?:matomo|googletagmanager|google-analytics\.com|gtag\s*\()/i, `${file} contains legacy or duplicate tracking`)
    const vercelScripts = occurrences(html, /\/_vercel\/insights\/script\.js/g)
    const cookiebotScripts = occurrences(html, /consent\.cookiebot\.com\/uc\.js/g)
    assert.ok(vercelScripts === 0 || vercelScripts === 1, `${file} contains duplicate Vercel tracking`)
    assert.ok(cookiebotScripts === 0 || cookiebotScripts === 1, `${file} contains duplicate Cookiebot loaders`)
    assert.equal(vercelScripts, cookiebotScripts, `${file} must not load analytics without consent management`)
    if (vercelScripts) assertBlockedAnalyticsMarkup(html)
  }
  return files.length
}

function checkRuntimeSources() {
  const paths = [
    path.join(ROOT, 'api', 'analytics.js'),
    path.join(ROOT, 'scripts', 'inject-vercel-analytics.js'),
    path.join(ROOT, 'cms', 'studio', 'components', 'studioTools.tsx'),
  ]
  const runtime = paths.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
  assert.doesNotMatch(runtime, /\bMATOMO(?:_|\b)|matomo\.cloud|gtag\s*\(|googletagmanager|google-analytics\.com/i)
  assert.doesNotMatch(runtime, /returningVisitors/)
  assert.match(runtime, /inte tillgängligt med (?:den )?valda integritetsnivån/i)
}

async function checkOriginAndUnavailableStates() {
  await withEnvironment({}, async () => {
    let result = await request()
    assert.equal(result.res.statusCode, 403)
    assert.equal(result.res.getHeader('access-control-allow-origin'), undefined)

    result = await request({origin: 'https://evil.example'})
    assert.equal(result.res.statusCode, 403)
    assert.equal(result.res.getHeader('access-control-allow-origin'), undefined)

    result = await request({method: 'OPTIONS', origin: CMS_ORIGIN})
    assert.equal(result.res.statusCode, 204)
    assert.equal(result.res.getHeader('access-control-allow-origin'), CMS_ORIGIN)

    result = await request({method: 'POST', origin: CMS_ORIGIN})
    assert.equal(result.res.statusCode, 405)
    assert.equal(result.res.getHeader('allow'), 'GET, OPTIONS')

    result = await request({origin: CMS_ORIGIN, days: 'not-a-period'})
    assert.equal(result.res.statusCode, 200)
    assert.equal(result.json.configured, false)
    assert.equal(result.json.state, 'unavailable')
    assert.equal(result.json.periodDays, 30)
    assert.equal(result.json.traffic, null)
    assert.equal(result.json.search, null)
    assert.equal(result.json.sources.traffic.state, 'unavailable')
    assert.match(result.json.limitations.join(' '), /inte tillgängligt/)
  })

  await withEnvironment({VERCEL_ANALYTICS_TOKEN: 'partial-only'}, async () => {
    const result = await request({origin: CMS_ORIGIN})
    assert.equal(result.res.statusCode, 503)
    assert.equal(result.json.state, 'error')
    assert.equal(result.json.sources.traffic.state, 'error')
  })
}

async function checkProviderFixtures() {
  const secret = 'vercel_secret_fixture_value'
  const identifiers = {
    VERCEL_ANALYTICS_TOKEN: secret,
    VERCEL_ANALYTICS_TEAM_ID: 'team_fixture',
    VERCEL_ANALYTICS_PROJECT_ID: 'prj_fixture',
  }
  const originalFetch = global.fetch
  try {
    await withEnvironment(identifiers, async () => {
      let countCall = 0
      global.fetch = async (input, options) => {
        const url = new URL(String(input))
        assert.equal(url.origin, 'https://api.vercel.com')
        assert.equal(url.searchParams.get('projectId'), 'prj_fixture')
        assert.equal(url.searchParams.get('teamId'), 'team_fixture')
        assert.equal(url.searchParams.get('filter'), "environment eq 'production'")
        assert.equal(options.headers.Authorization, `Bearer ${secret}`)
        assert.doesNotMatch(String(input), new RegExp(secret))
        if (url.pathname.endsWith('/aggregate')) return {ok: true, status: 200, json: async () => ({data: [{requestPath: '/', pageviews: 31, visitors: 10}, {requestPath: '/projects/', pageviews: 9, visitors: 4}, {requestPath: 'Others', pageviews: 2, visitors: 2}]})}
        countCall += 1
        const data = countCall === 1 ? {visitors: 12, pageviews: 40} : {visitors: 7, pageviews: 20}
        return {ok: true, status: 200, json: async () => ({data})}
      }
      const result = await request({origin: CMS_ORIGIN, days: '7'})
      assert.equal(result.res.statusCode, 200)
      assert.equal(result.json.configured, true)
      assert.equal(result.json.state, 'ready')
      assert.equal(result.json.periodDays, 7)
      assert.deepEqual(result.json.traffic, {visitors: 12, pageviews: 40, previous: {visitors: 7, pageviews: 20}, topPages: [{label: '/', value: 31}, {label: '/projects/', value: 9}], state: 'ready'})
      assert.equal(result.json.sources.search.state, 'unavailable')
      assert.doesNotMatch(JSON.stringify(result.json), /returningVisitors/)
      assert.doesNotMatch(JSON.stringify(result.json), new RegExp(`${secret}|team_fixture|prj_fixture`))
    })

    await withEnvironment(identifiers, async () => {
      global.fetch = async (input) => {
        const url = new URL(String(input))
        return url.pathname.endsWith('/aggregate')
          ? {ok: true, status: 200, json: async () => ({data: []})}
          : {ok: true, status: 200, json: async () => ({data: {visitors: 0, pageviews: 0}})}
      }
      const result = await request({origin: CMS_ORIGIN})
      assert.equal(result.res.statusCode, 200)
      assert.equal(result.json.state, 'empty')
      assert.equal(result.json.sources.traffic.state, 'empty')
      assert.equal(result.json.traffic.visitors, 0)
      assert.equal(result.json.traffic.pageviews, 0)
    })

    await withEnvironment(identifiers, async () => {
      global.fetch = async () => ({ok: false, status: 401, json: async () => ({error: `do not expose ${secret}`})})
      const result = await request({origin: CMS_ORIGIN})
      assert.equal(result.res.statusCode, 502)
      assert.equal(result.json.state, 'error')
      assert.equal(result.json.sources.traffic.state, 'error')
      assert.match(result.json.message, /Vercel Web Analytics kunde inte hämtas \(401\)/)
      assert.doesNotMatch(JSON.stringify(result.json), new RegExp(secret))
    })

    await withEnvironment(identifiers, async () => {
      global.fetch = async () => ({ok: true, status: 200, json: async () => ({data: {visitors: '12', pageviews: 40}})})
      const result = await request({origin: CMS_ORIGIN})
      assert.equal(result.res.statusCode, 502)
      assert.equal(result.json.state, 'error')
    })
  } finally {
    global.fetch = originalFetch
  }
}

async function main() {
  await checkConsentFixtures()
  checkRuntimeSources()
  const pageCount = checkGeneratedPages()
  await checkOriginAndUnavailableStates()
  await checkProviderFixtures()
  console.log(`Analytics checks passed: ${pageCount} generated pages, consent-disabled/enabled fixtures, strict CMS origin, unavailable/empty/error states, provider schema, and secret isolation.`)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
