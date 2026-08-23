import {cloneElement, useEffect, useId, useMemo, useRef, useState} from 'react'
import {Box, Button, Card, Checkbox, Container, Flex, Grid, Heading, Inline, Select, Stack, Text, TextArea, TextInput} from '@sanity/ui'
import {useClient} from 'sanity'
import {
  WorkspaceShell,
  type WorkspaceSectionDefinition,
  type WorkspaceShellStatus,
} from './workspace-shell/WorkspaceShell'
import {LiveFrontendPreview} from '../features/preview/LiveFrontendPreview'

type ImageData = {_key?: string; _type?: string; assetRef?: string; url?: string; alt?: string; credit?: string; caption?: string; rightsConfirmed?: boolean; hideFromWebsite?: boolean; width?: number; height?: number}
type PublishChecklist = {factsConfirmed?: boolean; languageChecked?: boolean; seoChecked?: boolean; imagesChecked?: boolean}
type Project = {_id: string; _originalId?: string; _updatedAt?: string; title?: string; slug?: string; location?: string; year?: number; language?: string; translationKey?: string; translationStatus?: string; status?: string; summary?: string; seoTitle?: string; seoDescription?: string; imageRightsConfirmed?: boolean; legacyImageCount?: number; publishChecklist?: PublishChecklist; heroImage?: ImageData; galleryImages?: ImageData[]; floorPlans?: Array<{_key?: string; name?: string; planType?: string; area?: string; description?: string; image?: ImageData}>}
type HomeEntry = {_key?: string; displayStyle?: string; project?: Project; projectRef?: string}
type StudioClient = ReturnType<typeof useClient>

const apiVersion = '2025-02-19'
const studioEnvironment = (import.meta as ImportMeta & {env?: Record<string, string | undefined>}).env
const analyticsEndpoint = studioEnvironment?.SANITY_STUDIO_ANALYTICS_ENDPOINT || '/api/analytics'
const imageProjection = `{_key, _type, "assetRef": asset._ref, "url": asset->url, alt, credit, caption, rightsConfirmed, hideFromWebsite, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height}`
const projectsQuery = `*[_type == "project"] | order(title asc) {_id, _originalId, _updatedAt, title, "slug": slug.current, location, year, language, translationKey, translationStatus, status, summary, seoTitle, seoDescription, imageRightsConfirmed, "legacyImageCount": count(coalesce(images, [])) + count(coalesce(legacyImages, [])), publishChecklist, "heroImage": heroImage${imageProjection}, "galleryImages": galleryImages[]${imageProjection}, "floorPlans": floorPlans[]{_key, name, planType, area, description, "image": image${imageProjection}}}`
const homeQuery = `*[_type == "homePage"][0]{_id, _originalId, "featuredProjects": featuredProjects[]{_key, displayStyle, "projectRef": project._ref, "project": project-> {_id, _originalId, title, location, language, status, seoTitle, seoDescription, "heroImage": heroImage${imageProjection}}}}`
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const translationKeyPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/

function previewClient(client: StudioClient) {
  return client.withConfig({perspective: 'drafts', useCdn: false})
}

function canonicalId(id: string) {
  return id.replace(/^drafts\./, '')
}

async function patchDraft(client: StudioClient, id: string, type: string, patch: Record<string, unknown>) {
  const publishedId = canonicalId(id)
  const draftId = `drafts.${publishedId}`
  const existingDraft = await client.getDocument(draftId)
  if (!existingDraft) {
    const published = await client.getDocument<Record<string, unknown>>(publishedId)
    const draft: Record<string, unknown> = {_id: draftId, _type: type}
    for (const [key, value] of Object.entries(published || {})) {
      if (!key.startsWith('_')) draft[key] = value
    }
    await client.createIfNotExists(draft as {_id: string; _type: string})
  }
  await client.patch(draftId).set(patch).commit({autoGenerateArrayKeys: true})
  return draftId
}

function errorMessage(action: string) {
  return `${action} misslyckades. Ingen publicerad version ändrades. Kontrollera anslutningen och öppna dokumentvyn för detaljer.`
}

function publicationIssues(project: Project, projects: Project[]) {
  const issues: string[] = []
  if (!project.title?.trim()) issues.push('Projektnamn saknas.')
  if (!project.slug || !slugPattern.test(project.slug)) issues.push('Den permanenta webbadressen saknas eller har fel format.')
  if (!['sv', 'en'].includes(project.language || '')) issues.push('Välj svenska eller engelska.')
  if (!project.translationKey || !translationKeyPattern.test(project.translationKey)) issues.push('Språkkopplingen saknas eller har fel format.')
  const counterpart = projects.find((candidate) => candidate._id !== project._id && candidate.translationKey === project.translationKey && candidate.language !== project.language)
  if (!counterpart) issues.push('Den kopplade svenska/engelska versionen saknas.')
  else {
    if (counterpart.slug !== project.slug) issues.push('Språkversionerna måste ha samma permanenta webbadress.')
    if (counterpart.translationStatus !== 'approved') issues.push('Den kopplade språkversionens översättning är inte godkänd.')
    if (!counterpart.seoTitle || counterpart.seoTitle.length > 60 || !counterpart.seoDescription || counterpart.seoDescription.length > 160) issues.push('Den kopplade språkversionens Google-titel eller Google-beskrivning är ofullständig.')
  }
  if (project.translationStatus !== 'approved') issues.push('Översättningsstatus måste vara Godkänd.')
  if (!project.summary || project.summary.trim().length < 40) issues.push('Projektintroduktionen måste vara minst 40 tecken.')
  if (!project.seoTitle || project.seoTitle.length > 60) issues.push('Google-titeln saknas eller är längre än 60 tecken.')
  if (!project.seoDescription || project.seoDescription.length > 160) issues.push('Google-beskrivningen saknas eller är längre än 160 tecken.')
  if (!project.heroImage?.assetRef && !project.legacyImageCount) issues.push('Huvudbild saknas.')
  if (project.heroImage && (!project.heroImage.alt || !project.heroImage.credit || !project.heroImage.rightsConfirmed)) issues.push('Huvudbilden behöver alt-text, kredit och bekräftade rättigheter.')
  for (const [index, image] of (project.galleryImages || []).entries()) if (!image.hideFromWebsite && (!image.assetRef || !image.alt || !image.credit || !image.rightsConfirmed)) issues.push(`Galleribild ${index + 1} behöver bild, alt-text, kredit och bekräftade rättigheter.`)
  for (const [index, plan] of (project.floorPlans || []).entries()) if (!plan.name || !plan.planType || !plan.image?.assetRef || !plan.image.alt || !plan.image.credit || !plan.image.rightsConfirmed) issues.push(`Planritning ${index + 1} behöver namn, typ, bild, alt-text, kredit och bekräftade rättigheter.`)
  if (!project.imageRightsConfirmed) issues.push('Bekräfta projektets samlade bildrättigheter.')
  const checklist = project.publishChecklist
  if (!checklist?.factsConfirmed || !checklist.languageChecked || !checklist.seoChecked || !checklist.imagesChecked) issues.push('Slutför alla fyra punkter i publiceringschecklistan.')
  return issues
}

