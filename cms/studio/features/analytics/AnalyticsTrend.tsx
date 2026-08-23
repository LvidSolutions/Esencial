import {useEffect, useId, useMemo, useRef, useState} from 'react'
import {Box, Card, Flex, Heading, Stack, Text} from '@sanity/ui'
import {nextTrendPointIndex, splitConsecutivePoints, trendSummary} from './trendModel'
import type {AnalyticsResponse, Freshness} from './types'

type TrendMetric = {
  key: string
  label: string
  shortLabel: string
  source: string
  current: number
  previous: number
  freshness: Freshness
  points: Array<{date: string; value: number}>
}

const numberFormatter = new Intl.NumberFormat('sv-SE')
const dateFormatter = new Intl.DateTimeFormat('sv-SE', {day: 'numeric', month: 'short'})

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`))
}

function comparison(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 'Oförändrat mot föregående period' : 'Föregående period var noll'
  const percent = ((current - previous) / previous) * 100
  return `${percent >= 0 ? '+' : '−'}${Math.abs(percent).toFixed(0)} % mot föregående period`
}

function metricsFor(data: AnalyticsResponse): TrendMetric[] {
  const metrics: TrendMetric[] = []
  if (data.traffic) {
    metrics.push(
      {
        key: 'traffic-pageviews',
        label: 'Sidvisningar',
        shortLabel: 'sidvisningar',
        source: 'Vercel Web Analytics',
        current: data.traffic.pageviews,
        previous: data.traffic.previous.pageviews,
        freshness: data.traffic.freshness,
        points: data.traffic.series.map((point) => ({date: point.date, value: point.pageviews})),
      },
      {
        key: 'traffic-visitors',
        label: 'Dagliga besökare',
        shortLabel: 'besökare',
        source: 'Vercel Web Analytics',
        current: data.traffic.dailyVisitorsSum,
        previous: data.traffic.previous.dailyVisitorsSum,
        freshness: data.traffic.freshness,
        points: data.traffic.series.map((point) => ({date: point.date, value: point.dailyVisitors})),
      },
    )
  }
  if (data.search) {
    metrics.push(
      {
        key: 'search-clicks',
        label: 'Klick från Google',
        shortLabel: 'klick',
        source: 'Google Search Console',
        current: data.search.clicks,
        previous: data.search.previous.clicks,
        freshness: data.search.freshness,
        points: data.search.series.map((point) => ({date: point.date, value: point.clicks})),
      },
      {
        key: 'search-impressions',
        label: 'Visningar i Google',
        shortLabel: 'visningar',
        source: 'Google Search Console',
        current: data.search.impressions,
        previous: data.search.previous.impressions,
        freshness: data.search.freshness,
        points: data.search.series.map((point) => ({date: point.date, value: point.impressions})),
      },
    )
  }
  return metrics
}

export function AnalyticsTrend({data}: {data: AnalyticsResponse}) {
  const metrics = useMemo(() => metricsFor(data), [data])
  const [metricKey, setMetricKey] = useState(metrics[0]?.key || '')
  const selectId = useId()

  useEffect(() => {
    if (!metrics.some((metric) => metric.key === metricKey)) setMetricKey(metrics[0]?.key || '')
  }, [metricKey, metrics])

  const metric = metrics.find((item) => item.key === metricKey) || metrics[0]
  if (!metric) {
    return (
      <Card border padding={4} radius={2} role="status">
        <Heading as="h4" size={2}>Daglig trend är inte tillgänglig</Heading>
        <Text as="p" muted size={1} className="esencial-analytics__empty">
          Ingen ansluten källa returnerade en validerad dagserie. Inga reservvärden visas.
        </Text>
      </Card>
    )
  }

  return (
    <Card border padding={4} radius={2} className="esencial-analytics__trend-card">
      <Stack space={4}>
        <Flex align={['stretch', 'flex-end']} direction={['column', 'row']} gap={3} justify="space-between">
          <Box>
            <Heading as="h4" size={2}>Daglig trend</Heading>
            <Text as="p" muted size={1} className="esencial-analytics__trend-intro">
              Verkliga leverantörspunkter för {data.periodDays} dagar. Saknade datum fylls inte med uppskattade nollor.
            </Text>
          </Box>
          <label className="esencial-analytics__trend-select" htmlFor={selectId}>
            <span>Visad serie</span>
            <select id={selectId} onChange={(event) => setMetricKey(event.currentTarget.value)} value={metric.key}>
              {metrics.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </label>
        </Flex>

        <TrendChart key={metric.key} metric={metric} period={data.period.current} periodDays={data.periodDays} />

        <Card padding={3} radius={2} tone="caution">
          <Text size={1}>
            Grafen visar samvariation över tid, inte att SEO har orsakat en trafikförändring. Kampanjer, säsong, publiceringstakt, press och andra händelser kan påverka utvecklingen.
          </Text>
        </Card>
      </Stack>
    </Card>
  )
}

function TrendChart({
  metric,
  period,
  periodDays,
}: {
  metric: TrendMetric
  period: {since: string; until: string}
  periodDays: number
}) {
  const titleId = useId()
  const descriptionId = useId()
  const instructionId = useId()
  const pointRefs = useRef<Array<SVGGElement | null>>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const summary = trendSummary(metric.points)

  if (!summary) {
    return (
      <Card border padding={3} radius={2} role="status">
        <Stack space={2}>
          <Text weight="semibold">Ingen daglig mätpunkt för {metric.label.toLocaleLowerCase('sv-SE')}</Text>
          <Text muted size={1}>
            {metric.source} är ansluten men returnerade ingen dagserie för perioden. Periodsumman är {numberFormatter.format(metric.current)}; inget linjediagram ritas.
          </Text>
          <SourceLine metric={metric} />
        </Stack>
      </Card>
    )
  }

  const width = 720
  const height = 230
  const plot = {left: 52, right: 16, top: 20, bottom: 38}
  const plotWidth = width - plot.left - plot.right
  const plotHeight = height - plot.top - plot.bottom
  const periodStart = Date.parse(`${period.since}T00:00:00.000Z`)
  const maxValue = Math.max(1, ...metric.points.map((point) => point.value))
  const coordinates = metric.points.map((point) => {
    const elapsedDays = (Date.parse(`${point.date}T00:00:00.000Z`) - periodStart) / 86_400_000
    return {
      ...point,
      x: plot.left + (elapsedDays / Math.max(periodDays - 1, 1)) * plotWidth,
      y: plot.top + plotHeight - (point.value / maxValue) * plotHeight,
    }
  })
  const segments = splitConsecutivePoints(coordinates)
  const activePoint = metric.points[Math.min(activeIndex, metric.points.length - 1)]

  return (
    <Stack space={3}>
      <Flex align="center" gap={3} justify="space-between" wrap="wrap">
        <Text size={1} weight="semibold">{comparison(metric.current, metric.previous)}</Text>
        <SourceLine metric={metric} />
      </Flex>
      <Text as="p" className="esencial-analytics__trend-summary" muted size={1}>
        {metric.points.length} av {periodDays} datum returnerade · högst {numberFormatter.format(summary.high.value)} den {formatDate(summary.high.date)} · lägst {numberFormatter.format(summary.low.value)} den {formatDate(summary.low.date)}.
      </Text>
      <Text as="p" className="esencial-analytics__trend-instruction" id={instructionId} size={1}>
        Tabba till grafen och använd piltangenterna, Home eller End för exakta dagsvärden.
      </Text>
      <div className="esencial-analytics__chart-wrap">
        <svg
          aria-describedby={`${descriptionId} ${instructionId}`}
          aria-labelledby={titleId}
          className="esencial-analytics__chart"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <title id={titleId}>{metric.label}, daglig trend {formatDate(period.since)}–{formatDate(period.until)}</title>
          <desc id={descriptionId}>{metric.points.length} leverantörsreturnerade mätpunkter från {metric.source}. Linjen bryts där datum saknas.</desc>
          {[0, 0.5, 1].map((ratio) => {
            const y = plot.top + ratio * plotHeight
            const value = Math.round(maxValue * (1 - ratio))
            return (
              <g key={ratio} aria-hidden="true">
                <line className="esencial-analytics__chart-grid" x1={plot.left} x2={width - plot.right} y1={y} y2={y} />
                <text className="esencial-analytics__chart-axis" textAnchor="end" x={plot.left - 9} y={y + 4}>{numberFormatter.format(value)}</text>
              </g>
            )
          })}
          {segments.map((segment) => segment.length > 1 ? (
            <path
              className="esencial-analytics__chart-line"
              d={segment.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')}
              key={`${segment[0].date}-${segment.at(-1)?.date}`}
            />
          ) : null)}
          {coordinates.map((point, index) => (
            <g
              aria-label={`${formatDate(point.date)}, ${numberFormatter.format(point.value)} ${metric.shortLabel}`}
              aria-describedby={instructionId}
              className="esencial-analytics__chart-point"
              key={point.date}
              onFocus={() => setActiveIndex(index)}
              onKeyDown={(event) => {
                const next = nextTrendPointIndex(event.key, index, coordinates.length)
                if (next === null) return
                event.preventDefault()
                setActiveIndex(next)
                pointRefs.current[next]?.focus()
              }}
              onMouseEnter={() => setActiveIndex(index)}
              ref={(node) => { pointRefs.current[index] = node }}
              role="img"
              tabIndex={index === activeIndex ? 0 : -1}
            >
              <circle aria-hidden="true" className="esencial-analytics__chart-hit" cx={point.x} cy={point.y} r="13" />
              <circle aria-hidden="true" className="esencial-analytics__chart-point-ring" cx={point.x} cy={point.y} r="7" />
              <circle aria-hidden="true" className="esencial-analytics__chart-point-dot" cx={point.x} cy={point.y} r="3.5" />
            </g>
          ))}
          <text aria-hidden="true" className="esencial-analytics__chart-axis" x={plot.left} y={height - 10}>{formatDate(period.since)}</text>
          <text aria-hidden="true" className="esencial-analytics__chart-axis" textAnchor="end" x={width - plot.right} y={height - 10}>{formatDate(period.until)}</text>
        </svg>
        <div aria-live="polite" className="esencial-analytics__chart-tooltip">
          <span>{formatDate(activePoint.date)}</span>
          <strong>{numberFormatter.format(activePoint.value)} {metric.shortLabel}</strong>
        </div>
      </div>
      <details className="esencial-analytics__trend-details">
        <summary>Visa exakta dagsvärden</summary>
        <div className="esencial-analytics__table-scroll">
          <table>
            <caption className="esencial-analytics__sr-only">{metric.label} per datum, {metric.source}</caption>
            <thead><tr><th scope="col">Datum</th><th scope="col">{metric.label}</th></tr></thead>
            <tbody>
              {metric.points.map((point) => (
                <tr key={point.date}>
                  <th scope="row">{formatDate(point.date)}</th>
                  <td data-label={metric.label}>{numberFormatter.format(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Stack>
  )
}

function SourceLine({metric}: {metric: TrendMetric}) {
  const latest = metric.freshness.latestDataAt
    ? formatDate(metric.freshness.latestDataAt.slice(0, 10))
    : 'ingen mätpunkt'
  return (
    <Text muted size={1}>
      Källa: {metric.source} · senaste mätpunkt: {latest} · begärt t.o.m. {formatDate(metric.freshness.requestedThrough)}
    </Text>
  )
}
