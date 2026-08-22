/*
 * Server-only adapter for aggregated Vercel Web Analytics and, when the
 * production property exists, Google Search Console. Provider credentials are
 * never accepted from the request or returned to Sanity Studio.
 */
const crypto = require('node:crypto')

const DEFAULT_STUDIO_ORIGIN = 'https://esencial-cms.sanity.studio'
const VERCEL_ANALYTICS_API = 'https://api.vercel.com/v1/query/web-analytics/visits'
const REQUEST_TIMEOUT_MS = 8000
const RETURNING_VISITORS_LIMITATION = 'Återkommande besökare är inte tillgängligt med den valda integritetsnivån.'
const CONSENT_LIMITATION = 'Trafikmätningen omfattar endast besökare som har godkänt statistikmätning.'

class ProviderError extends Error {
  constructor(provider, status) {
    super(`${provider} kunde inte hämtas${status ? ` (${status})` : ''}.`)
    this.name = 'ProviderError'
  }
}

function cmsOrigin() {
  const configured = (process.env.CMS_ORIGIN || DEFAULT_STUDIO_ORIGIN).trim()
  const url = new URL(configured)
  if (url.protocol !== 'https:' || url.origin !== configured) throw new Error('CMS_ORIGIN must be one HTTPS origin without a path.')
  return configured
}

function send(res, status, payload, origin) {
  res.statusCode = status
  res.setHeader('Cache-Control', status === 200 && payload?.configured ? 'private, max-age=300' : 'no-store')
  res.setHeader('Vary', 'Origin')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
  if (status === 204) return res.end()
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.end(JSON.stringify(payload))
}

function dateRange(days, offset = 0) {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 1 - offset)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days + 1)
  return {since: start.toISOString().slice(0, 10), until: end.toISOString().slice(0, 10)}
}

function configuration(names) {
  const values = Object.fromEntries(names.map((name) => [name, process.env[name]?.trim()]))
  const present = names.filter((name) => values[name])
  return {ready: present.length === names.length, partial: present.length > 0 && present.length < names.length, values}
}

function analyticsConfiguration() {
  return configuration(['VERCEL_ANALYTICS_TOKEN', 'VERCEL_ANALYTICS_TEAM_ID', 'VERCEL_ANALYTICS_PROJECT_ID'])
}

function searchConfiguration() {
  const site = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim()
  const account = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  return {ready: Boolean(site && account), partial: Boolean(site) !== Boolean(account), values: {site, account}}
}

async function fetchJson(url, options, provider) {
  let result
  try {
    result = await fetch(url, {...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)})
  } catch {
    throw new ProviderError(provider)
  }
  if (!result.ok) throw new ProviderError(provider, result.status)
  try {
    return await result.json()
  } catch {
    throw new ProviderError(provider)
  }
}

function finiteMetric(value, provider) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new ProviderError(provider)
  return value
}

async function vercelQuery(kind, range, extra = {}) {
  const config = analyticsConfiguration().values
  const url = new URL(`${VERCEL_ANALYTICS_API}/${kind}`)
  url.searchParams.set('projectId', config.VERCEL_ANALYTICS_PROJECT_ID)
  url.searchParams.set('teamId', config.VERCEL_ANALYTICS_TEAM_ID)
  url.searchParams.set('since', range.since)
  url.searchParams.set('until', range.until)
  url.searchParams.set('filter', "environment eq 'production'")
  for (const [name, value] of Object.entries(extra)) url.searchParams.set(name, String(value))
  return fetchJson(url, {headers: {Authorization: `Bearer ${config.VERCEL_ANALYTICS_TOKEN}`}}, 'Vercel Web Analytics')
}

function vercelCount(result) {
  return {
    visitors: finiteMetric(result?.data?.visitors, 'Vercel Web Analytics'),
    pageviews: finiteMetric(result?.data?.pageviews, 'Vercel Web Analytics'),
  }
}

function vercelTopPages(result) {
  if (!Array.isArray(result?.data)) throw new ProviderError('Vercel Web Analytics')
  return result.data
    .map((row) => {
      if (typeof row?.requestPath !== 'string' || !row.requestPath) throw new ProviderError('Vercel Web Analytics')
      return {label: row.requestPath, value: finiteMetric(row.pageviews, 'Vercel Web Analytics')}
    })
    .filter((row) => row.label !== 'Others')
}

