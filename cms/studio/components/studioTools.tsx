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
    label: 'Laddar projekt…',
  })
  const [projectStatus, setProjectStatus] = useState<FeatureStatus>({
    state: 'loading',
    label: 'Laddar filter…',
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
    {id: 'live-preview', children: <LiveFrontendPreview />},
    {id: 'analytics-consent', children: <AnalyticsConsentFeature />},
  ])

  return <WorkspaceShell title="Arbetsyta" status={workspaceStatus} sections={sections} />
}
