const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const vm = require('node:vm')
const analyticsHandler = require('../api/analytics')
const {ROOT} = require('./recovery-utils')
const {
  consentConfiguration,
  consentControllerSource,
  consentMarkup,
  consentStyleSource,
  cspHashes,
  headSnippet,
  htmlFiles,
  injectAnalytics,
  snippet,
} = require('./inject-vercel-analytics')

const CMS_ORIGIN = 'https://esencial-cms.sanity.studio'
const FIXTURE_CONFIG = {
  COOKIEBOT_CBID: '00000000-0000-0000-0000-000000000000',
  CONSENT_ANALYTICS_RETENTION: 'Fixture: 30 days',
  CONSENT_CHOICE_RETENTION: 'Fixture: 180 days',
  CONSENT_CHOICE_RETENTION_DAYS: '180',
  CONSENT_CONTROLLER_NAME: 'Fixture Controller AB',
  CONSENT_NOTICE_VERSION: 'fixture-v2',
  CONSENT_PRIVACY_URL: '/fixture-privacy/',
}
const SERVER_ENVIRONMENT_NAMES = [
  'CMS_ORIGIN',
  'VERCEL_ANALYTICS_TOKEN',
  'VERCEL_ANALYTICS_TEAM_ID',
  'VERCEL_ANALYTICS_PROJECT_ID',
  'GOOGLE_SEARCH_CONSOLE_SITE_URL',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
]

function occurrences(value, pattern) {
  return (value.match(pattern) || []).length
}

class FakeElement {
  constructor(document, id = '') {
    this.document = document
    this.id = id
    this.hidden = false
    this.textContent = ''
    this.href = ''
    this.dataset = {}
    this.listeners = new Map()
    this.queries = new Map()
    this.attributes = new Map()
    this.removed = false
  }

  addEventListener(name, callback) {
    this.listeners.set(name, callback)
  }

  querySelector(selector) {
    return this.queries.get(selector) || null
  }

  focus() {
    this.document.activeElement = this
  }

  getAttribute(name) {
    return this.attributes.get(name) || null
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value))
  }

  removeAttribute(name) {
    this.attributes.delete(name)
  }

  remove() {
    this.removed = true
    this.document.nodes.delete(this.id)
  }
}

const FIXTURE_NOW = '2026-08-23T12:00:00.000Z'
const FIXTURE_RETENTION_MS = 180 * 86400000

function fixtureTimestamp(offsetMs) {
  return new Date(Date.parse(FIXTURE_NOW) + offsetMs).toISOString()
}

