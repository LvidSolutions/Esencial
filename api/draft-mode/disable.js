module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET')
    return res.end('Method not allowed')
  }
  res.statusCode = 307
  res.setHeader('Location', '/')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Set-Cookie', 'sanity-preview-perspective=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0')
  return res.end()
}
