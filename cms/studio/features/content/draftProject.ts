import type {SanityClient} from 'sanity'
import {assertDraftDocumentId, draftDocumentId} from './contentWorkspaceContract.mjs'

export type ProjectDraftDocument = {
  _id: string
  _type: 'project'
  _rev?: string
  [key: string]: unknown
}

const systemFields = new Set(['_id', '_rev', '_createdAt', '_updatedAt', '_originalId'])

function clonePublishedAsDraft(
  published: ProjectDraftDocument,
  draftId: string,
): ProjectDraftDocument {
  const draft: ProjectDraftDocument = {_id: draftId, _type: 'project'}
  for (const [key, value] of Object.entries(published)) {
    if (!systemFields.has(key) && key !== '_type') draft[key] = value
  }
  return draft
}

export async function ensureProjectDraft(client: SanityClient, id: string) {
  const rawClient = client.withConfig({perspective: 'raw', useCdn: false})
  const draftId = assertDraftDocumentId(draftDocumentId(id))
  const existing = await rawClient.getDocument<ProjectDraftDocument>(draftId)
  if (existing) return {client: rawClient, document: existing, draftId}

  const publishedId = draftId.replace(/^drafts\./, '')
  const published = await rawClient.getDocument<ProjectDraftDocument>(publishedId)
  if (!published) throw new Error('Projektet kunde inte läsas. Ingen kladdändring genomfördes.')
  await rawClient.createIfNotExists(clonePublishedAsDraft(published, draftId))
  const created = await rawClient.getDocument<ProjectDraftDocument>(draftId)
  if (!created) throw new Error('Projektkladden kunde inte skapas. Ingen ändring genomfördes.')
  return {client: rawClient, document: created, draftId}
}

export async function patchProjectDraftFields(
  client: SanityClient,
  id: string,
  patchValue: Record<string, unknown>,
) {
  const draft = await ensureProjectDraft(client, id)
  let patch = draft.client.patch(draft.draftId)
  if (draft.document._rev) patch = patch.ifRevisionId(draft.document._rev)
  const setValues: Record<string, unknown> = {}
  const unsetPaths: string[] = []
  for (const [field, value] of Object.entries(patchValue)) {
    if (value === undefined) unsetPaths.push(field)
    else setValues[field] = value
  }
  if (Object.keys(setValues).length) patch = patch.set(setValues)
  if (unsetPaths.length) patch = patch.unset(unsetPaths)
  return patch.commit({autoGenerateArrayKeys: true})
}
