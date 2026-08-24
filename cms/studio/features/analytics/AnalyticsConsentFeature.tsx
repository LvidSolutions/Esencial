import {useCallback, useEffect, useId, useState} from 'react'
import {Badge, Box, Button, Card, Flex, Grid, Heading, Inline, Stack, Text} from '@sanity/ui'
import {fetchAnalytics} from './analyticsClient'
import {AnalyticsTrend} from './AnalyticsTrend'
import type {
  AnalyticsResponse,
  AnalyticsSource,
  SearchRow,
  TrafficPage,
} from './types'
import './analyticsFeature.css'

type PeriodDays = 7 | 30 | 90
type LoadState =
  | {status: 'loading'}
  | {status: 'ready'; data: AnalyticsResponse}
  | {status: 'error'; message: string}

const PERIODS: readonly PeriodDays[] = [7, 30, 90]
const numberFormatter = new Intl.NumberFormat('sv-SE')
const percentFormatter = new Intl.NumberFormat('sv-SE', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: 'percent',
})
const decimalFormatter = new Intl.NumberFormat('sv-SE', {maximumFractionDigits: 1})
const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const dateTimeFormatter = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function errorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return 'Hämtningen avbröts.'
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return 'Statistikservern svarade inte i tid. Försök igen.'
  }
  return error instanceof Error ? error.message : 'Statistiken kunde inte hämtas.'
}

function formatDate(value?: string | null) {
  if (!value) return 'Ingen mätpunkt i perioden'
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
  return Number.isNaN(date.valueOf()) ? 'Okänt datum' : dateFormatter.format(date)
}

function formatDateTime(value?: string) {
  if (!value) return 'Okänd tid'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? 'Okänd tid' : dateTimeFormatter.format(date)
}

function comparison(current?: number, previous?: number) {
  if (current === undefined || previous === undefined) return 'Jämförelse saknas'
  if (previous === 0) {
    return current === 0 ? 'Oförändrat mot föregående period' : 'Föregående period var noll'
  }
  const percent = ((current - previous) / previous) * 100
  return `${percent >= 0 ? '+' : '−'}${Math.abs(percent).toFixed(0)} % mot föregående period`
}

function sourceTone(state: AnalyticsSource['state']) {
  if (state === 'ready') return 'positive'
  if (state === 'error') return 'critical'
  if (state === 'empty') return 'caution'
  return 'default'
}

function sourceLabel(state: AnalyticsSource['state']) {
  return {
    empty: 'Ansluten · ingen data',
    error: 'Fel',
    ready: 'Ansluten',
    unavailable: 'Inte ansluten',
  }[state]
}

