import type {
  AnalyticsPeriod,
  AnalyticsResponse,
  AnalyticsSource,
  AnalyticsState,
  Freshness,
  SearchDailyPoint,
  SearchRow,
  TrafficDailyPoint,
  TrafficPage,
} from './types'

const DAY_MS = 86_400_000
const PERIOD_DAYS = new Set([7, 30, 90])
const ANALYTICS_STATES = new Set<AnalyticsState>(['unavailable', 'empty', 'ready', 'error'])
const DATA_STATES = new Set(['empty', 'ready'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function hasOptionalString(value: Record<string, unknown>, key: string) {
  return value[key] === undefined || typeof value[key] === 'string'
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isCtr(value: unknown): value is number {
  return isFiniteNonNegative(value) && value <= 1
}

function isoDay(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    return null
  }
  return timestamp / DAY_MS
}

function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
}

function isDateValue(value: unknown): value is string {
  return isoDay(value) !== null || isIsoDateTime(value)
}

function dateWindow(value: unknown) {
  if (!isRecord(value)) return null
  const since = isoDay(value.since)
  const until = isoDay(value.until)
  return since !== null && until !== null && since <= until ? {since, until} : null
}

function isPeriod(value: unknown, expectedDays: number): value is AnalyticsPeriod {
  if (!isRecord(value) || value.days !== expectedDays) return false
  const current = dateWindow(value.current)
  const previous = dateWindow(value.previous)
  if (!current || !previous) return false
  return current.until - current.since + 1 === expectedDays
    && previous.until - previous.since + 1 === expectedDays
    && previous.until + 1 === current.since
}

function isSource(value: unknown, provider: string): value is AnalyticsSource {
  if (!isRecord(value)) return false
  return value.provider === provider
    && ANALYTICS_STATES.has(value.state as AnalyticsState)
    && hasOptionalString(value, 'message')
}

function isFreshness(value: unknown): value is Freshness {
  if (!isRecord(value) || isoDay(value.requestedThrough) === null) return false
  return value.latestDataAt === null || isDateValue(value.latestDataAt)
}

function isTrafficPage(value: unknown): value is TrafficPage {
  if (!isRecord(value)) return false
  return isNonEmptyString(value.label)
    && isFiniteNonNegative(value.value)
    && isFiniteNonNegative(value.pageviews)
    && isFiniteNonNegative(value.visitors)
}

function isSearchRow(value: unknown): value is SearchRow {
  if (!isRecord(value)) return false
  return isNonEmptyString(value.label)
    && isFiniteNonNegative(value.value)
    && isFiniteNonNegative(value.clicks)
    && isFiniteNonNegative(value.impressions)
    && isCtr(value.ctr)
    && isFiniteNonNegative(value.position)
}

function isTrafficDailyPoint(value: unknown): value is TrafficDailyPoint {
  return isRecord(value)
    && isoDay(value.date) !== null
    && isFiniteNonNegative(value.dailyVisitors)
    && isFiniteNonNegative(value.pageviews)
}

function isSearchDailyPoint(value: unknown): value is SearchDailyPoint {
  return isRecord(value)
    && isoDay(value.date) !== null
    && isFiniteNonNegative(value.clicks)
    && isFiniteNonNegative(value.impressions)
}

function isDailySeries<T extends {date: string}>(
  value: unknown,
  period: AnalyticsPeriod,
  isPoint: (point: unknown) => point is T,
): value is T[] {
  if (!Array.isArray(value) || value.length > period.days) return false
  const since = isoDay(period.current.since)
  const until = isoDay(period.current.until)
  if (since === null || until === null) return false

  let previousDay: number | null = null
  for (const point of value) {
    if (!isPoint(point)) return false
    const day = isoDay(point.date)
    if (day === null || day < since || day > until || (previousDay !== null && day <= previousDay)) {
      return false
    }
    previousDay = day
  }
  return true
}

function freshnessMatchesSeries(freshness: Freshness, series: Array<{date: string}>) {
  if (series.length === 0) return freshness.latestDataAt === null
  return freshness.latestDataAt !== null
    && freshness.latestDataAt.slice(0, 10) === series.at(-1)?.date
}

function isTraffic(value: unknown, period: AnalyticsPeriod): value is NonNullable<AnalyticsResponse['traffic']> {
  if (!isRecord(value) || !DATA_STATES.has(value.state as string)) return false
  if (!isFiniteNonNegative(value.dailyVisitorsSum) || !isFiniteNonNegative(value.pageviews)) {
    return false
  }
  if (!isRecord(value.previous)
    || !isFiniteNonNegative(value.previous.dailyVisitorsSum)
    || !isFiniteNonNegative(value.previous.pageviews)) {
    return false
  }
  if (!isDailySeries(value.series, period, isTrafficDailyPoint)
    || !isFreshness(value.freshness)
    || !freshnessMatchesSeries(value.freshness, value.series)) {
    return false
  }
  return Array.isArray(value.topPages)
    && value.topPages.length <= 10
    && value.topPages.every(isTrafficPage)
}

function isSearch(value: unknown, period: AnalyticsPeriod): value is NonNullable<AnalyticsResponse['search']> {
  if (!isRecord(value) || !DATA_STATES.has(value.state as string)) return false
  if (!isFiniteNonNegative(value.clicks)
    || !isFiniteNonNegative(value.impressions)
    || !isCtr(value.ctr)
    || !isFiniteNonNegative(value.position)) {
    return false
  }
  if (!isRecord(value.previous)
    || !isFiniteNonNegative(value.previous.clicks)
    || !isFiniteNonNegative(value.previous.impressions)) {
    return false
  }
  if (!isDailySeries(value.series, period, isSearchDailyPoint)
    || !isFreshness(value.freshness)
    || !freshnessMatchesSeries(value.freshness, value.series)) {
    return false
  }
  return Array.isArray(value.topPages)
    && value.topPages.length <= 10
    && value.topPages.every(isSearchRow)
    && Array.isArray(value.queries)
    && value.queries.length <= 10
    && value.queries.every(isSearchRow)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

export function isAnalyticsResponse(value: unknown): value is AnalyticsResponse {
  if (!isRecord(value)
    || typeof value.configured !== 'boolean'
    || !ANALYTICS_STATES.has(value.state as AnalyticsState)
    || typeof value.periodDays !== 'number'
    || !PERIOD_DAYS.has(value.periodDays)
    || !isIsoDateTime(value.generatedAt)
    || !isPeriod(value.period, value.periodDays)
    || !hasOptionalString(value, 'message')
    || !isStringArray(value.limitations)
    || (value.observations !== undefined && !isStringArray(value.observations))) {
    return false
  }

  if (!isRecord(value.sources)
    || !isSource(value.sources.traffic, 'Vercel Web Analytics')
    || !isSource(value.sources.search, 'Google Search Console')) {
    return false
  }

  if (!Object.hasOwn(value, 'traffic') || !Object.hasOwn(value, 'search')) return false
  if (value.traffic !== null && !isTraffic(value.traffic, value.period)) return false
  if (value.search !== null && !isSearch(value.search, value.period)) return false

  if (value.state === 'unavailable') {
    return !value.configured && value.traffic === null && value.search === null
  }
  if (value.state === 'error') {
    return value.traffic === null && value.search === null
  }

  if (!value.configured || (value.traffic === null && value.search === null)) return false
  if (value.traffic === null && value.sources.traffic.state !== 'unavailable') return false
  if (value.search === null && value.sources.search.state !== 'unavailable') return false
  if (value.traffic !== null && value.sources.traffic.state !== value.traffic.state) return false
  if (value.search !== null && value.sources.search.state !== value.search.state) return false

  const nestedStates = [value.traffic?.state, value.search?.state].filter(Boolean)
  return value.state === 'ready'
    ? nestedStates.includes('ready')
    : nestedStates.every((state) => state === 'empty')
}
