const fs = require('fs')
const path = require('path')
const {ROOT} = require('./recovery-utils')

const publicDirectory = path.join(ROOT, 'public')
const marker = /\n?<!-- ESENCIAL_ANALYTICS_START -->[\s\S]*?<!-- ESENCIAL_ANALYTICS_END -->\n?/g
const ignoredDirectories = new Set([
  'ESENCIAL%20%7C%20PROJEKT',
  path.join('about', 'ESENCIAL%20%7C%20PROJEKT'),
  path.join('projects', 'ESENCIAL%20%7C%20PROJEKT'),
])

function cookiebotSnippet() {
  const id = process.env.COOKIEBOT_CBID?.trim()
  if (!id) return ''
  if (!/^[a-z0-9-]{20,}$/i.test(id)) throw new Error('COOKIEBOT_CBID has an invalid format.')
  return `\n<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="${id}" type="text/javascript" async></script>`
}

function snippet() {
  return `\n<!-- ESENCIAL_ANALYTICS_START -->${cookiebotSnippet()}
<script defer src="/_vercel/insights/script.js"></script>
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

let changed = 0
for (const file of htmlFiles(publicDirectory)) {
  const original = fs.readFileSync(file, 'utf8')
  const withoutExisting = original.replace(marker, '\n')
  const next = withoutExisting.replace('</head>', `${snippet()}</head>`)
  if (next === original) continue
  fs.writeFileSync(file, next, 'utf8')
  changed += 1
}

console.log(`Injected Vercel Web Analytics${process.env.COOKIEBOT_CBID ? ' and Cookiebot' : ''} into ${changed} pages.`)