function goToDocument(id: string, path?: string) {
  window.location.hash = `#/intent/edit/id=${encodeURIComponent(canonicalId(id))};type=project${path ? `;path=${encodeURIComponent(path)}` : ''}`
}

function img(image?: ImageData, alt = '') {
  return image?.url ? <img className="esencial-thumb" src={image.url} alt={image.alt || alt} /> : <div className="esencial-thumb esencial-thumb--empty">Ingen bild</div>
}

function Issue({children}: {children: React.ReactNode}) {
  return <Text size={1} muted><span className="esencial-issue">Kontroll: {children}</span></Text>
}

export function PagePreviewTool() {
  const baseClient = useClient({apiVersion})
  const client = useMemo(() => previewClient(baseClient), [baseClient])
  const [projects, setProjects] = useState<Project[]>([])
  const [home, setHome] = useState<HomeEntry[]>([])
  const [mode, setMode] = useState<'home' | 'list' | 'project'>('home')
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    Promise.all([client.fetch<Project[]>(projectsQuery), client.fetch<{featuredProjects?: HomeEntry[]} | null>(homeQuery)])
      .then(([nextProjects, nextHome]) => { setProjects(nextProjects); setHome(nextHome?.featuredProjects || []); setSelectedId(nextProjects[0]?._id || '') })
      .catch(() => setLoadError(true))
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
          <Button aria-pressed={mode === 'home'} mode={mode === 'home' ? 'default' : 'bleed'} text="Startsida" onClick={() => setMode('home')} />
          <Button aria-pressed={mode === 'list'} mode={mode === 'list' ? 'default' : 'bleed'} text="Projektlista" onClick={() => setMode('list')} />
          <Button aria-pressed={mode === 'project'} mode={mode === 'project' ? 'default' : 'bleed'} text="En projektsida" onClick={() => setMode('project')} />
          {mode === 'project' && <Select value={selectedId} onChange={(event) => setSelectedId(event.currentTarget.value)}>{projects.map((project) => <option key={project._id} value={project._id}>{project.title || 'Namnlöst projekt'} ({project.language?.toUpperCase()})</option>)}</Select>}
          <Box paddingTop={2}><Text size={1} muted>En klickbar bild öppnar rätt bildfält i projektet.</Text></Box>
        </Stack>
      </Card>
      <Card padding={4} radius={2} border className="esencial-canvas">
        {loading ? <Text>Laddar innehåll…</Text> : loadError ? <Issue>Förhandsvisningen kunde inte läsa kladdarna. Ladda om Studio och kontrollera anslutningen.</Issue> : <Stack space={3}><Text size={1} muted>Skyddad kladdförhandsvisning · aldrig en publik länk</Text><PreviewCanvas mode={mode} projects={shownProjects} selected={selected} /></Stack>}
      </Card>
    </Grid>
  </ToolShell>
}

/*
 * The workspace intentionally writes to Sanity drafts as the editor works. The right
 * panel uses the same local value first, so a text or media change is visible before
 * the debounced draft mutation reaches Sanity. Publishing is still a separate choice.
 */
