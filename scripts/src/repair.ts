/** Finds thought's children with parentId that do not match thought.id and repairs it. Also removes children that do not have a corresponding entry in thoughtIndex. */

import fs from 'fs'
import path from 'path'
import normalizeThought from '../lib/normalizeThought.js'
import Index from '../../src/@types/IndexType'
import ThoughtId from '../../src/@types/ThoughtId'
import Thought from '../../src/@types/Thought'
import Lexeme from '../../src/@types/Lexeme'

interface Database {
  thoughtIndex: Index<Thought>
  lexemeIndex: Index<Lexeme>
  schemaVersion: number
}

const [, , file] = process.argv
if (!file) {
  console.error('Usage: npm run repair -- db.json')
  process.exit(1)
}

const filterChildrenMapBy = (childrenMap: Index<ThoughtId>, predicate: (id: ThoughtId) => boolean) =>
  Object.entries(childrenMap || {}).reduce(
    (accum, [key, id]) => ({
      ...accum,
      ...(predicate(id) ? { [key]: id } : null),
    }),
    {},
  )

const db: Database = JSON.parse(fs.readFileSync(file, 'utf8'))

if (db.schemaVersion !== 6) {
  const schemaDetect = db.schemaVersion
    ? `Database has schema v${db.schemaVersion}.`
    : 'Database is missing schemaVersion property.'
  console.error(`${schemaDetect} This script only works on schema v6.`)
  process.exit(1)
}

// track children to eliminate duplicates
let childrenTouched: Index<true> = {}

let childThoughtsMissing = 0
let numRepaired = 0
let numDuplicates = 0
let numLexemeContextsMissing = 0
let numLexemeContextsInvalid = 0

Object.values(db.thoughtIndex).forEach(thought => {
  const children = Object.values(thought.childrenMap || {})
    .map(id => db.thoughtIndex[id])
    .filter(x => x)

  // remove children which do not have a corresponding entry in thoughtIndex
  if (children.length < Object.keys(thought.childrenMap || {}).length) {
    childThoughtsMissing += Object.keys(thought.childrenMap || {}).length - children.length
    thought.childrenMap = filterChildrenMapBy(thought.childrenMap, id => !!db.thoughtIndex[id])
  }

  children.forEach(child => {
    // if the child has already been touched, it means that it appears in more than one thought and should be removed
    if (child.id in childrenTouched) {
      thought.childrenMap = filterChildrenMapBy(thought.childrenMap, id => id !== child.id)
      numDuplicates++
    }
    // repair child.parentId
    else if (child.parentId !== thought.id) {
      child.parentId = thought.id
      numRepaired++
    }
    childrenTouched[child.id] = true
  })
})

// validate Lexeme contexts
Object.values(db.lexemeIndex).forEach(lexeme => {
  if (!lexeme.contexts) return
  lexeme.contexts.forEach(id => {
    const thought = db.thoughtIndex[id]

    // remove contexts with missing thought
    if (!thought) {
      lexeme.contexts = lexeme.contexts.filter(_id => _id !== id)
      numLexemeContextsMissing++
      return
    }

    // remove contexts with value that no longer matches Lexeme value
    if (normalizeThought(thought.value) !== normalizeThought(lexeme.value)) {
      lexeme.contexts = lexeme.contexts.filter(_id => _id !== id)
      numLexemeContextsInvalid++
      return
    }
  })
})

console.info(`Missing child thoughts: ${childThoughtsMissing}`)
console.info(`Repaired thoughts: ${numRepaired}`)
console.info(`Thoughts in more than one parent: ${numDuplicates}`)
console.info(`Lexeme contexts removed due to missing thought: ${numLexemeContextsMissing}`)
console.info(`Lexeme contexts with invalid values removed: ${numLexemeContextsInvalid}`)

fs.writeFileSync(file, JSON.stringify(db, null, 2))
