import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {Badge, Box, Button, Card, Flex, Grid, Heading, Inline, Select, Stack, Text} from '@sanity/ui'
import {useClient} from 'sanity'
import {
  buildPreviewRendererUrl,
  PREVIEW_API_VERSION,
  PREVIEW_VIEWPORTS,
  projectRoute,
  resolvePreviewOrigin,
  type PreviewPerspective,
  type PreviewViewportId,
} from './configuration'
import {
  isPreviewRendererMessage,
  type LayoutIssue,
  type LayoutIssueCode,
} from './contracts'
import './liveFrontendPreview.css'

type PreviewProject = {
  _id: string
  _originalId?: string
  _rev?: string
  title?: string
  summary?: string
  slug?: string
  language?: 'sv' | 'en'
  status?: string
  heroUrl?: string
}

type RendererState = 'fallback' | 'verifying' | 'authenticated' | 'unauthenticated'
type LiveState = 'connecting' | 'live' | 'polling'
type PreviewRouteMode = 'overview' | 'project'

const projectsQuery = `*[_type == "project"] | order(language asc, title asc) {
  _id,
  _originalId,
  _rev,
  title,
  summary,
  "slug": slug.current,
  language,
  status,
  "heroUrl": coalesce(heroImage.asset->url, images[0].asset->url, legacyImages[0].url)
}`

const perspectiveCopy: Record<PreviewPerspective, {label: string; detail: string}> = {
  drafts: {
    label: 'Kladd',
    detail: 'Sanity-kladd via skyddad frontendsession. CDN används inte.',
  },
  published: {
    label: 'Publicerad',
    detail: 'Senast publicerade dokument genom samma frontendrenderer.',
  },
  staging: {
    label: 'Staging',
    detail: 'Det byggda stagingresultatet utan att blanda in lokala kladdvärden.',
  },
}

const fieldLabels: Record<string, string> = {
  title: 'Projektnamn',
  summary: 'Projektintroduktion',
  heroImage: 'Huvudbild',
  page: 'Sidlayout',
}

function canonicalId(id: string) {
  return id.replace(/^drafts\./, '')
}

function openDocument(documentId: string, path?: string) {
  const safeId = canonicalId(documentId)
  if (!/^[A-Za-z0-9._-]+$/.test(safeId)) return
  const safePath = path && /^[A-Za-z0-9_.-]+(?:\[[0-9]+\])?$/.test(path) ? path : undefined
  window.location.hash = `#/intent/edit/id=${encodeURIComponent(safeId)};type=project${
    safePath ? `;path=${encodeURIComponent(safePath)}` : ''
  }`
}

function localGuardrailIssues(project: PreviewProject | undefined, route: string): LayoutIssue[] {
  if (!project) return []
  const issues: LayoutIssue[] = []
  const documentId = canonicalId(project._id)
  const add = (
    code: LayoutIssueCode,
    field: string,
    message: string,
    suggestion: string,
  ) =>
    issues.push({
      code,
      severity: 'blocker',
      route,
      field,
      message,
      suggestion,
      documentId,
      path: field,
    })

  if (!project.title?.trim()) {
    add('text-overflow', 'title', 'Projektnamnet saknas.', 'Lägg till ett projektnamn och granska den riktiga renderern igen.')
  } else {
    const longestTitleToken = Math.max(...project.title.trim().split(/\s+/).map((token) => token.length))
    if (longestTitleToken > 32) {
      add(
        'text-overflow',
        'title',
        'Projektnamnet innehåller ett obrutet ord som kan spräcka layouten.',
        'Använd naturliga brytpunkter eller en godkänd kortare formulering; dölj inte texten med ellips.',
      )
    }
    if (project.title.length > 88) {
      add(
        'unsafe-line-length',
        'title',
        'Projektnamnet behöver verifieras mot frontendens faktiska radbrytning.',
        'Granska rubriken i 320, 390, platta och dator innan publicering.',
      )
    }
  }

  const summary = project.summary?.trim() || ''
  if (summary) {
    const longestSummaryToken = Math.max(...summary.split(/\s+/).map((token) => token.length))
    if (longestSummaryToken > 40 || summary.length > 360) {
      add(
        'unsafe-line-length',
        'summary',
        'Projektintroduktionen kan ge osäker radlängd eller radbrytning.',
        'Skriv med naturliga ordmellanrum och kontrollera textmåttet i frontendrenderern.',
      )
    }
  }

  if (!project.heroUrl) {
    add(
      'missing-media',
      'heroImage',
      'Huvudbild saknas i den valda innehållsvyn.',
      'Välj en befintlig huvudbild och behåll frontendens nuvarande beskärning och bildkvalitet.',
    )
  }
  return issues
}

