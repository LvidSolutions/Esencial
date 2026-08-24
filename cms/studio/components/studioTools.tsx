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
import {createContentMediaWorkspace, type ContentMediaStatus} from '../features/content'

export function composeWorkspaceSections(
  sections: readonly WorkspaceSectionDefinition[],
): WorkspaceSectionDefinition[] {
  return composeSectionDefinitions(sections, WORKSPACE_SECTION_ORDER)
}

export function VisualWorkspaceTool() {
  const [contentStatus, setContentStatus] = useState<ContentMediaStatus>({
    state: 'loading',
    label: 'Laddar innehåll och bilder…',
  })
  const [projectStatus, setProjectStatus] = useState<FeatureStatus>({
    state: 'loading',
    label: 'Laddar projekt och filter…',
  })
  const workspaceStatus: WorkspaceShellStatus =
    contentStatus.state === 'error' || projectStatus.state === 'error'
      ? contentStatus.state === 'error'
        ? contentStatus
        : projectStatus
      : contentStatus.state === 'saving' || projectStatus.state === 'saving'
        ? contentStatus.state === 'saving'
          ? contentStatus
          : projectStatus
        : contentStatus.state === 'loading' || projectStatus.state === 'loading'
          ? contentStatus.state === 'loading'
            ? contentStatus
            : projectStatus
          : contentStatus
  const sections = composeWorkspaceSections([
    createContentMediaWorkspace(setContentStatus),
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
      subtitle="Redigera innehåll och bilder, ordna projekt och kategorier, kontrollera sidan och följ resultatet – i samma enkla arbetsflöde."
      safetyNotice="Alla redaktionella ändringar sparas som kladd. Endast validerade, native-publicerade dokument får nå ett godkänt stagingbygge; analys och preview förblir blockerade tills deras externa skydd är verifierade."
      status={workspaceStatus}
      sections={sections}
    />
  )
}
