const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const normalizeThought = require('./lib/normalizeThought')
const getChildrenById = require('./lib/getChildrenById')

/** Generates an object from an array or object. Simpler than reduce or _.transform. The KeyValueGenerator passes (key, value) if the input is an object, and (value, i) if it is an array. The return object from each iteration is merged into the accumulated object. Return null to skip an item. */
function keyValueBy(input, keyValue, accum = {}) {
  const isArray = Array.isArray(input)
  // considerably faster than Array.prototype.reduce
  Object.entries(input || {}).forEach(([key, value], i) => {
    const o = isArray ? keyValue(value, i, accum) : keyValue(key, value, accum)
    Object.entries(o || {}).forEach(entry => {
      accum[entry[0]] = entry[1]
    })
  })

  return accum
}

const [, , file, ...context] = process.argv
if (!file) {
  console.error('Usage: node [SCRIPT] thoughtIndex.json')
  process.exit(1)
}

const db = JSON.parse(fs.readFileSync(file, 'utf8'))

const thoughtIndexNew = {}

// convert childrenMap to children
Object.entries(db.thoughtIndex).forEach(([id, thought]) => {
  const children = getChildrenById({ thoughtIndex: db.thoughtIndex }, thought.id)
  thoughtIndexNew[id] = {
    ..._.omit(thought, 'childrenMap'),
    ...(children.length > 0
      ? {
          children: keyValueBy(children, thought => ({
            [thought.id]: thought,
          })),
        }
      : null),
  }
})

db.thoughtIndex = thoughtIndexNew
db.schemaVersion = 7

fs.writeFileSync(file, JSON.stringify(db, null, 2))
