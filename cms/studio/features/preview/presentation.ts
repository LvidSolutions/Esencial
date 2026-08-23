import {defineDocuments, defineLocations, presentationTool} from 'sanity/presentation'
import {PREVIEW_ENABLE_PATH, projectRoute, resolvePreviewOrigin} from './configuration'

const projectDocuments = defineDocuments([
  {
    route: ['/projekt/:slug', '/projects/:slug'],
    filter: '_type == "project" && slug.current == $slug',
    params: ({params}) => ({slug: params.slug}),
  },
  {route: ['/', '/projects'], type: 'homePage'},
])

const projectLocations = defineLocations({
  select: {title: 'title', slug: 'slug.current', language: 'language'},
  resolve: (value) => {
    if (!value?.slug) return {message: 'Projektet behöver en stabil slug före frontendpreview.'}
    return {
      locations: [
        {
          title: value.title || 'Namnlöst projekt',
          href: projectRoute(value.language, value.slug),
        },
      ],
    }
  },
})

export function createPreviewPresentationPlugins() {
  const previewOrigin = resolvePreviewOrigin()
  if (previewOrigin.kind !== 'configured') return []

  return [
    presentationTool({
      name: 'frontend-preview',
      title: 'Frontendpreview',
      allowOrigins: [previewOrigin.origin],
      previewUrl: {
        initial: previewOrigin.origin,
        previewMode: {
          enable: PREVIEW_ENABLE_PATH,
          shareAccess: false,
        },
      },
      resolve: {
        mainDocuments: projectDocuments,
        locations: {project: projectLocations},
      },
    }),
  ]
}
