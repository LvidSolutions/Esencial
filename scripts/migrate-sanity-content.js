/*
 * Source-led, draft-only Esencial migration.
 *
 * This intentionally is not part of the web build or CI.  It reads the live
 * public reference, produces an auditable plan by default, and requires a
 * separate write token, fresh backup manifest, and exact plan SHA before it
 * can create or patch a Sanity draft.  It never mutates a published document
 * and it never uploads or deletes an asset.
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PROJECT_ID = 'g6xm8j7l'
const DATASET = 'production'
const TOOL_VERSION = '1.0.0'
const LIVE_ORIGIN = 'https://www.esencial.se'
const MANAGED_FIELDS = [
  'title', 'slug', 'language', 'translationKey', 'pairedProject', 'location', 'year', 'typology',
  'client', 'architect', 'projectManager', 'collaborators', 'landscape', 'photography', 'artwork',
  'grossArea', 'services', 'summary', 'body', 'migration',
]

const htmlDecode = (value = '') => String(value)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#039;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
  .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const sha256 = (value) => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex')
const stable = (value) => JSON.stringify(value, Object.keys(value || {}).sort())
const clean = (value) => typeof value === 'string' ? value.trim() : ''
const canonicalId = (id) => String(id || '').replace(/^drafts\./, '')
const slugFor = (id) => id.replace(/_/g, '-').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()
const keyFor = (id, index) => `${id.replace(/[^a-z0-9]/gi, '').slice(0, 20)}${String(index).padStart(4, '0')}`

function argumentsFor(argv = process.argv.slice(2)) {
  const valueAfter = (flag) => {
    const index = argv.indexOf(flag)
    return index === -1 ? undefined : argv[index + 1]
  }
  const apply = argv.includes('--apply')
  if (apply && !argv.includes('--confirm-plan')) throw new Error('--apply requires --confirm-plan <sha256>.')
  if (apply && argv.includes('--dry-run')) throw new Error('Choose either --dry-run or --apply.')
  return {
    apply,
    output: valueAfter('--output') || path.join(ROOT, 'audit', 'migration', 'sanity-live-plan.json'),
    confirmation: valueAfter('--confirm-plan'),
    backupManifest: valueAfter('--backup-manifest'),
  }
}

async function getText(url) {
  const response = await fetch(url, {headers: {'user-agent': 'Esencial migration verifier/1.0'}, cache: 'no-store'})
  if (!response.ok) throw new Error(`Live source could not be read (${response.status}). No Sanity changes were made.`)
  return response.text()
}

function photoStreams(html) {
  const stop = html.indexOf('; jsonShowImages')
  const start = html.lastIndexOf('jsonPhoto = ', stop)
  if (start < 0 || stop < 0) throw new Error('The live page no longer exposes its published media manifest; migration stopped.')
  const raw = html.slice(start + 'jsonPhoto = '.length, stop).trim()
  let groups
  try { groups = JSON.parse(raw) } catch { throw new Error('The live media manifest was malformed; migration stopped.') }
  const streams = new Map()
  for (const group of groups) for (const [id, value] of Object.entries(group || {})) {
    streams.set(id, {photographs: Array.isArray(value.photographs) ? value.photographs : [], drawings: Array.isArray(value.drawings) ? value.drawings : []})
  }
  return streams
}

function attribute(tag, name) {
  return (tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i')) || [])[1] || ''
}

function feedBlocks(html) {
  const anchors = [...html.matchAll(/<div\b[^>]*class=["'][^"']*css_feed_project_container[^"']*["'][^>]*>/gi)]
  const blocks = new Map()
  for (let index = 0; index < anchors.length; index += 1) {
    const match = anchors[index]
    const tag = match[0]
    const id = attribute(tag, 'id') || attribute(tag, 'name')
    if (!id) continue
    blocks.set(id, html.slice(match.index, index + 1 < anchors.length ? anchors[index + 1].index : html.length))
  }
  return blocks
}

function factsFrom(block) {
  const facts = new Map()
  for (const match of block.matchAll(/<p\b[^>]*>\s*<strong\b[^>]*>([\s\S]*?)<\/strong>\s*<br\s*\/?>\s*([\s\S]*?)<\/p>/gi)) {
    const label = htmlDecode(match[1]).toUpperCase()
    const value = htmlDecode(match[2])
    if (label && value) facts.set(label, value)
  }
  return facts
}

function narrativeFrom(block) {
  const position = block.search(/css_feed_text_description_container/i)
  if (position < 0) return []
  const section = block.slice(position, block.search(/css_feed_footer_container/i) > position ? block.search(/css_feed_footer_container/i) : block.length)
  return [...section.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => htmlDecode(match[1])).filter(Boolean)
}

function titleFrom(facts, block) {
  return facts.get('PROJEKTNAMN') || facts.get('PROJECT NAME') || clean((block.match(/css_grid_text_name[^>]*>([\s\S]*?)<\/div>/i) || [])[1] && htmlDecode((block.match(/css_grid_text_name[^>]*>([\s\S]*?)<\/div>/i) || [])[1]))
}

function sourceField(facts, ...labels) {
  for (const label of labels) if (facts.has(label)) return facts.get(label)
  return undefined
}

function bodyBlocks(id, paragraphs) {
  return paragraphs.map((text, index) => ({_key: keyFor(`${id}body`, index), _type: 'block', style: 'normal', markDefs: [], children: [{_key: keyFor(`${id}span`, index), _type: 'span', marks: [], text}]}))
}

function sourceProject(id, block, stream, language) {
  const facts = factsFrom(block)
  const body = bodyBlocks(id, narrativeFrom(block))
  const title = titleFrom(facts, block)
  if (!title) throw new Error(`Published source ${id} has no project title; migration stopped.`)
  const summary = body[0]?.children?.[0]?.text || ''
  const frames = Array.from({length: Math.max(stream.photographs.length, stream.drawings.length)}, (_, index) => ({
    _key: keyFor(`${id}view`, index),
    ...(stream.photographs[index] ? {left: {sourceUrl: stream.photographs[index], mediaKind: 'photograph'}} : {}),
    ...(stream.drawings[index] ? {right: {sourceUrl: stream.drawings[index], mediaKind: 'drawing'}} : {}),
  }))
  return {
    id,
    language,
    translationKey: id,
    slug: slugFor(id),
    title,
    location: sourceField(facts, 'PLATS', 'LOCATION'),
    year: sourceField(facts, 'BYGGNADSÅR', 'ÅR', 'YEAR'),
    typology: sourceField(facts, 'PROJEKTTYP', 'PROJECT TYPE'),
    client: sourceField(facts, 'BYGGHERRE', 'BESTÄLLARE', 'CLIENT'),
    architect: sourceField(facts, 'ARKITEKT', 'ARCHITECT'),
    projectManager: sourceField(facts, 'HANDLÄGGARE', 'PROJECT MANAGER'),
    collaborators: sourceField(facts, 'MEDARBETARE', 'COLLABORATORS')?.split(/,|\n/).map(clean).filter(Boolean),
    landscape: sourceField(facts, 'LANDSKAP', 'LANDSCAPE'),
    photography: sourceField(facts, 'FOTO', 'FOTOGRAF', 'PHOTOGRAPHY'),
    artwork: sourceField(facts, 'KONSTNÄRLIG UTSMYCKNING', 'ARTWORK'),
    grossArea: sourceField(facts, 'BRUTTOAREA', 'GROSS AREA'),
    services: sourceField(facts, 'UPPDRAG', 'OMFATTNING', 'SERVICES', 'SCOPE')?.split(/,|\n/).map(clean).filter(Boolean),
    summary,
    body,
    sourceMedia: frames,
  }
}

function parseLivePage(html, language) {
  const streams = photoStreams(html)
  const blocks = feedBlocks(html)
  const projects = []
  for (const [id, stream] of streams) {
    const block = blocks.get(id)
    if (!block) throw new Error(`Published source ${id} has media but no project content block; migration stopped.`)
    projects.push(sourceProject(id, block, stream, language))
  }
  if (projects.length !== 27) throw new Error(`Expected 27 published ${language} projects, found ${projects.length}; migration stopped.`)
  return projects.sort((a, b) => a.id.localeCompare(b.id))
}

async function fetchLiveSource() {
  const [svHtml, enHtml] = await Promise.all([getText(`${LIVE_ORIGIN}/`), getText(`${LIVE_ORIGIN}/projects/`)])
  const sv = parseLivePage(svHtml, 'sv')
  const en = parseLivePage(enHtml, 'en')
  const svIds = sv.map((project) => project.id).join(',')
  const enIds = en.map((project) => project.id).join(',')
  if (svIds !== enIds) throw new Error('The Swedish and English published project identities differ; migration stopped.')
  return {sv, en, sourceSha256: sha256({sv, en})}
}

async function fetchSanityDocuments(token) {
  const query = '*[_type == "project"]{_id,_rev,_updatedAt,_createdAt,_type,title,"slug":slug.current,language,translationKey,pairedProject,status,translationStatus,location,year,typology,client,architect,projectManager,collaborators,landscape,photography,artwork,grossArea,services,summary,body,migration,legacyImages,cardImages,slideshowImages,presentationViews,floorPlans}'
  const url = new URL(`https://${PROJECT_ID}.api.sanity.io/v2025-02-19/data/query/${DATASET}`)
  url.searchParams.set('query', query)
  url.searchParams.set('perspective', token ? 'raw' : 'published')
  const response = await fetch(url, {headers: token ? {Authorization: `Bearer ${token}`} : {}, cache: 'no-store'})
  if (!response.ok) throw new Error(`Sanity read failed (${response.status}). Provider details were withheld.`)
  const payload = await response.json()
  if (!Array.isArray(payload.result)) throw new Error('Sanity returned an invalid project response.')
  return payload.result
}

function managedSnapshot(document) {
  return Object.fromEntries(MANAGED_FIELDS.filter((field) => field !== 'migration').map((field) => [field, document[field]]))
}

function planEntries(source, documents) {
  const published = new Map()
  const drafts = new Map()
  for (const document of documents) (document._id.startsWith('drafts.') ? drafts : published).set(canonicalId(document._id), document)
  const entries = []
  for (const language of ['sv', 'en']) for (const project of source[language]) {
    const stableId = `project-${language}-${project.id}`
    const existingPublished = published.get(stableId)
    const existingDraft = drafts.get(stableId)
    const candidates = [...published.values(), ...drafts.values()].filter((document) => document.language === language && (document.translationKey === project.translationKey || document.slug === project.slug))
    const conflicting = candidates.filter((document) => canonicalId(document._id) !== stableId)
    const counterpart = `project-${language === 'sv' ? 'en' : 'sv'}-${project.id}`
    const desired = {
      title: project.title,
      slug: {_type: 'slug', current: project.slug},
      language,
      translationKey: project.translationKey,
      pairedProject: {_type: 'reference', _ref: counterpart, _weak: true},
      location: project.location,
      year: project.year,
      typology: project.typology,
      client: project.client,
      architect: project.architect,
      projectManager: project.projectManager,
      collaborators: project.collaborators,
      landscape: project.landscape,
      photography: project.photography,
      artwork: project.artwork,
      grossArea: project.grossArea,
      services: project.services,
      summary: project.summary,
      body: project.body,
    }
    const sourceSha256 = sha256({...desired, sourceMedia: project.sourceMedia})
    const baseline = sha256(desired)
    desired.migration = {toolVersion: TOOL_VERSION, sourceSha256, managedBaselineSha256: baseline}
    let status = existingDraft ? 'update-draft' : existingPublished ? 'create-draft' : 'create-new-draft'
    let reason = ''
    if (conflicting.length) { status = 'conflict'; reason = 'Ambiguous language/translationKey/slug match.' }
    if (existingDraft?.migration?.managedBaselineSha256 && existingDraft.migration.managedBaselineSha256 !== sha256(managedSnapshot(existingDraft))) {
      status = 'conflict'; reason = 'Draft contains a manual change to a migration-managed field.'
    }
    if (existingDraft && !existingDraft.migration) { status = 'conflict'; reason = 'Existing draft has no migration baseline and will not be overwritten.' }
    const changedFields = Object.keys(desired).filter((field) => JSON.stringify(existingDraft?.[field] ?? existingPublished?.[field]) !== JSON.stringify(desired[field]))
    entries.push({id: project.id, language, documentId: stableId, draftId: `drafts.${stableId}`, status, reason, changedFields, source: {title: project.title, sourceMediaViews: project.sourceMedia.length, photographs: project.sourceMedia.filter((view) => view.left).length, drawings: project.sourceMedia.filter((view) => view.right).length}, desired, sourceSha256, _draftRevision: existingDraft?._rev, _publishedSeed: existingPublished})
  }
  return entries
}

function reportFor(source, entries) {
  const reportEntries = entries.map(({desired, _draftRevision, _publishedSeed, ...entry}) => ({...entry, plannedMediaUpload: 'blocked: requires separately recorded rights evidence and --apply-media; no assets are uploaded by this tool'}))
  const plan = {toolVersion: TOOL_VERSION, liveOrigin: LIVE_ORIGIN, projectId: PROJECT_ID, dataset: DATASET, sourceSha256: source.sourceSha256, summary: {liveProjectsPerLanguage: source.sv.length, sanityEntries: entries.length, conflicts: entries.filter((entry) => entry.status === 'conflict').length, newPairs: entries.filter((entry) => entry.status === 'create-new-draft').length}, entries: reportEntries}
  plan.planSha256 = sha256({toolVersion: plan.toolVersion, liveOrigin: plan.liveOrigin, projectId: plan.projectId, dataset: plan.dataset, sourceSha256: plan.sourceSha256, entries: plan.entries})
  return plan
}

function writeReport(file, report) {
  fs.mkdirSync(path.dirname(file), {recursive: true})
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

function requireFreshBackup(file) {
  if (!file || !fs.existsSync(file)) throw new Error('--apply requires a fresh --backup-manifest from scripts/backup-sanity-dataset.js.')
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (manifest.projectId !== PROJECT_ID || manifest.dataset !== DATASET || !manifest.sha256) throw new Error('Backup manifest does not identify the Esencial production dataset.')
  const age = Date.now() - new Date(manifest.completedAt || 0).getTime()
  if (!Number.isFinite(age) || age > 60 * 60 * 1000) throw new Error('Backup is older than one hour; create a fresh backup before apply.')
}

async function applyEntries(entries, token, runId) {
  const mutations = []
  for (const entry of entries) {
    if (!['update-draft', 'create-draft', 'create-new-draft'].includes(entry.status) || !entry.changedFields.length) continue
    const seed = entry._publishedSeed ? Object.fromEntries(Object.entries(entry._publishedSeed).filter(([key]) => !['_id', '_rev', '_createdAt', '_updatedAt'].includes(key))) : {status: 'draft', translationStatus: 'not-started'}
    const fields = {...entry.desired, migration: {...entry.desired.migration, runId, completedAt: new Date().toISOString()}}
    const document = {...seed, ...fields, _id: entry.draftId, _type: 'project'}
    mutations.push({createIfNotExists: document})
    const patch = {id: entry.draftId, set: fields}
    if (entry._draftRevision) patch.ifRevisionID = entry._draftRevision
    mutations.push({patch})
  }
  if (!mutations.length) return {applied: 0}
  const url = `https://${PROJECT_ID}.api.sanity.io/v2025-02-19/data/mutate/${DATASET}`
  const response = await fetch(url, {method: 'POST', headers: {Authorization: `Bearer ${token}`, 'content-type': 'application/json'}, body: JSON.stringify({mutations, returnDocuments: false})})
  if (!response.ok) throw new Error(`Sanity mutation failed (${response.status}); no claim of completion is made.`)
  return {applied: mutations.length / 2}
}

async function main() {
  const options = argumentsFor()
  const token = process.env.SANITY_MIGRATION_TOKEN
  if (options.apply && !token) throw new Error('SANITY_MIGRATION_TOKEN is required for --apply. Do not reuse or expose the read-only build token.')
  const source = await fetchLiveSource()
  // When a migration token is present, include drafts in dry runs too. This
  // makes the plan hash comparable with --apply and surfaces manual drafts as
  // conflicts before any mutation is attempted.
  const documents = await fetchSanityDocuments(token)
  const entries = planEntries(source, documents)
  const report = reportFor(source, entries)
  writeReport(options.output, report)
  if (!options.apply) {
    console.log(`Migration dry run written to ${path.relative(ROOT, options.output)}. ${report.summary.conflicts} conflicts, ${report.summary.newPairs} new pairs. Plan SHA-256: ${report.planSha256}`)
    return
  }
  if (options.confirmation !== report.planSha256) throw new Error('The supplied plan SHA-256 does not match this fresh dry run; no mutation was sent.')
  if (report.summary.conflicts) throw new Error('The fresh plan contains conflicts; no mutation was sent.')
  requireFreshBackup(options.backupManifest)
  const result = await applyEntries(entries, token, crypto.randomUUID())
  console.log(`Draft-only migration applied to ${result.applied} documents. No published document or asset was deleted or changed.`)
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1 })

module.exports = {argumentsFor, factsFrom, feedBlocks, fetchLiveSource, parseLivePage, planEntries, reportFor}
