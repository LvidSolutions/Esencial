import {useState, type CSSProperties, type ReactNode} from 'react'
import {Badge, Box, Button, Container, Flex, Heading, Stack, Text, ThemeProvider} from '@sanity/ui'
import {esencialStudioTheme} from '../../theme/esencialTheme'
import {esencialVisualTokens} from '../../theme/tokens'
import {
  WORKSPACE_SECTION_CONTRACTS,
  WORKSPACE_SECTION_ORDER,
  type WorkspaceSectionId,
  workspaceSectionDomId,
} from './contracts'
import './workspaceShell.css'
import './workspaceNavigation.css'

export type WorkspaceShellStatus = {
  label: string
  state: 'loading' | 'saving' | 'saved' | 'error'
}

export type WorkspaceSectionDefinition = {
  id: WorkspaceSectionId
  summary?: string
  children: ReactNode
}

type WorkspaceShellProps = {
  title: string
  status: WorkspaceShellStatus
  sections: readonly WorkspaceSectionDefinition[]
}

type WorkspaceCustomProperties = CSSProperties & Record<`--esencial-workspace-${string}`, string>

const workspaceStyle: WorkspaceCustomProperties = {
  '--esencial-workspace-ink': esencialVisualTokens.color.ink,
  '--esencial-workspace-muted': esencialVisualTokens.color.muted,
  '--esencial-workspace-paper': esencialVisualTokens.color.paper,
  '--esencial-workspace-canvas': esencialVisualTokens.color.canvas,
  '--esencial-workspace-wash': esencialVisualTokens.color.wash,
  '--esencial-workspace-border': esencialVisualTokens.color.border,
  '--esencial-workspace-border-strong': esencialVisualTokens.color.borderStrong,
  '--esencial-workspace-focus': esencialVisualTokens.color.focus,
  '--esencial-workspace-focus-soft': esencialVisualTokens.color.focusSoft,
  '--esencial-workspace-draft-ink': esencialVisualTokens.color.draftInk,
  '--esencial-workspace-draft-surface': esencialVisualTokens.color.draftSurface,
  '--esencial-workspace-draft-border': esencialVisualTokens.color.draftBorder,
  '--esencial-workspace-critical-ink': esencialVisualTokens.color.criticalInk,
  '--esencial-workspace-critical-surface': esencialVisualTokens.color.criticalSurface,
  '--esencial-workspace-font': esencialVisualTokens.typography.sans,
  '--esencial-workspace-measure': esencialVisualTokens.typography.measure,
  '--esencial-workspace-heading-tracking': esencialVisualTokens.typography.headingTracking,
  '--esencial-workspace-label-tracking': esencialVisualTokens.typography.labelTracking,
  '--esencial-workspace-content-line-height': esencialVisualTokens.typography.contentLineHeight,
  '--esencial-workspace-motion-duration': esencialVisualTokens.motion.duration,
  '--esencial-workspace-motion-easing': esencialVisualTokens.motion.easing,
}

const badgeTone = {
  loading: 'default',
  saving: 'caution',
  saved: 'positive',
  error: 'critical',
} as const

const storageKey = 'esencial-cms-workspace'

function initialWorkspace(): WorkspaceSectionId {
  if (typeof window === 'undefined') return WORKSPACE_SECTION_ORDER[0]
  const stored = window.sessionStorage.getItem(storageKey)
  return WORKSPACE_SECTION_ORDER.includes(stored as WorkspaceSectionId)
    ? (stored as WorkspaceSectionId)
    : WORKSPACE_SECTION_ORDER[0]
}

export function WorkspaceShell({title, status, sections}: WorkspaceShellProps) {
  const sectionsById = new Map(sections.map((section) => [section.id, section]))
  const orderedSections = WORKSPACE_SECTION_ORDER.map((id) => sectionsById.get(id)).filter(
    (section): section is WorkspaceSectionDefinition => Boolean(section),
  )
  const [activeSectionId, setActiveSectionId] = useState<WorkspaceSectionId>(initialWorkspace)
  const activeSection = sectionsById.get(activeSectionId) || orderedSections[0]

  const selectWorkspace = (id: WorkspaceSectionId) => {
    setActiveSectionId(id)
    if (typeof window !== 'undefined') window.sessionStorage.setItem(storageKey, id)
  }

  return (
    <ThemeProvider scheme="dark" theme={esencialStudioTheme}>
      <main className="esencial-workspace-shell" style={workspaceStyle}>
        <a className="esencial-workspace-shell__skip" href="#esencial-workspace-current">
          Hoppa till innehållet
        </a>
        <Container width={6} className="esencial-workspace-shell__container">
          <Stack space={5}>
            <header className="esencial-workspace-shell__header">
              <Text as="p" className="esencial-workspace-shell__eyebrow">
                Esencial CMS
              </Text>
              <Flex
                align={['flex-start', 'center']}
                direction={['column', 'row']}
                gap={4}
                justify="space-between"
              >
                <Box className="esencial-workspace-shell__intro">
                  <Heading as="h1" size={5} className="esencial-workspace-shell__title">
                    {title}
                  </Heading>
                </Box>
                <Box
                  aria-live={status.state === 'error' ? 'assertive' : 'polite'}
                  className="esencial-workspace-shell__status"
                  role="status"
                >
                  <Badge tone={badgeTone[status.state]}>{status.label}</Badge>
                </Box>
              </Flex>
            </header>

            <nav className="esencial-workspace-shell__tabs" aria-label="Arbetsytor">
              <ol role="tablist">
                {orderedSections.map((section) => {
                  const contract = WORKSPACE_SECTION_CONTRACTS[section.id]
                  const active = section.id === activeSection?.id
                  const tabId = `${workspaceSectionDomId(section.id)}-tab`
                  return (
                    <li key={section.id} role="presentation">
                      <Button
                        aria-controls="esencial-workspace-current"
                        aria-selected={active}
                        className="esencial-workspace-shell__tab-button"
                        id={tabId}
                        mode="bleed"
                        role="tab"
                        tabIndex={active ? 0 : -1}
                        text={contract.navigationLabel}
                        onClick={() => selectWorkspace(section.id)}
                      />
                    </li>
                  )
                })}
              </ol>
            </nav>

            {activeSection ? <WorkspaceSection section={activeSection} /> : null}
          </Stack>
        </Container>
      </main>
    </ThemeProvider>
  )
}

function WorkspaceSection({section}: {section: WorkspaceSectionDefinition}) {
  const contract = WORKSPACE_SECTION_CONTRACTS[section.id]
  const domId = workspaceSectionDomId(section.id)
  const headingId = `${domId}-heading`
  const tabId = `${domId}-tab`

  return (
    <section
      aria-labelledby={tabId}
      className="esencial-workspace-shell__section"
      data-extension-slot={contract.id}
      data-owner-stage={contract.ownerStage}
      id="esencial-workspace-current"
      role="tabpanel"
      tabIndex={0}
    >
      <header className="esencial-workspace-shell__section-header">
        <Heading as="h2" id={headingId} size={4}>
          {contract.heading}
        </Heading>
      </header>
      <div className="esencial-workspace-shell__section-content">{section.children}</div>
    </section>
  )
}
