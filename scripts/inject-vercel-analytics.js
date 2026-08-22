const fs = require('fs')
const path = require('path')
const {ROOT} = require('./recovery-utils')

const publicDirectory = path.join(ROOT, 'public')
const marker = /[\t\r\n ]*<!-- ESENCIAL_ANALYTICS_START -->[\s\S]*?<!-- ESENCIAL_ANALYTICS_END -->[\t\r\n ]*/g
const ignoredDirectories = new Set([
  'ESENCIAL%20%7C%20PROJEKT',
  path.join('about', 'ESENCIAL%20%7C%20PROJEKT'),
  path.join('projects', 'ESENCIAL%20%7C%20PROJEKT'),
])

function cookiebotSnippet() {
  const id = process.env.COOKIEBOT_CBID?.trim()
  if (!id) return ''
  if (!/^[a-z0-9-]{20,}$/i.test(id)) throw new Error('COOKIEBOT_CBID has an invalid format.')
  return `<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="${id}" type="text/javascript"></script>`
}

function snippet() {
  const consent = cookiebotSnippet()
  const analytics = consent
    ? `${consent}\n<script type="text/plain" data-cookieconsent="statistics" src="/_vercel/insights/script.js"></script>`
    : '<!-- Analytics disabled: COOKIEBOT_CBID is not configured. -->'
  return `\n<!-- ESENCIAL_ANALYTICS_START -->
${analytics}
<!-- ESENCIAL_ANALYTICS_END -->\n`
}

function htmlFiles(directory, relative = '') {
  if (ignoredDirectories.has(relative)) return []
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const nextRelative = path.join(relative, entry.name)
    const nextPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return htmlFiles(nextPath, nextRelative)
    return entry.isFile() && entry.name.endsWith('.html') ? [nextPath] : []
  })
}

function injectAnalytics(directory = publicDirectory) {
  let changed = 0
  for (const file of htmlFiles(directory)) {
    const original = fs.readFileSync(file, 'utf8')
    const withoutExisting = original.replace(marker, '\n')
    const next = withoutExisting.replace('</head>', `${snippet()}</head>`)
    if (next === original) continue
    fs.writeFileSync(file, next, 'utf8')
    changed += 1
  }
  return changed
}

if (require.main === module) {
  const changed = injectAnalytics()
  console.log(process.env.COOKIEBOT_CBID
    ? `Injected consent-gated Vercel Web Analytics and Cookiebot into ${changed} pages.`
    : `Disabled analytics on ${changed} pages because COOKIEBOT_CBID is not configured.`)
}

module.exports = {cookiebotSnippet, snippet, htmlFiles, injectAnalytics}
