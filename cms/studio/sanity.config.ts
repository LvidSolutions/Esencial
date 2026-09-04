import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'
import {deskStructure} from './deskStructure'
import {VisualWorkspaceTool} from './components/studioTools'
import {ProjectDeleteAction} from './components/ProjectDeleteAction'
import {esencialStudioTheme} from './theme/esencialTheme'
import {createPreviewPresentationPlugins} from './features/preview/presentation'

const previewPresentationPlugins = createPreviewPresentationPlugins()

export default defineConfig({
  name: 'default',
  title: 'Esencial hemsida',
  projectId: 'g6xm8j7l',
  dataset: 'production',
  theme: esencialStudioTheme,
  releases: {enabled: false},
  scheduledDrafts: {enabled: false},
  plugins: [
    {
      name: 'esencial-editor-tools',
      tools: [{name: 'arbetsyta', title: 'Arbetsyta', component: VisualWorkspaceTool}],
    },
    ...previewPresentationPlugins,
    structureTool({
      structure: deskStructure,
      title: 'Innehåll & publicering (avancerat)',
    }),
  ],
  document: {
    actions: (previous, context) =>
      context.schemaType === 'project' ? [ProjectDeleteAction, ...previous] : previous,
  },
  schema: {
    types: schemaTypes,
    templates: (previous) => [
      ...previous,
      {
        id: 'project-sv',
        title: 'Nytt svenskt projekt',
        schemaType: 'project',
        value: {language: 'sv', status: 'draft'},
      },
      {
        id: 'project-en',
        title: 'New English project',
        schemaType: 'project',
        value: {language: 'en', status: 'draft'},
      },
    ],
  },
})