export function VisualWorkspaceTool() {
  const baseClient = useClient({apiVersion})
  const client = useMemo(() => previewClient(baseClient), [baseClient])
  const [projects, setProjects] = useState<Project[]>([])
  const [home, setHome] = useState<HomeEntry[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [surface, setSurface] = useState<'project' | 'home'>('project')
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')
  const [saveError, setSaveError] = useState('')
  const pendingPatches = useRef<Record<string, Record<string, unknown>>>({})
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    void Promise.all([client.fetch<Project[]>(projectsQuery), client.fetch<{featuredProjects?: HomeEntry[]} | null>(homeQuery)])
      .then(([nextProjects, nextHome]) => {
        setProjects(nextProjects)
        setHome(nextHome?.featuredProjects || [])
        setSelectedId((current) => current || nextProjects[0]?._id || '')
        setSaveState('saved')
      })
      .catch(() => { setSaveState('error'); setSaveError(errorMessage('Laddningen')) })
  }, [client])
  useEffect(() => () => { Object.values(saveTimers.current).forEach(clearTimeout) }, [])

  const selected = projects.find((project) => project._id === selectedId)
  const queueProjectPatch = (id: string, patch: Record<string, unknown>) => {
    pendingPatches.current[id] = {...pendingPatches.current[id], ...patch}
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    setSaveState('saving')
    setSaveError('')
    saveTimers.current[id] = setTimeout(() => {
      const changes = pendingPatches.current[id]
      delete pendingPatches.current[id]
      delete saveTimers.current[id]
      void patchDraft(client, id, 'project', documentPatch(changes as Partial<Project>))
        .then(() => setSaveState('saved'))
        .catch(() => { setSaveState('error'); setSaveError(errorMessage('Autosparningen')) })
    }, 450)
  }
  const updateProject = (patch: Partial<Project>) => {
    if (!selected) return
    setProjects((current) => current.map((project) => project._id === selected._id ? {...project, ...patch} : project))
    queueProjectPatch(selected._id, patch as Record<string, unknown>)
  }
  const saveProjectNow = async (patch: Partial<Project>) => {
    if (!selected) return
    const id = selected._id
    const changes = {...pendingPatches.current[id], ...patch}
    delete pendingPatches.current[id]
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    delete saveTimers.current[id]
    setProjects((current) => current.map((project) => project._id === id ? {...project, ...changes} : project))
    setSaveState('saving')
    setSaveError('')
    try {
      await patchDraft(client, id, 'project', documentPatch(changes))
      setSaveState('saved')
    } catch {
      setSaveState('error')
      setSaveError(errorMessage('Sparningen'))
    }
  }
  const upload = async (placement: 'hero' | 'gallery' | 'floorPlan', file?: File) => {
    if (!selected || !file) return
    setSaveState('saving')
    try {
      const asset = await client.assets.upload('image', file, {filename: file.name})
      const assetRef = asset._id
      const url = (asset as unknown as {url?: string}).url
      if (placement === 'hero') {
        await saveProjectNow({heroImage: {_type: 'projectHeroImage', assetRef, url, alt: '', credit: '', rightsConfirmed: false}})
      } else if (placement === 'gallery') {
        const image: ImageData = {_type: 'projectGalleryImage', assetRef, url, alt: '', credit: '', rightsConfirmed: false, hideFromWebsite: false}
        await saveProjectNow({galleryImages: [...(selected.galleryImages || []), image]})
      } else {
        const plan = {_type: 'floorPlan', name: file.name.replace(/\.[^.]+$/, ''), planType: 'planlosning', image: {_type: 'image', assetRef, url, alt: '', credit: '', rightsConfirmed: false}}
        await saveProjectNow({floorPlans: [...(selected.floorPlans || []), plan]})
      }
    } catch {
      setSaveState('error')
      setSaveError(errorMessage('Bilduppladdningen'))
    }
  }
  const saveHome = async (nextHome: HomeEntry[]) => {
    setHome(nextHome)
    setSaveState('saving')
    try {
      await patchDraft(client, 'homePage', 'homePage', {featuredProjects: nextHome.map(cleanHomeEntry)})
      setSaveState('saved')
    } catch {
      setSaveState('error')
      setSaveError(errorMessage('Sparningen av startsidan'))
    }
  }

  const workspaceStatus: WorkspaceShellStatus = {
    state: saveState,
    label: saveState === 'loading' ? 'Laddar arbetsytan…' : saveState === 'saving' ? 'Sparar kladd…' : saveState === 'saved' ? 'Kladd sparat' : 'Kunde inte spara kladd',
  }
  const sections: WorkspaceSectionDefinition[] = [
    {
      id: 'projects-filters',
      summary: 'Redigera projekt och startsidans urval i ett lugnt vertikalt flöde. Filtermodulen kan anslutas här utan att ändra arbetsytans navigering eller publiceringsskydd.',
      children: <Stack space={4}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <Inline space={2} className="esencial-actions">
            <Button aria-pressed={surface === 'project'} mode={surface === 'project' ? 'default' : 'ghost'} text="Projekt" onClick={() => setSurface('project')} />
            <Button aria-pressed={surface === 'home'} mode={surface === 'home' ? 'default' : 'ghost'} text="Startsida" onClick={() => setSurface('home')} />
            <Button mode="ghost" text="Öppna fullständig dokumentvy" disabled={!selected || surface === 'home'} onClick={() => selected && goToDocument(selected._id)} />
          </Inline>
        </Flex>
        {saveError && <Card padding={3} radius={2} border tone="critical"><Text size={1}>{saveError}</Text></Card>}
        <Card padding={[3, 4]} radius={2} border className="esencial-editor-pane">
          {surface === 'project' ? <ProjectWorkspace projects={projects} selected={selected} selectedId={selectedId} onSelect={setSelectedId} onChange={updateProject} onSaveNow={saveProjectNow} onUpload={upload} /> : <HomeWorkspace projects={projects} entries={home} onChange={saveHome} />}
        </Card>
        <WorkspaceLower projects={projects} home={home} />
      </Stack>,
    },
    {
      id: 'live-preview',
      // S18 preserves the safeguard vocabulary: 'desktop', 'tablet', 'mobile'.
      summary: 'Granska den riktiga skyddade frontendrenderern i fasta dator-, platt- och mobilbredder. Layoutfel blockerar redaktionell granskning och den lokala fixturen räknas aldrig som autentiserat previewbevis.',
      children: <LiveFrontendPreview />,
    },
    {
      id: 'analytics-consent',
      summary: 'Visa endast verkliga, anslutna analyslägen. Samtyckes- och integritetskontroller kan läggas till här senare utan att providerhemligheter flyttas till Studio.',
      children: <Card padding={[3, 4]} radius={2} border className="esencial-workspace-analytics">
        <WorkspaceAnalytics />
      </Card>,
    },
  ]

  return <WorkspaceShell
    title="Arbetsyta"
    subtitle="En sammanhängande arbetsyta för projekt, förhandsvisning och uppföljning. Avsnitten följer samma ordning på stor och liten skärm."
    safetyNotice="Alla ändringar sparas som kladd. Publicerad webbplats ändras först efter Sanitys slutliga validering och ett godkänt stagingbygge."
    status={workspaceStatus}
    sections={sections}
  />
}

function WorkspaceAnalytics() {
  const [state, setState] = useState<{loading: boolean; data?: Analytics; error?: string}>({loading: true})
  useEffect(() => { fetchAnalytics(30).then((data) => setState({loading: false, data})).catch((error) => setState({loading: false, error: error.message})) }, [])
  const traffic = state.data?.traffic
  return <Stack space={3}>
    <Flex justify="space-between" align="center"><Heading as="h3" size={2}>Webbplatsens utveckling</Heading><Text size={1} muted>Senaste 30 dagar</Text></Flex>
    {state.loading ? <Text size={1} muted>Laddar statistik…</Text> : state.error ? <Text size={1} muted>Statistiken kunde inte hämtas: {state.error}</Text> : !state.data?.configured ? <Text size={1} muted>{state.data?.message || 'Vercel Web Analytics är inte anslutet. Inga exempelvärden visas.'}</Text> : state.data.state === 'empty' ? <Text size={1} muted>Källan är ansluten men har ingen data för perioden.</Text> : <Grid columns={3} gap={2}>{[{label: 'Besökare', value: traffic?.visitors}, {label: 'Sidvisningar', value: traffic?.pageviews}, {label: 'Organiska klick', value: state.data.search?.clicks}].map((metric) => <Box key={metric.label}><Text size={1} muted>{metric.label}</Text><Heading as="p" size={2}>{metric.value ?? '–'}</Heading></Box>)}</Grid>}
    <Text size={1} muted>Källor: Vercel Web Analytics och, när den är ansluten, Google Search Console.</Text>
  </Stack>
}