export function AnalyticsConsentFeature() {
  const [days, setDays] = useState<PeriodDays>(30)
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState<LoadState>({status: 'loading'})
  const periodLabelId = useId()

  const retry = useCallback(() => setRequestVersion((version) => version + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setState({status: 'loading'})
    void fetchAnalytics(days, controller.signal)
      .then((data) => setState({status: 'ready', data}))
      .catch((error) => {
        if (!controller.signal.aborted) setState({status: 'error', message: errorMessage(error)})
      })
    return () => controller.abort()
  }, [days, requestVersion])

  return (
    <Stack className="esencial-analytics" space={5}>
      <Flex align={['flex-start', 'center']} direction={['column', 'row']} gap={3} justify="space-between">
        <Box>
          <Heading as="h3" size={3}>Webbplatsens utveckling</Heading>
          <Text as="p" muted size={1} className="esencial-analytics__measure">
            Endast verklig, aggregerad leverantörsdata. Tomma, otillgängliga och felaktiga svar ersätts aldrig med exempelvärden.
          </Text>
        </Box>
        <Box>
          <Text as="p" id={periodLabelId} size={1} weight="semibold">Period</Text>
          <Inline aria-labelledby={periodLabelId} role="group" space={1}>
            {PERIODS.map((period) => (
              <Button
                key={period}
                aria-pressed={days === period}
                mode={days === period ? 'default' : 'ghost'}
                onClick={() => setDays(period)}
                text={`${period} dagar`}
              />
            ))}
          </Inline>
        </Box>
      </Flex>

      <div aria-live="polite" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' ? <LoadingState /> : null}
        {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
        {state.status === 'ready' ? <Dashboard data={state.data} /> : null}
      </div>

      <ConsentEngineeringSummary />
    </Stack>
  )
}

function LoadingState() {
  return (
    <Card border padding={4} radius={2} role="status">
      <Text>Laddar statistik…</Text>
    </Card>
  )
}

function ErrorState({message, onRetry}: {message: string; onRetry: () => void}) {
  return (
    <Card border padding={4} radius={2} tone="critical" role="alert">
      <Stack space={3}>
        <Heading as="h4" size={2}>Statistiken kunde inte hämtas</Heading>
        <Text>{message}</Text>
        <Text muted size={1}>Inga tidigare eller uppskattade värden visas vid fel.</Text>
        <Box><Button onClick={onRetry} text="Försök igen" /></Box>
      </Stack>
    </Card>
  )
}

function Dashboard({data}: {data: AnalyticsResponse}) {
  const period = data.period?.current
  return (
    <Stack space={5}>
      <Flex align="center" gap={2} wrap="wrap">
        <Badge tone={data.state === 'ready' ? 'positive' : data.state === 'error' ? 'critical' : 'caution'}>
          {data.state === 'ready' ? 'Verklig data' : data.state === 'empty' ? 'Ingen data' : data.state === 'error' ? 'Fel' : 'Väntar på anslutning'}
        </Badge>
        {period ? <Text size={1} muted>{formatDate(period.since)}–{formatDate(period.until)}</Text> : null}
      </Flex>

      {!data.configured || data.state === 'unavailable' ? (
        <Card border padding={4} radius={2}>
          <Stack space={3}>
            <Heading as="h4" size={2}>Statistik väntar på anslutning</Heading>
            <Text>{data.message || 'Ingen godkänd leverantör är ansluten.'}</Text>
            <Text muted size={1}>Aktivering och serverhemligheter är manuella ägarsteg. Studio visar inga reservvärden.</Text>
          </Stack>
        </Card>
      ) : (
        <>
          {data.state === 'empty' ? (
            <Card border padding={3} radius={2} tone="caution">
              <Text>Källan är ansluten men har inga mätpunkter för perioden.</Text>
            </Card>
          ) : null}
          <MetricGrid data={data} />
          <AnalyticsTrend data={data} />
          <Grid columns={[1, 1, 2]} gap={4}>
            <TrafficTable items={data.traffic?.topPages || []} />
            <SearchTable title="Sidor från Google" items={data.search?.topPages || []} />
            <SearchTable title="Sökfraser" items={data.search?.queries || []} />
          </Grid>
        </>
      )}

      <SourceStatus data={data} />
      <Limitations data={data} />
    </Stack>
  )
}

function MetricGrid({data}: {data: AnalyticsResponse}) {
  const metrics = [
    {
      label: 'Summa dagliga besökare',
      value: data.traffic ? numberFormatter.format(data.traffic.dailyVisitorsSum) : 'Inte tillgängligt',
      definition: 'Antalet besökare per dag, summerat för perioden. Samma person kan räknas på flera dagar.',
      note: data.traffic ? comparison(data.traffic.dailyVisitorsSum, data.traffic.previous.dailyVisitorsSum) : undefined,
    },
    {
      label: 'Sidvisningar',
      value: data.traffic ? numberFormatter.format(data.traffic.pageviews) : 'Inte tillgängligt',
      definition: 'Hur många sidor som visades på webbplatsen under perioden.',
      note: data.traffic ? comparison(data.traffic.pageviews, data.traffic.previous.pageviews) : undefined,
    },
    {
      label: 'Återkommande besökare', value: 'Inte tillgängligt',
      definition: 'Om samma person kom tillbaka vid ett senare tillfälle.',
      note: 'Kan inte mätas med den valda integritetsnivån.',
    },
    {
      label: 'Klick från Google',
      value: data.search ? numberFormatter.format(data.search.clicks) : 'Inte tillgängligt',
      definition: 'Besök som började med ett klick i Googles sökresultat.',
      note: data.search ? comparison(data.search.clicks, data.search.previous.clicks) : undefined,
    },
    {
      label: 'Visningar i Google',
      value: data.search ? numberFormatter.format(data.search.impressions) : 'Inte tillgängligt',
      definition: 'Hur många gånger en Esencial-sida syntes i Googles sökresultat.',
      note: data.search ? comparison(data.search.impressions, data.search.previous.impressions) : undefined,
    },
    {
      label: 'Klickfrekvens (CTR)',
      value: data.search ? percentFormatter.format(data.search.ctr) : 'Inte tillgängligt',
      definition: 'Andelen Google-visningar som ledde till ett klick.',
    },
    {
      label: 'Genomsnittlig plats i Google',
      value: data.search ? decimalFormatter.format(data.search.position) : 'Inte tillgängligt',
      definition: 'Sidornas genomsnittliga plats i sökresultatet. Ett lägre tal är bättre.',
    },
  ]

  return (
    <Grid columns={[1, 2, 3, 4]} gap={3}>
      {metrics.map((metric) => (
        <Card border className="esencial-analytics__metric" key={metric.label} padding={3} radius={2}>
          <Text as="p" muted size={1}>{metric.label}</Text>
          <Text as="p" className="esencial-analytics__metric-value" size={3} weight="semibold">{metric.value}</Text>
          <Text as="p" size={1}>{metric.definition}</Text>
          {metric.note ? <Text as="p" muted size={1}>{metric.note}</Text> : null}
        </Card>
      ))}
    </Grid>
  )
}

function TrafficTable({items}: {items: TrafficPage[]}) {
  return (
    <DataTable title="Mest besökta sidor" empty="Ingen trafikdata för perioden." hasItems={items.length > 0}>
      <thead><tr><th scope="col">Sida</th><th scope="col">Besökare på sidan</th><th scope="col">Sidvisningar</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item.label}><th scope="row">{item.label}</th><td data-label="Besökare på sidan">{numberFormatter.format(item.visitors)}</td><td data-label="Sidvisningar">{numberFormatter.format(item.pageviews)}</td></tr>)}</tbody>
    </DataTable>
  )
}

