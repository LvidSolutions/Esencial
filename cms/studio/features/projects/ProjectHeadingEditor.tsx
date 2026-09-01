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
  }, [pair?.sv?._id, pair?.sv?.title])

  useEffect(() => {
    setTitleEn(pair?.en?.title || '')
  }, [pair?.en?._id, pair?.en?.title])

  const hasUnsavedHeading =
    titleSv.trim() !== (pair?.sv?.title || '').trim() ||
    titleEn.trim() !== (pair?.en?.title || '').trim()

  return (
    <Card padding={[3, 4]} radius={2} border>
      <Stack space={4}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <div className="esencial-projects-feature__heading-block">
            <Heading as="h3" size={2}>
              Projektrubriker på svenska och engelska
            </Heading>
            <Text size={1} muted>
              Varje fält sparar endast den befintliga språkversionens kladd. Inga rubriker,
              översättningar, fakta eller språkpar skapas automatiskt.
            </Text>
          </div>
          <Inline space={2} className="esencial-projects-feature__actions">
            <Button
              text="Nytt svenskt projekt"
              disabled={hasUnsavedHeading || saving}
              onClick={() => onCreate('sv')}
            />
            <Button
              mode="ghost"
              text="New English project"
              disabled={hasUnsavedHeading || saving}
              onClick={() => onCreate('en')}
            />
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
              disabled={hasUnsavedHeading || saving}
              onChange={(event) => onSelect(event.currentTarget.value)}
            >
              {pairs.map((candidate) => (
                <option key={candidate.key} value={candidate.key}>
                  {pairLabel(candidate)}
                </option>
              ))}
            </Select>

            {hasUnsavedHeading && (
              <Card padding={3} radius={2} border className="esencial-projects-feature__unsaved">
                <Stack space={2}>
                  <Text size={1} role="status">
                    Osparade rubrikändringar finns. Spara eller återställ fälten innan du byter
                    projektpar.
                  </Text>
                  <Box>
                    <Button
                      mode="ghost"
                      text="Återställ laddade rubriker"
                      aria-label="Återställ båda rubrikerna till senast laddade värden"
                      onClick={() => {
                        setTitleSv(pair?.sv?.title || '')
                        setTitleEn(pair?.en?.title || '')
                      }}
                    />
                  </Box>
                </Stack>
              </Card>
            )}

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
                navigationBlocked={hasUnsavedHeading}
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
                navigationBlocked={hasUnsavedHeading}
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
  navigationBlocked,
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
  navigationBlocked: boolean
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
              disabled={navigationBlocked}
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
