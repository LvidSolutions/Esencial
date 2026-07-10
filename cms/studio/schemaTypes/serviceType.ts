import {defineField, defineType} from 'sanity'

export const serviceType = defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Service name', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'slug', title: 'URL', type: 'slug', options: {source: 'title'}, validation: (Rule) => Rule.required()}),
    defineField({name: 'language', title: 'Language', type: 'string', options: {list: ['sv', 'en']}, validation: (Rule) => Rule.required()}),
    defineField({name: 'intro', title: 'Introduction', type: 'text', validation: (Rule) => Rule.required().min(40).max(700)}),
    defineField({name: 'body', title: 'Description', type: 'array', of: [{type: 'block'}]}),
    defineField({name: 'relatedProjects', title: 'Related projects', type: 'array', of: [{type: 'reference', to: [{type: 'project'}]}]}),
    defineField({name: 'seoTitle', title: 'Search title', type: 'string', validation: (Rule) => Rule.max(60)}),
    defineField({name: 'seoDescription', title: 'Search description', type: 'text', validation: (Rule) => Rule.max(160)}),
  ],
})
