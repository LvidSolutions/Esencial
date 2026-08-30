export const CONTENT_MEDIA_SECTION_ID = 'content-media'

export const CONTENT_MEDIA_SECTION_SUMMARY =
  'Nå alla redigerbara projektfält i Sanitys fullständiga dokumentformulär, granska aktuell media och hantera bildreferenser med tydligt kladdskydd och återställning.'

export const PROJECT_FIELD_GROUPS = Object.freeze([
  Object.freeze({
    id: 'basics',
    title: 'Grunduppgifter och publiceringsläge',
    fields: Object.freeze([
      {path: 'title', label: 'Projektrubrik'},
      {path: 'slug', label: 'Permanent webbadress'},
      {path: 'language', label: 'Språk'},
      {path: 'translationKey', label: 'Språkkoppling'},
      {path: 'translationStatus', label: 'Översättningsstatus'},
      {path: 'location', label: 'Plats'},
      {path: 'year', label: 'Byggnadsår'},
      {path: 'typology', label: 'Typologi'},
      {path: 'client', label: 'Byggherre'},
      {path: 'architect', label: 'Arkitekt'},
      {path: 'projectManager', label: 'Handläggare'},
      {path: 'collaborators', label: 'Medarbetare'},
      {path: 'landscape', label: 'Landskap'},
      {path: 'photography', label: 'Foto'},
      {path: 'artwork', label: 'Konstnärlig utsmyckning'},
      {path: 'grossArea', label: 'Bruttoarea'},
      {path: 'cardBackgroundPreset', label: 'Kortbakgrund'},
      {path: 'services', label: 'Uppdrag / omfattning'},
      {path: 'status', label: 'Publiceringsläge'},
    ]),
  }),
  Object.freeze({
    id: 'content',
    title: 'Projektinnehåll',
    fields: Object.freeze([
      {path: 'summary', label: 'Löptext'},
      {path: 'body', label: 'Längre projektberättelse'},
      {path: 'relatedProjects', label: 'Relaterade projekt'},
    ]),
  }),
  Object.freeze({
    id: 'seo',
    title: 'SEO och granskning',
    fields: Object.freeze([
      {path: 'seoTitle', label: 'Titel i Google'},
      {path: 'seoDescription', label: 'Beskrivning i Google'},
      {path: 'reviewNotes', label: 'Egna anteckningar'},
      {path: 'publishChecklist', label: 'Egenkontroll före publicering'},
    ]),
  }),
])

export const PROJECT_EDITABLE_FIELD_PATHS = Object.freeze(
  PROJECT_FIELD_GROUPS.flatMap((group) => group.fields.map((field) => field.path)),
)

export const PROJECT_NATIVE_FIELD_PATHS = Object.freeze(['body', 'relatedProjects'])
export const PROJECT_INLINE_FIELD_PATHS = Object.freeze(
  PROJECT_EDITABLE_FIELD_PATHS.filter((path) => !PROJECT_NATIVE_FIELD_PATHS.includes(path)),
)

export const PROJECT_MEDIA_FIELDS = Object.freeze([
  {path: 'cardImages', label: 'Kortbilder', removable: true},
  {path: 'slideshowImages', label: 'Övriga bilder i bildspelet', removable: true},
  {path: 'heroImage', label: 'Huvudbild', removable: true},
  {path: 'galleryImages', label: 'Bildspelsbilder', removable: true},
  {path: 'floorPlans', label: 'Planritningar', removable: true},
  {path: 'images', label: 'Tidigare publicerade bilder', removable: true},
  {path: 'imageRightsConfirmed', label: 'Övergripande bildrättigheter', removable: false},
])

export const PROJECT_REVIEW_ONLY_FIELDS = Object.freeze([
  {path: 'legacyImages', label: 'Bilder från tidigare webbplats'},
])

export function canonicalDocumentId(id = '') {
  return String(id).replace(/^drafts\./, '')
}

export function draftDocumentId(id = '') {
  const canonical = canonicalDocumentId(id)
  if (!canonical) throw new Error('Ett projekt-ID krävs för en kladdåtgärd.')
  return `drafts.${canonical}`
}

