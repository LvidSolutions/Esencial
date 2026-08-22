import {useEffect, useMemo, useRef, useState} from 'react'
import {Box, Button, Card, Checkbox, Container, Flex, Grid, Heading, Inline, Label, Select, Stack, Text, TextArea, TextInput} from '@sanity/ui'
import {useClient, useDocumentOperation} from 'sanity'

type ImageData = {_key?: string; _type?: string; assetRef?: string; url?: string; alt?: string; credit?: string; caption?: string; rightsConfirmed?: boolean; hideFromWebsite?: boolean; width?: number; height?: number}
type Project = {_id: string; _updatedAt?: string; title?: string; slug?: string; location?: string; year?: number; language?: string; status?: string; summary?: string; seoTitle?: string; seoDescription?: string; imageRightsConfirmed?: boolean; heroImage?: ImageData; galleryImages?: ImageData[]; floorPlans?: Array<{_key?: string; name?: string; planType?: string; area?: string; description?: string; image?: ImageData}>}
type HomeEntry = {_key?: string; displayStyle?: string; project?: Project; projectRef?: string}

const apiVersion = '2025-02-19'
const analyticsEndpoint = import.meta.env.SANITY_STUDIO_ANALYTICS_ENDPOINT || '/api/analytics'
const imageProjection = `{_key, _type, "assetRef": asset._ref, "url": asset->url, alt, credit, caption, rightsConfirmed, hideFromWebsite, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height}`
const projectsQuery = `*[_type == "project"] | order(title asc) {_id, _updatedAt, title, "slug": slug.current, location, year, language, status, summary, seoTitle, seoDescription, imageRightsConfirmed, "heroImage": heroImage${imageProjection}, "galleryImages": galleryImages[]${imageProjection}, "floorPlans": floorPlans[]{_key, name, planType, area, description, "image": image${imageProjection}}}`
const homeQuery = `*[_type == "homePage"][0]{"featuredProjects": featuredProjects[]{_key, displayStyle, "projectRef": project._ref, "project": project-> {_id, title, location, language, status, seoTitle, seoDescription, "heroImage": heroImage${imageProjection}}}}`

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

/*
 * The workspace intentionally writes to Sanity drafts as the editor works. The right
 * panel uses the same local value first, so a text or media change is visible before
 * the debounced draft mutation reaches Sanity. Publishing is still a separate choice.
 */