export function LiveFrontendPreview() {
  const baseClient = useClient({apiVersion: PREVIEW_API_VERSION})
  const previewOrigin = useMemo(() => resolvePreviewOrigin(), [])
  const [perspective, setPerspective] = useState<PreviewPerspective>('drafts')
  const [viewportId, setViewportId] = useState<PreviewViewportId>('desktop')
  const [routeMode, setRouteMode] = useState<PreviewRouteMode>('project')
  const [overviewLanguage, setOverviewLanguage] = useState<'sv' | 'en'>('sv')
  const [projects, setProjects] = useState<PreviewProject[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [rendererState, setRendererState] = useState<RendererState>(
    previewOrigin.kind === 'configured' ? 'verifying' : 'fallback',
  )
  const [liveState, setLiveState] = useState<LiveState>('connecting')
  const [rendererIssues, setRendererIssues] = useState<LayoutIssue[]>([])
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const contentPerspective = perspective === 'drafts' ? 'drafts' : 'published'
  const contentClient = useMemo(
    () => baseClient.withConfig({perspective: contentPerspective, useCdn: false}),
    [baseClient, contentPerspective],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    void contentClient
      .fetch<PreviewProject[]>(projectsQuery)
      .then((nextProjects) => {
        if (cancelled) return
        setProjects(nextProjects)
        setSelectedId((current) => {
          const currentCanonical = canonicalId(current)
          return (
            nextProjects.find((project) => canonicalId(project._id) === currentCanonical)?._id ||
            nextProjects[0]?._id ||
            ''
          )
        })
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Innehållet kunde inte läsas. Ingen publicerad version ändrades.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [contentClient, revision])

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | undefined
    const liveClient = baseClient.withConfig({perspective: 'raw', useCdn: false})
    const subscription = liveClient
      .listen('*[_type in ["project", "homePage"]]', {}, {includeResult: false, visibility: 'query'})
      .subscribe({
        next: () => {
          setLiveState('live')
          setRevision((current) => current + 1)
        },
        error: () => {
          setLiveState('polling')
          pollTimer = setInterval(() => setRevision((current) => current + 1), 15_000)
        },
      })
    setLiveState('live')
    return () => {
      subscription.unsubscribe()
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [baseClient])

  const selected = projects.find((project) => project._id === selectedId)
  const route =
    routeMode === 'project'
      ? projectRoute(selected?.language, selected?.slug)
      : overviewLanguage === 'en'
        ? '/projects/'
        : '/'
  const documentId = routeMode === 'project' && selected ? canonicalId(selected._id) : undefined
  const previewUrl =
    previewOrigin.kind === 'configured'
      ? buildPreviewRendererUrl({
          origin: previewOrigin.origin,
          route,
          perspective,
          documentId,
          revision,
        })
      : undefined

  useEffect(() => {
    setRendererIssues([])
    setRendererState(previewOrigin.kind === 'configured' ? 'verifying' : 'fallback')
  }, [perspective, previewOrigin.kind, previewUrl, route, viewportId])

  useEffect(() => {
    if (previewOrigin.kind !== 'configured') return undefined
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== previewOrigin.origin || event.source !== iframeRef.current?.contentWindow) {
        return
      }
      if (!isPreviewRendererMessage(event.data)) return
      const message = event.data
      if (message.type === 'esencial-preview/edit') {
        openDocument(message.documentId, message.path)
        return
      }
      if (message.route !== route || message.perspective !== perspective) return
      if (message.type === 'esencial-preview/ready') {
        setRendererState(message.authenticated ? 'authenticated' : 'unauthenticated')
      } else {
        setRendererIssues(message.issues)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [perspective, previewOrigin, route])

  const fallbackIssues = useMemo(
    () => (routeMode === 'project' ? localGuardrailIssues(selected, route) : []),
    [route, routeMode, selected],
  )
  const issues = previewOrigin.kind === 'configured' ? rendererIssues : fallbackIssues
  const authenticatedRenderer = rendererState === 'authenticated'
  const reviewBlocked = !authenticatedRenderer || issues.length > 0
  const viewport = PREVIEW_VIEWPORTS[viewportId]

  return (
    <Stack space={5} className="esencial-frontend-preview">
      <Card padding={[3, 4]} radius={2} border>
        <Grid columns={[1, 1, 3]} gap={4}>
          <Control label="Innehållsvy">
            <Inline space={1} className="esencial-preview-control-row">
              {(Object.keys(perspectiveCopy) as PreviewPerspective[]).map((value) => (
                <Button
                  key={value}
                  aria-pressed={perspective === value}
                  mode={perspective === value ? 'default' : 'ghost'}
                  text={perspectiveCopy[value].label}
                  onClick={() => setPerspective(value)}
                />
              ))}
            </Inline>
            <Text as="p" size={1} muted>
              {perspectiveCopy[perspective].detail}
            </Text>
          </Control>

          <Control label="Rutt">
            <Inline space={1} className="esencial-preview-control-row">
              <Button
                aria-pressed={routeMode === 'project'}
                mode={routeMode === 'project' ? 'default' : 'ghost'}
                text="Projektsida"
                onClick={() => setRouteMode('project')}
              />
              <Button
                aria-pressed={routeMode === 'overview'}
                mode={routeMode === 'overview' ? 'default' : 'ghost'}
                text="Projektöversikt"
                onClick={() => setRouteMode('overview')}
              />
            </Inline>
            {routeMode === 'project' ? (
              <Select
                aria-label="Projekt att förhandsvisa"
                value={selectedId}
                onChange={(event) => setSelectedId(event.currentTarget.value)}
              >
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.title || 'Namnlöst projekt'} ({project.language?.toUpperCase() || '–'})
                  </option>
                ))}
              </Select>
            ) : (
              <Select
                aria-label="Språk för projektöversikten"
                value={overviewLanguage}
                onChange={(event) => setOverviewLanguage(event.currentTarget.value as 'sv' | 'en')}
              >
                <option value="sv">Svenska</option>
                <option value="en">English</option>
              </Select>
            )}
          </Control>

          <Control label="Viewport">
            <Inline space={1} className="esencial-preview-control-row">
              {(Object.keys(PREVIEW_VIEWPORTS) as PreviewViewportId[]).map((value) => (
                <Button
                  key={value}
                  aria-pressed={viewportId === value}
                  mode={viewportId === value ? 'default' : 'ghost'}
                  text={PREVIEW_VIEWPORTS[value].label}
                  onClick={() => setViewportId(value)}
                />
              ))}
            </Inline>
            <Text as="p" size={1} muted>
              Fast CSS-viewport {viewport.width} × {viewport.height}; skalas bara visuellt för att rymmas.
            </Text>
          </Control>
        </Grid>
      </Card>

      <Flex align="center" justify="space-between" gap={3} wrap="wrap">
        <Stack space={2}>
          <Heading as="h3" size={2}>
            Frontendrenderer
          </Heading>
          <Text as="p" size={1} muted className="esencial-preview-route">
            Rutt: {route} · {perspectiveCopy[perspective].label} · liveuppdatering {liveState === 'live' ? 'ansluten' : liveState === 'polling' ? 'via reservpollning' : 'ansluter'}
          </Text>
        </Stack>
        <RendererBadge state={rendererState} />
      </Flex>

      {loadError ? (
        <Card padding={4} radius={2} border tone="critical">
          <Text>{loadError}</Text>
        </Card>
      ) : loading ? (
        <Card padding={4} radius={2} border>
          <Text>Laddar innehållsvyn…</Text>
        </Card>
      ) : (
        <ViewportFrame viewportId={viewportId}>
          {previewUrl ? (
            <iframe
              ref={iframeRef}
              className="esencial-preview-iframe"
              height={viewport.height}
              loading="eager"
              referrerPolicy="no-referrer"
              sandbox="allow-forms allow-same-origin allow-scripts"
              src={previewUrl}
              title={`${perspectiveCopy[perspective].label} frontendpreview för ${route}`}
              width={viewport.width}
            />
          ) : (
            <LocalFallback project={selected} route={route} routeMode={routeMode} />
          )}
        </ViewportFrame>
      )}

      {previewOrigin.kind === 'fallback' ? (
        <Card padding={4} radius={2} border tone="caution">
          <Stack space={2}>
            <Heading as="h3" size={2}>
              Lokal layoutfixtur – inte autentiserad frontendpreview
            </Heading>
            <Text size={1}>{previewOrigin.reason}</Text>
            <Text size={1} muted>
              Fixturen visar text- och mediavarningar men kan inte bevisa staging, autentisering, verklig CSS eller frontendens bildrendering.
            </Text>
          </Stack>
        </Card>
      ) : null}

      <Diagnostics issues={issues} reviewBlocked={reviewBlocked} rendererState={rendererState} />
    </Stack>
  )
}

