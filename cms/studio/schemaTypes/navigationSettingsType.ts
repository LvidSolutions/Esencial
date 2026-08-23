import {defineField, defineType, type SanityDocument, type ValidationContext} from 'sanity'
import {
  canonicalDocumentId,
  validateNavigationSettingsDocument,
} from '../features/projects/navigationContract.mjs'

type ReferenceValue = {_ref?: string}
type GridEntry = {_key?: string; project?: ReferenceValue; includeInGrid?: boolean}
type NavigationSettingsDocument = SanityDocument & {
  enabled?: boolean
  headingSv?: string
  headingEn?: string
  allLabelSv?: string
  allLabelEn?: string
  gridProjects?: GridEntry[]
}
type ProjectCandidate = {
  _id: string
  title?: string
  language?: string
  translationKey?: string
  status?: string
}

const apiVersion = '2025-02-19'

async function validateNavigationSettings(
  document: NavigationSettingsDocument | undefined,
  context: ValidationContext,
) {
  if (!document || document.enabled !== true) return true
  const currentId = canonicalDocumentId(document._id || '')
  if (currentId !== 'navigationSettings') {
    return 'Projektets navigeringsinställningar måste använda singleton-dokumentet navigationSettings.'
  }
  const projectRefs = (document.gridProjects || [])
    .map((entry) => entry?.project?._ref || '')
    .filter(Boolean)
  const canonicalIds = projectRefs.map(canonicalDocumentId)
  const ids = [...canonicalIds, ...canonicalIds.map((id) => `drafts.${id}`)]
  const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
  const selected = ids.length
    ? await client.fetch<ProjectCandidate[]>(
        `*[_type == "project" && _id in $ids] {_id, title, language, translationKey, status}`,
        {ids},
      )
    : []
  const translationKeys = [
    ...new Set(selected.map((project) => project.translationKey).filter(Boolean)),
  ]
  const projects = translationKeys.length
    ? await client.fetch<ProjectCandidate[]>(
        `*[_type == "project" && translationKey in $translationKeys] {_id, title, language, translationKey, status}`,
        {translationKeys},
      )
    : selected
  const problems = validateNavigationSettingsDocument(
    {
      enabled: document.enabled,
      headingSv: document.headingSv,
      headingEn: document.headingEn,
      allLabelSv: document.allLabelSv,
      allLabelEn: document.allLabelEn,
      gridEntries: (document.gridProjects || []).map((entry) => ({
        projectRef: entry?.project?._ref,
        includeInGrid: entry?.includeInGrid,
      })),
    },
    projects,
  )
  return problems.length ? problems.join(' ') : true
}

const hiddenUntilEnabled = ({document}: {document?: SanityDocument}) => document?.enabled !== true

export const navigationSettingsType = defineType({
  name: 'navigationSettings',
  title: 'Projektrutnät och filteretiketter',
  type: 'document',
  validation: (Rule) => Rule.custom(validateNavigationSettings),
  fields: [
    defineField({
      name: 'enabled',
      title: 'Använd redaktionell projektordning och filter',
      type: 'boolean',
      initialValue: false,
      description:
        'Avstängd eller saknad inställning behåller exakt nuvarande projektrutnät, ordning och filter. Slå på först när hela konfigurationen är granskad.',
    }),
    defineField({
      name: 'headingSv',
      title: 'Projektrubrik på svenska',
      type: 'string',
      hidden: hiddenUntilEnabled,
      description: 'Skriv endast den rubrik som Esencial har godkänt för den svenska projektvyn.',
      validation: (Rule) =>
        Rule.custom((value, context) =>
          !context.document?.enabled || value ? true : 'Ange svensk projektrubrik.',
        ),
    }),
    defineField({
      name: 'headingEn',
      title: 'Project heading in English',
      type: 'string',
      hidden: hiddenUntilEnabled,
      description:
        'Enter an approved English heading; do not generate a translation from the Swedish text.',
      validation: (Rule) =>
        Rule.custom((value, context) =>
          !context.document?.enabled || value ? true : 'Enter the English project heading.',
        ),
    }),
    defineField({
      name: 'allLabelSv',
      title: 'Etikett för alla projekt på svenska',
      type: 'string',
      hidden: hiddenUntilEnabled,
      validation: (Rule) =>
        Rule.custom((value, context) =>
          !context.document?.enabled || value ? true : 'Ange svensk etikett för alla projekt.',
        ),
    }),
    defineField({
      name: 'allLabelEn',
      title: 'All-projects label in English',
      type: 'string',
      hidden: hiddenUntilEnabled,
      validation: (Rule) =>
        Rule.custom((value, context) =>
          !context.document?.enabled || value ? true : 'Enter the English all-projects label.',
        ),
    }),
    defineField({
      name: 'gridProjects',
      title: 'Projektpar i rutnätet',
      type: 'array',
      hidden: hiddenUntilEnabled,
      description:
        'Listans ordning är webbplatsens ordning. Välj ett svenskt projekt per bekräftat språkpar och ange uttryckligen om paret ska visas.',
      of: [
        {
          type: 'object',
          name: 'projectGridEntry',
          fields: [
            defineField({
              name: 'project',
              title: 'Projektpar',
              type: 'reference',
              to: [{type: 'project'}],
              options: {filter: 'language == "sv" && status == "published"'},
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'includeInGrid',
              title: 'Visa i projektrutnätet',
              type: 'boolean',
              initialValue: true,
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {title: 'project.title', included: 'includeInGrid'},
            prepare: ({title, included}) => ({
              title: title || 'Välj projektpar',
              subtitle: included ? 'Visas i rutnätet' : 'Exkluderat från rutnätet',
            }),
          },
        },
      ],
      validation: (Rule) =>
        Rule.custom((value, context) =>
          !context.document?.enabled || (Array.isArray(value) && value.length > 0)
            ? true
            : 'Lägg till minst ett uttryckligt projektpar.',
        ),
    }),
  ],
  preview: {
    select: {enabled: 'enabled'},
    prepare: ({enabled}) => ({
      title: 'Projektrutnät och filteretiketter',
      subtitle: enabled
        ? 'Redaktionell konfiguration aktiverad'
        : 'Nuvarande frontend används oförändrad',
    }),
  },
})
