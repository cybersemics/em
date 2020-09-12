import Dexie from 'dexie'
import _ from 'lodash'
import { hashContext, hashThought, mergeThoughts, never, pathToContext, timestamp, unroot } from '../util'
import { EM_TOKEN } from '../constants'

// TODO: Why doesn't this work? Fix IndexedDB during tests.
// mock IndexedDB if tests are running
// NOTE: Could not get this to work in setupTests.js
// See: https://github.com/cybersemics/em/issues/664#issuecomment-629691193

/** Returns true if the app is running as a test. */
const isTest = () => process.env.NODE_ENV === 'test'

if (isTest()) {
  Dexie.dependencies.indexedDB = require('fake-indexeddb')
  Dexie.dependencies.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange')
}

const db = new Dexie('EM')

// hash the EM context once on load
const emContextEncoded = hashContext([EM_TOKEN])

/** Initializes the EM record where helpers are stored. */
const initHelpers = async () => {
  const staticHelpersExist = await db.helpers.get({ id: 'EM' })
  if (!staticHelpersExist) {
    await db.helpers.add({ id: 'EM' })
  }
}

/** Initializes the database tables. */
const initDB = async () => {

  // clear database if already open
  if (db.isOpen()) {
    await clearAll()
  }
  else {
    await db.version(1).stores({
      thoughtIndex: 'id, value, *contexts, created, lastUpdated',
      contextIndex: 'id, *children, lastUpdated',
      helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion',
      logs: '++id, created, message, stack',
    })
  }

  await initHelpers()
}

/** Clears all thoughts and contexts from the indices. */
export const clearAll = () => Promise.all([
  db.thoughtIndex.clear(),
  db.contextIndex.clear(),
  db.helpers.clear()
])

/** Updates a single thought in the thoughtIndex. */
export const updateThought = async (id, thought) => db.thoughtIndex.put({ id, ...thought })

/** Updates multiple thoughts in the thoughtIndex. */
export const updateThoughtIndex = async thoughtIndexMap => {
  const thoughtsArray = Object.keys(thoughtIndexMap).map(key => ({ ...thoughtIndexMap[key], id: key }))
  return db.thoughtIndex.bulkPut(thoughtsArray)
}

/** Deletes a single thought from the thoughtIndex. */
export const deleteThought = async id => db.thoughtIndex.delete(id)

/** Gets a single thought from the thoughtIndex by its id. */
export const getThoughtById = async id => db.thoughtIndex.get(id)

/** Gets multiple thoughts from the thoughtIndex by ids. */
export const getThoughtsByIds = async ids =>
  db.thoughtIndex.where('id').anyOf(ids).toArray()

/** Gets a single thought from the thoughtIndex by its value. */
export const getThought = async value => db.thoughtIndex.get({ id: hashThought(value) })

/** Gets the entire thoughtIndex. */
export const getThoughtIndex = async () => {
  const thoughtIndexMap = await db.thoughtIndex.toArray()
  return _.keyBy(thoughtIndexMap, 'id')
}

/** Updates a single thought in the contextIndex. Ignores parentEntry.pending. */
export const updateContext = async (id, { children, lastUpdated }) => db.contextIndex.put({ id, children, lastUpdated })

/** Updates multiple thoughts in the contextIndex. */
export const updateContextIndex = async contextIndexMap => {
  const contextsArray = Object.keys(contextIndexMap).map(key => ({ id: key, ...contextIndexMap[key] }))
  return db.contextIndex.bulkPut(contextsArray)
}

/** Deletes a single thought from the contextIndex. */
export const deleteContext = async id => db.contextIndex.delete(id)

/** Gets the Parent for a context. */
export const getContext = async context => db.contextIndex.get({ id: hashContext(context) })

/** Gets multiple contexts from the contextIndex by ids. */
export const getContextsByIds = async ids =>
  db.contextIndex.where('id').anyOf(ids).toArray()

/**
 * Builds a thoughtIndex and contextIndex for all descendants.
 *
 * @param context
 * @param children
 * @param maxDepth    The maximum number of levels to traverse. When reached, adds pending: true to the returned ParentEntry. Ignored for EM context. Default: 100.
 */
