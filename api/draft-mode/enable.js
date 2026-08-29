const {cleanRoute, configuredClient} = require('../preview-utils')

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET')
    return res.end('Method not allowed')
  }
  if (!process.env.SANITY_PREVIEW_TOKEN) {
    res.statusCode = 503
    return res.end('Preview is not configured')
  }
  try {
    const [{validatePreviewUrl}, {perspectiveCookieName, urlSearchParamPreviewPathname}] = await Promise.all([
      import('@sanity/preview-url-secret'),
      import('@sanity/preview-url-secret/constants'),
    ])
    const requestUrl = new URL(req.url, `https://${req.headers.host}`)
    const validated = await validatePreviewUrl(configuredClient({perspective: 'drafts', token: process.env.SANITY_PREVIEW_TOKEN}), requestUrl.toString())
    if (!validated?.isValid) {
      res.statusCode = 401
      return res.end('Invalid preview request')
    }
    const requestedPath = requestUrl.searchParams.get(urlSearchParamPreviewPathname)
    const redirectPath = validated.redirectTo ? new URL(validated.redirectTo, requestUrl).pathname : requestedPath
    const route = cleanRoute(redirectPath)
    if (!route) {
      res.statusCode = 400
      return res.end('Unsupported preview route')
    }
    const perspective = validated.studioPreviewPerspective === 'published' ? 'published' : 'drafts'
    const location = new URL('/__preview/render/', requestUrl)
    location.searchParams.set('route', route)
    location.searchParams.set('perspective', perspective)
    res.statusCode = 307
    res.setHeader('Location', location.toString())
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    res.setHeader('Set-Cookie', `${perspectiveCookieName}=${perspective}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3600`)
    return res.end()
  } catch {
    res.statusCode = 401
    return res.end('Preview validation failed')
  }
}
