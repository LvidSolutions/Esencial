const fs = require('fs')
const path = require('path')
const {ROOT} = require('./recovery-utils')

const pages = [
  'index.html',
  path.join('projects', 'index.html'),
  path.join('om-oss', 'index.html'),
  path.join('about', 'index.html'),
]

const removals = [
  {
    label: 'ExactMetrics bootstrap and Google tag loader',
    pattern: /[\t\r\n ]*<!-- This site uses the Google Analytics by ExactMetrics plugin[\s\S]*?<!-- \/ Google Analytics by ExactMetrics -->[\t\r\n ]*/g,
  },
  ...[
    'wp-img-auto-sizes-contain-inline-css',
    'wp-block-library-inline-css',
    'classic-theme-styles-inline-css',
    'global-styles-inline-css',
    'admin-bar-inline-css',
  ].map(id => ({
    label: `WordPress inline stylesheet ${id}`,
    pattern: new RegExp(`[\\t\\r\\n ]*<style\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/style>[\\t\\r\\n ]*`, 'gi'),
  })),
  ...['dashicons-css', 'admin-bar-css'].map(id => ({
    label: `WordPress stylesheet ${id}`,
    pattern: new RegExp(`[\\t\\r\\n ]*<link\\b[^>]*id=["']${id}["'][^>]*>[\\t\\r\\n ]*`, 'gi'),
  })),
  {
    label: 'ExactMetrics event tracking script',
    pattern: /[\t\r\n ]*<script\b[^>]*id=["']exactmetrics-frontend-script-js["'][^>]*>[\s\S]*?<\/script>[\t\r\n ]*/gi,
  },
  {
    label: 'ExactMetrics configuration',
    pattern: /[\t\r\n ]*<script\b[^>]*id=["']exactmetrics-frontend-script-js-extra["'][^>]*>[\s\S]*?<\/script>[\t\r\n ]*/gi,
  },
  {
    label: 'jQuery Migrate',
    pattern: /[\t\r\n ]*<script\b[^>]*id=["']jquery-migrate-js["'][^>]*>[\s\S]*?<\/script>[\t\r\n ]*/gi,
  },
  {
    label: 'WordPress generator metadata',
    pattern: /[\t\r\n ]*<meta\b[^>]*name=["']generator["'][^>]*>[\t\r\n ]*/gi,
  },
  {
    label: 'WordPress shortlink',
    pattern: /[\t\r\n ]*<link\b[^>]*rel=["']shortlink["'][^>]*>[\t\r\n ]*/gi,
  },
  {
    label: 'WordPress speculation rules',
    pattern: /[\t\r\n ]*<script\b[^>]*type=["']speculationrules["'][^>]*>[\s\S]*?<\/script>[\t\r\n ]*/gi,
  },
  {
    label: 'legacy favicon plugin comment',
    pattern: /<!-- All in one Favicon 4\.8 -->/g,
  },
]

const forbidden = [
  /ExactMetrics/i,
  /simply_static_page/i,
  /wp-block-library-inline-css/i,
  /classic-theme-styles-inline-css/i,
  /global-styles-inline-css/i,
  /admin-bar-inline-css/i,
  /(?:dashicons|admin-bar)-css/i,
  /jquery-migrate-js/i,
  /<meta\b[^>]*name=["']generator["']/i,
  /<link\b[^>]*rel=["']shortlink["']/i,
  /<script\b[^>]*type=["']speculationrules["']/i,
]

let changedPages = 0
const removalCounts = new Map(removals.map(({label}) => [label, 0]))

for (const relative of pages) {
  const file = path.join(ROOT, 'public', relative)
  const original = fs.readFileSync(file, 'utf8')
  let next = original

  for (const removal of removals) {
    next = next.replace(removal.pattern, () => {
      removalCounts.set(removal.label, removalCounts.get(removal.label) + 1)
      return '\n'
    })
  }

  next = next.replace(/\n{3,}/g, '\n\n')
  const violation = forbidden.find(pattern => pattern.test(next))
  if (violation) throw new Error(`${relative} still contains forbidden legacy markup matching ${violation}`)

  if (next !== original) {
    fs.writeFileSync(file, next, 'utf8')
    changedPages += 1
  }
}

const removedFragments = [...removalCounts.values()].reduce((sum, count) => sum + count, 0)
console.log(`Legacy export cleanup verified for ${pages.length} pages; changed ${changedPages}; removed ${removedFragments} fragments.`)
