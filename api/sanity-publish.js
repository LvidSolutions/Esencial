const crypto = require('node:crypto')

const MAX_SIGNATURE_AGE_SECONDS = 300
const seenDeliveries = new Map()

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function headerValue(value) {
  return Array.isArray(value) ? value[0] : typeof value === 'string' ? value : ''
}

function readBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body)
  if (typeof req.body === 'string') return Promise.resolve(Buffer.from(req.body))
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function signatureParts(header) {
  const values = Object.fromEntries(header.split(',').map((part) => part.trim().split('=', 2)).filter(([key, value]) => key && value))
  return {timestamp: values.t, signature: values.v1}
}

function validSignature({header, secret, body, now = Date.now()}) {
  if (!header || !secret || !Buffer.isBuffer(body)) return false
  const {timestamp, signature} = signatureParts(header)
  if (!timestamp || !signature) return false
  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds) || Math.abs(now - timestampSeconds * 1000) > MAX_SIGNATURE_AGE_SECONDS * 1000) return false
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('base64url')
  const supplied = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  return supplied.length === expectedBuffer.length && crypto.timingSafeEqual(supplied, expectedBuffer)
}

function rememberDelivery(key, now = Date.now()) {
  for (const [existing, expiresAt] of seenDeliveries) if (expiresAt <= now) seenDeliveries.delete(existing)
  if (!key) return false
  if (seenDeliveries.has(key)) return true
  seenDeliveries.set(key, now + MAX_SIGNATURE_AGE_SECONDS * 1000)
  return false
}

async function dispatchBuild(token) {
  const repository = process.env.GITHUB_REPOSITORY || 'LvidSolutions/Esencial'
  const [owner, repo] = repository.split('/')
  if (!owner || !repo || repository.split('/').length !== 2) throw new Error('Invalid repository configuration')
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'esencial-sanity-publish-webhook',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      event_type: 'sanity-published',
      client_payload: {source: 'sanity', received_at: new Date().toISOString()},
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`GitHub dispatch failed (${response.status})`)
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, {ok: false, error: 'method_not_allowed'})
  }
  const secret = process.env.SANITY_WEBHOOK_SECRET
  const githubToken = process.env.GITHUB_DISPATCH_TOKEN
  if (!secret || !githubToken) return json(res, 503, {ok: false, error: 'publishing_not_configured'})
  let body
  try {
    body = await readBody(req)
  } catch {
    return json(res, 400, {ok: false, error: 'invalid_body'})
  }
  if (!validSignature({header: headerValue(req.headers?.['sanity-webhook-signature']), secret, body})) {
    return json(res, 401, {ok: false, error: 'invalid_signature'})
  }
  const deliveryKey = headerValue(req.headers?.['idempotency-key'])
  if (rememberDelivery(deliveryKey)) return json(res, 202, {ok: true, duplicate: true})
  try {
    await dispatchBuild(githubToken)
    return json(res, 202, {ok: true, dispatched: true})
  } catch {
    return json(res, 502, {ok: false, error: 'dispatch_failed'})
  }
}

module.exports = handler
module.exports.config = {api: {bodyParser: false}}
module.exports._internals = {MAX_SIGNATURE_AGE_SECONDS, signatureParts, validSignature, rememberDelivery}
