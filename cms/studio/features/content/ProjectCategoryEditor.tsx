import {useCallback, useEffect, useId, useMemo, useState} from 'react'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Flex,
  Heading,
  Inline,
  Select,
  Stack,
  Text,
  TextInput,
} from '@sanity/ui'
import {useClient} from 'sanity'
import {patchDraft, projectReferences} from '../projects/drafts'
import {
  canonicalDocumentId,
  validateFilterCategoryDocument,
} from '../projects/navigationContract.mjs'
import {
  pairLabel,
  projectPairs,
  type FilterCategory,
  type ProjectPair,
  type ProjectSummary,
} from '../projects/types'

type Props = {
  currentProjectId?: string
  disabled?: boolean
  onDirtyChange: (dirty: boolean) => void
}

type CategoryDraft = {
  key: string
  labelSv: string
  labelEn: string
  order: string
  visible: boolean
  projectRefs: string[]
}

const apiVersion = '2025-02-19'
const projectsQuery = `*[_type == "project"] | order(translationKey asc, language asc) {
  _id, _originalId, title, "slug": slug.current, language, translationKey, status
}`
const categoriesQuery = `*[_type == "filterCategory"] | order(order asc, key asc) {
  _id, _originalId, key, labelSv, labelEn, order, visible, "projectRefs": projects[]._ref
}`

function loadedCategory(category?: FilterCategory): CategoryDraft {
  return {
    key: category?.key || '',
    labelSv: category?.labelSv || '',
    labelEn: category?.labelEn || '',
    order: String(category?.order ?? 0),
    visible: category?.visible === true,
    projectRefs: (category?.projectRefs || []).map(canonicalDocumentId),
  }
}

function normalizedKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function newCategoryId() {
  const suffix =
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `drafts.filterCategory-${suffix}`
}

