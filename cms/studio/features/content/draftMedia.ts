import type {SanityClient} from 'sanity'
import {assertDraftDocumentId, createMediaRemovalPlan} from './contentWorkspaceContract.mjs'
import {ensureProjectDraft, type ProjectDraftDocument} from './draftProject'

export type MediaUndo = {
  draftId: string
  field: string
  previousFieldValue: unknown
  removalRevision: string
  target: MediaRemovalTarget
}

export type MediaRemovalTarget = {
  kind: 'hero' | 'gallery' | 'cardImage' | 'slideshowImage' | 'floorPlan' | 'previousImage'
  key?: string
  index?: number
}

export async function removeMediaReferenceFromDraft(
  client: SanityClient,
  projectId: string,
  target: MediaRemovalTarget,
): Promise<MediaUndo> {
  const draft = await ensureProjectDraft(client, projectId)
  const plan = createMediaRemovalPlan(draft.document, target)
  let patch = draft.client.patch(draft.draftId)
  if (draft.document._rev) patch = patch.ifRevisionId(draft.document._rev)
  patch =
    plan.nextFieldValue === undefined
      ? patch.unset([plan.field])
      : patch.set({[plan.field]: plan.nextFieldValue})
  const result = await patch.commit({autoGenerateArrayKeys: true})
  return {
    draftId: draft.draftId,
    field: plan.field,
    previousFieldValue: plan.previousFieldValue,
    removalRevision: result._rev,
    target: plan.target,
  }
}

export async function restoreMediaReferenceToDraft(client: SanityClient, undo: MediaUndo) {
  const rawClient = client.withConfig({perspective: 'raw', useCdn: false})
  const draftId = assertDraftDocumentId(undo.draftId)
  const current = await rawClient.getDocument<ProjectDraftDocument>(draftId)
  if (!current) throw new Error('Projektkladden saknas. Återställ via Sanitys dokumenthistorik.')
  if (current._rev !== undo.removalRevision) {
    throw new Error(
      'Kladden har ändrats efter borttagningen. Automatisk återställning stoppades för att skydda de senare ändringarna; öppna dokumenthistoriken i Sanity.',
    )
  }
  let patch = rawClient.patch(draftId).ifRevisionId(current._rev)
  patch =
    undo.previousFieldValue === undefined
      ? patch.unset([undo.field])
      : patch.set({[undo.field]: undo.previousFieldValue})
  return patch.commit({autoGenerateArrayKeys: true})
}
