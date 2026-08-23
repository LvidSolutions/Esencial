import type {PreviewPerspective} from './configuration'

export const PREVIEW_MESSAGE_VERSION = 1

export type LayoutIssueCode =
  | 'horizontal-scroll'
  | 'text-overflow'
  | 'clipping'
  | 'overlap'
  | 'missing-media'
  | 'broken-media'
  | 'unsafe-line-length'

export type LayoutIssue = {
  code: LayoutIssueCode
  severity: 'blocker'
  route: string
  field: string
  message: string
  suggestion: string
  documentId?: string
  path?: string
}

export type PreviewReadyMessage = {
  type: 'esencial-preview/ready'
  version: typeof PREVIEW_MESSAGE_VERSION
  route: string
  perspective: PreviewPerspective
  authenticated: boolean
  renderer: 'frontend'
}

export type PreviewDiagnosticsMessage = {
  type: 'esencial-preview/diagnostics'
  version: typeof PREVIEW_MESSAGE_VERSION
  route: string
  perspective: PreviewPerspective
  issues: LayoutIssue[]
}

export type PreviewEditMessage = {
  type: 'esencial-preview/edit'
  version: typeof PREVIEW_MESSAGE_VERSION
  documentId: string
  path?: string
}

export type PreviewRendererMessage =
  | PreviewReadyMessage
  | PreviewDiagnosticsMessage
  | PreviewEditMessage

const perspectives = new Set<PreviewPerspective>(['drafts', 'published', 'staging'])
const issueCodes = new Set<LayoutIssueCode>([
  'horizontal-scroll',
  'text-overflow',
  'clipping',
  'overlap',
  'missing-media',
  'broken-media',
  'unsafe-line-length',
])

function isLayoutIssue(value: unknown): value is LayoutIssue {
  if (!value || typeof value !== 'object') return false
  const issue = value as Partial<LayoutIssue>
  return (
    typeof issue.code === 'string' &&
    issueCodes.has(issue.code as LayoutIssueCode) &&
    issue.severity === 'blocker' &&
    typeof issue.route === 'string' &&
    typeof issue.field === 'string' &&
    typeof issue.message === 'string' &&
    typeof issue.suggestion === 'string' &&
    (issue.documentId === undefined || typeof issue.documentId === 'string') &&
    (issue.path === undefined || typeof issue.path === 'string')
  )
}

export function isPreviewRendererMessage(value: unknown): value is PreviewRendererMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Partial<PreviewRendererMessage> & Record<string, unknown>
  if (message.version !== PREVIEW_MESSAGE_VERSION || typeof message.type !== 'string') return false

  if (message.type === 'esencial-preview/edit') {
    return (
      typeof message.documentId === 'string' &&
      (message.path === undefined || typeof message.path === 'string')
    )
  }

  if (
    typeof message.route !== 'string' ||
    typeof message.perspective !== 'string' ||
    !perspectives.has(message.perspective as PreviewPerspective)
  ) {
    return false
  }

  if (message.type === 'esencial-preview/ready') {
    return typeof message.authenticated === 'boolean' && message.renderer === 'frontend'
  }
  if (message.type === 'esencial-preview/diagnostics') {
    return Array.isArray(message.issues) && message.issues.every(isLayoutIssue)
  }
  return false
}
