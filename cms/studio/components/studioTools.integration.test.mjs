import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {composeWorkspaceSections} from './workspaceComposition.mjs'

const order = ['content-media', 'projects-filters', 'live-preview', 'analytics-consent']
const section = (id) => ({id, summary: id, children: null})

test('integrated Studio sections always resolve to the stable accessible vertical order', () => {
  const result = composeWorkspaceSections(
    [
      section('analytics-consent'),
      section('projects-filters'),
      section('live-preview'),
      section('content-media'),
    ],
    order,
  )
  assert.deepEqual(result.map(({id}) => id), order)
  const studioTools = readFileSync(new globalThis.URL('./studioTools.tsx', import.meta.url), 'utf8')
  assert.match(studioTools, /composeSectionDefinitions\(sections, WORKSPACE_SECTION_ORDER\)/)
})

test('duplicate or incomplete section composition is rejected instead of silently overwriting a slot', () => {
  assert.throws(
    () =>
      composeWorkspaceSections(
        [
          section('projects-filters'),
          section('live-preview'),
          section('analytics-consent'),
          section('content-media'),
          section('live-preview'),
        ],
        order,
      ),
    /Duplicate Studio workspace slot: live-preview/,
  )
  assert.throws(
    () =>
      composeWorkspaceSections(
        [section('content-media'), section('projects-filters'), section('live-preview')],
        order,
      ),
    /Missing: analytics-consent/,
  )
})
