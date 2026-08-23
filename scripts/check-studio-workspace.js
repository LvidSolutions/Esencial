const fs = require('fs')
const path = require('path')
const {ROOT} = require('./recovery-utils')

function read(...parts) {
  return fs.readFileSync(path.join(ROOT, ...parts), 'utf8')
}

const files = {
  workspace: read('cms', 'studio', 'components', 'studioTools.tsx'),
  projectsFeature: read('cms', 'studio', 'features', 'projects', 'ProjectsFiltersSection.tsx'),
  projectEditor: read('cms', 'studio', 'features', 'projects', 'ProjectHeadingEditor.tsx'),
  drafts: read('cms', 'studio', 'features', 'projects', 'drafts.ts'),
  preview: read('cms', 'studio', 'features', 'preview', 'LiveFrontendPreview.tsx'),
  previewConfig: read('cms', 'studio', 'features', 'preview', 'configuration.ts'),
  analyticsFeature: read('cms', 'studio', 'features', 'analytics', 'AnalyticsConsentFeature.tsx'),
  analyticsClient: read('cms', 'studio', 'features', 'analytics', 'analyticsClient.ts'),
  analyticsContract: read('cms', 'studio', 'features', 'analytics', 'analyticsContract.ts'),
  config: read('cms', 'studio', 'sanity.config.ts'),
  desk: read('cms', 'studio', 'deskStructure.ts'),
  project: read('cms', 'studio', 'schemaTypes', 'projectType.ts'),
  images: read('cms', 'studio', 'schemaTypes', 'imageTypes.ts'),
  home: read('cms', 'studio', 'schemaTypes', 'homePageType.ts'),
  fetcher: read('scripts', 'fetch-sanity-content.js'),
  compatibility: read('cms', 'sanity', 'schema.ts'),
}

const required = [
  ['Arbetsyta is registered', 'config', "name: 'arbetsyta'"],
  ['Visual workspace component exists', 'workspace', 'export function VisualWorkspaceTool'],
  ['Protected preview exposes an explicit drafts perspective', 'preview', "useState<PreviewPerspective>('drafts')"],
  ['Protected preview disables CDN caching', 'preview', 'useCdn: false'],
  ['Workspace mutations are routed through the active draft helper', 'projectsFeature', 'patchDraft(client'],
  ['Draft IDs are explicit', 'drafts', 'const draftId = `drafts.${publishedId}`'],
  ['Published source is cloned before the first draft patch', 'drafts', 'client.createIfNotExists'],
  ['Project/filter saves are explicit draft actions', 'projectEditor', 'Spara rubrik som kladd'],
  ['Editor save failures state that published content was unchanged', 'projectsFeature', 'Ingen publicerad version ändrades'],
  ['Publication errors are actionable', 'project', 'Slutfor publiceringschecklistan fore publicering'],
  ['Final publication is delegated to the validated document view', 'projectEditor', 'Öppna fullständig dokumentvy'],
  ['Hero image field remains in the native project editor', 'project', "name: 'heroImage'"],
  ['Gallery field remains in the native project editor', 'project', "name: 'galleryImages'"],
  ['Floor-plan field remains in the native project editor', 'project', "name: 'floorPlans'"],
  ['Homepage editor remains in native Studio structure', 'desk', ".schemaType('homePage').documentId('homePage')"],
  ['Desktop, tablet and mobile previews exist', 'previewConfig', 'desktop: {label:'],
  ['Images use Sanity image schema references', 'images', "type: 'image'"],
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
const browserSources = [
  files.workspace,
  files.projectsFeature,
  files.projectEditor,
  files.drafts,
  files.preview,
  files.analyticsFeature,
  files.analyticsClient,
  files.analyticsContract,
  files.config,
].join('\n')
if (forbiddenWorkspaceMutations.some((pattern) => pattern.test(browserSources))) failures.push('Workspace can still mutate or publish a canonical document directly')

const secretNames = ['SANITY_API_TOKEN', 'SANITY_PREVIEW_TOKEN', 'MATOMO_API_TOKEN', 'GOOGLE_SERVICE_ACCOUNT_JSON', 'VERCEL_ANALYTICS_TOKEN']
for (const secret of secretNames) if (browserSources.includes(secret)) failures.push(`Server-side secret ${secret} appears in browser-delivered Studio source`)

if (failures.length) {
  console.error(`Studio workspace check failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log(`Studio workspace check passed (${required.length} schema/workspace/export safeguards; no direct canonical mutation or browser secret exposure).`)
