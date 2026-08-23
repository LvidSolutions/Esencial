import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react'
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

type LegacyImageValue = {_key?: string; url?: string; alt?: string; credit?: string}

type PreviewEntry = {_key?: string; asset?: AssetPreview}
type ProjectContent = ProjectEditableSnapshot & {
  _originalId?: string
  imageRightsConfirmed?: boolean
  heroImage?: ImageValue
  heroImagePreview?: AssetPreview
  galleryImages?: ImageValue[]
  galleryPreviews?: PreviewEntry[]
  floorPlans?: FloorPlanValue[]
  floorPlanPreviews?: PreviewEntry[]
  images?: ImageValue[]
  previousImagePreviews?: PreviewEntry[]
  legacyImages?: LegacyImageValue[]
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
  translationStatus, location, year, typology, client, team, services, status, summary,
  seoTitle, seoDescription, reviewNotes, publishChecklist, imageRightsConfirmed,
  heroImage,
  "heroImagePreview": heroImage.asset->{_id, url, originalFilename, metadata{dimensions}},
  galleryImages,
  "galleryPreviews": galleryImages[]{_key, "asset": asset->{_id, url, originalFilename, metadata{dimensions}}},
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
  const projectSelectId = useId()
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
        const nextProjects = await client.fetch<ProjectContent[]>(projectsQuery)
        setProjects(nextProjects)
        setSelectedId((current) => {
          const requested = canonicalDocumentId(preferredId || current)
          const matching = nextProjects.find(
            (project) => canonicalDocumentId(project._id) === requested,
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

      {saveState !== 'loading' && projects.length > 0 && (
        <Stack space={2}>
          <label htmlFor={projectSelectId}>
            <Text size={1} weight="semibold">
              Projekt och språkversion
            </Text>
          </label>
          <Select
            id={projectSelectId}
            value={selectedId}
            disabled={interactionLocked}
            onChange={(event) => {
              setSelectedId(event.currentTarget.value)
              setError('')
            }}
          >
            {projects.map((project) => {
              const id = canonicalDocumentId(project._id)
              return (
                <option key={`${id}-${project.language || 'okänt'}`} value={id}>
                  {project.title || 'Namnlöst projekt'} ·{' '}
                  {(project.language || 'språk saknas').toUpperCase()} ·{' '}
                  {project.status || 'status saknas'}
                </option>
              )
            })}
          </Select>
          <Text size={1} muted>
            Byte spärras medan en borttagning väntar på bekräftelse eller återställning, så att en
            återhämtningsväg aldrig tappas bort.
          </Text>
        </Stack>
      )}

      {saveState !== 'loading' && !projects.length && (
        <Card padding={3} radius={2} border role="status">
          <Text size={1}>
            Inga projekt kunde läsas. Inget exempelprojekt eller innehåll skapas automatiskt.
          </Text>
        </Card>
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
            disabled={interactionLocked}
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
  const floorPlanPreviews = previewMap(project.floorPlanPreviews)
  const previousImagePreviews = previewMap(project.previousImagePreviews)
  return (
    <Card padding={[3, 4]} radius={2} border>
      <Stack space={5}>
        <Box>
          <Heading as="h3" size={2}>
            Aktuell projektmedia
          </Heading>
          <Text as="p" size={1} muted>
            Förhandsvisningen visar kladdens referenser och metadata. Ersätt eller lägg till genom
            Sanitys inbyggda bildfält, där du kan välja en befintlig asset eller ladda upp en fil.
            Borttagning här tar bara bort referensen i kladden och raderar aldrig asseten.
          </Text>
        </Box>

        <MediaSection
          heading="Huvudbild"
          actionText={
            project.heroImage
              ? 'Byt huvudbild via Sanitys bildväljare'
              : 'Lägg till huvudbild via Sanitys bildväljare'
          }
          actionLabel="Öppna Sanitys inbyggda huvudbildsfält för assetval eller uppladdning"
          disabled={disabled}
          onOpen={() => onOpenField('heroImage')}
        >
          {project.heroImage ? (
            <MediaCard
              title="Huvudbild"
              image={project.heroImage}
              asset={project.heroImagePreview}
              rightsFallback={project.imageRightsConfirmed}
              disabled={disabled}
              onReplace={() => onOpenField('heroImage')}
              onRemove={() => onRequestRemoval({kind: 'hero'}, 'huvudbilden')}
            />
          ) : (
            <EmptyMedia text="Kladden har ingen huvudbildsreferens." />
          )}
        </MediaSection>

        <MediaSection
          heading="Projektgalleri"
          actionText="Lägg till galleribild via Sanitys bildväljare"
          actionLabel="Öppna Sanitys inbyggda projektgalleri för assetval eller uppladdning"
          disabled={disabled}
          onOpen={() => onOpenField('galleryImages')}
        >
          <div className="esencial-content-media__media-grid">
            {(project.galleryImages || []).map((image, index) => (
              <MediaCard
                key={image._key || index}
                title={`Galleribild ${index + 1}`}
                image={image}
                asset={galleryPreviews.get(image._key || String(index))}
                rightsFallback={project.imageRightsConfirmed}
                disabled={disabled}
                onReplace={() => onOpenField('galleryImages')}
                onRemove={() =>
                  onRequestRemoval(
                    {kind: 'gallery', key: image._key, index},
                    `galleribild ${index + 1}`,
                  )
                }
              />
            ))}
          </div>
          {!project.galleryImages?.length && <EmptyMedia text="Kladden har inga galleribilder." />}
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
}: {
  title: string
  image: LegacyImageValue
  rightsConfirmed?: boolean
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
        <Text weight="semibold">{title} · skrivskyddad</Text>
        <dl className="esencial-content-media__metadata">
          <Metadata label="Alt-text" value={image.alt} missing="Saknas" />
          <Metadata label="Kredit" value={image.credit} missing="Saknas" />
          <Metadata
            label="Rättigheter"
            value={rightsConfirmed ? 'Bekräftade på projektnivå' : 'Inte bekräftade'}
          />
          <Metadata label="Befintlig bildadress" value={image.url} missing="Saknas" />
        </dl>
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
