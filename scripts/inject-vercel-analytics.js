const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const {ROOT} = require('./recovery-utils')

const publicDirectory = path.join(ROOT, 'public')
const headMarker = /[\t\r\n ]*<!-- ESENCIAL_ANALYTICS_START -->[\s\S]*?<!-- ESENCIAL_ANALYTICS_END -->[\t\r\n ]*/g
const bodyMarker = /[\t\r\n ]*<!-- ESENCIAL_CONSENT_CONTROL_START -->[\s\S]*?<!-- ESENCIAL_CONSENT_CONTROL_END -->[\t\r\n ]*/g
const ignoredDirectories = new Set([
  'ESENCIAL%20%7C%20PROJEKT',
  path.join('about', 'ESENCIAL%20%7C%20PROJEKT'),
  path.join('projects', 'ESENCIAL%20%7C%20PROJEKT'),
])
const publicConsentVariables = [
  'COOKIEBOT_CBID',
  'CONSENT_NOTICE_VERSION',
  'CONSENT_CONTROLLER_NAME',
  'CONSENT_PRIVACY_URL',
  'CONSENT_ANALYTICS_RETENTION',
  'CONSENT_CHOICE_RETENTION',
  'CONSENT_CHOICE_RETENTION_DAYS',
]

function legacyCookiebotId(environment = process.env) {
  const id = environment.COOKIEBOT_CBID?.trim()
  const s19Values = publicConsentVariables.slice(1).filter((name) => environment[name]?.trim())
  if (!id || s19Values.length > 0) return null
  if (!/^[a-z0-9-]{20,}$/i.test(id)) throw new Error('COOKIEBOT_CBID has an invalid format.')
  return id
}

function cleanPublicText(name, value, maximum = 160) {
  const text = value?.trim()
  if (!text || text.length > maximum || /[<>\u2028\u2029]/u.test(text)) {
    throw new Error(`${name} is missing or has an invalid public value.`)
  }
  return text
}

function privacyUrl(value) {
  const text = cleanPublicText('CONSENT_PRIVACY_URL', value, 300)
  let url
  try {
    url = new URL(text, 'https://www.esencial.se')
  } catch {
    throw new Error('CONSENT_PRIVACY_URL must be a root-relative path or HTTPS URL.')
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('CONSENT_PRIVACY_URL must be a root-relative path or HTTPS URL.')
  }
  return text
}

function choiceRetentionDays(value) {
  const text = value?.trim()
  if (!/^[1-9]\d{0,2}$/.test(text || '')) {
    throw new Error('CONSENT_CHOICE_RETENTION_DAYS must be an integer from 1 to 365.')
  }
  const days = Number(text)
  if (days > 365) throw new Error('CONSENT_CHOICE_RETENTION_DAYS must be an integer from 1 to 365.')
  return days
}

