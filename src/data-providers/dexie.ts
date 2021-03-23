/* eslint-disable fp/no-this */
import Dexie from 'dexie'
import _ from 'lodash'
import { hashThought, timestamp } from '../util'
import { Context, Index, Lexeme, Parent, ThoughtWordsIndex, Timestamp } from '../types'

// TODO: Why doesn't this work? Fix IndexedDB during tests.
// mock IndexedDB if tests are running
// NOTE: Could not get this to work in setupTests.js
// See: https://github.com/cybersemics/em/issues/664#issuecomment-629691193

/** Extend Dexie class for proper typing. See https://dexie.org/docs/Typescript. */
// eslint-disable-next-line fp/no-class
class EM extends Dexie {

  contextIndex: Dexie.Table<Parent, string>;
  thoughtIndex: Dexie.Table<Lexeme, string>;
  thoughtWordsIndex: Dexie.Table<ThoughtWordsIndex, string>;
  helpers: Dexie.Table<Helper, string>;
  logs: Dexie.Table<Log, number>;

  constructor () {
    super('Database')

    this.version(1).stores({
      contextIndex: 'id, context, *children, lastUpdated',
      thoughtIndex: 'id, value, *contexts, created, lastUpdated, *words',
      thoughtWordsIndex: 'id, *words',
      helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion',
      logs: '++id, created, message, stack',
    })

    this.contextIndex = this.table('contextIndex')
    this.thoughtIndex = this.table('thoughtIndex')
    this.thoughtWordsIndex = this.table('thoughtWordsIndex')
    this.helpers = this.table('helpers')
    this.logs = this.table('logs')
  }
}

export interface Helper {
  id: string,
  value?: string,
  contexts?: Context[],
  cursor?: string | null,
  created?: Timestamp,
  lastUpdated?: Timestamp,
  recentlyEdited?: Index,
}

export interface Log {
  created: Timestamp,
  message: string,
  stack?: any,
}

const db = new Dexie('EM') as EM

/** Initializes the EM record where helpers are stored. */
const initHelpers = async () => {
  const staticHelpersExist = await db.helpers.get({ id: 'EM' })
  if (!staticHelpersExist) {
    await db.helpers.add({ id: 'EM' })
  }
}

