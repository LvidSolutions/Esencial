import {defineField, defineType, type SanityDocument, type ValidationContext} from 'sanity'

type ProjectParent = {
  status?: string
  images?: unknown[]
  legacyImages?: unknown[]
  heroImage?: unknown
  galleryImages?: unknown[]
  cardImages?: unknown[]
  slideshowImages?: unknown[]
}

const parentOf = (context: {parent?: unknown}) => (context.parent || {}) as ProjectParent
const isPublished = (context: {parent?: unknown}) => parentOf(context).status === 'published'
const isReviewOrPublished = (context: {parent?: unknown}) => ['review', 'published'].includes(parentOf(context).status || '')
const hasModernImages = (document: unknown) => {
  const project = (document || {}) as {
    heroImage?: unknown
    galleryImages?: unknown[]
    cardImages?: unknown[]
    slideshowImages?: unknown[]
  }
  return Boolean(
    project.cardImages?.length ||
      project.slideshowImages?.length ||
      project.heroImage ||
      project.galleryImages?.length,
  )
}
const hasCardImages = (context: {parent?: unknown}) => parentOf(context).cardImages?.length
const hasPublicationImages = (context: {parent?: unknown}) =>
  hasCardImages(context) ||
  parentOf(context).heroImage ||
  parentOf(context).galleryImages?.length ||
  parentOf(context).images?.length ||
  parentOf(context).legacyImages?.length
const documentArrayHasItems = (document: SanityDocument | undefined, field: string) => {
  const value = (document as Record<string, unknown> | undefined)?.[field]
  return Array.isArray(value) && value.length > 0
}
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const translationKeyPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/
const apiVersion = '2025-02-19'

type ProjectPairCandidate = {
  _id: string
  language?: string
  slug?: string
  status?: string
  translationStatus?: string
  seoTitle?: string
  seoDescription?: string
}

function canonicalId(id: string) {
  return id.replace(/^drafts\./, '')
}

async function validateTranslationPair(document: SanityDocument | undefined, context: ValidationContext) {
  const status = document?.status as string | undefined
  if (!document || !['review', 'published'].includes(status || '')) return true
  const translationKey = document.translationKey as string | undefined
  const language = document.language as string | undefined
  const slug = (document.slug as {current?: string} | undefined)?.current
  if (!translationKey || !language || !slug) return true

  const currentId = canonicalId((document._id as string | undefined) || '')
  const matches = await context.getClient({apiVersion}).withConfig({perspective: 'raw'}).fetch<ProjectPairCandidate[]>(
    `*[_type == "project" && translationKey == $translationKey && !(_id in [$publishedId, $draftId])] {
      _id, language, "slug": slug.current, status, translationStatus, seoTitle, seoDescription
    }`,
    {translationKey, publishedId: currentId, draftId: `drafts.${currentId}`},
  )
  const deduplicated = new Map<string, ProjectPairCandidate>()
  for (const candidate of matches) {
    const id = canonicalId(candidate._id)
    if (!deduplicated.has(id) || candidate._id.startsWith('drafts.')) deduplicated.set(id, candidate)
  }
  const candidates = [...deduplicated.values()]
  if (candidates.some((candidate) => candidate.language === language)) {
    return `Språkkopplingen ${translationKey} används redan av ett annat ${language === 'sv' ? 'svenskt' : 'engelskt'} projekt. Varje språk får bara finnas en gång.`
  }
  const counterpart = candidates.find((candidate) => candidate.language && candidate.language !== language)
  if (!counterpart) return `Skapa och koppla den ${language === 'sv' ? 'engelska' : 'svenska'} versionen med samma språkkoppling innan projektet lämnar Under arbete.`
  if (counterpart.slug !== slug) return `Den kopplade språkversionen använder webbadressen “${counterpart.slug || 'saknas'}”. Båda språken måste använda samma permanenta webbadress.`
  if (status === 'published' && counterpart.translationStatus !== 'approved') return 'Den kopplade språkversionen måste ha översättningsstatus Godkänd före publicering.'
  if (status === 'published' && (!counterpart.seoTitle || counterpart.seoTitle.length > 60 || !counterpart.seoDescription || counterpart.seoDescription.length > 160)) return 'Den kopplade språkversionen måste ha en giltig Google-titel och Google-beskrivning före publicering.'
  return true
}

