import {useEffect, useId, useMemo, useState} from 'react'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Heading,
  Inline,
  Select,
  Stack,
  Text,
  TextArea,
  TextInput,
} from '@sanity/ui'
import {validateProjectContentPatch} from './contentWorkspaceContract.mjs'

type Checklist = {
  factsConfirmed: boolean
  languageChecked: boolean
  seoChecked: boolean
  imagesChecked: boolean
}

export type ProjectEditableSnapshot = {
  _id: string
  _rev?: string
  title?: string
  slug?: string
  language?: string
  translationKey?: string
  translationStatus?: string
  location?: string
  year?: number
  typology?: string
  client?: string
  team?: string[]
  services?: string[]
  status?: string
  summary?: string
  seoTitle?: string
  seoDescription?: string
  reviewNotes?: string
  publishChecklist?: Partial<Checklist>
}

export type ProjectContentPatch = {
  title: string
  slug: {_type: 'slug'; current: string}
  language: string
  translationKey?: string
  translationStatus: string
  location?: string
  year?: number
  typology?: string
  client?: string
  team: string[]
  services: string[]
  status: string
  summary: string
  seoTitle?: string
  seoDescription?: string
  reviewNotes?: string
  publishChecklist: Checklist
}

type EditorDraft = {
  title: string
  slug: string
  language: string
  translationKey: string
  translationStatus: string
  location: string
  team: string
  services: string
  year: string
  typology: string
  client: string
  status: string
  summary: string
  seoTitle: string
  seoDescription: string
  reviewNotes: string
  publishChecklist: Checklist
}

type Props = {
  project: ProjectEditableSnapshot
  saving: boolean
  onDirtyChange: (dirty: boolean) => void
  onSave: (patch: ProjectContentPatch) => Promise<void>
  onOpenAdvanced: (path: 'body' | 'relatedProjects') => void
}

const translationStatuses = [
  {value: 'not-started', title: 'Ej påbörjad'},
  {value: 'in-progress', title: 'Under arbete'},
  {value: 'ready-for-review', title: 'Klar för granskning'},
  {value: 'approved', title: 'Godkänd'},
]
const publicationStatuses = [
  {value: 'draft', title: 'Under arbete'},
  {value: 'review', title: 'Klar att publicera'},
  {value: 'published', title: 'Publicerad i innehållsmodellen'},
  {value: 'archived', title: 'Arkiverad'},
]

const optional = (value: string) => value.trim() || undefined
const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)

function loadedDraft(project: ProjectEditableSnapshot): EditorDraft {
  return {
    title: project.title || '',
    slug: project.slug || '',
    language: project.language || '',
    translationKey: project.translationKey || '',
    translationStatus: project.translationStatus || 'not-started',
    location: project.location || '',
    year: project.year === undefined ? '' : String(project.year),
    typology: project.typology || '',
    client: project.client || '',
    team: (project.team || []).join('\n'),
    services: (project.services || []).join('\n'),
    status: project.status || 'draft',
    summary: project.summary || '',
    seoTitle: project.seoTitle || '',
    seoDescription: project.seoDescription || '',
    reviewNotes: project.reviewNotes || '',
    publishChecklist: {
      factsConfirmed: project.publishChecklist?.factsConfirmed === true,
      languageChecked: project.publishChecklist?.languageChecked === true,
      seoChecked: project.publishChecklist?.seoChecked === true,
      imagesChecked: project.publishChecklist?.imagesChecked === true,
    },
  }
}

function normalizedPatch(draft: EditorDraft): ProjectContentPatch {
  return {
    title: draft.title.trim(),
    slug: {_type: 'slug', current: draft.slug.trim()},
    language: draft.language,
    translationKey: optional(draft.translationKey),
    translationStatus: draft.translationStatus,
    location: optional(draft.location),
    year: draft.year === '' ? undefined : Number(draft.year),
    typology: optional(draft.typology),
    client: optional(draft.client),
    team: lines(draft.team),
    services: lines(draft.services),
    status: draft.status,
    summary: draft.summary.trim(),
    seoTitle: optional(draft.seoTitle),
    seoDescription: optional(draft.seoDescription),
    reviewNotes: optional(draft.reviewNotes),
    publishChecklist: {...draft.publishChecklist},
  }
}