export function VisualWorkspaceTool() {
  const client = useClient({apiVersion})
  const [projects, setProjects] = useState<Project[]>([])
  const [home, setHome] = useState<HomeEntry[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [surface, setSurface] = useState<'project' | 'home'>('project')
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')
  const pendingPatches = useRef<Record<string, Record<string, unknown>>>({})
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = () => Promise.all([client.fetch<Project[]>(projectsQuery), client.fetch<{featuredProjects?: HomeEntry[]} | null>(homeQuery)])
    .then(([nextProjects, nextHome]) => {
      setProjects(nextProjects)
      setHome(nextHome?.featuredProjects || [])
      setSelectedId((current) => current || nextProjects[0]?._id || '')
      setSaveState('saved')
    })
    .catch(() => setSaveState('error'))

  useEffect(() => { void load() }, [client])
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  const selected = projects.find((project) => project._id === selectedId)
  const queueProjectPatch = (id: string, patch: Record<string, unknown>) => {
    pendingPatches.current[id] = {...pendingPatches.current[id], ...patch}
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveState('saving')
    saveTimer.current = setTimeout(() => {
      const changes = pendingPatches.current[id]
      delete pendingPatches.current[id]
      void client.patch(id).set(changes).commit({autoGenerateArrayKeys: true})
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'))
    }, 450)
  }
  const updateProject = (patch: Partial<Project>) => {
    if (!selected) return
    setProjects((current) => current.map((project) => project._id === selected._id ? {...project, ...patch} : project))
    queueProjectPatch(selected._id, patch as Record<string, unknown>)
  }
  const saveProjectNow = async (patch: Partial<Project>) => {
    if (!selected) return
    setProjects((current) => current.map((project) => project._id === selected._id ? {...project, ...patch} : project))
    setSaveState('saving')
    try {
      await client.patch(selected._id).set(documentPatch(patch)).commit({autoGenerateArrayKeys: true})
      setSaveState('saved')
    } catch {
      setSaveState('error')
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
    }
  }
  const saveHome = async (nextHome: HomeEntry[]) => {
    setHome(nextHome)
    setSaveState('saving')
    try {
      await client.createIfNotExists({_id: 'homePage', _type: 'homePage'})
      await client.patch('homePage').set({featuredProjects: nextHome.map(cleanHomeEntry)}).commit({autoGenerateArrayKeys: true})
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  return <ToolShell title="Arbetsyta" subtitle="Redigera till vänster och se placeringen direkt till höger. Ändringar sparas som kladd; webbplatsen ändras först när du publicerar och stagingbygget godkänns.">
    <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
      <Inline space={2} className="esencial-actions">
        <Button mode={surface === 'project' ? 'default' : 'ghost'} text="Projekt" onClick={() => setSurface('project')} />
        <Button mode={surface === 'home' ? 'default' : 'ghost'} text="Startsida" onClick={() => setSurface('home')} />
        <Button mode="ghost" text="Öppna fullständig dokumentvy" disabled={!selected || surface === 'home'} onClick={() => selected && goToDocument(selected._id)} />
      </Inline>
      <Text size={1} muted>{saveState === 'loading' ? 'Laddar…' : saveState === 'saving' ? 'Sparar kladd…' : saveState === 'saved' ? 'Kladd sparat' : 'Kunde inte spara – kontrollera anslutningen'}</Text>
    </Flex>
    <Grid columns={[1, 1, 2]} gap={4} className="esencial-workspace">
      <Card padding={[3, 4]} radius={2} border className="esencial-editor-pane">
        {surface === 'project' ? <ProjectWorkspace projects={projects} selected={selected} selectedId={selectedId} onSelect={setSelectedId} onChange={updateProject} onSaveNow={saveProjectNow} onUpload={upload} /> : <HomeWorkspace projects={projects} entries={home} onChange={saveHome} />}
      </Card>
      <Card padding={3} radius={2} border className="esencial-live-pane">
        <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
          <Text size={1} weight="semibold">Direkt förhandsvisning</Text>
          <Inline space={1}>{(['desktop', 'tablet', 'mobile'] as const).map((size) => <Button key={size} mode={viewport === size ? 'default' : 'ghost'} text={size === 'desktop' ? 'Dator' : size === 'tablet' ? 'Platta' : 'Mobil'} onClick={() => setViewport(size)} />)}</Inline>
        </Flex>
        <Box marginTop={3} className={`esencial-device esencial-device--${viewport}`}>
          {surface === 'project' && selected ? <PreviewCanvas mode="project" projects={[selected]} selected={selected} /> : <PreviewCanvas mode="home" projects={home.map((entry) => entry.project).filter((project): project is Project => Boolean(project))} />}
        </Box>
        <Box marginTop={3}><Text size={1} muted>Detta är den skyddade redigeringsvyn. Kontrollera sedan det riktiga statiska resultatet på staging innan en ändring anses klar.</Text></Box>
        <Card marginTop={4} padding={3} radius={2} border className="esencial-workspace-analytics">
          <WorkspaceAnalytics />
        </Card>
      </Card>
    </Grid>
    <WorkspaceLower projects={projects} home={home} />
  </ToolShell>
}

function WorkspaceAnalytics() {
  const [state, setState] = useState<{loading: boolean; data?: Analytics; error?: string}>({loading: true})
  useEffect(() => { fetchAnalytics(30).then((data) => setState({loading: false, data})).catch((error) => setState({loading: false, error: error.message})) }, [])
  const traffic = state.data?.traffic
  return <Stack space={3}>
    <Flex justify="space-between" align="center"><Text size={1} weight="semibold">Webbplatsens utveckling</Text><Text size={1} muted>Senaste 30 dagar</Text></Flex>
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
    <Heading as="h2" size={3}>Arbete, struktur och projektinformation</Heading>
    <Grid columns={[1, 2, 3]} gap={3} marginTop={3}>
      <QueueCard title="Under arbete" action="Färdigställ innehållet i redigeringsytan ovan." items={queues.drafts} />
      <QueueCard title="Bildkontroll" action="Komplettera huvudbild, alt-text eller rättighetsbekräftelse." items={queues.images} tone="critical" />
      <QueueCard title="SEO-kontroll" action="Lägg till Google-titel och beskrivning." items={queues.seo} tone="critical" />
      <Card padding={4} radius={2} border><Stack space={3}><Heading as="h3" size={2}>Startsida</Heading><Text size={1} muted>{home.length} utvalda projekt. Ordna dem i fliken Startsida ovan.</Text></Stack></Card>
      <Card padding={4} radius={2} border><Stack space={3}><Heading as="h3" size={2}>Struktur</Heading><Text size={1} muted>Avancerad struktur och nya dokument är undantag. Den dagliga redigeringen görs på denna sida.</Text></Stack></Card>
      <Card padding={4} radius={2} border><Stack space={3}><Heading as="h3" size={2}>Projektinformation</Heading><Text size={1} muted>Text, bilder, planritningar, SEO och publicering för det valda projektet redigeras ovan.</Text></Stack></Card>
    </Grid>
  </Box>
}

function ProjectWorkspace({projects, selected, selectedId, onSelect, onChange, onSaveNow, onUpload}: {projects: Project[]; selected?: Project; selectedId: string; onSelect: (id: string) => void; onChange: (patch: Partial<Project>) => void; onSaveNow: (patch: Partial<Project>) => Promise<void>; onUpload: (placement: 'hero' | 'gallery' | 'floorPlan', file?: File) => Promise<void>}) {
  const [draggedGallery, setDraggedGallery] = useState<number | undefined>()
  const [draggedPlan, setDraggedPlan] = useState<number | undefined>()
  const {publish} = useDocumentOperation(selected?._id || 'project-not-selected', 'project')
  if (!selected) return <Stack space={3}><Heading as="h2" size={3}>Inget projekt ännu</Heading><Text>Skapa ett projekt i dokumentvyn för att börja arbeta visuellt.</Text></Stack>
  const publishReady = Boolean(selected.title && selected.summary && selected.seoTitle && selected.seoDescription && selected.heroImage?.assetRef && selected.heroImage.alt && selected.heroImage.credit && selected.heroImage.rightsConfirmed && selected.imageRightsConfirmed)
  const setStatus = (status: string) => {
    if (status === 'published' && !publishReady) return
    onChange({status})
  }
  const setGallery = (galleryImages: ImageData[]) => onSaveNow({galleryImages})
  const setPlans = (floorPlans: NonNullable<Project['floorPlans']>) => onSaveNow({floorPlans})
  const publishToSanity = async () => {
    if (!publishReady || !publish.enabled) return
    await onSaveNow({status: 'published'})
    publish.execute()
  }
  return <Stack space={5}>
    <Box>
      <Label size={1}>Projekt att redigera</Label>
      <Box marginTop={2}><Select value={selectedId} onChange={(event) => onSelect(event.currentTarget.value)}>{projects.map((project) => <option key={project._id} value={project._id}>{project.title || 'Namnlöst projekt'} · {project.language?.toUpperCase() || 'språk saknas'}</option>)}</Select></Box>
    </Box>
    <EditorSection title="Text och projektfakta" hint="Detta syns i rubrik, introduktion och Google-resultat.">
      <Field label="Projektnamn"><TextInput value={selected.title || ''} onChange={(event) => onChange({title: event.currentTarget.value})} /></Field>
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
    <EditorSection title="Publicera till staging" hint="Publicerad betyder att nästa godkända CMS-bygg får använda innehållet. Det ändrar inte den nuvarande live-domänen.">
      <Flex gap={2} align="center"><Checkbox checked={Boolean(selected.imageRightsConfirmed)} onChange={(event) => onChange({imageRightsConfirmed: event.currentTarget.checked})} /><Text size={1}>Jag har bekräftat rättigheterna för alla bilder i projektet.</Text></Flex>
      <Box marginTop={3}><Select value={selected.status || 'draft'} onChange={(event) => setStatus(event.currentTarget.value)}><option value="draft">Under arbete</option><option value="review">Klar att publicera</option><option value="published" disabled={!publishReady}>Publicerad{publishReady ? '' : ' – komplettera fälten ovan först'}</option><option value="archived">Arkiverad</option></Select></Box>
      {!publishReady && <Box marginTop={2}><Text size={1} muted>För publicering krävs rubrik, introduktion, SEO, en komplett huvudbild och bekräftade bildrättigheter. Öppna dokumentvyn för den fullständiga egenkontrollen.</Text></Box>}
      <Box marginTop={3}><Button tone="positive" text="Publicera i Sanity och starta stagingbygge" disabled={!publishReady || !publish.enabled} onClick={() => void publishToSanity()} /></Box>
      <Text size={1} muted>När Sanity-webhooken är ansluten startar detta den säkra CMS-byggprocessen. Ett underkänt bygge lämnar tidigare staging oförändrad.</Text>
    </EditorSection>
  </Stack>
}

function HomeWorkspace({projects, entries, onChange}: {projects: Project[]; entries: HomeEntry[]; onChange: (entries: HomeEntry[]) => Promise<void>}) {
  const [dragged, setDragged] = useState<number | undefined>()
  const featuredIds = new Set(entries.map((entry) => entry.project?._id || entry.projectRef))
  const addProject = (project: Project) => void onChange([...entries, {displayStyle: 'card', projectRef: project._id, project}])
  return <Stack space={5}>
    <EditorSection title="Startsida" hint="Dessa kort visas på startsidan i denna ordning. Bilden kommer alltid från projektets huvudbild.">
      <Stack space={3}>{entries.map((entry, index, all) => entry.project && <Card key={entry._key || entry.project._id} padding={3} border radius={2} draggable onDragStart={() => setDragged(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged !== undefined && dragged !== index) void onChange(moveItem(all, dragged, index)); setDragged(undefined) }}><Flex gap={3} align="center">{img(entry.project.heroImage, entry.project.title)}<Box flex={1}><Text size={1} muted>Position {index + 1}</Text><Heading as="h2" size={2}>{entry.project.title || 'Namnlöst projekt'}</Heading><Box marginTop={2}><Select value={entry.displayStyle || 'card'} onChange={(event) => void onChange(all.map((value, itemIndex) => itemIndex === index ? {...value, displayStyle: event.currentTarget.value} : value))}><option value="card">Normalt kort</option><option value="featured">Huvudprojekt</option></Select></Box></Box><Button tone="critical" mode="ghost" text="Ta bort" onClick={() => void onChange(all.filter((_, itemIndex) => itemIndex !== index))} /></Flex></Card>)}</Stack>
      {!entries.length && <Text size={1} muted>Inga projekt är valda till startsidan ännu.</Text>}
    </EditorSection>
    <EditorSection title="Lägg till projekt" hint="Välj bara publicerade projekt när startsidan ska motsvara staging.">
      <Stack space={2}>{projects.filter((project) => project.status === 'published' && !featuredIds.has(project._id)).map((project) => <Button key={project._id} mode="ghost" text={`Lägg till: ${project.title || 'Namnlöst projekt'} (${project.language?.toUpperCase() || '–'})`} onClick={() => addProject(project)} />)}</Stack>
    </EditorSection>
  </Stack>
}

function EditorSection({title, hint, children}: {title: string; hint: string; children: React.ReactNode}) { return <Card padding={3} radius={2} border><Stack space={3}><Box><Heading as="h2" size={2}>{title}</Heading><Text size={1} muted>{hint}</Text></Box>{children}</Stack></Card> }
function Field({label, children}: {label: string; children: React.ReactNode}) { return <Stack space={2}><Label size={1}>{label}</Label>{children}</Stack> }
function DropZone({label, multiple, onFile}: {label: string; multiple?: boolean; onFile: (file?: File) => void}) { return <label className="esencial-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); [...event.dataTransfer.files].forEach((file) => onFile(file)) }}><strong>{label}</strong><span>Klicka eller dra en bild hit. Bilden sparas som kladd och visas direkt till höger.</span><input type="file" accept="image/*" multiple={multiple} onChange={(event) => { [...(event.currentTarget.files || [])].forEach((file) => onFile(file)); event.currentTarget.value = '' }} /></label> }
function MediaEditor({image, onChange}: {image: ImageData; onChange: (image: ImageData) => void}) { return <Stack space={3}><Card padding={2} radius={2} border>{img(image, 'Huvudbild')}</Card><Grid columns={[1, 2]} gap={3}><Field label="Alt-text"><TextInput value={image.alt || ''} onChange={(event) => onChange({...image, alt: event.currentTarget.value})} /></Field><Field label="Fotograf / kredit"><TextInput value={image.credit || ''} onChange={(event) => onChange({...image, credit: event.currentTarget.value})} /></Field></Grid><Flex gap={2} align="center"><Checkbox checked={Boolean(image.rightsConfirmed)} onChange={(event) => onChange({...image, rightsConfirmed: event.currentTarget.checked})} /><Text size={1}>Rättigheter bekräftade</Text></Flex></Stack> }
function MediaCard({image, label, draggable, onDragStart, onDrop, onChange, onRemove}: {image: ImageData; label: string; draggable?: boolean; onDragStart?: () => void; onDrop?: () => void; onChange: (image: ImageData) => void; onRemove: () => void}) { return <Card padding={3} radius={2} border draggable={draggable} onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><Stack space={3}><Flex justify="space-between" align="center"><Text size={1} weight="semibold">↕ {label}</Text><Button tone="critical" mode="ghost" text="Ta bort" onClick={onRemove} /></Flex>{img(image, label)}<MediaEditor image={image} onChange={onChange} /><Field label="Bildtext (valfri)"><TextInput value={image.caption || ''} onChange={(event) => onChange({...image, caption: event.currentTarget.value})} /></Field><Flex gap={2} align="center"><Checkbox checked={Boolean(image.hideFromWebsite)} onChange={(event) => onChange({...image, hideFromWebsite: event.currentTarget.checked})} /><Text size={1}>Behåll i CMS men visa inte publikt</Text></Flex></Stack></Card> }
function FloorPlanCard({plan, label, draggable, onDragStart, onDrop, onChange, onRemove}: {plan: NonNullable<Project['floorPlans']>[number]; label: string; draggable?: boolean; onDragStart?: () => void; onDrop?: () => void; onChange: (plan: NonNullable<Project['floorPlans']>[number]) => void; onRemove: () => void}) { return <Card padding={3} radius={2} border draggable={draggable} onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><Stack space={3}><Flex justify="space-between" align="center"><Text size={1} weight="semibold">↕ {label}</Text><Button tone="critical" mode="ghost" text="Ta bort" onClick={onRemove} /></Flex>{img(plan.image, label)}<Grid columns={[1, 2]} gap={3}><Field label="Namn"><TextInput value={plan.name || ''} onChange={(event) => onChange({...plan, name: event.currentTarget.value})} /></Field><Field label="Typ"><Select value={plan.planType || 'planlosning'} onChange={(event) => onChange({...plan, planType: event.currentTarget.value})}><option value="planlosning">Planlösning</option><option value="situationsplan">Situationsplan</option><option value="sektion">Sektion</option><option value="fasad">Fasad</option><option value="annat">Annat</option></Select></Field></Grid><Field label="Våning / område"><TextInput value={plan.area || ''} onChange={(event) => onChange({...plan, area: event.currentTarget.value})} /></Field>{plan.image && <MediaEditor image={plan.image} onChange={(image) => onChange({...plan, image})} />}</Stack></Card> }
function moveItem<T>(items: T[], from: number, to: number) { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next }
function cleanImage(image: ImageData) { const result: Record<string, unknown> = {_type: image._type || 'image'}; if (image._key) result._key = image._key; if (image.assetRef) result.asset = {_type: 'reference', _ref: image.assetRef}; for (const key of ['alt', 'credit', 'caption', 'rightsConfirmed', 'hideFromWebsite'] as const) if (image[key] !== undefined) result[key] = image[key]; return result }
function cleanFloorPlan(plan: NonNullable<Project['floorPlans']>[number]) { const result: Record<string, unknown> = {_type: 'floorPlan', name: plan.name, planType: plan.planType, area: plan.area, description: plan.description}; if (plan._key) result._key = plan._key; if (plan.image) result.image = cleanImage(plan.image); return result }
function cleanHomeEntry(entry: HomeEntry) { const result: Record<string, unknown> = {_type: 'object', displayStyle: entry.displayStyle || 'card', project: {_type: 'reference', _ref: entry.project?._id || entry.projectRef}}; if (entry._key) result._key = entry._key; return result }
function documentPatch(patch: Partial<Project>) { const result: Record<string, unknown> = {...patch}; if (patch.heroImage) result.heroImage = cleanImage(patch.heroImage); if (patch.galleryImages) result.galleryImages = patch.galleryImages.map(cleanImage); if (patch.floorPlans) result.floorPlans = patch.floorPlans.map(cleanFloorPlan); return result }

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

function QueueCard({title, action, items, tone}: {title: string; action: string; items: Project[]; tone?: 'critical'}) { return <Card padding={4} radius={2} border tone={tone}><Stack space={3}><Flex justify="space-between"><Heading as="h2" size={2}>{title}</Heading><Text size={3} weight="bold">{items.length}</Text></Flex><Text size={1} muted>{action}</Text>{items.slice(0, 4).map((project) => <Button key={project._id} mode="bleed" text={project.title || 'Namnlöst projekt'} onClick={() => goToDocument(project._id)} />)}{!items.length && <Text size={1} muted>Inget behöver åtgärdas.</Text>}</Stack></Card> }

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

function EmptyAnalytics({message}: {message?: string}) { return <Card marginTop={5} padding={5} radius={2} border><Stack space={3}><Text size={4}>↗</Text><Heading as="h2" size={3}>Statistik väntar på anslutning</Heading><Text>{message || 'Anslut en godkänd trafikkälla och Google Search Console för att se verkliga siffror.'}</Text><Text size={1} muted>Inga exempel- eller uppskattade siffror visas. Se docs/ANALYTICS_SETUP.md för externa steg.</Text></Stack></Card> }
function AnalyticsError({message}: {message: string}) { return <Card marginTop={5} padding={5} radius={2} border tone="critical"><Stack space={3}><Heading as="h2" size={3}>Statistiken kunde inte hämtas</Heading><Text>{message}</Text><Text size={1} muted>Inga tidigare, uppskattade eller exempelbaserade värden visas när källan ger fel.</Text></Stack></Card> }
function change(current?: number, previous?: number) { if (current === undefined || previous === undefined || previous === 0) return undefined; const value = ((current - previous) / previous) * 100; return `${value >= 0 ? '+' : ''}${value.toFixed(0)}% mot föregående period` }
function AnalyticsDashboard({data}: {data: Analytics}) { const metrics = [{label: 'Besökare', value: data.traffic?.visitors, change: change(data.traffic?.visitors, data.traffic?.previous?.visitors)}, {label: 'Sidvisningar', value: data.traffic?.pageviews, change: change(data.traffic?.pageviews, data.traffic?.previous?.pageviews)}, {label: 'Återkommande besökare', value: 'Inte tillgängligt med den valda integritetsnivån'}, {label: 'Organiska klick', value: data.search?.clicks, change: change(data.search?.clicks, data.search?.previous?.clicks)}, {label: 'Visningar i Google', value: data.search?.impressions, change: change(data.search?.impressions, data.search?.previous?.impressions)}, {label: 'CTR', value: data.search?.ctr !== undefined ? `${(data.search.ctr * 100).toFixed(1)}%` : undefined}, {label: 'Genomsnittlig position', value: data.search?.position?.toFixed(1)}]; return <Stack space={5} marginTop={5}>{data.state === 'empty' && <Text size={1} muted>Källorna är anslutna men har ingen data för perioden.</Text>}{(data.limitations || []).map((limitation) => <Text key={limitation} size={1} muted>{limitation}</Text>)}<Grid columns={[2, 3, 4]} gap={3}>{metrics.map((metric) => <Card key={metric.label} padding={3} radius={2} border><Text size={1} muted>{metric.label}</Text><Heading as="p" size={3}>{metric.value ?? '–'}</Heading>{metric.change && <Text size={1} muted>{metric.change}</Text>}</Card>)}</Grid><Grid columns={[1, 2]} gap={4}><DataList title="Viktigaste sidor" items={[...(data.traffic?.topPages || []), ...(data.search?.topPages || [])].slice(0, 10)} /><DataList title="Topp 10 sökfraser" items={data.search?.queries || []} /></Grid><Card padding={4} radius={2} border><Heading as="h2" size={2}>SEO-observationer</Heading><Stack marginTop={3} space={2}>{(data.observations || []).map((observation) => <Text key={observation}>• {observation}</Text>)}</Stack></Card></Stack> }
function DataList({title, items}: {title: string; items: Array<{label: string; value: number}>}) { return <Card padding={4} radius={2} border><Heading as="h2" size={2}>{title}</Heading><Stack marginTop={3} space={2}>{items.length ? items.map((item) => <Flex key={item.label} justify="space-between"><Text size={1}>{item.label}</Text><Text size={1} weight="semibold">{item.value}</Text></Flex>) : <Text size={1} muted>Ingen data för perioden.</Text>}</Stack></Card> }

function ToolShell({title, subtitle, children}: {title: string; subtitle: string; children: React.ReactNode}) { return <Container width={6} padding={[3, 4, 5]}><Stack space={4}><Box><Heading as="h1" size={4}>{title}</Heading><Text muted>{subtitle}</Text></Box>{children}</Stack></Container> }
