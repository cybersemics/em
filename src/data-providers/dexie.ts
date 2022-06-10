/* eslint-disable fp/no-this */
import _ from 'lodash'
import Dexie, { Transaction } from 'dexie'
import 'dexie-observable'
import { ICreateChange, IDatabaseChange, IDeleteChange, IUpdateChange } from 'dexie-observable/api'
import { hashThought, timestamp } from '../util'
import { createChildrenMapFromThoughts } from '../util/createChildrenMap'
import { getSessionId } from '../util/sessionManager'
import win from './win'
import {
  Context,
  Index,
  Lexeme,
  Thought,
  ThoughtWithChildren,
  ThoughtWordsIndex,
  ThoughtSubscriptionUpdates,
  Timestamp,
  ThoughtId,
} from '../@types'

// TODO: Why doesn't this work? Fix IndexedDB during tests.
// mock IndexedDB if tests are running
// NOTE: Could not get this to work in setupTests.js
// See: https://github.com/cybersemics/em/issues/664#issuecomment-629691193

/** Extend Dexie class for proper typing. See https://dexie.org/docs/Typescript. */
// eslint-disable-next-line fp/no-class
class EM extends Dexie {
  thoughtIndex: Dexie.Table<ThoughtWithChildren, string>
  lexemeIndex: Dexie.Table<Lexeme, string>
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
      thoughtIndex: 'id, *children, lastUpdated, updatedBy',
      lexemeIndex: 'id, value, *contexts, created, lastUpdated, updatedBy, *words',
      thoughtWordsIndex: 'id, *words',
      helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion',
      logs: '++id, created, message, stack',
    })

    this.thoughtIndex = this.table('thoughtIndex')
    this.lexemeIndex = this.table('lexemeIndex')
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

// If a ´source´ property is added to the Transaction object while performing a database operation, this value will be put in the change object. The ´source´ property is not an official property of Transaction but is added to all transactions when Dexie.Observable is active. The property can be used to ignore certain changes that origin from self.
// See: https://dexie.org/docs/Observable/Dexie.Observable.DatabaseChange
interface ObservableTransaction extends Transaction {
  source?: any
}

export const db = new Dexie('EM') as EM

// store a singleton subscription handler for unsubscribing
let subscriber: ((changes: IDatabaseChange[]) => void) | null

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
      thoughtIndex: 'id, children, lastUpdated',
      lexemeIndex: 'id, value, *contexts, created, lastUpdated',
      helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion',
      thoughtWordsIndex: 'id, *words',
      logs: '++id, created, message, stack',
    })

    // Hooks to add full text index
    // Related resource: https://github.com/dfahlander/Dexie.js/blob/master/samples/full-text-search/FullTextSearch.js

    db.lexemeIndex.hook('creating', (primaryKey, lexeme, transaction) => {
      transaction.on('complete', () => {
        db.thoughtWordsIndex.put({
          id: hashThought(lexeme.value),
          words: _.uniq(lexeme.value.split(' ')),
        })
      })
    })

    db.lexemeIndex.hook('updating', (modificationObject, primaryKey, lexeme, transaction) => {
      transaction.on('complete', () => {
        // eslint-disable-next-line no-prototype-builtins
        if (modificationObject.hasOwnProperty('value')) {
          db.thoughtWordsIndex.update(hashThought(lexeme.value), {
            words: lexeme.value.trim().length > 0 ? _.uniq(lexeme.value.trim().split(' ')) : [],
          })
        }
      })
    })

    db.lexemeIndex.hook('deleting', (primaryKey, lexeme, transaction) => {
      transaction.on('complete', () => {
        // Sometimes lexeme is undefined ??
        if (lexeme) db.thoughtWordsIndex.delete(hashThought(lexeme.value))
      })
    })
  }

  await initHelpers()
}

/** Clears all thoughts and contexts from the indices. */
export const clearAll = () => Promise.all([db.lexemeIndex.clear(), db.thoughtIndex.clear(), db.helpers.clear()])

