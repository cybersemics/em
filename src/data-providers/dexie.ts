/* eslint-disable fp/no-this */
import Dexie, { Transaction } from 'dexie'
import _ from 'lodash'
import Context from '../@types/Context'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import LexemeDb, { fromLexemeDb, toLexemeDb } from '../@types/LexemeDb'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtWithChildren from '../@types/ThoughtWithChildren'
import Timestamp from '../@types/Timestamp'
import { SCHEMA_LATEST } from '../constants'
import { createChildrenMapFromThoughts } from '../util/createChildrenMap'
import groupObjectBy from '../util/groupObjectBy'
import hashThought from '../util/hashThought'
import series from '../util/series'
import { getSessionId } from '../util/sessionManager'
import timestamp from '../util/timestamp'
import win from './win'

const schema = {
  thoughtIndex: 'id, archived, children, childrenMap, lastUpdated, parentId, updatedBy, rank, value',
  lexemeIndex: 'id, lemma, *contexts, created, lastUpdated, updatedBy, *words',
  thoughtWordsIndex: 'id, *words',
  helpers: 'id, cursor, lastUpdated, recentlyEdited, schemaVersion',
  logs: '++id, created, message, stack',
}

// TODO: Why doesn't this work? Fix IndexedDB during tests.
// mock IndexedDB if tests are running
// NOTE: Could not get this to work in setupTests.js
// See: https://github.com/cybersemics/em/issues/664#issuecomment-629691193

/** Extend Dexie class for proper typing. See https://dexie.org/docs/Typescript. */
// eslint-disable-next-line fp/no-class
class EM extends Dexie {
  thoughtIndex: Dexie.Table<ThoughtWithChildren, string>
  lexemeIndex: Dexie.Table<LexemeDb, string>
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

    this.version(SCHEMA_LATEST).stores(schema)

    this.thoughtIndex = this.table('thoughtIndex')
    this.lexemeIndex = this.table('lexemeIndex')
    this.thoughtWordsIndex = this.table('thoughtWordsIndex')
    this.helpers = this.table('helpers')
    this.logs = this.table('logs')
  }
}

