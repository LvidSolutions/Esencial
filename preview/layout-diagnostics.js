(function installEsencialLayoutDiagnostics(global) {
  'use strict'

  var VERSION = 1
  var VALID_PERSPECTIVES = new Set(['drafts', 'published', 'staging'])
  var BLOCKING_OVERFLOW = new Set(['hidden', 'clip'])
  var pendingTimer

  function text(value) {
    return typeof value === 'string' ? value.trim() : ''
  }

  function previewRoute() {
    return text(document.body && document.body.dataset.cmsRoute) || location.pathname
  }

  function previewPerspective() {
    var value = text(document.body && document.body.dataset.cmsPerspective)
    return VALID_PERSPECTIVES.has(value) ? value : 'staging'
  }

  function contextFor(element, fallbackField) {
    var contextElement = element && element.closest ? element.closest('[data-cms-field]') : null
    return {
      route: text((contextElement && contextElement.dataset.cmsRoute) || previewRoute()),
      field: text((contextElement && contextElement.dataset.cmsField) || fallbackField || 'page'),
      documentId: text(contextElement && contextElement.dataset.cmsDocumentId) || undefined,
      path: text(contextElement && contextElement.dataset.cmsPath) || undefined,
    }
  }

  function createIssue(code, element, fallbackField, message, suggestion) {
    var context = contextFor(element, fallbackField)
    return {
      code: code,
      severity: 'blocker',
      route: context.route,
      field: context.field,
      message: message,
      suggestion: suggestion,
      documentId: context.documentId,
      path: context.path,
    }
  }

  function visible(element) {
    if (!(element instanceof Element)) return false
    var style = getComputedStyle(element)
    var rect = element.getBoundingClientRect()
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
  }

  function overlaps(first, second) {
    var a = first.getBoundingClientRect()
    var b = second.getBoundingClientRect()
    return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1
  }

  function inspectHorizontalScroll(issues) {
    var root = document.documentElement
    var body = document.body
    var measuredWidth = Math.max(root.scrollWidth, body ? body.scrollWidth : 0)
    if (measuredWidth > root.clientWidth + 1) {
      issues.push(
        createIssue(
          'horizontal-scroll',
          body,
          'page',
          'Sidan är bredare än viewporten och skapar horisontell scroll.',
          'Identifiera elementet som överskrider viewporten och låt innehållet radbrytas eller reflowa utan att döljas.',
        ),
      )
    }
  }

  function inspectTextFields(issues) {
    document.querySelectorAll('[data-cms-field]').forEach(function inspectField(element) {
      if (!visible(element)) return
      var style = getComputedStyle(element)
      var overflowsX = element.scrollWidth > element.clientWidth + 1
      var overflowsY = element.scrollHeight > element.clientHeight + 1
      var clipsX = BLOCKING_OVERFLOW.has(style.overflowX)
      var clipsY = BLOCKING_OVERFLOW.has(style.overflowY)

      if ((overflowsX && clipsX) || (overflowsY && clipsY)) {
        issues.push(
          createIssue(
            'clipping',
            element,
            'page',
            'Fältets innehåll klipps av sin behållare.',
            'Låt behållaren växa eller innehållet radbrytas; använd inte dold overflow eller ellips som innehållslösning.',
          ),
        )
      }

      var content = text(element.textContent)
      var longestToken = content
        ? content.split(/\s+/).reduce(function longest(current, token) {
            return Math.max(current, token.length)
          }, 0)
        : 0
      if (longestToken > 36 && overflowsX) {
        issues.push(
          createIssue(
            'text-overflow',
            element,
            'page',
            'Ett långt obrutet textsegment överskrider fältets bredd.',
            'Lägg in en redaktionellt korrekt brytpunkt eller justera komponentens naturliga radbrytning utan trunkering.',
          ),
        )
      }

      if (element.hasAttribute('data-cms-text') && content) {
        var fontSize = Number.parseFloat(style.fontSize) || 16
        var estimatedCharacters = Math.round(element.clientWidth / Math.max(1, fontSize * 0.52))
        var requestedLimit = Number(element.getAttribute('data-cms-line-limit'))
        var limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 75
        if (estimatedCharacters > limit && content.length > limit) {
          issues.push(
            createIssue(
              'unsafe-line-length',
              element,
              'page',
              'Textmåttet uppskattas till ' + estimatedCharacters + ' tecken per rad.',
              'Begränsa den läsbara textkolumnen till högst ' + limit + ' tecken per rad utan att kapa innehållet.',
            ),
          )
        }
      }
    })
  }

  function inspectOverlaps(issues) {
    var groups = new Map()
    document.querySelectorAll('[data-cms-overlap-group]').forEach(function collect(element) {
      if (!visible(element)) return
      var group = text(element.getAttribute('data-cms-overlap-group'))
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group).push(element)
    })
    groups.forEach(function inspectGroup(elements) {
      for (var firstIndex = 0; firstIndex < elements.length; firstIndex += 1) {
        for (var secondIndex = firstIndex + 1; secondIndex < elements.length; secondIndex += 1) {
          var first = elements[firstIndex]
          var second = elements[secondIndex]
          if (first.contains(second) || second.contains(first) || !overlaps(first, second)) continue
          issues.push(
            createIssue(
              'overlap',
              second,
              'page',
              'Två kontroller eller innehållsytor överlappar varandra.',
              'Låt komponenterna reflowa i dokumentordning och reservera utrymme för fasta eller absoluta element.',
            ),
          )
        }
      }
    })
  }

  function inspectMedia(issues) {
    document.querySelectorAll('img[data-cms-media]').forEach(function inspectImage(image) {
      var source = text(image.getAttribute('src'))
      if (!source) {
        issues.push(
          createIssue(
            'missing-media',
            image,
            'media',
            'Förväntad media saknar bildkälla.',
            'Välj eller återställ mediefältet; ändra inte beskärning, inramning eller komprimering för att dölja felet.',
          ),
        )
      } else if (image.complete && image.naturalWidth === 0) {
        issues.push(
          createIssue(
            'broken-media',
            image,
            'media',
            'Bildkällan kunde inte laddas.',
            'Kontrollera asset-referensen och åtkomsten; behåll frontendens befintliga bildkvalitet och framing.',
          ),
        )
      }
    })
  }

  function deduplicate(issues) {
    var unique = new Map()
    issues.forEach(function add(issue) {
      var key = [issue.code, issue.route, issue.field, issue.documentId || '', issue.path || ''].join('|')
      if (!unique.has(key)) unique.set(key, issue)
    })
    return Array.from(unique.values()).sort(function sortIssues(first, second) {
      return [first.route, first.field, first.code].join('|').localeCompare([second.route, second.field, second.code].join('|'))
    })
  }

  function run() {
    var issues = []
    inspectHorizontalScroll(issues)
    inspectTextFields(issues)
    inspectOverlaps(issues)
    inspectMedia(issues)
    var result = {
      type: 'esencial-preview/diagnostics',
      version: VERSION,
      route: previewRoute(),
      perspective: previewPerspective(),
      issues: deduplicate(issues),
      viewport: {width: document.documentElement.clientWidth, height: global.innerHeight},
    }
    global.__ESENCIAL_PREVIEW_DIAGNOSTICS__ = result
    post(result)
    return result
  }

  function parentOrigin() {
    var meta = document.querySelector('meta[name="esencial-preview-parent-origin"]')
    var value = text(meta && meta.getAttribute('content'))
    if (!value) return undefined
    try {
      return new URL(value).origin
    } catch {
      return undefined
    }
  }

  function post(message) {
    var targetOrigin = parentOrigin()
    if (!targetOrigin || global.parent === global) return
    global.parent.postMessage(message, targetOrigin)
  }

  function announceReady() {
    var authMeta = document.querySelector('meta[name="esencial-preview-authenticated"]')
    post({
      type: 'esencial-preview/ready',
      version: VERSION,
      route: previewRoute(),
      perspective: previewPerspective(),
      authenticated: text(authMeta && authMeta.getAttribute('content')) === 'true',
      renderer: 'frontend',
    })
  }

  function schedule() {
    clearTimeout(pendingTimer)
    pendingTimer = setTimeout(run, 80)
  }

  document.addEventListener('click', function handleEditIntent(event) {
    var target = event.target instanceof Element ? event.target.closest('[data-cms-edit-target]') : null
    if (!target) return
    var documentId = text(target.getAttribute('data-cms-document-id'))
    if (!documentId) return
    event.preventDefault()
    post({
      type: 'esencial-preview/edit',
      version: VERSION,
      documentId: documentId,
      path: text(target.getAttribute('data-cms-path')) || undefined,
    })
  })

  global.addEventListener('load', function onLoad() {
    announceReady()
    schedule()
  })
  global.addEventListener('resize', schedule, {passive: true})
  document.addEventListener('load', schedule, true)
  document.addEventListener('error', schedule, true)

  if ('MutationObserver' in global) {
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'src'],
    })
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule)
  global.EsencialPreviewDiagnostics = {run: run, version: VERSION}
})(window)
