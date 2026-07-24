const fs = require('fs')
const path = require('path')
const {ROOT} = require('./recovery-utils')

const source = fs.readFileSync(path.join(ROOT, 'cms', 'studio', 'components', 'studioTools.tsx'), 'utf8')
const config = fs.readFileSync(path.join(ROOT, 'cms', 'studio', 'sanity.config.ts'), 'utf8')
const required = [
  ['Arbetsyta is registered', "name: 'arbetsyta'"],
  ['Visual workspace component exists', 'export function VisualWorkspaceTool'],
  ['Hero image drop zone exists', "Släpp huvudbild här"],
  ['Gallery drop zone exists', 'Projektgalleri'],
  ['Floor-plan drop zone exists', 'Planritningar'],
  ['Homepage editor exists', 'function HomeWorkspace'],
  ['Desktop preview exists', "'desktop', 'tablet', 'mobile'"],
  ['Draft autosave is debounced', 'setTimeout(() =>'],
  ['Images are persisted as Sanity references', "_type: 'reference', _ref: image.assetRef"],
]

const failures = required.filter(([label, snippet]) => {
  const target = label === 'Arbetsyta is registered' ? config : source
  return !target.includes(snippet)
}).map(([label]) => label)

if (source.includes('SANITY_PREVIEW_TOKEN') || source.includes('MATOMO_API_TOKEN') || source.includes('GOOGLE_SERVICE_ACCOUNT_JSON')) {
  failures.push('A server-side secret name appears in Studio source')
}

if (failures.length) {
  console.error(`Studio workspace check failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log('Studio workspace check passed: visual editing surface, media separation and secret boundary are present.')
