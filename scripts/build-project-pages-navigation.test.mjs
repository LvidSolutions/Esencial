import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import path from 'node:path'
import test from 'node:test'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import builder from './build-project-pages.js'
import {resolveProjectNavigation} from '../cms/studio/features/projects/navigationContract.mjs'

const {applyPublishedNavigation} = builder

const projects = [
  {_id: 'project-sv-a', id: 'fixture_a', translationKey: 'fixture_a', language: 'sv', status: 'published'},
  {_id: 'project-en-a', id: 'fixture_a', translationKey: 'fixture_a', language: 'en', status: 'published'},
  {_id: 'project-sv-b', id: 'fixture_b', translationKey: 'fixture_b', language: 'sv', status: 'published'},
  {_id: 'project-en-b', id: 'fixture_b', translationKey: 'fixture_b', language: 'en', status: 'published'},
]

const legacy = `<!doctype html>
<html lang="sv"><head><meta charset="utf-8"><script src="/wp-includes/js/jquery/jquery.min.js"></script></head><body>
<main>
<h1 class="screen-reader-text">Legacy heading</h1>
<div class="css_tag_container">
<div class="css_tag_wrapper"><div class="css_tag_item css_tag_item_inactive" data-tag="legacy" role="button" tabindex="0" aria-pressed="false">Legacy filter</div></div>
</div>
<div class=" css_grid_container" role="list">
<div class=" css_grid_card_container " name="A" featured="" role="listitem" aria-labelledby="project-fixture_a-title"><div class="css_grid_text_container"><div id="project-fixture_a-title"><a href="/projekt/fixture-a/">A</a></div></div></div>
<div class=" css_grid_card_container " name="B" role="listitem" aria-labelledby="project-fixture_b-title"><div class="css_grid_text_container"><div id="project-fixture_b-title"><a href="/projekt/fixture-b/">B</a></div></div></div>
</div>
<div class=" css__feed__container feed-dn">
<div class=" css_feed_project_container " name="A" featured="" id="fixture_a"><p>Feed A</p></div>
<div class=" css_feed_project_container " name="B" id="fixture_b"><p>Feed B</p></div>
</div>
</main>
<script src="/wp-content/themes/esencial/scripts.js"></script>
</body></html>`

const categories = [
  {
    _id: 'filter-featured',
    key: 'featured',
    labelSv: 'Utvalda',
    labelEn: 'Featured',
    order: 0,
    visible: true,
    projectRefs: ['project-sv-b'],
  },
]

const settings = {
  _id: 'navigationSettings',
  enabled: true,
  headingSv: 'Godkända projekt',
  headingEn: 'Approved projects',
  allLabelSv: 'Alla projekt',
  allLabelEn: 'All projects',
  gridEntries: [
    {projectRef: 'project-sv-b', includeInGrid: true},
    {projectRef: 'project-sv-a', includeInGrid: false},
  ],
}

function render(snapshot, projectSet = projects) {
  return applyPublishedNavigation(legacy, 'sv', projectSet, snapshot, resolveProjectNavigation)
}

