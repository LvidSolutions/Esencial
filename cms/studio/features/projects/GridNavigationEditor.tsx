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
import {pairLabel, type GridProjectEntry, type NavigationSettings, type ProjectPair} from './types'

type SettingsPatch = {
  enabled: boolean
  headingSv: string
  headingEn: string
  allLabelSv: string
  allLabelEn: string
  gridEntries: GridProjectEntry[]
}

type Props = {
  settings?: NavigationSettings
  pairs: ProjectPair[]
  saving: boolean
  onSave: (patch: SettingsPatch) => Promise<void>
  onOpen: () => void
}

const emptySettings: SettingsPatch = {
  enabled: false,
  headingSv: '',
  headingEn: '',
  allLabelSv: '',
  allLabelEn: '',
  gridEntries: [],
}

function loadedSettings(settings?: NavigationSettings): SettingsPatch {
  return {
    enabled: settings?.enabled === true,
    headingSv: settings?.headingSv || '',
    headingEn: settings?.headingEn || '',
    allLabelSv: settings?.allLabelSv || '',
    allLabelEn: settings?.allLabelEn || '',
    gridEntries: settings?.gridEntries || [],
  }
}

export function GridNavigationEditor({settings, pairs, saving, onSave, onOpen}: Props) {
  const [draft, setDraft] = useState<SettingsPatch>(emptySettings)
  const [pairToAdd, setPairToAdd] = useState('')
  const enabledId = useId()
  const headingSvId = useId()
  const headingEnId = useId()
  const allSvId = useId()
  const allEnId = useId()
  const addId = useId()
  const loadedDraft = useMemo(() => loadedSettings(settings), [settings])

  useEffect(() => {
    setDraft(loadedDraft)
  }, [loadedDraft])

  const pairsByReference = useMemo(() => {
    const result = new Map<string, ProjectPair>()
    for (const pair of pairs) {
      if (pair.sv?._id) result.set(canonicalDocumentId(pair.sv._id), pair)
    }
    return result
  }, [pairs])
  const selectedReferences = useMemo(
    () => new Set(draft.gridEntries.map((entry) => canonicalDocumentId(entry.projectRef))),
    [draft.gridEntries],
  )
  const availablePairs = pairs.filter(
    (pair) =>
      pair.selectable && pair.sv?._id && !selectedReferences.has(canonicalDocumentId(pair.sv._id)),
  )
  const addPair = () => {
    const pair = pairs.find((candidate) => candidate.key === pairToAdd)
    if (!pair?.selectable || !pair.sv?._id) return
    setDraft((current) => ({
      ...current,
      gridEntries: [
        ...current.gridEntries,
        {projectRef: canonicalDocumentId(pair.sv?._id), includeInGrid: true},
      ],
    }))
    setPairToAdd('')
  }
  const updateEntry = (index: number, patch: Partial<GridProjectEntry>) => {
    setDraft((current) => ({
      ...current,
      gridEntries: current.gridEntries.map((entry, itemIndex) =>
        itemIndex === index ? {...entry, ...patch} : entry,
      ),
    }))
  }
  const removeEntry = (index: number) => {
    setDraft((current) => ({
      ...current,
      gridEntries: current.gridEntries.filter((_, itemIndex) => itemIndex !== index),
    }))
  }
  const moveEntry = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= draft.gridEntries.length) return
    setDraft((current) => {
      const next = [...current.gridEntries]
      ;[next[index], next[target]] = [next[target], next[index]]
      return {...current, gridEntries: next}
    })
  }

  const activationProblems = [
    !draft.headingSv.trim() && 'svensk projektrubrik',
    !draft.headingEn.trim() && 'engelsk projektrubrik',
    !draft.allLabelSv.trim() && 'svensk etikett för alla projekt',
    !draft.allLabelEn.trim() && 'engelsk etikett för alla projekt',
    !draft.gridEntries.some((entry) => entry.includeInGrid === true) &&
      'minst ett uttryckligen inkluderat projektpar',
  ].filter(Boolean)
  const hasUnsavedChanges = Boolean(
    settings
      ? draft.enabled !== (settings.enabled === true) ||
          draft.headingSv !== (settings.headingSv || '') ||
          draft.headingEn !== (settings.headingEn || '') ||
          draft.allLabelSv !== (settings.allLabelSv || '') ||
          draft.allLabelEn !== (settings.allLabelEn || '') ||
          JSON.stringify(draft.gridEntries) !== JSON.stringify(settings.gridEntries || [])
      : draft.enabled ||
          draft.headingSv ||
          draft.headingEn ||
          draft.allLabelSv ||
          draft.allLabelEn ||
          draft.gridEntries.length,
  )

  return (
    <Card padding={[3, 4]} radius={2} border>
      <Stack space={4}>
        <Box>
          <Heading as="h3" size={2}>
            Inkludering och ordning i projektrutnätet
          </Heading>
          <Text size={1} muted>
            Projekt läggs till ett i taget genom ett uttryckligt val. Ordningen ändras med synliga
            Upp/Ned-knappar; ingen redaktör behöver använda dra och släpp.
          </Text>
        </Box>

        {!settings && (
          <Card padding={3} radius={2} border role="status">
            <Text size={1}>
              Ingen redaktionell konfiguration finns. Alla nuvarande projekt, deras exakta ordning,
              befintliga filteretiketter och frontendutseende används därför oförändrade.
            </Text>
          </Card>
        )}

        <label htmlFor={enabledId} className="esencial-projects-feature__check-row">
          <Checkbox
            id={enabledId}
            checked={draft.enabled}
            onChange={(event) =>
              setDraft((current) => ({...current, enabled: event.currentTarget.checked}))
            }
          />
          <Text size={1} weight="semibold">
            Aktivera konfigurationen först efter komplett redaktionell granskning
          </Text>
        </label>

        <div className="esencial-projects-feature__form-grid">
          <LabelledInput
            id={headingSvId}
            label="Projektrubrik på svenska"
            value={draft.headingSv}
            onChange={(headingSv) => setDraft((current) => ({...current, headingSv}))}
          />
          <LabelledInput
            id={headingEnId}
            label="Project heading in English"
            value={draft.headingEn}
            onChange={(headingEn) => setDraft((current) => ({...current, headingEn}))}
          />
          <LabelledInput
            id={allSvId}
            label="Etikett för alla projekt på svenska"
            value={draft.allLabelSv}
            onChange={(allLabelSv) => setDraft((current) => ({...current, allLabelSv}))}
          />
          <LabelledInput
            id={allEnId}
            label="All-projects label in English"
            value={draft.allLabelEn}
            onChange={(allLabelEn) => setDraft((current) => ({...current, allLabelEn}))}
          />
        </div>

        <Card padding={3} radius={2} border>
          <Stack space={3}>
            <label htmlFor={addId}>
              <Text size={1} weight="semibold">
                Lägg till ett bekräftat projektpar
              </Text>
            </label>
            <Flex gap={2} align="flex-end" wrap="wrap">
              <Box flex={1}>
                <Select
                  id={addId}
                  value={pairToAdd}
                  onChange={(event) => setPairToAdd(event.currentTarget.value)}
                >
                  <option value="">Välj projektpar…</option>
                  {availablePairs.map((pair) => (
                    <option key={pair.key} value={pair.key}>
                      {pairLabel(pair)}
                    </option>
                  ))}
                </Select>
              </Box>
              <Button text="Lägg till i kladd" disabled={!pairToAdd} onClick={addPair} />
            </Flex>
          </Stack>
        </Card>

        <Stack space={3}>
          {draft.gridEntries.map((entry, index) => {
            const pair = pairsByReference.get(canonicalDocumentId(entry.projectRef))
            const includedId = `${enabledId}-included-${index}`
            return (
              <Card
                key={entry.projectRef || entry._key || index}
                padding={3}
                radius={2}
                border
                className="esencial-projects-feature__order-row"
              >
                <Flex align="center" gap={3} wrap="wrap">
                  <Box flex={1}>
                    <Text size={1} muted>
                      Position {index + 1}
                    </Text>
                    <Text weight="semibold">
                      {pair ? pairLabel(pair) : 'Projektparet saknas eller kan inte längre läsas'}
                    </Text>
                  </Box>
                  <label htmlFor={includedId} className="esencial-projects-feature__check-row">
                    <Checkbox
                      id={includedId}
                      checked={entry.includeInGrid === true}
                      onChange={(event) =>
                        updateEntry(index, {includeInGrid: event.currentTarget.checked})
                      }
                    />
                    <Text size={1}>Visa</Text>
                  </label>
                  <Inline space={2} className="esencial-projects-feature__actions">
                    <Button
                      mode="ghost"
                      text="Upp"
                      aria-label={`Flytta ${pair ? pairLabel(pair) : `position ${index + 1}`} upp`}
                      disabled={index === 0}
                      onClick={() => moveEntry(index, -1)}
                    />
                    <Button
                      mode="ghost"
                      text="Ned"
                      aria-label={`Flytta ${pair ? pairLabel(pair) : `position ${index + 1}`} ned`}
                      disabled={index === draft.gridEntries.length - 1}
                      onClick={() => moveEntry(index, 1)}
                    />
                    <Button
                      mode="ghost"
                      tone="critical"
                      text="Ta bort från kladd"
                      aria-label={`Ta bort ${pair ? pairLabel(pair) : `position ${index + 1}`} från kladd`}
                      onClick={() => removeEntry(index)}
                    />
                  </Inline>
                </Flex>
              </Card>
            )
          })}
          {!draft.gridEntries.length && (
            <Text size={1} muted>
              Inga projektpar har lagts till. Rutnätet förblir i säkert frontendreservläge.
            </Text>
          )}
        </Stack>

        {draft.enabled && activationProblems.length > 0 && (
          <Card padding={3} radius={2} border role="alert">
            <Text size={1} className="esencial-projects-feature__error">
              Publicering blockeras tills följande är klart: {activationProblems.join(', ')}.
            </Text>
          </Card>
        )}

        {hasUnsavedChanges && (
          <Card padding={3} radius={2} border className="esencial-projects-feature__unsaved">
            <Stack space={2}>
              <Text size={1} role="status">
                Rutnätet har osparade ändringar. Den publicerade webbplatsen är oförändrad.
              </Text>
              <Box>
                <Button
                  mode="ghost"
                  text="Återställ laddat rutnät"
                  aria-label="Återställ rutnät och filteretiketter till senast laddade värden"
                  onClick={() => {
                    setDraft(loadedDraft)
                    setPairToAdd('')
                  }}
                />
              </Box>
            </Stack>
          </Card>
        )}

        <Inline space={2} className="esencial-projects-feature__actions">
          <Button
            text="Spara rutnät som kladd"
            disabled={saving}
            onClick={() =>
              void onSave({
                ...draft,
                headingSv: draft.headingSv.trim(),
                headingEn: draft.headingEn.trim(),
                allLabelSv: draft.allLabelSv.trim(),
                allLabelEn: draft.allLabelEn.trim(),
              })
            }
          />
          <Button
            mode="ghost"
            text="Öppna validering och publicering"
            disabled={!settings || hasUnsavedChanges || saving}
            onClick={onOpen}
          />
        </Inline>
      </Stack>
    </Card>
  )
}

function LabelledInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Stack space={2}>
      <label htmlFor={id}>
        <Text size={1} weight="semibold">
          {label}
        </Text>
      </label>
      <TextInput id={id} value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </Stack>
  )
}