async function traffic(days) {
  const current = dateRange(days)
  const previous = dateRange(days, days)
  const [currentResult, previousResult, pagesResult] = await Promise.all([
    vercelQuery('count', current),
    vercelQuery('count', previous),
    vercelQuery('aggregate', current, {by: 'requestPath', limit: 10}),
  ])
  const summary = vercelCount(currentResult)
  const topPages = vercelTopPages(pagesResult)
  return {
    ...summary,
    previous: vercelCount(previousResult),
    topPages,
    state: summary.visitors === 0 && summary.pageviews === 0 && topPages.length === 0 ? 'empty' : 'ready',
  }
}

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

async function serviceAccountToken() {
  let account
  try {
    account = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  } catch {
    throw new ProviderError('Google Search Console')
  }
  if (!account?.client_email || !account?.private_key) throw new ProviderError('Google Search Console')
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({alg: 'RS256', typ: 'JWT'}))
  const claim = base64url(JSON.stringify({iss: account.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600}))
  const signingInput = `${header}.${claim}`
  let signature
  try {
    signature = crypto.createSign('RSA-SHA256').update(signingInput).end().sign(account.private_key, 'base64url')
  } catch {
    throw new ProviderError('Google Search Console')
  }
  const result = await fetchJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${signingInput}.${signature}`}),
  }, 'Google Search Console')
  if (typeof result?.access_token !== 'string' || !result.access_token) throw new ProviderError('Google Search Console')
  return result.access_token
}

async function searchConsoleQuery(token, body) {
  const site = encodeURIComponent(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL.trim())
  return fetchJson(`https://www.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  }, 'Google Search Console')
}

function metric(value, provider = 'Google Search Console') {
  return finiteMetric(value, provider)
}

function searchTotals(data) {
  if (!Array.isArray(data?.rows) && data?.rows !== undefined) throw new ProviderError('Google Search Console')
  return (data?.rows || []).reduce((all, row) => ({
    clicks: all.clicks + metric(row.clicks),
    impressions: all.impressions + metric(row.impressions),
    weightedPosition: all.weightedPosition + metric(row.position) * metric(row.impressions),
  }), {clicks: 0, impressions: 0, weightedPosition: 0})
}

function searchRows(data) {
  if (!Array.isArray(data?.rows) && data?.rows !== undefined) throw new ProviderError('Google Search Console')
  return (data?.rows || []).filter((row) => typeof row?.keys?.[0] === 'string').map((row) => ({label: row.keys[0], value: metric(row.clicks)}))
}

async function search(days) {
  const token = await serviceAccountToken()
  const current = dateRange(days)
  const previous = dateRange(days, days)
  const currentBase = {startDate: current.since, endDate: current.until, type: 'web'}
  const previousBase = {startDate: previous.since, endDate: previous.until, type: 'web'}
  const [summary, previousSummary, pages, queries] = await Promise.all([
    searchConsoleQuery(token, currentBase),
    searchConsoleQuery(token, previousBase),
    searchConsoleQuery(token, {...currentBase, dimensions: ['page'], rowLimit: 10}),
    searchConsoleQuery(token, {...currentBase, dimensions: ['query'], rowLimit: 10}),
  ])
  const totals = searchTotals(summary)
  const prior = searchTotals(previousSummary)
  return {
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
    position: totals.impressions ? totals.weightedPosition / totals.impressions : 0,
    previous: {clicks: prior.clicks, impressions: prior.impressions},
    topPages: searchRows(pages),
    queries: searchRows(queries),
    state: totals.clicks === 0 && totals.impressions === 0 ? 'empty' : 'ready',
  }
}

function observations(searchData) {
  if (!searchData) return ['Google Search Console är inte ansluten ännu.']
  if (!searchData.impressions) return ['Google har ännu ingen sökdata för vald period.']
  const notes = [`${searchData.clicks} organiska klick från ${searchData.impressions} visningar.`]
  if (searchData.ctr < 0.02) notes.push('Synligheten är större än klickfrekvensen. Granska titlar och beskrivningar för sidor med många visningar.')
  if (searchData.position > 20) notes.push('Genomsnittlig position är utanför de första två söksidorna. Prioritera innehåll med relevanta sökfraser.')
  return notes
}

