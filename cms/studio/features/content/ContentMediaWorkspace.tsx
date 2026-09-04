import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Box, Button, Card, Flex, Heading, Inline, Select, Stack, Text} from '@sanity/ui'
import {useClient} from 'sanity'
import {
  CONTENT_MEDIA_SECTION_ID,
  CONTENT_MEDIA_SECTION_SUMMARY,
  MEDIA_REMOVAL_WARNING,
  canonicalDocumentId,
  projectFieldIntent,
} from './contentWorkspaceContract.mjs'
import {
  removeMediaReferenceFromDraft,
  restoreMediaReferenceToDraft,
  type MediaRemovalTarget,
  type MediaUndo,
} from './draftMedia'
import {patchProjectDraftFields} from './draftProject'
import {
  createProjectLanguagePair,
  synchronizeProjectPairSharedFields,
} from './createProjectLanguagePair'
import {
  ProjectContentEditor,
  type ProjectContentPatch,
  type ProjectEditableSnapshot,
} from './ProjectContentEditor'
import {ProjectCategoryEditor} from './ProjectCategoryEditor'
import './contentMediaWorkspace.css'

const apiVersion = '2025-02-19'

type AssetPreview = {
  _id?: string
  url?: string
  originalFilename?: string
  metadata?: {dimensions?: {width?: number; height?: number}}
}

type ImageValue = {
  _key?: string
  alt?: string
  credit?: string
  rightsConfirmed?: boolean
  caption?: string
  hideFromWebsite?: boolean
  asset?: {_ref?: string}
}

type FloorPlanValue = {
  _key?: string
  name?: string
  planType?: string
  area?: string
  description?: string
  image?: ImageValue
}

type PresentationViewValue = {_key?: string; left?: ImageValue; right?: ImageValue}

type LegacyImageValue = {_key?: string; url?: string; alt?: string; credit?: string}

type PreviewEntry = {_key?: string; asset?: AssetPreview}
type ProjectContent = ProjectEditableSnapshot & {
  _originalId?: string
  imageRightsConfirmed?: boolean
  heroImage?: ImageValue
  heroImagePreview?: AssetPreview
  galleryImages?: ImageValue[]
  galleryPreviews?: PreviewEntry[]
  cardImages?: ImageValue[]
  cardImagePreviews?: PreviewEntry[]
  slideshowImages?: ImageValue[]
  slideshowPreviews?: PreviewEntry[]
  presentationViews?: PresentationViewValue[]
  floorPlans?: FloorPlanValue[]
  floorPlanPreviews?: PreviewEntry[]
  images?: ImageValue[]
  previousImagePreviews?: PreviewEntry[]
  legacyImages?: LegacyImageValue[]
  cardBackgroundPreset?: string
}

export type ContentMediaStatus = {
  state: 'loading' | 'saving' | 'saved' | 'error'
  label: string
}

type PendingRemoval = {
  target: MediaRemovalTarget
  label: string
}

type UndoState = MediaUndo & {label: string}

type Props = {
  onStatusChange?: (status: ContentMediaStatus) => void
}

const projectsQuery = `*[_type == "project"] | order(title asc, language asc) {
  _id, _originalId, _rev, title, "slug": slug.current, language, translationKey,
  translationStatus, location, year, typology, client, architect, projectManager, collaborators,
  landscape, photography, artwork, grossArea, team, services, status, summary,
  seoTitle, seoDescription, reviewNotes, publishChecklist, imageRightsConfirmed, cardBackgroundPreset,
  heroImage,
  "heroImagePreview": heroImage.asset->{_id, url, originalFilename, metadata{dimensions}},
  galleryImages,
  "galleryPreviews": galleryImages[]{_key, "asset": asset->{_id, url, originalFilename, metadata{dimensions}}},
  cardImages,
  "cardImagePreviews": cardImages[]{_key, "asset": asset->{_id, url, originalFilename, metadata{dimensions}}},
  slideshowImages,
  "slideshowPreviews": slideshowImages[]{_key, "asset": asset->{_id, url, originalFilename, metadata{dimensions}}},
  presentationViews,
  floorPlans,
  "floorPlanPreviews": floorPlans[]{_key, "asset": image.asset->{_id, url, originalFilename, metadata{dimensions}}},
  images,
  "previousImagePreviews": images[]{_key, "asset": asset->{_id, url, originalFilename, metadata{dimensions}}},
  legacyImages
}`

