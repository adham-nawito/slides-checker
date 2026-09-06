const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, 'db.json')
const DEFAULT = { tags: [], submissions: [] }

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

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

module.exports = { readDb, writeDb }