function WorkspaceLower({projects, home}: {projects: Project[]; home: HomeEntry[]}) {
  const queues = {
    drafts: projects.filter((project) => project.status === 'draft'),
    images: projects.filter((project) => !project.heroImage?.url || !project.heroImage.alt || !project.heroImage.rightsConfirmed),
    seo: projects.filter((project) => !project.seoTitle || !project.seoDescription),
  }
  return <Box marginTop={5} className="esencial-workspace-lower">
    <Heading as="h3" size={3}>Arbete, struktur och projektinformation</Heading>
    <Grid columns={[1, 2, 3]} gap={3} marginTop={3}>
      <QueueCard title="Under arbete" action="Färdigställ innehållet i redigeringsytan ovan." items={queues.drafts} headingLevel="h4" />
      <QueueCard title="Bildkontroll" action="Komplettera huvudbild, alt-text eller rättighetsbekräftelse." items={queues.images} tone="critical" headingLevel="h4" />
      <QueueCard title="SEO-kontroll" action="Lägg till Google-titel och beskrivning." items={queues.seo} tone="critical" headingLevel="h4" />
      <Card padding={4} radius={2} border><Stack space={3}><Heading as="h4" size={2}>Startsida</Heading><Text size={1} muted>{home.length} utvalda projekt. Ordna dem i fliken Startsida ovan.</Text></Stack></Card>
      <Card padding={4} radius={2} border><Stack space={3}><Heading as="h4" size={2}>Struktur</Heading><Text size={1} muted>Avancerad struktur och nya dokument är undantag. Den dagliga redigeringen görs på denna sida.</Text></Stack></Card>
      <Card padding={4} radius={2} border><Stack space={3}><Heading as="h4" size={2}>Projektinformation</Heading><Text size={1} muted>Text, bilder, planritningar, SEO och publicering för det valda projektet redigeras ovan.</Text></Stack></Card>
    </Grid>
  </Box>
}

function ProjectWorkspace({projects, selected, selectedId, onSelect, onChange, onSaveNow, onUpload}: {projects: Project[]; selected?: Project; selectedId: string; onSelect: (id: string) => void; onChange: (patch: Partial<Project>) => void; onSaveNow: (patch: Partial<Project>) => Promise<void>; onUpload: (placement: 'hero' | 'gallery' | 'floorPlan', file?: File) => Promise<void>}) {
  const [draggedGallery, setDraggedGallery] = useState<number | undefined>()
  const [draggedPlan, setDraggedPlan] = useState<number | undefined>()
  if (!selected) return <Stack space={3}><Heading as="h3" size={3}>Inget projekt ännu</Heading><Text>Skapa ett projekt i dokumentvyn för att börja arbeta visuellt.</Text></Stack>
  const publishProblems = publicationIssues(selected, projects)
  const setStatus = (status: string) => onChange({status})
  const setGallery = (galleryImages: ImageData[]) => onSaveNow({galleryImages})
  const setPlans = (floorPlans: NonNullable<Project['floorPlans']>) => onSaveNow({floorPlans})
  const setChecklist = (key: keyof PublishChecklist, value: boolean) => onChange({publishChecklist: {...selected.publishChecklist, [key]: value}})
  return <Stack space={5}>
    <Field label="Projekt att redigera"><Select value={selectedId} onChange={(event) => onSelect(event.currentTarget.value)}>{projects.map((project) => <option key={project._id} value={project._id}>{project.title || 'Namnlöst projekt'} · {project.language?.toUpperCase() || 'språk saknas'}</option>)}</Select></Field>
    <EditorSection title="Text och projektfakta" hint="Detta syns i rubrik, introduktion och Google-resultat.">
      <Field label="Projektnamn"><TextInput value={selected.title || ''} onChange={(event) => onChange({title: event.currentTarget.value})} /></Field>
      <Grid columns={[1, 2]} gap={3}><Field label="Permanent webbadress"><TextInput value={selected.slug || ''} readOnly={selected.status === 'published'} onChange={(event) => onChange({slug: event.currentTarget.value})} /></Field><Field label="Språk"><Select value={selected.language || ''} onChange={(event) => onChange({language: event.currentTarget.value})}><option value="">Välj språk</option><option value="sv">Svenska</option><option value="en">English</option></Select></Field></Grid>
      <Grid columns={[1, 2]} gap={3}><Field label="Språkkoppling"><TextInput value={selected.translationKey || ''} readOnly={selected.status === 'published'} placeholder="mitt_projekt" onChange={(event) => onChange({translationKey: event.currentTarget.value})} /></Field><Field label="Översättningsstatus"><Select value={selected.translationStatus || 'not-started'} onChange={(event) => onChange({translationStatus: event.currentTarget.value})}><option value="not-started">Ej påbörjad</option><option value="in-progress">Under arbete</option><option value="ready-for-review">Klar för granskning</option><option value="approved">Godkänd</option></Select></Field></Grid>
      <Grid columns={[1, 2]} gap={3}><Field label="Plats"><TextInput value={selected.location || ''} onChange={(event) => onChange({location: event.currentTarget.value})} /></Field><Field label="År"><TextInput type="number" value={selected.year || ''} onChange={(event) => onChange({year: event.currentTarget.value ? Number(event.currentTarget.value) : undefined})} /></Field></Grid>
      <Field label="Kort projektintroduktion"><TextArea value={selected.summary || ''} rows={5} onChange={(event) => onChange({summary: event.currentTarget.value})} /></Field>
      <Grid columns={[1, 2]} gap={3}><Field label="Titel i Google"><TextInput value={selected.seoTitle || ''} onChange={(event) => onChange({seoTitle: event.currentTarget.value})} /></Field><Field label="Beskrivning i Google"><TextArea value={selected.seoDescription || ''} rows={3} onChange={(event) => onChange({seoDescription: event.currentTarget.value})} /></Field></Grid>
    </EditorSection>
    <EditorSection title="Huvudbild" hint="Visas både överst på projektsidan och på projektkortet. Planritningar hör aldrig hemma här.">
      <DropZone label="Släpp huvudbild här" onFile={(file) => onUpload('hero', file)} />
      {selected.heroImage && <MediaEditor image={selected.heroImage} onChange={(heroImage) => onSaveNow({heroImage})} />}
    </EditorSection>
    <EditorSection title="Projektgalleri" hint="Vanliga projektbilder. Dra korten för ordning; första bilden visas först efter huvudbilden.">
      <DropZone label="Lägg till bilder i projektgalleriet" multiple onFile={(file) => onUpload('gallery', file)} />
      <Stack space={3}>{(selected.galleryImages || []).map((image, index, all) => <MediaCard key={image._key || image.assetRef || index} image={image} label={`Galleri ${index + 1}${index === 0 ? ' · visas först' : ''}`} draggable onDragStart={() => setDraggedGallery(index)} onDrop={() => { if (draggedGallery !== undefined && draggedGallery !== index) setGallery(moveItem(all, draggedGallery, index)); setDraggedGallery(undefined) }} onChange={(next) => setGallery(all.map((value, itemIndex) => itemIndex === index ? next : value))} onRemove={() => setGallery(all.filter((_, itemIndex) => itemIndex !== index))} />)}</Stack>
    </EditorSection>
    <EditorSection title="Planritningar" hint="En egen plats på projektsidan. De blandas aldrig med projektgalleriet.">
      <DropZone label="Lägg till planritning" onFile={(file) => onUpload('floorPlan', file)} />
      <Stack space={3}>{(selected.floorPlans || []).map((plan, index, all) => <FloorPlanCard key={plan._key || plan.image?.assetRef || index} plan={plan} label={`Planritning ${index + 1}`} draggable onDragStart={() => setDraggedPlan(index)} onDrop={() => { if (draggedPlan !== undefined && draggedPlan !== index) setPlans(moveItem(all, draggedPlan, index)); setDraggedPlan(undefined) }} onChange={(next) => setPlans(all.map((value, itemIndex) => itemIndex === index ? next : value))} onRemove={() => setPlans(all.filter((_, itemIndex) => itemIndex !== index))} />)}</Stack>
    </EditorSection>
    <EditorSection title="Egenkontroll och publicering" hint="Arbetsytan sparar bara kladd. Den fullständiga dokumentvyn gör den slutliga valideringen och publiceringen till Sanity; därefter får nästa godkända CMS-bygg använda innehållet på staging.">
      <LabeledCheckbox checked={Boolean(selected.imageRightsConfirmed)} onChange={(checked) => onChange({imageRightsConfirmed: checked})} label="Jag har bekräftat rättigheterna för alla bilder i projektet." />
      <Stack space={2}><LabeledCheckbox checked={Boolean(selected.publishChecklist?.factsConfirmed)} onChange={(checked) => setChecklist('factsConfirmed', checked)} label="Projektfakta är godkända." /><LabeledCheckbox checked={Boolean(selected.publishChecklist?.languageChecked)} onChange={(checked) => setChecklist('languageChecked', checked)} label="Språkversionerna är kontrollerade." /><LabeledCheckbox checked={Boolean(selected.publishChecklist?.seoChecked)} onChange={(checked) => setChecklist('seoChecked', checked)} label="Google-titel och beskrivning är kontrollerade." /><LabeledCheckbox checked={Boolean(selected.publishChecklist?.imagesChecked)} onChange={(checked) => setChecklist('imagesChecked', checked)} label="Bildbeskrivningar, krediter och rättigheter är kontrollerade." /></Stack>
      <Field label="Publiceringsläge"><Select value={selected.status || 'draft'} onChange={(event) => setStatus(event.currentTarget.value)}><option value="draft">Under arbete</option><option value="review">Klar att publicera</option>{selected.status === 'published' && <option value="published" disabled>Publicerad · hanteras i dokumentvyn</option>}<option value="archived">Arkiverad</option></Select></Field>
      {publishProblems.length ? <Card marginTop={2} padding={3} radius={2} border tone="critical"><Stack space={2}><Text size={1} weight="semibold">Åtgärda före publicering:</Text>{publishProblems.map((problem) => <Text key={problem} size={1}>• {problem}</Text>)}</Stack></Card> : <Card marginTop={2} padding={3} radius={2} border tone="positive"><Text size={1}>Egenkontrollen är komplett. Öppna dokumentvyn för Sanitys slutliga validering.</Text></Card>}
      <Box marginTop={3}><Button tone="positive" text="Öppna slutlig kontroll och publicering" disabled={publishProblems.length > 0} onClick={() => goToDocument(selected._id)} /></Box>
      <Text size={1} muted>Ett underkänt CMS-bygge lämnar tidigare staging oförändrad. Den nuvarande live-domänen ändras aldrig av denna arbetsyta.</Text>
    </EditorSection>
  </Stack>
}

