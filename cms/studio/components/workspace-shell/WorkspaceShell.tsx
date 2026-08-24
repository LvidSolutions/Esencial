import type {CSSProperties, ReactNode} from 'react'
import {Badge, Box, Card, Container, Flex, Heading, Stack, Text} from '@sanity/ui'
import {esencialVisualTokens} from '../../theme/tokens'
import {
  WORKSPACE_SECTION_CONTRACTS,
  WORKSPACE_SECTION_ORDER,
  type WorkspaceSectionId,
  workspaceSectionDomId,
} from './contracts'
import {EditorialStatusOverview} from './EditorialStatusOverview'
import './workspaceShell.css'

export type WorkspaceShellStatus = {
  label: string
  state: 'loading' | 'saving' | 'saved' | 'error'
}

export type WorkspaceSectionDefinition = {
  id: WorkspaceSectionId
  summary: string
  children: ReactNode
}

type WorkspaceShellProps = {
  title: string
  subtitle: string
  safetyNotice: string
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
  '--esencial-workspace-section-space': `${esencialVisualTokens.spacing.section}px`,
}

const badgeTone = {
  loading: 'default',
  saving: 'caution',
  saved: 'positive',
  error: 'critical',
} as const

export function WorkspaceShell({
  title,
  subtitle,
  safetyNotice,
  status,
  sections,
}: WorkspaceShellProps) {
  const sectionsById = new Map(sections.map((section) => [section.id, section]))
  const orderedSections = WORKSPACE_SECTION_ORDER.map((id) => sectionsById.get(id)).filter(
    (section): section is WorkspaceSectionDefinition => Boolean(section),
  )
  return (
    <main className="esencial-workspace-shell" style={workspaceStyle}>
      <a className="esencial-workspace-shell__skip" href="#esencial-workspace-status">
        Hoppa till arbetsytans innehåll
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
                <Text as="p" size={2} className="esencial-workspace-shell__subtitle">
                  {subtitle}
                </Text>
              </Box>
              <Box
                aria-live={status.state === 'error' ? 'assertive' : 'polite'}
                className="esencial-workspace-shell__status"
                role="status"
              >
                <Badge tone={badgeTone[status.state]}>{status.label}</Badge>
              </Box>
            </Flex>
            <Card className="esencial-workspace-shell__safety" padding={3} radius={2}>
              <Text as="p" size={1}>
                <strong>Publiceringsskydd:</strong> {safetyNotice}
              </Text>
            </Card>
          </header>

          <EditorialStatusOverview />

          <nav className="esencial-workspace-shell__tabs" aria-label="Arbetsytans steg">
            <ol>
              {orderedSections.map((section, index) => {
                const contract = WORKSPACE_SECTION_CONTRACTS[section.id]
                return (
                  <li key={section.id}>
                    <a href={`#${workspaceSectionDomId(section.id)}`}>
                      <span aria-hidden="true" className="esencial-workspace-shell__tab-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>{contract.navigationLabel}</span>
                    </a>
                  </li>
                )
              })}
            </ol>
          </nav>

          <div className="esencial-workspace-shell__flow">
            {orderedSections.map((section, index) => (
              <WorkspaceSection key={section.id} section={section} index={index} />
            ))}
          </div>
        </Stack>
      </Container>
    </main>
  )
}

function WorkspaceSection({section, index}: {section: WorkspaceSectionDefinition; index: number}) {
  const contract = WORKSPACE_SECTION_CONTRACTS[section.id]
  const domId = workspaceSectionDomId(section.id)
  const headingId = `${domId}-heading`

  return (
    <section
      aria-labelledby={headingId}
      className="esencial-workspace-shell__section"
      data-extension-slot={contract.id}
      data-owner-stage={contract.ownerStage}
      id={domId}
      tabIndex={-1}
    >
      <header className="esencial-workspace-shell__section-header">
        <Text as="p" className="esencial-workspace-shell__eyebrow">
          Steg {String(index + 1).padStart(2, '0')}
        </Text>
        <Box>
          <Heading as="h2" id={headingId} size={4}>
            {contract.heading}
          </Heading>
          <Text as="p" size={2} className="esencial-workspace-shell__section-summary">
            {section.summary}
          </Text>
        </Box>
      </header>
      <div className="esencial-workspace-shell__section-content">{section.children}</div>
    </section>
  )
}
