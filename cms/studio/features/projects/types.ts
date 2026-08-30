export type ProjectLanguage = 'sv' | 'en'

export type ProjectSummary = {
  _id: string
  _originalId?: string
  title?: string
  slug?: string
  language?: string
  translationKey?: string
  status?: string
}

export type ProjectPair = {
  key: string
  sv?: ProjectSummary
  en?: ProjectSummary
  complete: boolean
  selectable: boolean
}

export type FilterCategory = {
  _id: string
  _originalId?: string
  key?: string
  labelSv?: string
  labelEn?: string
  order?: number
  visible?: boolean
  projectRefs: string[]
  projectOrder?: string[]
}

export type GridProjectEntry = {
  _key?: string
  projectRef?: string
  includeInGrid?: boolean
}

export type NavigationSettings = {
  _id?: string
  _originalId?: string
  enabled?: boolean
  headingSv?: string
  headingEn?: string
  allLabelSv?: string
  allLabelEn?: string
  gridEntries: GridProjectEntry[]
}

export type SaveState = 'loading' | 'saved' | 'saving' | 'error'

export type FeatureStatus = {
  state: SaveState
  label: string
}

export function projectPairs(projects: ProjectSummary[]) {
  const grouped = new Map<string, ProjectPair>()
  for (const project of projects) {
    const fallbackKey = `unpaired:${project._id.replace(/^drafts\./, '')}`
    const key = project.translationKey?.trim() || fallbackKey
    const pair = grouped.get(key) || {key, complete: false, selectable: false}
    if (project.language === 'sv') pair.sv = project
    if (project.language === 'en') pair.en = project
    grouped.set(key, pair)
  }
  return [...grouped.values()]
    .map((pair) => ({
      ...pair,
      complete: Boolean(pair.sv && pair.en),
      selectable: Boolean(
        pair.sv && pair.en && pair.sv.status === 'published' && pair.en.status === 'published',
      ),
    }))
    .sort((left, right) => {
      const leftTitle = left.sv?.title || left.en?.title || left.key
      const rightTitle = right.sv?.title || right.en?.title || right.key
      return leftTitle.localeCompare(rightTitle, 'sv')
    })
}

export function pairLabel(pair: ProjectPair) {
  const swedish = pair.sv?.title?.trim() || 'svensk rubrik saknas'
  const english = pair.en?.title?.trim() || 'English heading missing'
  return `${swedish} / ${english}`
}