export const projectType = defineType({
  name: 'project',
  title: 'Projekt / Project',
  type: 'document',
  validation: (Rule) => Rule.custom(validateTranslationPair),
  groups: [
    {name: 'basics', title: '1. Grunduppgifter'},
    {name: 'content', title: '2. Innehåll'},
    {name: 'images', title: '3. Bilder och planritningar'},
    {name: 'seo', title: '4. Granskning och sök'},
  ],
  fields: [
    defineField({name: 'title', title: 'Projektrubrik för vald språkversion', type: 'string', group: 'basics', description: 'Redigera bara den faktiska rubriken för dokumentets valda språk. Skapa eller översätt aldrig den andra språkversionen utan godkänt underlag; språkkoppling, slug och publiceringskontroller gäller fortfarande.', validation: (Rule) => Rule.required()}),
    defineField({name: 'slug', title: 'Permanent webbadress', type: 'slug', group: 'basics', description: 'Samma värde ska användas på svenska och engelska. Ett publicerat värde låses; en ändring kräver först status Under arbete/Klar att publicera och en separat omdirigeringsplan.', options: {source: 'title'}, readOnly: ({document}) => document?.status === 'published', validation: (Rule) => Rule.required().custom((value) => !value?.current || slugPattern.test(value.current) ? true : 'Använd endast små bokstäver, siffror och enkla bindestreck, till exempel “mitt-projekt”.')}),
    defineField({name: 'language', title: 'Sprak', type: 'string', group: 'basics', options: {list: [{title: 'Svenska', value: 'sv'}, {title: 'English', value: 'en'}]}, validation: (Rule) => Rule.required()}),
    defineField({name: 'translationKey', title: 'Språkkoppling', type: 'string', group: 'basics', description: 'Gemensam intern nyckel för det svenska och engelska projektet. Projektredigeraren skapar den automatiskt för nya språkpar. Ett publicerat värde är låst.', readOnly: ({document}) => document?.status === 'published', validation: (Rule) => Rule.custom((value, context) => {
      if (isReviewOrPublished(context) && !value) return 'Ange en språkkoppling innan projektet lämnar Under arbete.'
      return !value || translationKeyPattern.test(value) ? true : 'Använd endast små bokstäver, siffror och enkla understreck, till exempel “mitt_projekt”.'
    })}),
    defineField({
      name: 'pairedProject',
      title: 'Kopplad språkversion',
      type: 'reference',
      group: 'basics',
      weak: true,
      description: 'Projektredigeraren sätter länken åt båda håll för nya språkpar. Äldre projekt kan fortsätta använda enbart Språkkoppling tills de redigeras.',
      to: [{type: 'project'}],
      options: {
        filter: ({document}) => ({
          filter: 'language != $language && translationKey == $translationKey',
          params: {language: document?.language || '', translationKey: document?.translationKey || ''},
        }),
      },
    }),
    defineField({name: 'translationStatus', title: 'Översättningsstatus', type: 'string', group: 'basics', options: {list: [{title: 'Ej påbörjad', value: 'not-started'}, {title: 'Under arbete', value: 'in-progress'}, {title: 'Klar för granskning', value: 'ready-for-review'}, {title: 'Godkänd', value: 'approved'}]}, initialValue: 'not-started', validation: (Rule) => Rule.custom((value, context) => !isPublished(context) || value === 'approved' ? true : 'Välj Godkänd när båda språkversionerna har kontrollerats före publicering.')}),
    defineField({name: 'location', title: 'Plats', type: 'string', group: 'basics'}),
    defineField({name: 'year', title: 'Byggnadsår', type: 'number', group: 'basics', validation: (Rule) => Rule.integer().min(1900).max(2100)}),
    defineField({name: 'typology', title: 'Typologi', type: 'string', group: 'basics', description: 'Exempel: bostäder, kultur, landskap eller stadsutveckling. Publicera bara en bekräftad benämning.'}),
    defineField({name: 'client', title: 'Byggherre', type: 'string', group: 'basics', description: 'Valfritt. Publicera först när namn och sekretess är godkända.'}),
    defineField({name: 'architect', title: 'Arkitekt', type: 'string', group: 'basics'}),
    defineField({name: 'projectManager', title: 'Handläggare', type: 'string', group: 'basics'}),
    defineField({name: 'collaborators', title: 'Medarbetare', type: 'array', group: 'basics', of: [{type: 'string'}], description: 'Valfritt. Ange endast medverkande som får namnges offentligt.'}),
    defineField({name: 'landscape', title: 'Landskap', type: 'string', group: 'basics'}),
    defineField({name: 'photography', title: 'Foto', type: 'string', group: 'basics', description: 'Valfritt övergripande fotokredit. Bildspecifik kredit anges på varje bild.'}),
    defineField({name: 'artwork', title: 'Konstnärlig utsmyckning', type: 'string', group: 'basics'}),
    defineField({name: 'grossArea', title: 'Bruttoarea', type: 'string', group: 'basics', description: 'Ange gärna enhet, till exempel “2 450 m²”.'}),
    defineField({name: 'team', title: 'Medarbetare (äldre fält)', type: 'array', group: 'basics', hidden: ({document}) => documentArrayHasItems(document, 'collaborators'), of: [{type: 'string'}], description: 'Behålls för äldre projekt. Använd Medarbetare för nya eller uppdaterade projekt.'}),
    defineField({name: 'services', title: 'Uppdrag / omfattning', type: 'array', group: 'basics', of: [{type: 'string'}], description: 'Valfritt. Exempel: förstudie, detaljplan eller bygghandling.'}),
    defineField({
      name: 'cardBackgroundPreset',
      title: 'Kortbakgrund',
      type: 'string',
      group: 'basics',
      description: 'Påverkar endast projektkortets bakgrund bakom bilder och text. Välj enbart en befintlig Esencial-färg; bilder och övrig webbdesign förändras inte.',
      initialValue: 'warm-paper',
      readOnly: ({document}) => document?.language === 'en' && Boolean(document?.translationKey),
      options: {
        layout: 'radio',
        list: [
          {title: 'Varmt papper', value: 'warm-paper'},
          {title: 'Ljus blågrå', value: 'cool-blue'},
          {title: 'Ljust grönt', value: 'pale-green'},
          {title: 'Varm vit', value: 'soft-blush'},
          {title: 'Disigt blått', value: 'mist-blue'},
          {title: 'Ljus persika', value: 'pale-peach'},
          {title: 'Ljus rosé', value: 'pale-rose'},
          {title: 'Ljus periwinkle', value: 'pale-periwinkle'},
          {title: 'Isblå', value: 'ice'},
          {title: 'Ljus lavendel', value: 'lavender'},
          {title: 'Ljust gult', value: 'sun'},
          {title: 'Ljus lila', value: 'lilac'},
          {title: 'Varm grå', value: 'stone'},
          {title: 'Ljus himmelsblå', value: 'sky'},
          {title: 'Kall vit', value: 'cloud'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'status', title: 'Publiceringsläge', type: 'string', group: 'basics', description: 'Arbeta klart, välj Klar att publicera och gör sedan en sista egenkontroll. Endast Publicerad byggs till webbplatsen.', options: {list: [{title: 'Under arbete', value: 'draft'}, {title: 'Klar att publicera', value: 'review'}, {title: 'Publicerad', value: 'published'}, {title: 'Arkiverad', value: 'archived'}]}, initialValue: 'draft'}),
    defineField({name: 'summary', title: 'Löptext', type: 'text', group: 'content', rows: 5, validation: (Rule) => Rule.required().min(40).max(700)}),
    defineField({name: 'body', title: 'Langre projektberattelse', type: 'array', group: 'content', of: [{type: 'block'}]}),
    defineField({name: 'relatedProjects', title: 'Relaterade projekt', type: 'array', group: 'content', description: 'Valfritt och redaktionellt. Koppla bara projekt med en verklig, förklarbar relation.', of: [{type: 'reference', to: [{type: 'project'}]}]}),
    defineField({
      name: 'cardImages',
      title: 'Kortbilder',
      type: 'array',
      group: 'images',
      description: 'Kortbild 1 och Kortbild 2 visas i projektkortet och blir automatiskt bild 1 och 2 i bildspelet. Projektredigeraren speglar samma bilddata till språkparet.',
      readOnly: ({document}) => document?.language === 'en' && Boolean(document?.translationKey),
      of: [{type: 'projectCardImage'}],
      validation: (Rule) =>
        Rule.max(2).custom((value, context) => {
          if (!isPublished(context) || !Array.isArray(value) || value.length === 0) return true
          return value.length === 2
            ? true
            : 'När Kortbilder används måste både Kortbild 1 och Kortbild 2 vara ifyllda före publicering.'
        }),
    }),
    defineField({
      name: 'slideshowImages',
      title: 'Övriga bilder i bildspelet',
      type: 'array',
      group: 'images',
      description: 'Bilderna visas efter Kortbild 1 och Kortbild 2. Dra och släpp för ordning. Lägg aldrig planritningar här.',
      readOnly: ({document}) => document?.language === 'en' && Boolean(document?.translationKey),
      of: [{type: 'projectSlideshowImage'}],
    }),
    defineField({
      name: 'heroImage',
      title: 'Huvudbild (äldre fält)',
      type: 'projectHeroImage',
      group: 'images',
      description: 'Behålls för äldre publicerat innehåll. Använd Kortbilder för nya eller uppdaterade projekt. Lägg inte planritningar här.',
      hidden: ({document}) => documentArrayHasItems(document, 'cardImages'),
      validation: (Rule) => Rule.custom((value, context) => !isPublished(context) || value || hasPublicationImages(context) ? true : 'Ett publicerat projekt behöver minst en kortbild eller äldre huvudbild.')}),
    defineField({
      name: 'galleryImages',
      title: 'Övriga bilder i bildspelet (äldre fält)',
      type: 'array',
      group: 'images',
      description: 'Behålls för äldre publicerat innehåll. Använd Övriga bilder i bildspelet för nya eller uppdaterade projekt.',
      hidden: ({document}) =>
        documentArrayHasItems(document, 'cardImages') || documentArrayHasItems(document, 'slideshowImages'),
      of: [{type: 'projectGalleryImage'}],
    }),
    defineField({name: 'floorPlans', title: 'Planritningar', type: 'array', group: 'images', description: 'Endast planritningar. Dessa visas separat från bildspelet och kan inte blandas med vanliga bilder.', of: [{type: 'floorPlan'}]}),
    defineField({name: 'images', title: 'Tidigare publicerade bilder', type: 'array', group: 'images', description: 'Äldre bildfält för redan migrerat innehåll. Använd Kortbilder och Övriga bilder i bildspelet för nya eller uppdaterade projekt.', hidden: ({document}) => hasModernImages(document), validation: (Rule) => Rule.custom((value, context) => !isPublished(context) || (Array.isArray(value) && value.length > 0) || hasPublicationImages(context) ? true : 'Ett publicerat projekt behöver minst en bild.'), of: [{type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Bildbeskrivning', type: 'string', validation: (Rule) => Rule.required()}), defineField({name: 'credit', title: 'Fotograf eller källa', type: 'string', validation: (Rule) => Rule.required().error('Ange fotograf eller källa före publicering.')})]}]}),
    defineField({name: 'imageRightsConfirmed', title: 'Bildrattigheter bekraftade', type: 'boolean', group: 'images', description: 'Bekrafta att alla bilder far publiceras.', validation: (Rule) => Rule.custom((value, context) => !isPublished(context) || value === true ? true : 'Bildrattigheter maste bekraftas fore publicering.')}),
    defineField({name: 'legacyImages', title: 'Bilder från tidigare webbplats', type: 'array', group: 'images', description: 'Tidigare bildreferenser. Du kan visa, byta bildadress eller ta bort en referens i kladden. Migrera till Kortbilder eller Övriga bilder i bildspelet med kredit och rättighetskontroll före publicering.', validation: (Rule) => Rule.custom((value, context) => !isPublished(context) || !Array.isArray(value) || value.every((image) => {
      const legacy = image as {url?: string; alt?: string; credit?: string}
      return Boolean(legacy.url && legacy.alt && legacy.credit)
    }) ? true : 'Migrera alla äldre bilder till Kortbilder eller Övriga bilder i bildspelet och ange alt-text, kredit och rättigheter före publicering.'), of: [{type: 'object', fields: [defineField({name: 'url', title: 'Befintlig bildadress', type: 'url'}), defineField({name: 'alt', title: 'Befintlig bildbeskrivning', type: 'string'}), defineField({name: 'credit', title: 'Befintlig kredit', type: 'string'})]}]}),
    defineField({name: 'seoTitle', title: 'Titel i Google', type: 'string', group: 'seo', validation: (Rule) => Rule.max(60).custom((value, context) => !isPublished(context) || value ? true : 'Ett publicerat projekt behover en titel i Google.')}),
    defineField({name: 'seoDescription', title: 'Beskrivning i Google', type: 'text', group: 'seo', rows: 3, validation: (Rule) => Rule.max(160).custom((value, context) => !isPublished(context) || value ? true : 'Ett publicerat projekt behover en beskrivning i Google.')}),
    defineField({name: 'reviewOwner', title: 'Tidigare granskningsansvarig', type: 'string', group: 'seo', hidden: true}),
    defineField({name: 'lastReviewedAt', title: 'Tidigare granskningsdatum', type: 'datetime', group: 'seo', hidden: true}),
    defineField({name: 'reviewNotes', title: 'Egna anteckningar', type: 'text', group: 'seo', rows: 4}),
    defineField({name: 'publishChecklist', title: 'Egenkontroll före publicering', type: 'object', group: 'seo', description: 'Bocka av själv innan du väljer Publicerad. Ingen separat granskare krävs.', fields: [
      defineField({name: 'factsConfirmed', title: 'Projektfakta ar godkanda', type: 'boolean'}),
      defineField({name: 'languageChecked', title: 'Sprak och oversattning ar kontrollerade', type: 'boolean'}),
      defineField({name: 'seoChecked', title: 'Titel och beskrivning ar kontrollerade', type: 'boolean'}),
      defineField({name: 'imagesChecked', title: 'Bildbeskrivningar, credits och rattigheter ar kontrollerade', type: 'boolean'}),
    ], validation: (Rule) => Rule.custom((value, context) => !isPublished(context) || (value?.factsConfirmed && value?.languageChecked && value?.seoChecked && value?.imagesChecked) ? true : 'Slutfor publiceringschecklistan fore publicering.')}),
  ],
  preview: {select: {title: 'title', location: 'location', language: 'language', status: 'status', hero: 'heroImage', media: 'images.0'}, prepare: ({title, location, language, status, hero, media}) => ({title, subtitle: [language?.toUpperCase(), location, status].filter(Boolean).join(' - '), media: hero || media})},
})
