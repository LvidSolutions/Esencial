export const WORKSPACE_SECTION_CONTRACTS = {
  'content-media': {
    id: 'content-media',
    navigationLabel: 'Projekt',
    heading: 'Projekt',
    ownerStage: 'S25',
    featureBoundary: 'cms/studio/features/content/**',
    purpose:
      'Draft-only project text, SEO, media review and category membership with safe recovery.',
  },
  'projects-filters': {
    id: 'projects-filters',
    navigationLabel: 'Filter och ordning',
    heading: 'Filter och ordning',
    ownerStage: 'S17',
    featureBoundary: 'cms/studio/features/projects/**',
    purpose:
      'Project creation, bilingual project editing, filter taxonomy, membership, order and visibility.',
  },
  'live-preview': {
    id: 'live-preview',
    navigationLabel: 'Förhandsvisning',
    heading: 'Förhandsvisning',
    ownerStage: 'S18',
    featureBoundary: 'cms/studio/features/preview/**',
    purpose:
      'Protected frontend preview, viewport controls, draft/published comparison and layout diagnostics.',
  },
  'analytics-consent': {
    id: 'analytics-consent',
    navigationLabel: 'Resultat',
    heading: 'Resultat',
    ownerStage: 'S19',
    featureBoundary: 'cms/studio/features/analytics/**',
    purpose:
      'Aggregated analytics states, consent status and privacy controls with server-side provider secrets.',
  },
} as const

export type WorkspaceSectionId = keyof typeof WORKSPACE_SECTION_CONTRACTS
export type WorkspaceSectionContract = (typeof WORKSPACE_SECTION_CONTRACTS)[WorkspaceSectionId]

export const WORKSPACE_SECTION_ORDER = [
  'content-media',
  'projects-filters',
  'live-preview',
  'analytics-consent',
] as const satisfies readonly WorkspaceSectionId[]

export function workspaceSectionDomId(id: WorkspaceSectionId) {
  return `esencial-workspace-${id}`
}
