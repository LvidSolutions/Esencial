import type {SanityClient} from 'sanity'
import {canonicalDocumentId} from './navigationContract.mjs'

export async function patchDraft(
  client: SanityClient,
  id: string,
  type: string,
  patch: Record<string, unknown>,
) {
  const publishedId = canonicalDocumentId(id)
  const draftId = `drafts.${publishedId}`
  const existingDraft = await client.getDocument(draftId)
  if (!existingDraft) {
    const published = await client.getDocument<Record<string, unknown>>(publishedId)
    const draft: Record<string, unknown> = {_id: draftId, _type: type}
    for (const [key, value] of Object.entries(published || {})) {
      if (!key.startsWith('_')) draft[key] = value
    }
    await client.createIfNotExists(draft as {_id: string; _type: string})
  }
  await client.patch(draftId).set(patch).commit({autoGenerateArrayKeys: true})
  return draftId
}

function arrayKey(id: string, prefix: string) {
  const stable = canonicalDocumentId(id)
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 80)
  return `${prefix}-${stable}`
}

export function projectReferences(ids: string[]) {
  return ids.map((id) => ({
    _key: arrayKey(id, 'filter'),
    _type: 'reference',
    _ref: canonicalDocumentId(id),
  }))
}

export function gridReferences(entries: Array<{projectRef?: string; includeInGrid?: boolean}>) {
  return entries
    .filter((entry): entry is {projectRef: string; includeInGrid?: boolean} =>
      Boolean(entry.projectRef),
    )
    .map((entry) => ({
      _key: arrayKey(entry.projectRef, 'grid'),
      _type: 'projectGridEntry',
      includeInGrid: entry.includeInGrid === true,
      project: {_type: 'reference', _ref: canonicalDocumentId(entry.projectRef)},
    }))
}
