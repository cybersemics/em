/** Finds thought's children with parentId that do not match thought.id and repairs it. Also removes children that do not have a corresponding entry in thoughtIndex. */

import fs from 'fs'
import path from 'path'
import normalizeThought from '../lib/normalizeThought.js'
import Index from '../../src/@types/IndexType'
import Thought from '../../src/@types/Thought'
import ThoughtId from '../../src/@types/ThoughtId'
import ThoughtWithChildren from '../../src/@types/ThoughtWithChildren'
import Lexeme from '../../src/@types/Lexeme'
import migrate from './migrate.js'

interface Database {
  thoughtIndex: Index<ThoughtWithChildren>
  lexemeIndex: Index<Lexeme>
  schemaVersion: number
}

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
let numRepaired = 0
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
    thought.children = filterChildrenBy(thought.children, child => !!db.thoughtIndex[child.id])
  }

  children.forEach(child => {
    // if the child has already been touched, it means that it appears in more than one thought and should be removed
    if (child.id in childrenTouched) {
      thought.children = filterChildrenBy(thought.children, c => c.id !== child.id)
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
