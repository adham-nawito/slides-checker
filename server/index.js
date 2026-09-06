const http = require('http')
const url  = require('url')
const path = require('path')
const fs   = require('fs')
const crypto = require('crypto')
const { readDb, writeDb } = require('./db.js')
const { createToken, verifyToken } = require('./auth.js')

const PORT        = 3001
const UPLOADS_DIR = path.join(__dirname, 'uploads')

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const CREDENTIALS = {
  user:  { password: 'user123',  role: 'user'  },
  admin: { password: 'admin123', role: 'admin' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

function json(res, status, data) {
  if (status === 204) { res.writeHead(204); res.end(); return }
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end',  () => { try { resolve(raw ? JSON.parse(raw) : {}) } catch (e) { reject(new Error('Invalid JSON')) } })
    req.on('error', reject)
  })
}

/**
 * Pure Node.js multipart/form-data parser (no dependencies).
 * Returns { fields: Record<string,string>, files: Record<string,{filename,data,contentType}> }
 */
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data',  c => chunks.push(c))
    req.on('error', reject)
    req.on('end', () => {
      try {
        const buf = Buffer.concat(chunks)
        const ct  = req.headers['content-type'] || ''
        const bm  = ct.match(/boundary=([^\s;]+)/)
        if (!bm) return reject(new Error('No multipart boundary in Content-Type'))
        const bnd = bm[1]

        const firstBndBuf = Buffer.from('--' + bnd + '\r\n')
        const sepBuf      = Buffer.from('\r\n--' + bnd)
        const hdrSepBuf   = Buffer.from('\r\n\r\n')
        const result      = { fields: {}, files: {} }

        let pos = buf.indexOf(firstBndBuf)
        if (pos === -1) return resolve(result)
        pos += firstBndBuf.length

        while (pos < buf.length) {
          // find header/body separator
          const hdrEnd = buf.indexOf(hdrSepBuf, pos)
          if (hdrEnd === -1) break

          const hdrStr   = buf.slice(pos, hdrEnd).toString('utf8')
          const bodyStart = hdrEnd + 4

          // find next boundary
          const nextSep = buf.indexOf(sepBuf, bodyStart)
          const bodyEnd = nextSep === -1 ? buf.length : nextSep
          const body    = buf.slice(bodyStart, bodyEnd)

          // parse headers into a plain object
          const hdrs = {}
          for (const line of hdrStr.split('\r\n')) {
            const ci = line.indexOf(':')
            if (ci > 0) hdrs[line.slice(0, ci).toLowerCase().trim()] = line.slice(ci + 1).trim()
          }

          const disp  = hdrs['content-disposition'] || ''
          const name  = (disp.match(/\bname="([^"]+)"/)     || [])[1]
          const fname = (disp.match(/\bfilename="([^"]+)"/) || [])[1]

          if (name) {
            if (fname) {
              result.files[name] = {
                filename:    fname,
                data:        body,
                contentType: hdrs['content-type'] || 'application/octet-stream',
              }
            } else {
              result.fields[name] = body.toString('utf8')
            }
          }

          if (nextSep === -1) break
          pos = nextSep + sepBuf.length
          // check for closing '--'
          if (buf[pos] === 0x2d && buf[pos + 1] === 0x2d) break
          // skip CRLF after boundary
          if (buf[pos] === 0x0d && buf[pos + 1] === 0x0a) pos += 2
        }

        resolve(result)
      } catch (e) {
        reject(e)
      }
    })
  })
}

