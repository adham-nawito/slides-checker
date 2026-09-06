const crypto = require('crypto')

const SECRET = process.env.AUTH_SECRET
if (!SECRET) throw new Error('AUTH_SECRET environment variable is not set. Copy .env.example to .env and set a value.')

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function createToken(username, role) {
  const payload = b64url(Buffer.from(JSON.stringify({ username, role, iat: Date.now() })))
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest())
  return `${payload}.${sig}`
}

function verifyToken(token) {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null
    const payload = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expected = b64url(crypto.createHmac('sha256', SECRET).update(payload).digest())
    if (sig !== expected) return null
    const data = JSON.parse(Buffer.from(payload, 'base64').toString())
    if (Date.now() - data.iat > TOKEN_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

module.exports = { createToken, verifyToken }
