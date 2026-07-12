import {useEffect, useMemo, useState} from 'react'
import {Box, Button, Card, Container, Flex, Grid, Heading, Inline, Select, Stack, Text} from '@sanity/ui'
import {useClient} from 'sanity'

type ImageData = {url?: string; alt?: string; credit?: string; rightsConfirmed?: boolean; hideFromWebsite?: boolean; width?: number; height?: number}
type Project = {_id: string; title?: string; location?: string; language?: string; status?: string; seoTitle?: string; seoDescription?: string; heroImage?: ImageData; galleryImages?: ImageData[]; floorPlans?: Array<{name?: string; area?: string; image?: ImageData}>}
type HomeEntry = {displayStyle?: string; project?: Project}

const apiVersion = '2025-02-19'
const analyticsEndpoint = import.meta.env.SANITY_STUDIO_ANALYTICS_ENDPOINT || '/api/analytics'
const imageProjection = `{"url": asset->url, alt, credit, rightsConfirmed, hideFromWebsite, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height}`
const projectsQuery = `*[_type == "project"] | order(title asc) {_id, title, location, language, status, seoTitle, seoDescription, "heroImage": heroImage${imageProjection}, "galleryImages": galleryImages[]${imageProjection}, "floorPlans": floorPlans[]{name, area, "image": image${imageProjection}}}`
const homeQuery = `*[_type == "homePage"][0]{"featuredProjects": featuredProjects[]{displayStyle, "project": project-> {_id, title, location, language, status, seoTitle, seoDescription, "heroImage": heroImage${imageProjection}}}}`

function goToDocument(id: string, path?: string) {
  window.location.hash = `#/intent/edit/id=${encodeURIComponent(id)};type=project${path ? `;path=${encodeURIComponent(path)}` : ''}`
}

function img(image?: ImageData, alt = '') {
  return image?.url ? <img className="esencial-thumb" src={image.url} alt={image.alt || alt} /> : <div className="esencial-thumb esencial-thumb--empty">▧</div>
}

function Issue({children}: {children: React.ReactNode}) {
  return <Text size={1} muted><span className="esencial-issue">⚠ {children}</span></Text>
}

export function PagePreviewTool() {
  const client = useClient({apiVersion})
  const [projects, setProjects] = useState<Project[]>([])
  const [home, setHome] = useState<HomeEntry[]>([])
  const [mode, setMode] = useState<'home' | 'list' | 'project'>('home')
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([client.fetch<Project[]>(projectsQuery), client.fetch<{featuredProjects?: HomeEntry[]} | null>(homeQuery)])
      .then(([nextProjects, nextHome]) => { setProjects(nextProjects); setHome(nextHome?.featuredProjects || []); setSelectedId(nextProjects[0]?._id || '') })
      .finally(() => setLoading(false))
  }, [client])

  const selected = projects.find((project) => project._id === selectedId)
  const visibleHome = home.map((entry) => entry.project).filter((project): project is Project => Boolean(project))
  const shownProjects = mode === 'home' ? visibleHome : mode === 'list' ? projects.filter((project) => project.status === 'published') : selected ? [selected] : []

  return <ToolShell title="Sidförhandsvisning" subtitle="Se bildplacering och ordning innan publicering.">
    <Grid columns={[1, 1, 4]} gap={4}>
      <Card padding={3} radius={2} border className="esencial-sidepanel">
        <Stack space={3}>
          <Text size={1} weight="semibold">Välj vy</Text>
          <Button mode={mode === 'home' ? 'default' : 'bleed'} text="Startsida" onClick={() => setMode('home')} />
          <Button mode={mode === 'list' ? 'default' : 'bleed'} text="Projektlista" onClick={() => setMode('list')} />
          <Button mode={mode === 'project' ? 'default' : 'bleed'} text="En projektsida" onClick={() => setMode('project')} />
          {mode === 'project' && <Select value={selectedId} onChange={(event) => setSelectedId(event.currentTarget.value)}>{projects.map((project) => <option key={project._id} value={project._id}>{project.title || 'Namnlöst projekt'} ({project.language?.toUpperCase()})</option>)}</Select>}
          <Box paddingTop={2}><Text size={1} muted>En klickbar bild öppnar rätt bildfält i projektet.</Text></Box>
        </Stack>
      </Card>
      <Card padding={4} radius={2} border className="esencial-canvas">
        {loading ? <Text>Laddar innehåll…</Text> : <PreviewCanvas mode={mode} projects={shownProjects} selected={selected} />}
      </Card>
    </Grid>
  </ToolShell>
}

