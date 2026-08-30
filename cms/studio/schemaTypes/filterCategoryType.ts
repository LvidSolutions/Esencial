import {defineField, defineType, type SanityDocument, type ValidationContext} from 'sanity'
import {
  canonicalDocumentId,
  validateFilterCategoryDocument,
} from '../features/projects/navigationContract.mjs'

type ReferenceValue = {_ref?: string}
type FilterCategoryDocument = SanityDocument & {
  key?: string
  labelSv?: string
  labelEn?: string
  order?: number
  visible?: boolean
  projects?: ReferenceValue[]
  projectOrder?: ReferenceValue[]
}
type ProjectCandidate = {
  _id: string
  title?: string
  language?: string
  translationKey?: string
  status?: string
}
type CategoryCandidate = {_id: string; key?: string; order?: number}

const apiVersion = '2025-02-19'

async function projectCandidates(referenceIds: string[], context: ValidationContext) {
  if (!referenceIds.length) return []
  const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
  const canonicalIds = referenceIds.map(canonicalDocumentId)
  const ids = [...canonicalIds, ...canonicalIds.map((id) => `drafts.${id}`)]
  const selected = await client.fetch<ProjectCandidate[]>(
    `*[_type == "project" && _id in $ids] {_id, title, language, translationKey, status}`,
    {ids},
  )
  const translationKeys = [
    ...new Set(selected.map((project) => project.translationKey).filter(Boolean)),
  ]
  if (!translationKeys.length) return selected
  return client.fetch<ProjectCandidate[]>(
    `*[_type == "project" && translationKey in $translationKeys] {_id, title, language, translationKey, status}`,
    {translationKeys},
  )
}

async function validateCategory(
  document: FilterCategoryDocument | undefined,
  context: ValidationContext,
) {
  if (!document) return true
  const projectRefs = (document.projects || [])
    .map((reference) => reference?._ref || '')
    .filter(Boolean)
  const orderedRefs = (document.projectOrder || [])
    .map((reference) => reference?._ref || '')
    .filter(Boolean)
  const projects = await projectCandidates(projectRefs, context)
  const problems = validateFilterCategoryDocument(
    {
      _id: document._id,
      key: document.key,
      labelSv: document.labelSv,
      labelEn: document.labelEn,
      order: document.order,
      visible: document.visible,
      projectRefs,
    },
    projects,
  )

  if (orderedRefs.length) {
    const categoryProjects = new Set(projectRefs.map(canonicalDocumentId))
    const orderedProjects = new Set(orderedRefs.map(canonicalDocumentId))
    if (
      orderedRefs.length !== projectRefs.length ||
      orderedProjects.size !== categoryProjects.size ||
      [...orderedProjects].some((id) => !categoryProjects.has(id))
    ) {
      problems.push('Projektordningen måste innehålla exakt samma projektpar som kategorin.')
    }
  }

  const currentId = canonicalDocumentId(document._id || '')
  const client = context.getClient({apiVersion}).withConfig({perspective: 'raw'})
  if (currentId) {
    const publishedKey = await client.fetch<string | null>(`*[_id == $id][0].key`, {id: currentId})
    if (publishedKey && document.key !== publishedKey) {
      problems.push(`Den publicerade filternyckeln är “${publishedKey}” och får inte ändras.`)
    }
    const others = await client.fetch<CategoryCandidate[]>(
      `*[_type == "filterCategory" && !(_id in [$publishedId, $draftId])] {_id, key, order}`,
      {publishedId: currentId, draftId: `drafts.${currentId}`},
    )
    const distinctOthers = new Map<string, CategoryCandidate>()
    for (const candidate of others) {
      const id = canonicalDocumentId(candidate._id)
      const existing = distinctOthers.get(id)
      if (!existing || candidate._id.startsWith('drafts.')) distinctOthers.set(id, candidate)
    }
    if (
      document.key &&
      [...distinctOthers.values()].some((candidate) => candidate.key === document.key)
    ) {
      problems.push(`Filternyckeln “${document.key}” används redan av en annan kategori.`)
    }
    if (
      Number.isInteger(document.order) &&
      [...distinctOthers.values()].some((candidate) => candidate.order === document.order)
    ) {
      problems.push(`Filterordningen ${document.order} används redan av en annan kategori.`)
    }
  }

  return problems.length ? problems.join(' ') : true
}

export const filterCategoryType = defineType({
  name: 'filterCategory',
  title: 'Projektfilter',
  type: 'document',
  validation: (Rule) => Rule.custom(validateCategory),
  fields: [
    defineField({
      name: 'key',
      title: 'Stabil filternyckel',
      type: 'string',
      description:
        'Teknisk nyckel som används av både filternavigering och projektrutnät. Den låses av valideringen efter första publicering.',
      validation: (Rule) =>
        Rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          name: 'små bokstäver, siffror och enkla bindestreck',
        }),
    }),
    defineField({
      name: 'labelSv',
      title: 'Etikett på svenska',
      type: 'string',
      description:
        'Visas i projektfiltrets navigering. Använd endast en redaktionellt godkänd etikett.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'labelEn',
      title: 'Label in English',
      type: 'string',
      description: 'Used by the same filter navigation on the English project grid.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Ordning',
      type: 'number',
      description: 'Lägst nummer visas först. Varje kategori måste ha ett unikt heltal.',
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: 'visible',
      title: 'Visa i filternavigeringen',
      type: 'boolean',
      initialValue: false,
      description:
        'Dold är säkert standardläge tills båda etiketterna och medlemskapet är granskat.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'projects',
      title: 'Projektpar i kategorin',
      type: 'array',
      description:
        'Välj den svenska medlemmen i varje bekräftat projektpar. Båda språkversionerna omfattas uttryckligen av valet; inga medlemskap skapas automatiskt.',
      of: [
        {
          type: 'reference',
          to: [{type: 'project'}],
          options: {filter: 'language == "sv" && status == "published"'},
        },
      ],
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({
      name: 'projectOrder',
      title: 'Projektordning i detta filter',
      type: 'array',
      description:
        'Valfri egen ordning för detta filter. Första projektet visas uppe till vänster, andra uppe till höger, tredje under det första. Om fältet är tomt används ordningen i Projektpar i kategorin.',
      of: [
        {
          type: 'reference',
          to: [{type: 'project'}],
          options: {filter: 'language == "sv" && status == "published"'},
        },
      ],
      validation: (Rule) => Rule.unique(),
    }),
  ],
  preview: {
    select: {title: 'labelSv', english: 'labelEn', key: 'key', visible: 'visible', order: 'order'},
    prepare: ({title, english, key, visible, order}) => ({
      title: title || english || 'Namnlöst filter',
      subtitle: `${visible ? 'Synlig' : 'Dold'} · ${key || 'nyckel saknas'} · ordning ${order ?? 'saknas'}`,
    }),
  },
})