/** Updates a single thought in the lexemeIndex. */
export const updateLexeme = async (id: string, thought: Lexeme) =>
  db.transaction('rw', db.lexemeIndex, (tx: ObservableTransaction) => {
    tx.source = getSessionId()
    return db.lexemeIndex.put({ id, ...thought, updatedBy: getSessionId() })
  })

/** Updates multiple thoughts in the lexemeIndex. */
export const updateLexemeIndex = async (lexemeIndexMap: Index<Lexeme | null>) =>
  db.transaction('rw', db.lexemeIndex, (tx: ObservableTransaction) => {
    tx.source = getSessionId()
    const thoughtsArray = Object.keys(lexemeIndexMap).map(key => ({
      ...(lexemeIndexMap[key] as Lexeme),
      updatedBy: getSessionId(),
      id: key,
    }))
    return db.lexemeIndex.bulkPut(thoughtsArray)
  })

/** Deletes a single thought from the lexemeIndex. */
export const deleteLexeme = (id: string) =>
  db.transaction('rw', db.lexemeIndex, (tx: ObservableTransaction) => {
    tx.source = getSessionId()
    return db.lexemeIndex.delete(id)
  })

/** Gets a single thought from the lexemeIndex by its id. */
export const getLexemeById = (key: string) => db.lexemeIndex.get(key)

/** Gets multiple thoughts from the lexemeIndex by ids. */
export const getLexemesByIds = (keys: string[]) => db.lexemeIndex.bulkGet(keys)

/** Updates a single thought in the thoughtIndex. */
export const updateThought = async (
  id: ThoughtId,
  { children, lastUpdated, value, parentId, archived, rank }: ThoughtWithChildren,
) =>
  db.transaction('rw', db.thoughtIndex, (tx: ObservableTransaction) => {
    tx.source = getSessionId()
    return db.thoughtIndex.put({
      id,
      value,
      children,
      lastUpdated,
      parentId,
      rank,
      updatedBy: getSessionId(),
      ...(archived ? { archived } : null),
    })
  })

/** Updates multiple thoughts in the thoughtIndex. */
export const updateThoughtIndex = async (thoughtIndexMap: Index<ThoughtWithChildren | null>) =>
  db.transaction('rw', db.thoughtIndex, (tx: ObservableTransaction) => {
    tx.source = getSessionId()
    const thoughtsArray = Object.keys(thoughtIndexMap).map(key => ({
      ...(thoughtIndexMap[key] as ThoughtWithChildren),
      updatedBy: getSessionId(),
      id: key as ThoughtId,
    }))
    return db.thoughtIndex.bulkPut(thoughtsArray)
  })

/** Deletes a single thought from the thoughtIndex. */
export const deleteThought = async (id: string) =>
  db.transaction('rw', db.thoughtIndex, (tx: ObservableTransaction) => {
    tx.source = getSessionId()
    return db.thoughtIndex.delete(id)
  })

/** Get a context by id. */
export const getThoughtById = async (id: string): Promise<Thought | undefined> => {
  const thoughtWithChildren: ThoughtWithChildren | undefined = await db.thoughtIndex.get(id)
  return thoughtWithChildren
    ? ({
        ..._.omit(thoughtWithChildren, ['children']),
        childrenMap: createChildrenMapFromThoughts(Object.values(thoughtWithChildren.children || {})),
      } as Thought)
    : undefined
}

/** Gets multiple contexts from the thoughtIndex by ids. */
export const getThoughtsByIds = async (ids: string[]): Promise<(Thought | undefined)[]> => {
  const thoughtsWithChildren: (ThoughtWithChildren | undefined)[] = await db.thoughtIndex.bulkGet(ids)
  return thoughtsWithChildren.map(thoughtWithChildren =>
    thoughtWithChildren
      ? ({
          ..._.omit(thoughtWithChildren, ['children']),
          childrenMap: createChildrenMapFromThoughts(Object.values(thoughtWithChildren.children || {})),
        } as Thought)
      : undefined,
  )
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

  const lexemes = await db.transaction('r', db.thoughtWordsIndex, db.lexemeIndex, async () => {
    const matchedKeysArray = await Dexie.Promise.all(
      words.map(word => db.thoughtWordsIndex.where('words').startsWithIgnoreCase(word).primaryKeys()),
    )
    const intersectionKeys = matchedKeysArray.reduce((acc, keys) => acc.filter(key => keys.includes(key)))
    return db.lexemeIndex.bulkGet(intersectionKeys)
  })

  return lexemes
}