export interface Helper {
  id: string
  lemma?: string
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

interface ThoughtWordsIndex {
  id: string
  words: string[]
}

export const db = new Dexie('EM') as EM

/** Initializes the database tables. */
const initDB = async () => {
  if (!db.isOpen()) {
    await db.version(SCHEMA_LATEST).stores(schema)

    // Hooks to add full text index
    // Related resource: https://github.com/dfahlander/Dexie.js/blob/master/samples/full-text-search/FullTextSearch.js

    db.lexemeIndex.hook('creating', (primaryKey, lexeme, transaction) => {
      transaction.on('complete', () => {
        db.thoughtWordsIndex.put({
          id: hashThought(lexeme.lemma),
          words: _.uniq(lexeme.lemma.split(' ')),
        })
      })
    })

    db.lexemeIndex.hook('updating', (modificationObject, primaryKey, lexeme, transaction) => {
      transaction.on('complete', () => {
        // eslint-disable-next-line no-prototype-builtins
        if (modificationObject.hasOwnProperty('value')) {
          db.thoughtWordsIndex.update(hashThought(lexeme.lemma), {
            words: lexeme.lemma.trim().length > 0 ? _.uniq(lexeme.lemma.trim().split(' ')) : [],
          })
        }
      })
    })

    db.lexemeIndex.hook('deleting', (primaryKey, lexeme, transaction) => {
      transaction.on('complete', () => {
        // Sometimes lexeme is undefined ??
        if (lexeme?.lemma != null) db.thoughtWordsIndex.delete(hashThought(lexeme.lemma))
      })
    })
  }

  // sometimes IndexedDB becomes frozen and all database queries hang
  // db.helpers.get is the first query to IndexedDB
  // detect the frozen state and throw
  const timeout = new Promise((resolve, reject) =>
    setTimeout(() => {
      reject(
        new Error(
          'IndexedDB is not responding. Try refreshing the app. If that does not work, try clearing local storage and restarting your browser.',
        ),
      )
    }, 2000),
  )
  const staticHelpersExist = await Promise.race([timeout, db.helpers.get({ id: 'EM' })])
  if (!staticHelpersExist) {
    await db.helpers.add({ id: 'EM' })
  }
}

/** Clears all thoughts and contexts from the indices. */
export const clear = () => Promise.all([db.lexemeIndex.clear(), db.thoughtIndex.clear(), db.helpers.clear()])

/** Updates a single lexeme in the lexemeIndex. */
export const updateLexeme = async (id: string, lexeme: Lexeme) =>
  db.transaction('rw', db.lexemeIndex, (tx: ObservableTransaction) => {
    tx.source = getSessionId()
    return db.lexemeIndex.put({ id, ...toLexemeDb(lexeme), updatedBy: getSessionId() })
  })

/** Updates multiple lexemes in the lexemeIndex. */
export const updateLexemeIndex = async (lexemeIndexMap: Index<Lexeme>) =>
  db.transaction('rw', db.lexemeIndex, (tx: ObservableTransaction) => {
    tx.source = getSessionId()
    const thoughtsArray = Object.keys(lexemeIndexMap).map(
      key =>
        ({
          ...toLexemeDb(lexemeIndexMap[key]),
          updatedBy: getSessionId(),
          id: key,
        } as LexemeDb),
    )
    return db.lexemeIndex.bulkPut(thoughtsArray)
  })

/** Gets a single lexeme from the lexemeIndex by its id. */
export const getLexemeById = async (key: string): Promise<Lexeme | undefined> =>
  db.lexemeIndex.get(key).then(fromLexemeDb)

/** Gets multiple thoughts from the lexemeIndex by ids. */
export const getLexemesByIds = (keys: string[]) =>
  db.lexemeIndex.bulkGet(keys).then(lexemes => lexemes.map(fromLexemeDb))

/** Updates a single thought in the thoughtIndex. */
export const updateThought = async (
  id: ThoughtId,
  thoughtOld: ThoughtWithChildren | undefined,
  { children, childrenMap, lastUpdated, value, parentId, archived, rank }: ThoughtWithChildren,
) => {
  return db.transaction('rw', db.thoughtIndex, async (tx: ObservableTransaction) => {
    tx.source = getSessionId()
    // Do not save children if any are pending.
    // Pending thoughts should never be persisted.
    // Since this is an update rather than a put, the thought will retain any children it already has in the database.
    // This can occur when editing an un-expanded thought whose children are still pending.
    // When replicating from remote, we need to persist childrenMap, otherwise children of buffered local thoughts will never be saved and thus incorrectly return empty children on pull.
    const hasPendingChildren =
      Object.values(children).some(child => child.pending) ||
      Object.keys(children).length < Object.keys(childrenMap || {}).length

    /** Does a put if the thought does not exist, otherwise update. */
    const putOrUpdate = (changes: Partial<ThoughtWithChildren>) =>
      thoughtOld ? db.thoughtIndex.update(id, changes) : db.thoughtIndex.put(changes as ThoughtWithChildren)

    return putOrUpdate({
      id,
      value,
      ...(hasPendingChildren
        ? { childrenMap: childrenMap || thoughtOld?.childrenMap || {} }
        : // when no children are pending, we can safely delete childrenMap
          { children, childrenMap: {} }),
      lastUpdated,
      parentId,
      rank,
      updatedBy: getSessionId(),
      ...(archived ? { archived } : null),
    })
  })
}

/** Atomically updates the thoughtIndex and lexemeIndex. */
export const updateThoughts = async (
  thoughtIndexUpdates: Index<ThoughtWithChildren | null>,
  lexemeIndexUpdates: Index<Lexeme | null>,
  schemaVersion: number,
) => {
  // group thought updates and deletes so that we can use the db bulk functions
  const { update: thoughtUpdates, delete: thoughtDeletes } = groupObjectBy(thoughtIndexUpdates, (id, thought) =>
    thought ? 'update' : 'delete',
  ) as {
    update?: Index<ThoughtWithChildren>
    delete?: Index<null>
  }

  // group lexeme updates and deletes so that we can use the db bulk functions
  const { update: lexemeUpdates, delete: lexemeDeletes } = groupObjectBy(lexemeIndexUpdates, (id, lexeme) =>
    lexeme ? 'update' : 'delete',
  ) as {
    update?: Index<Lexeme>
    delete?: Index<null>
  }

  return db.transaction(
    'rw',
    [db.thoughtIndex, db.thoughtWordsIndex, db.lexemeIndex, db.helpers],
    async (tx: ObservableTransaction) => {
      tx.source = getSessionId()

      const thoughtsOld = await db.thoughtIndex.bulkGet(Object.keys(thoughtUpdates || {}))

      // Executing the inner transaction in parallel and/or without explicitly waiting causes a TransactionInactiveError.
      // Dexie is supposed to wait for all subtransactions to complete, so I am not sure why this occurs. updateThought does not contain any non-Dexie async calls.
      // However, TransactionInactiveError or PrematureCommitError still gets thrown when updateThoughts gets called in parallel, e.g. if push gets called before the previous push completes.
      // Run shortcuts/__tests__/moveThought on its own to reproduce.
      await Dexie.waitFor(
        series(
          Object.entries(thoughtUpdates || {}).map(
            ([id, thought], i) =>
              () =>
                updateThought(id as ThoughtId, thoughtsOld[i], thought),
          ),
        ),
      )

      return Promise.all([
        thoughtDeletes ? db.thoughtIndex.bulkDelete(Object.keys(thoughtDeletes)) : null,
        lexemeDeletes ? db.lexemeIndex.bulkDelete(Object.keys(lexemeDeletes)) : null,
        lexemeUpdates ? updateLexemeIndex(lexemeUpdates) : null,
        updateSchemaVersion(schemaVersion),
      ] as Promise<unknown>[])
    },
  )
}

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

/** Get a thought by id. */
export const getThoughtById = async (id: string): Promise<Thought | undefined> => {
  const thoughtWithChildren: ThoughtWithChildren | undefined = await db.thoughtIndex.get(id)
  return thoughtWithChildren
    ? ({
        ..._.omit(thoughtWithChildren, ['children']),
        childrenMap: {
          ...thoughtWithChildren.childrenMap,
          ...createChildrenMapFromThoughts(Object.values(thoughtWithChildren.children || {})),
        },
      } as Thought)
    : undefined
}

/** Get a thought and its children. O(1). */
export const getThoughtWithChildren = async (id: string): Promise<ThoughtWithChildren | undefined> =>
  db.thoughtIndex.get(id)

/** Gets multiple contexts from the thoughtIndex by ids. O(n). */
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

/** Gets all the helper values. */
export const getHelpers = async () => db.helpers.get({ id: 'EM' })

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
    const lexemesInner = await db.lexemeIndex.bulkGet(intersectionKeys)
    return lexemesInner.map(fromLexemeDb)
  })

  return lexemes
}

/** Logs a message. */
export const log = async ({ message, stack }: { message: string; stack: any }) =>
  db.logs.add({ created: timestamp(), message, stack })

export default initDB
