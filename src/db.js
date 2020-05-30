import Dexie from 'dexie'
import _ from 'lodash'
import { timestamp } from './util'

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

/** Initializes the EM record where helpers are stored. */
const initHelpers = async () => {
  const staticHelpersExist = await db.helpers.get({ id: 'EM' })
  if (!staticHelpersExist) {
    await db.helpers.add({ id: 'EM' })
  }
}

/** Initializes the database tables. */
const initDB = async () => {

  if (isTest()) return

  await db.version(1).stores({
    thoughtIndex: 'id, value, *contexts, created, lastUpdated',
    contextIndex: 'id, *context, lastUpdated',
    helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion',
    logs: '++id, created, message, stack',
  })
  await initHelpers()
}

/** Clears all thoughts and contexts from the indices. */
export const clearAll = async () => Promise.all([db.thoughtIndex.clear(), db.contextIndex.clear(), db.helpers.clear()])

/** Updates a single thought in the thoughtIndex. */
export const updateThought = async (id, thought) => db.thoughtIndex.put({ id, ...thought })

/** Updates multiple thoughts in the thoughtIndex. */
export const updateThoughtIndex = async thoughtIndexMap => {
  const thoughtsArray = Object.keys(thoughtIndexMap).map(key => ({ ...thoughtIndexMap[key], id: key }))
  return db.thoughtIndex.bulkPut(thoughtsArray)
}

/** Deletes a single thought from the thoughtIndex. */
export const deleteThought = async id => db.thoughtIndex.delete(id)

/** Gets a single thought from the thoughtIndex. */
export const getThought = async id => db.thoughtIndex.get(id)

/** Gets the entire thoughtIndex. */
export const getThoughtIndex = async () => {
  const thoughtIndexMap = await db.thoughtIndex.toArray()
  return _.keyBy(thoughtIndexMap, 'id')
}

/** Updates a single thought in the contextIndex. */
export const updateContext = async (id, context) => db.contextIndex.put({ id, context })

/** Updates multiple thoughts in the contextIndex. */
export const updateContextIndex = async contextIndexMap => {
  const contextsArray = Object.keys(contextIndexMap).map(key => ({ id: key, context: contextIndexMap[key] }))
  return db.contextIndex.bulkPut(contextsArray)
}

/** Deletes a single thought from the contextIndex. */
export const deleteContext = async id => db.contextIndex.delete(id)

/** Gets the entire contextIndex. */
export const getContextIndex = async () => {
  const contextIndexMap = await db.contextIndex.toArray()
  // mapValues + keyBy much more efficient than reduce + merge
  return _.mapValues(_.keyBy(contextIndexMap, 'id'), 'context')
}

/** Updates the recentlyEdited helper. */
export const updateRecentlyEdited = async recentlyEdited => isTest() || db.helpers.update('EM', { recentlyEdited })

/** Updates the schema version helper. */
export const updateSchemaVersion = async schemaVersion => isTest() || db.helpers.update('EM', { schemaVersion })

/** Updates the lastUpdates helper. */
export const updateLastUpdated = async lastUpdated => isTest() || db.helpers.update('EM', { lastUpdated })

/** Gets all the helper values. */
export const getHelpers = async () => db.helpers.get({ id: 'EM' })

/** Updates the cursor helper. */
export const updateCursor = async cursor => isTest() || db.helpers.update('EM', { cursor })

/** Deletes the cursor helper. */
export const deleteCursor = async () => isTest() || db.helpers.update('EM', { cursor: null })

/** Gets the full logs. */
export const getLogs = async () => db.logs.toArray()

/** Logs a message. */
export const log = async ({ message, stack }) =>
  db.logs.add({ created: timestamp(), message, stack })

export default initDB
