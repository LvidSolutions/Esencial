const filterKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const FILTER_CATEGORY_SCHEMA_FIELDS = Object.freeze([
  'key',
  'labelSv',
  'labelEn',
  'order',
  'visible',
  'projects',
])

export const NAVIGATION_SETTINGS_SCHEMA_FIELDS = Object.freeze([
  'enabled',
  'headingSv',
  'headingEn',
  'allLabelSv',
  'allLabelEn',
  'gridProjects',
])

export function canonicalDocumentId(id = '') {
  return id.replace(/^drafts\./, '')
}

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function projectIndex(projects) {
  const byId = new Map()
  const byPair = new Map()

  for (const project of projects) {
    const id = canonicalDocumentId(project?._id)
    if (!id) continue
    const existing = byId.get(id)
    if (!existing || project._id.startsWith('drafts.')) byId.set(id, project)
  }

  for (const project of byId.values()) {
    const key = text(project.translationKey)
    if (!key) continue
    const pair = byPair.get(key) || {sv: [], en: []}
    if (project.language === 'sv') pair.sv.push(project)
    if (project.language === 'en') pair.en.push(project)
    byPair.set(key, pair)
  }

  return {byId, byPair}
}

function validatePairReferences(referenceIds, projects, label) {
  const errors = []
  const {byId, byPair} = projectIndex(projects)
  const seenPairs = new Set()

  for (const [index, rawId] of referenceIds.entries()) {
    const position = `${label} position ${index + 1}`
    const id = canonicalDocumentId(rawId)
    const project = byId.get(id)
    if (!project) {
      errors.push(`${position} points to a missing project.`)
      continue
    }
    if (project.language !== 'sv') {
      errors.push(`${position} must select the Swedish member of a bilingual project pair.`)
      continue
    }
    if (project.status !== 'published') {
      errors.push(`${position} points to a project that is not marked Published.`)
      continue
    }
    const pairKey = text(project.translationKey)
    if (!pairKey) {
      errors.push(`${position} points to a project without a translation key.`)
      continue
    }
    if (seenPairs.has(pairKey)) {
      errors.push(`${position} duplicates project pair ${pairKey}.`)
      continue
    }
    seenPairs.add(pairKey)
    const pair = byPair.get(pairKey)
    if (!pair || pair.sv.length !== 1 || pair.en.length !== 1) {
      errors.push(`${position} must resolve to exactly one Swedish and one English project.`)
      continue
    }
    if (pair.en[0].status !== 'published') {
      errors.push(`${position} has an English counterpart that is not marked Published.`)
    }
  }

  return {errors, seenPairs}
}

export function validateFilterCategoryDocument(category, projects) {
  const errors = []
  const key = text(category?.key)
  if (!key || !filterKeyPattern.test(key)) {
    errors.push('Filter key must use lowercase letters, numbers and single hyphens.')
  }
  if (!text(category?.labelSv)) errors.push('Swedish filter label is required.')
  if (!text(category?.labelEn)) errors.push('English filter label is required.')
  if (!Number.isInteger(category?.order) || category.order < 0) {
    errors.push('Filter order must be a non-negative integer.')
  }
  if (typeof category?.visible !== 'boolean') errors.push('Filter visibility must be explicit.')
  const projectRefs = Array.isArray(category?.projectRefs) ? category.projectRefs : []
  if (!projectRefs.length) errors.push('Filter category must select at least one project pair.')
  errors.push(...validatePairReferences(projectRefs, projects, 'Filter membership').errors)
  return errors
}

