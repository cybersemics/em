import fs from 'fs'
import path from 'path'

/** Splits the thoughtIndex and lexemeIndex of a large db into two minified files. */
const file = process.argv[2]
if (!file) {
  console.error('Usage: node split-db.js db.json')
  process.exit(1)
}

const thoughts = JSON.parse(fs.readFileSync(file, 'utf8'))
const base = path.basename(file).slice(0, -5)
fs.writeFileSync(`${path.dirname(file)}/${base}-thoughtIndex.json`, JSON.stringify(thoughts.thoughtIndex))
fs.writeFileSync(`${path.dirname(file)}/${base}-lexemeIndex.json`, JSON.stringify(thoughts.lexemeIndex))