export function ProjectContentEditor({
  project,
  saving,
  onDirtyChange,
  onSave,
  onOpenAdvanced,
}: Props) {
  const loaded = useMemo(() => loadedDraft(project), [project])
  const [draft, setDraft] = useState<EditorDraft>(loaded)
  const [showErrors, setShowErrors] = useState(false)
  const prefix = useId()

  useEffect(() => {
    setDraft(loaded)
    setShowErrors(false)
  }, [loaded])

  const dirty = JSON.stringify(draft) !== JSON.stringify(loaded)
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const validationValue = {
    ...draft,
    year: draft.year,
  }
  const errors = validateProjectContentPatch(validationValue)
  const errorEntries = Object.entries(errors)
  const identityLocked = project.status === 'published'

  const set = <Key extends keyof EditorDraft>(key: Key, value: EditorDraft[Key]) => {
    setDraft((current) => ({...current, [key]: value}))
  }

  const save = async () => {
    setShowErrors(true)
    if (errorEntries.length) return
    try {
      await onSave(normalizedPatch(draft))
    } catch {
      // The parent keeps the unsaved form values and presents the actionable draft-only error.
    }
  }

  return (
    <Card padding={[3, 4]} radius={2} border>
      <Stack space={5}>
        <Box>
          <Heading as="h3" size={2}>
            Komplett projektredigering
          </Heading>
          <Text as="p" size={1} muted>
            Vanliga projekt-, innehålls- och SEO-fält redigeras här och sparas tillsammans till
            projektets kladd. Fälten för längre formaterad text och projektreferenser öppnas i
            Sanitys native-formulär eftersom deras inbyggda Portable Text- och referensgränssnitt
            inte bäddas in säkert i denna fristående arbetsytemodul.
          </Text>
        </Box>

        {dirty && (
          <Card padding={3} radius={2} border tone="caution" role="status">
            <Stack space={2}>
              <Text size={1}>
                Osparade projektändringar finns. Projektbyte, mediaåtgärder och avancerade
                Sanity-fält är spärrade tills du sparar eller återställer.
              </Text>
              <Box>
                <Button
                  mode="ghost"
                  text="Återställ alla fält till senast laddade kladd"
                  aria-label="Återställ alla projektfält till exakt senast laddade värden"
                  disabled={saving}
                  onClick={() => {
                    setDraft(loaded)
                    setShowErrors(false)
                  }}
                />
              </Box>
            </Stack>
          </Card>
        )}

        {showErrors && errorEntries.length > 0 && (
          <Card padding={3} radius={2} border tone="critical" role="alert">
            <Stack space={2}>
              <Text weight="semibold">Kladden sparades inte. Rätta följande fält:</Text>
              <ul className="esencial-content-media__error-list">
                {errorEntries.map(([field, message]) => (
                  <li key={field}>
                    <a href={`#${prefix}-${field}`}>{message}</a>
                  </li>
                ))}
              </ul>
            </Stack>
          </Card>
        )}

        <EditorGroup heading="Grunduppgifter" id={`${prefix}-basics`}>
          <div className="esencial-content-media__form-grid">
            <StringField
              id={`${prefix}-title`}
              label="Projektrubrik"
              value={draft.title}
              required
              error={showErrors ? errors.title : undefined}
              onChange={(value) => set('title', value)}
            />
            <StringField
              id={`${prefix}-slug`}
              label="Permanent webbadress"
              value={draft.slug}
              required
              disabled={identityLocked}
              helper={
                identityLocked
                  ? 'Låst medan den laddade kladden har publiceringsläge Publicerad. Spara först ett annat publiceringsläge.'
                  : 'Små bokstäver, siffror och bindestreck.'
              }
              error={showErrors ? errors.slug : undefined}
              onChange={(value) => set('slug', value)}
            />
            <SelectField
              id={`${prefix}-language`}
              label="Språk"
              value={draft.language}
              error={showErrors ? errors.language : undefined}
              options={[
                {value: '', title: 'Välj språk…'},
                {value: 'sv', title: 'Svenska'},
                {value: 'en', title: 'English'},
              ]}
              onChange={(value) => set('language', value)}
            />
            <StringField
              id={`${prefix}-translationKey`}
              label="Språkkoppling"
              value={draft.translationKey || ''}
              disabled={identityLocked}
              helper="Samma godkända nyckel ska användas i båda språkversionerna."
              error={showErrors ? errors.translationKey : undefined}
              onChange={(value) => set('translationKey', value)}
            />
            <SelectField
              id={`${prefix}-translationStatus`}
              label="Översättningsstatus"
              value={draft.translationStatus}
              options={translationStatuses}
              onChange={(value) => set('translationStatus', value)}
            />
            <StringField
              id={`${prefix}-location`}
              label="Publicerad plats"
              value={draft.location || ''}
              onChange={(value) => set('location', value)}
            />
            <StringField
              id={`${prefix}-year`}
              label="År"
              type="number"
              value={draft.year}
              error={showErrors ? errors.year : undefined}
              onChange={(value) => set('year', value)}
            />
            <StringField
              id={`${prefix}-typology`}
              label="Typologi"
              value={draft.typology || ''}
              onChange={(value) => set('typology', value)}
            />
            <StringField
              id={`${prefix}-client`}
              label="Beställare"
              value={draft.client || ''}
              helper="Ange endast namn som får publiceras."
              onChange={(value) => set('client', value)}
            />
            <SelectField
              id={`${prefix}-status`}
              label="Publiceringsläge i innehållsmodellen"
              value={draft.status}
              options={publicationStatuses}
              helper="Detta publicerar inte dokumentet. Sanitys native publiceringsknapp är alltid ett separat steg."
              onChange={(value) => set('status', value)}
            />
          </div>
          <div className="esencial-content-media__form-grid">
            <AreaField
              id={`${prefix}-team`}
              label="Arkitekt / team"
              value={draft.team}
              rows={4}
              helper="En godkänd person eller roll per rad."
              onChange={(value) => set('team', value)}
            />
            <AreaField
              id={`${prefix}-services`}
              label="Uppdrag / omfattning"
              value={draft.services}
              rows={4}
              helper="En bekräftad tjänst per rad."
              onChange={(value) => set('services', value)}
            />
          </div>
        </EditorGroup>

        <EditorGroup heading="Projektinnehåll" id={`${prefix}-content`}>
          <AreaField
            id={`${prefix}-summary`}
            label="Kort projektintroduktion"
            value={draft.summary}
            rows={6}
            required
            helper={`${draft.summary.trim().length}/700 tecken · minst 40`}
            error={showErrors ? errors.summary : undefined}
            onChange={(value) => set('summary', value)}
          />
          <Inline space={2} className="esencial-content-media__actions">
            <Button
              mode="ghost"
              text="Redigera längre projektberättelse i Sanity"
              aria-label="Öppna native Portable Text-redigering för längre projektberättelse"
              disabled={dirty || saving}
              onClick={() => onOpenAdvanced('body')}
            />
            <Button
              mode="ghost"
              text="Redigera relaterade projekt i Sanity"
              aria-label="Öppna Sanitys native referensväljare för relaterade projekt"
              disabled={dirty || saving}
              onClick={() => onOpenAdvanced('relatedProjects')}
            />
          </Inline>
        </EditorGroup>

        <EditorGroup heading="SEO och granskning" id={`${prefix}-seo`}>
          <div className="esencial-content-media__form-grid">
            <StringField
              id={`${prefix}-seoTitle`}
              label="Titel i Google"
              value={draft.seoTitle || ''}
              helper={`${(draft.seoTitle || '').length}/60 tecken`}
              error={showErrors ? errors.seoTitle : undefined}
              onChange={(value) => set('seoTitle', value)}
            />
            <AreaField
              id={`${prefix}-seoDescription`}
              label="Beskrivning i Google"
              value={draft.seoDescription || ''}
              rows={4}
              helper={`${(draft.seoDescription || '').length}/160 tecken`}
              error={showErrors ? errors.seoDescription : undefined}
              onChange={(value) => set('seoDescription', value)}
            />
          </div>
          <AreaField
            id={`${prefix}-reviewNotes`}
            label="Egna anteckningar"
            value={draft.reviewNotes || ''}
            rows={4}
            onChange={(value) => set('reviewNotes', value)}
          />
          <fieldset className="esencial-content-media__fieldset">
            <legend>Egenkontroll före publicering</legend>
            <Text size={1} muted>
              Checklistan sparas i kladden. Sanitys fullständiga validering avgör fortfarande om
              dokumentet kan publiceras.
            </Text>
            <div className="esencial-content-media__check-grid">
              {[
                ['factsConfirmed', 'Projektfakta är godkända'],
                ['languageChecked', 'Språk och översättning är kontrollerade'],
                ['seoChecked', 'Titel och beskrivning är kontrollerade'],
                ['imagesChecked', 'Alt-text, kredit och rättigheter är kontrollerade'],
              ].map(([key, label]) => {
                const checklistKey = key as keyof Checklist
                const id = `${prefix}-${key}`
                return (
                  <label key={key} htmlFor={id} className="esencial-content-media__check-row">
                    <Checkbox
                      id={id}
                      checked={draft.publishChecklist[checklistKey]}
                      onChange={(event) =>
                        set('publishChecklist', {
                          ...draft.publishChecklist,
                          [checklistKey]: event.currentTarget.checked,
                        })
                      }
                    />
                    <Text size={1}>{label}</Text>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </EditorGroup>

        <Card padding={3} radius={2} border>
          <Text size={1}>
            <strong>Kladdskydd:</strong> Spara skapar vid behov{' '}
            <code>drafts.{project._id.replace(/^drafts\./, '')}</code> och uppdaterar endast det
            dokumentet. Den publicerade versionen, assetbiblioteket och Sanitys native
            publiceringsåtgärd ändras inte.
          </Text>
        </Card>

        <Inline space={2} className="esencial-content-media__actions">
          <Button
            text="Spara alla projektfält som kladd"
            disabled={!dirty || saving}
            onClick={() => void save()}
          />
          <Button
            mode="ghost"
            text="Återställ senast laddade kladd"
            disabled={!dirty || saving}
            onClick={() => {
              setDraft(loaded)
              setShowErrors(false)
            }}
          />
        </Inline>
      </Stack>
    </Card>
  )
}

function EditorGroup({
  heading,
  id,
  children,
}: {
  heading: string
  id: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="esencial-content-media__editor-group">
      <Stack space={4}>
        <Heading as="h4" id={id} size={1}>
          {heading}
        </Heading>
        {children}
      </Stack>
    </section>
  )
}

function StringField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required,
  disabled,
  helper,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number'
  required?: boolean
  disabled?: boolean
  helper?: string
  error?: string
}) {
  return (
    <Stack space={2}>
      <label htmlFor={id}>
        <Text size={1} weight="semibold">
          {label}
          {required ? ' *' : ''}
        </Text>
      </label>
      <TextInput
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [helper && `${id}-helper`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
        }
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {helper && (
        <Text id={`${id}-helper`} size={1} muted>
          {helper}
        </Text>
      )}
      {error && (
        <Text id={`${id}-error`} size={1} role="alert" className="esencial-content-media__error">
          {error}
        </Text>
      )}
    </Stack>
  )
}

function AreaField({
  id,
  label,
  value,
  onChange,
  rows,
  required,
  helper,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  rows: number
  required?: boolean
  helper?: string
  error?: string
}) {
  return (
    <Stack space={2}>
      <label htmlFor={id}>
        <Text size={1} weight="semibold">
          {label}
          {required ? ' *' : ''}
        </Text>
      </label>
      <TextArea
        id={id}
        rows={rows}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [helper && `${id}-helper`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
        }
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {helper && (
        <Text id={`${id}-helper`} size={1} muted>
          {helper}
        </Text>
      )}
      {error && (
        <Text id={`${id}-error`} size={1} role="alert" className="esencial-content-media__error">
          {error}
        </Text>
      )}
    </Stack>
  )
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  helper,
  error,
}: {
  id: string
  label: string
  value: string
  options: Array<{value: string; title: string}>
  onChange: (value: string) => void
  helper?: string
  error?: string
}) {
  return (
    <Stack space={2}>
      <label htmlFor={id}>
        <Text size={1} weight="semibold">
          {label}
        </Text>
      </label>
      <Select
        id={id}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [helper && `${id}-helper`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
        }
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.title}
          </option>
        ))}
      </Select>
      {helper && (
        <Text id={`${id}-helper`} size={1} muted>
          {helper}
        </Text>
      )}
      {error && (
        <Text id={`${id}-error`} size={1} role="alert" className="esencial-content-media__error">
          {error}
        </Text>
      )}
    </Stack>
  )
}
