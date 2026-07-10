import {defineField, defineType} from 'sanity'

export const siteSettingsType = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({name: 'siteName', title: 'Site name', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'legalName', title: 'Legal name', type: 'string'}),
    defineField({name: 'email', title: 'Public email', type: 'string', validation: (Rule) => Rule.email()}),
    defineField({name: 'address', title: 'Public address', type: 'string'}),
    defineField({name: 'socialLinks', title: 'Social links', type: 'array', of: [{type: 'url'}]}),
    defineField({name: 'defaultSeoTitle', title: 'Default search title', type: 'string'}),
    defineField({name: 'defaultSeoDescription', title: 'Default search description', type: 'text', rows: 3, validation: (Rule) => Rule.max(160)}),
  ],
})