function HomeWorkspace({projects, entries, onChange}: {projects: Project[]; entries: HomeEntry[]; onChange: (entries: HomeEntry[]) => Promise<void>}) {
  const [dragged, setDragged] = useState<number | undefined>()
  const featuredIds = new Set(entries.map((entry) => entry.project?._id || entry.projectRef))
  const addProject = (project: Project) => void onChange([...entries, {displayStyle: 'card', projectRef: project._id, project}])
  return <Stack space={5}>
    <EditorSection title="Startsida" hint="Dessa kort visas på startsidan i denna ordning. Bilden kommer alltid från projektets huvudbild.">
      <Stack space={3}>{entries.map((entry, index, all) => entry.project && <Card key={entry._key || entry.project._id} padding={3} border radius={2} draggable onDragStart={() => setDragged(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged !== undefined && dragged !== index) void onChange(moveItem(all, dragged, index)); setDragged(undefined) }}><Flex gap={3} align="center">{img(entry.project.heroImage, entry.project.title)}<Box flex={1}><Text size={1} muted>Position {index + 1}</Text><Heading as="h4" size={2}>{entry.project.title || 'Namnlöst projekt'}</Heading><Box marginTop={2}><Select value={entry.displayStyle || 'card'} onChange={(event) => void onChange(all.map((value, itemIndex) => itemIndex === index ? {...value, displayStyle: event.currentTarget.value} : value))}><option value="card">Normalt kort</option><option value="featured">Huvudprojekt</option></Select></Box></Box><Button tone="critical" mode="ghost" text="Ta bort" onClick={() => void onChange(all.filter((_, itemIndex) => itemIndex !== index))} /></Flex></Card>)}</Stack>
      {!entries.length && <Text size={1} muted>Inga projekt är valda till startsidan ännu.</Text>}
    </EditorSection>
    <EditorSection title="Lägg till projekt" hint="Välj bara publicerade projekt när startsidan ska motsvara staging.">
      <Stack space={2}>{projects.filter((project) => project.status === 'published' && !featuredIds.has(project._id)).map((project) => <Button key={project._id} mode="ghost" text={`Lägg till: ${project.title || 'Namnlöst projekt'} (${project.language?.toUpperCase() || '–'})`} onClick={() => addProject(project)} />)}</Stack>
    </EditorSection>
  </Stack>
}

