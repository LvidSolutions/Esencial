import type {SanityClient} from 'sanity'
import {ensureProjectDraft, type ProjectDraftDocument} from './draftProject'

type CreatedProjectPair = {
  svId: string
  enId: string
  translationKey: string
}

function identifierPart() {
  return (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 12)
    .toLowerCase()
}

/**
 * Creates the initial Swedish and English drafts in one transaction. The pair deliberately
 * contains only neutral structural values; editorial copy is never copied between languages.
 */
export async function createProjectLanguagePair(client: SanityClient): Promise<CreatedProjectPair> {
  const rawClient = client.withConfig({perspective: 'raw', useCdn: false})
  const suffix = identifierPart()
  const translationKey = `project_${suffix}`
  const slug = `new-project-${suffix}`
  const svId = `drafts.project-${suffix}-sv`
  const enId = `drafts.project-${suffix}-en`
  const shared = {
    _type: 'project' as const,
    slug: {_type: 'slug' as const, current: slug},
    translationKey,
    translationStatus: 'not-started',
    status: 'draft',
    imageRightsConfirmed: false,
    publishChecklist: {
      factsConfirmed: false,
      languageChecked: false,
      seoChecked: false,
      imagesChecked: false,
    },
  }

  await rawClient
    .transaction()
    .create({_id: svId, ...shared, language: 'sv', title: 'Nytt projekt', summary: ''})
    .create({_id: enId, ...shared, language: 'en', title: 'New project', summary: ''})
    .commit()

  return {svId, enId, translationKey}
}

const sharedFields = [
  'slug',
  'translationKey',
  'cardImages',
  'slideshowImages',
  'presentationViews',
  'cardBackgroundPreset',
  // Retained only while a pre-reform project is being migrated to Kortbilder.
  'heroImage',
  'galleryImages',
] as const

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

/**
 * Mirrors the deliberately shared structural values to the other member of a language pair.
 * Editorial fields (title, summary, facts and SEO copy) are intentionally excluded.
 */
export async function synchronizeProjectPairSharedFields(client: SanityClient, id: string) {
  const rawClient = client.withConfig({perspective: 'raw', useCdn: false})
  const canonicalId = id.replace(/^drafts\./, '')
  let source =
    (await rawClient.getDocument<ProjectDraftDocument>(`drafts.${canonicalId}`)) ||
    (await rawClient.getDocument<ProjectDraftDocument>(canonicalId))
  if (!source?.translationKey || !source.language) return false

  // Swedish is the canonical editor for shared card and image values. English editorial copy
  // remains independent, but never becomes an accidental source for shared media.
  if (source.language !== 'sv') {
    const swedishId = await rawClient.fetch<string | null>(
      `*[_type == "project" && translationKey == $translationKey && language == "sv"][0]._id`,
      {translationKey: source.translationKey},
    )
    if (!swedishId) return false
    source =
      (await rawClient.getDocument<ProjectDraftDocument>(`drafts.${swedishId.replace(/^drafts\./, '')}`)) ||
      (await rawClient.getDocument<ProjectDraftDocument>(swedishId))
    if (!source) return false
  }

  const siblingId = await rawClient.fetch<string | null>(
    `*[_type == "project" && translationKey == $translationKey && language != $language && !(_id in [$draftId, $publishedId])][0]._id`,
    {
      translationKey: source.translationKey,
      language: source.language,
      draftId: `drafts.${canonicalId}`,
      publishedId: canonicalId,
    },
  )
  if (!siblingId) return false

  const target = await ensureProjectDraft(rawClient, siblingId)
  const patchValues: Record<string, unknown> = {}
  for (const field of sharedFields) {
    if (Object.prototype.hasOwnProperty.call(source, field) && !sameValue(source[field], target.document[field])) {
      patchValues[field] = source[field]
    }
  }
  if (!Object.keys(patchValues).length) return false
  let patch = target.client.patch(target.draftId)
  if (target.document._rev) patch = patch.ifRevisionId(target.document._rev)
  await patch.set(patchValues).commit({autoGenerateArrayKeys: true})
  return true
}