function PreviewCanvas({mode, projects, selected}: {mode: 'home' | 'list' | 'project'; projects: Project[]; selected?: Project}) {
  if (mode === 'project' && selected) return <Stack space={5}>
    <PreviewHeading eyebrow="Projektsida" title={selected.title || 'Namnlöst projekt'} />
    <PreviewImage image={selected.heroImage} label="Huvudbild" project={selected} path="heroImage" />
    <Heading as="h2" size={2}>Projektgalleri</Heading>
    <Grid columns={[1, 2, 3]} gap={3}>{(selected.galleryImages || []).map((image, index) => <PreviewImage key={image.url || index} image={image} label={`Bild ${index + 1} i projektgalleri`} project={selected} path={`galleryImages[${index}]`} />)}</Grid>
    {!selected.galleryImages?.length && <Issue>Projektgalleriet saknar bilder.</Issue>}
    <Heading as="h2" size={2}>Planritningar</Heading>
    <Grid columns={[1, 2, 3]} gap={3}>{(selected.floorPlans || []).map((plan, index) => <PreviewImage key={plan.image?.url || index} image={plan.image} label={plan.name || `Planritning ${index + 1}`} project={selected} path={`floorPlans[${index}]`} />)}</Grid>
    {!selected.floorPlans?.length && <Text size={1} muted>Inga planritningar är tillagda.</Text>}
  </Stack>
  return <Stack space={5}>
    <PreviewHeading eyebrow={mode === 'home' ? 'Startsida' : 'Projektlista'} title={mode === 'home' ? 'Utvalda projekt' : 'Alla publicerade projekt'} />
    {mode === 'home' && !projects.length && <Issue>Välj projekt i Startsida för att kunna förhandsvisa ordningen.</Issue>}
    <Grid columns={[1, 2, 3]} gap={3}>{projects.map((project, index) => <Card key={project._id} radius={2} border overflow="hidden" className="esencial-project-card"><PreviewImage image={project.heroImage} label={`${mode === 'home' ? `Position ${index + 1} på startsidan` : 'Projektkortets bild'}`} project={project} path="heroImage" /><Box padding={3}><Text size={1} muted>{project.location || 'Plats saknas'}</Text><Heading as="h2" size={2}>{project.title || 'Namnlöst projekt'}</Heading>{!project.heroImage?.alt && <Issue>Saknar alt-text</Issue>}</Box></Card>)}</Grid>
  </Stack>
}

function PreviewHeading({eyebrow, title}: {eyebrow: string; title: string}) { return <Stack space={2}><Text size={1} muted>{eyebrow}</Text><Heading as="h1" size={4}>{title}</Heading></Stack> }

function PreviewImage({image, label, project, path}: {image?: ImageData; label: string; project: Project; path: string}) {
  const problems = [!image?.alt && 'Saknar alt-text', !image?.rightsConfirmed && 'Rättigheter ej bekräftade', image?.width && image.width < 1200 && 'Bilden är liten'] .filter(Boolean)
  return <button type="button" className="esencial-preview-image" onClick={() => goToDocument(project._id, path)} aria-label={`Redigera ${label}`}>
    {img(image, label)}<span>{label}</span>{problems.length > 0 && <small>{problems.join(' · ')}</small>}
  </button>
}

export function ContentOverviewTool() {
  const client = useClient({apiVersion})
  const [projects, setProjects] = useState<Project[]>([])
  useEffect(() => { client.fetch<Project[]>(projectsQuery).then(setProjects) }, [client])
  const queues = useMemo(() => ({
    drafts: projects.filter((project) => project.status === 'draft'),
    review: projects.filter((project) => project.status === 'review'),
    images: projects.filter((project) => !project.heroImage?.url || !project.heroImage.alt || !project.heroImage.credit || !project.heroImage.rightsConfirmed),
    seo: projects.filter((project) => !project.seoTitle || project.seoTitle.length > 60 || !project.seoDescription || project.seoDescription.length > 160),
    translations: projects.filter((project) => !project.language),
  }), [projects])
  return <ToolShell title="Arbetsöversikt" subtitle="Status, nästa åtgärd och vad som påverkar publiceringen.">
    <Inline space={2} className="esencial-actions"><Button text="Nytt projekt" onClick={() => { window.location.hash = '#/intent/create/template=project-sv' }} /><Button text="Granska bilder" onClick={() => { window.location.hash = '#/intent/edit/id=homePage;type=homePage' }} /><Button text="Granska SEO" onClick={() => { window.location.hash = '#/structure' }} /><Button text="Sidförhandsvisning" onClick={() => { window.location.hash = '#/sidforhandsvisning' }} /></Inline>
    <Grid columns={[1, 2, 3]} gap={4} marginTop={4}>
      <QueueCard title="Utkast" action="Färdigställ innehåll" items={queues.drafts} />
      <QueueCard title="Att granska" action="Kontrollera före publicering" items={queues.review} />
      <QueueCard title="Bildkvalitet" action="Lägg till huvudbild, alt-text, kredit eller rättigheter" items={queues.images} tone="critical" />
      <QueueCard title="SEO-kvalitet" action="Rätta titel och beskrivning" items={queues.seo} tone="critical" />
      <QueueCard title="Översättningar" action="Kontrollera svensk och engelsk version" items={queues.translations} />
      <QueueCard title="Publicerat" action="Öppna Sidförhandsvisning för att granska placering" items={projects.filter((project) => project.status === 'published')} />
    </Grid>
  </ToolShell>
}

