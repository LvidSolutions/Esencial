const DEFAULT_LIMITS = {
  ready: 6,
  recent: 6,
  incomplete: 12,
  translation: 12,
}

export function canonicalProjectId(project) {
  const sourceId = project?._originalId || project?._id || ''
  return sourceId.replace(/^drafts\./, '')
}

function isDraft(project) {
  return project?._id?.startsWith('drafts.') || project?._originalId?.startsWith('drafts.')
}

function updatedAt(project) {
  const value = Date.parse(project?._updatedAt || '')
  return Number.isFinite(value) ? value : 0
}

function preferProject(current, candidate) {
  if (!current) return candidate
  if (isDraft(candidate) !== isDraft(current)) return isDraft(candidate) ? candidate : current
  return updatedAt(candidate) > updatedAt(current) ? candidate : current
}

export function deduplicateEditorialProjects(projects) {
  const projectsById = new Map()
  for (const project of projects || []) {
    const id = canonicalProjectId(project)
    if (!id) continue
    projectsById.set(id, preferProject(projectsById.get(id), project))
  }
  return [...projectsById.values()].sort((left, right) => updatedAt(right) - updatedAt(left))
}

function createQueue(id, projects, limit) {
  return {
    id,
    total: projects.length,
    items: projects.slice(0, limit),
  }
}

export function buildEditorialStatusQueues(projects, requestedLimits = {}) {
  const limits = {...DEFAULT_LIMITS, ...requestedLimits}
  const uniqueProjects = deduplicateEditorialProjects(projects)
  const ready = uniqueProjects.filter((project) => project.status === 'review')
  const incomplete = uniqueProjects.filter(
    (project) =>
      ['draft', 'review'].includes(project.status) && (!project.hasSeo || !project.hasHeroImage),
  )
  const translation = uniqueProjects.filter(
    (project) => !project.hasTranslationKey || !project.translationApproved,
  )

  return [
    createQueue('ready', ready, limits.ready),
    createQueue('recent', uniqueProjects, limits.recent),
    createQueue('incomplete', incomplete, limits.incomplete),
    createQueue('translation', translation, limits.translation),
  ]
}
