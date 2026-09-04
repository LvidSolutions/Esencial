import {defineField, defineType} from 'sanity'

const imageFields = [
  defineField({
    name: 'alt',
    title: 'Alt-text',
    type: 'string',
    description: 'Beskriv bilden för personer som inte kan se den och för sökmotorer.',
    validation: (Rule) => [
      Rule.required().error('Skriv en alt-text innan bilden kan publiceras.'),
      Rule.min(8).warning('Skriv en tydligare beskrivning av motivet.'),
    ],
  }),
  defineField({name: 'credit', title: 'Fotograf / kredit', type: 'string', validation: (Rule) => Rule.required().error('Ange fotograf eller källa innan bilden kan publiceras.')}),
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

export const projectCardImageType = defineType({
  name: 'projectCardImage',
  title: 'Kortbild',
  type: 'image',
  options: {hotspot: true},
  fields: imageFields,
  preview: {
    select: {title: 'alt', subtitle: 'credit', media: 'asset'},
    prepare: ({title, subtitle, media}) => ({
      title: title || 'Kortbild',
      subtitle: subtitle ? `Kredit: ${subtitle}` : 'Saknar kredit',
      media,
    }),
  },
})

const slideshowImageFields = [
  ...imageFields,
  defineField({
    name: 'caption',
    title: 'Bildtext',
    type: 'string',
    description: 'Valfritt. Visas tillsammans med bilden på projektsidan.',
  }),
  defineField({
    name: 'hideFromWebsite',
    title: 'Visa inte publikt',
    type: 'boolean',
    initialValue: false,
    description: 'Behåll bilden i CMS men uteslut den från den publika projektsidan.',
  }),
]

const slideshowImagePreview = {
  select: {title: 'alt', subtitle: 'credit', hidden: 'hideFromWebsite', media: 'asset'},
  prepare: ({title, subtitle, hidden, media}: {title?: string; subtitle?: string; hidden?: boolean; media?: any}) => ({
    title: title || 'Saknar alt-text',
    subtitle: `${hidden ? 'Inte publikt' : 'Publiceras'}${subtitle ? ` · ${subtitle}` : ''}`,
    media,
  }),
}

export const projectSlideshowImageType = defineType({
  name: 'projectSlideshowImage',
  title: 'Bild i bildspelet',
  type: 'image',
  options: {hotspot: true},
  fields: slideshowImageFields,
  preview: slideshowImagePreview,
})

// The original feed has separate left and right media streams.  A flat array
// cannot retain that relationship, so migrated projects use this additive
// model while legacy fields remain available for unreviewed material.
export const projectPresentationMediaType = defineType({
  name: 'projectPresentationMedia',
  title: 'Media i presentationsvy',
  type: 'image',
  options: {hotspot: true},
  fields: [
    ...slideshowImageFields,
    defineField({
      name: 'mediaKind',
      title: 'Typ av media',
      type: 'string',
      options: {list: [{title: 'Fotografi', value: 'photograph'}, {title: 'Ritning', value: 'drawing'}, {title: 'Annat', value: 'other'}]},
      initialValue: 'photograph',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: slideshowImagePreview,
})

export const projectPresentationViewType = defineType({
  name: 'projectPresentationView',
  title: 'Vänster/höger-vy',
  type: 'object',
  fields: [
    defineField({name: 'left', title: 'Vänster media', type: 'projectPresentationMedia', description: 'Vänster plats i den publicerade projektpresentationen.'}),
    defineField({name: 'right', title: 'Höger media', type: 'projectPresentationMedia', description: 'Höger plats i den publicerade projektpresentationen.'}),
  ],
  validation: (Rule) => Rule.custom((value) => value?.left || value?.right ? true : 'En presentationsvy behöver minst en vänster- eller högermediareferens.'),
  preview: {
    select: {left: 'left.alt', right: 'right.alt'},
    prepare: ({left, right}) => ({title: left || right || 'Tom presentationsvy', subtitle: left && right ? 'Vänster + höger' : left ? 'Endast vänster' : 'Endast höger'}),
  },
})

export const projectGalleryImageType = defineType({
  name: 'projectGalleryImage',
  title: 'Bild i bildspelet (äldre)',
  type: 'image',
  options: {hotspot: true},
  fields: slideshowImageFields,
  preview: slideshowImagePreview,
})

export const floorPlanType = defineType({
  name: 'floorPlan',
  title: 'Planritning',
  type: 'object',
  fields: [
    defineField({name: 'name', title: 'Namn', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'planType', title: 'Typ', type: 'string', options: {list: [{title: 'Planlösning', value: 'planlosning'}, {title: 'Situationsplan', value: 'situationsplan'}, {title: 'Sektion', value: 'sektion'}, {title: 'Fasad', value: 'fasad'}, {title: 'Annat', value: 'annat'}]}, validation: (Rule) => Rule.required()}),
    defineField({name: 'area', title: 'Våning / område', type: 'string'}),
    defineField({name: 'image', title: 'Planritning', type: 'image', description: 'Planritningen stannar i denna separata sektion och används aldrig som kortbild eller bild i bildspelet.', options: {hotspot: false}, validation: (Rule) => Rule.required(), fields: imageFields}),
    defineField({name: 'description', title: 'Kort beskrivning', type: 'text', rows: 2}),
  ],
  preview: {select: {title: 'name', subtitle: 'area', media: 'image'}, prepare: ({title, subtitle, media}) => ({title: title || 'Namnlös planritning', subtitle, media})},
})
