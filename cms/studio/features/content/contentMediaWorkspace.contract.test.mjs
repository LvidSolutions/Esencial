import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {createMediaRemovalPlan} from './contentWorkspaceContract.mjs'

const source = readFileSync(new globalThis.URL('./ContentMediaWorkspace.tsx', import.meta.url), 'utf8')
const schema = readFileSync(new globalThis.URL('../../schemaTypes/projectType.ts', import.meta.url), 'utf8')

test('the compact project picker uses one accessible dropdown instead of a project-card wall', () => {
  assert.match(source, /<Select\s+id="esencial-project-picker-select"/)
  assert.match(source, /Projekt att redigera/)
  assert.doesNotMatch(source, /Sök projekt/)
  assert.doesNotMatch(source, /esencial-content-media__project-list/)
})

test('every historical image reference can be inspected, replaced, or removed from a draft', () => {
  assert.match(source, /Byt bildadress via Sanity/)
  assert.match(source, /kind: 'legacyImage'/)
  assert.doesNotMatch(schema, /legacyImages[^\n]*readOnly: true/)

  const plan = createMediaRemovalPlan(
    {legacyImages: [{_key: 'old-image', url: 'https://example.test/old.jpg'}]},
    {kind: 'legacyImage', key: 'old-image'},
  )
  assert.equal(plan.field, 'legacyImages')
  assert.deepEqual(plan.nextFieldValue, [])
})
