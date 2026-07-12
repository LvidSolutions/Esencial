import {defineField, defineType} from 'sanity'

const isPublished = (context: {parent?: {status?: string}}) => context.parent?.status === 'published'

export const projectType = defineType({
  name: 'project',
  title: 'Projekt / Project',
  type: 'document',
  groups: [
    {name: 'basics', title: '1. Grunduppgifter'},
    {name: 'content', title: '2. Innehall'},
    {name: 'images', title: '3. Bilder och planritningar'},
    {name: 'seo', title: '4. Granskning och sok'},
  ],
  fields: [
    defineField({name: 'title', title: 'Projektnamn', type: 'string', group: 'basics', validation: (Rule) => Rule.required()}),
    defineField({name: 'slug', title: 'Webbadress', type: 'slug', group: 'basics', description: 'Andra bara efter att en omdirigering har planerats.', options: {source: 'title'}, validation: (Rule) => Rule.required()}),
    defineField({name: 'language', title: 'Sprak', type: 'string', group: 'basics', options: {list: [{title: 'Svenska', value: 'sv'}, {title: 'English', value: 'en'}]}, validation: (Rule) => Rule.required()}),
    defineField({name: 'translationKey', title: 'Sprakkoppling', type: 'string', group: 'basics', description: 'Intern koppling mellan svensk och engelsk version. Andra inte.', readOnly: true}),
    defineField({name: 'translationStatus', title: 'Oversattningsstatus', type: 'string', group: 'basics', options: {list: [{title: 'Ej paborjad', value: 'not-started'}, {title: 'Under arbete', value: 'in-progress'}, {title: 'Klar for granskning', value: 'ready-for-review'}, {title: 'Godkand', value: 'approved'}]}, initialValue: 'not-started'}),
    defineField({name: 'location', title: 'Publicerad plats', type: 'string', group: 'basics'}),
    defineField({name: 'year', title: 'Ar', type: 'number', group: 'basics', validation: (Rule) => Rule.integer().min(1900).max(2100)}),
    defineField({name: 'status', title: 'Arbetslage', type: 'string', group: 'basics', description: 'Utkast syns inte pa webbplatsen. Valj Att granska nar innehallet ar klart.', options: {list: [{title: 'Utkast', value: 'draft'}, {title: 'Att granska', value: 'review'}, {title: 'Publicerat', value: 'published'}, {title: 'Arkiverat', value: 'archived'}]}, initialValue: 'draft'}),
    defineField({name: 'summary', title: 'Kort projektintroduktion', type: 'text', group: 'content', rows: 5, validation: (Rule) => Rule.required().min(40).max(700)}),
    defineField({name: 'body', title: 'Langre projektberattelse', type: 'array', group: 'content', of: [{type: 'block'}]}),
    defineField({name: 'heroImage', title: 'Huvudbild', type: 'projectHeroImage', group: 'images', description: 'Visas överst på projektsidan och används för projektkort där en huvudbild behövs. Lägg inte planritningar här.', validation: (Rule) => Rule.custom((value, context) => !isPublished(context) || value || context.parent?.images?.length || context.parent?.legacyImages?.length ? true : 'Ett publicerat projekt behöver en huvudbild. Migrerade äldre projekt får tillfälligt använda tidigare bilder.')}),
    defineField({name: 'galleryImages', title: 'Projektgalleri', type: 'array', group: 'images', description: 'Vanliga bilder på projektsidan. Dra och släpp för ordning: första visas först, sista sist. Lägg aldrig planritningar här.', of: [{type: 'projectGalleryImage'}]}),
    defineField({name: 'floorPlans', title: 'Planritningar', type: 'array', group: 'images', description: 'Endast planritningar. Dessa visas separat från projektgalleriet och kan inte blandas med vanliga bilder.', of: [{type: 'floorPlan'}]}),
    defineField({name: 'images', title: 'Tidigare publicerade bilder', type: 'array', group: 'images', description: 'Äldre bildfält för redan migrerat innehåll. Använd Huvudbild och Projektgalleri för nya eller uppdaterade projekt.', hidden: ({document}) => Boolean(document?.heroImage || document?.galleryImages?.length), validation: (Rule) => Rule.custom((value, context) => !isPublished(context) || value?.length || context.parent?.heroImage || context.parent?.legacyImages?.length ? true : 'Ett publicerat projekt behöver minst en bild.'), of: [{type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Bildbeskrivning', type: 'string', validation: (Rule) => Rule.required()}), defineField({name: 'credit', title: 'Fotograf eller källa', type: 'string'})]}]}),
    defineField({name: 'imageRightsConfirmed', title: 'Bildrattigheter bekraftade', type: 'boolean', group: 'images', description: 'Bekrafta att alla bilder far publiceras.', validation: (Rule) => Rule.custom((value, context) => !isPublished(context) || value === true ? true : 'Bildrattigheter maste bekraftas fore publicering.')}),
    defineField({name: 'legacyImages', title: 'Bilder fran tidigare webbplats', type: 'array', group: 'images', description: 'Referenslista tills varje bild ar migrerad till Sanity.', readOnly: true, of: [{type: 'object', fields: [defineField({name: 'url', title: 'Befintlig bildadress', type: 'url'}), defineField({name: 'alt', title: 'Befintlig bildbeskrivning', type: 'string'})]}]}),
    defineField({name: 'seoTitle', title: 'Titel i Google', type: 'string', group: 'seo', validation: (Rule) => Rule.max(60).custom((value, context) => !isPublished(context) || value ? true : 'Ett publicerat projekt behover en titel i Google.')}),
    defineField({name: 'seoDescription', title: 'Beskrivning i Google', type: 'text', group: 'seo', rows: 3, validation: (Rule) => Rule.max(160).custom((value, context) => !isPublished(context) || value ? true : 'Ett publicerat projekt behover en beskrivning i Google.')}),
    defineField({name: 'reviewOwner', title: 'Ansvarig granskare', type: 'string', group: 'seo'}),
    defineField({name: 'lastReviewedAt', title: 'Senast granskad', type: 'datetime', group: 'seo'}),
    defineField({name: 'reviewNotes', title: 'Granskningsanteckningar', type: 'text', group: 'seo', rows: 4}),
    defineField({name: 'publishChecklist', title: 'Publiceringschecklista', type: 'object', group: 'seo', fields: [
      defineField({name: 'factsConfirmed', title: 'Projektfakta ar godkanda', type: 'boolean'}),
      defineField({name: 'languageChecked', title: 'Sprak och oversattning ar kontrollerade', type: 'boolean'}),
      defineField({name: 'seoChecked', title: 'Titel och beskrivning ar kontrollerade', type: 'boolean'}),
      defineField({name: 'imagesChecked', title: 'Bildbeskrivningar, credits och rattigheter ar kontrollerade', type: 'boolean'}),
    ], validation: (Rule) => Rule.custom((value, context) => !isPublished(context) || (value?.factsConfirmed && value?.languageChecked && value?.seoChecked && value?.imagesChecked) ? true : 'Slutfor publiceringschecklistan fore publicering.')}),
  ],
  preview: {select: {title: 'title', location: 'location', language: 'language', status: 'status', hero: 'heroImage', media: 'images.0'}, prepare: ({title, location, language, status, hero, media}) => ({title, subtitle: [language?.toUpperCase(), location, status].filter(Boolean).join(' - '), media: hero || media})},
})
