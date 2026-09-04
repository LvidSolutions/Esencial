/* Creates a local, ignored, restorable Sanity export before a migration apply. */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const {spawnSync} = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const projectId = 'g6xm8j7l'
const dataset = 'production'

function sha256(file) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(file))
  return hash.digest('hex')
}

function redactProviderOutput(value) {
  const token = process.env.SANITY_AUTH_TOKEN
  return String(value || '')
    .replaceAll(token, '[REDACTED]')
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,]+/gi, '$1[REDACTED]')
    .replace(/(token\s*[:=]\s*)[^\s,]+/gi, '$1[REDACTED]')
    .trim()
}

function main() {
  if (!process.argv.includes('--confirm-backup')) throw new Error('Refusing to export without --confirm-backup.')
  if (!process.env.SANITY_AUTH_TOKEN) throw new Error('SANITY_AUTH_TOKEN is required for the provider export. Do not paste it into chat or Git.')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const directory = path.join(ROOT, 'local-backups', 'sanity')
  const archive = path.join(directory, `esencial-production-${stamp}.tar.gz`)
  const manifest = `${archive}.manifest.json`
  fs.mkdirSync(directory, {recursive: true})
  const sanityCli = path.join(ROOT, 'cms', 'studio', 'node_modules', 'sanity', 'bin', 'sanity')
  const result = spawnSync(process.execPath, [sanityCli, 'datasets', 'export', dataset, archive, '--project-id', projectId], {
    cwd: ROOT,
    env: {...process.env, SANITY_PROJECT_ID: projectId},
    encoding: 'utf8',
  })
  if (result.status !== 0 || !fs.existsSync(archive)) {
    if (fs.existsSync(archive)) fs.unlinkSync(archive)
    const providerOutput = redactProviderOutput([result.error?.message, result.stdout, result.stderr].filter(Boolean).join('\n'))
    const detail = providerOutput ? ` Sanity said: ${providerOutput}` : ''
    throw new Error(`Sanity dataset export failed (exit ${result.status ?? 'unknown'}). Check the token permissions and local Studio dependencies.${detail}`)
  }
  const record = {projectId, dataset, completedAt: new Date().toISOString(), archive: path.basename(archive), bytes: fs.statSync(archive).size, sha256: sha256(archive)}
  fs.writeFileSync(manifest, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  console.log(`Sanity backup complete: ${path.relative(ROOT, manifest)}. The archive and manifest are ignored by Git.`)
}

if (require.main === module) main()
