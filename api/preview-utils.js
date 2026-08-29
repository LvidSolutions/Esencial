const {createClient} = require('@sanity/client')
const {pageHtml} = require('../scripts/build-project-pages')
const fs = require('node:fs')
const path = require('node:path')

const PROJECT_ID = 'g6xm8j7l'
const DATASET = 'production'
const STUDIO_ORIGIN = 'https://esencial-cms.sanity.studio'
const PERSPECTIVES = new Set(['drafts', 'published', 'staging'])
const PROJECT_ROUTE = /^\/(projekt|projects)\/([a-z0-9][a-z0-9-]*)\/?$/i

const projectQuery = `*[_type == "project"] | order(language asc, title asc) {
  _id, _originalId, "id": coalesce(translationKey, _originalId, _id), translationKey,
  "slug": slug.current, title, location, year, typology, client, team, services, body,
  "description": summary, seoTitle, seoDescription, language, status, descriptionLanguage,
  "relatedProjectIds": relatedProjects[]->translationKey,
  "heroImage": heroImage{"src": asset->url, alt, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height},
  "galleryImages": galleryImages[]{"src": asset->url, alt, hideFromWebsite, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height},
  "legacyImages": legacyImages[]{"src": url, alt, "width": 1200, "height": 800},
  "floorPlans": floorPlans[]{name, planType, area, description, "image": image{"src": asset->url, alt, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height}}
}`

const navigationQuery = `{
  "categories": *[_type == "filterCategory"] | order(order asc, key asc) {
    _id, key, labelSv, labelEn, order, visible, "projectIds": projects[]->translationKey
  },
  "settings": *[_type == "navigationSettings"][0] {
    "gridEntries": gridProjects[]{"projectId": project->translationKey, includeInGrid}
  }
}`

function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function cookieValue(header, name) {
  const source = typeof header === 'string' ? header : ''
  const prefix = `${name}=`
  for (const item of source.split(';')) {
    const trimmed = item.trim()
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length))
  }
  return undefined
}

function cleanRoute(value) {
  const route = typeof value === 'string' ? value : '/'
  if (route === '/' || route === '/projects/' || route === '/projects') return route.replace(/\/?$/, '/')
  const match = route.match(PROJECT_ROUTE)
  return match ? `/${match[1].toLowerCase()}/${match[2].toLowerCase()}/` : undefined
}

function configuredClient({perspective, token}) {
  return createClient({
    projectId: process.env.SANITY_PROJECT_ID || PROJECT_ID,
    dataset: process.env.SANITY_DATASET || DATASET,
    apiVersion: '2025-02-19',
    perspective,
    useCdn: false,
    ...(token ? {token} : {}),
  })
}

function normaliseProject(source) {
  const galleryImages = Array.isArray(source.galleryImages) ? source.galleryImages : []
  const legacyImages = Array.isArray(source.legacyImages) ? source.legacyImages : []
  const images = [source.heroImage, ...galleryImages.filter((image) => !image?.hideFromWebsite)].filter((image) => image?.src)
  return {...source, id: source.id || source.translationKey || String(source._originalId || source._id || '').replace(/^drafts\./, ''), images: images.length ? images : legacyImages}
}

function overviewCard(project, language, categoryMap, index) {
  const safe = (value) => escapeHtml(value || '')
  const photo = project.images?.[0]
  const drawing = project.images?.[1] || photo
  const route = language === 'en' ? `/projects/${project.slug}/` : `/projekt/${project.slug}/`
  const categories = [...categoryMap.entries()].filter(([, ids]) => ids.has(project.id)).map(([key]) => key)
  const attributes = categories.map((key) => ` ${key}=""`).join('')
  const background = ['#fffbf5', '#fafcfe', '#f9fff9', '#fffbf9', '#f8fbfc', '#fef9f6'][index % 6]
  const documentId = safe(String(project._originalId || project._id || '').replace(/^drafts\./, ''))
  return `<div class=" css_grid_card_container "${attributes} role="listitem" aria-labelledby="preview-${safe(project.slug)}-title">
<div class=" css_grid_card_wrapper " style="background-color:${background}">
<div class=" css_grid_photo_container "><div class=" css_grid_photo_wrapper "><div class=" css_grid_photo_item " style="background-image:url(${safe(photo?.src)})"><img data-seo-image="grid" data-cms-media data-cms-field="heroImage" data-cms-path="heroImage" data-cms-document-id="${documentId}" data-cms-edit-target src="${safe(photo?.src)}" alt="${safe(photo?.alt || `${project.title} architecture project`)}" width="${Number(photo?.width) || 1200}" height="${Number(photo?.height) || 800}" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></div></div></div>
<div class=" css_grid_photo_container "><div class=" css_grid_photo_wrapper "><div class=" css_grid_photo_item " style="background-image:url(${safe(drawing?.src)})"><img data-seo-image="grid" src="${safe(drawing?.src)}" alt="${safe(drawing?.alt || `${project.title} architectural image`)}" width="${Number(drawing?.width) || 1200}" height="${Number(drawing?.height) || 800}" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></div></div></div>
<div class=" css_grid_text_container " style="background-color:${background}"><div class=" css_grid_text_top_wrapper "><div class=" css_grid_text_name " id="preview-${safe(project.slug)}-title" data-cms-field="title" data-cms-path="title" data-cms-document-id="${documentId}" data-cms-edit-target><a href="${route}" style="color:inherit;text-decoration:none">${safe(project.title)}</a></div><div class=" css_grid_text_location ">${safe(project.location)}</div></div><div class=" css_grid_text_bottom_wrapper "><div class=" css_grid_text_description "><p data-cms-field="summary" data-cms-path="summary" data-cms-document-id="${documentId}" data-cms-edit-target>${safe(project.description || '')}</p></div></div></div>
</div></div>`
}

