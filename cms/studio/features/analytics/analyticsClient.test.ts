import {fetchAnalytics} from './analyticsClient'
import type {AnalyticsResponse} from './types'

const SAFE_ERROR = 'Statistikservern gav ett ogiltigt svar. Inga värden visas.'

function assertEqual(actual: unknown, expected: unknown, message = 'values differ') {
  if (!Object.is(actual, expected)) throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)
}

function assertDeepEqual(actual: unknown, expected: unknown, message = 'objects differ') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(message)
}

async function assertRejects(action: () => Promise<unknown>, expectedMessage: string, context: string) {
  try {
    await action()
  } catch (error) {
    if (error instanceof Error && error.message === expectedMessage) return
    throw new Error(`${context}: unexpected error ${error instanceof Error ? error.message : String(error)}`)
  }
  throw new Error(`${context}: expected rejection`)
}

function readyPayload(): AnalyticsResponse {
  return {
    configured: true,
    state: 'ready',
    periodDays: 7,
    period: {
      days: 7,
      current: {since: '2026-08-16', until: '2026-08-22'},
      previous: {since: '2026-08-09', until: '2026-08-15'},
    },
    generatedAt: '2026-08-23T12:00:00.000Z',
    traffic: {
      state: 'ready',
      dailyVisitorsSum: 15,
      pageviews: 32,
      previous: {dailyVisitorsSum: 7, pageviews: 15},
      series: [
        {date: '2026-08-21', dailyVisitors: 10, pageviews: 20},
        {date: '2026-08-22', dailyVisitors: 5, pageviews: 12},
      ],
      topPages: [{label: '/', value: 28, pageviews: 28, visitors: 12}],
      freshness: {
        requestedThrough: '2026-08-22',
        latestDataAt: '2026-08-22T00:00:00.000Z',
      },
    },
    search: {
      state: 'ready',
      clicks: 20,
      impressions: 1000,
      ctr: 0.02,
      position: 8.4,
      previous: {clicks: 10, impressions: 800},
      series: [
        {date: '2026-08-19', clicks: 8, impressions: 400},
        {date: '2026-08-20', clicks: 12, impressions: 600},
      ],
      topPages: [{
        label: 'https://www.esencial.se/',
        value: 18,
        clicks: 18,
        impressions: 900,
        ctr: 0.02,
        position: 7.9,
      }],
      queries: [{
        label: 'esencial',
        value: 12,
        clicks: 12,
        impressions: 500,
        ctr: 0.024,
        position: 4.2,
      }],
      freshness: {requestedThrough: '2026-08-22', latestDataAt: '2026-08-20'},
    },
    sources: {
      traffic: {provider: 'Vercel Web Analytics', state: 'ready'},
      search: {provider: 'Google Search Console', state: 'ready'},
    },
    observations: ['Organiska klick ökade mot föregående period.'],
    limitations: ['Samma person kan räknas på flera dagar.'],
  }
}

function unavailablePayload(): AnalyticsResponse {
  const payload = readyPayload()
  return {
    ...payload,
    configured: false,
    state: 'unavailable',
    traffic: null,
    search: null,
    sources: {
      traffic: {provider: 'Vercel Web Analytics', state: 'unavailable'},
      search: {provider: 'Google Search Console', state: 'unavailable'},
    },
    message: 'Ingen leverantör är ansluten.',
  }
}

function emptyPayload(): AnalyticsResponse {
  const payload = readyPayload()
  return {
    ...payload,
    state: 'empty',
    traffic: {
      ...payload.traffic!,
      state: 'empty',
      dailyVisitorsSum: 0,
      pageviews: 0,
      previous: {dailyVisitorsSum: 0, pageviews: 0},
      series: [],
      topPages: [],
      freshness: {requestedThrough: '2026-08-22', latestDataAt: null},
    },
    search: null,
    sources: {
      traffic: {provider: 'Vercel Web Analytics', state: 'empty'},
      search: {provider: 'Google Search Console', state: 'unavailable'},
    },
  }
}

function errorPayload(): AnalyticsResponse {
  const payload = readyPayload()
  return {
    ...payload,
    state: 'error',
    traffic: null,
    search: null,
    sources: {
      traffic: {provider: 'Vercel Web Analytics', state: 'error'},
      search: {provider: 'Google Search Console', state: 'unavailable'},
    },
    message: 'Leverantören kunde inte hämtas.',
  }
}

async function withPayload(payload: unknown, status = 200) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const originalFetch = globalThis.fetch
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {location: {origin: 'https://esencial-cms.sanity.studio'}},
  })
  globalThis.fetch = (async (input, init) => {
    assertEqual(String(input), 'https://esencial-cms.sanity.studio/api/analytics?days=7', 'request URL')
    assertEqual(init?.credentials, 'omit', 'request credentials')
    assertEqual(new Headers(init?.headers).has('Authorization'), false, 'browser authorization header')
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
    } as Response
  }) as typeof fetch

  try {
    return await fetchAnalytics(7)
  } finally {
    globalThis.fetch = originalFetch
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor)
    else delete (globalThis as {window?: unknown}).window
  }
}

