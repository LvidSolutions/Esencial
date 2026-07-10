import {defineField, defineType} from 'sanity'

export const projectType = defineType({
  name: 'project',
  title: 'Projekt / Project',
  type: 'document',
  groups: [
    {name: 'basics', title: '1. Grunduppgifter'},
    {name: 'content', title: '2. Innehall'},
    {name: 'images', title: '3. Bilder'},
    {name: 'seo', title: '4. Sök och delning'},
  ],
  fields: [
    defineField({name: 'title', title: 'Projektnamn', type: 'string', group: 'basics', description: 'Använd projektets publicerade namn.', validation: (Rule) => Rule.required()}),
    defineField({name: 'slug', title: 'Webbadress', type: 'slug', group: 'basics', description: 'Skapas från namnet. Ändra bara efter att en omdirigering har planerats.', options: {source: 'title'}, validation: (Rule) => Rule.required()}),
    defineField({name: 'language', title: 'Språk', type: 'string', group: 'basics', options: {list: [{title: 'Svenska', value: 'sv'}, {title: 'English', value: 'en'}]}, validation: (Rule) => Rule.required()}),
    defineField({name: 'translationKey', title: 'Språkkoppling', type: 'string', group: 'basics', description: 'Intern koppling mellan svensk och engelsk version. Ändra inte.', readOnly: true}),
    defineField({name: 'location', title: 'Publicerad plats', type: 'string', group: 'basics', description: 'Skriv bara den detaljnivå som är godkänd att publicera.'}),
    defineField({name: 'year', title: 'År', type: 'number', group: 'basics', validation: (Rule) => Rule.integer().min(1900).max(2100)}),
    defineField({name: 'status', title: 'Arbetsläge', type: 'string', group: 'basics', description: 'Utkast syns inte på webbplatsen. Välj Att granska när innehållet är klart.', options: {list: [{title: 'Utkast', value: 'draft'}, {title: 'Att granska', value: 'review'}, {title: 'Publicerat', value: 'published'}, {title: 'Arkiverat', value: 'archived'}]}, initialValue: 'draft'}),
    defineField({name: 'summary', title: 'Kort projektintroduktion', type: 'text', group: 'content', rows: 5, description: 'Förklara vad projektet är med egna, tydliga ord. Texten används också som grund för sökresultat.', validation: (Rule) => Rule.required().min(40).max(700)}),
    defineField({name: 'body', title: 'Längre projektberättelse', type: 'array', group: 'content', description: 'Valfritt fördjupande innehåll om idé, plats, process och resultat.', of: [{type: 'block'}]}),
    defineField({name: 'images', title: 'Publicerade bilder', type: 'array', group: 'images', description: 'Lägg bara in bilder med godkända rättigheter. Varje bild behöver en beskrivning.', validation: (Rule) => Rule.custom((value, context) => context.parent?.status !== 'published' || value?.length ? true : 'Ett publicerat projekt behöver minst en bild.'), of: [{type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Bildbeskrivning', type: 'string', description: 'Beskriv vad bilden visar, inte en lista med sökord.', validation: (Rule) => Rule.required()}), defineField({name: 'credit', title: 'Fotograf eller källa', type: 'string'})]}]}),
    defineField({name: 'legacyImages', title: 'Bilder från tidigare webbplats', type: 'array', group: 'images', description: 'Referenslista inför bildmigrering. Dessa bilder visas inte automatiskt som Sanity-bilder.', readOnly: true, of: [{type: 'object', fields: [defineField({name: 'url', title: 'Befintlig bildadress', type: 'url'}), defineField({name: 'alt', title: 'Befintlig bildbeskrivning', type: 'string'})]}]}),
    defineField({name: 'seoTitle', title: 'Titel i Google', type: 'string', group: 'seo', description: 'En tydlig titel för sökresultatet. Sikta på högst 60 tecken.', validation: (Rule) => Rule.max(60)}),
    defineField({name: 'seoDescription', title: 'Beskrivning i Google', type: 'text', group: 'seo', rows: 3, description: 'En mänsklig sammanfattning som får någon att vilja öppna sidan. Sikta på högst 160 tecken.', validation: (Rule) => Rule.max(160)}),
  ],
  preview: {select: {title: 'title', location: 'location', language: 'language', status: 'status', media: 'images.0'}, prepare: ({title, location, language, status, media}) => ({title, subtitle: [language?.toUpperCase(), location, status].filter(Boolean).join(' · '), media})},
})