function overviewHtml({projects, categories, settings, language}) {
  const filename = language === 'en' ? path.join(__dirname, '..', 'public', 'projects', 'index.html') : path.join(__dirname, '..', 'public', 'index.html')
  const source = fs.readFileSync(filename, 'utf8')
  const beforeMain = source.split('<main id="main-content">')[0]
  const afterMain = source.slice(source.indexOf('</main>') + '</main>'.length)
  const categoryMap = new Map((categories || []).filter((category) => category.visible && category.key).map((category) => [category.key, new Set(category.projectIds || [])]))
  const configuredOrder = (settings?.gridEntries || []).filter((entry) => entry.includeInGrid && entry.projectId).map((entry) => entry.projectId)
  const byId = new Map(projects.map((project) => [project.id, project]))
  const ordered = configuredOrder.length ? configuredOrder.map((id) => byId.get(id)).filter(Boolean) : projects
  const tags = [...categoryMap.entries()].map(([key]) => {
    const category = categories.find((item) => item.key === key)
    return `<div class="css_tag_wrapper"><div class="css_tag_item css_tag_item_inactive" data-tag="${escapeHtml(key)}" role="button" tabindex="0" aria-pressed="false">${escapeHtml(language === 'en' ? category.labelEn : category.labelSv)}</div></div>`
  }).join('\n')
  const cards = ordered.map((project, index) => overviewCard(project, language, categoryMap, index)).join('\n')
  return `${beforeMain}<main id="main-content"><div class="css_tag_container">${tags}</div><div class=" css_grid_container" role="list" aria-label="Project portfolio">${cards}</div></main>${afterMain}`
}

function decoratePreviewHtml(html, {documentId, parentOrigin, perspective, route}) {
  const safeId = escapeHtml(String(documentId || '').replace(/^drafts\./, ''))
  const attributes = ` data-cms-route="${escapeHtml(route)}" data-cms-document-id="${safeId}"`
  let output = html.replace('<head>', `<head>\n  <meta name="robots" content="noindex, nofollow">\n  <meta name="esencial-preview-parent-origin" content="${escapeHtml(parentOrigin)}">\n  <meta name="esencial-preview-authenticated" content="true">`)
  output = output.replace('<body class="project-page">', `<body class="project-page" data-cms-route="${escapeHtml(route)}" data-cms-perspective="${escapeHtml(perspective)}">`)
  output = output.replace(/<h1 id="project-title">/i, `<h1 id="project-title" data-cms-field="title" data-cms-path="title" data-cms-text${attributes} data-cms-edit-target>`)
  output = output.replace(/<p class="project-intro__description"/i, `<p class="project-intro__description" data-cms-field="summary" data-cms-path="summary" data-cms-text${attributes} data-cms-edit-target`)
  output = output.replace(/<img src="([^"]+)"/i, `<img src="$1" data-cms-media data-cms-field="heroImage" data-cms-path="heroImage"${attributes} data-cms-edit-target`)
  return output.replace('</body>', `<script src="/api/preview-runtime"></script>\n</body>`)
}

async function renderProjectPreview({perspective, route}) {
  // Keep the credential server-side while supporting private datasets in both
  // published and draft views. Draft rendering still requires it below.
  const token = process.env.SANITY_PREVIEW_TOKEN
  if (perspective === 'drafts' && !token) throw new Error('Preview credentials are unavailable.')
  const client = configuredClient({perspective: perspective === 'staging' ? 'published' : perspective, token})
  const [rawProjects, navigation] = await Promise.all([client.fetch(projectQuery), client.fetch(navigationQuery)])
  const all = rawProjects.map(normaliseProject).filter((project) => project.slug && (project.language === 'sv' || project.language === 'en') && project.images.length)
  if (route === '/' || route === '/projects/') {
    const language = route === '/projects/' ? 'en' : 'sv'
    return {html: overviewHtml({projects: all.filter((project) => project.language === language), categories: navigation?.categories || [], settings: navigation?.settings, language}), project: undefined}
  }
  const match = route.match(PROJECT_ROUTE)
  if (!match) throw new Error('Only project routes can be server-rendered as CMS drafts.')
  const language = match[1] === 'projects' ? 'en' : 'sv'
  const slug = match[2]
  const project = all.find((item) => item.language === language && item.slug === slug)
  if (!project) throw new Error('The requested project is unavailable in this preview perspective.')
  const translations = {
    sv: new Map(all.filter((item) => item.language === 'sv').map((item) => [item.id, item])),
    en: new Map(all.filter((item) => item.language === 'en').map((item) => [item.id, item])),
  }
  const projectMaps = {
    sv: new Map(all.filter((item) => item.language === 'sv').map((item) => [item.id, item])),
    en: new Map(all.filter((item) => item.language === 'en').map((item) => [item.id, item])),
  }
  return {html: pageHtml(project, language, translations, projectMaps[language]), project}
}

function send(res, status, body, headers = {}) {
  res.statusCode = status
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value)
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(body)
}

module.exports = {PERSPECTIVES, STUDIO_ORIGIN, cleanRoute, configuredClient, cookieValue, decoratePreviewHtml, renderProjectPreview, send}
