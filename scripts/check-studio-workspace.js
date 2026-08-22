const fs = require('fs')
const path = require('path')
const {ROOT} = require('./recovery-utils')

function read(...parts) {
  return fs.readFileSync(path.join(ROOT, ...parts), 'utf8')
}

const files = {
  workspace: read('cms', 'studio', 'components', 'studioTools.tsx'),
  config: read('cms', 'studio', 'sanity.config.ts'),
  project: read('cms', 'studio', 'schemaTypes', 'projectType.ts'),
  images: read('cms', 'studio', 'schemaTypes', 'imageTypes.ts'),
  home: read('cms', 'studio', 'schemaTypes', 'homePageType.ts'),
  fetcher: read('scripts', 'fetch-sanity-content.js'),
  compatibility: read('cms', 'sanity', 'schema.ts'),
}

const required = [
  ['Arbetsyta is registered', 'config', "name: 'arbetsyta'"],
  ['Visual workspace component exists', 'workspace', 'export function VisualWorkspaceTool'],
  ['Protected preview uses the drafts perspective', 'workspace', "perspective: 'drafts'"],
  ['Protected preview disables CDN caching', 'workspace', 'useCdn: false'],
  ['Workspace mutations are routed through a draft helper', 'workspace', 'async function patchDraft'],
  ['Draft IDs are explicit', 'workspace', 'const draftId = `drafts.${publishedId}`'],
  ['Published source is cloned before the first draft patch', 'workspace', 'client.createIfNotExists'],
  ['Project autosave is debounced', 'workspace', 'setTimeout(() =>'],
  ['Editor save failures state that published content was unchanged', 'workspace', 'Ingen publicerad version ändrades'],
  ['Publication errors are actionable', 'workspace', 'function publicationIssues'],
  ['Final publication is delegated to the validated document view', 'workspace', 'Öppna slutlig kontroll och publicering'],
  ['Hero image drop zone exists', 'workspace', 'Släpp huvudbild här'],
  ['Gallery drop zone exists', 'workspace', 'Projektgalleri'],
  ['Floor-plan drop zone exists', 'workspace', 'Planritningar'],
  ['Homepage editor exists', 'workspace', 'function HomeWorkspace'],
  ['Desktop, tablet and mobile previews exist', 'workspace', "'desktop', 'tablet', 'mobile'"],
  ['Images are persisted as Sanity references', 'workspace', "_type: 'reference', _ref: image.assetRef"],
  ['Stable slug validation exists', 'project', 'slugPattern'],
  ['Bilingual pair validation exists', 'project', 'validateTranslationPair'],
  ['Translation approval blocks publication', 'project', "value === 'approved'"],
  ['Publication checklist blocks publication', 'project', 'Slutfor publiceringschecklistan fore publicering'],
  ['Hero/gallery/floor-plan schema types stay separate', 'images', "name: 'projectHeroImage'"],
  ['Floor-plan schema is separate from gallery media', 'images', "name: 'floorPlan'"],
  ['Alt text is an error when absent', 'images', "Rule.required().error('Skriv en alt-text"],
  ['Credit is required', 'images', 'fotograf eller källa innan bilden kan publiceras'],
  ['Rights confirmation is required', 'images', 'Bekräfta rättigheterna innan bilden kan publiceras'],
  ['Homepage references only published projects', 'home', 'status == "published"'],
  ['CMS export requests the published perspective', 'fetcher', 'url.searchParams.set("perspective", "published")'],
  ['CMS export validates the complete snapshot before writing', 'fetcher', 'validateProjectSet(projects, { requireCmsFields: true })'],
  ['Compatibility schema points to the authoritative Studio schema', 'compatibility', "from '../studio/schemaTypes/projectType'"],
]

const failures = required
  .filter(([, target, snippet]) => !files[target].includes(snippet))
  .map(([label]) => label)

const forbiddenWorkspaceMutations = [
  /client\.patch\(selected\._id\)/,
  /client\.patch\(['"]homePage['"]\)/,
  /createIfNotExists\(\{_id:\s*['"]homePage['"]/,
  /useDocumentOperation/,
]
if (forbiddenWorkspaceMutations.some((pattern) => pattern.test(files.workspace))) failures.push('Workspace can still mutate or publish a canonical document directly')

const secretNames = ['SANITY_API_TOKEN', 'SANITY_PREVIEW_TOKEN', 'MATOMO_API_TOKEN', 'GOOGLE_SERVICE_ACCOUNT_JSON', 'VERCEL_ANALYTICS_TOKEN']
for (const secret of secretNames) if (files.workspace.includes(secret) || files.config.includes(secret)) failures.push(`Server-side secret ${secret} appears in browser-delivered Studio source`)

if (failures.length) {
  console.error(`Studio workspace check failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log(`Studio workspace check passed (${required.length} schema/workspace/export safeguards; no direct canonical mutation or browser secret exposure).`)