function Control({label, children}: {label: string; children: ReactNode}) {
  return (
    <Stack space={3} className="esencial-preview-control">
      <Text as="p" size={1} weight="semibold">
        {label}
      </Text>
      {children}
    </Stack>
  )
}

function RendererBadge({state}: {state: RendererState}) {
  if (state === 'authenticated') return <Badge tone="positive">Skyddad session verifierad</Badge>
  if (state === 'unauthenticated') return <Badge tone="critical">Renderer saknar verifierad session</Badge>
  if (state === 'verifying') return <Badge tone="caution">Verifierar skyddad renderer</Badge>
  return <Badge tone="caution">Lokal fixtur · ej autentiserad</Badge>
}

function ViewportFrame({
  viewportId,
  children,
}: {
  viewportId: PreviewViewportId
  children: ReactNode
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const viewport = PREVIEW_VIEWPORTS[viewportId]

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const updateScale = (availableWidth: number) => {
      setScale(Math.min(1, Math.max(0.1, availableWidth / viewport.width)))
    }
    updateScale(host.clientWidth)
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) updateScale(entry.contentRect.width)
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [viewport.width])

  const stageStyle = {height: `${Math.round(viewport.height * scale)}px`} as CSSProperties
  const viewportStyle = {
    width: `${viewport.width}px`,
    height: `${viewport.height}px`,
    transform: `scale(${scale})`,
  } as CSSProperties

  return (
    <div ref={hostRef} className="esencial-preview-stage" style={stageStyle}>
      <div className="esencial-preview-viewport" style={viewportStyle}>
        {children}
      </div>
    </div>
  )
}