export function validateNavigationSettingsDocument(settings, projects) {
  if (settings?.enabled !== true) return []
  const errors = []
  if (!text(settings.headingSv)) errors.push('Swedish project-grid heading is required.')
  if (!text(settings.headingEn)) errors.push('English project-grid heading is required.')
  if (!text(settings.allLabelSv)) errors.push('Swedish all-projects label is required.')
  if (!text(settings.allLabelEn)) errors.push('English all-projects label is required.')
  const entries = Array.isArray(settings.gridEntries) ? settings.gridEntries : []
  if (!entries.length)
    errors.push('Configured grid must contain at least one explicit project pair.')
  if (entries.length && !entries.some((entry) => entry?.includeInGrid === true)) {
    errors.push('Configured grid must include at least one project pair.')
  }
  const referenceIds = entries.map((entry) => entry?.projectRef || '')
  errors.push(...validatePairReferences(referenceIds, projects, 'Grid').errors)
  return errors
}

function duplicateCategoryErrors(categories) {
  const errors = []
  const keys = new Set()
  const orders = new Set()
  for (const category of categories) {
    const key = text(category?.key)
    if (key && keys.has(key)) errors.push(`Filter key ${key} is duplicated.`)
    if (key) keys.add(key)
    if (Number.isInteger(category?.order) && orders.has(category.order)) {
      errors.push(`Filter order ${category.order} is duplicated.`)
    }
    if (Number.isInteger(category?.order)) orders.add(category.order)
  }
  return errors
}

function configuredData(projects, categories, settings) {
  const {byId, byPair} = projectIndex(projects)
  const includedPairs = []
  for (const entry of settings.gridEntries) {
    if (entry.includeInGrid !== true) continue
    const project = byId.get(canonicalDocumentId(entry.projectRef))
    includedPairs.push(text(project.translationKey))
  }
  const includedSet = new Set(includedPairs)
  const visibleCategories = categories
    .filter((category) => category.visible === true)
    .sort(
      (left, right) => left.order - right.order || text(left.key).localeCompare(text(right.key)),
    )
    .map((category) => {
      const pairKeys = category.projectRefs.map((reference) => {
        const project = byId.get(canonicalDocumentId(reference))
        return text(project.translationKey)
      })
      return {
        key: text(category.key),
        labels: {sv: text(category.labelSv), en: text(category.labelEn)},
        projectIdsByLanguage: {
          sv: pairKeys.map((key) => canonicalDocumentId(byPair.get(key).sv[0]._id)),
          en: pairKeys.map((key) => canonicalDocumentId(byPair.get(key).en[0]._id)),
        },
      }
    })

  const categoryErrors = []
  for (const category of visibleCategories) {
    const pairIds = new Set(
      category.projectIdsByLanguage.sv.map((id) => text(byId.get(id)?.translationKey)),
    )
    for (const pairId of pairIds) {
      if (!includedSet.has(pairId)) {
        categoryErrors.push(
          `Visible filter ${category.key} contains a project excluded from the grid.`,
        )
      }
    }
  }
  if (categoryErrors.length) return {errors: categoryErrors}

  return {
    errors: [],
    data: {
      headings: {sv: text(settings.headingSv), en: text(settings.headingEn)},
      allLabels: {sv: text(settings.allLabelSv), en: text(settings.allLabelEn)},
      projectsByLanguage: {
        sv: includedPairs.map((key) => byPair.get(key).sv[0]),
        en: includedPairs.map((key) => byPair.get(key).en[0]),
      },
      categories: visibleCategories,
    },
  }
}

export function resolveProjectNavigation({projects, categories, settings, legacy}) {
  if (settings?.enabled !== true) return {mode: 'legacy', reason: null, data: legacy}

  const errors = [
    ...validateNavigationSettingsDocument(settings, projects),
    ...duplicateCategoryErrors(categories),
    ...categories.flatMap((category) => validateFilterCategoryDocument(category, projects)),
  ]
  if (errors.length) return {mode: 'fallback', reason: errors.join(' '), data: legacy}

  const configured = configuredData(projects, categories, settings)
  if (configured.errors.length) {
    return {mode: 'fallback', reason: configured.errors.join(' '), data: legacy}
  }
  return {mode: 'configured', reason: null, data: configured.data}
}