/** Initializes the database tables. */
const initDB = async () => {

  if (!db.isOpen()) {
    await db.version(1).stores({
      thoughtIndex: 'id, value, *contexts, created, lastUpdated',
      contextIndex: 'id, *children, lastUpdated',
      helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion',
      thoughtWordsIndex: 'id, *words',
      logs: '++id, created, message, stack',
    })

    // Hooks to add full text index
    // Related resource: https://github.com/dfahlander/Dexie.js/blob/master/samples/full-text-search/FullTextSearch.js

    db.thoughtIndex.hook('creating', (primaryKey, lexeme, transaction) => {
      transaction.on('complete', () => {
        db.thoughtWordsIndex.put({
          id: hashThought(lexeme.value),
          words: _.uniq(lexeme.value.split(' '))
        })
      })
    })

    db.thoughtIndex.hook('updating', (modificationObject, primaryKey, lexeme, transaction) => {
      transaction.on('complete', () => {
        // eslint-disable-next-line no-prototype-builtins
        if (modificationObject.hasOwnProperty('value')) {
          db.thoughtWordsIndex.update(hashThought(lexeme.value), {
            words: lexeme.value.trim().length > 0 ? _.uniq(lexeme.value.trim().split(' ')) : []
          })
        }
      })
    })

    db.thoughtIndex.hook('deleting', (primaryKey, lexeme, transaction) => {
      transaction.on('complete', () => {
        // Sometimes lexeme is undefined ??
        if (lexeme) db.thoughtWordsIndex.delete(hashThought(lexeme.value))
      })
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
export const updateThought = async (id: string, thought: Lexeme) =>
  db.thoughtIndex.put({ id, ...thought })

/** Updates multiple thoughts in the thoughtIndex. */
export const updateThoughtIndex = async (thoughtIndexMap: Index<Lexeme | null>) => {
  const thoughtsArray = Object.keys(thoughtIndexMap).map(key => ({
    ...thoughtIndexMap[key] as Lexeme,
    id: key,
  }))
  return db.thoughtIndex.bulkPut(thoughtsArray)
}

/** Deletes a single thought from the thoughtIndex. */
export const deleteThought = (id: string) => db.thoughtIndex.delete(id)

/** Gets a single thought from the thoughtIndex by its id. */
export const getThoughtById = (id: string) => db.thoughtIndex.get(id)

/** Gets multiple thoughts from the thoughtIndex by ids. */
export const getThoughtsByIds = (ids: string[]) => db.thoughtIndex.bulkGet(ids)

/** Gets the entire thoughtIndex. */
export const getThoughtIndex = async () => {
  const thoughtIndexMap = await db.thoughtIndex.toArray()
  return _.keyBy(thoughtIndexMap, 'id')
}

/** Updates a single thought in the contextIndex. Ignores parentEntry.pending. */
export const updateContext = async (id: string, { context, children, lastUpdated }: Parent) => {
  return db.contextIndex.put({ id, context, children, lastUpdated })
}

/** Updates multiple thoughts in the contextIndex. */
export const updateContextIndex = async (contextIndexMap: Index<Parent | null>) => {
  const contextsArray = Object.keys(contextIndexMap).map(key => ({
    ...contextIndexMap[key] as Parent,
    id: key,
  }))
  return db.contextIndex.bulkPut(contextsArray)
}

/** Deletes a single thought from the contextIndex. */
export const deleteContext = async (id: string) => db.contextIndex.delete(id)

/** Get a context by id. */
export const getContextById = async (id: string) => db.contextIndex.get(id)

/** Gets multiple contexts from the contextIndex by ids. */
export const getContextsByIds = async (ids: string[]) => db.contextIndex.bulkGet(ids)

/** Gets the entire contextIndex. DEPRECATED. Use data-helpers/getDescendantThoughts. */
export const getContextIndex = async () => {
  const contextIndexMap = await db.contextIndex.toArray()
  // mapValues + keyBy much more efficient than reduce + merge
  return _.mapValues(_.keyBy(contextIndexMap, 'id'), 'context')
}

/** Updates the recentlyEdited helper. */
export const updateRecentlyEdited = async (recentlyEdited: Index) => db.helpers.update('EM', { recentlyEdited })

/** Updates the schema version helper. */
export const updateSchemaVersion = async (schemaVersion: number) => db.helpers.update('EM', { schemaVersion })

/** Updates the lastUpdates helper. */
export const updateLastUpdated = async (lastUpdated: Timestamp) => db.helpers.update('EM', { lastUpdated })

/** Gets all the helper values. */
export const getHelpers = async () => db.helpers.get({ id: 'EM' })

/** Updates the cursor helper. */
export const updateCursor = async (cursor: string | null) => db.helpers.update('EM', { cursor })

/** Deletes the cursor helper. */
export const deleteCursor = async () => db.helpers.update('EM', { cursor: null })

/** Gets the full logs. */
export const getLogs = async () => db.logs.toArray()

/**
 * Full text search and returns lexeme.
 */
export const fullTextSearch = async (value: string) => {

  // Related resource: https://github.com/dfahlander/Dexie.js/issues/281
  const words = _.uniq(value.split(' '))

  const lexemes = await db.transaction('r', db.thoughtWordsIndex, db.thoughtIndex, async () => {
    const matchedKeysArray = await Dexie.Promise.all(
      words.map(word =>
        db.thoughtWordsIndex.where('words').startsWithIgnoreCase(word).primaryKeys()
      ))
    const intersectionKeys = matchedKeysArray.reduce((acc, keys) => acc.filter(key => keys.includes(key)))
    return db.thoughtIndex.bulkGet(intersectionKeys)
  })

  return lexemes
}

/** Logs a message. */
export const log = async ({ message, stack }: { message: string, stack: any }) =>
  db.logs.add({ created: timestamp(), message, stack })

export default initDB
