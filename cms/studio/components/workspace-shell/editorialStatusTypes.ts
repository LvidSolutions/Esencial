export type EditorialStatusProject = {
  _id: string
  _originalId?: string
  _updatedAt?: string
  title?: string
  language?: string
  status?: string
  hasSeo?: boolean
  hasHeroImage?: boolean
  hasTranslationKey?: boolean
  translationApproved?: boolean
}

export type EditorialStatusQueueId = 'ready' | 'recent' | 'incomplete' | 'translation'

export type EditorialStatusQueue = {
  id: EditorialStatusQueueId
  total: number
  items: EditorialStatusProject[]
}
