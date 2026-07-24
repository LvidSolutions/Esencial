/*
 * Server-side analytics adapter for Vercel.
 * Provider credentials stay in encrypted Vercel environment variables; the
 * Studio receives aggregated figures only.
 */
const crypto = require('node:crypto')

const studioOrigin = process.env.CMS_ORIGIN || 'https://esencial-cms.sanity.studio'

function response(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, max-age=300')
  res.setHeader('Access-Control-Allow-Origin', studioOrigin)
  res.setHeader('Vary', 'Origin')
  res.end(JSON.stringify(payload))
}

function dateRange(days, offset = 0) {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 1 - offset)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days + 1)
  return {start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10)}
}

function matomoEndpoint() {
  const configured = process.env.MATOMO_URL
  if (!configured) return undefined
  const url = new URL(configured)
  if (url.protocol !== 'https:') throw new Error('MATOMO_URL must use HTTPS.')
  if (!url.pathname.endsWith('.php')) url.pathname = `${url.pathname.replace(/\/$/, '')}/index.php`
  return url
}

async function matomoQuery(method, parameters) {
  const endpoint = matomoEndpoint()
  if (!endpoint || !process.env.MATOMO_API_TOKEN || !process.env.MATOMO_SITE_ID) return undefined
  const body = new URLSearchParams({
    module: 'API',
    method,
    idSite: process.env.MATOMO_SITE_ID,
    format: 'JSON',
    token_auth: process.env.MATOMO_API_TOKEN,
    ...parameters,
  })
  const result = await fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body})
  if (!result.ok) throw new Error(`Matomo svarade ${result.status}`)
  const data = await result.json()
  if (data?.result === 'error') throw new Error('Matomo avvisade statistikförfrågan.')
  return data
}

function rangeParameters(range) {
  return {period: 'range', date: `${range.start},${range.end}`}
}

function number(value) {
  return Number(value || 0)
}

function frequencyMetric(rows, pattern, metric) {
  const row = (rows || []).find((item) => pattern.test(String(item.label || item.segment || '')))
  return row ? number(row[metric]) : 0
}

async function trafficSummary(range) {
  const parameters = rangeParameters(range)
  const [summary, actions, frequency] = await Promise.all([
    matomoQuery('VisitsSummary.get', parameters),
    matomoQuery('Actions.get', parameters),
    matomoQuery('VisitFrequency.get', parameters),
  ])
  return {
    visitors: number(summary?.nb_visits),
    uniqueVisitors: number(summary?.nb_uniq_visitors),
    pageviews: number(actions?.nb_pageviews || summary?.nb_pageviews),
    returningVisitors: frequencyMetric(frequency, /return/i, 'nb_uniq_visitors'),
  }
}

async function traffic(days) {
  if (!process.env.MATOMO_URL || !process.env.MATOMO_API_TOKEN || !process.env.MATOMO_SITE_ID) return undefined
  const current = dateRange(days)
  const previous = dateRange(days, days)
  const [summary, previousSummary, pageRows] = await Promise.all([
    trafficSummary(current),
    trafficSummary(previous),
    matomoQuery('Actions.getPageUrls', {...rangeParameters(current), flat: '1', filter_limit: '10'}),
  ])
  return {
    ...summary,
    previous: previousSummary,
    topPages: (pageRows || []).map((row) => ({label: row.label || '/', value: number(row.nb_hits || row.nb_pageviews)})),
  }
}

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

async function serviceAccountToken() {
  const account = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}')
  if (!account.client_email || !account.private_key) return undefined
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({alg: 'RS256', typ: 'JWT'}))
  const claim = base64url(JSON.stringify({iss: account.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600}))
  const signingInput = `${header}.${claim}`
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).end().sign(account.private_key, 'base64url')
  const result = await fetch('https://oauth2.googleapis.com/token', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${signingInput}.${signature}`})})
  if (!result.ok) throw new Error(`Google-inloggning misslyckades (${result.status})`)
  return (await result.json()).access_token
}

async function searchConsoleQuery(token, body) {
  const site = encodeURIComponent(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL)
  const result = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`, {method: 'POST', headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, body: JSON.stringify(body)})
  if (!result.ok) throw new Error(`Search Console svarade ${result.status}`)
  return result.json()
}

function searchTotals(data) {
  return (data.rows || []).reduce((all, row) => ({clicks: all.clicks + number(row.clicks), impressions: all.impressions + number(row.impressions), weightedPosition: all.weightedPosition + number(row.position) * number(row.impressions)}), {clicks: 0, impressions: 0, weightedPosition: 0})
}

async function search(days) {
  if (!process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return undefined
  const token = await serviceAccountToken()
  const current = dateRange(days)
  const previous = dateRange(days, days)
  const currentBase = {startDate: current.start, endDate: current.end, type: 'web'}
  const previousBase = {startDate: previous.start, endDate: previous.end, type: 'web'}
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
    topPages: (pages.rows || []).map((row) => ({label: row.keys?.[0], value: number(row.clicks)})),
    queries: (queries.rows || []).map((row) => ({label: row.keys?.[0], value: number(row.clicks)})),
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

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return response(res, 204, {})
  const origin = req.headers.origin
  if (origin && origin !== studioOrigin) return response(res, 403, {message: 'Den här statistiken är endast tillgänglig från CMS.'})
  const requested = Number.parseInt(req.query?.days, 10)
  const days = [7, 30, 90].includes(requested) ? requested : 30
  if (!process.env.MATOMO_API_TOKEN && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return response(res, 200, {configured: false, message: 'Anslut Matomo Cloud och/eller Google Search Console i Vercels miljövariabler. Inga siffror visas förrän dess.'})
  try {
    const [trafficData, searchData] = await Promise.all([traffic(days), search(days)])
    return response(res, 200, {configured: true, periodDays: days, traffic: trafficData, search: searchData, observations: observations(searchData), limitations: trafficData ? ['Återkommande besökare avser endast besökare som har godkänt statistikcookies.'] : []})
  } catch (error) {
    return response(res, 502, {configured: false, message: `Statistiken kunde inte hämtas: ${error.message}`})
  }
}