function createRuntime({choice, cookieBot = true, language = 'sv', now = FIXTURE_NOW, providerStatistics = false} = {}) {
  const storage = new Map()
  if (choice !== undefined) storage.set('esencial.consent', JSON.stringify(choice))
  const nodes = new Map()
  const document = {
    activeElement: null,
    analyticsRequests: [],
    nodes,
    readyState: 'complete',
  }
  document.documentElement = new FakeElement(document, 'html')
  document.documentElement.lang = language
  document.head = new FakeElement(document, 'head')
  document.head.appendChild = (element) => {
    nodes.set(element.id, element)
    document.analyticsRequests.push(element.src)
    element.listeners.get('load')?.()
    return element
  }
  document.createElement = () => new FakeElement(document)
  document.getElementById = (id) => nodes.get(id) || null
  document.addEventListener = () => {}

  const root = new FakeElement(document, 'esencial-consent-root')
  const notice = new FakeElement(document, 'esencial-consent-notice')
  const reopen = new FakeElement(document, 'esencial-consent-reopen')
  const status = new FakeElement(document, 'esencial-consent-status')
  status.hidden = true
  const reject = new FakeElement(document, 'reject')
  reject.attributes.set('data-consent-choice', 'reject')
  reject.closest = () => reject
  const accept = new FakeElement(document, 'accept')
  accept.attributes.set('data-consent-choice', 'accept')
  accept.closest = () => accept
  const copySelectors = [
    'title',
    'intro',
    'details',
    'necessary',
    'vendor',
    'retention',
    'controller',
    'privacy',
  ]
  for (const name of copySelectors) root.queries.set(`[data-consent-copy="${name}"]`, new FakeElement(document, name))
  root.queries.set('[data-consent-choice="reject"]', reject)
  root.queries.set('[data-consent-choice="accept"]', accept)
  notice.queries.set('[data-consent-choice="reject"]', reject)
  for (const element of [root, notice, reopen, status]) nodes.set(element.id, element)

  const windowListeners = new Map()
  const window = {
    addEventListener(name, callback) {
      const callbacks = windowListeners.get(name) || []
      callbacks.push(callback)
      windowListeners.set(name, callbacks)
    },
    dispatch(name) {
      for (const callback of windowListeners.get(name) || []) callback({type: name})
    },
    localStorage: {
      getItem(name) { return storage.get(name) ?? null },
      removeItem(name) { storage.delete(name) },
      setItem(name, value) { storage.set(name, String(value)) },
    },
    location: {
      reloadCount: 0,
      reload() { this.reloadCount += 1 },
    },
    setTimeout(callback) { callback(); return 1 },
  }

  if (cookieBot) {
    window.Cookiebot = {
      consent: {statistics: providerStatistics},
      hideCount: 0,
      submitCalls: [],
      withdrawCount: 0,
      hide() { this.hideCount += 1 },
      submitCustomConsent(preferences, statistics, marketing) {
        this.submitCalls.push([preferences, statistics, marketing])
        this.consent.statistics = statistics
      },
      withdraw() {
        this.withdrawCount += 1
        this.consent.statistics = false
      },
    }
  }

  const config = consentConfiguration(FIXTURE_CONFIG)
  class FixtureDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]))
    }

    static now() {
      return Date.parse(now)
    }
  }
  vm.runInNewContext(consentControllerSource(config), {
    Date: FixtureDate,
    DOMException,
    JSON,
    console,
    document,
    window,
  })

  return {
    accept() { notice.listeners.get('click')({target: accept}) },
    reject() { notice.listeners.get('click')({target: reject}) },
    reopen() { reopen.listeners.get('click')() },
    document,
    nodes: {accept, notice, reject, reopen, root, status},
    storage,
    window,
  }
}

function checkConfigurationAndMarkup() {
  assert.equal(consentConfiguration({}), null)
  assert.match(headSnippet({}), /Analytics disabled/)
  assert.doesNotMatch(headSnippet({}), /Cookiebot|_vercel\/insights/)
  assert.equal(consentMarkup(null), '')

  assert.throws(
    () => consentConfiguration({COOKIEBOT_CBID: FIXTURE_CONFIG.COOKIEBOT_CBID}),
    /incomplete.*CONSENT_NOTICE_VERSION/i,
  )
  assert.throws(
    () => consentConfiguration({...FIXTURE_CONFIG, CONSENT_PRIVACY_URL: 'javascript:alert(1)'}),
    /HTTPS URL/,
  )
  assert.throws(
    () => consentConfiguration({...FIXTURE_CONFIG, CONSENT_CONTROLLER_NAME: '<script>'}),
    /invalid public value/,
  )
  for (const invalidDays of ['0', '1.5', '366', '1000', 'not-a-number']) {
    assert.throws(
      () => consentConfiguration({...FIXTURE_CONFIG, CONSENT_CHOICE_RETENTION_DAYS: invalidDays}),
      /integer from 1 to 365/,
    )
  }

  const attributeFixture = consentMarkup(consentConfiguration({
    ...FIXTURE_CONFIG,
    CONSENT_PRIVACY_URL: 'https://privacy.example/policy?lang=sv&view="full"',
  }))
  assert.match(attributeFixture, /lang=sv&amp;view=&quot;full&quot;/)
  assert.doesNotMatch(attributeFixture, /view="full"/)

  const enabled = snippet(FIXTURE_CONFIG)
  const markup = consentMarkup(consentConfiguration(FIXTURE_CONFIG))
  assert.equal(occurrences(enabled, /consent\.cookiebot\.com\/uc\.js/g), 1)
  assert.equal(occurrences(markup, /data-consent-choice="reject"/g), 1)
  assert.equal(occurrences(markup, /data-consent-choice="accept"/g), 1)
  assert.equal(occurrences(markup, /class="esencial-consent__choices"/g), 1)
  assert.doesNotMatch(enabled, /<script\b[^>]+src="\/_vercel\/insights\/script\.js"/)
  assert.doesNotMatch(consentStyleSource(), /data-consent-choice=(?:reject|accept)/)
  assert.match(consentStyleSource(), /grid-template-columns:1fr 1fr/)
  assert.match(consentStyleSource(), /min-height:48px/)
  assert.match(consentStyleSource(), /prefers-reduced-motion:reduce/)
}

