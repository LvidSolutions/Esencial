import {useEffect, useId, useState} from 'react'
import {Box, Button, Card, Flex, Heading, Inline, Select, Stack, Text, TextInput} from '@sanity/ui'
import {pairLabel, type ProjectPair, type ProjectSummary} from './types'

type Props = {
  pairs: ProjectPair[]
  selectedKey: string
  saving: boolean
  onSelect: (key: string) => void
  onSaveTitle: (project: ProjectSummary, title: string) => Promise<void>
  onCreate: (language: 'sv' | 'en') => void
  onOpen: (project: ProjectSummary) => void
}

export function ProjectHeadingEditor({
  pairs,
  selectedKey,
  saving,
  onSelect,
  onSaveTitle,
  onCreate,
  onOpen,
}: Props) {
  const pair = pairs.find((candidate) => candidate.key === selectedKey) || pairs[0]
  const [titleSv, setTitleSv] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const swedishId = useId()
  const englishId = useId()

  useEffect(() => {
    setTitleSv(pair?.sv?.title || '')
    setTitleEn(pair?.en?.title || '')
  }, [pair?.en?._id, pair?.en?.title, pair?.sv?._id, pair?.sv?.title])

  return (
    <Card padding={[3, 4]} radius={2} border>
      <Stack space={4}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <Box>
            <Heading as="h3" size={2}>
              Projektrubriker på svenska och engelska
            </Heading>
            <Text size={1} muted>
              Varje fält sparar endast den befintliga språkversionens kladd. Inga rubriker,
              översättningar, fakta eller språkpar skapas automatiskt.
            </Text>
          </Box>
          <Inline space={2} className="esencial-projects-feature__actions">
            <Button text="Nytt svenskt projekt" onClick={() => onCreate('sv')} />
            <Button mode="ghost" text="New English project" onClick={() => onCreate('en')} />
          </Inline>
        </Flex>

        {pairs.length ? (
          <Stack space={3}>
            <label htmlFor={`${swedishId}-pair`}>
              <Text size={1} weight="semibold">
                Projektpar att redigera
              </Text>
            </label>
            <Select
              id={`${swedishId}-pair`}
              value={pair?.key || ''}
              onChange={(event) => onSelect(event.currentTarget.value)}
            >
              {pairs.map((candidate) => (
                <option key={candidate.key} value={candidate.key}>
                  {pairLabel(candidate)}
                </option>
              ))}
            </Select>

            {!pair?.complete && (
              <Card padding={3} radius={2} border role="status">
                <Text size={1}>
                  Språkparet är ofullständigt. Lägg till och koppla den saknade versionen i den
                  fullständiga dokumentvyn; arbetsytan gissar aldrig en översättning.
                </Text>
              </Card>
            )}

            <div className="esencial-projects-feature__language-grid">
              <LanguageHeadingField
                id={swedishId}
                languageLabel="Svenska"
                value={titleSv}
                original={pair?.sv?.title || ''}
                project={pair?.sv}
                saving={saving}
                onChange={setTitleSv}
                onSave={onSaveTitle}
                onOpen={onOpen}
              />
              <LanguageHeadingField
                id={englishId}
                languageLabel="English"
                value={titleEn}
                original={pair?.en?.title || ''}
                project={pair?.en}
                saving={saving}
                onChange={setTitleEn}
                onSave={onSaveTitle}
                onOpen={onOpen}
              />
            </div>
          </Stack>
        ) : (
          <Text muted>Inga projekt kunde läsas. Skapa projekt i Sanitys dokumentvy.</Text>
        )}
      </Stack>
    </Card>
  )
}

function LanguageHeadingField({
  id,
  languageLabel,
  value,
  original,
  project,
  saving,
  onChange,
  onSave,
  onOpen,
}: {
  id: string
  languageLabel: string
  value: string
  original: string
  project?: ProjectSummary
  saving: boolean
  onChange: (value: string) => void
  onSave: (project: ProjectSummary, value: string) => Promise<void>
  onOpen: (project: ProjectSummary) => void
}) {
  const normalized = value.trim()
  const changed = normalized !== original.trim()
  return (
    <fieldset className="esencial-projects-feature__fieldset" disabled={!project || saving}>
      <legend>{languageLabel}</legend>
      {project ? (
        <Stack space={3}>
          <label htmlFor={id}>
            <Text size={1} weight="semibold">
              Projektrubrik
            </Text>
          </label>
          <TextInput
            id={id}
            value={value}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
          {!normalized && (
            <Text size={1} className="esencial-projects-feature__error" role="alert">
              Rubriken får inte vara tom. Kladden sparas inte från arbetsytan.
            </Text>
          )}
          <Inline space={2} className="esencial-projects-feature__actions">
            <Button
              text="Spara rubrik som kladd"
              disabled={!changed || !normalized || saving}
              onClick={() => void onSave(project, normalized)}
            />
            <Button
              mode="ghost"
              text="Öppna fullständig dokumentvy"
              onClick={() => onOpen(project)}
            />
          </Inline>
        </Stack>
      ) : (
        <Text size={1} muted>
          Språkversion saknas.
        </Text>
      )}
    </fieldset>
  )
}
