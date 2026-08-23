export type AnalyticsState = 'unavailable' | 'empty' | 'ready' | 'error'

export type AnalyticsSource = {
  provider: string
  state: AnalyticsState
  message?: string
}

export type DateWindow = {
  since: string
  until: string
}

export type AnalyticsPeriod = {
  days: number
  current: DateWindow
  previous: DateWindow
}

export type Freshness = {
  requestedThrough: string
  latestDataAt: string | null
}

export type TrafficPage = {
  label: string
  value: number
  pageviews: number
  visitors: number
}

export type SearchRow = {
  label: string
  value: number
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type AnalyticsResponse = {
  configured: boolean
  state: AnalyticsState
  periodDays: number
  period: AnalyticsPeriod
  generatedAt: string
  traffic: {
    state: 'empty' | 'ready'
    dailyVisitorsSum: number
    pageviews: number
    previous: {dailyVisitorsSum: number; pageviews: number}
    topPages: TrafficPage[]
    freshness: Freshness
  } | null
  search: {
    state: 'empty' | 'ready'
    clicks: number
    impressions: number
    ctr: number
    position: number
    previous: {clicks: number; impressions: number}
    topPages: SearchRow[]
    queries: SearchRow[]
    freshness: Freshness
  } | null
  sources: {
    traffic: AnalyticsSource
    search: AnalyticsSource
  }
  observations?: string[]
  limitations: string[]
  message?: string
}
