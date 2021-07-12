/* eslint-disable fp/no-this */
import Dexie from 'dexie'
import { Store } from 'redux'
import 'dexie-observable'
import { ICreateChange, IDeleteChange, IUpdateChange, IDatabaseChange } from 'dexie-observable/api'
import _ from 'lodash'
import { hashThought, timestamp } from '../util'
import { Context, Index, Lexeme, Parent, ThoughtWordsIndex, Timestamp } from '../types'
import { getSessionId, SessionType } from '../util/sessionManager'
import { getSubscriptionUtils } from '../util/subscriptionUtils'
import { State } from '../util/initialState'
import win from './win'

// TODO: Why doesn't this work? Fix IndexedDB during tests.
// mock IndexedDB if tests are running
// NOTE: Could not get this to work in setupTests.js
// See: https://github.com/cybersemics/em/issues/664#issuecomment-629691193

/** Extend Dexie class for proper typing. See https://dexie.org/docs/Typescript. */
// eslint-disable-next-line fp/no-class
class EM extends Dexie {
  contextIndex: Dexie.Table<Parent, string>
  thoughtIndex: Dexie.Table<Lexeme, string>
  thoughtWordsIndex: Dexie.Table<ThoughtWordsIndex, string>
  helpers: Dexie.Table<Helper, string>
  logs: Dexie.Table<Log, number>

