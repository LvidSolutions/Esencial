import {defineField, defineType} from 'sanity'

export const homePageType = defineType({
  name: 'homePage',
  title: 'Startsida',
  type: 'document',
  fields: [
    defineField({
      name: 'featuredProjects',
      title: 'Projekt på startsidan',
      type: 'array',
      description: 'Dra och släpp för att bestämma ordningen på startsidan. Detta ändrar aldrig bildordningen inne i ett projekt.',
      of: [{
        type: 'object',
        fields: [
          defineField({name: 'project', title: 'Projekt', type: 'reference', to: [{type: 'project'}], validation: (Rule) => Rule.required()}),
          defineField({name: 'displayStyle', title: 'Visning', type: 'string', options: {layout: 'radio', list: [{title: 'Huvudprojekt', value: 'featured'}, {title: 'Normalt kort', value: 'card'}]}, initialValue: 'card'}),
        ],
        preview: {select: {title: 'project.title', subtitle: 'displayStyle', media: 'project.heroImage'}, prepare: ({title, subtitle, media}) => ({title: title || 'Välj projekt', subtitle: subtitle === 'featured' ? 'Huvudprojekt' : 'Normalt kort', media})},
      }],
    }),
  ],
  preview: {prepare: () => ({title: 'Startsida', subtitle: 'Ordning och utvalda projekt'})},
})
