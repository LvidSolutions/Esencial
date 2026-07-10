import {defineField, defineType} from 'sanity'

export const serviceType = defineType({
  name: 'service',
  title: 'Tjänst / Service',
  type: 'document',
  groups: [{name: 'content', title: 'Innehall'}, {name: 'seo', title: 'Sök och delning'}],
  fields: [
    defineField({name: 'title', title: 'Tjänstens namn', type: 'string', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'slug', title: 'Webbadress', type: 'slug', group: 'content', options: {source: 'title'}, validation: (Rule) => Rule.required()}),
    defineField({name: 'language', title: 'Språk', type: 'string', group: 'content', options: {list: [{title: 'Svenska', value: 'sv'}, {title: 'English', value: 'en'}]}, validation: (Rule) => Rule.required()}),
    defineField({name: 'intro', title: 'Kort introduktion', type: 'text', group: 'content', description: 'Beskriv den verkliga tjänsten, vem den hjälper och vad den innehåller.', validation: (Rule) => Rule.required().min(40).max(700)}),
    defineField({name: 'body', title: 'Längre beskrivning', type: 'array', group: 'content', of: [{type: 'block'}]}),
    defineField({name: 'relatedProjects', title: 'Relaterade projekt', type: 'array', group: 'content', of: [{type: 'reference', to: [{type: 'project'}]}]}),
    defineField({name: 'seoTitle', title: 'Titel i Google', type: 'string', group: 'seo', validation: (Rule) => Rule.max(60)}),
    defineField({name: 'seoDescription', title: 'Beskrivning i Google', type: 'text', group: 'seo', validation: (Rule) => Rule.max(160)}),
  ],
})