  constructor() {
    if (!document) {
      super('Database', {
        indexedDB: win?.indexedDB,
        IDBKeyRange: win?.IDBKeyRange,
      })
    } else {
      super('Database')
    }

    this.version(1).stores({
      contextIndex: 'id, context, *children, lastUpdated, updatedBy',
      thoughtIndex: 'id, value, *contexts, created, lastUpdated, updatedBy, *words',
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
  id: string
  value?: string
  contexts?: Context[]
  cursor?: string | null
  created?: Timestamp
  lastUpdated?: Timestamp
  recentlyEdited?: Index
}

export interface Log {
  created: Timestamp
  message: string
  stack?: any
}

export const db = new Dexie('EM') as EM

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
          words: _.uniq(lexeme.value.split(' ')),
        })
      })
    })

    db.thoughtIndex.hook('updating', (modificationObject, primaryKey, lexeme, transaction) => {
      transaction.on('complete', () => {
        // eslint-disable-next-line no-prototype-builtins
        if (modificationObject.hasOwnProperty('value')) {
          db.thoughtWordsIndex.update(hashThought(lexeme.value), {
            words: lexeme.value.trim().length > 0 ? _.uniq(lexeme.value.trim().split(' ')) : [],
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
export const clearAll = () => Promise.all([db.thoughtIndex.clear(), db.contextIndex.clear(), db.helpers.clear()])

/** Updates a single thought in the thoughtIndex. */
export const updateThought = async (id: string, thought: Lexeme) =>
  db.thoughtIndex.put({ id, ...thought, updatedBy: getSessionId() })

/** Updates multiple thoughts in the thoughtIndex. */
export const updateThoughtIndex = async (thoughtIndexMap: Index<Lexeme | null>) => {
  const thoughtsArray = Object.keys(thoughtIndexMap).map(key => ({
    ...(thoughtIndexMap[key] as Lexeme),
    updatedBy: getSessionId(),
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
  return db.contextIndex.put({ id, context, children, updatedBy: getSessionId(), lastUpdated })
}

/** Updates multiple thoughts in the contextIndex. */
export const updateContextIndex = async (contextIndexMap: Index<Parent | null>) => {
  const contextsArray = Object.keys(contextIndexMap).map(key => ({
    ...(contextIndexMap[key] as Parent),
    updatedBy: getSessionId(),
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
      words.map(word => db.thoughtWordsIndex.where('words').startsWithIgnoreCase(word).primaryKeys()),
    )
    const intersectionKeys = matchedKeysArray.reduce((acc, keys) => acc.filter(key => keys.includes(key)))
    return db.thoughtIndex.bulkGet(intersectionKeys)
  })

  return lexemes
}

/** Logs a message. */
export const log = async ({ message, stack }: { message: string; stack: any }) =>
  db.logs.add({ created: timestamp(), message, stack })

// maps to dexie-observable's DatabaseChangeType which cannot be imported
export enum DatabaseChangeType {
  created = 1,
  updated = 2,
  deleted = 3,
}

/** Get db change handlers. */
const getDbChangeHandlers = ({
  getContextLocal,
  getThoughtLocal,
  getUpdatedObject,
  shouldIncludeUpdate,
}: ReturnType<typeof getSubscriptionUtils>) => ({
  [DatabaseChangeType.created]: (change: IDatabaseChange) => {
    const { table, key, obj } = change as ICreateChange
    return {
      thoughtIndexUpdates:
        table === 'thoughtIndex' && shouldIncludeUpdate(obj, SessionType.LOCAL)
          ? { [key as string]: obj as Lexeme }
          : {},
      contextIndexUpdates:
        table === 'contextIndex' && shouldIncludeUpdate(obj, SessionType.LOCAL)
          ? { [key as string]: obj as Parent }
          : {},
    }
  },
  [DatabaseChangeType.updated]: async (change: IDatabaseChange) => {
    const { key, table, mods: updates } = change as IUpdateChange

    /**
     * Dexie falsly sends null as a child value if a thought is removed from a context
     * We need to manually filter out such children that can cause the app to break.
     */
    const removeInvalidContexts = (thought: Lexeme): Lexeme => ({
      ...thought,
      contexts: thought.contexts.filter(c => c !== null),
    })

    /** Filter thoughts with null contexts. */
    const filterInvalidContexts = (context: Parent): Parent => ({
      ...context,
      children: context.children.filter(child => child !== null),
    })
    /** Get thought merged with updates. */
    const getThoughtUpdates = async (id: string, updates: Index) => {
      const thought = await getThoughtById(id)
      if (shouldIncludeUpdate({ ...(thought || (updates as Lexeme)) }, SessionType.LOCAL)) {
        const updatedThought = thought ? getUpdatedObject(thought, updates as Lexeme) : null
        return updatedThought ? { [key]: removeInvalidContexts(updatedThought) } : {}
      }
      return {}
    }
    /** Get context merged with updates. */
    const getContextUpdates = async (id: string, updates: Index) => {
      const context = await getContextById(id)
      if (shouldIncludeUpdate({ ...(context || (updates as Parent)) }, SessionType.LOCAL)) {
        const updatedContext = context ? getUpdatedObject(context, updates as Parent) : null
        return updatedContext ? { [key]: filterInvalidContexts(updatedContext) } : {}
      }
      return {}
    }

    return {
      thoughtIndexUpdates: table === 'thoughtIndex' ? await getThoughtUpdates(key, updates) : {},
      contextIndexUpdates: table === 'contextIndex' ? await getContextUpdates(key, updates) : {},
    }
  },
  [DatabaseChangeType.deleted]: (change: IDatabaseChange) => {
    const { key, table, oldObj } = change as IDeleteChange
    return {
      thoughtIndexUpdates:
        table === 'thoughtIndex' &&
        oldObj &&
        oldObj.id &&
        shouldIncludeUpdate(oldObj, SessionType.LOCAL) &&
        getThoughtLocal(key)
          ? { [key as string]: null }
          : {},
      contextIndexUpdates:
        table === 'contextIndex' &&
        oldObj &&
        oldObj.id &&
        shouldIncludeUpdate(oldObj, SessionType.LOCAL) &&
        getContextLocal(key)
          ? { [key as string]: null }
          : {},
    }
  },
})

/** Subscribe to dexie updates. */
export const subscribe = (store: Store<State, any>) => {
  const subscriptionUtils = getSubscriptionUtils(store)
  const dbChangeHandlers = getDbChangeHandlers(subscriptionUtils)

  Object.prototype.hasOwnProperty.call(db, 'observable') &&
    db.on('changes', changes => {
      changes.forEach(async change => {
        const updates = await dbChangeHandlers[change.type](change)
        subscriptionUtils.updateThoughtsFromSubscription(updates)
      })
    })
}

export default initDB