async function checkValidResponses() {
  assertDeepEqual(await withPayload(readyPayload()), readyPayload(), 'ready response')
  assertDeepEqual(await withPayload(unavailablePayload()), unavailablePayload(), 'unavailable response')
  assertDeepEqual(await withPayload(emptyPayload()), emptyPayload(), 'empty response')
}

async function checkProviderError() {
  await assertRejects(
    () => withPayload(errorPayload(), 502),
    'Leverantören kunde inte hämtas.',
    'complete provider error',
  )
}

async function checkInvalidResponses() {
  const fixtures: Array<[string, (payload: Record<string, unknown>) => void]> = [
    ['top-level state', (payload) => { payload.state = 'unknown' }],
    ['unsupported period', (payload) => { payload.periodDays = 14 }],
    ['broken date range', (payload) => {
      (payload.period as Record<string, unknown>).current = {since: '2026-08-16', until: 'invalid'}
    }],
    ['invalid generated time', (payload) => { payload.generatedAt = 'yesterday' }],
    ['source state', (payload) => {
      ((payload.sources as Record<string, unknown>).traffic as Record<string, unknown>).state = 'unknown'
    }],
    ['source provider label', (payload) => {
      ((payload.sources as Record<string, unknown>).traffic as Record<string, unknown>).provider = 'Unexpected provider'
    }],
    ['incomplete source', (payload) => {
      delete ((payload.sources as Record<string, unknown>).traffic as Record<string, unknown>).provider
    }],
    ['non-string limitation', (payload) => { payload.limitations = ['valid', 42] }],
    ['non-string observation', (payload) => { payload.observations = ['valid', null] }],
    ['missing traffic previous', (payload) => {
      delete (payload.traffic as Record<string, unknown>).previous
    }],
    ['missing traffic series', (payload) => {
      delete (payload.traffic as Record<string, unknown>).series
    }],
    ['traffic series date outside period', (payload) => {
      ((((payload.traffic as Record<string, unknown>).series as unknown[])[0]) as Record<string, unknown>).date = '2026-08-15'
    }],
    ['unordered traffic series', (payload) => {
      ((payload.traffic as Record<string, unknown>).series as unknown[]).reverse()
    }],
    ['duplicate traffic series date', (payload) => {
      ((((payload.traffic as Record<string, unknown>).series as unknown[])[1]) as Record<string, unknown>).date = '2026-08-21'
    }],
    ['negative traffic series value', (payload) => {
      ((((payload.traffic as Record<string, unknown>).series as unknown[])[0]) as Record<string, unknown>).pageviews = -1
    }],
    ['traffic freshness disagrees with series', (payload) => {
      ((payload.traffic as Record<string, unknown>).freshness as Record<string, unknown>).latestDataAt = '2026-08-21T00:00:00.000Z'
    }],
    ['traffic state', (payload) => {
      (payload.traffic as Record<string, unknown>).state = 'unknown'
    }],
    ['inconsistent ready state', (payload) => {
      payload.state = 'empty'
    }],
    ['NaN traffic metric', (payload) => {
      (payload.traffic as Record<string, unknown>).dailyVisitorsSum = Number.NaN
    }],
    ['negative traffic row', (payload) => {
      (((payload.traffic as Record<string, unknown>).topPages as unknown[])[0] as Record<string, unknown>).visitors = -1
    }],
    ['incomplete traffic row', (payload) => {
      delete (((payload.traffic as Record<string, unknown>).topPages as unknown[])[0] as Record<string, unknown>).pageviews
    }],
    ['invalid traffic freshness', (payload) => {
      ((payload.traffic as Record<string, unknown>).freshness as Record<string, unknown>).latestDataAt = 'recently'
    }],
    ['out-of-bounds search CTR', (payload) => {
      (payload.search as Record<string, unknown>).ctr = 1.01
    }],
    ['missing search series', (payload) => {
      delete (payload.search as Record<string, unknown>).series
    }],
    ['non-numeric search series value', (payload) => {
      ((((payload.search as Record<string, unknown>).series as unknown[])[0]) as Record<string, unknown>).clicks = '8'
    }],
    ['infinite search metric', (payload) => {
      (payload.search as Record<string, unknown>).position = Number.POSITIVE_INFINITY
    }],
    ['blank search row label', (payload) => {
      (((payload.search as Record<string, unknown>).queries as unknown[])[0] as Record<string, unknown>).label = ' '
    }],
    ['incomplete search row', (payload) => {
      delete (((payload.search as Record<string, unknown>).topPages as unknown[])[0] as Record<string, unknown>).impressions
    }],
    ['non-string optional message', (payload) => { payload.message = 42 }],
  ]

  for (const [name, mutate] of fixtures) {
    const payload = structuredClone(readyPayload()) as unknown as Record<string, unknown>
    mutate(payload)
    await assertRejects(() => withPayload(payload), SAFE_ERROR, name)
  }
}

async function main() {
  await checkValidResponses()
  await checkProviderError()
  await checkInvalidResponses()
  console.log('Analytics client contract checks passed: ready/unavailable/empty/error positives and 29 nested fail-closed fixtures.')
}

void main()