function checkRuntimeFixtures() {
  const initial = createRuntime()
  assert.equal(initial.document.analyticsRequests.length, 0, 'pre-consent must not request analytics')
  assert.equal(initial.nodes.notice.hidden, false)
  assert.equal(initial.nodes.reopen.hidden, true)

  initial.accept()
  assert.deepEqual(JSON.parse(initial.storage.get('esencial.consent')), {
    version: 'fixture-v2',
    statistics: true,
    decidedAt: FIXTURE_NOW,
  })
  assert.equal(initial.document.analyticsRequests.length, 1)
  assert.equal(initial.document.analyticsRequests[0], '/_vercel/insights/script.js')
  assert.equal(initial.nodes.reopen.hidden, false)

  initial.reopen()
  assert.equal(initial.nodes.notice.hidden, false)
  assert.equal(initial.document.activeElement, initial.nodes.reject)
  initial.reject()
  assert.equal(JSON.parse(initial.storage.get('esencial.consent')).statistics, false)
  assert.equal(initial.window.Cookiebot.withdrawCount, 1)
  assert.equal(initial.window.location.reloadCount, 1)
  assert.equal(initial.document.getElementById('esencial-vercel-analytics'), null)

  const rejected = createRuntime()
  rejected.reject()
  assert.equal(JSON.parse(rejected.storage.get('esencial.consent')).statistics, false)
  assert.equal(rejected.document.analyticsRequests.length, 0)
  assert.equal(rejected.window.location.reloadCount, 0)

  const unavailable = createRuntime({cookieBot: false})
  unavailable.accept()
  assert.equal(unavailable.storage.has('esencial.consent'), false)
  assert.equal(unavailable.document.analyticsRequests.length, 0)
  assert.match(unavailable.nodes.status.textContent, /inte tillgänglig/)
  unavailable.reject()
  assert.equal(JSON.parse(unavailable.storage.get('esencial.consent')).statistics, false)

  const outdated = createRuntime({
    choice: {version: 'fixture-v1', statistics: true, decidedAt: fixtureTimestamp(-86400000)},
    providerStatistics: true,
  })
  assert.equal(outdated.storage.has('esencial.consent'), false)
  assert.equal(outdated.window.Cookiebot.withdrawCount, 1)
  assert.equal(outdated.document.analyticsRequests.length, 0)
  assert.equal(outdated.nodes.notice.hidden, false)

  const almostExpired = createRuntime({
    choice: {version: 'fixture-v2', statistics: true, decidedAt: fixtureTimestamp(-FIXTURE_RETENTION_MS + 1)},
    providerStatistics: true,
  })
  assert.equal(almostExpired.document.analyticsRequests.length, 1)
  assert.equal(almostExpired.storage.has('esencial.consent'), true)

  for (const decidedAt of [
    fixtureTimestamp(-FIXTURE_RETENTION_MS),
    fixtureTimestamp(1),
    'not-a-timestamp',
    '2026-08-23T12:00:00Z',
  ]) {
    const invalid = createRuntime({
      choice: {version: 'fixture-v2', statistics: true, decidedAt},
      providerStatistics: true,
    })
    assert.equal(invalid.storage.has('esencial.consent'), false)
    assert.equal(invalid.window.Cookiebot.withdrawCount, 1)
    assert.equal(invalid.document.analyticsRequests.length, 0)
    assert.equal(invalid.nodes.notice.hidden, false)
  }
}

