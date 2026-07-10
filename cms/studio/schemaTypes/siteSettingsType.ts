import {defineField, defineType} from 'sanity'

export const siteSettingsType = defineType({
  name: 'siteSettings',
  title: 'Webbplatsinställningar',
  type: 'document',
  fields: [
    defineField({name: 'siteName', title: 'Webbplatsens namn', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'legalName', title: 'Juridiskt namn', type: 'string'}),
    defineField({name: 'email', title: 'Publik e-postadress', type: 'string', validation: (Rule) => Rule.email()}),
    defineField({name: 'address', title: 'Publik adress', type: 'string', description: 'Visa bara adress som är godkänd för publicering.'}),
    defineField({name: 'socialLinks', title: 'Sociala länkar', type: 'array', of: [{type: 'url'}]}),
    defineField({name: 'defaultSeoTitle', title: 'Standardtitel i Google', type: 'string'}),
    defineField({name: 'defaultSeoDescription', title: 'Standardbeskrivning i Google', type: 'text', rows: 3, validation: (Rule) => Rule.max(160)}),
  ],
})
