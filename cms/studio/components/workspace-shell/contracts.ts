export const WORKSPACE_SECTION_CONTRACTS = {
  'projects-filters': {
    id: 'projects-filters',
    navigationLabel: 'Projekt & filter',
    heading: 'Projekt och filter',
    ownerStage: 'S17',
    featureBoundary: 'cms/studio/features/projects/**',
    purpose:
      'Project creation, bilingual project editing, filter taxonomy, membership, order and visibility.',
  },
  'live-preview': {
    id: 'live-preview',
    navigationLabel: 'Live preview',
    heading: 'Live preview',
    ownerStage: 'S18',
    featureBoundary: 'cms/studio/features/preview/**',
    purpose:
      'Protected frontend preview, viewport controls, draft/published comparison and layout diagnostics.',
  },
  'analytics-consent': {
    id: 'analytics-consent',
    navigationLabel: 'Analys & samtycke',
    heading: 'Analys och samtycke',
    ownerStage: 'S19',
    featureBoundary: 'cms/studio/features/analytics/**',
    purpose:
      'Aggregated analytics states, consent status and privacy controls with server-side provider secrets.',
  },
} as const

export type WorkspaceSectionId = keyof typeof WORKSPACE_SECTION_CONTRACTS
export type WorkspaceSectionContract = (typeof WORKSPACE_SECTION_CONTRACTS)[WorkspaceSectionId]

export const WORKSPACE_SECTION_ORDER = [
  'projects-filters',
  'live-preview',
  'analytics-consent',
] as const satisfies readonly WorkspaceSectionId[]

export function workspaceSectionDomId(id: WorkspaceSectionId) {
  return `esencial-workspace-${id}`
}
