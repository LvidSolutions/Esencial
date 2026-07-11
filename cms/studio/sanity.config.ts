import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {dashboardTool, projectInfoWidget, projectUsersWidget} from '@sanity/dashboard'
import {documentListWidget} from 'sanity-plugin-dashboard-widget-document-list'
import {schemaTypes} from './schemaTypes'
import {deskStructure} from './deskStructure'

export default defineConfig({
  name: 'default',
  title: 'Esencial hemsida',
  projectId: 'g6xm8j7l',
  dataset: 'production',
  plugins: [
    dashboardTool({
      widgets: [
        documentListWidget({title: 'Att granska', query: '*[_type == "project" && status == "review"] | order(_updatedAt desc)[0...6]', showCreateButton: false, layout: {width: 'large'}}),
        documentListWidget({title: 'Senast andrat', types: ['project'], order: '_updatedAt desc', limit: 6, createButtonText: 'Skapa projekt', layout: {width: 'large'}}),
        documentListWidget({title: 'Saknar SEO eller bilder', query: '*[_type == "project" && status in ["draft", "review"] && (!defined(seoTitle) || !defined(seoDescription) || (!defined(images) || count(images) == 0))] | order(_updatedAt desc)[0...12]', showCreateButton: false, layout: {width: 'large'}}),
        documentListWidget({title: 'Oversattning att slutfora', query: '*[_type == "project" && translationStatus != "approved"] | order(_updatedAt desc)[0...12]', showCreateButton: false, layout: {width: 'large'}}),
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
