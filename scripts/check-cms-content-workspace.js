import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {
  MEDIA_REMOVAL_WARNING,
  PROJECT_EDITABLE_FIELD_PATHS,
  PROJECT_INLINE_FIELD_PATHS,
  PROJECT_NATIVE_FIELD_PATHS,
  createMediaRemovalPlan,
  draftDocumentId,
  responsiveContentLayout,
  validateProjectContentPatch,
} from '../cms/studio/features/content/contentWorkspaceContract.mjs'

const workspace = readFileSync(
  new URL('../cms/studio/features/content/ContentMediaWorkspace.tsx', import.meta.url),
  'utf8',
)
const categoryEditor = readFileSync(
  new URL('../cms/studio/features/content/ProjectCategoryEditor.tsx', import.meta.url),
  'utf8',
)

test('content workspace exposes every project field through inline editing or Sanity native intent', () => {
  assert.deepEqual(
    [...PROJECT_INLINE_FIELD_PATHS, ...PROJECT_NATIVE_FIELD_PATHS].sort(),
    [...PROJECT_EDITABLE_FIELD_PATHS].sort(),
  )
  assert.match(workspace, /ProjectContentEditor/)
  assert.match(workspace, /Projektinnehåll och media/)
})

test('draft identifiers and media removal plans cannot target canonical content or delete assets', () => {
  assert.equal(draftDocumentId('drafts.project-a'), 'drafts.project-a')
  assert.match(MEDIA_REMOVAL_WARNING, /asseten raderas inte/)
  assert.deepEqual(
    createMediaRemovalPlan(
      {galleryImages: [{_key: 'one'}, {_key: 'two'}]},
      {kind: 'gallery', key: 'one'},
    ),
    {
      field: 'galleryImages',
      nextFieldValue: [{_key: 'two'}],
      previousFieldValue: [{_key: 'one'}, {_key: 'two'}],
      removedValue: {_key: 'one'},
      target: {kind: 'gallery', key: 'one', index: 0},
    },
  )
})

test('ordinary content validation and responsive layout preserve safe recovery paths', () => {
  const errors = validateProjectContentPatch({
    title: '',
    slug: 'Not a slug',
    language: 'no',
    summary: 'Kort',
    seoTitle: 'x'.repeat(61),
    seoDescription: 'x'.repeat(161),
  })
  assert.equal(Object.keys(errors).length, 6)
  assert.equal(responsiveContentLayout(390), 'single-column-compact')
  assert.equal(responsiveContentLayout(1440, 2), 'single-column')
})

test('category editing reuses the canonical filter model and creates hidden draft records first', () => {
  assert.match(categoryEditor, /filterCategory/)
  assert.match(categoryEditor, /projectReferences/)
  assert.match(categoryEditor, /drafts\.filterCategory-/)
  assert.match(categoryEditor, /visible: category\?\.visible === true/)
  assert.doesNotMatch(categoryEditor, /delete\(/i)
})