export const getDescendantThoughts = async (context, { maxDepth = 100, parentEntry } = {}) => {

  const contextEncoded = hashContext(context)

  // fetch individual parentEntry in initial call
  // recursive calls on children will pass the parentEntry fetched in batch by getContextsByIds
  parentEntry = parentEntry || await getContext(context) || {
    children: [],
    lastUpdated: never(),
  }
  if (maxDepth === 0) {
    return {
      contextCache: [],
      contextIndex: {
        [contextEncoded]: {
          children: [],
          // TODO: Why not return the children if we already have them?
          // ...parentEntry,
          lastUpdated: never(),
          pending: true,
        }
      },
      thoughtCache: [],
      thoughtIndex: {}
    }
  }

  // generate a list of hashed thoughts and a map of contexts { [hash]: context } for all children
  // must save context map instead of just list of hashes for the recursive call
  const { thoughtIds, contextMap } = (parentEntry.children || []).reduce((accum, child) => ({
    thoughtIds: [
      ...accum.thoughtIds || [],
      hashThought(child.value),
    ],
    contextMap: {
      ...accum.contextMap,
      [hashContext(unroot([...context, child.value]))]: unroot([...context, child.value]),
    }
  }), { thoughtIds: [], contextMap: {} })

  const contextIds = Object.keys(contextMap)
  const thoughtList = await getThoughtsByIds(thoughtIds)
  const parentEntries = await getContextsByIds(contextIds)

  const thoughts = {
    contextCache: contextIds,
    contextIndex: {
      [contextEncoded]: parentEntry,
      ..._.keyBy(parentEntries, 'id')
    },
    thoughtCache: thoughtIds,
    thoughtIndex: _.keyBy(thoughtList, 'id')
  }

  const descendantThoughts = await Promise.all(parentEntries.map((parentEntry, i) =>
    getDescendantThoughts(contextMap[parentEntry.id], { maxDepth: maxDepth - 1, parentEntry })
  ))

  const descendantThoughtsMerged = mergeThoughts(thoughts, ...descendantThoughts)

  return descendantThoughtsMerged
}

/** Gets descendants of many contexts, returning them in a single ThoughtsInterface. Does not limit the depth of the em context.
 *
 * @param maxDepth    Maximum number of levels to fetch.
 */
export const getManyDescendants = async (contextMap, { maxDepth = 100 } = {}) => {

  // fetch descendant thoughts for each context in contextMap
  const descendantsArray = await Promise.all(Object.keys(contextMap).map(key =>
    getDescendantThoughts(pathToContext(contextMap[key]), {
      // do not limit the depth of the em context
      maxDepth: key === emContextEncoded ? Infinity : maxDepth
    })
  ))

  // aggregate thoughts from all descendants
  const thoughts = descendantsArray.reduce((accum, thoughts) => mergeThoughts(accum, thoughts), {
    contextCache: [],
    contextIndex: {},
    thoughtCache: [],
    thoughtIndex: {}
  })

  return thoughts
}

/** Gets the entire contextIndex. DEPRECATED. Use getDescendantThoughts. */
export const getContextIndex = async () => {
  const contextIndexMap = await db.contextIndex.toArray()
  // mapValues + keyBy much more efficient than reduce + merge
  return _.mapValues(_.keyBy(contextIndexMap, 'id'), 'context')
}

/** Updates the recentlyEdited helper. */
export const updateRecentlyEdited = async recentlyEdited => db.helpers.update('EM', { recentlyEdited })

/** Updates the schema version helper. */
export const updateSchemaVersion = async schemaVersion => db.helpers.update('EM', { schemaVersion })

/** Updates the lastUpdates helper. */
export const updateLastUpdated = async lastUpdated => db.helpers.update('EM', { lastUpdated })

/** Gets all the helper values. */
export const getHelpers = async () => db.helpers.get({ id: 'EM' })

/** Updates the cursor helper. */
export const updateCursor = async cursor => db.helpers.update('EM', { cursor })

/** Deletes the cursor helper. */
export const deleteCursor = async () => db.helpers.update('EM', { cursor: null })

/** Gets the full logs. */
export const getLogs = async () => db.logs.toArray()

/** Logs a message. */
export const log = async ({ message, stack }) =>
  db.logs.add({ created: timestamp(), message, stack })

export default initDB
