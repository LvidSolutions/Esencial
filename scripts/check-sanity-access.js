const {execFileSync} = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENV_FILE = path.join(ROOT, '.env.local')
const EXPECTED_PROJECT = 'g6xm8j7l'
const EXPECTED_DATASET = 'production'
const IDENTIFIER = /^[a-z0-9][a-z0-9_-]*$/

function parseEnv(source) {
  const values = {}
  for (const [index, rawLine] of source.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (!match) throw new Error(`.env.local line ${index + 1} has unsupported syntax.`)
    const [, key, rawValue] = match
    if (Object.prototype.hasOwnProperty.call(values, key)) throw new Error(`.env.local defines ${key} more than once.`)
    let value = rawValue.trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    values[key] = value
  }
  return values
}

function configuration() {
  if (!fs.existsSync(ENV_FILE)) throw new Error('Missing ignored .env.local. Create it locally; never commit or paste the token into chat.')
  try {
    execFileSync('git', ['check-ignore', '--quiet', '.env.local'], {cwd: ROOT, stdio: 'ignore'})
  } catch {
    throw new Error('.env.local is not ignored by Git; refusing to read credentials.')
  }
  const local = parseEnv(fs.readFileSync(ENV_FILE, 'utf8'))
  const projectId = local.SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID
  const dataset = local.SANITY_DATASET || process.env.SANITY_DATASET
  const token = local.SANITY_API_TOKEN || process.env.SANITY_API_TOKEN
  if (projectId !== EXPECTED_PROJECT) throw new Error(`SANITY_PROJECT_ID must be ${EXPECTED_PROJECT}.`)
  if (dataset !== EXPECTED_DATASET) throw new Error(`SANITY_DATASET must be ${EXPECTED_DATASET}.`)
  if (!IDENTIFIER.test(projectId) || !IDENTIFIER.test(dataset)) throw new Error('Sanity project or dataset identifier has an invalid format.')
  if (!token || /replace|example|placeholder/i.test(token) || token.length < 32) throw new Error('SANITY_API_TOKEN is missing or still a placeholder.')
  return {projectId, dataset, token}
}

async function fetchJson(url, token, label) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  let response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {Authorization: `Bearer ${token}`},
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (error) {
    throw new Error(`${label} could not be reached (${error.name === 'AbortError' ? 'timeout' : 'network error'}).`)
  } finally {
    clearTimeout(timeout)
  }
  if (!response.ok) throw new Error(`${label} rejected the read-only request with HTTP ${response.status}; provider details were withheld.`)
  try {
    return await response.json()
  } catch {
    throw new Error(`${label} returned invalid JSON.`)
  }
}

function permissionNames(value, output = new Set()) {
  if (typeof value === 'string' && /^sanity\.[a-z0-9_.:/-]+$/i.test(value)) output.add(value)
  else if (Array.isArray(value)) for (const item of value) permissionNames(item, output)
  else if (value && typeof value === 'object') for (const item of Object.values(value)) permissionNames(item, output)
  return output
}

async function validateReadOnlyAccess(config) {
  const permissionsUrl = `https://api.sanity.io/v2025-07-11/access/project/${config.projectId}/user-permissions/me`
  const permissionPayload = await fetchJson(permissionsUrl, config.token, 'Sanity Access API')
  if (!Array.isArray(permissionPayload?.data)) throw new Error('Sanity Access API returned an unexpected permission result.')
  if (permissionPayload.data.length === 0) {
    throw new Error('The token authenticates successfully but has zero permissions for project g6xm8j7l. Assign a Viewer/content-read project role in Sanity Manage, then retry; do not paste the token into chat.')
  }
  const names = [...permissionNames(permissionPayload)].sort()
  const permissions = {
    available: true,
    count: permissionPayload.data.length,
    namedCount: names.length,
    readSignals: names.filter((name) => /(?:read|get|query|history)/i.test(name)).length,
    writeSignals: names.filter((name) => /(?:create|update|write|mutate|publish|delete)/i.test(name)).length,
  }

  const query = '{"documents":count(*),"publishedProjects":count(*[_type=="project" && status=="published" && !(_id in path("drafts.**"))]),"draftDocuments":count(*[_id in path("drafts.**")])}'
  const queryUrl = new URL(`https://${config.projectId}.api.sanity.io/v2025-02-19/data/query/${config.dataset}`)
  queryUrl.searchParams.set('query', query)
  queryUrl.searchParams.set('perspective', 'raw')
  queryUrl.searchParams.set('tag', 'esencial.s15.read-only')
  const content = await fetchJson(queryUrl, config.token, 'Sanity Content Lake')
  const result = content?.result
  if (!result || !['documents', 'publishedProjects', 'draftDocuments'].every((key) => Number.isInteger(result[key]) && result[key] >= 0)) {
    throw new Error('Sanity Content Lake returned an unexpected read result.')
  }

  return {content: result, permissions}
}

async function main() {
  if (!process.argv.includes('--read-only')) throw new Error('Refusing to run without the explicit --read-only safety flag.')
  if (process.argv.some((argument) => /(?:write|mutate|publish|delete|deploy)/i.test(argument) && argument !== '--read-only')) {
    throw new Error('Mutation-oriented arguments are forbidden in the S15 access gate.')
  }
  const config = configuration()
  const result = await validateReadOnlyAccess(config)
  console.log(`Sanity read-only access passed: project ${config.projectId}, dataset ${config.dataset}, ${result.content.documents} visible raw documents, ${result.content.publishedProjects} published project documents, ${result.content.draftDocuments} draft documents; token value withheld.`)
  console.log(`Permission introspection: ${result.permissions.count} permission records, ${result.permissions.namedCount} recognized names (${result.permissions.readSignals} read signals, ${result.permissions.writeSignals} write signals). No mutation endpoint was called.`)
}

if (require.main === module) main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})

module.exports = {configuration, parseEnv, permissionNames, validateReadOnlyAccess}
