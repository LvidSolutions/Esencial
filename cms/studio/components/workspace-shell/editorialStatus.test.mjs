import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {
  buildEditorialStatusQueues,
  canonicalProjectId,
  deduplicateEditorialProjects,
} from './editorialStatus.mjs'

const project = (overrides) => ({
  _id: 'project-default',
  _updatedAt: '2026-08-20T08:00:00.000Z',
  title: 'Projekt',
  language: 'sv',
  status: 'published',
  hasSeo: true,
  hasHeroImage: true,
  hasTranslationKey: true,
  translationApproved: true,
  ...overrides,
})

test('drafts replace their published twin and queues keep newest projects first', () => {
  const published = project({
    _id: 'project-a',
    title: 'Publicerad',
    _updatedAt: '2026-08-22T08:00:00.000Z',
  })
  const draft = project({
    _id: 'drafts.project-a',
    title: 'Kladd',
    status: 'review',
    _updatedAt: '2026-08-21T08:00:00.000Z',
  })
  const newest = project({
    _id: 'project-b',
    title: 'Senast',
    _updatedAt: '2026-08-23T08:00:00.000Z',
  })

  assert.equal(canonicalProjectId(draft), 'project-a')
  assert.deepEqual(
    deduplicateEditorialProjects([published, newest, draft]).map(({title}) => title),
    ['Senast', 'Kladd'],
  )

  const queues = buildEditorialStatusQueues([published, newest, draft])
  assert.deepEqual(
    queues.find(({id}) => id === 'ready')?.items.map(({title}) => title),
    ['Kladd'],
  )
})

test('the four former dashboard queues retain their editorial rules and display limits', () => {
  const projects = [
    project({_id: 'ready', status: 'review'}),
    project({_id: 'missing-seo', status: 'draft', hasSeo: false}),
    project({_id: 'missing-hero', status: 'review', hasHeroImage: false}),
    project({_id: 'translation', hasTranslationKey: false, translationApproved: false}),
    project({_id: 'unapproved', translationApproved: false}),
  ]
  const queues = buildEditorialStatusQueues(projects, {
    ready: 1,
    recent: 2,
    incomplete: 1,
    translation: 1,
  })

  assert.deepEqual(
    queues.map(({id}) => id),
    ['ready', 'recent', 'incomplete', 'translation'],
  )
  assert.deepEqual(
    queues.map(({items}) => items.length),
    [1, 2, 1, 1],
  )
  assert.equal(queues.find(({id}) => id === 'ready')?.total, 2)
  assert.equal(queues.find(({id}) => id === 'incomplete')?.total, 2)
  assert.equal(queues.find(({id}) => id === 'translation')?.total, 2)
})

test('S24 keeps publication native, disables parallel release models, and removes Dashboard', () => {
  const config = readFileSync(new globalThis.URL('../../sanity.config.ts', import.meta.url), 'utf8')
  const structure = readFileSync(
    new globalThis.URL('../../deskStructure.ts', import.meta.url),
    'utf8',
  )

  assert.match(config, /releases:\s*\{enabled: false\}/)
  assert.match(config, /scheduledDrafts:\s*\{enabled: false\}/)
  assert.match(config, /title: 'Innehåll & publicering \(avancerat\)'/)
  assert.doesNotMatch(
    config,
    /dashboardTool|documentListWidget|projectInfoWidget|projectUsersWidget/,
  )
  assert(
    config.indexOf('structureTool({') > config.indexOf('...previewPresentationPlugins'),
    'the advanced native safety view must remain after the everyday workspace and preview tools',
  )
  assert.match(structure, /\.title\('Innehåll & publicering · avancerat'\)/)
  assert.match(structure, /\.title\('Webbplatsinställningar'\)/)
})

test('the in-workspace overview has draft-only reads and accessible recovery states', () => {
  const overview = readFileSync(
    new globalThis.URL('./EditorialStatusOverview.tsx', import.meta.url),
    'utf8',
  )
  const shell = readFileSync(new globalThis.URL('./WorkspaceShell.tsx', import.meta.url), 'utf8')
  const styles = readFileSync(new globalThis.URL('./workspaceShell.css', import.meta.url), 'utf8')

  for (const marker of [
    "perspective: 'drafts'",
    'useCdn: false',
    'Att göra och senaste ändringar',
    "aria-busy={loadState === 'loading'}",
    'role="alert"',
    'Försök igen',
    'Inga projekt väntar på publicering.',
    'Innehåll &amp; publicering',
    '(avancerat)',
  ]) {
    assert(overview.includes(marker), `overview is missing ${JSON.stringify(marker)}`)
  }
  assert.doesNotMatch(overview, /client\.(?:create|delete|patch)|\.publish\s*\(/)
  assert.match(shell, /href="#esencial-workspace-status"/)
  assert.match(shell, /<ThemeProvider scheme="dark" theme=\{esencialStudioTheme\}>/)
  assert.match(styles, /color-scheme: dark/)
  assert.doesNotMatch(styles, /color-scheme: light/)
  assert.match(styles, /min-height: 52px/)
  assert.match(styles, /@media \(max-width: 56rem\)/)
  assert.match(styles, /@media \(forced-colors: active\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})