function consentConfiguration(environment = process.env) {
  const present = publicConsentVariables.filter((name) => environment[name]?.trim())
  if (present.length === 0) return null
  if (present.length !== publicConsentVariables.length) {
    const missing = publicConsentVariables.filter((name) => !environment[name]?.trim())
    throw new Error(`Consent configuration is incomplete. Missing: ${missing.join(', ')}.`)
  }

  const cbid = environment.COOKIEBOT_CBID.trim()
  if (!/^[a-z0-9-]{20,}$/i.test(cbid)) throw new Error('COOKIEBOT_CBID has an invalid format.')
  const version = environment.CONSENT_NOTICE_VERSION.trim()
  if (!/^[a-z0-9][a-z0-9._-]{0,39}$/i.test(version)) {
    throw new Error('CONSENT_NOTICE_VERSION has an invalid format.')
  }

  return {
    analyticsRetention: cleanPublicText('CONSENT_ANALYTICS_RETENTION', environment.CONSENT_ANALYTICS_RETENTION),
    cbid,
    choiceRetention: cleanPublicText('CONSENT_CHOICE_RETENTION', environment.CONSENT_CHOICE_RETENTION),
    choiceRetentionDays: choiceRetentionDays(environment.CONSENT_CHOICE_RETENTION_DAYS),
    controller: cleanPublicText('CONSENT_CONTROLLER_NAME', environment.CONSENT_CONTROLLER_NAME, 120),
    privacyUrl: privacyUrl(environment.CONSENT_PRIVACY_URL),
    version,
  }
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function htmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function consentControllerSource(config) {
  return `(function () {
  'use strict';
  var config = ${safeJson(config)};
  var key = 'esencial.consent';
  var analyticsId = 'esencial-vercel-analytics';
  var root;
  var notice;
  var reopen;
  var status;
  var currentChoice = null;

  function readChoice() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(key));
      var now = Date.now();
      var decidedAt = parsed && typeof parsed.decidedAt === 'string' ? Date.parse(parsed.decidedAt) : NaN;
      var retentionMs = config.choiceRetentionDays * 86400000;
      var canonicalTimestamp = Number.isFinite(decidedAt) && new Date(decidedAt).toISOString() === parsed.decidedAt;
      var currentTimestamp = canonicalTimestamp && decidedAt <= now && now - decidedAt < retentionMs;
      if (!parsed || parsed.version !== config.version || typeof parsed.statistics !== 'boolean' || !currentTimestamp) {
        window.localStorage.removeItem(key);
        return null;
      }
      return parsed;
    } catch (_error) {
      try { window.localStorage.removeItem(key); } catch (_ignored) {}
      return null;
    }
  }

  function writeChoice(statistics) {
    var choice = {version: config.version, statistics: statistics, decidedAt: new Date().toISOString()};
    try {
      window.localStorage.setItem(key, JSON.stringify(choice));
      currentChoice = choice;
      return true;
    } catch (_error) {
      showStatus(strings().storageError);
      return false;
    }
  }

  function strings() {
    var english = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
    return english ? {
      accept: 'Accept statistics',
      controller: 'Controller: ',
      details: 'Details about storage and providers',
      intro: config.controller + ' would like to use Vercel Web Analytics for aggregated page-view and visitor statistics. Statistics remain off until you choose.',
      necessary: 'Necessary: remembers this consent choice. Choice storage: ' + config.choiceRetention + '.',
      privacy: 'Read the privacy information',
      reject: 'Reject statistics',
      reopen: 'Cookie settings',
      retention: 'Statistics retention: ' + config.analyticsRetention + '.',
      storageError: 'Your choice could not be saved. Statistics remain off.',
      title: 'Cookie choices',
      unavailable: 'The consent service is unavailable. Statistics remain off.',
      vendor: 'Providers: Cookiebot by Usercentrics (consent) and Vercel Web Analytics (statistics).'
    } : {
      accept: 'Acceptera statistik',
      controller: 'Personuppgiftsansvarig: ',
      details: 'Detaljer om lagring och leverantörer',
      intro: config.controller + ' vill använda Vercel Web Analytics för aggregerad statistik om sidvisningar och besök. Statistik är avstängd tills du väljer.',
      necessary: 'Nödvändigt: minns detta samtyckesval. Lagring av valet: ' + config.choiceRetention + '.',
      privacy: 'Läs integritetsinformationen',
      reject: 'Avvisa statistik',
      reopen: 'Kakinställningar',
      retention: 'Lagring av statistik: ' + config.analyticsRetention + '.',
      storageError: 'Ditt val kunde inte sparas. Statistik förblir avstängd.',
      title: 'Val för kakor',
      unavailable: 'Samtyckestjänsten är inte tillgänglig. Statistik förblir avstängd.',
      vendor: 'Leverantörer: Cookiebot by Usercentrics (samtycke) och Vercel Web Analytics (statistik).'
    };
  }

  function showStatus(message) {
    if (!status) return;
    status.textContent = message || '';
    status.hidden = !message;
  }

  function showNotice() {
    if (!notice || !reopen) return;
    showStatus('');
    notice.hidden = false;
    reopen.hidden = true;
    var first = notice.querySelector('[data-consent-choice="reject"]');
    if (first) first.focus();
  }

  function hideNotice() {
    if (!notice || !reopen) return;
    notice.hidden = true;
    reopen.hidden = false;
    reopen.focus();
  }

  function cookieBot() {
    return window.Cookiebot && typeof window.Cookiebot.submitCustomConsent === 'function' ? window.Cookiebot : null;
  }

  function removeAnalytics() {
    var script = document.getElementById(analyticsId);
    if (script) script.remove();
    document.documentElement.removeAttribute('data-esencial-analytics');
  }

  function loadAnalytics() {
    var bot = cookieBot();
    var choice = readChoice();
    if (!bot || !choice || choice.version !== config.version || choice.statistics !== true || bot.consent.statistics !== true) return;
    if (document.getElementById(analyticsId)) return;
    var script = document.createElement('script');
    script.id = analyticsId;
    script.src = '/_vercel/insights/script.js';
    script.async = true;
    script.dataset.consentVersion = config.version;
    script.addEventListener('load', function () { document.documentElement.setAttribute('data-esencial-analytics', 'active'); });
    script.addEventListener('error', function () { removeAnalytics(); });
    document.head.appendChild(script);
  }

  function synchronizeProvider() {
    var bot = cookieBot();
    currentChoice = readChoice();
    if (!bot) return;
    if (!currentChoice) {
      if (bot.consent && bot.consent.statistics && typeof bot.withdraw === 'function') bot.withdraw();
      showNotice();
      return;
    }
    bot.submitCustomConsent(false, currentChoice.statistics, false);
    if (currentChoice.statistics) loadAnalytics();
  }

  function choose(statistics) {
    var bot = cookieBot();
    var withdrawing = Boolean(currentChoice && currentChoice.statistics === true && statistics === false);
    if (statistics && !bot) {
      showStatus(strings().unavailable);
      return;
    }
    if (!writeChoice(statistics)) return;
    removeAnalytics();
    if (bot) {
      if (withdrawing && typeof bot.withdraw === 'function') bot.withdraw();
      bot.submitCustomConsent(false, statistics, false);
    }
    hideNotice();
    if (withdrawing) {
      window.location.reload();
      return;
    }
    if (statistics) window.setTimeout(loadAnalytics, 0);
  }

  function boot() {
    root = document.getElementById('esencial-consent-root');
    notice = document.getElementById('esencial-consent-notice');
    reopen = document.getElementById('esencial-consent-reopen');
    status = document.getElementById('esencial-consent-status');
    if (!root || !notice || !reopen || !status) return;
    var copy = strings();
    root.querySelector('[data-consent-copy="title"]').textContent = copy.title;
    root.querySelector('[data-consent-copy="intro"]').textContent = copy.intro;
    root.querySelector('[data-consent-copy="details"]').textContent = copy.details;
    root.querySelector('[data-consent-copy="necessary"]').textContent = copy.necessary;
    root.querySelector('[data-consent-copy="vendor"]').textContent = copy.vendor;
    root.querySelector('[data-consent-copy="retention"]').textContent = copy.retention;
    root.querySelector('[data-consent-copy="controller"]').textContent = copy.controller + config.controller + '.';
    var privacy = root.querySelector('[data-consent-copy="privacy"]');
    privacy.textContent = copy.privacy;
    privacy.href = config.privacyUrl;
    root.querySelector('[data-consent-choice="reject"]').textContent = copy.reject;
    root.querySelector('[data-consent-choice="accept"]').textContent = copy.accept;
    reopen.textContent = copy.reopen;
    notice.addEventListener('click', function (event) {
      var target = event.target.closest('[data-consent-choice]');
      if (!target) return;
      choose(target.getAttribute('data-consent-choice') === 'accept');
    });
    reopen.addEventListener('click', showNotice);
    currentChoice = readChoice();
    if (currentChoice) {
      notice.hidden = true;
      reopen.hidden = false;
    } else {
      notice.hidden = false;
      reopen.hidden = true;
    }
    synchronizeProvider();
  }

  window.addEventListener('CookiebotOnDialogDisplay', function () {
    if (window.Cookiebot && typeof window.Cookiebot.hide === 'function') window.Cookiebot.hide();
  });
  window.addEventListener('CookiebotOnConsentReady', synchronizeProvider);
  window.addEventListener('CookiebotOnAccept', loadAnalytics);
  window.addEventListener('CookiebotOnDecline', removeAnalytics);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();`
}

function consentStyleSource() {
  return `.esencial-consent[hidden]{display:none!important}.esencial-consent{position:fixed;z-index:100000;right:16px;bottom:16px;left:16px;max-width:680px;margin-inline:auto;padding:20px;border:1px solid #1f1f1d;background:#fff;color:#1f1f1d;font:16px/1.5 Arial,Helvetica,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.22)}.esencial-consent h2{margin:0 0 8px;font-size:22px;line-height:1.25}.esencial-consent p{margin:0 0 12px}.esencial-consent details{margin:12px 0}.esencial-consent summary{min-height:44px;padding:10px 0;cursor:pointer;font-weight:600}.esencial-consent a{color:#1f1f1d;text-decoration-thickness:2px;text-underline-offset:3px}.esencial-consent__choices{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.esencial-consent button{min-height:48px;padding:10px 16px;border:2px solid #1f1f1d;border-radius:0;background:#fff;color:#1f1f1d;font:inherit;font-weight:600;cursor:pointer}.esencial-consent button:hover{background:#e9e9e5}.esencial-consent :focus-visible{outline:3px solid #005fcc;outline-offset:3px}.esencial-consent__status{padding:10px;border-left:4px solid #8c2f1c;background:#fff1ed}.esencial-consent-reopen{position:fixed;z-index:99999;left:12px;bottom:12px;min-height:44px;padding:8px 14px;border:2px solid #1f1f1d;background:#fff;color:#1f1f1d;font:600 14px/1.2 Arial,Helvetica,sans-serif;cursor:pointer}.esencial-consent-reopen:focus-visible{outline:3px solid #005fcc;outline-offset:3px}@media(max-width:480px){.esencial-consent{right:8px;bottom:8px;left:8px;padding:16px}.esencial-consent__choices{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.esencial-consent *,.esencial-consent-reopen{scroll-behavior:auto!important;transition:none!important}}`
}

function consentMarkup(config) {
  if (!config) return ''
  return `
<!-- ESENCIAL_CONSENT_CONTROL_START -->
<div id="esencial-consent-root" data-consent-version="${config.version}">
  <section id="esencial-consent-notice" class="esencial-consent" aria-labelledby="esencial-consent-title">
    <h2 id="esencial-consent-title" data-consent-copy="title"></h2>
    <p data-consent-copy="intro"></p>
    <details>
      <summary data-consent-copy="details"></summary>
      <p data-consent-copy="necessary"></p>
      <p data-consent-copy="vendor"></p>
      <p data-consent-copy="retention"></p>
      <p data-consent-copy="controller"></p>
      <p><a data-consent-copy="privacy" href="${htmlAttribute(config.privacyUrl)}"></a></p>
    </details>
    <p id="esencial-consent-status" class="esencial-consent__status" role="status" hidden></p>
    <div class="esencial-consent__choices">
      <button type="button" data-consent-choice="reject"></button>
      <button type="button" data-consent-choice="accept"></button>
    </div>
  </section>
  <button id="esencial-consent-reopen" class="esencial-consent-reopen" type="button" hidden></button>
</div>
<!-- ESENCIAL_CONSENT_CONTROL_END -->
`
}

function headSnippet(environment = process.env) {
  const legacyId = legacyCookiebotId(environment)
  if (legacyId) {
    return `\n<!-- ESENCIAL_ANALYTICS_START -->
<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="${legacyId}" type="text/javascript"></script>
<script type="text/plain" data-cookieconsent="statistics" src="/_vercel/insights/script.js"></script>
<!-- ESENCIAL_ANALYTICS_END -->\n`
  }
  const config = consentConfiguration(environment)
  if (!config) {
    return `\n<!-- ESENCIAL_ANALYTICS_START -->
<!-- Analytics disabled: COOKIEBOT_CBID is not configured. -->
<!-- ESENCIAL_ANALYTICS_END -->\n`
  }
  const controller = consentControllerSource(config)
  const style = consentStyleSource()
  return `\n<!-- ESENCIAL_ANALYTICS_START -->
<style data-esencial-consent-style>${style}</style>
<script data-esencial-consent-controller>${controller}</script>
<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="${config.cbid}" type="text/javascript"></script>
<!-- ESENCIAL_ANALYTICS_END -->\n`
}

function snippet(environment = process.env) {
  if (legacyCookiebotId(environment)) return headSnippet(environment)
  const config = consentConfiguration(environment)
  return `${headSnippet(environment)}${consentMarkup(config)}`
}

function cspHashes(environment = process.env) {
  const config = consentConfiguration(environment)
  if (!config) return null
  const hash = (value) => `'sha256-${crypto.createHash('sha256').update(value).digest('base64')}'`
  return {
    script: hash(consentControllerSource(config)),
    style: hash(consentStyleSource()),
  }
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

function injectAnalytics(directory = publicDirectory, environment = process.env) {
  const config = legacyCookiebotId(environment) ? null : consentConfiguration(environment)
  const head = headSnippet(environment)
  const body = consentMarkup(config)
  let changed = 0
  for (const file of htmlFiles(directory)) {
    const original = fs.readFileSync(file, 'utf8')
    const withoutExisting = original.replace(headMarker, '\n').replace(bodyMarker, '\n')
    let next = withoutExisting.replace('</head>', `${head}</head>`)
    if (body) next = next.replace('</body>', `${body}</body>`)
    if (next === original) continue
    fs.writeFileSync(file, next, 'utf8')
    changed += 1
  }
  return changed
}

if (require.main === module) {
  const changed = injectAnalytics()
  const enabled = Boolean(consentConfiguration())
  console.log(enabled
    ? `Injected versioned consent controls and consent-gated Vercel Web Analytics into ${changed} pages.`
    : `Disabled analytics on ${changed} pages because approved consent configuration is not complete.`)
}

module.exports = {
  bodyMarker,
  consentConfiguration,
  consentControllerSource,
  consentMarkup,
  consentStyleSource,
  cspHashes,
  headMarker,
  headSnippet,
  htmlFiles,
  injectAnalytics,
  snippet,
}
