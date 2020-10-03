/* eslint-disable fp/no-this */
import Dexie from 'dexie'
import _ from 'lodash'
import { hashContext, hashThought, mergeThoughts, never, pathToContext, timestamp, unroot } from '../util'
import { EM_TOKEN } from '../constants'
import { Context, Lexeme, Parent, Path, Timestamp } from '../types'
import { GenericObject } from '../utilTypes'

// TODO: Why doesn't this work? Fix IndexedDB during tests.
// mock IndexedDB if tests are running
// NOTE: Could not get this to work in setupTests.js
// See: https://github.com/cybersemics/em/issues/664#issuecomment-629691193

/** Extend Dexie class for proper typing. See https://dexie.org/docs/Typescript. */
// eslint-disable-next-line fp/no-class
class EM extends Dexie {

  contextIndex: Dexie.Table<Parent & { id: string }, string>;
  thoughtIndex: Dexie.Table<Lexeme & { id: string }, string>;
  helpers: Dexie.Table<Helper, string>;
  logs: Dexie.Table<Log, number>;

  constructor () {
    super('Database')

    this.version(1).stores({
      contextIndex: 'id, context, *children, lastUpdated',
      thoughtIndex: 'id, value, *contexts, created, lastUpdated',
      helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion',
      logs: '++id, created, message, stack',
    })

    this.contextIndex = this.table('contextIndex')
    this.thoughtIndex = this.table('thoughtIndex')
    this.helpers = this.table('helpers')
    this.logs = this.table('logs')
  }
}

export interface Helper {
  id: string,
  value?: string,
  contexts?: Context[],
  created?: Timestamp,
  lastUpdated?: Timestamp,
}

export interface Log {
  created: Timestamp,
  message: string,
  stack?: any,
}

const db = new Dexie('EM') as EM

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

  if (!db.isOpen()) {
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
export const updateThought = async (id: string, thought: Lexeme) => db.thoughtIndex.put({ id, ...thought })

/** Updates multiple thoughts in the thoughtIndex. */
export const updateThoughtIndex = async (thoughtIndexMap: GenericObject<Lexeme>) => {
  const thoughtsArray = Object.keys(thoughtIndexMap).map(key => ({ ...thoughtIndexMap[key], id: key }))
  return db.thoughtIndex.bulkPut(thoughtsArray)
}

/** Deletes a single thought from the thoughtIndex. */
export const deleteThought = async (id: string) => db.thoughtIndex.delete(id)

/** Gets a single thought from the thoughtIndex by its id. */
export const getThoughtById = async (id: string) => db.thoughtIndex.get(id)

/** Gets multiple thoughts from the thoughtIndex by ids. */
export const getThoughtsByIds = async (ids: string[]) => db.thoughtIndex.bulkGet(ids)

/** Gets a single thought from the thoughtIndex by its value. */
export const getThought = async (value: string) => db.thoughtIndex.get({ id: hashThought(value) })

/** Gets the entire thoughtIndex. */
export const getThoughtIndex = async () => {
  const thoughtIndexMap = await db.thoughtIndex.toArray()
  return _.keyBy(thoughtIndexMap, 'id')
}

/** Updates a single thought in the contextIndex. Ignores parentEntry.pending. */
export const updateContext = async (id: string, { context, children, lastUpdated }: Parent) => db.contextIndex.put({ id, context, children, lastUpdated })

/** Updates multiple thoughts in the contextIndex. */
export const updateContextIndex = async (contextIndexMap: GenericObject<Parent>) => {
  const contextsArray = Object.keys(contextIndexMap).map(key => ({ id: key, ...contextIndexMap[key] }))
  return db.contextIndex.bulkPut(contextsArray)
}

/** Deletes a single thought from the contextIndex. */
export const deleteContext = async (id: string) => db.contextIndex.delete(id)

/** Get a context by id. */
export const getContextById = async (id: string) => db.contextIndex.get(id)

/** Gets multiple contexts from the contextIndex by ids. */
export const getContextsByIds = async (ids: string[]) => db.contextIndex.bulkGet(ids)

/** Gets the Parent for a context. */
export const getContext = async (context: Context) => getContextById(hashContext(context))

/**
 * Builds a thoughtIndex and contextIndex for all descendants.
 *
 * @param context
 * @param children
 * @param maxDepth    The maximum number of levels to traverse. When reached, adds pending: true to the returned Parent. Ignored for EM context. Default: 100.
 */
export const getDescendantThoughts = async (context: Context, { maxDepth = 100, parentEntry }: { maxDepth?: number, parentEntry?: Parent } = {}) => {

  const contextEncoded = hashContext(context)

  // fetch individual parentEntry in initial call
  // recursive calls on children will pass the parentEntry fetched in batch by getContextsByIds
  parentEntry = parentEntry || await getContext(context) || {
    context,
    children: [],
    lastUpdated: never(),
  }
  if (maxDepth === 0) {
    return {
      contextCache: [],
      contextIndex: {
        [contextEncoded]: {
          context,
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
  // @ts-ignore
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

  const descendantThoughts = await Promise.all(parentEntries.map(parentEntry =>
    getDescendantThoughts(contextMap[parentEntry.id!], { maxDepth: maxDepth - 1, parentEntry })
  ))

  const descendantThoughtsMerged = mergeThoughts(thoughts, ...descendantThoughts)

  return descendantThoughtsMerged
}

/** Gets descendants of many contexts, returning them in a single ThoughtsInterface. Does not limit the depth of the em context.
 *
 * @param maxDepth    Maximum number of levels to fetch.
 */
export const getManyDescendants = async (contextMap: GenericObject<Context>, { maxDepth = 100 } = {}) => {

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
export const updateRecentlyEdited = async (recentlyEdited: any) => db.helpers.update('EM', { recentlyEdited })

/** Updates the schema version helper. */
export const updateSchemaVersion = async (schemaVersion: number) => db.helpers.update('EM', { schemaVersion })

/** Updates the lastUpdates helper. */
export const updateLastUpdated = async (lastUpdated: Timestamp) => db.helpers.update('EM', { lastUpdated })

/** Gets all the helper values. */
export const getHelpers = async () => db.helpers.get({ id: 'EM' })

/** Updates the cursor helper. */
export const updateCursor = async (cursor: Path | null) => db.helpers.update('EM', { cursor })

/** Deletes the cursor helper. */
export const deleteCursor = async () => db.helpers.update('EM', { cursor: null })

/** Gets the full logs. */
export const getLogs = async () => db.logs.toArray()

/** Logs a message. */
export const log = async ({ message, stack }: { message: string, stack: any }) =>
  db.logs.add({ created: timestamp(), message, stack })

export default initDB
