/** Finds thought's children with parentId that do not match thought.id and repairs it. Also removes children that do not have a corresponding entry in thoughtIndex. */

import _ from 'lodash'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import keyValueBy from '../../src/util/keyValueBy.js'
import normalizeThought from '../lib/normalizeThought.js'
import Database from './types/Database.js'
import Index from '../../src/@types/IndexType'
import Thought from '../../src/@types/Thought'
import ThoughtWithChildren from '../../src/@types/ThoughtWithChildren'
import Lexeme from '../../src/@types/Lexeme'
import migrate from './migrate.js'
import ThoughtId from '../../src/@types/ThoughtId'

const HOME_TOKEN = '__ROOT__' as ThoughtId

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

let childrenWithMissingThoughtRepaired = 0
let childrenWithMissingThoughtGrandchildrenMissing = 0
let numParentIdRepaired = 0
let numDuplicates = 0
let numLexemeContextsMissing = 0
let numLexemeContextsInvalid = 0
let numUnreachableThoughts = 0

Object.values(db.thoughtIndex).forEach(thought => {
  const children = Object.values(thought.children || {})
    .map(child => {
      const childThought = db.thoughtIndex[child.id]
      // child is missing from thoughtIndex
      if (!childThought) {
        // we can reconstruct the child from inline children
        // we may not be able to reconstruct the grandchildren unfortunately since we only have ids in childrenMap
        // however we can still use childrenMap to try to look up the grandchildren in thoughtIndex
        db.thoughtIndex[child.id] = {
          ..._.omit(child, 'childrenMap'),
          children: keyValueBy(child.childrenMap, (key, id) =>
            db.thoughtIndex[id]
              ? {
                  [id]: db.thoughtIndex[id],
                }
              : null,
          ),
        } as ThoughtWithChildren

        const numGrandchildrenIds = Object.keys(child.childrenMap).length
        const numGrandchildren = Object.keys(db.thoughtIndex[child.id].children || {}).length
        childrenWithMissingThoughtGrandchildrenMissing += numGrandchildrenIds - numGrandchildren
        childrenWithMissingThoughtRepaired++
      }
      return db.thoughtIndex[child.id]
    })
    .filter(x => x)

  // remove children which do not have a corresponding entry in thoughtIndex
  if (children.length < Object.keys(thought.children || {}).length) {
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

// traverse the tree
const visited: Index<true> = {}
let stack: ThoughtId[] = [HOME_TOKEN]
while (stack.length > 0) {
  stack = stack
    .map(id => {
      visited[id] = true
      const thought = db.thoughtIndex[id]
      if (!thought) return []
      return (Object.keys(thought.children || {}) || []) as ThoughtId[]
    })
    .flat()
}

// reconstruct unreachable thoughts
Object.keys(db.thoughtIndex).forEach(id => {
  if (!visited[id]) {
    numUnreachableThoughts++
  }
})

/** Returns a chalk color function that reflects the sevity of the dataintegrity issue for the given metric. */
const color = (n: number) => chalk[n === 0 ? 'green' : n < 1000 ? 'yellow' : 'red']

console.info(
  color(childrenWithMissingThoughtRepaired)(
    `Children missing from thoughtIndex repaired: ${childrenWithMissingThoughtRepaired}`,
  ),
)
console.info(
  color(childrenWithMissingThoughtGrandchildrenMissing)(
    `Missing grandchildren from repaired children: ${childrenWithMissingThoughtGrandchildrenMissing}`,
  ),
)
console.info(color(numParentIdRepaired)(`Child parentId repaired to actual parent thought: ${numParentIdRepaired}`))
console.info(color(numDuplicates)(`Thoughts removed from more than one parent: ${numDuplicates}`))
console.info(
  color(numLexemeContextsMissing)(`Lexeme contexts removed due to missing thought: ${numLexemeContextsMissing}`),
)
console.info(
  color(numLexemeContextsInvalid)(`Lexeme contexts with invalid values removed: ${numLexemeContextsInvalid}`),
)
console.info(color(numUnreachableThoughts)(`Unreachable thoughts: ${numUnreachableThoughts}`))

fs.writeFileSync(file, JSON.stringify(db, null, 2))
