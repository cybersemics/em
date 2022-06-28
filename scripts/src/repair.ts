/** Finds thought's children with parentId that do not match thought.id and repairs it. Also removes children that do not have a corresponding entry in thoughtIndex. */

import _ from 'lodash'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import Table from 'cli-table'
import keyValueBy from '../../src/util/keyValueBy.js'
import hashThought from '../lib/hashThought.js'
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
    : [HOME_TOKEN]
}

const thoughtToPath = (thoughtId: ThoughtId): Path => {
  if (isRoot([thoughtId])) return HOME_PATH
  const thought = db.thoughtIndex[thoughtId]
  if (!thought) return [] as unknown as Path
  return thought
    ? isRoot([thought.parentId])
      ? [thought.id]
      : ([...thoughtToContext(thought.parentId), thought.id] as unknown as Path)
    : HOME_PATH
}

/** Moves a thought to a new parent. */
const moveThought = (thought: ThoughtWithChildren, parentId: ThoughtId) => {
  // remove thought from old parent (if the parent exists)
  const parentOld = db.thoughtIndex[thought.parentId]
  if (parentOld?.children) {
    delete parentOld.children[thought.id]
  }

  const parent = db.thoughtIndex[parentId]
  if (!parent) {
    console.error('thought', thought)
    console.error('parentId', parentId)
    throw new Error(`Cannot move thought to non-existent Parent: ${parentId}`)
  }

  // set thought's parent
  thought.parentId = parentId

  // add thought to parent's inline children
  if (!parent.children) {
    parent.children = {}
  }
  // convert thought to inline child
  const child: Thought = {
    ...thought,
    childrenMap: keyValueBy(thought.children || {}, (id, child) => ({
      [isAttribute(child.value) ? child.value : id]: id as ThoughtId,
    })),
  }
  parent.children[thought.id] = child
}

const moveThoughtToOrphanage = (thought: ThoughtWithChildren) => {
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
    }
  }

  moveThought(thought, 'orphanage' as ThoughtId)
}

console.info('Reading db')
const dbRaw: Database = JSON.parse(fs.readFileSync(file, 'utf8'))
const db = migrate(dbRaw)
const numThoughtsStart = Object.keys(db.thoughtIndex).length
const numLexemesStart = Object.keys(db.lexemeIndex).length

// track children to eliminate duplicates
let childrenTouched: Index<true> = {}

let childrenInMultipleThoughts = 0
let childrenWithMissingThoughtRepaired = 0
let duplicateSiblingsMerged = 0
let lexemeContextsInvalid = 0
let lexemeContextsMissing = 0
let missingGrandchildrenMissing = 0
let numOrphans = 0
let parentIdRepaired = 0
let thoughtMissingFromChildren = 0
let unreachableThoughts = 0

console.info('Iterating thoughtIndex')

// loop through all thoughts
Object.values(db.thoughtIndex).forEach(thought => {
  // move thoughts with missing parent into the orphanage
  // based on 6/13/22 data set, we can assume the parent is not in any inline children, so we can't reconstruct it
  const parent = db.thoughtIndex[thought.parentId]
  if (!parent && !isRoot([thought.id])) {
    moveThoughtToOrphanage(thought as ThoughtWithChildren)
    numOrphans++
    return
  }

  // reconstruct thoughts missing from parent's inline children
  if (parent && !parent.children?.[thought.id]) {
    if (!parent.children) {
      parent.children = {}
    }
    // convert thought to inline child
    const child: Thought = {
      ...thought,
      childrenMap: keyValueBy(thought.children || {}, (id, child) => ({
        [isAttribute(child.value) ? child.value : id]: id as ThoughtId,
      })),
    }
    parent.children[thought.id] = child
    thoughtMissingFromChildren++
  }

  // reconstruct children missing from thoughtIndex
  // loop through all children
  const children = Object.values(thought.children || {}).map(child => {
    const childThought = db.thoughtIndex[child.id]
    // child is missing from thoughtIndex
    if (!childThought) {
      // we can reconstruct the child thought from inline children
      // we may not be able to reconstruct the grandchildren unfortunately since we only have ids in childrenMap
      // however we can still use childrenMap to try to look up the grandchildren in thoughtIndex
      db.thoughtIndex[child.id] = {
        // convert childrenMap to children for thought
        ..._.omit(child, 'childrenMap'),
        children: keyValueBy(child.childrenMap, (key, childId) =>
          db.thoughtIndex[childId]
            ? {
                [childId]: {
                  // convert children to childrenMap for inline child
                  ..._.omit(db.thoughtIndex[childId], 'children'),
                  childrenMap: keyValueBy(thought.children || {}, (grandChildId, child) => ({
                    [isAttribute(child.value) ? child.value : grandChildId]: grandChildId as ThoughtId,
                  })),
                } as Thought,
              }
            : null,
        ),
      } as ThoughtWithChildren
      // no need to update parent's inline children, since that is what we are reconstructing from

      const numGrandchildrenIds = Object.keys(child.childrenMap || {}).length
      const numGrandchildren = Object.keys(db.thoughtIndex[child.id].children || {}).length
      missingGrandchildrenMissing += numGrandchildrenIds - numGrandchildren
      childrenWithMissingThoughtRepaired++
    }
    return db.thoughtIndex[child.id]
  })

  children.forEach(child => {
    // if the child has already been touched, it means that it appears in more than one thought and should be removed
    if (childrenTouched[child.id]) {
      delete thought.children![child.id]
      childrenInMultipleThoughts++
    }
    // repair child.parentId
    else if (child.parentId !== thought.id) {
      child.parentId = thought.id
      parentIdRepaired++
    }
    childrenTouched[child.id] = true
  })
})

console.info('Merging duplicate siblings')

