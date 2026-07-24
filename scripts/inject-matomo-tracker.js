const fs = require('fs')
const path = require('path')
const {ROOT} = require('./recovery-utils')

const publicDirectory = path.join(ROOT, 'public')
const marker = /\n?<!-- ESENCIAL_MATOMO_START -->[\s\S]*?<!-- ESENCIAL_MATOMO_END -->\n?/g
const ignoredDirectories = new Set([
  'ESENCIAL%20%7C%20PROJEKT',
  path.join('about', 'ESENCIAL%20%7C%20PROJEKT'),
  path.join('projects', 'ESENCIAL%20%7C%20PROJEKT'),
])

function requiredConfiguration() {
  const values = {
    trackerUrl: process.env.MATOMO_TRACKER_URL,
    siteId: process.env.MATOMO_SITE_ID,
    cookiebotId: process.env.COOKIEBOT_CBID,
  }
  const supplied = Object.values(values).filter(Boolean).length
  if (supplied && supplied !== Object.keys(values).length) throw new Error('Matomo tracking requires MATOMO_TRACKER_URL, MATOMO_SITE_ID and COOKIEBOT_CBID together.')
  if (!supplied) return undefined
  const trackerUrl = new URL(values.trackerUrl)
  if (trackerUrl.protocol !== 'https:') throw new Error('MATOMO_TRACKER_URL must use HTTPS.')
  return {...values, trackerUrl: trackerUrl.toString()}
}

function snippet({trackerUrl, siteId, cookiebotId}) {
  const trackerJsUrl = new URL(trackerUrl)
  trackerJsUrl.pathname = trackerJsUrl.pathname.replace(/matomo\.php$/, 'matomo.js').replace(/piwik\.php$/, 'piwik.js')
  return `\n<!-- ESENCIAL_MATOMO_START -->
<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="${cookiebotId}" type="text/javascript" async></script>
<script type="text/plain" data-cookieconsent="statistics">
  window._paq = window._paq || [];
  window._paq.push(['trackPageView']);
  window._paq.push(['enableLinkTracking']);
  (function () {
    var tracker = document.createElement('script');
    tracker.async = true;
    window._paq.push(['setTrackerUrl', ${JSON.stringify(trackerUrl)}]);
    window._paq.push(['setSiteId', ${JSON.stringify(String(siteId))}]);
    tracker.src = ${JSON.stringify(trackerJsUrl.toString())};
    document.head.appendChild(tracker);
  }());
</script>
<!-- ESENCIAL_MATOMO_END -->\n`
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

const configuration = requiredConfiguration()
let changed = 0
for (const file of htmlFiles(publicDirectory)) {
  const original = fs.readFileSync(file, 'utf8')
  const withoutExisting = original.replace(marker, '\n')
  const next = configuration ? withoutExisting.replace('</head>', `${snippet(configuration)}</head>`) : withoutExisting
  if (next === original) continue
  fs.writeFileSync(file, next, 'utf8')
  changed += 1
}
console.log(configuration ? `Injected Cookiebot and Matomo tracking into ${changed} pages.` : `Matomo tracking is not configured; removed any prior tracking snippets from ${changed} pages.`)
