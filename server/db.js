const fs   = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, 'db.json')
const DEFAULT = { tags: [], submissions: [] }

// ─── Read (no lock needed — reads are safe to run concurrently) ───────────────

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT, null, 2))
      return JSON.parse(JSON.stringify(DEFAULT))
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT))
  }
}

// ─── Write mutex ──────────────────────────────────────────────────────────────
// All read-modify-write operations must go through withDb(fn).
// fn receives the current db object, mutates it, and the result is written back.
// Calls are serialized via a promise chain so concurrent requests never clobber
// each other even though Node.js is single-threaded but async.

let _lock = Promise.resolve()

function withDb(fn) {
  const result = _lock.then(() => {
    const db  = readDb()
    const ret = fn(db)           // fn mutates db in-place and may return a value
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
    return ret
  })
  // Attach to chain even if the caller ignores the returned promise,
  // so a crash in one fn doesn't break the queue for subsequent callers.
  _lock = result.catch(() => {})
  return result
}

// ─── Legacy helper (kept for read-only call sites) ────────────────────────────
// Avoid using writeDb directly for mutation — prefer withDb.
function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

module.exports = { readDb, writeDb, withDb }
