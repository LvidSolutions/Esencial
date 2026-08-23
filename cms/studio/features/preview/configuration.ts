export const PREVIEW_API_VERSION = '2025-02-19'
export const PREVIEW_RENDER_PATH = '/__preview/render'
export const PREVIEW_ENABLE_PATH = '/api/draft-mode/enable'

export const PREVIEW_VIEWPORTS = {
  desktop: {label: 'Dator 1440', width: 1440, height: 900},
  tablet: {label: 'Platta 768', width: 768, height: 1024},
  mobile: {label: 'Mobil 390', width: 390, height: 844},
  'mobile-small': {label: 'Mobil 320', width: 320, height: 568},
} as const

export type PreviewViewportId = keyof typeof PREVIEW_VIEWPORTS
export type PreviewPerspective = 'drafts' | 'published' | 'staging'

export type PreviewOriginState =
  | {kind: 'configured'; origin: string}
  | {kind: 'fallback'; reason: string}

const studioEnvironment = (
  import.meta as ImportMeta & {env?: Record<string, string | undefined>}
).env

export function resolvePreviewOrigin(
  rawValue = studioEnvironment?.SANITY_STUDIO_PREVIEW_ORIGIN,
): PreviewOriginState {
  if (!rawValue?.trim()) {
    return {
      kind: 'fallback',
      reason: 'SANITY_STUDIO_PREVIEW_ORIGIN är inte konfigurerad.',
    }
  }

  try {
    const parsed = new URL(rawValue)
    const loopback = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
    if (parsed.protocol !== 'https:' && !(loopback && parsed.protocol === 'http:')) {
      return {
        kind: 'fallback',
        reason: 'Preview-origin måste använda HTTPS (lokal loopback får använda HTTP).',
      }
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      return {
        kind: 'fallback',
        reason: 'Preview-origin får inte innehålla autentisering, query-parametrar eller fragment.',
      }
    }
    if (parsed.pathname !== '/' && parsed.pathname !== '') {
      return {
        kind: 'fallback',
        reason: 'Preview-origin måste vara en ren origin utan sökväg.',
      }
    }
    return {kind: 'configured', origin: parsed.origin}
  } catch {
    return {kind: 'fallback', reason: 'Preview-origin är inte en giltig URL.'}
  }
}

export function projectRoute(language?: string, slug?: string) {
  if (!slug) return language === 'en' ? '/projects/' : '/projekt/'
  return language === 'en' ? `/projects/${slug}/` : `/projekt/${slug}/`
}

export function buildPreviewRendererUrl({
  origin,
  route,
  perspective,
  documentId,
  revision,
}: {
  origin: string
  route: string
  perspective: PreviewPerspective
  documentId?: string
  revision: number
}) {
  const url = new URL(PREVIEW_RENDER_PATH, origin)
  url.searchParams.set('route', route)
  url.searchParams.set('perspective', perspective)
  if (documentId) url.searchParams.set('document', documentId.replace(/^drafts\./, ''))
  url.searchParams.set('revision', String(revision))
  return url.toString()
}