export function assertDraftDocumentId(id) {
  if (!String(id).startsWith('drafts.')) {
    throw new Error(`Kladdskyddet avvisade ett icke-kladd-ID: ${id || 'saknas'}`)
  }
  return id
}

export function projectFieldIntent(id, path) {
  const canonical = canonicalDocumentId(id)
  if (!canonical) throw new Error('Ett projekt-ID krävs för att öppna dokumentformuläret.')
  if (!path) throw new Error('En fältsökväg krävs för att öppna dokumentformuläret.')
  return `#/intent/edit/id=${encodeURIComponent(canonical)};type=project;path=${encodeURIComponent(path)}`
}

export function validateProjectContentPatch(value) {
  const errors = {}
  const title = String(value?.title || '').trim()
  const slug = String(value?.slug || '').trim()
  const translationKey = String(value?.translationKey || '').trim()
  const summary = String(value?.summary || '').trim()
  const seoTitle = String(value?.seoTitle || '').trim()
  const seoDescription = String(value?.seoDescription || '').trim()
  const year = value?.year === '' || value?.year === undefined ? undefined : Number(value.year)

  if (!title) errors.title = 'Ange projektrubrik.'
  if (!slug) errors.slug = 'Ange permanent webbadress.'
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug = 'Använd små bokstäver, siffror och enkla bindestreck.'
  }
  if (!['sv', 'en'].includes(value?.language)) errors.language = 'Välj svenska eller engelska.'
  if (translationKey && !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(translationKey)) {
    errors.translationKey = 'Använd små bokstäver, siffror och enkla understreck.'
  }
  if (year !== undefined && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
    errors.year = 'Ange ett helt år mellan 1900 och 2100.'
  }
  if (summary.length < 40 || summary.length > 700) {
    errors.summary = 'Projektintroduktionen ska vara 40–700 tecken.'
  }
  if (seoTitle.length > 60) errors.seoTitle = 'Google-titeln får vara högst 60 tecken.'
  if (seoDescription.length > 160) {
    errors.seoDescription = 'Google-beskrivningen får vara högst 160 tecken.'
  }
  return errors
}

const MEDIA_TARGET_FIELDS = Object.freeze({
  hero: 'heroImage',
  gallery: 'galleryImages',
  cardImage: 'cardImages',
  slideshowImage: 'slideshowImages',
  floorPlan: 'floorPlans',
  previousImage: 'images',
})

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function keyedIndex(items, target) {
  if (!Array.isArray(items)) return -1
  if (target.key) return items.findIndex((item) => item?._key === target.key)
  return Number.isInteger(target.index) ? target.index : -1
}

export function createMediaRemovalPlan(document, target) {
  const field = MEDIA_TARGET_FIELDS[target?.kind]
  if (!field) throw new Error('Okänd mediatyp. Ingen kladdändring skapades.')
  const previousFieldValue = clone(document?.[field])

  if (target.kind === 'hero') {
    if (!previousFieldValue) throw new Error('Huvudbildsreferensen finns inte längre i kladden.')
    return {
      field,
      nextFieldValue: undefined,
      previousFieldValue,
      removedValue: clone(previousFieldValue),
      target: {...target},
    }
  }

  const values = Array.isArray(previousFieldValue) ? previousFieldValue : []
  const index = keyedIndex(values, target)
  if (index < 0 || index >= values.length) {
    throw new Error(
      'Mediareferensen finns inte längre i kladden. Läs om projektet och försök igen.',
    )
  }
  return {
    field,
    nextFieldValue: values.filter((_, itemIndex) => itemIndex !== index),
    previousFieldValue,
    removedValue: clone(values[index]),
    target: {...target, index},
  }
}

export function responsiveContentLayout(viewportWidth, zoom = 1) {
  const effectiveWidth = Number(viewportWidth) / Math.max(Number(zoom) || 1, 1)
  if (effectiveWidth <= 512) return 'single-column-compact'
  if (effectiveWidth <= 768) return 'single-column'
  return 'multi-column'
}

export const MEDIA_REMOVAL_WARNING =
  'Detta tar endast bort referensen från projektets kladd. Bildasseten raderas inte och den publicerade versionen ändras inte.'