test('published configured navigation controls approved heading, filters, membership and order', () => {
  const output = render({categories, settings, malformed: false})
  assert.notEqual(output, legacy)
  assert.match(output, /Godkända projekt/)
  assert.match(output, /data-tag="all"[^>]*[\s\S]*Alla projekt/)
  assert.match(output, /data-tag="featured"[^>]*[\s\S]*Utvalda/)
  assert.match(output, /css_grid_card_container " name="B"[^>]* all="" featured=""/)
  assert.match(output, /css_feed_project_container " name="B"[^>]* all="" featured=""/)
  assert.match(output, /href="\/projekt\/fixture-b\/"/)
  assert.doesNotMatch(output, /project-fixture_a-title/)
  assert.doesNotMatch(output, /id="fixture_a"/)
  assert.match(output, /css__feed__container feed-dn">[\s\S]*Feed B/)
})

test('a filter emits its own deterministic row-major order without changing membership', () => {
  const orderedSettings = {
    ...settings,
    gridProjects: undefined,
    gridEntries: [
      {projectRef: 'project-sv-b', includeInGrid: true},
      {projectRef: 'project-sv-a', includeInGrid: true},
    ],
  }
  const orderedCategories = [{
    ...categories[0],
    projectRefs: ['project-sv-b', 'project-sv-a'],
    projectOrder: ['project-sv-a', 'project-sv-b'],
  }]
  const output = render({categories: orderedCategories, settings: orderedSettings, malformed: false})
  assert.match(output, /name="B"[^>]*data-esencial-order-featured="2"/)
  assert.match(output, /name="A"[^>]*data-esencial-order-featured="1"/)
  assert.match(output, /name="B"[^>]*featured=""/)
  assert.match(output, /name="A"[^>]*featured=""/)
})

test('missing, disabled and explicitly malformed navigation preserve the exact legacy output', () => {
  assert.strictEqual(render(undefined), legacy)
  assert.strictEqual(render({categories: [], settings: {enabled: false}, malformed: false}), legacy)
  assert.strictEqual(render({categories, settings: {...settings, headingEn: ''}, malformed: false}), legacy)
  assert.strictEqual(render({categories: {}, settings, malformed: true}), legacy)
})

test('draft-tainted navigation and project snapshots never reach public output', () => {
  const draftSettings = {
    ...settings,
    gridEntries: [{projectRef: 'drafts.project-sv-b', includeInGrid: true}],
  }
  assert.strictEqual(render({categories, settings: draftSettings, malformed: false}), legacy)
  const draftProjects = projects.map((project) =>
    project._id === 'project-sv-b' ? {...project, _id: 'drafts.project-sv-b'} : project,
  )
  assert.strictEqual(render({categories, settings, malformed: false}, draftProjects), legacy)
})

test('incomplete project pairs and conflicting category membership fail closed', () => {
  const incomplete = projects.filter((project) => project._id !== 'project-en-b')
  assert.strictEqual(render({categories, settings, malformed: false}, incomplete), legacy)
  const conflictingCategories = [
    ...categories,
    {...categories[0], _id: 'filter-conflict', key: 'other', order: 0},
  ]
  assert.strictEqual(
    render({categories: conflictingCategories, settings, malformed: false}),
    legacy,
  )
})

test('configured filter, All and grid-to-feed interaction remain connected in Playwright', async () => {
  const output = render({categories, settings, malformed: false})
  const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url))
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname)
      if (pathname === '/') {
        response.writeHead(200, {'content-type': 'text/html; charset=utf-8'})
        response.end(output)
        return
      }
      const target = path.resolve(publicDirectory, `.${pathname}`)
      if (!target.startsWith(publicDirectory)) throw new Error('invalid fixture path')
      const contents = await readFile(target)
      response.writeHead(200, {'content-type': pathname.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'application/octet-stream'})
      response.end(contents)
    } catch {
      response.writeHead(404)
      response.end('not found')
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const browser = await chromium.launch({headless: true})
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 844}})
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto(`http://127.0.0.1:${address.port}/`, {waitUntil: 'load'})

    await page.locator('[data-tag="featured"]').click()
    assert.equal(await page.locator('.css_grid_card_container[name="B"]').evaluate((node) => node.classList.contains('tag-dn')), false)
    assert.equal(await page.locator('.css_feed_project_container[name="B"]').evaluate((node) => node.classList.contains('tag-dn')), false)

    await page.locator('[data-tag="all"]').click()
    assert.equal(await page.locator('[data-tag="all"]').getAttribute('aria-pressed'), 'true')
    assert.equal(await page.locator('.css_grid_card_container[name="B"]').evaluate((node) => node.classList.contains('tag-dn')), false)

    await page.locator('.css_grid_card_container[name="B"] .css_grid_text_container').click()
    await page.waitForFunction(() => !document.querySelector('.css__feed__container')?.classList.contains('feed-dn'))
    assert.equal(await page.locator('.css_feed_project_container[name="B"]').evaluate((node) => node.classList.contains('tag-dn')), false)
    assert.deepEqual(pageErrors, [])
  } finally {
    await browser.close()
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