export function ContentMediaWorkspace({onStatusChange}: Props) {
  const baseClient = useClient({apiVersion})
  const client = useMemo(
    () => baseClient.withConfig({perspective: 'drafts', useCdn: false}),
    [baseClient],
  )
  const [projects, setProjects] = useState<ProjectContent[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [saveState, setSaveState] = useState<ContentMediaStatus['state']>('loading')
  const [statusLabel, setStatusLabel] = useState('Laddar projektinnehåll och media…')
  const [error, setError] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval>()
  const [undo, setUndo] = useState<UndoState>()
  const [contentDirty, setContentDirty] = useState(false)
  const [categoryDirty, setCategoryDirty] = useState(false)
  const statusCallback = useRef(onStatusChange)

  useEffect(() => {
    statusCallback.current = onStatusChange
  }, [onStatusChange])

  useEffect(() => {
    statusCallback.current?.({state: saveState, label: statusLabel})
  }, [saveState, statusLabel])

  const load = useCallback(
    async (preferredId?: string) => {
      setSaveState('loading')
      setStatusLabel('Laddar projektinnehåll och media…')
      setError('')
      try {
        let nextProjects = await client.fetch<ProjectContent[]>(projectsQuery)
        const requested = canonicalDocumentId(preferredId || selectedId)
        const selectedForSync = nextProjects.find(
          (project) => canonicalDocumentId(project._id) === requested,
        )
        if (
          selectedForSync &&
          (await synchronizeProjectPairSharedFields(client, selectedForSync._id))
        ) {
          nextProjects = await client.fetch<ProjectContent[]>(projectsQuery)
        }
        setProjects(nextProjects)
        setSelectedId((current) => {
          const nextRequested = canonicalDocumentId(preferredId || current)
          const matching = nextProjects.find(
            (project) => canonicalDocumentId(project._id) === nextRequested,
          )
          return canonicalDocumentId(matching?._id || nextProjects[0]?._id || '')
        })
        setSaveState('saved')
        setStatusLabel('Projektets senaste kladd är inläst')
      } catch {
        setSaveState('error')
        setStatusLabel('Projektinnehållet kunde inte läsas')
        setError(
          'Projektets kladd kunde inte läsas. Ingen publicerad version ändrades. Kontrollera anslutningen och välj Läs om kladdar.',
        )
      }
    },
    [client],
  )

  useEffect(() => {
    void load()
  }, [load])

  const selectedProject = projects.find(
    (project) => canonicalDocumentId(project._id) === selectedId,
  )
  const interactionLocked =
    saveState === 'loading' ||
    saveState === 'saving' ||
    contentDirty ||
    categoryDirty ||
    Boolean(pendingRemoval) ||
    Boolean(undo)

  const openField = (path: string) => {
    if (!selectedProject || interactionLocked) return
    window.location.hash = projectFieldIntent(selectedProject._id, path)
  }

  const saveProjectContent = async (patch: ProjectContentPatch) => {
    if (!selectedProject) return
    setSaveState('saving')
    setStatusLabel('Sparar alla projektfält till kladden…')
    setError('')
    try {
      await patchProjectDraftFields(client, selectedProject._id, {...patch})
      await synchronizeProjectPairSharedFields(client, selectedProject._id)
      setContentDirty(false)
      await load(selectedProject._id)
      setStatusLabel('Alla projektfält sparades till kladden')
    } catch (caught) {
      setSaveState('error')
      setStatusLabel('Projektfälten kunde inte sparas')
      setError(
        `${caught instanceof Error ? caught.message : 'Sparningen misslyckades.'} Ingen publicerad version ändrades. De osparade fälten finns kvar i formuläret; försök igen eller återställ.`,
      )
      throw caught
    }
  }

  const createProjectPair = async () => {
    if (interactionLocked) return
    setSaveState('saving')
    setStatusLabel('Skapar svenskt och engelskt projektpar som kladd…')
    setError('')
    try {
      const pair = await createProjectLanguagePair(client)
      await load(pair.svId)
      setStatusLabel('Ett svenskt och engelskt projektpar skapades som kladd')
    } catch (caught) {
      setSaveState('error')
      setStatusLabel('Projektparet kunde inte skapas')
      setError(
        `${caught instanceof Error ? caught.message : 'Sparningen misslyckades.'} Inget publicerat projekt ändrades. Försök igen när anslutningen är tillbaka.`,
      )
    }
  }

  const confirmRemoval = async () => {
    if (!selectedProject || !pendingRemoval) return
    setSaveState('saving')
    setStatusLabel('Tar bort mediareferensen från kladden…')
    setError('')
    try {
      const result = await removeMediaReferenceFromDraft(
        client,
        selectedProject._id,
        pendingRemoval.target,
      )
      setUndo({...result, label: pendingRemoval.label})
      setPendingRemoval(undefined)
      await load(selectedProject._id)
      setStatusLabel('Mediareferensen togs bort från kladden; återställning är tillgänglig')
    } catch (caught) {
      setSaveState('error')
      setStatusLabel('Mediareferensen kunde inte tas bort')
      setError(
        `${caught instanceof Error ? caught.message : 'Borttagningen misslyckades.'} Ingen publicerad version eller bildasset ändrades. Försök igen eller avbryt.`,
      )
    }
  }

  const restoreRemoval = async () => {
    if (!undo || !selectedProject) return
    setSaveState('saving')
    setStatusLabel('Återställer mediareferensen i kladden…')
    setError('')
    try {
      await restoreMediaReferenceToDraft(client, undo)
      setUndo(undefined)
      await load(selectedProject._id)
      setStatusLabel('Mediareferensen återställdes i kladden')
    } catch (caught) {
      setSaveState('error')
      setStatusLabel('Automatisk återställning stoppades')
      setError(
        `${caught instanceof Error ? caught.message : 'Återställningen misslyckades.'} Ingen publicerad version ändrades.`,
      )
    }
  }

  return (
    <Stack space={4} className="esencial-content-media">
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Box>
          <Heading as="h3" size={2}>
            Projektinnehåll och media
          </Heading>
          <Text as="p" size={1} muted>
            Arbetsytan läser Sanitys kladdperspektiv utan CDN. Fältredigering, uppladdning, assetval
            och publicering sker i Sanitys inbyggda dokumentformulär med befintlig schemavalidering.
          </Text>
        </Box>
        <Button
          mode="ghost"
          text="Läs om kladdar"
          disabled={interactionLocked && saveState !== 'error'}
          onClick={() => void load(selectedProject?._id)}
        />
      </Flex>

      <Card padding={3} radius={2} border className="esencial-content-media__status">
        <Text
          size={1}
          role={saveState === 'error' ? 'alert' : 'status'}
          aria-live={saveState === 'error' ? 'assertive' : 'polite'}
        >
          {statusLabel}
        </Text>
      </Card>

      {error && (
        <Card padding={3} radius={2} border tone="critical" role="alert">
          <Stack space={3}>
            <Text size={1}>{error}</Text>
            <Box>
              <Button
                mode="ghost"
                text="Läs om kladdar och försök återhämta vyn"
                onClick={() => void load(selectedProject?._id)}
              />
            </Box>
          </Stack>
        </Card>
      )}

      {saveState !== 'loading' && (
        <ProjectPicker
          disabled={interactionLocked}
          projects={projects}
          selectedId={selectedId}
          onCreate={() => void createProjectPair()}
          onSelect={(id) => {
            void load(id)
            setError('')
          }}
        />
      )}

      {pendingRemoval && (
        <RemovalConfirmation
          label={pendingRemoval.label}
          busy={saveState === 'saving'}
          onCancel={() => {
            setPendingRemoval(undefined)
            setError('')
            setSaveState('saved')
            setStatusLabel('Borttagningen avbröts; kladden är oförändrad')
          }}
          onConfirm={() => void confirmRemoval()}
        />
      )}

      {undo && (
        <Card
          padding={4}
          radius={2}
          border
          tone="caution"
          role="status"
          className="esencial-content-media__recovery"
        >
          <Stack space={3}>
            <Heading as="h4" size={1}>
              Referensen till {undo.label} är borttagen från kladden
            </Heading>
            <Text size={1}>
              Hela referensen och dess alt-text, kredit, rättighetsstatus och övriga metadata kan
              återställas nu. Bildasseten och den publicerade versionen är oförändrade.
            </Text>
            <Inline space={2} className="esencial-content-media__actions">
              <Button
                text="Ångra och återställ hela referensen i kladden"
                disabled={saveState === 'saving'}
                onClick={() => void restoreRemoval()}
              />
              <Button
                mode="ghost"
                tone="critical"
                text="Behåll borttagningen i kladden (asseten raderas inte)"
                disabled={saveState === 'saving'}
                onClick={() => {
                  setUndo(undefined)
                  setSaveState('saved')
                  setStatusLabel('Borttagningen behålls i kladden; asseten finns kvar')
                }}
              />
            </Inline>
          </Stack>
        </Card>
      )}

      {selectedProject && (
        <>
          <ProjectContentEditor
            project={selectedProject}
            saving={saveState === 'saving'}
            onDirtyChange={setContentDirty}
            onSave={saveProjectContent}
            onOpenAdvanced={openField}
          />
          <ProjectCategoryEditor
            currentProjectId={selectedProject._id}
            disabled={
              contentDirty || Boolean(pendingRemoval) || Boolean(undo) || saveState === 'saving'
            }
            onDirtyChange={setCategoryDirty}
          />
          <MediaReview
            project={selectedProject}
            disabled={interactionLocked || selectedProject.language === 'en'}
            onOpenField={openField}
            onRequestRemoval={(target, label) => {
              setPendingRemoval({target, label})
              setStatusLabel('En borttagning väntar på bekräftelse; kladden är ännu oförändrad')
            }}
          />
        </>
      )}
    </Stack>
  )
}

function ProjectPicker({
  disabled,
  projects,
  selectedId,
  onCreate,
  onSelect,
}: {
  disabled: boolean
  projects: ProjectContent[]
  selectedId: string
  onCreate: () => void
  onSelect: (id: string) => void
}) {
  return (
    <section
      aria-labelledby="esencial-project-picker-heading"
      className="esencial-content-media__picker"
    >
      <Stack space={3}>
        <Flex
          align={['flex-start', 'center']}
          direction={['column', 'row']}
          gap={3}
          justify="space-between"
        >
          <Box>
            <Heading as="h3" id="esencial-project-picker-heading" size={2}>
              Välj projekt
            </Heading>
            <Text as="p" size={1} muted>
              Välj den språkversion du vill redigera. Text skrivs separat på svenska och English.
              Bilder, webbadress och kortbakgrund hålls gemensamma för språkparet.
            </Text>
          </Box>
          <Button text="Skapa nytt projekt" disabled={disabled} onClick={onCreate} />
        </Flex>
        <div className="esencial-content-media__project-select">
          <label htmlFor="esencial-project-picker-select">
            <Text size={1} weight="semibold">
              Projekt att redigera
            </Text>
          </label>
          <Select
            id="esencial-project-picker-select"
            aria-describedby="esencial-project-picker-help"
            value={selectedId}
            disabled={disabled}
            onChange={(event) => onSelect(event.currentTarget.value)}
          >
            {projects.map((project) => {
              const id = canonicalDocumentId(project._id)
              return (
                <option key={`${id}-${project.language || 'unknown'}`} value={id}>
                  {project.title || 'Namnlöst projekt'} ·{' '}
                  {(project.language || 'språk saknas').toUpperCase()} ·{' '}
                  {project.status === 'published' ? 'Publicerat' : 'Kladd'}
                </option>
              )
            })}
          </Select>
          <Text as="p" id="esencial-project-picker-help" size={1} muted>
            {projects.length
              ? 'Byt projekt här. Valet spärras bara när du har osparade ändringar eller en bildåtgärd väntar på bekräftelse.'
              : 'Inga projekt finns ännu. Skapa ett nytt språkpar som kladd för att börja.'}
          </Text>
        </div>
      </Stack>
    </section>
  )
}

function RemovalConfirmation({
  label,
  busy,
  onCancel,
  onConfirm,
}: {
  label: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Card
      padding={4}
      radius={2}
      border
      tone="critical"
      role="alertdialog"
      aria-labelledby="content-media-remove-heading"
      aria-describedby="content-media-remove-description"
      className="esencial-content-media__confirmation"
    >
      <Stack space={3}>
        <Heading as="h4" id="content-media-remove-heading" size={1}>
          Ta bort referensen till {label} från kladden?
        </Heading>
        <Text id="content-media-remove-description" size={1}>
          {MEDIA_REMOVAL_WARNING} Du får därefter ett uttryckligt val att återställa hela referensen
          med bevarad alt-text, kredit, rättighetsstatus och övriga metadata.
        </Text>
        <Inline space={2} className="esencial-content-media__actions">
          <Button
            tone="critical"
            text="Ja, ta bort referensen från kladden"
            disabled={busy}
            onClick={onConfirm}
          />
          <Button
            mode="ghost"
            text="Avbryt – behåll referensen"
            disabled={busy}
            onClick={onCancel}
          />
        </Inline>
      </Stack>
    </Card>
  )
}

function MediaReview({
  project,
  disabled,
  onOpenField,
  onRequestRemoval,
}: {
  project: ProjectContent
  disabled: boolean
  onOpenField: (path: string) => void
  onRequestRemoval: (target: MediaRemovalTarget, label: string) => void
}) {
  const galleryPreviews = previewMap(project.galleryPreviews)
  const cardImagePreviews = previewMap(project.cardImagePreviews)
  const slideshowPreviews = previewMap(project.slideshowPreviews)
  const floorPlanPreviews = previewMap(project.floorPlanPreviews)
  const previousImagePreviews = previewMap(project.previousImagePreviews)
  const usesCardImageModel = Boolean(project.cardImages?.length || project.slideshowImages?.length)
  const cardImages = usesCardImageModel
    ? project.cardImages || []
    : [project.heroImage, ...(project.galleryImages || []).slice(0, 1)].filter(
        (image): image is ImageValue => Boolean(image),
      )
  const slideshowImages = usesCardImageModel
    ? project.slideshowImages || []
    : (project.galleryImages || []).slice(1)
  const previewForCardImage = (image: ImageValue, index: number) =>
    usesCardImageModel
      ? cardImagePreviews.get(image._key || String(index))
      : index === 0
        ? project.heroImagePreview
        : galleryPreviews.get(image._key || '0')
  const previewForSlideshowImage = (image: ImageValue, index: number) =>
    usesCardImageModel
      ? slideshowPreviews.get(image._key || String(index))
      : galleryPreviews.get(image._key || String(index + 1))
  return (
    <Card padding={[3, 4]} radius={2} border>
      <Stack space={5}>
        <div className="esencial-content-media__heading-block">
          <Heading as="h3" size={2}>
            Bilder i projektet
          </Heading>
          <Text as="p" size={1} muted>
            Kortbild 1 och 2 används i projektets kort på startsidan och blir de två första bilderna
            i bildspelet. Övriga bilder visas efter dem. Borttagning här lossar bara kladdens
            referens och raderar aldrig originalasseten.
          </Text>
          {project.language === 'en' && (
            <Text as="p" size={1} muted>
              Kortbilder och bildspelsbilder är gemensamma. Ändra dem i den svenska språkversionen;
              nästa kladdladdning synkar dem säkert till English.
            </Text>
          )}
        </div>

        <MediaSection
          heading="Kortbilder"
          actionText="Redigera Kortbild 1 och 2 via Sanitys bildväljare"
          actionLabel="Öppna Sanitys bildfält för Kortbild 1 och 2, assetval eller uppladdning"
          disabled={disabled}
          onOpen={() => onOpenField('cardImages')}
        >
          {[0, 1].map((index) => {
            const image = cardImages[index]
            if (!image)
              return <EmptyMedia key={index} text={`Kortbild ${index + 1} saknas i kladden.`} />
            return (
              <MediaCard
                key={image._key || index}
                title={`Kortbild ${index + 1}`}
                image={image}
                asset={previewForCardImage(image, index)}
                rightsFallback={project.imageRightsConfirmed}
                disabled={disabled}
                onReplace={() => onOpenField('cardImages')}
                onRemove={() =>
                  onRequestRemoval(
                    usesCardImageModel
                      ? {kind: 'cardImage', key: image._key, index}
                      : index === 0
                        ? {kind: 'hero'}
                        : {kind: 'gallery', key: image._key, index: 0},
                    `Kortbild ${index + 1}`,
                  )
                }
              />
            )
          })}
        </MediaSection>

        <MediaSection
          heading="Övriga bilder i bildspelet"
          actionText="Lägg till bild via Sanitys bildväljare"
          actionLabel="Öppna Sanitys bildfält för fler bildspelsbilder, assetval eller uppladdning"
          disabled={disabled}
          onOpen={() => onOpenField('slideshowImages')}
        >
          <div className="esencial-content-media__media-grid">
            {slideshowImages.map((image, index) => {
              return (
                <MediaCard
                  key={image._key || index}
                  title={`Bildspelsbild ${index + 1}`}
                  image={image}
                  asset={previewForSlideshowImage(image, index)}
                  rightsFallback={project.imageRightsConfirmed}
                  disabled={disabled}
                  onReplace={() => onOpenField('slideshowImages')}
                  onRemove={() =>
                    onRequestRemoval(
                      usesCardImageModel
                        ? {kind: 'slideshowImage', key: image._key, index}
                        : {kind: 'gallery', key: image._key, index: index + 1},
                      `bildspelsbild ${index + 1}`,
                    )
                  }
                />
              )
            })}
          </div>
          {!slideshowImages.length && <EmptyMedia text="Inga övriga bildspelsbilder finns ännu." />}
        </MediaSection>

        <MediaSection
          heading="Bildspelsvyer – vänster/höger"
          actionText="Redigera vyernas vänster- och högermedia"
          actionLabel="Öppna Sanitys bildspelsvyer för ordning, vänster- och högermedia"
          disabled={disabled}
          onOpen={() => onOpenField('presentationViews')}
        >
          <Text size={1} muted>
            Varje rad är en publicerad vy: vänster och höger behåller sin plats och ordning. Ritningar
            som ingår i samma vy ska ligga här, inte flyttas till Planritningar.
          </Text>
          <div className="esencial-content-media__media-grid">
            {(project.presentationViews || []).map((view, index) => (
              <Card key={view._key || index} padding={3} radius={2} border>
                <Text size={1} weight="semibold">Vy {index + 1}</Text>
                <Text size={1} muted>
                  Vänster: {view.left?.alt || 'tom'} · Höger: {view.right?.alt || 'tom'}
                </Text>
              </Card>
            ))}
          </div>
          {!project.presentationViews?.length && <EmptyMedia text="Inga vänster/höger-vyer finns ännu." />}
        </MediaSection>

        <MediaSection
          heading="Planritningar"
          actionText="Lägg till planritning via Sanitys bildväljare"
          actionLabel="Öppna Sanitys inbyggda planritningsfält för assetval eller uppladdning"
          disabled={disabled}
          onOpen={() => onOpenField('floorPlans')}
        >
          <div className="esencial-content-media__media-grid">
            {(project.floorPlans || []).map((plan, index) => (
              <MediaCard
                key={plan._key || index}
                title={plan.name || `Planritning ${index + 1}`}
                subtitle={[plan.planType, plan.area, plan.description].filter(Boolean).join(' · ')}
                image={plan.image || {}}
                asset={floorPlanPreviews.get(plan._key || String(index))}
                rightsFallback={project.imageRightsConfirmed}
                disabled={disabled}
                onReplace={() => onOpenField('floorPlans')}
                onRemove={() =>
                  onRequestRemoval(
                    {kind: 'floorPlan', key: plan._key, index},
                    `planritningen ${plan.name || index + 1}`,
                  )
                }
              />
            ))}
          </div>
          {!project.floorPlans?.length && <EmptyMedia text="Kladden har inga planritningar." />}
        </MediaSection>

        {(project.images?.length || project.legacyImages?.length) && (
          <MediaSection
            heading="Tidigare media"
            actionText="Öppna tidigare media i Sanitys dokumentformulär"
            actionLabel="Öppna tidigare media och dess befintliga metadata i Sanitys dokumentformulär"
            disabled={disabled}
            onOpen={() => onOpenField(project.images?.length ? 'images' : 'legacyImages')}
          >
            <Text size={1} muted>
              Äldre Sanity-bilder kan lossas från kladden. Listan från den tidigare webbplatsen är
              skrivskyddad och visas endast för migreringsgranskning.
            </Text>
            <div className="esencial-content-media__media-grid">
              {(project.images || []).map((image, index) => (
                <MediaCard
                  key={image._key || index}
                  title={`Tidigare Sanity-bild ${index + 1}`}
                  image={image}
                  asset={previousImagePreviews.get(image._key || String(index))}
                  rightsFallback={project.imageRightsConfirmed}
                  disabled={disabled}
                  onReplace={() => onOpenField('images')}
                  onRemove={() =>
                    onRequestRemoval(
                      {kind: 'previousImage', key: image._key, index},
                      `tidigare Sanity-bild ${index + 1}`,
                    )
                  }
                />
              ))}
              {(project.legacyImages || []).map((image, index) => (
                <LegacyMediaCard
                  key={image._key || image.url || index}
                  title={`Migreringsreferens ${index + 1}`}
                  image={image}
                  rightsConfirmed={project.imageRightsConfirmed}
                  disabled={disabled}
                  onReplace={() => onOpenField('legacyImages')}
                  onRemove={() =>
                    onRequestRemoval(
                      {kind: 'legacyImage', key: image._key, index},
                      `migreringsreferens ${index + 1}`,
                    )
                  }
                />
              ))}
            </div>
          </MediaSection>
        )}
      </Stack>
    </Card>
  )
}

function previewMap(entries?: PreviewEntry[]) {
  const result = new Map<string, AssetPreview>()
  for (const [index, entry] of (entries || []).entries()) {
    if (entry.asset) result.set(entry._key || String(index), entry.asset)
  }
  return result
}

function MediaSection({
  heading,
  actionText,
  actionLabel,
  disabled,
  onOpen,
  children,
}: {
  heading: string
  actionText: string
  actionLabel: string
  disabled: boolean
  onOpen: () => void
  children: React.ReactNode
}) {
  return (
    <section className="esencial-content-media__media-section">
      <Stack space={3}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <Heading as="h4" size={1}>
            {heading}
          </Heading>
          <Button
            mode="ghost"
            text={actionText}
            aria-label={actionLabel}
            disabled={disabled}
            onClick={onOpen}
          />
        </Flex>
        {children}
      </Stack>
    </section>
  )
}

function MediaCard({
  title,
  subtitle,
  image,
  asset,
  rightsFallback,
  disabled,
  onReplace,
  onRemove,
}: {
  title: string
  subtitle?: string
  image: ImageValue
  asset?: AssetPreview
  rightsFallback?: boolean
  disabled: boolean
  onReplace: () => void
  onRemove: () => void
}) {
  const rightsConfirmed = image.rightsConfirmed === true || rightsFallback === true
  return (
    <Card padding={3} radius={2} border className="esencial-content-media__media-card">
      <Stack space={3}>
        {asset?.url ? (
          <div className="esencial-content-media__preview-frame">
            <img
              src={asset.url}
              alt={image.alt?.trim() || 'Förhandsvisning: alt-text saknas i projektkladden'}
              loading="lazy"
            />
          </div>
        ) : (
          <div
            className="esencial-content-media__preview-missing"
            role="img"
            aria-label="Bildförhandsvisning saknas"
          >
            Förhandsvisning saknas
          </div>
        )}
        <Box>
          <Text weight="semibold">{title}</Text>
          {subtitle && <Text size={1}>{subtitle}</Text>}
          {image.caption && <Text size={1}>Bildtext: {image.caption}</Text>}
        </Box>
        <dl className="esencial-content-media__metadata">
          <Metadata
            label="Alt-text"
            value={image.alt}
            missing="Saknas – validering blockerar publicering"
          />
          <Metadata
            label="Kredit"
            value={image.credit}
            missing="Saknas – validering blockerar publicering"
          />
          <Metadata
            label="Rättigheter"
            value={
              rightsConfirmed ? 'Bekräftade i kladden' : 'Inte bekräftade – publicering blockeras'
            }
          />
          <Metadata
            label="Asset"
            value={asset?.originalFilename || image.asset?._ref}
            missing="Referens saknas"
          />
          {asset?.metadata?.dimensions && (
            <Metadata
              label="Dimensioner"
              value={`${asset.metadata.dimensions.width || '?'} × ${asset.metadata.dimensions.height || '?'} px`}
            />
          )}
          {image.hideFromWebsite === true && (
            <Metadata label="Publik visning" value="Dold från webbplatsen" />
          )}
        </dl>
        <Inline space={2} className="esencial-content-media__actions">
          <Button
            mode="ghost"
            text="Ersätt eller redigera via Sanity"
            disabled={disabled}
            onClick={onReplace}
          />
          <Button
            mode="ghost"
            tone="critical"
            text="Ta bort referensen från kladden…"
            aria-label={`Ta bort referensen till ${title} från kladden; asseten raderas inte`}
            disabled={disabled}
            onClick={onRemove}
          />
        </Inline>
      </Stack>
    </Card>
  )
}

function LegacyMediaCard({
  title,
  image,
  rightsConfirmed,
  disabled,
  onReplace,
  onRemove,
}: {
  title: string
  image: LegacyImageValue
  rightsConfirmed?: boolean
  disabled: boolean
  onReplace: () => void
  onRemove: () => void
}) {
  return (
    <Card padding={3} radius={2} border className="esencial-content-media__media-card">
      <Stack space={3}>
        {image.url && (
          <div className="esencial-content-media__preview-frame">
            <img
              src={image.url}
              alt={image.alt?.trim() || 'Förhandsvisning: alt-text saknas i migreringsreferensen'}
              loading="lazy"
            />
          </div>
        )}
        <Text weight="semibold">{title}</Text>
        <dl className="esencial-content-media__metadata">
          <Metadata label="Alt-text" value={image.alt} missing="Saknas" />
          <Metadata label="Kredit" value={image.credit} missing="Saknas" />
          <Metadata
            label="Rättigheter"
            value={rightsConfirmed ? 'Bekräftade på projektnivå' : 'Inte bekräftade'}
          />
          <Metadata label="Befintlig bildadress" value={image.url} missing="Saknas" />
        </dl>
        <Inline space={2} className="esencial-content-media__actions">
          <Button
            mode="ghost"
            text="Byt bildadress via Sanity"
            aria-label={`Öppna ${title} för att ersätta dess bildadress i kladden`}
            disabled={disabled}
            onClick={onReplace}
          />
          <Button
            mode="ghost"
            tone="critical"
            text="Ta bort referensen från kladden…"
            aria-label={`Ta bort referensen till ${title} från kladden; originalfilen raderas inte`}
            disabled={disabled}
            onClick={onRemove}
          />
        </Inline>
      </Stack>
    </Card>
  )
}

function Metadata({label, value, missing}: {label: string; value?: string; missing?: string}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value?.trim() || missing || 'Saknas'}</dd>
    </div>
  )
}

function EmptyMedia({text}: {text: string}) {
  return (
    <Card padding={3} radius={2} border role="status">
      <Text size={1} muted>
        {text}
      </Text>
    </Card>
  )
}

export function createContentMediaWorkspace(onStatusChange?: Props['onStatusChange']) {
  return {
    id: CONTENT_MEDIA_SECTION_ID,
    summary: CONTENT_MEDIA_SECTION_SUMMARY,
    children: <ContentMediaWorkspace onStatusChange={onStatusChange} />,
  } as const
}
