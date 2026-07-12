import {defineField, defineType} from 'sanity'

const imageFields = [
  defineField({
    name: 'alt',
    title: 'Alt-text',
    type: 'string',
    description: 'Beskriv bilden för personer som inte kan se den och för sökmotorer.',
    validation: (Rule) => Rule.required().min(8).warning('Skriv en tydligare beskrivning av motivet.'),
  }),
  defineField({name: 'credit', title: 'Fotograf / kredit', type: 'string', validation: (Rule) => Rule.required()}),
  defineField({
    name: 'rightsConfirmed',
    title: 'Rättigheter bekräftade',
    type: 'boolean',
    description: 'Bekräfta att Esencial har rätt att använda bilden på webbplatsen.',
    validation: (Rule) => Rule.required().custom((value) => value === true ? true : 'Bekräfta rättigheterna innan bilden kan publiceras.'),
  }),
]

export const projectHeroImageType = defineType({
  name: 'projectHeroImage',
  title: 'Huvudbild',
  type: 'image',
  options: {hotspot: true},
  fields: imageFields,
  preview: {select: {title: 'alt', subtitle: 'credit', media: 'asset'}, prepare: ({title, subtitle, media}) => ({title: title || 'Huvudbild', subtitle: subtitle ? `Kredit: ${subtitle}` : 'Saknar kredit', media})},
})

export const projectGalleryImageType = defineType({
  name: 'projectGalleryImage',
  title: 'Projektbild',
  type: 'image',
  options: {hotspot: true},
  fields: [
    ...imageFields,
    defineField({name: 'caption', title: 'Bildtext', type: 'string', description: 'Valfritt. Visas tillsammans med bilden på projektsidan.'}),
    defineField({name: 'hideFromWebsite', title: 'Visa inte publikt', type: 'boolean', initialValue: false, description: 'Behåll bilden i CMS men uteslut den från den publika projektsidan.'}),
  ],
  preview: {select: {title: 'alt', subtitle: 'credit', hidden: 'hideFromWebsite', media: 'asset'}, prepare: ({title, subtitle, hidden, media}) => ({title: title || 'Saknar alt-text', subtitle: `${hidden ? 'Inte publikt' : 'Publiceras'}${subtitle ? ` · ${subtitle}` : ''}`, media})},
})

export const floorPlanType = defineType({
  name: 'floorPlan',
  title: 'Planritning',
  type: 'object',
  fields: [
    defineField({name: 'name', title: 'Namn', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'planType', title: 'Typ', type: 'string', options: {list: [{title: 'Planlösning', value: 'planlosning'}, {title: 'Situationsplan', value: 'situationsplan'}, {title: 'Sektion', value: 'sektion'}, {title: 'Fasad', value: 'fasad'}, {title: 'Annat', value: 'annat'}]}, validation: (Rule) => Rule.required()}),
    defineField({name: 'area', title: 'Våning / område', type: 'string'}),
    defineField({name: 'image', title: 'Planritning', type: 'image', options: {hotspot: false}, validation: (Rule) => Rule.required(), fields: imageFields}),
    defineField({name: 'description', title: 'Kort beskrivning', type: 'text', rows: 2}),
  ],
  preview: {select: {title: 'name', subtitle: 'area', media: 'image'}, prepare: ({title, subtitle, media}) => ({title: title || 'Namnlös planritning', subtitle, media})},
})
