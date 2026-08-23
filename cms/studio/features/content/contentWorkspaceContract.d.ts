export type ProjectFieldDefinition = {path: string; label: string}
export type ProjectFieldGroup = {
  id: string
  title: string
  fields: readonly ProjectFieldDefinition[]
}
export type MediaRemovalTarget = {
  kind: 'hero' | 'gallery' | 'floorPlan' | 'previousImage'
  key?: string
  index?: number
}
export type MediaRemovalPlan = {
  field: 'heroImage' | 'galleryImages' | 'floorPlans' | 'images'
  nextFieldValue: unknown
  previousFieldValue: unknown
  removedValue: unknown
  target: MediaRemovalTarget
}

export const CONTENT_MEDIA_SECTION_ID: 'content-media'
export const CONTENT_MEDIA_SECTION_SUMMARY: string
export const PROJECT_FIELD_GROUPS: readonly ProjectFieldGroup[]
export const PROJECT_EDITABLE_FIELD_PATHS: readonly string[]
export const PROJECT_INLINE_FIELD_PATHS: readonly string[]
export const PROJECT_NATIVE_FIELD_PATHS: readonly string[]
export const PROJECT_MEDIA_FIELDS: readonly {
  path: string
  label: string
  removable: boolean
}[]
export const PROJECT_REVIEW_ONLY_FIELDS: readonly {path: string; label: string}[]
export const MEDIA_REMOVAL_WARNING: string
export function canonicalDocumentId(id?: string): string
export function draftDocumentId(id?: string): string
export function assertDraftDocumentId(id: string): string
export function projectFieldIntent(id: string, path: string): string
export function validateProjectContentPatch(value: Record<string, unknown>): Record<string, string>
export function createMediaRemovalPlan(
  document: Record<string, unknown>,
  target: MediaRemovalTarget,
): MediaRemovalPlan
export function responsiveContentLayout(
  viewportWidth: number,
  zoom?: number,
): 'single-column-compact' | 'single-column' | 'multi-column'
