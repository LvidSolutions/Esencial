import type {AnalyticsResponse} from './types'

const studioEnvironment = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>
}).env

const DEFAULT_ENDPOINT = '/api/analytics'
const REQUEST_TIMEOUT_MS = 10_000

function analyticsEndpoint() {
  const configured = studioEnvironment?.SANITY_STUDIO_ANALYTICS_ENDPOINT?.trim()
  if (!configured) return DEFAULT_ENDPOINT

  let endpoint: URL
  try {
    endpoint = new URL(configured)
  } catch {
    throw new Error('Statistikens endpoint är felkonfigurerad.')
  }

  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) {
    throw new Error('Statistikens endpoint måste vara en HTTPS-adress utan inloggningsuppgifter.')
  }
  if (endpoint.pathname !== '/api/analytics' || endpoint.search || endpoint.hash) {
    throw new Error('Statistikens endpoint måste peka exakt på /api/analytics.')
  }
  return endpoint.toString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isAnalyticsResponse(value: unknown): value is AnalyticsResponse {
  if (!isRecord(value)) return false
  if (typeof value.configured !== 'boolean' || typeof value.state !== 'string') return false
  if (typeof value.periodDays !== 'number' || typeof value.generatedAt !== 'string') return false
  if (!isRecord(value.period) || !isRecord(value.sources) || !Array.isArray(value.limitations)) {
    return false
  }
  return true
}

export async function fetchAnalytics(days: 7 | 30 | 90, signal?: AbortSignal) {
  const endpoint = new URL(analyticsEndpoint(), window.location.origin)
  endpoint.searchParams.set('days', String(days))

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout
  const response = await fetch(endpoint, {
    credentials: 'omit',
    headers: {Accept: 'application/json'},
    method: 'GET',
    signal: combinedSignal,
  })
  const payload: unknown = await response.json().catch(() => undefined)

  if (!isAnalyticsResponse(payload)) {
    throw new Error('Statistikservern gav ett ogiltigt svar. Inga värden visas.')
  }
  if (!response.ok) {
    throw new Error(
      typeof payload.message === 'string'
        ? payload.message
        : 'Statistiken kunde inte hämtas. Försök igen.',
    )
  }
  return payload
}
