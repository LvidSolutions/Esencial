import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {URL} from 'node:url'
import {
  FILTER_CATEGORY_SCHEMA_FIELDS,
  NAVIGATION_SETTINGS_SCHEMA_FIELDS,
  resolveProjectNavigation,
  validateFilterCategoryDocument,
  validateNavigationSettingsDocument,
} from '../navigationContract.mjs'

const projects = [
  {
    _id: 'project-sv-a',
    title: 'Fixture A',
    language: 'sv',
    translationKey: 'fixture_a',
    status: 'published',
  },
  {
    _id: 'project-en-a',
    title: 'Fixture A EN',
    language: 'en',
    translationKey: 'fixture_a',
    status: 'published',
  },
  {
    _id: 'project-sv-b',
    title: 'Fixture B',
    language: 'sv',
    translationKey: 'fixture_b',
    status: 'published',
  },
  {
    _id: 'project-en-b',
    title: 'Fixture B EN',
    language: 'en',
    translationKey: 'fixture_b',
    status: 'published',
  },
]

const categories = [
  {
    _id: 'filter-fixture',
    key: 'fixture-category',
    labelSv: 'Fixturekategori',
    labelEn: 'Fixture category',
    order: 0,
    visible: true,
    projectRefs: ['project-sv-b'],
  },
]

const settings = {
  enabled: true,
  headingSv: 'Fixtureprojekt',
  headingEn: 'Fixture projects',
  allLabelSv: 'Alla fixtureprojekt',
  allLabelEn: 'All fixture projects',
  gridEntries: [
    {projectRef: 'project-sv-b', includeInGrid: true},
    {projectRef: 'project-sv-a', includeInGrid: false},
  ],
}

test('schema contract exposes every required category and navigation field', () => {
  assert.deepEqual(FILTER_CATEGORY_SCHEMA_FIELDS, [
    'key',
    'labelSv',
    'labelEn',
    'order',
    'visible',
    'projects',
  ])
  assert.deepEqual(NAVIGATION_SETTINGS_SCHEMA_FIELDS, [
    'enabled',
    'headingSv',
    'headingEn',
    'allLabelSv',
    'allLabelEn',
    'gridProjects',
  ])
})

test('authored Sanity schemas and draft helper implement the contract without publish actions', () => {
  const filterSchema = readFileSync(
    new URL('../../../schemaTypes/filterCategoryType.ts', import.meta.url),
    'utf8',
  )
  const navigationSchema = readFileSync(
    new URL('../../../schemaTypes/navigationSettingsType.ts', import.meta.url),
    'utf8',
  )
  const projectSchema = readFileSync(
    new URL('../../../schemaTypes/projectType.ts', import.meta.url),
    'utf8',
  )
  const draftHelper = readFileSync(new URL('../drafts.ts', import.meta.url), 'utf8')
  const gridEditor = readFileSync(new URL('../GridNavigationEditor.tsx', import.meta.url), 'utf8')

  for (const field of FILTER_CATEGORY_SCHEMA_FIELDS) {
    assert.match(filterSchema, new RegExp(`name: '${field}'`))
  }
  for (const field of NAVIGATION_SETTINGS_SCHEMA_FIELDS) {
    assert.match(navigationSchema, new RegExp(`name: '${field}'`))
  }
  assert.match(projectSchema, /name: 'title'[\s\S]*Projektrubrik för vald språkversion/)
  assert.match(projectSchema, /validateTranslationPair/)
  assert.match(projectSchema, /slugPattern/)
  assert.match(draftHelper, /const draftId = `drafts\.\$\{publishedId\}`/)
  assert.match(draftHelper, /client\.createIfNotExists/)
  assert.doesNotMatch(draftHelper, /client\.patch\(publishedId\)/)
  assert.match(gridEditor, /text="Upp"/)
  assert.match(gridEditor, /text="Ned"/)
  assert.doesNotMatch(gridEditor, /draggable/)
})

test('configured output honors explicit order, inclusion and bilingual labels', () => {
  const result = resolveProjectNavigation({
    projects,
    categories,
    settings,
    legacy: {marker: 'legacy'},
  })
  assert.equal(result.mode, 'configured')
  assert.deepEqual(result.data.headings, {sv: 'Fixtureprojekt', en: 'Fixture projects'})
  assert.deepEqual(result.data.allLabels, {sv: 'Alla fixtureprojekt', en: 'All fixture projects'})
  assert.deepEqual(
    result.data.projectsByLanguage.sv.map((project) => project._id),
    ['project-sv-b'],
  )
  assert.deepEqual(
    result.data.projectsByLanguage.en.map((project) => project._id),
    ['project-en-b'],
  )
  assert.deepEqual(result.data.categories[0].projectIdsByLanguage, {
    sv: ['project-sv-b'],
    en: ['project-en-b'],
  })
})

test('disabled or absent settings preserve the exact legacy object', () => {
  const legacy = {projects: ['existing'], categories: ['existing'], heading: 'existing'}
  const disabled = resolveProjectNavigation({
    projects,
    categories: [],
    settings: {enabled: false},
    legacy,
  })
  const absent = resolveProjectNavigation({projects, categories: [], settings: undefined, legacy})
  assert.equal(disabled.mode, 'legacy')
  assert.equal(absent.mode, 'legacy')
  assert.strictEqual(disabled.data, legacy)
  assert.strictEqual(absent.data, legacy)
})

test('malformed configured data fails closed to the exact legacy object', () => {
  const legacy = {projects: ['existing']}
  const malformed = {
    ...settings,
    headingEn: '',
    gridEntries: [
      {projectRef: 'project-sv-a', includeInGrid: true},
      {projectRef: 'project-sv-a', includeInGrid: true},
    ],
  }
  const result = resolveProjectNavigation({projects, categories, settings: malformed, legacy})
  assert.equal(result.mode, 'fallback')
  assert.match(result.reason, /English project-grid heading is required/)
  assert.match(result.reason, /duplicates project pair fixture_a/)
  assert.strictEqual(result.data, legacy)
})

test('schema validation rejects empty, orphaned and incomplete filter membership', () => {
  const incompleteProjects = projects.filter((project) => project.language === 'sv')
  const empty = validateFilterCategoryDocument(
    {key: '', labelSv: '', labelEn: '', order: -1, visible: undefined, projectRefs: []},
    projects,
  )
  assert.ok(empty.length >= 6)
  const incomplete = validateFilterCategoryDocument(categories[0], incompleteProjects)
  assert.ok(incomplete.some((message) => message.includes('exactly one Swedish and one English')))
  const orphan = validateFilterCategoryDocument(
    {...categories[0], projectRefs: ['missing-project']},
    projects,
  )
  assert.ok(orphan.some((message) => message.includes('missing project')))
})

test('navigation validation rejects empty inclusion and non-published references', () => {
  const empty = validateNavigationSettingsDocument(
    {...settings, gridEntries: [{projectRef: 'project-sv-a', includeInGrid: false}]},
    projects,
  )
  assert.ok(empty.some((message) => message.includes('include at least one')))
  const unpublished = projects.map((project) =>
    project._id === 'project-sv-a' ? {...project, status: 'review'} : project,
  )
  const invalid = validateNavigationSettingsDocument(settings, unpublished)
  assert.ok(invalid.some((message) => message.includes('not marked Published')))
})