function checkCspAndBrowserSecrets() {
  const config = consentConfiguration(FIXTURE_CONFIG)
  const hashes = cspHashes(FIXTURE_CONFIG)
  const expectedScript = `'sha256-${crypto.createHash('sha256').update(consentControllerSource(config)).digest('base64')}'`
  const expectedStyle = `'sha256-${crypto.createHash('sha256').update(consentStyleSource()).digest('base64')}'`
  assert.deepEqual(hashes, {script: expectedScript, style: expectedStyle})
  assert.notEqual(
    hashes.script,
    `'sha256-${crypto.createHash('sha256').update(`${consentControllerSource(config)} `).digest('base64')}'`,
    'a changed inline controller must not match the approved CSP hash',
  )

  const browser = snippet({...FIXTURE_CONFIG, VERCEL_ANALYTICS_TOKEN: 'must-never-appear'})
  assert.doesNotMatch(browser, /must-never-appear/)
  for (const secretName of SERVER_ENVIRONMENT_NAMES) assert.doesNotMatch(browser, new RegExp(secretName))
  assert.doesNotMatch(browser, /(?:matomo|googletagmanager|google-analytics\.com|gtag\s*\()/i)
}

function createResponse() {
  const headers = new Map()
  return {
    body: '',
    statusCode: 0,
    end(value = '') { this.body = String(value) },
    getHeader(name) { return headers.get(name.toLowerCase()) },
    setHeader(name, value) { headers.set(name.toLowerCase(), String(value)) },
  }
}

async function apiRequest(origin) {
  const response = createResponse()
  await analyticsHandler({headers: origin === undefined ? {} : {origin}, method: 'GET', query: {days: '30'}}, response)
  return response
}

async function checkOriginFixtures() {
  const previousOrigin = process.env.CMS_ORIGIN
  const previousLog = console.log
  const previousError = console.error
  try {
    console.log = () => {}
    console.error = () => {}
    delete process.env.CMS_ORIGIN
    let response = await apiRequest(undefined)
    assert.equal(response.statusCode, 403)
    assert.equal(response.getHeader('access-control-allow-origin'), undefined)

    response = await apiRequest('https://evil.example')
    assert.equal(response.statusCode, 403)
    assert.equal(response.getHeader('access-control-allow-origin'), undefined)

    response = await apiRequest(CMS_ORIGIN)
    assert.equal(response.statusCode, 200)
    assert.equal(response.getHeader('access-control-allow-origin'), CMS_ORIGIN)

    process.env.CMS_ORIGIN = 'http://esencial-cms.sanity.studio'
    response = await apiRequest('http://esencial-cms.sanity.studio')
    assert.equal(response.statusCode, 500)
    assert.equal(response.getHeader('access-control-allow-origin'), undefined)
  } finally {
    console.log = previousLog
    console.error = previousError
    if (previousOrigin === undefined) delete process.env.CMS_ORIGIN
    else process.env.CMS_ORIGIN = previousOrigin
  }
}

async function checkOfficialVercelAggregateFixtures() {
  const environment = Object.fromEntries(SERVER_ENVIRONMENT_NAMES.map((name) => [name, process.env[name]]))
  const previousFetch = global.fetch
  const previousLog = console.log
  const previousError = console.error
  const requests = []
  let dayRequest = 0
  try {
    Object.assign(process.env, {
      CMS_ORIGIN,
      VERCEL_ANALYTICS_PROJECT_ID: 'prj_official_fixture',
      VERCEL_ANALYTICS_TEAM_ID: 'team_official_fixture',
      VERCEL_ANALYTICS_TOKEN: 'server-only-fixture-token',
    })
    delete process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    console.log = () => {}
    console.error = () => {}
    global.fetch = async (input, options = {}) => {
      const url = new URL(String(input))
      requests.push({url, options})
      let data
      if (url.searchParams.get('by') === 'requestPath') {
        data = [{requestPath: '/', pageviews: 28, visitors: 12}]
      } else {
        data = dayRequest++ === 0
          ? [
            {timestamp: '2026-08-21T00:00:00.000Z', pageviews: 20, visitors: 10},
            {timestamp: '2026-08-22T00:00:00.000Z', pageviews: 12, visitors: 5},
          ]
          : [{timestamp: '2026-07-23T00:00:00.000Z', pageviews: 15, visitors: 7}]
      }
      return {ok: true, status: 200, json: async () => ({version: 1, data})}
    }

    let response = await apiRequest(CMS_ORIGIN)
    assert.equal(response.statusCode, 200)
    const payload = JSON.parse(response.body)
    assert.equal(payload.configured, true)
    assert.equal(payload.state, 'ready')
    assert.deepEqual(
      {dailyVisitorsSum: payload.traffic.dailyVisitorsSum, pageviews: payload.traffic.pageviews},
      {dailyVisitorsSum: 15, pageviews: 32},
    )
    assert.deepEqual(payload.traffic.previous, {dailyVisitorsSum: 7, pageviews: 15})
    assert.equal(payload.traffic.visitors, undefined)
    assert.match(payload.limitations.join(' '), /Samma person kan räknas på flera dagar/)
    assert.deepEqual(payload.traffic.topPages[0], {
      label: '/', value: 28, pageviews: 28, visitors: 12,
    })
    assert.equal(payload.traffic.freshness.latestDataAt, '2026-08-22T00:00:00.000Z')
    assert.equal(requests.length, 3)
    assert.equal(requests.filter(({url}) => url.pathname.endsWith('/visits/aggregate')).length, 3)
    assert.equal(requests.filter(({url}) => url.searchParams.get('by') === 'day').length, 2)
    assert.equal(requests.filter(({url}) => url.searchParams.get('by') === 'requestPath').length, 1)
    assert.equal(requests.filter(({url}) => url.pathname.endsWith('/visits/count')).length, 0)
    for (const {url, options} of requests) {
      assert.equal(options.headers.Authorization, 'Bearer server-only-fixture-token')
      assert.doesNotMatch(url.toString(), /server-only-fixture-token/)
    }
    assert.doesNotMatch(response.body, /server-only-fixture-token/)

    global.fetch = async () => ({ok: true, status: 200, json: async () => ({version: 2, data: []})})
    response = await apiRequest(CMS_ORIGIN)
    assert.equal(response.statusCode, 502)
    const failedPayload = JSON.parse(response.body)
    assert.equal(failedPayload.configured, true)
    assert.equal(failedPayload.state, 'error')
    assert.doesNotMatch(response.body, /server-only-fixture-token/)
  } finally {
    global.fetch = previousFetch
    console.log = previousLog
    console.error = previousError
    for (const [name, value] of Object.entries(environment)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
}

function checkIdempotentFixtures() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'esencial-consent-'))
  try {
    const file = path.join(directory, 'index.html')
    fs.writeFileSync(file, '<!doctype html><html lang="sv"><head></head><body><main>Fixture</main></body></html>')
    injectAnalytics(directory, FIXTURE_CONFIG)
    injectAnalytics(directory, FIXTURE_CONFIG)
    let html = fs.readFileSync(file, 'utf8')
    assert.equal(occurrences(html, /ESENCIAL_ANALYTICS_START/g), 1)
    assert.equal(occurrences(html, /ESENCIAL_CONSENT_CONTROL_START/g), 1)
    assert.equal(occurrences(html, /consent\.cookiebot\.com\/uc\.js/g), 1)
    assert.doesNotMatch(html, /<script\b[^>]+src="\/_vercel\/insights\/script\.js"/)

    injectAnalytics(directory, {})
    injectAnalytics(directory, {})
    html = fs.readFileSync(file, 'utf8')
    assert.equal(occurrences(html, /ESENCIAL_ANALYTICS_START/g), 1)
    assert.equal(occurrences(html, /ESENCIAL_CONSENT_CONTROL_START/g), 0)
    assert.doesNotMatch(html, /Cookiebot|_vercel\/insights/)
  } finally {
    fs.rmSync(directory, {force: true, recursive: true})
  }
}

function checkGeneratedPagesRemainFailClosed() {
  const files = htmlFiles(path.join(ROOT, 'public'))
  assert.ok(files.length > 0)
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8')
    assert.equal(occurrences(html, /ESENCIAL_ANALYTICS_START/g), 1)
    assert.doesNotMatch(html, /<script\b[^>]+src="\/_vercel\/insights\/script\.js"/)
    assert.doesNotMatch(html, /(?:matomo|googletagmanager|google-analytics\.com|gtag\s*\()/i)
  }
  return files.length
}

async function main() {
  checkConfigurationAndMarkup()
  checkRuntimeFixtures()
  checkCspAndBrowserSecrets()
  await checkOriginFixtures()
  await checkOfficialVercelAggregateFixtures()
  checkIdempotentFixtures()
  const pages = checkGeneratedPagesRemainFailClosed()
  console.log(`Consent checks passed: ${pages} generated pages plus pre-consent, symmetry, withdrawal, version/storage, deterministic expiry/clock, daily-visitor-sum, CSP hash, origin, secret-isolation and S11 regression fixtures.`)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
