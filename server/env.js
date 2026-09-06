/**
 * Minimal .env loader — no npm dependencies.
 * Reads <project-root>/.env and populates process.env for any key not already set.
 * Call require('./env') at the top of server/index.js before anything else.
 */
const fs   = require('fs')
const path = require('path')

const ENV_PATH = path.join(__dirname, '..', '.env')

if (fs.existsSync(ENV_PATH)) {
  const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    // Never overwrite variables already set in the real environment
    if (key && !(key in process.env)) process.env[key] = val
  }
}
