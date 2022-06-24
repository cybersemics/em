/** Finds thought's children with parentId that do not match thought.id and repairs it. Also removes children that do not have a corresponding entry in thoughtIndex. */

import _ from 'lodash'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import Table from 'cli-table'
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
const numThoughtsStart = Object.keys(db.thoughtIndex).length
const numLexemesStart = Object.keys(db.lexemeIndex).length

// track children to eliminate duplicates
let childrenTouched: Index<true> = {}

let childrenWithMissingThoughtRepaired = 0
let numMissingGrandchildrenMissing = 0
let numParentIdRepaired = 0
let numChildrenInMultipleThoughts = 0
let numDuplicateSiblingsMerged = 0
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

        const numGrandchildrenIds = Object.keys(child.childrenMap || {}).length
        const numGrandchildren = Object.keys(db.thoughtIndex[child.id].children || {}).length
        numMissingGrandchildrenMissing += numGrandchildrenIds - numGrandchildren
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
      numChildrenInMultipleThoughts++
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
Object.values(db.lexemeIndex).forEach((lexeme: Lexeme) => {
  if (!lexeme.contexts) return
  lexeme.contexts.forEach(cxid => {
    const thought = db.thoughtIndex[cxid]

    // remove contexts with missing thought
    if (!thought) {
      lexeme.contexts = lexeme.contexts!.filter((id: ThoughtId) => id !== cxid)
      numLexemeContextsMissing++
      return
    }

    // remove contexts with value that no longer matches Lexeme value
    if (normalizeThought(thought.value) !== normalizeThought(lexeme.value)) {
      lexeme.contexts = lexeme.contexts!.filter((id: ThoughtId) => id !== cxid)
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
      // mark visited to detect unreachable thoughts
      visited[id] = true

      const thought = db.thoughtIndex[id]
      if (!thought) return []

      // merge duplicate children
      const childrenByValue: Index<Thought> = {}
      Object.values(thought.children || {}).forEach(child => {
        const original = childrenByValue[child.value]
        // if a thought with the same value already exists, move children from the duplicate into the original and delete the duplicate
        if (original) {
          // delete duplicate
          delete thought.children![child.id]
          // merge children
          original.childrenMap = {
            ...original.childrenMap,
            ...child.childrenMap,
          }
          // update children parentIds
          Object.values(child.childrenMap || {}).forEach(childId => {
            const childThought = db.thoughtIndex[childId]
            childThought.parentId = original.id
          })
          numDuplicateSiblingsMerged++
        } else {
          childrenByValue[child.value] = child
        }
      })

      // return children to be added to the stack
      return Object.keys(thought.children || {}) as ThoughtId[]
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
const color = (n: number) => (s?: string) => chalk[n === 0 ? 'green' : n < 1000 ? 'yellow' : 'red'](s || n)

const table = new Table({
  chars: {
    top: '',
    'top-mid': '',
    'top-left': '',
    'top-right': '',
    bottom: '',
    'bottom-mid': '',
    'bottom-left': '',
    'bottom-right': '',
    left: '',
    'left-mid': '',
    mid: '',
    'mid-mid': '',
    right: '',
    'right-mid': '',
    middle: '',
  },
  colAligns: ['right', 'left'],
  rows: [
    ['Total Thoughts (before)', 'Total number of thoughts before any repairs', numThoughtsStart],
    ['Total Thoughts (after)', 'Total number of thoughts after repairs', Object.keys(db.thoughtIndex).length],
    ['Total Lexemes (before)', 'Total number of lexemes before any repairs', numLexemesStart],
    ['Total Lexemes (after)', 'Total number of lexemes after repairs', Object.keys(db.lexemeIndex).length],
    [],
    [
      'childrenWithMissingThoughtRepaired',
      color(childrenWithMissingThoughtRepaired)(`Children missing from thoughtIndex repaired`),
      color(childrenWithMissingThoughtRepaired)(),
    ],
    [
      'numMissingGrandchildrenMissing',
      color(numMissingGrandchildrenMissing)(`Missing grandchildren from repaired children`),
      color(numMissingGrandchildrenMissing)(),
    ],
    [
      'numParentIdRepaired',
      color(numParentIdRepaired)(`Child parentId repaired to actual parent thought`),
      color(numParentIdRepaired)(),
    ],
    [
      'numChildrenInMultipleThoughts',
      color(numChildrenInMultipleThoughts)(`Thoughts removed from more than one parent`),
      color(numChildrenInMultipleThoughts)(),
    ],
    [
      'numLexemeContextsMissing',
      color(numLexemeContextsMissing)(`Lexeme contexts removed due to missing thought`),
      color(numLexemeContextsMissing)(),
    ],
    [
      'numLexemeContextsInvalid',
      color(numLexemeContextsInvalid)(`Lexeme contexts with invalid values removed`),
      color(numLexemeContextsInvalid)(),
    ],
    ['numUnreachableThoughts', color(numUnreachableThoughts)(`Unreachable thoughts`), color(numUnreachableThoughts)()],
    [
      'numDuplicateSiblingsMerged',
      color(numDuplicateSiblingsMerged)(`Duplicate siblings merged`),
      color(numDuplicateSiblingsMerged)(),
    ],
  ],
} as any)

console.info(table.toString())

fs.writeFileSync(file, JSON.stringify(db, null, 2))