function getUser(req) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return null
  return verifyToken(h.slice(7))
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  setCors(res)

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const { pathname } = url.parse(req.url, true)
  const method = req.method

  try {

    // ── POST /api/auth/login ──────────────────────────────────────────────────
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { username, password } = await parseBody(req)
      const cred = CREDENTIALS[username]
      if (!cred || cred.password !== password) return json(res, 401, { error: 'Invalid credentials' })
      const token = createToken(username, cred.role)
      return json(res, 200, { token, role: cred.role, username })
    }

    // ── GET /api/tags ─────────────────────────────────────────────────────────
    if (pathname === '/api/tags' && method === 'GET') {
      const user = getUser(req)
      if (!user) return json(res, 401, { error: 'Unauthorized' })
      return json(res, 200, readDb().tags)
    }

    // ── POST /api/tags ────────────────────────────────────────────────────────
    if (pathname === '/api/tags' && method === 'POST') {
      const user = getUser(req)
      if (!user || user.role !== 'admin') return json(res, 403, { error: 'Forbidden' })
      const body = await parseBody(req)
      const db = readDb()
      const tag = {
        id:        crypto.randomUUID(),
        name:      body.name  || 'Unnamed Tag',
        color:     body.color || '#6366f1',
        threshold: typeof body.threshold === 'number' ? body.threshold : 80,
        rules:     Array.isArray(body.rules) ? body.rules : [],
        createdAt: new Date().toISOString(),
      }
      db.tags.push(tag)
      writeDb(db)
      return json(res, 201, tag)
    }

    // ── PUT / DELETE /api/tags/:id ────────────────────────────────────────────
    const tagMatch = pathname.match(/^\/api\/tags\/([^/]+)$/)
    if (tagMatch) {
      const user = getUser(req)
      if (!user || user.role !== 'admin') return json(res, 403, { error: 'Forbidden' })
      const db  = readDb()
      const idx = db.tags.findIndex(t => t.id === tagMatch[1])
      if (idx === -1) return json(res, 404, { error: 'Not found' })

      if (method === 'PUT') {
        const body = await parseBody(req)
        db.tags[idx] = { ...db.tags[idx], ...body, id: tagMatch[1] }
        writeDb(db)
        return json(res, 200, db.tags[idx])
      }
      if (method === 'DELETE') {
        db.tags.splice(idx, 1)
        writeDb(db)
        return json(res, 204, null)
      }
    }

    // ── POST /api/submissions ─────────────────────────────────────────────────
    // Accepts multipart/form-data with fields: file (binary) + metadata (JSON string)
    if (pathname === '/api/submissions' && method === 'POST') {
      const user = getUser(req)
      if (!user) return json(res, 401, { error: 'Unauthorized' })

      const ct = req.headers['content-type'] || ''
      let meta, storedName = null

      if (ct.includes('multipart/form-data')) {
        // Multipart: file + metadata JSON field
        const parts = await parseMultipart(req)
        meta = parts.fields.metadata ? JSON.parse(parts.fields.metadata) : {}

        if (parts.files.file) {
          const ext = path.extname(parts.files.file.filename || '.pptx') || '.pptx'
          storedName = `${crypto.randomUUID()}${ext}`
          fs.writeFileSync(path.join(UPLOADS_DIR, storedName), parts.files.file.data)
        }
      } else {
        // JSON-only (legacy / fallback)
        meta = await parseBody(req)
      }

      const db = readDb()
      const submission = {
        id:          crypto.randomUUID(),
        fileName:    meta.fileName    || 'unknown.pptx',
        fileSize:    meta.fileSize    || 0,
        tagId:       meta.tagId       || '',
        tagName:     meta.tagName     || '',
        passPercent: meta.passPercent || 0,
        slideCount:  meta.slideCount  || 0,
        summary:     meta.summary     || { errors: 0, warnings: 0, infos: 0, passing: 0 },
        issues:      meta.issues      || [],
        storedName,                        // null if no file uploaded
        status:      'pending',
        submittedAt: new Date().toISOString(),
        reviewedAt:  null,
      }
      db.submissions.push(submission)
      writeDb(db)
      return json(res, 201, submission)
    }

    // ── GET /api/submissions ──────────────────────────────────────────────────
    if (pathname === '/api/submissions' && method === 'GET') {
      const user = getUser(req)
      if (!user || user.role !== 'admin') return json(res, 403, { error: 'Forbidden' })
      const db     = readDb()
      const sorted = [...db.submissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      return json(res, 200, sorted)
    }

    // ── GET /api/submissions/:id/download ─────────────────────────────────────
    const downloadMatch = pathname.match(/^\/api\/submissions\/([^/]+)\/download$/)
    if (downloadMatch && method === 'GET') {
      const user = getUser(req)
      if (!user || user.role !== 'admin') return json(res, 403, { error: 'Forbidden' })
      const db  = readDb()
      const sub = db.submissions.find(s => s.id === downloadMatch[1])
      if (!sub) return json(res, 404, { error: 'Not found' })
      if (!sub.storedName) return json(res, 404, { error: 'File was not stored with this submission' })

      const filePath = path.join(UPLOADS_DIR, sub.storedName)
      if (!fs.existsSync(filePath)) return json(res, 404, { error: 'File missing from disk' })

      const stat = fs.statSync(filePath)
      res.writeHead(200, {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${sub.fileName.replace(/"/g, '')}"`,
        'Content-Length':      stat.size,
      })
      fs.createReadStream(filePath).pipe(res)
      return
    }

    // ── PATCH /api/submissions/:id/review ─────────────────────────────────────
    const reviewMatch = pathname.match(/^\/api\/submissions\/([^/]+)\/review$/)
    if (reviewMatch && method === 'PATCH') {
      const user = getUser(req)
      if (!user || user.role !== 'admin') return json(res, 403, { error: 'Forbidden' })
      const db  = readDb()
      const idx = db.submissions.findIndex(s => s.id === reviewMatch[1])
      if (idx === -1) return json(res, 404, { error: 'Not found' })
      db.submissions[idx] = { ...db.submissions[idx], status: 'reviewed', reviewedAt: new Date().toISOString() }
      writeDb(db)
      return json(res, 200, db.submissions[idx])
    }

    json(res, 404, { error: 'Not found' })

  } catch (err) {
    console.error('[server error]', err)
    json(res, 500, { error: 'Internal server error' })
  }
})

server.listen(PORT, () => {
  console.log(`✓  API server  →  http://localhost:${PORT}`)
})