function SearchTable({title, items}: {title: string; items: SearchRow[]}) {
  return (
    <DataTable title={title} empty="Ingen Search Console-data för perioden." hasItems={items.length > 0}>
      <thead><tr><th scope="col">{title === 'Sökfraser' ? 'Sökfras' : 'Sida'}</th><th scope="col">Klick</th><th scope="col">Visningar</th><th scope="col">CTR</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item.label}><th scope="row">{item.label}</th><td data-label="Klick">{numberFormatter.format(item.clicks)}</td><td data-label="Visningar">{numberFormatter.format(item.impressions)}</td><td data-label="CTR">{percentFormatter.format(item.ctr)}</td></tr>)}</tbody>
    </DataTable>
  )
}

function DataTable({title, empty, hasItems, children}: {title: string; empty: string; hasItems: boolean; children: React.ReactNode}) {
  return (
    <Card border padding={4} radius={2}>
      <Heading as="h4" size={2}>{title}</Heading>
      {hasItems ? <div className="esencial-analytics__table-scroll"><table><caption className="esencial-analytics__sr-only">{title}</caption>{children}</table></div> : <Text as="p" muted size={1} className="esencial-analytics__empty">{empty}</Text>}
    </Card>
  )
}

function SourceStatus({data}: {data: AnalyticsResponse}) {
  const sources = [data.sources.traffic, data.sources.search]
  return (
    <Card border padding={4} radius={2}>
      <Stack space={3}>
        <Heading as="h4" size={2}>Källor och färskhet</Heading>
        <Text muted size={1}>Svaret hämtades {formatDateTime(data.generatedAt)}.</Text>
        <ul className="esencial-analytics__source-list">
          {sources.map((source) => {
            const freshness = source.provider === 'Vercel Web Analytics' ? data.traffic?.freshness : data.search?.freshness
            return (
              <li key={source.provider}>
                <Flex align="center" gap={2} wrap="wrap">
                  <Text weight="semibold">{source.provider}</Text>
                  <Badge tone={sourceTone(source.state)}>{sourceLabel(source.state)}</Badge>
                </Flex>
                <Text as="p" muted size={1}>
                  {source.message || (freshness ? `Senaste mätpunkt: ${formatDate(freshness.latestDataAt)}. Begärt till och med ${formatDate(freshness.requestedThrough)}.` : 'Ingen färskhetsuppgift tillgänglig.')}
                </Text>
              </li>
            )
          })}
        </ul>
      </Stack>
    </Card>
  )
}

function Limitations({data}: {data: AnalyticsResponse}) {
  return (
    <Card border padding={4} radius={2}>
      <Stack space={3}>
        <Heading as="h4" size={2}>Begränsningar</Heading>
        <ul className="esencial-analytics__limitations">
          {data.limitations.map((limitation) => <li key={limitation}><Text size={1}>{limitation}</Text></li>)}
        </ul>
      </Stack>
    </Card>
  )
}

function ConsentEngineeringSummary() {
  return (
    <Card border padding={4} radius={2} className="esencial-analytics__privacy">
      <Stack space={4}>
        <Box>
          <Heading as="h3" size={3}>Samtycke och integritet</Heading>
          <Text as="p" muted size={1} className="esencial-analytics__measure">
            Den publika kontrollen blockerar statistik före ett versionsgiltigt val, ger likvärdiga acceptera- och avvisaåtgärder och erbjuder en beständig väg för att ändra eller återkalla valet.
          </Text>
        </Box>
        <Grid columns={[1, 1, 2]} gap={3}>
          <Card border padding={3} radius={2}>
            <Heading as="h4" size={1}>Tekniskt verifierat lokalt</Heading>
            <ul className="esencial-analytics__limitations">
              <li><Text size={1}>Ingen Vercel-resurs skapas före godkänd statistik.</Text></li>
              <li><Text size={1}>Avvisning och återkallande laddar om sidan utan statistik.</Text></li>
              <li><Text size={1}>Valet innehåller bara version, kategori och tid i webbläsaren.</Text></li>
              <li><Text size={1}>Leverantörsnycklar finns endast i servermiljön.</Text></li>
            </ul>
          </Card>
          <Card border padding={3} radius={2} tone="caution">
            <Heading as="h4" size={1}>Kräver mänskligt godkännande</Heading>
            <Text as="p" size={1}>Personuppgiftsansvarig, fullständiga ändamål, leverantörslista, lagringstider, svensk/engelsk integritetstext och slutlig juridisk bedömning är blockerare före aktivering.</Text>
          </Card>
        </Grid>
      </Stack>
    </Card>
  )
}