export function ProjectCategoryEditor({currentProjectId, disabled, onDirtyChange}: Props) {
  const baseClient = useClient({apiVersion})
  const client = useMemo(
    () => baseClient.withConfig({perspective: 'drafts', useCdn: false}),
    [baseClient],
  )
  const selectId = useId()
  const keyId = useId()
  const labelSvId = useId()
  const labelEnId = useId()
  const orderId = useId()
  const visibleId = useId()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [categories, setCategories] = useState<FilterCategory[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<CategoryDraft>(() => loadedCategory())
  const [keyDerived, setKeyDerived] = useState(true)
  const [state, setState] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading')
  const [message, setMessage] = useState('Laddar kategorier och projektpar…')
  const [error, setError] = useState('')

  const load = useCallback(
    async (preferredId?: string) => {
      setState('loading')
      setMessage('Laddar kategorier och projektpar…')
      setError('')
      try {
        const [nextProjects, nextCategories] = await Promise.all([
          client.fetch<ProjectSummary[]>(projectsQuery),
          client.fetch<FilterCategory[]>(categoriesQuery),
        ])
        const normalized = nextCategories.map((category) => ({
          ...category,
          projectRefs: category.projectRefs || [],
        }))
        setProjects(nextProjects)
        setCategories(normalized)
        const requested = canonicalDocumentId(preferredId || selectedId)
        const selected =
          normalized.find((category) => canonicalDocumentId(category._id) === requested) ||
          normalized[0]
        setSelectedId(selected?._id || '')
        setCreating(false)
        setDraft(loadedCategory(selected))
        setKeyDerived(false)
        setState('saved')
        setMessage('Kategoriernas senaste kladdar är inlästa')
      } catch {
        setState('error')
        setMessage('Kategorierna kunde inte läsas')
        setError(
          'Projektkategorierna kunde inte läsas. Ingen publicerad version ändrades. Välj Läs om kategorier och försök igen.',
        )
      }
    },
    [client, selectedId],
  )

  useEffect(() => {
    void load()
    // The initial load is intentionally tied to the configured drafts client only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  const selectedCategory = categories.find((category) => category._id === selectedId)
  const loaded = useMemo(
    () => (creating ? loadedCategory() : loadedCategory(selectedCategory)),
    [creating, selectedCategory],
  )
  const dirty = creating || JSON.stringify(draft) !== JSON.stringify(loaded)

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const pairs = useMemo(() => projectPairs(projects), [projects])
  const currentCanonical = canonicalDocumentId(currentProjectId)
  const orderedPairs = useMemo(
    () =>
      [...pairs].sort((left, right) => {
        const leftCurrent = [left.sv?._id, left.en?._id]
          .map(canonicalDocumentId)
          .includes(currentCanonical)
        const rightCurrent = [right.sv?._id, right.en?._id]
          .map(canonicalDocumentId)
          .includes(currentCanonical)
        return Number(rightCurrent) - Number(leftCurrent)
      }),
    [currentCanonical, pairs],
  )
  const selectedRefs = useMemo(() => new Set(draft.projectRefs), [draft.projectRefs])
  const currentOrder = Number(draft.order)
  const contractErrorLabels: Record<string, string> = {
    'Filter key must use lowercase letters, numbers and single hyphens.':
      'Ange en teknisk nyckel med små bokstäver, siffror och enkla bindestreck.',
    'Swedish filter label is required.': 'Ange kategorins svenska namn.',
    'English filter label is required.':
      'Ange kategorins engelska namn; arbetsytan översätter inte automatiskt.',
    'Filter order must be a non-negative integer.':
      'Ordningen måste vara ett heltal som är 0 eller högre.',
    'Filter visibility must be explicit.': 'Välj uttryckligen om kategorin ska visas.',
    'Filter category must select at least one project pair.':
      'Välj minst ett komplett, publicerat språkpar.',
  }
  const contractErrors = validateFilterCategoryDocument(
    {
      key: draft.key.trim(),
      labelSv: draft.labelSv.trim(),
      labelEn: draft.labelEn.trim(),
      order: currentOrder,
      visible: draft.visible,
      projectRefs: draft.projectRefs,
    },
    projects,
  ).map(
    (problem) =>
      contractErrorLabels[problem] ||
      (problem.startsWith('Filter membership')
        ? 'Ett valt projektpar är inte längre komplett och publicerat på båda språken.'
        : problem),
  )
  const errors = [
    ...contractErrors,
    categories.some(
      (category) =>
        canonicalDocumentId(category._id) !== canonicalDocumentId(selectedId) &&
        category.key === draft.key.trim(),
    ) && `Nyckeln “${draft.key.trim()}” används redan.`,
    categories.some(
      (category) =>
        canonicalDocumentId(category._id) !== canonicalDocumentId(selectedId) &&
        category.order === currentOrder,
    ) && `Ordningen ${currentOrder} används redan.`,
  ].filter((problem): problem is string => Boolean(problem))

  const beginCreate = () => {
    const nextOrder =
      categories.reduce((largest, category) => Math.max(largest, category.order ?? -1), -1) + 1
    setCreating(true)
    setSelectedId(newCategoryId())
    setDraft({...loadedCategory(), order: String(nextOrder)})
    setKeyDerived(true)
    setError('')
    setMessage('Ny kategori förbereds lokalt; inget kladd är skapat före Spara')
  }

  const reset = () => {
    if (creating) {
      const first = categories[0]
      setCreating(false)
      setSelectedId(first?._id || '')
      setDraft(loadedCategory(first))
      setKeyDerived(false)
      setMessage('Den osparade nya kategorin avbröts')
    } else {
      setDraft(loaded)
      setMessage('Kategorin återställdes till senast laddade kladd')
    }
    setError('')
    setState('saved')
  }

  const save = async () => {
    if (errors.length) {
      setState('error')
      setMessage('Kategorin har valideringsfel')
      setError(`Kategorikladden sparades inte: ${errors.join(' ')}`)
      return
    }
    setState('saving')
    setMessage('Sparar projektkategori som kladd…')
    setError('')
    try {
      await patchDraft(client, selectedId, 'filterCategory', {
        key: draft.key.trim(),
        labelSv: draft.labelSv.trim(),
        labelEn: draft.labelEn.trim(),
        order: currentOrder,
        visible: draft.visible,
        projects: projectReferences(draft.projectRefs),
      })
      await load(selectedId)
      setMessage('Projektkategorin sparades som kladd')
    } catch {
      setState('error')
      setMessage('Projektkategorin kunde inte sparas')
      setError(
        'Sparningen misslyckades. Ingen publicerad kategori eller projektsida ändrades. De osparade valen finns kvar; försök igen eller återställ.',
      )
    }
  }

  const togglePair = (pair: ProjectPair) => {
    if (!pair.selectable || !pair.sv?._id) return
    const reference = canonicalDocumentId(pair.sv._id)
    setDraft((current) => ({
      ...current,
      projectRefs: current.projectRefs.includes(reference)
        ? current.projectRefs.filter((id) => id !== reference)
        : [...current.projectRefs, reference],
    }))
  }

  const controlsDisabled = disabled || state === 'loading' || state === 'saving'

  return (
    <Card padding={[3, 4]} radius={2} border>
      <Stack space={4}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <Box>
            <Heading as="h3" size={2}>
              Projektkategorier och filter
            </Heading>
            <Text as="p" size={1} muted>
              Skapa och redigera samma filterkategorier som projektrutnätet använder. Välj tydligt
              vilka kompletta svenska/engelska projektpar som ingår. Inga kategorier, översättningar
              eller medlemskap hittas på automatiskt.
            </Text>
          </Box>
          <Inline space={2} className="esencial-content-media__actions">
            <Button
              text="Skapa ny projektkategori"
              disabled={controlsDisabled || dirty}
              onClick={beginCreate}
            />
            <Button
              mode="ghost"
              text="Läs om kategorier"
              disabled={controlsDisabled || dirty}
              onClick={() => void load(selectedId)}
            />
          </Inline>
        </Flex>

        <Card padding={3} radius={2} border className="esencial-content-media__status">
          <Text
            size={1}
            role={state === 'error' ? 'alert' : 'status'}
            aria-live={state === 'error' ? 'assertive' : 'polite'}
          >
            {message}
          </Text>
        </Card>

        {error && (
          <Card padding={3} radius={2} border tone="critical" role="alert">
            <Text size={1}>{error}</Text>
          </Card>
        )}

        {!creating && categories.length > 0 && (
          <Stack space={2}>
            <label htmlFor={selectId}>
              <Text size={1} weight="semibold">
                Kategori att redigera
              </Text>
            </label>
            <Select
              id={selectId}
              value={selectedId}
              disabled={controlsDisabled || dirty}
              onChange={(event) => {
                const next = categories.find(
                  (category) => category._id === event.currentTarget.value,
                )
                setSelectedId(event.currentTarget.value)
                setDraft(loadedCategory(next))
                setError('')
              }}
            >
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.labelSv || category.labelEn || 'Namnlös kategori'} ·{' '}
                  {category.visible ? 'synlig' : 'dold'}
                </option>
              ))}
            </Select>
          </Stack>
        )}

        {!creating && !categories.length && state !== 'loading' && (
          <Card padding={3} radius={2} border role="status">
            <Text size={1}>
              Inga projektkategorier finns. Skapa en tom, dold kladd först när redaktionen har
              bestämt namn och medlemskap.
            </Text>
          </Card>
        )}

        {(creating || selectedCategory) && (
          <fieldset className="esencial-content-media__fieldset" disabled={controlsDisabled}>
            <legend>{creating ? 'Ny dold projektkategori' : 'Kategorins kladdfält'}</legend>
            <Stack space={4}>
              <div className="esencial-content-media__form-grid">
                <Stack space={2}>
                  <label htmlFor={labelSvId}>
                    <Text size={1} weight="semibold">
                      Kategorinamn på svenska *
                    </Text>
                  </label>
                  <TextInput
                    id={labelSvId}
                    value={draft.labelSv}
                    onChange={(event) => {
                      const labelSv = event.currentTarget.value
                      setDraft((current) => ({
                        ...current,
                        labelSv,
                        key: creating && keyDerived ? normalizedKey(labelSv) : current.key,
                      }))
                    }}
                  />
                  <Text size={1} muted>
                    Visas i det svenska projektfiltret efter native publicering.
                  </Text>
                </Stack>
                <Stack space={2}>
                  <label htmlFor={labelEnId}>
                    <Text size={1} weight="semibold">
                      Category name in English *
                    </Text>
                  </label>
                  <TextInput
                    id={labelEnId}
                    value={draft.labelEn}
                    onChange={(event) =>
                      setDraft((current) => ({...current, labelEn: event.currentTarget.value}))
                    }
                  />
                  <Text size={1} muted>
                    Skriv endast en godkänd engelsk etikett; ingen automatisk översättning sker.
                  </Text>
                </Stack>
                <Stack space={2}>
                  <label htmlFor={keyId}>
                    <Text size={1} weight="semibold">
                      Teknisk filternyckel *
                    </Text>
                  </label>
                  <TextInput
                    id={keyId}
                    value={draft.key}
                    disabled={!creating}
                    onChange={(event) => {
                      setKeyDerived(false)
                      setDraft((current) => ({
                        ...current,
                        key: normalizedKey(event.currentTarget.value),
                      }))
                    }}
                  />
                  <Text size={1} muted>
                    {creating
                      ? 'Föreslås från det svenska namnet och kan kontrolleras före första sparningen.'
                      : 'Stabil och därför låst efter att kategorin har skapats.'}
                  </Text>
                </Stack>
                <Stack space={2}>
                  <label htmlFor={orderId}>
                    <Text size={1} weight="semibold">
                      Ordning i filtret *
                    </Text>
                  </label>
                  <TextInput
                    id={orderId}
                    type="number"
                    min={0}
                    step={1}
                    value={draft.order}
                    onChange={(event) =>
                      setDraft((current) => ({...current, order: event.currentTarget.value}))
                    }
                  />
                  <Text size={1} muted>
                    Lägst unikt nummer visas först.
                  </Text>
                </Stack>
              </div>

              <label htmlFor={visibleId} className="esencial-content-media__check-row">
                <Checkbox
                  id={visibleId}
                  checked={draft.visible}
                  onChange={(event) =>
                    setDraft((current) => ({...current, visible: event.currentTarget.checked}))
                  }
                />
                <Text size={1}>
                  Visa kategorin efter att kladden har granskats och publicerats i Sanity
                </Text>
              </label>

              <fieldset className="esencial-content-media__fieldset">
                <legend>Projekt i kategorin *</legend>
                <Text size={1} muted>
                  Markera hela språkparet med en kryssruta. Det projekt som är valt högst upp visas
                  först i listan när det ingår i ett par.
                </Text>
                <div className="esencial-content-media__membership-grid">
                  {orderedPairs.map((pair) => {
                    const reference = canonicalDocumentId(pair.sv?._id)
                    const checked = selectedRefs.has(reference)
                    const isCurrent = [pair.sv?._id, pair.en?._id]
                      .map(canonicalDocumentId)
                      .includes(currentCanonical)
                    const id = `${visibleId}-${pair.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`
                    return (
                      <label
                        key={pair.key}
                        htmlFor={id}
                        className="esencial-content-media__check-row"
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          disabled={!pair.selectable}
                          onChange={() => togglePair(pair)}
                        />
                        <Text size={1} muted={!pair.selectable}>
                          {pairLabel(pair)}
                          {isCurrent ? ' · valt projekt' : ''}
                          {!pair.selectable ? ' · kräver komplett publicerat språkpar' : ''}
                        </Text>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              {errors.length > 0 && dirty && (
                <Card padding={3} radius={2} border tone="critical" role="alert">
                  <Text size={1}>Kan inte spara ännu: {errors.join(' ')}</Text>
                </Card>
              )}

              {dirty && (
                <Card padding={3} radius={2} border tone="caution" role="status">
                  <Text size={1}>
                    Osparade kategori- eller medlemskapsändringar finns. Spara eller återställ innan
                    du byter kategori eller projekt.
                  </Text>
                </Card>
              )}

              <Inline space={2} className="esencial-content-media__actions">
                <Button
                  text="Spara kategori och medlemskap som kladd"
                  disabled={!dirty || state === 'saving'}
                  onClick={() => void save()}
                />
                <Button
                  mode="ghost"
                  text={creating ? 'Avbryt ny kategori' : 'Återställ senast laddad kategori'}
                  disabled={!dirty || state === 'saving'}
                  onClick={reset}
                />
              </Inline>
            </Stack>
          </fieldset>
        )}

        <Card padding={3} radius={2} border>
          <Text size={1}>
            <strong>Säkerhet:</strong> Ny kategori är dold som standard. Alla sparningar går till{' '}
            <code>drafts.*</code>. Den här vyn kan inte radera kategorier eller projekt och har
            ingen publiceringsknapp.
          </Text>
        </Card>
      </Stack>
    </Card>
  )
}