// traverse the tree and merge duplicate siblings
let stack: ThoughtId[] = [HOME_TOKEN]
while (stack.length > 0) {
  stack = stack
    .map(id => {
      const thought = db.thoughtIndex[id]
      if (!thought) {
        throw new Error('Missing parent after parents should be reconstructed')
      }

      // merge duplicate children
      // create an index for O(1) lookup of a child by value
      const childrenByValue: Index<Thought> = {}
      Object.values(thought.children || {}).forEach(child => {
        const existingChild = childrenByValue[child.value]
        // if a thought with the same value already exists, move children from the into the original and delete originalChild
        if (existingChild) {
          const duplicateChild = child // for better readability
          const duplicateThought = db.thoughtIndex[child.id]
          const existingThought = db.thoughtIndex[existingChild.id]

          // delete duplicate child and keep existing child
          delete db.thoughtIndex[duplicateChild.id]
          delete thought.children![duplicateChild.id]

          // move children to existing thought
          // duplicate children will be merged in the next iteration
          existingThought.children = {
            ...existingThought.children,
            ...duplicateThought.children,
          }

          existingChild.childrenMap = {
            ...existingChild.childrenMap,
            ...duplicateChild.childrenMap,
          }

          // update children parentIds
          Object.values(duplicateChild.childrenMap || {}).forEach(childId => {
            const childThought = db.thoughtIndex[childId]
            childThought.parentId = existingChild.id
          })

          // update Lexeme contexts
          const lexemeKey = hashThought(duplicateThought.value)
          const lexeme = db.lexemeIndex[lexemeKey]
          // if Lexeme is missing, it will be reconstructed in the next step
          if (lexeme) {
            lexeme.contexts = lexeme.contexts.filter(cx => cx !== duplicateThought.id)
          }

          duplicateSiblingsMerged++
        } else {
          childrenByValue[child.value] = child
        }
      })

      // return children to be added to the stack
      return Object.keys(thought.children || {}) as ThoughtId[]
    })
    .flat()
}

console.info('Marking reachable thoughts')

// traverse the tree and repair unreachable thoughts
const visited: Index<true> = {}
stack = [HOME_TOKEN]
while (stack.length > 0) {
  stack = stack
    .map(id => {
      visited[id] = true

      const thought = db.thoughtIndex[id]
      if (!thought) {
        throw new Error('Missing parent after parents should be reconstructed')
      }

      // return children to be added to the stack
      return Object.keys(thought.children || {}) as ThoughtId[]
    })
    .flat()
}

console.info('Repairing unreachable thoughts')

// second pass through thoughts to repair unreachable
Object.values(db.thoughtIndex).forEach(thought => {
  // reconstruct unreachable thoughts
  if (!visited[thought.id]) {
    const path = thoughtToPath(thought.id)
    const oldestThought = db.thoughtIndex[path[0]]

    // if (oldestThought?.parentId === HOME_TOKEN) {
    //   const context = thoughtToContext(thought.id)
    //   console.error('context', context)
    //   console.error('path', path)
    //   throw new Error(
    //     'NOT IMPLEMENTED: Orphaned Path does not start at ROOT. You probably want to verify the ancestor links and move the whole subtree to the orphanage.',
    //   )
    // }

    unreachableThoughts++
  }
})

console.info('Validating Lexemes')

// validate Lexeme contexts
Object.values(db.lexemeIndex).forEach((lexeme: Lexeme) => {
  if (!lexeme.contexts) return
  lexeme.contexts.forEach(cxid => {
    const thought = db.thoughtIndex[cxid]

    // remove contexts with missing thought
    if (!thought) {
      lexeme.contexts = lexeme.contexts!.filter((id: ThoughtId) => id !== cxid)
      lexemeContextsMissing++
      return
    }

    // remove contexts with value that no longer matches Lexeme value
    if (normalizeThought(thought.value) !== normalizeThought(lexeme.value)) {
      lexeme.contexts = lexeme.contexts!.filter((id: ThoughtId) => id !== cxid)
      lexemeContextsInvalid++
      return
    }
  })
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
      'childrenInMultipleThoughts',
      color(childrenInMultipleThoughts)(`Thoughts removed from more than one parent`),
      color(childrenInMultipleThoughts)(),
    ],
    [
      'duplicateSiblingsMerged',
      color(duplicateSiblingsMerged)(`Duplicate siblings merged`),
      color(duplicateSiblingsMerged)(),
    ],
    [
      'lexemeContextsInvalid',
      color(lexemeContextsInvalid)(`Lexeme contexts with invalid values removed`),
      color(lexemeContextsInvalid)(),
    ],
    [
      'lexemeContextsMissing',
      color(lexemeContextsMissing)(`Lexeme contexts removed due to missing thought`),
      color(lexemeContextsMissing)(),
    ],
    [
      'missingGrandchildrenMissing',
      color(missingGrandchildrenMissing)(`Missing grandchildren from repaired children`),
      color(missingGrandchildrenMissing)(),
    ],
    ['numOrphans', color(numOrphans)(`Thoughts with missing parent added to orphanage`), color(numOrphans)()],
    [
      'parentIdRepaired',
      color(parentIdRepaired)(`Child parentId repaired to actual parent thought`),
      color(parentIdRepaired)(),
    ],
    ['unreachableThoughts', color(unreachableThoughts)(`Unreachable thoughts`), color(unreachableThoughts)()],
    [
      'thoughtMissingFromChildren',
      color(thoughtMissingFromChildren)(`Thoughts missing from parent's inline children repaired`),
      color(thoughtMissingFromChildren)(),
    ],
  ],
} as any)

console.info('\n' + table.toString())

// console.info('\nWrite disabled')
console.info('\nWriting db')
fs.writeFileSync(file, JSON.stringify(db, null, 2))
