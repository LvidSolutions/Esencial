import {useEffect, useId, useMemo, useState} from 'react'
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
import {canonicalDocumentId} from './navigationContract.mjs'
import {pairLabel, type FilterCategory, type ProjectPair} from './types'

type CategoryPatch = {
  labelSv: string
  labelEn: string
  order: number
  visible: boolean
  projectRefs: string[]
  projectOrder: string[]
}

type Props = {
  categories: FilterCategory[]
  pairs: ProjectPair[]
  selectedId: string
  saving: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onOpen: (category: FilterCategory) => void
  onSave: (category: FilterCategory, patch: CategoryPatch) => Promise<void>
}

export function FilterCategoryEditor({
  categories,
  pairs,
  selectedId,
  saving,
  onSelect,
  onCreate,
  onOpen,
  onSave,
}: Props) {
  const category = categories.find((candidate) => candidate._id === selectedId) || categories[0]
  const [labelSv, setLabelSv] = useState('')
  const [labelEn, setLabelEn] = useState('')
  const [order, setOrder] = useState('0')
  const [visible, setVisible] = useState(false)
  const [projectRefs, setProjectRefs] = useState<string[]>([])
  const [projectOrder, setProjectOrder] = useState<string[]>([])
  const [draggingReference, setDraggingReference] = useState('')
  const categorySelectId = useId()
  const labelSvId = useId()
  const labelEnId = useId()
  const orderId = useId()
  const visibleId = useId()

  useEffect(() => {
    setLabelSv(category?.labelSv || '')
    setLabelEn(category?.labelEn || '')
    setOrder(String(category?.order ?? 0))
    setVisible(category?.visible === true)
    setProjectRefs((category?.projectRefs || []).map(canonicalDocumentId))
    setProjectOrder(
      (category?.projectOrder || category?.projectRefs || []).map(canonicalDocumentId),
    )
  }, [
    category?._id,
    category?.labelEn,
    category?.labelSv,
    category?.order,
    category?.projectRefs,
    category?.projectOrder,
    category?.visible,
  ])

  const normalizedOrder = Number(order)
  const validOrder = Number.isInteger(normalizedOrder) && normalizedOrder >= 0
  const selectedProjects = useMemo(() => new Set(projectRefs), [projectRefs])
  const togglePair = (pair: ProjectPair) => {
    const reference = canonicalDocumentId(pair.sv?._id)
    if (!reference || !pair.selectable) return
    setProjectRefs((current) => {
      const next = current.includes(reference)
        ? current.filter((id) => id !== reference)
        : [...current, reference]
      setProjectOrder((order) => {
        const retained = order.filter((id) => next.includes(id))
        return next.includes(reference) && !retained.includes(reference)
          ? [...retained, reference]
          : retained
      })
      return next
    })
  }
  const moveProject = (reference: string, direction: -1 | 1) => {
    setProjectOrder((current) => {
      const index = current.indexOf(reference)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }
  const moveProjectTo = (reference: string, destination: string) => {
    if (reference === destination) return
    setProjectOrder((current) => {
      const from = current.indexOf(reference)
      const to = current.indexOf(destination)
      if (from < 0 || to < 0) return current
      const next = [...current]
      next.splice(from, 1)
      next.splice(to, 0, reference)
      return next
    })
  }
  const canSave = Boolean(
    category && labelSv.trim() && labelEn.trim() && validOrder && projectRefs.length,
  )
  const hasUnsavedChanges = Boolean(
    category &&
    (labelSv !== (category.labelSv || '') ||
      labelEn !== (category.labelEn || '') ||
      order !== String(category.order ?? 0) ||
      visible !== (category.visible === true) ||
      JSON.stringify(projectRefs) !==
        JSON.stringify((category.projectRefs || []).map(canonicalDocumentId)) ||
      JSON.stringify(projectOrder) !==
        JSON.stringify(
          (category.projectOrder || category.projectRefs || []).map(canonicalDocumentId),
        )),
  )

  return (
    <Card padding={[3, 4]} radius={2} border>
      <Stack space={4}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <Box className="esencial-projects-feature__heading-block">
            <Heading as="h3" size={2}>
              Filterkategorier och navigation
            </Heading>
            <Text size={1} muted>
              En kategori får endast de projektpar som redaktören markerar. Samma publicerade källa
              ska senare användas av både filternavigering och rutnät.
            </Text>
          </Box>
          <Button
            text="Skapa tom filterkategori"
            disabled={hasUnsavedChanges || saving}
            onClick={onCreate}
          />
        </Flex>

        {categories.length && category ? (
          <Stack space={4}>
            <Stack space={2}>
              <label htmlFor={categorySelectId}>
                <Text size={1} weight="semibold">
                  Kategori att redigera
                </Text>
              </label>
              <Select
                id={categorySelectId}
                value={category._id}
                disabled={hasUnsavedChanges || saving}
                onChange={(event) => onSelect(event.currentTarget.value)}
              >
                {categories.map((candidate) => (
                  <option key={candidate._id} value={candidate._id}>
                    {candidate.labelSv || candidate.labelEn || 'Namnlöst filter'} ·{' '}
                    {candidate.key || 'nyckel saknas'}
                  </option>
                ))}
              </Select>
              {hasUnsavedChanges && (
                <Card padding={3} radius={2} border className="esencial-projects-feature__unsaved">
                  <Stack space={2}>
                    <Text size={1} role="status">
                      Osparade filterändringar finns. Spara eller återställ fälten innan du byter
                      kategori eller skapar en ny.
                    </Text>
                    <Box>
                      <Button
                        mode="ghost"
                        text="Återställ laddat filter"
                        aria-label="Återställ filterkategorin till senast laddade värden"
                        onClick={() => {
                          setLabelSv(category.labelSv || '')
                          setLabelEn(category.labelEn || '')
                          setOrder(String(category.order ?? 0))
                          setVisible(category.visible === true)
                          setProjectRefs((category.projectRefs || []).map(canonicalDocumentId))
                          setProjectOrder(
                            (category.projectOrder || category.projectRefs || []).map(
                              canonicalDocumentId,
                            ),
                          )
                        }}
                      />
                    </Box>
                  </Stack>
                </Card>
              )}
            </Stack>

            <Card padding={3} radius={2} border>
              <Text size={1}>
                Stabil nyckel: <strong>{category.key || 'saknas'}</strong>. Nyckeln redigeras endast
                i den fullständiga dokumentvyn och låses av valideringen efter publicering.
              </Text>
            </Card>

            <div className="esencial-projects-feature__form-grid">
              <Stack space={2}>
                <label htmlFor={labelSvId}>
                  <Text size={1} weight="semibold">
                    Etikett på svenska
                  </Text>
                </label>
                <TextInput
                  id={labelSvId}
                  value={labelSv}
                  onChange={(event) => setLabelSv(event.currentTarget.value)}
                />
              </Stack>
              <Stack space={2}>
                <label htmlFor={labelEnId}>
                  <Text size={1} weight="semibold">
                    Label in English
                  </Text>
                </label>
                <TextInput
                  id={labelEnId}
                  value={labelEn}
                  onChange={(event) => setLabelEn(event.currentTarget.value)}
                />
              </Stack>
              <Stack space={2}>
                <label htmlFor={orderId}>
                  <Text size={1} weight="semibold">
                    Unikt ordningsnummer
                  </Text>
                </label>
                <TextInput
                  id={orderId}
                  type="number"
                  min={0}
                  step={1}
                  value={order}
                  onChange={(event) => setOrder(event.currentTarget.value)}
                />
                {!validOrder && (
                  <Text size={1} className="esencial-projects-feature__error" role="alert">
                    Ange ett heltal som är 0 eller högre.
                  </Text>
                )}
              </Stack>
              <label htmlFor={visibleId} className="esencial-projects-feature__check-row">
                <Checkbox
                  id={visibleId}
                  checked={visible}
                  onChange={(event) => setVisible(event.currentTarget.checked)}
                />
                <Text size={1}>Visa i filternavigeringen efter granskad publicering</Text>
              </label>
            </div>

            <fieldset className="esencial-projects-feature__fieldset">
              <legend>Explicit projektmedlemskap</legend>
              <Text size={1} muted>
                Varje val gäller det namngivna svenska/engelska projektparet. Ofullständiga eller
                opublicerade par kan inte väljas.
              </Text>
              <div className="esencial-projects-feature__membership-grid">
                {pairs.map((pair) => {
                  const reference = canonicalDocumentId(pair.sv?._id)
                  const checked = selectedProjects.has(reference)
                  const inputId = `${visibleId}-${pair.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`
                  return (
                    <label
                      key={pair.key}
                      htmlFor={inputId}
                      className="esencial-projects-feature__check-row"
                    >
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        disabled={!pair.selectable}
                        onChange={() => togglePair(pair)}
                      />
                      <Text size={1} muted={!pair.selectable}>
                        {pairLabel(pair)}
                        {!pair.selectable ? ' · ej valbart' : ''}
                      </Text>
                    </label>
                  )
                })}
              </div>
              {!projectRefs.length && (
                <Text size={1} className="esencial-projects-feature__error" role="alert">
                  Välj minst ett bekräftat projektpar. Tomma kategorier kan inte publiceras.
                </Text>
              )}
            </fieldset>

            {projectOrder.length > 0 && (
              <fieldset className="esencial-projects-feature__fieldset">
                <legend>Ordning i detta filter</legend>
                <Text size={1} muted>
                  Projekt 1 visas uppe till vänster, projekt 2 till höger och projekt 3 under
                  projekt 1. Dra en rad till en annan position. Upp/Ned fungerar alltid med
                  tangentbord.
                </Text>
                <ol className="esencial-projects-feature__order-list">
                  {projectOrder.map((reference, index) => {
                    const pair = pairs.find(
                      (candidate) => canonicalDocumentId(candidate.sv?._id) === reference,
                    )
                    return (
                      <li
                        key={reference}
                        className="esencial-projects-feature__order-row"
                        data-dragging={draggingReference === reference || undefined}
                        draggable={!saving}
                        onDragEnd={() => setDraggingReference('')}
                        onDragOver={(event) => event.preventDefault()}
                        onDragStart={() => setDraggingReference(reference)}
                        onDrop={() => {
                          moveProjectTo(draggingReference, reference)
                          setDraggingReference('')
                        }}
                      >
                        <Text size={1} weight="semibold">
                          {index + 1}. {pair ? pairLabel(pair) : 'Projekt saknas'}
                        </Text>
                        <Inline space={1} className="esencial-projects-feature__actions">
                          <Button
                            mode="ghost"
                            text="Upp"
                            disabled={saving || index === 0}
                            onClick={() => moveProject(reference, -1)}
                          />
                          <Button
                            mode="ghost"
                            text="Ned"
                            disabled={saving || index === projectOrder.length - 1}
                            onClick={() => moveProject(reference, 1)}
                          />
                        </Inline>
                      </li>
                    )
                  })}
                </ol>
              </fieldset>
            )}

            <Inline space={2} className="esencial-projects-feature__actions">
              <Button
                text="Spara filter som kladd"
                disabled={!canSave || saving}
                onClick={() =>
                  void onSave(category, {
                    labelSv: labelSv.trim(),
                    labelEn: labelEn.trim(),
                    order: normalizedOrder,
                    visible,
                    projectRefs,
                    projectOrder,
                  })
                }
              />
              <Button
                mode="ghost"
                text="Öppna validering och publicering"
                disabled={hasUnsavedChanges || saving}
                onClick={() => onOpen(category)}
              />
            </Inline>
          </Stack>
        ) : (
          <Card padding={3} radius={2} border>
            <Text size={1} muted>
              Ingen filterkategori är skapad. Den befintliga frontendens filter och projektordning
              förblir därför exakt oförändrade.
            </Text>
          </Card>
        )}
      </Stack>
    </Card>
  )
}