function source(provider, state, message) {
  return {provider, state, ...(message ? {message} : {})}
}

async function handler(req, res) {
  let allowedOrigin
  try {
    allowedOrigin = cmsOrigin()
  } catch {
    return send(res, 500, {configured: false, state: 'error', message: 'Serverns CMS-origin är felkonfigurerad.'})
  }

  const requestOrigin = req.headers?.origin
  if (requestOrigin !== allowedOrigin) return send(res, 403, {configured: false, state: 'error', message: 'Den här statistiken är endast tillgänglig från CMS.'})
  if (req.method === 'OPTIONS') return send(res, 204, undefined, allowedOrigin)
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    return send(res, 405, {configured: false, state: 'error', message: 'Endast GET stöds.'}, allowedOrigin)
  }

  const requested = Number.parseInt(req.query?.days, 10)
  const days = [7, 30, 90].includes(requested) ? requested : 30
  const analyticsConfig = analyticsConfiguration()
  const searchConfig = searchConfiguration()

  if (analyticsConfig.partial || searchConfig.partial) {
    return send(res, 503, {
      configured: false,
      state: 'error',
      periodDays: days,
      message: 'Statistikkonfigurationen är ofullständig. Kontrollera serverns miljövariabler.',
      sources: {
        traffic: source('Vercel Web Analytics', analyticsConfig.partial ? 'error' : analyticsConfig.ready ? 'ready' : 'unavailable'),
        search: source('Google Search Console', searchConfig.partial ? 'error' : searchConfig.ready ? 'ready' : 'unavailable'),
      },
      limitations: [RETURNING_VISITORS_LIMITATION, CONSENT_LIMITATION],
    }, allowedOrigin)
  }

  if (!analyticsConfig.ready && !searchConfig.ready) {
    return send(res, 200, {
      configured: false,
      state: 'unavailable',
      periodDays: days,
      message: 'Vercel Web Analytics och Google Search Console är inte anslutna. Inga siffror visas förrän serverkonfigurationen är klar.',
      traffic: null,
      search: null,
      sources: {
        traffic: source('Vercel Web Analytics', 'unavailable', 'Kontoaktivering och server-token återstår.'),
        search: source('Google Search Console', 'unavailable', 'Produktionsdomänens egendom och servernyckel återstår.'),
      },
      limitations: [RETURNING_VISITORS_LIMITATION, CONSENT_LIMITATION],
    }, allowedOrigin)
  }

  try {
    const [trafficData, searchData] = await Promise.all([
      analyticsConfig.ready ? traffic(days) : Promise.resolve(null),
      searchConfig.ready ? search(days) : Promise.resolve(null),
    ])
    const trafficState = trafficData?.state || 'unavailable'
    const searchState = searchData?.state || 'unavailable'
    return send(res, 200, {
      configured: true,
      state: trafficState === 'ready' || searchState === 'ready' ? 'ready' : 'empty',
      periodDays: days,
      traffic: trafficData,
      search: searchData,
      sources: {
        traffic: source('Vercel Web Analytics', trafficState, trafficData ? undefined : 'Serverkonfiguration saknas.'),
        search: source('Google Search Console', searchState, searchData ? undefined : 'Produktionsdomänens egendom är inte ansluten.'),
      },
      observations: observations(searchData),
      limitations: [RETURNING_VISITORS_LIMITATION, CONSENT_LIMITATION],
    }, allowedOrigin)
  } catch (error) {
    const provider = error instanceof ProviderError ? error.message : 'Statistiken kunde inte hämtas.'
    return send(res, 502, {
      configured: false,
      state: 'error',
      periodDays: days,
      message: provider,
      sources: {
        traffic: source('Vercel Web Analytics', analyticsConfig.ready ? 'error' : 'unavailable'),
        search: source('Google Search Console', searchConfig.ready ? 'error' : 'unavailable'),
      },
      limitations: [RETURNING_VISITORS_LIMITATION, CONSENT_LIMITATION],
    }, allowedOrigin)
  }
}

module.exports = handler
module.exports._internals = {dateRange, traffic, vercelCount, vercelTopPages}
