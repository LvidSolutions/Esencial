/*
 * Server-side analytics adapter for a future Vercel deployment.
 * Keep all variables in the hosting provider's encrypted environment settings.
 * This endpoint intentionally returns only aggregated data to the Studio.
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

async function plausibleQuery(body) {
  const result = await fetch('https://plausible.io/api/v2/query', {
    method: 'POST',
    headers: {Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  })
  if (!result.ok) throw new Error(`Plausible svarade ${result.status}`)
  return result.json()
}

async function traffic(days) {
  if (!process.env.PLAUSIBLE_API_KEY || !process.env.PLAUSIBLE_SITE_ID) return undefined
  const range = dateRange(days)
  const query = {site_id: process.env.PLAUSIBLE_SITE_ID, date_range: [range.start, range.end], metrics: ['visitors', 'pageviews']}
  const pages = {...query, dimensions: ['event:page'], metrics: ['visitors'], pagination: {limit: 10, offset: 0}}
  const [summary, pageRows] = await Promise.all([plausibleQuery(query), plausibleQuery(pages)])
  const values = summary.results?.[0]?.metrics || []
  return {
    visitors: Number(values[0] || 0),
    pageviews: Number(values[1] || 0),
    // Plausible's aggregate API does not expose returning visitors. We deliberately do not infer it.
    returningVisitors: null,
    topPages: (pageRows.results || []).map((row) => ({label: row.dimensions?.[0] || '/', value: Number(row.metrics?.[0] || 0)})),
  }
}

function base64url(value) { return Buffer.from(value).toString('base64url') }

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

async function search(days) {
  if (!process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return undefined
  const token = await serviceAccountToken()
  const range = dateRange(days)
  const base = {startDate: range.start, endDate: range.end, type: 'web'}
  const [summary, pages, queries] = await Promise.all([
    searchConsoleQuery(token, base),
    searchConsoleQuery(token, {...base, dimensions: ['page'], rowLimit: 10}),
    searchConsoleQuery(token, {...base, dimensions: ['query'], rowLimit: 10}),
  ])
  const rows = summary.rows || []
  const totals = rows.reduce((all, row) => ({clicks: all.clicks + row.clicks, impressions: all.impressions + row.impressions, weightedPosition: all.weightedPosition + row.position * row.impressions}), {clicks: 0, impressions: 0, weightedPosition: 0})
  return {clicks: totals.clicks, impressions: totals.impressions, ctr: totals.impressions ? totals.clicks / totals.impressions : 0, position: totals.impressions ? totals.weightedPosition / totals.impressions : 0, topPages: (pages.rows || []).map((row) => ({label: row.keys?.[0], value: row.clicks})), queries: (queries.rows || []).map((row) => ({label: row.keys?.[0], value: row.clicks}))}
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
  if (!process.env.PLAUSIBLE_API_KEY && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return response(res, 200, {configured: false, message: 'Anslut Plausible och/eller Google Search Console i hostingens miljövariabler. Inga siffror visas förrän dess.'})
  try {
    const [trafficData, searchData] = await Promise.all([traffic(days), search(days)])
    return response(res, 200, {configured: true, periodDays: days, traffic: trafficData, search: searchData, observations: observations(searchData), limitations: trafficData?.returningVisitors === null ? ['Återkommande besökare visas som – tills vald trafikkälla kan leverera måttet.'] : []})
  } catch (error) {
    return response(res, 502, {configured: false, message: `Statistiken kunde inte hämtas: ${error.message}`})
  }
}
