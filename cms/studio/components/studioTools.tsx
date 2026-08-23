import {useState} from 'react'
import {
  WorkspaceShell,
  type WorkspaceSectionDefinition,
  type WorkspaceShellStatus,
} from './workspace-shell/WorkspaceShell'
import {WORKSPACE_SECTION_ORDER} from './workspace-shell/contracts'
import {composeWorkspaceSections as composeSectionDefinitions} from './workspaceComposition.mjs'
import {createProjectsFiltersSection} from '../features/projects/ProjectsFiltersSection'
import type {FeatureStatus} from '../features/projects/types'
import {LiveFrontendPreview} from '../features/preview/LiveFrontendPreview'
import {AnalyticsConsentFeature} from '../features/analytics/AnalyticsConsentFeature'

export function composeWorkspaceSections(
  sections: readonly WorkspaceSectionDefinition[],
): WorkspaceSectionDefinition[] {
  return composeSectionDefinitions(sections, WORKSPACE_SECTION_ORDER)
}

export function VisualWorkspaceTool() {
  const [projectStatus, setProjectStatus] = useState<FeatureStatus>({
    state: 'loading',
    label: 'Laddar projekt och filter…',
  })
  const workspaceStatus: WorkspaceShellStatus = projectStatus
  const sections = composeWorkspaceSections([
    createProjectsFiltersSection(setProjectStatus),
    {
      id: 'live-preview',
      summary:
        'Granska den riktiga skyddade frontendrenderern i fasta dator-, platt- och mobilbredder. Layoutfel eller en overifierad session blockerar redaktionellt godkännande; den lokala fixturen är endast layoutbevis.',
      children: <LiveFrontendPreview />,
    },
    {
      id: 'analytics-consent',
      summary:
        'Visa endast strikt validerad, verklig leverantörsdata och de fail-closed samtyckeskontroller som måste vara ägargodkända före aktivering.',
      children: <AnalyticsConsentFeature />,
    },
  ])

  return (
    <WorkspaceShell
      title="Arbetsyta"
      subtitle="En sammanhängande arbetsyta för projekt, filter, förhandsvisning och uppföljning. Avsnitten följer samma ordning på stor och liten skärm."
      safetyNotice="Alla redaktionella ändringar sparas som kladd. Endast validerade, native-publicerade dokument får nå ett godkänt stagingbygge; analys och preview förblir blockerade tills deras externa skydd är verifierade."
      status={workspaceStatus}
      sections={sections}
    />
  )
}