/** Logs a message. */
export const log = async ({ message, stack }: { message: string; stack: any }) =>
  db.logs.add({ created: timestamp(), message, stack })

// Maps to dexie-observable's DatabaseChangeType which cannot be imported.
// See: https://dexie.org/docs/Observable/Dexie.Observable.DatabaseChange
const DatabaseChangeType = {
  Created: 1,
  Updated: 2,
  Deleted: 3,
}

/** Parse a Created or Updated change event and return updates as normalized Updates. */
const createdOrUpdatedChangeUpdates = (change: ICreateChange | IUpdateChange) => {
  // source is set on the transaction object
  // See: https://dexie.org/docs/Observable/Dexie.Observable.DatabaseChange
  const { source, table } = change as IUpdateChange
  const key = change.key as ThoughtId
  const obj = change.obj as ThoughtWithChildren | Lexeme
  return {
    thoughtIndexUpdates:
      table === 'thoughtIndex'
        ? {
            [key]: {
              updatedBy: source,
              value: {
                ..._.omit(obj as ThoughtWithChildren, ['children']),
                childrenMap: createChildrenMapFromThoughts(Object.values((obj as ThoughtWithChildren).children)),
              } as Thought,
            },
          }
        : {},
    lexemeIndexUpdates:
      table === 'lexemeIndex'
        ? {
            [key]: {
              updatedBy: source,
              value: obj as Lexeme,
            },
          }
        : {},
  }
}

/** Parse a Delete change event and return updates as normalized Updates.  */
const deletedChangeUpdates = (change: IDeleteChange) => {
  // source is set on the transaction object
  // See: https://dexie.org/docs/Observable/Dexie.Observable.DatabaseChange
  const { key, oldObj, source, table } = change
  return {
    thoughtIndexUpdates:
      table === 'thoughtIndex' && oldObj?.id
        ? {
            [key]: {
              updatedBy: source,
              value: null,
            },
          }
        : {},
    lexemeIndexUpdates: table === 'lexemeIndex' && oldObj?.id ? { [key]: { updatedBy: source, value: null } } : {},
  }
}

/** Subscribe to dexie updates. NOOP if aleady subscribed. */
export const subscribe = (onUpdate: (updates: ThoughtSubscriptionUpdates) => void): void => {
  if (!Object.prototype.hasOwnProperty.call(db, 'observable')) return

  // NOOP if already subscribed
  if (subscriber) return

  /** Changes subscriber that converts Dexie updates to ThoughtSubscriptionUpdates and calls onUpdate. */
  const onChanges = (changes: IDatabaseChange[]) => {
    changes.forEach(async change => {
      const updates =
        change.type === DatabaseChangeType.Created
          ? createdOrUpdatedChangeUpdates(change as ICreateChange)
          : change.type === DatabaseChangeType.Updated
          ? createdOrUpdatedChangeUpdates(change as IUpdateChange)
          : change.type === DatabaseChangeType.Deleted
          ? deletedChangeUpdates(change as IDeleteChange)
          : null
      const thoughtSubscriptionUpdates = {
        thoughtIndex: updates?.thoughtIndexUpdates || {},
        lexemeIndex: updates?.lexemeIndexUpdates || {},
      }
      if (
        Object.keys(thoughtSubscriptionUpdates.thoughtIndex).length === 0 &&
        Object.keys(thoughtSubscriptionUpdates.lexemeIndex).length === 0
      )
        return
      onUpdate(thoughtSubscriptionUpdates)
    })
  }

  db.on('changes', onChanges)

  // store subscriber in singleton to be accessed by unsubscribe
  subscriber = onChanges
}

/** Unsubscribes from dexie updates. NOOP if already unsubscribed. */
export const unsubscribe = (): void => {
  // NOOP if already unsubscribed
  if (!subscriber) return

  db.on('changes').unsubscribe(subscriber)

  // clear subscriber so that subscribe can detect if already subscribed
  subscriber = null
}

export default initDB