function EditorSection({title, hint, children}: {title: string; hint: string; children: React.ReactNode}) { return <Card padding={3} radius={2} border><Stack space={3}><Box><Heading as="h3" size={2}>{title}</Heading><Text size={1} muted>{hint}</Text></Box>{children}</Stack></Card> }
function Field({label, children}: {label: string; children: React.ReactElement<{id?: string}>}) { const id = useId(); return <Stack space={2}><label className="esencial-field-label" htmlFor={id}>{label}</label>{cloneElement(children, {id})}</Stack> }
function LabeledCheckbox({checked, label, onChange}: {checked: boolean; label: string; onChange: (checked: boolean) => void}) { const id = useId(); return <label className="esencial-checkbox-row" htmlFor={id}><Checkbox id={id} checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} /><Text as="span" size={1}>{label}</Text></label> }
function DropZone({label, multiple, onFile}: {label: string; multiple?: boolean; onFile: (file?: File) => void}) { return <label className="esencial-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); [...event.dataTransfer.files].forEach((file) => onFile(file)) }}><strong>{label}</strong><span>Klicka eller dra en bild hit. Bilden sparas som kladd och visas direkt till höger.</span><input type="file" accept="image/*" multiple={multiple} onChange={(event) => { [...(event.currentTarget.files || [])].forEach((file) => onFile(file)); event.currentTarget.value = '' }} /></label> }
function MediaEditor({image, onChange}: {image: ImageData; onChange: (image: ImageData) => void}) { return <Stack space={3}><Card padding={2} radius={2} border>{img(image, 'Huvudbild')}</Card><Grid columns={[1, 2]} gap={3}><Field label="Alt-text"><TextInput value={image.alt || ''} onChange={(event) => onChange({...image, alt: event.currentTarget.value})} /></Field><Field label="Fotograf / kredit"><TextInput value={image.credit || ''} onChange={(event) => onChange({...image, credit: event.currentTarget.value})} /></Field></Grid><LabeledCheckbox checked={Boolean(image.rightsConfirmed)} onChange={(checked) => onChange({...image, rightsConfirmed: checked})} label="Rättigheter bekräftade" /></Stack> }
function MediaCard({image, label, draggable, onDragStart, onDrop, onChange, onRemove}: {image: ImageData; label: string; draggable?: boolean; onDragStart?: () => void; onDrop?: () => void; onChange: (image: ImageData) => void; onRemove: () => void}) { return <Card padding={3} radius={2} border draggable={draggable} onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><Stack space={3}><Flex justify="space-between" align="center"><Text size={1} weight="semibold">Ordning · {label}</Text><Button tone="critical" mode="ghost" text="Ta bort" onClick={onRemove} /></Flex>{img(image, label)}<MediaEditor image={image} onChange={onChange} /><Field label="Bildtext (valfri)"><TextInput value={image.caption || ''} onChange={(event) => onChange({...image, caption: event.currentTarget.value})} /></Field><LabeledCheckbox checked={Boolean(image.hideFromWebsite)} onChange={(checked) => onChange({...image, hideFromWebsite: checked})} label="Behåll i CMS men visa inte publikt" /></Stack></Card> }
function FloorPlanCard({plan, label, draggable, onDragStart, onDrop, onChange, onRemove}: {plan: NonNullable<Project['floorPlans']>[number]; label: string; draggable?: boolean; onDragStart?: () => void; onDrop?: () => void; onChange: (plan: NonNullable<Project['floorPlans']>[number]) => void; onRemove: () => void}) { return <Card padding={3} radius={2} border draggable={draggable} onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><Stack space={3}><Flex justify="space-between" align="center"><Text size={1} weight="semibold">Ordning · {label}</Text><Button tone="critical" mode="ghost" text="Ta bort" onClick={onRemove} /></Flex>{img(plan.image, label)}<Grid columns={[1, 2]} gap={3}><Field label="Namn"><TextInput value={plan.name || ''} onChange={(event) => onChange({...plan, name: event.currentTarget.value})} /></Field><Field label="Typ"><Select value={plan.planType || 'planlosning'} onChange={(event) => onChange({...plan, planType: event.currentTarget.value})}><option value="planlosning">Planlösning</option><option value="situationsplan">Situationsplan</option><option value="sektion">Sektion</option><option value="fasad">Fasad</option><option value="annat">Annat</option></Select></Field></Grid><Field label="Våning / område"><TextInput value={plan.area || ''} onChange={(event) => onChange({...plan, area: event.currentTarget.value})} /></Field>{plan.image && <MediaEditor image={plan.image} onChange={(image) => onChange({...plan, image})} />}</Stack></Card> }
function moveItem<T>(items: T[], from: number, to: number) { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next }
function cleanImage(image: ImageData) { const result: Record<string, unknown> = {_type: image._type || 'image'}; if (image._key) result._key = image._key; if (image.assetRef) result.asset = {_type: 'reference', _ref: image.assetRef}; for (const key of ['alt', 'credit', 'caption', 'rightsConfirmed', 'hideFromWebsite'] as const) if (image[key] !== undefined) result[key] = image[key]; return result }
function cleanFloorPlan(plan: NonNullable<Project['floorPlans']>[number]) { const result: Record<string, unknown> = {_type: 'floorPlan', name: plan.name, planType: plan.planType, area: plan.area, description: plan.description}; if (plan._key) result._key = plan._key; if (plan.image) result.image = cleanImage(plan.image); return result }
function cleanHomeEntry(entry: HomeEntry) { const result: Record<string, unknown> = {_type: 'object', displayStyle: entry.displayStyle || 'card', project: {_type: 'reference', _ref: canonicalId(entry.project?._id || entry.projectRef || '')}}; if (entry._key) result._key = entry._key; return result }
function documentPatch(patch: Partial<Project>) { const result: Record<string, unknown> = {...patch}; delete result._id; delete result._originalId; delete result._updatedAt; delete result.legacyImageCount; if (typeof patch.slug === 'string') result.slug = {_type: 'slug', current: patch.slug}; if (patch.heroImage) result.heroImage = cleanImage(patch.heroImage); if (patch.galleryImages) result.galleryImages = patch.galleryImages.map(cleanImage); if (patch.floorPlans) result.floorPlans = patch.floorPlans.map(cleanFloorPlan); return result }

function PreviewCanvas({mode, projects, selected, headingLevel = 'h2'}: {mode: 'home' | 'list' | 'project'; projects: Project[]; selected?: Project; headingLevel?: 'h2' | 'h3'}) {
  if (mode === 'project' && selected) return <Stack space={5}>
    <PreviewHeading eyebrow="Projektsida" title={selected.title || 'Namnlöst projekt'} headingLevel={headingLevel} />
    <PreviewImage image={selected.heroImage} label="Huvudbild" project={selected} path="heroImage" />
    <Heading as={headingLevel} size={2}>Projektgalleri</Heading>
    <Grid columns={[1, 2, 3]} gap={3}>{(selected.galleryImages || []).map((image, index) => <PreviewImage key={image.url || index} image={image} label={`Bild ${index + 1} i projektgalleri`} project={selected} path={`galleryImages[${index}]`} />)}</Grid>
    {!selected.galleryImages?.length && <Issue>Projektgalleriet saknar bilder.</Issue>}
    <Heading as={headingLevel} size={2}>Planritningar</Heading>
    <Grid columns={[1, 2, 3]} gap={3}>{(selected.floorPlans || []).map((plan, index) => <PreviewImage key={plan.image?.url || index} image={plan.image} label={plan.name || `Planritning ${index + 1}`} project={selected} path={`floorPlans[${index}]`} />)}</Grid>
    {!selected.floorPlans?.length && <Text size={1} muted>Inga planritningar är tillagda.</Text>}
  </Stack>
  return <Stack space={5}>
    <PreviewHeading eyebrow={mode === 'home' ? 'Startsida' : 'Projektlista'} title={mode === 'home' ? 'Utvalda projekt' : 'Alla publicerade projekt'} headingLevel={headingLevel} />
    {mode === 'home' && !projects.length && <Issue>Välj projekt i Startsida för att kunna förhandsvisa ordningen.</Issue>}
    <Grid columns={[1, 2, 3]} gap={3}>{projects.map((project, index) => <Card key={project._id} radius={2} border overflow="hidden" className="esencial-project-card"><PreviewImage image={project.heroImage} label={`${mode === 'home' ? `Position ${index + 1} på startsidan` : 'Projektkortets bild'}`} project={project} path="heroImage" /><Box padding={3}><Text size={1} muted>{project.location || 'Plats saknas'}</Text><Heading as={headingLevel} size={2}>{project.title || 'Namnlöst projekt'}</Heading>{!project.heroImage?.alt && <Issue>Saknar alt-text</Issue>}</Box></Card>)}</Grid>
  </Stack>
}

function PreviewHeading({eyebrow, title, headingLevel}: {eyebrow: string; title: string; headingLevel: 'h2' | 'h3'}) { return <Stack space={2}><Text size={1} muted>{eyebrow}</Text><Heading as={headingLevel} size={4}>{title}</Heading></Stack> }

function PreviewImage({image, label, project, path}: {image?: ImageData; label: string; project: Project; path: string}) {
  const problems = [!image?.alt && 'Saknar alt-text', !image?.rightsConfirmed && 'Rättigheter ej bekräftade', image?.width && image.width < 1200 && 'Bilden är liten'] .filter(Boolean)
  return <button type="button" className="esencial-preview-image" onClick={() => goToDocument(project._id, path)} aria-label={`Redigera ${label}`}>
    {img(image, label)}<span>{label}</span>{problems.length > 0 && <small>{problems.join(' · ')}</small>}
  </button>
}

export function ContentOverviewTool() {
  const baseClient = useClient({apiVersion})
  const client = useMemo(() => previewClient(baseClient), [baseClient])
  const [projects, setProjects] = useState<Project[]>([])
  useEffect(() => { client.fetch<Project[]>(projectsQuery).then(setProjects) }, [client])
  const queues = useMemo(() => ({
    drafts: projects.filter((project) => project.status === 'draft'),
    review: projects.filter((project) => project.status === 'review'),
    images: projects.filter((project) => !project.heroImage?.url || !project.heroImage.alt || !project.heroImage.credit || !project.heroImage.rightsConfirmed),
    seo: projects.filter((project) => !project.seoTitle || project.seoTitle.length > 60 || !project.seoDescription || project.seoDescription.length > 160),
    translations: projects.filter((project) => !project.language || !project.translationKey || project.translationStatus !== 'approved' || !projects.some((candidate) => candidate._id !== project._id && candidate.translationKey === project.translationKey && candidate.language !== project.language && candidate.slug === project.slug)),
  }), [projects])
  return <ToolShell title="Arbetsöversikt" subtitle="Din egen kö: status, nästa åtgärd och vad som måste vara klart före publicering.">
    <Inline space={2} className="esencial-actions"><Button text="Nytt projekt" onClick={() => { window.location.hash = '#/intent/create/template=project-sv' }} /><Button text="Granska bilder" onClick={() => { window.location.hash = '#/intent/edit/id=homePage;type=homePage' }} /><Button text="Granska SEO" onClick={() => { window.location.hash = '#/structure' }} /><Button text="Sidförhandsvisning" onClick={() => { window.location.hash = '#/sidforhandsvisning' }} /></Inline>
    <Grid columns={[1, 2, 3]} gap={4} marginTop={4}>
      <QueueCard title="Under arbete" action="Färdigställ innehåll" items={queues.drafts} />
      <QueueCard title="Klar att publicera" action="Gör egenkontrollen och välj sedan Publicerad" items={queues.review} />
      <QueueCard title="Bildkvalitet" action="Lägg till huvudbild, alt-text, kredit eller rättigheter" items={queues.images} tone="critical" />
      <QueueCard title="SEO-kvalitet" action="Rätta titel och beskrivning" items={queues.seo} tone="critical" />
      <QueueCard title="Översättningar" action="Kontrollera svensk och engelsk version" items={queues.translations} />
      <QueueCard title="Publicerat" action="Öppna Sidförhandsvisning för att granska placering" items={projects.filter((project) => project.status === 'published')} />
    </Grid>
  </ToolShell>
}

function QueueCard({title, action, items, tone, headingLevel = 'h2'}: {title: string; action: string; items: Project[]; tone?: 'critical'; headingLevel?: 'h2' | 'h4'}) { return <Card padding={4} radius={2} border tone={tone}><Stack space={3}><Flex justify="space-between"><Heading as={headingLevel} size={2}>{title}</Heading><Text size={3} weight="bold">{items.length}</Text></Flex><Text size={1} muted>{action}</Text>{items.slice(0, 4).map((project) => <Button key={project._id} mode="bleed" text={project.title || 'Namnlöst projekt'} onClick={() => goToDocument(project._id)} />)}{!items.length && <Text size={1} muted>Inget behöver åtgärdas.</Text>}</Stack></Card> }

type AnalyticsSource = {provider: string; state: 'unavailable' | 'empty' | 'ready' | 'error'; message?: string}
type Analytics = {configured: boolean; state: 'unavailable' | 'empty' | 'ready' | 'error'; periodDays?: number; traffic?: {state: 'empty' | 'ready'; visitors: number; pageviews: number; topPages: Array<{label: string; value: number}>; previous: {visitors: number; pageviews: number}} | null; search?: {state: 'empty' | 'ready'; clicks: number; impressions: number; ctr: number; position: number; topPages: Array<{label: string; value: number}>; queries: Array<{label: string; value: number}>; previous: {clicks: number; impressions: number}} | null; sources?: {traffic: AnalyticsSource; search: AnalyticsSource}; observations?: string[]; limitations?: string[]; message?: string}

async function fetchAnalytics(days: number) {
  const response = await fetch(`${analyticsEndpoint}?days=${days}`)
  const data = await response.json().catch(() => undefined) as Analytics | undefined
  if (!response.ok) throw new Error(data?.message || 'Statistiken kunde inte hämtas.')
  if (!data) throw new Error('Statistiken gav inget giltigt svar.')
  return data
}

export function GrowthTool() {
  const [days, setDays] = useState(30)
  const [state, setState] = useState<{loading: boolean; data?: Analytics; error?: string}>({loading: true})
  useEffect(() => { setState({loading: true}); fetchAnalytics(days).then((data) => setState({loading: false, data})).catch((error) => setState({loading: false, error: error.message})) }, [days])
  const data = state.data
  return <ToolShell title="Webbplatsens utveckling" subtitle="Trafik och söksynlighet, med jämförelse mot föregående period.">
    <Inline space={2}>{[7, 30, 90].map((value) => <Button key={value} mode={days === value ? 'default' : 'ghost'} text={`${value} dagar`} onClick={() => setDays(value)} />)}</Inline>
    {state.loading ? <Box marginTop={5}><Text>Laddar statistik…</Text></Box> : state.error ? <AnalyticsError message={state.error} /> : !data?.configured ? <EmptyAnalytics message={data?.message} /> : <AnalyticsDashboard data={data} />}
  </ToolShell>
}

function EmptyAnalytics({message}: {message?: string}) { return <Card marginTop={5} padding={5} radius={2} border><Stack space={3}><Text size={1} weight="semibold">Statistik</Text><Heading as="h2" size={3}>Statistik väntar på anslutning</Heading><Text>{message || 'Anslut en godkänd trafikkälla och Google Search Console för att se verkliga siffror.'}</Text><Text size={1} muted>Inga exempel- eller uppskattade siffror visas. Se docs/ANALYTICS_SETUP.md för externa steg.</Text></Stack></Card> }
function AnalyticsError({message}: {message: string}) { return <Card marginTop={5} padding={5} radius={2} border tone="critical"><Stack space={3}><Heading as="h2" size={3}>Statistiken kunde inte hämtas</Heading><Text>{message}</Text><Text size={1} muted>Inga tidigare, uppskattade eller exempelbaserade värden visas när källan ger fel.</Text></Stack></Card> }
function change(current?: number, previous?: number) { if (current === undefined || previous === undefined || previous === 0) return undefined; const value = ((current - previous) / previous) * 100; return `${value >= 0 ? '+' : ''}${value.toFixed(0)}% mot föregående period` }
function AnalyticsDashboard({data}: {data: Analytics}) { const metrics = [{label: 'Besökare', value: data.traffic?.visitors, change: change(data.traffic?.visitors, data.traffic?.previous?.visitors)}, {label: 'Sidvisningar', value: data.traffic?.pageviews, change: change(data.traffic?.pageviews, data.traffic?.previous?.pageviews)}, {label: 'Återkommande besökare', value: 'Inte tillgängligt med den valda integritetsnivån'}, {label: 'Organiska klick', value: data.search?.clicks, change: change(data.search?.clicks, data.search?.previous?.clicks)}, {label: 'Visningar i Google', value: data.search?.impressions, change: change(data.search?.impressions, data.search?.previous?.impressions)}, {label: 'CTR', value: data.search?.ctr !== undefined ? `${(data.search.ctr * 100).toFixed(1)}%` : undefined}, {label: 'Genomsnittlig position', value: data.search?.position?.toFixed(1)}]; return <Stack space={5} marginTop={5}>{data.state === 'empty' && <Text size={1} muted>Källorna är anslutna men har ingen data för perioden.</Text>}{(data.limitations || []).map((limitation) => <Text key={limitation} size={1} muted>{limitation}</Text>)}<Grid columns={[2, 3, 4]} gap={3}>{metrics.map((metric) => <Card key={metric.label} padding={3} radius={2} border><Text size={1} muted>{metric.label}</Text><Heading as="p" size={3}>{metric.value ?? '–'}</Heading>{metric.change && <Text size={1} muted>{metric.change}</Text>}</Card>)}</Grid><Grid columns={[1, 2]} gap={4}><DataList title="Viktigaste sidor" items={[...(data.traffic?.topPages || []), ...(data.search?.topPages || [])].slice(0, 10)} /><DataList title="Topp 10 sökfraser" items={data.search?.queries || []} /></Grid><Card padding={4} radius={2} border><Heading as="h2" size={2}>SEO-observationer</Heading><Stack marginTop={3} space={2}>{(data.observations || []).map((observation) => <Text key={observation}>• {observation}</Text>)}</Stack></Card></Stack> }
function DataList({title, items}: {title: string; items: Array<{label: string; value: number}>}) { return <Card padding={4} radius={2} border><Heading as="h2" size={2}>{title}</Heading><Stack marginTop={3} space={2}>{items.length ? items.map((item) => <Flex key={item.label} justify="space-between"><Text size={1}>{item.label}</Text><Text size={1} weight="semibold">{item.value}</Text></Flex>) : <Text size={1} muted>Ingen data för perioden.</Text>}</Stack></Card> }

function ToolShell({title, subtitle, children}: {title: string; subtitle: string; children: React.ReactNode}) { return <Container width={6} padding={[3, 4, 5]}><Stack space={4}><Box><Heading as="h1" size={4}>{title}</Heading><Text muted>{subtitle}</Text></Box>{children}</Stack></Container> }