function LocalFallback({
  project,
  route,
  routeMode,
}: {
  project?: PreviewProject
  route: string
  routeMode: PreviewRouteMode
}) {
  return (
    <div className="esencial-preview-fallback" data-preview-fallback="true">
      <header>
        <span>Esencial</span>
        <span>Layoutfixtur</span>
      </header>
      <main>
        <Text as="p" size={1} muted>
          {route}
        </Text>
        {routeMode === 'project' && project ? (
          <article>
            <button type="button" onClick={() => openDocument(project._id, 'title')}>
              <Heading as="h4" size={5}>
                {project.title || 'Namnlöst projekt'}
              </Heading>
            </button>
            <button type="button" onClick={() => openDocument(project._id, 'summary')}>
              <Text as="p" size={3}>
                {project.summary || 'Projektintroduktion saknas.'}
              </Text>
            </button>
            <div className="esencial-preview-fallback__media">
              Bildytan återges inte i den lokala fixturen. Frontendens bildkvalitet, beskärning och inramning måste verifieras i den skyddade renderern.
            </div>
          </article>
        ) : (
          <Heading as="h4" size={5}>
            Projektöversikt – lokal strukturfixtur
          </Heading>
        )}
      </main>
    </div>
  )
}

function Diagnostics({
  issues,
  reviewBlocked,
  rendererState,
}: {
  issues: LayoutIssue[]
  reviewBlocked: boolean
  rendererState: RendererState
}) {
  return (
    <Card
      aria-live={reviewBlocked ? 'assertive' : 'polite'}
      padding={[3, 4]}
      radius={2}
      border
      tone={reviewBlocked ? 'critical' : 'positive'}
    >
      <Stack space={4}>
        <Flex align="center" justify="space-between" gap={3} wrap="wrap">
          <Heading as="h3" size={2}>
            Layoutdiagnostik
          </Heading>
          <Badge tone={reviewBlocked ? 'critical' : 'positive'}>
            {reviewBlocked ? 'Granskning blockerad' : 'Klar för redaktionell granskning'}
          </Badge>
        </Flex>
        {rendererState !== 'authenticated' ? (
          <Text size={1}>
            En skyddad frontendrenderer har inte verifierat sessionen. Lokal fixtur eller enbart laddad iframe räknas aldrig som autentiserad preview.
          </Text>
        ) : null}
        {issues.length ? (
          <ol className="esencial-preview-issues">
            {issues.map((issue, index) => (
              <li key={`${issue.code}-${issue.route}-${issue.field}-${index}`}>
                <Stack space={2}>
                  <Text size={1} weight="semibold">
                    {fieldLabels[issue.field] || issue.field} · {issue.route}
                  </Text>
                  <Text size={1}>{issue.message}</Text>
                  <Text size={1} muted>
                    Åtgärd: {issue.suggestion}
                  </Text>
                  {issue.documentId ? (
                    <Box>
                      <Button
                        mode="ghost"
                        text={`Öppna ${fieldLabels[issue.field] || issue.field}`}
                        onClick={() => openDocument(issue.documentId || '', issue.path)}
                      />
                    </Box>
                  ) : null}
                </Stack>
              </li>
            ))}
          </ol>
        ) : authenticatedRendererMessage(rendererState)}
      </Stack>
    </Card>
  )
}

function authenticatedRendererMessage(rendererState: RendererState) {
  if (rendererState !== 'authenticated') {
    return <Text size={1} muted>Inga rendererdiagnoser kan godkännas innan den skyddade sessionen är verifierad.</Text>
  }
  return (
    <Text size={1}>
      Renderern rapporterar ingen horisontell scroll, klippning, överlappning, trasig media eller osäker radlängd i den valda vyn.
    </Text>
  )
}
