import {useCallback, useEffect, useMemo, useState} from 'react'
import {Badge, Box, Button, Card, Flex, Heading, Spinner, Stack, Text} from '@sanity/ui'
import {useClient} from 'sanity'
import {buildEditorialStatusQueues, canonicalProjectId} from './editorialStatus.mjs'
import type {
  EditorialStatusProject,
  EditorialStatusQueue,
  EditorialStatusQueueId,
} from './editorialStatusTypes'

const apiVersion = '2025-02-19'
const statusQuery = `*[_type == "project"] | order(_updatedAt desc) {
  _id,
  _originalId,
  _updatedAt,
  title,
  language,
  status,
  "hasSeo": defined(seoTitle) && defined(seoDescription),
  "hasHeroImage": defined(heroImage.asset) || count(coalesce(images, [])) > 0 || count(coalesce(legacyImages, [])) > 0,
  "hasTranslationKey": defined(translationKey),
  "translationApproved": translationStatus == "approved"
}`

const queueCopy: Record<
  EditorialStatusQueueId,
  {title: string; description: string; empty: string; tone: 'default' | 'caution' | 'critical'}
> = {
  ready: {
    title: 'Klar att publicera',
    description: 'Färdiggranskade projekt som behöver en sista kontroll före publicering.',
    empty: 'Inga projekt väntar på publicering.',
    tone: 'caution',
  },
  recent: {
    title: 'Senast ändrat',
    description: 'Projekt som någon nyligen har arbetat med.',
    empty: 'Inga projekt kunde läsas.',
    tone: 'default',
  },
  incomplete: {
    title: 'Saknar SEO eller huvudbild',
    description: 'Pågående projekt där söktext eller huvudbild saknas.',
    empty: 'Inga pågående projekt saknar dessa delar.',
    tone: 'critical',
  },
  translation: {
    title: 'Översättning att slutföra',
    description: 'Projekt där språkparet inte är färdigt eller godkänt.',
    empty: 'Alla lästa projekt har en godkänd översättningskoppling.',
    tone: 'caution',
  },
}

type LoadState = 'loading' | 'loaded' | 'error'

export function EditorialStatusOverview() {
  const baseClient = useClient({apiVersion})
  const client = useMemo(
    () => baseClient.withConfig({perspective: 'drafts', useCdn: false}),
    [baseClient],
  )
  const [projects, setProjects] = useState<EditorialStatusProject[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const nextProjects = await client.fetch<EditorialStatusProject[]>(statusQuery)
      setProjects(nextProjects)
      setLoadState('loaded')
    } catch {
      setProjects([])
      setLoadState('error')
    }
  }, [client])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  const queues = useMemo(
    () => buildEditorialStatusQueues(projects) as EditorialStatusQueue[],
    [projects],
  )

  return (
    <section
      aria-labelledby="esencial-editorial-status-heading"
      aria-busy={loadState === 'loading'}
      className="esencial-editorial-status"
      id="esencial-workspace-status"
      tabIndex={-1}
    >
      <Flex align="flex-end" gap={4} justify="space-between" wrap="wrap">
        <Box className="esencial-editorial-status__intro">
          <Text as="p" className="esencial-workspace-shell__eyebrow">
            Överblick
          </Text>
          <Heading as="h2" id="esencial-editorial-status-heading" size={3}>
            Att göra och senaste ändringar
          </Heading>
          <Text as="p" size={1} className="esencial-editorial-status__summary">
            Här ser du sparade kladdar som behöver uppmärksamhet. Använd Innehåll &amp; publicering
            (avancerat) först när du behöver fullständig kontroll, historik eller publicering.
          </Text>
        </Box>
        {loadState === 'loaded' && (
          <Button
            mode="ghost"
            text="Uppdatera status"
            onClick={() => setReloadKey((key) => key + 1)}
          />
        )}
      </Flex>

      {loadState === 'loading' && (
        <Card className="esencial-editorial-status__state" padding={4} radius={2} role="status">
          <Flex align="center" gap={3}>
            <Spinner muted />
            <Text size={1}>Laddar redaktionellt arbetsläge…</Text>
          </Flex>
        </Card>
      )}

      {loadState === 'error' && (
        <Card
          className="esencial-editorial-status__state"
          padding={4}
          radius={2}
          role="alert"
          tone="critical"
        >
          <Stack space={3}>
            <Heading as="h3" size={1}>
              Statusöversikten kunde inte läsas
            </Heading>
            <Text size={1}>
              Ingen publicerad information ändrades. Försök igen eller öppna den avancerade vyn
              Innehåll &amp; publicering för att fortsätta.
            </Text>
            <Box>
              <Button text="Försök igen" onClick={() => setReloadKey((key) => key + 1)} />
            </Box>
          </Stack>
        </Card>
      )}

      {loadState === 'loaded' && (
        <div className="esencial-editorial-status__grid">
          {queues.map((queue) => (
            <EditorialStatusCard key={queue.id} queue={queue} />
          ))}
        </div>
      )}
    </section>
  )
}

function EditorialStatusCard({queue}: {queue: EditorialStatusQueue}) {
  const copy = queueCopy[queue.id]
  const hiddenCount = queue.total - queue.items.length
  const headingId = `esencial-editorial-status-${queue.id}`

  return (
    <Card
      as="article"
      border
      className="esencial-editorial-status__card"
      data-tone={copy.tone}
      padding={4}
      radius={2}
    >
      <Stack space={3}>
        <Flex align="center" gap={3} justify="space-between">
          <Heading as="h3" id={headingId} size={1}>
            {copy.title}
          </Heading>
          <Badge aria-label={`${queue.total} projekt i ${copy.title.toLowerCase()}`} tone={copy.tone}>
            {queue.total}
          </Badge>
        </Flex>
        <Text as="p" muted size={1}>
          {copy.description}
        </Text>
        {queue.items.length ? (
          <ul aria-labelledby={headingId} className="esencial-editorial-status__list">
            {queue.items.map((project) => (
              <li key={canonicalProjectId(project)}>
                <a
                  aria-label={`Öppna ${project.title || 'namnlöst projekt'} i den avancerade vyn Innehåll & publicering`}
                  href={`#/intent/edit/id=${encodeURIComponent(canonicalProjectId(project))};type=project`}
                >
                  <span className="esencial-editorial-status__project-title">
                    {project.title || 'Namnlöst projekt'}
                  </span>
                  <span className="esencial-editorial-status__meta">
                    <span>{languageLabel(project.language)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{statusLabel(project.status)}</span>
                    {project._updatedAt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <time dateTime={project._updatedAt}>{formatDate(project._updatedAt)}</time>
                      </>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <Text as="p" className="esencial-editorial-status__empty" size={1}>
            {copy.empty}
          </Text>
        )}
        {hiddenCount > 0 && (
          <Text as="p" muted size={1}>
            Ytterligare {hiddenCount} finns i den avancerade vyn Innehåll &amp; publicering.
          </Text>
        )}
      </Stack>
    </Card>
  )
}

function languageLabel(language?: string) {
  if (language === 'sv') return 'Svenska'
  if (language === 'en') return 'English'
  return 'Språk saknas'
}

function statusLabel(status?: string) {
  if (status === 'review') return 'Granskning'
  if (status === 'draft') return 'Kladd'
  if (status === 'published') return 'Publicerad'
  return 'Status saknas'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Datum saknas'
  return new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
