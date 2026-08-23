import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {dashboardTool, projectInfoWidget, projectUsersWidget} from '@sanity/dashboard'
import {documentListWidget} from 'sanity-plugin-dashboard-widget-document-list'
import {schemaTypes} from './schemaTypes'
import {deskStructure} from './deskStructure'
import {VisualWorkspaceTool} from './components/studioTools'
import {esencialStudioTheme} from './theme/esencialTheme'
import {createPreviewPresentationPlugins} from './features/preview/presentation'
import './components/studioTools.css'

const previewPresentationPlugins = createPreviewPresentationPlugins()

export default defineConfig({
  name: 'default',
  title: 'Esencial hemsida',
  projectId: 'g6xm8j7l',
  dataset: 'production',
  theme: esencialStudioTheme,
  plugins: [
    {
      name: 'esencial-editor-tools',
      tools: [{name: 'arbetsyta', title: 'Arbetsyta', component: VisualWorkspaceTool}],
    },
    ...previewPresentationPlugins,
    dashboardTool({
      widgets: [
        documentListWidget({title: 'Klar att publicera', query: '*[_type == "project" && status == "review"] | order(_updatedAt desc)[0...6]', showCreateButton: false, layout: {width: 'large'}}),
        documentListWidget({title: 'Senast andrat', types: ['project'], order: '_updatedAt desc', limit: 6, createButtonText: 'Skapa projekt', layout: {width: 'large'}}),
        documentListWidget({title: 'Saknar SEO eller huvudbild', query: '*[_type == "project" && status in ["draft", "review"] && (!defined(seoTitle) || !defined(seoDescription) || (!defined(heroImage.asset) && count(coalesce(images, [])) == 0 && count(coalesce(legacyImages, [])) == 0))] | order(_updatedAt desc)[0...12]', showCreateButton: false, layout: {width: 'large'}}),
        documentListWidget({title: 'Översättning att slutföra', query: '*[_type == "project" && (!defined(translationKey) || translationStatus != "approved")] | order(_updatedAt desc)[0...12]', showCreateButton: false, layout: {width: 'large'}}),
        projectInfoWidget({layout: {width: 'small'}}),
        projectUsersWidget({layout: {width: 'small'}}),
      ],
    }),
    structureTool({structure: deskStructure}),
  ],
  schema: {
    types: schemaTypes,
    templates: (previous) => [
      ...previous,
      {id: 'project-sv', title: 'Nytt svenskt projekt', schemaType: 'project', value: {language: 'sv', status: 'draft'}},
      {id: 'project-en', title: 'New English project', schemaType: 'project', value: {language: 'en', status: 'draft'}},
    ],
  },
})
