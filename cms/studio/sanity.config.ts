import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'
import {deskStructure} from './deskStructure'

export default defineConfig({
  name: 'default',
  title: 'Esencial hemsida',

  projectId: 'g6xm8j7l',
  dataset: 'production',

  plugins: [structureTool({structure: deskStructure})],

  schema: {
    types: schemaTypes,
    templates: (previous) => [
      ...previous,
      {id: 'project-sv', title: 'Nytt svenskt projekt', schemaType: 'project', value: {language: 'sv', status: 'draft'}},
      {id: 'project-en', title: 'New English project', schemaType: 'project', value: {language: 'en', status: 'draft'}},
    ],
  },
})
