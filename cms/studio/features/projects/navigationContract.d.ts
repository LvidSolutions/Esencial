export type ProjectRecord = {
  _id: string
  title?: string
  language?: string
  translationKey?: string
  status?: string
}

export type FilterCategoryRecord = {
  _id?: string
  key?: string
  labelSv?: string
  labelEn?: string
  order?: number
  visible?: boolean
  projectRefs?: string[]
}

export type GridEntryRecord = {
  projectRef?: string
  includeInGrid?: boolean
}

export type NavigationSettingsRecord = {
  enabled?: boolean
  headingSv?: string
  headingEn?: string
  allLabelSv?: string
  allLabelEn?: string
  gridEntries?: GridEntryRecord[]
}

export const FILTER_CATEGORY_SCHEMA_FIELDS: readonly string[]
export const NAVIGATION_SETTINGS_SCHEMA_FIELDS: readonly string[]
export function canonicalDocumentId(id?: string): string
export function validateFilterCategoryDocument(
  category: FilterCategoryRecord | undefined,
  projects: ProjectRecord[],
): string[]
export function validateNavigationSettingsDocument(
  settings: NavigationSettingsRecord | undefined,
  projects: ProjectRecord[],
): string[]
export function resolveProjectNavigation<T>(input: {
  projects: ProjectRecord[]
  categories: FilterCategoryRecord[]
  settings?: NavigationSettingsRecord
  legacy: T
}): {
  mode: 'legacy' | 'fallback' | 'configured'
  reason: string | null
  data:
    | T
    | {
        headings: {sv: string; en: string}
        allLabels: {sv: string; en: string}
        projectsByLanguage: {sv: ProjectRecord[]; en: ProjectRecord[]}
        categories: Array<{
          key: string
          labels: {sv: string; en: string}
          projectIdsByLanguage: {sv: string[]; en: string[]}
        }>
      }
}
