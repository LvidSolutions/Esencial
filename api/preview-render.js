const {PERSPECTIVES, STUDIO_ORIGIN, cleanRoute, cookieValue, decoratePreviewHtml, renderProjectPreview, send} = require('./preview-utils')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, '<h1>Method not allowed</h1>', {Allow: 'GET'})
  const requestedPerspective = String(req.query?.perspective || 'drafts')
  const route = cleanRoute(req.query?.route)
  if (!PERSPECTIVES.has(requestedPerspective) || !route) return send(res, 400, '<h1>Invalid preview request</h1>')
  const cookiePerspective = cookieValue(req.headers.cookie, 'sanity-preview-perspective')
  if (requestedPerspective === 'drafts' && cookiePerspective !== 'drafts') return send(res, 401, '<h1>Preview session required</h1>')
  try {
    const {html, project} = await renderProjectPreview({perspective: requestedPerspective, route})
    return send(res, 200, decoratePreviewHtml(html, {documentId: project?._originalId || project?._id, parentOrigin: process.env.CMS_ORIGIN || STUDIO_ORIGIN, perspective: requestedPerspective, route}))
  } catch {
    return send(res, 502, '<h1>Preview could not be rendered safely</h1>')
  }
}
