const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const {validSignature, signatureParts} = require('../api/sanity-publish')._internals

const secret = 'test-only-webhook-secret'
const timestamp = String(Math.floor(Date.now() / 1000))
const body = Buffer.from('{"_type":"project","_id":"test"}')
const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest('base64url')

assert.deepEqual(signatureParts(`t=${timestamp},v1=${signature}`), {timestamp, signature})
assert.equal(validSignature({header: `t=${timestamp},v1=${signature}`, secret, body}), true)
assert.equal(validSignature({header: `t=${timestamp},v1=${signature}`, secret, body: Buffer.from('{}')}), false)
assert.equal(validSignature({header: `t=1,v1=${signature}`, secret, body}), false)
assert.equal(validSignature({header: `t=${timestamp},v1=nope`, secret, body}), false)
console.log('Sanity publish webhook signature checks passed.')
