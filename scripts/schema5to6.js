const fs = require('fs')
const path = require('path')

/** Splits the thoughtIndex and lexemeIndex of a large db into two files. */
const file = process.argv[2]
if (!file) {
  console.error('Usage: node split-db.js db.json')
  process.exit(1)
}

const isAttribute = value => value.startsWith('=')

const thoughts = JSON.parse(fs.readFileSync(file, 'utf8'))
Object.values(thoughts.thoughtIndex).forEach(thought => {
  thought.childrenMap = thought.children.reduce((accum, childId) => {
    const child = thoughts.thoughtIndex[childId]
    if (!child) {
      throw new Error('Missing child with id ' + childId)
    }
    // Firebase keys cannot contain [.$#[\]] or ASCII control characters 0-31 or 127
    // https://firebase.google.com/docs/database/web/structure-data?authuser=1&hl=en#section-limitations
    const value = child.value.replace(/[.$#[\]]/g, '-')
    const key = isAttribute(value) && !accum[value] ? value : child.id
    if (!key) {
      console.error('child', child)
      throw new Error(`Invalid key "${key}" for ${child.id}.`)
    }
    return {
      ...accum,
      // if there is a duplicate child attribute, key it by its id so that it is not overwritten
      [key]: child.id,
    }
  }, {})
  delete thought.children
})

const base = path.basename(file).slice(0, -5)
fs.writeFileSync(`${path.dirname(file)}/${base}-v6.json`, JSON.stringify(thoughts, null, 2))
