/** Finds thought's children with parentId that do not match thought.id and repairs it. Also removes children that do not have a corresponding entry in thoughtIndex. */

import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import keyValueBy from '../../src/util/keyValueBy.js'
import normalizeThought from '../lib/normalizeThought.js'
import Database from './types/Database.js'
import Index from '../../src/@types/IndexType'
import Thought from '../../src/@types/Thought'
import Lexeme from '../../src/@types/Lexeme'
import migrate from './migrate.js'

const [, , file] = process.argv
if (!file) {
  console.error('Usage: npm run repair -- db.json')
  process.exit(1)
}

const filterChildrenBy = (children: Index<Thought>, predicate: (thought: Thought) => boolean) =>
  Object.entries(children || {}).reduce(
    (accum, [key, id]) => ({
      ...accum,
      ...(predicate(id) ? { [key]: id } : null),
    }),
    {},
  )

const dbRaw: Database = JSON.parse(fs.readFileSync(file, 'utf8'))
const db = migrate(dbRaw)

// track children to eliminate duplicates
let childrenTouched: Index<true> = {}

let childThoughtsMissing = 0
let numParentIdRepaired = 0
let numDuplicates = 0
let numLexemeContextsMissing = 0
let numLexemeContextsInvalid = 0

Object.values(db.thoughtIndex).forEach(thought => {
  const children = Object.values(thought.children || {})
    .map(child => db.thoughtIndex[child.id])
    .filter(x => x)

  // remove children which do not have a corresponding entry in thoughtIndex
  if (children.length < Object.keys(thought.children || {}).length) {
    childThoughtsMissing += Object.keys(thought.children || {}).length - children.length
    thought.children = filterChildrenBy(thought.children || {}, child => !!db.thoughtIndex[child.id])
  }

  children.forEach(child => {
    // if the child has already been touched, it means that it appears in more than one thought and should be removed
    if (child.id in childrenTouched) {
      thought.children = filterChildrenBy(thought.children || {}, c => c.id !== child.id)
      numDuplicates++
    }
    // repair child.parentId
    else if (child.parentId !== thought.id) {
      child.parentId = thought.id
      numParentIdRepaired++
    }
    childrenTouched[child.id] = true
  })
})

// validate Lexeme contexts
Object.values(db.lexemeIndex).forEach(lexeme => {
  if (!lexeme.contexts) return
  Object.values(lexeme.contexts).forEach(id => {
    const thought = db.thoughtIndex[id]

    // remove contexts with missing thought
    if (!thought) {
      lexeme.contexts = keyValueBy(lexeme.contexts!, (i, _id) => (_id !== id ? { [i]: _id } : null))
      numLexemeContextsMissing++
      return
    }

    // remove contexts with value that no longer matches Lexeme value
    if (normalizeThought(thought.value) !== normalizeThought(lexeme.value)) {
      lexeme.contexts = keyValueBy(lexeme.contexts!, (i, _id) => (_id !== id ? { [id]: _id } : null))
      numLexemeContextsInvalid++
      return
    }
  })
})

/** Returns a chalk color function that reflects the sevity of the dataintegrity issue for the given metric. */
const color = (n: number) => chalk[n === 0 ? 'green' : n < 1000 ? 'yellow' : 'red']

console.info(color(childThoughtsMissing)(`✓ Children missing from thoughtIndex removed: ${childThoughtsMissing}`))
console.info(color(numParentIdRepaired)(`✓ Child parentId repaired to actual parent thought: ${numParentIdRepaired}`))
console.info(color(numDuplicates)(`✓ Thoughts removed from more than one parent: ${numDuplicates}`))
console.info(
  color(numLexemeContextsMissing)(`✓ Lexeme contexts removed due to missing thought: ${numLexemeContextsMissing}`),
)
console.info(
  color(numLexemeContextsInvalid)(`✓ Lexeme contexts with invalid values removed: ${numLexemeContextsInvalid}`),
)

fs.writeFileSync(file, JSON.stringify(db, null, 2))
