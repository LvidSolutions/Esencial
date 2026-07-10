import {defineField, defineType} from 'sanity'

export const projectType = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Project title', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'slug', title: 'URL', type: 'slug', options: {source: 'title'}, validation: (Rule) => Rule.required()}),
    defineField({name: 'language', title: 'Language', type: 'string', options: {list: [{title: 'Swedish', value: 'sv'}, {title: 'English', value: 'en'}]}, validation: (Rule) => Rule.required()}),
    defineField({name: 'translationKey', title: 'Translation key', type: 'string', readOnly: true}),
    defineField({name: 'summary', title: 'Project introduction', type: 'text', rows: 5, validation: (Rule) => Rule.required().min(40).max(700)}),
    defineField({name: 'body', title: 'Full project story', type: 'array', of: [{type: 'block'}]}),
    defineField({name: 'location', title: 'Published location', type: 'string'}),
    defineField({name: 'year', title: 'Year', type: 'number', validation: (Rule) => Rule.integer().min(1900).max(2100)}),
    defineField({name: 'status', title: 'Status', type: 'string', options: {list: [{title: 'Draft', value: 'draft'}, {title: 'In review', value: 'review'}, {title: 'Published', value: 'published'}, {title: 'Archived', value: 'archived'}]}, initialValue: 'draft'}),
    defineField({name: 'images', title: 'Published images', type: 'array', of: [{type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Image description', type: 'string', validation: (Rule) => Rule.required()}), defineField({name: 'credit', title: 'Credit', type: 'string'})]}]}),
    defineField({name: 'legacyImages', title: 'Existing website images to migrate', type: 'array', readOnly: true, of: [{type: 'object', fields: [defineField({name: 'url', title: 'Existing image URL', type: 'url'}), defineField({name: 'alt', title: 'Existing image description', type: 'string'})]}]}),
    defineField({name: 'seoTitle', title: 'Search title', type: 'string', validation: (Rule) => Rule.max(60)}),
    defineField({name: 'seoDescription', title: 'Search description', type: 'text', rows: 3, validation: (Rule) => Rule.max(160)}),
  ],
  preview: {select: {title: 'title', subtitle: 'location', media: 'images.0'}},
})
