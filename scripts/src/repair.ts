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
import Path from '../../src/@types/Path'
import Context from '../../src/@types/Context'
import timestamp from '../../src/util/timestamp.js'
import isAttribute from '../../src/util/isAttribute.js'

const HOME_TOKEN = '__ROOT__' as ThoughtId
const HOME_PATH = [HOME_TOKEN] as Path

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

/** Returns true if the Thoughts or Path is the one of the root contexts. */
const isRoot = (thoughts: (string | ThoughtId)[]): boolean => thoughts.length === 1 && thoughts[0] === HOME_TOKEN

/**
 * Generates the context of a thought by traversing upwards to the root thought.
 */
const thoughtToContext = (thoughtId: ThoughtId): Context => {
  if (isRoot([thoughtId])) return HOME_PATH
  const thought = db.thoughtIndex[thoughtId]
  if (!thought) return []
  return thought
    ? isRoot([thought.parentId])
      ? [thought.value]
      : [...thoughtToContext(thought.parentId), thought.value]
    : HOME_PATH
}

const contextToPath = (context: Context, startid: ThoughtId = HOME_TOKEN): Path => {
  if (context.length === 0) return [] as unknown as Path
  const thought = db.thoughtIndex[startid]
  const child = Object.values(thought.children || {}).find(c => c.value === context[0])
  if (!child) return [thought.id]
  return [thought.id, ...contextToPath(context.slice(1), child.id)]
}

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
let numOrphans = 0
let numUnreachableThoughts = 0

// loop through all thoughts
Object.values(db.thoughtIndex).forEach(thought => {
  // move thoughts with missing parent into the orphanage
  // based on 6/13/22 data set, we can assume the parent is not in any inline children, so we can't reconstruct it
  const parent = db.thoughtIndex[thought.parentId]
  if (!parent && !isRoot([thought.id])) {
    // create orphanage if it doesn't exist
    if (!db.thoughtIndex.orphanage) {
      db.thoughtIndex.orphanage = {
        id: 'orphanage' as ThoughtId,
        value: 'ORPHANAGE',
        rank: Math.random(),
        children: {},
        parentId: HOME_TOKEN,
        lastUpdated: timestamp(),
        updatedBy: '',
      }
      // add orphanage to root
      db.thoughtIndex.__ROOT__.children!.orphanage = {
        ..._.omit(db.thoughtIndex.orphanage, 'children'),
        childrenMap: {},
      } as Thought
    }

    // move thought to orphanage
    const orphanage = db.thoughtIndex.orphanage
    thought.parentId = orphanage.id
    orphanage.children![thought.id] = {
      ...thought,
      childrenMap: keyValueBy(thought.children || {}, (id, child) => ({
        [isAttribute(child.value) ? child.value : id]: id as ThoughtId,
      })),
    }
    // TODO: Add Lexeme, or does it get reconstructed?

    numOrphans++
    return
  }

  // reconstruct unreachable thoughts
  // loop through all children
  const children = Object.values(thought.children || {}).map(child => {
    const childThought = db.thoughtIndex[child.id]
    // child is missing from thoughtIndex
    if (!childThought) {
      // we can reconstruct the child thought from inline children
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
      // no need to update parent's inline children, since that is what we are reconstructing from

      const numGrandchildrenIds = Object.keys(child.childrenMap || {}).length
      const numGrandchildren = Object.keys(db.thoughtIndex[child.id].children || {}).length
      numMissingGrandchildrenMissing += numGrandchildrenIds - numGrandchildren
      childrenWithMissingThoughtRepaired++
    }
    return db.thoughtIndex[child.id]
  })

  children.forEach(child => {
    // if the child has already been touched, it means that it appears in more than one thought and should be removed
    if (childrenTouched[child.id]) {
      delete thought.children![child.id]
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
      if (!thought) {
        throw new Error('Missing parent after parents should be reconstructed')
      }

      // merge duplicate children
      // const childrenByValue: Index<Thought> = {}
      // Object.values(thought.children || {}).forEach(child => {
      //   const original = childrenByValue[child.value]
      //   // if a thought with the same value already exists, move children from the duplicate into the original and delete the duplicate
      //   if (original) {
      //     // delete duplicate
      //     delete thought.children![child.id]
      //     // merge children
      //     original.childrenMap = {
      //       ...original.childrenMap,
      //       ...child.childrenMap,
      //     }
      //     // update children parentIds
      //     Object.values(child.childrenMap || {}).forEach(childId => {
      //       const childThought = db.thoughtIndex[childId]
      //       childThought.parentId = original.id
      //     })
      //     numDuplicateSiblingsMerged++
      //   } else {
      //     childrenByValue[child.value] = child
      //   }
      // })

      // return children to be added to the stack
      return Object.keys(thought.children || {}) as ThoughtId[]
    })
    .flat()
}

// second pass through thoughts
Object.values(db.thoughtIndex).forEach(thought => {
  // reconstruct unreachable thoughts
  if (!visited[thought.id]) {
    numUnreachableThoughts++
    const context = thoughtToContext(thought.id)
    // TODO: Add each thought in the context to its parent
    // add to parent's inline children

    // console.log(context)
    // const path = contextToPath(context)
    // if (context.length !== path.length) {
    //   console.log('context', context)
    //   console.log('path', path)
    //   console.error('STOP')
    //   process.exit(1)
    // }
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
      'numChildrenInMultipleThoughts',
      color(numChildrenInMultipleThoughts)(`Thoughts removed from more than one parent`),
      color(numChildrenInMultipleThoughts)(),
    ],
    [
      'numLexemeContextsInvalid',
      color(numLexemeContextsInvalid)(`Lexeme contexts with invalid values removed`),
      color(numLexemeContextsInvalid)(),
    ],
    [
      'numLexemeContextsMissing',
      color(numLexemeContextsMissing)(`Lexeme contexts removed due to missing thought`),
      color(numLexemeContextsMissing)(),
    ],
    ['numOrphans', color(numOrphans)(`Thoughts with missing parent added to orphanage`), color(numOrphans)()],
    [
      'numParentIdRepaired',
      color(numParentIdRepaired)(`Child parentId repaired to actual parent thought`),
      color(numParentIdRepaired)(),
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

// console.info('\nWrite disabled')
fs.writeFileSync(file, JSON.stringify(db, null, 2))