function QueueCard({title, action, items, tone}: {title: string; action: string; items: Project[]; tone?: 'critical'}) { return <Card padding={4} radius={2} border tone={tone}><Stack space={3}><Flex justify="space-between"><Heading as="h2" size={2}>{title}</Heading><Text size={3} weight="bold">{items.length}</Text></Flex><Text size={1} muted>{action}</Text>{items.slice(0, 4).map((project) => <Button key={project._id} mode="bleed" text={project.title || 'Namnlöst projekt'} onClick={() => goToDocument(project._id)} />)}{!items.length && <Text size={1} muted>Inget behöver åtgärdas.</Text>}</Stack></Card> }

type Analytics = {configured: boolean; traffic?: {visitors?: number; pageviews?: number; returningVisitors?: number; topPages?: Array<{label: string; value: number}>}; search?: {clicks?: number; impressions?: number; ctr?: number; position?: number; topPages?: Array<{label: string; value: number}>; queries?: Array<{label: string; value: number}>}; observations?: string[]; message?: string}

export function GrowthTool() {
  const [days, setDays] = useState(30)
  const [state, setState] = useState<{loading: boolean; data?: Analytics; error?: string}>({loading: true})
  useEffect(() => { setState({loading: true}); fetch(`${analyticsEndpoint}?days=${days}`).then(async (response) => { if (!response.ok) throw new Error('Statistiken kunde inte hämtas.'); return response.json() }).then((data) => setState({loading: false, data})).catch(() => setState({loading: false, error: 'Ingen analyskälla är ansluten ännu.'})) }, [days])
  const data = state.data
  return <ToolShell title="Webbplatsens utveckling" subtitle="Trafik och söksynlighet, med jämförelse mot föregående period.">
    <Inline space={2}>{[7, 30, 90].map((value) => <Button key={value} mode={days === value ? 'default' : 'ghost'} text={`${value} dagar`} onClick={() => setDays(value)} />)}</Inline>
    {state.loading ? <Box marginTop={5}><Text>Laddar statistik…</Text></Box> : !data?.configured ? <EmptyAnalytics message={data?.message || state.error} /> : <AnalyticsDashboard data={data} />}
  </ToolShell>
}

function EmptyAnalytics({message}: {message?: string}) { return <Card marginTop={5} padding={5} radius={2} border><Stack space={3}><Text size={4}>↗</Text><Heading as="h2" size={3}>Statistik väntar på anslutning</Heading><Text>{message || 'Anslut en godkänd trafikkälla och Google Search Console för att se verkliga siffror.'}</Text><Text size={1} muted>Inga exempel- eller uppskattade siffror visas. Se docs/ANALYTICS_SETUP.md för externa steg.</Text></Stack></Card> }
function AnalyticsDashboard({data}: {data: Analytics}) { const metrics = [{label: 'Besök', value: data.traffic?.visitors}, {label: 'Återkommande besökare', value: data.traffic?.returningVisitors}, {label: 'Sidvisningar', value: data.traffic?.pageviews}, {label: 'Organiska klick', value: data.search?.clicks}, {label: 'Visningar i Google', value: data.search?.impressions}, {label: 'CTR', value: data.search?.ctr !== undefined ? `${(data.search.ctr * 100).toFixed(1)}%` : undefined}, {label: 'Genomsnittlig position', value: data.search?.position?.toFixed(1)}]; return <Stack space={5} marginTop={5}><Grid columns={[2, 3, 4]} gap={3}>{metrics.map((metric) => <Card key={metric.label} padding={3} radius={2} border><Text size={1} muted>{metric.label}</Text><Heading as="p" size={3}>{metric.value ?? '–'}</Heading></Card>)}</Grid><Grid columns={[1, 2]} gap={4}><DataList title="Viktigaste sidor" items={[...(data.traffic?.topPages || []), ...(data.search?.topPages || [])].slice(0, 10)} /><DataList title="Topp 10 sökfraser" items={data.search?.queries || []} /></Grid><Card padding={4} radius={2} border><Heading as="h2" size={2}>SEO-observationer</Heading><Stack marginTop={3} space={2}>{(data.observations || []).map((observation) => <Text key={observation}>• {observation}</Text>)}</Stack></Card></Stack> }
function DataList({title, items}: {title: string; items: Array<{label: string; value: number}>}) { return <Card padding={4} radius={2} border><Heading as="h2" size={2}>{title}</Heading><Stack marginTop={3} space={2}>{items.length ? items.map((item) => <Flex key={item.label} justify="space-between"><Text size={1}>{item.label}</Text><Text size={1} weight="semibold">{item.value}</Text></Flex>) : <Text size={1} muted>Ingen data för perioden.</Text>}</Stack></Card> }

function ToolShell({title, subtitle, children}: {title: string; subtitle: string; children: React.ReactNode}) { return <Container width={6} padding={[3, 4, 5]}><Stack space={4}><Box><Heading as="h1" size={4}>{title}</Heading><Text muted>{subtitle}</Text></Box>{children}</Stack></Container> }
