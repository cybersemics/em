/* eslint-disable @typescript-eslint/no-explicit-any */
// there are multiple function callling it self (recursive) so we just disable the lint error

/* eslint-disable @typescript-eslint/no-use-before-define */
import { IndexeddbPersistence, clearDocument } from 'y-indexeddb'
import * as Y from 'yjs'
import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
import Path from '../../@types/Path'
import PushBatch from '../../@types/PushBatch'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import Timestamp from '../../@types/Timestamp'
import ValueOf from '../../@types/ValueOf'
import { UpdateThoughtsOptions } from '../../actions/updateThoughts'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, ROOT_CONTEXTS, ROOT_PARENT_ID } from '../../constants'
import groupObjectBy from '../../util/groupObjectBy'
import hashThought from '../../util/hashThought'
import mergeBatch from '../../util/mergeBatch'
import nonNull from '../../util/nonNull'
import taskQueue, { TaskQueue } from '../../util/taskQueue'
import throttleConcat from '../../util/throttleConcat'
import { DataProvider } from '../DataProvider'
import { encodeLexemeDocumentName, encodeThoughtDocumentName, parseDocumentName } from './documentNameEncoder'

/**********************************************************************
 * Types
 **********************************************************************/

/** A thought that is persisted to storage. */
interface ThoughtDb {
  // archived
  a?: Timestamp
  // created
  c: Timestamp
  // lastUpdated
  l: Timestamp
  // childrenMap
  m: Index<ThoughtId>
  // parentId
  p: ThoughtId
  // rank
  r: number
  // updatedBy
  u: string
  // value
  v: string
}

/** A Lexeme database type that defines contexts as separate keys. */
type LexemeDb = {
  // created
  c: Timestamp
  // lastUpdated
  l: Timestamp
  // updatedBy
  u: string
  // contexts
  x: Index<true>
} & {
  // mapped to docKey to allow co-location of children in db
  [key in `cx-${string}`]: string | null
}

// YMap takes a generic type representing the union of values
// Individual values must be explicitly type cast, e.g. thoughtMap.get('m') as Y.Map<ThoughtId>
type ThoughtYjs = ValueOf<Omit<ThoughtDb, 'm'>> | Y.Map<ThoughtId>
type LexemeYjs = ValueOf<Omit<LexemeDb, 'x'>> | ThoughtId

/** A partial YMapEvent that can be more easily constructed than a complete YMapEvent. */
interface SimpleYMapEvent<T> {
  target: Y.Map<T>
  transaction: {
    origin: any
  }
}

/** Creates a promise that is resolved with promise.resolve and rejected with promise.reject. */
interface ResolvablePromise<T, E = any> extends Promise<T> {
  resolve: (arg: T) => void
  reject: (err: E) => void
}

export interface ThoughtspaceOptions {
  accessToken: string
  /** Used to seed docKeys, otherwise replicateThought triggered from initializeCursor will fail. */
  cursor: Path | null
  isLexemeLoaded: (key: string, lexeme: Lexeme | undefined) => Promise<boolean>
  isThoughtLoaded: (thought: Thought | undefined) => Promise<boolean>
  onThoughtIDBSynced: (thought: Thought | undefined, options: { background: boolean }) => void
  onError: (message: string, ...objects: any[]) => void
  onProgress: (args: { replicationProgress?: number; savingProgress?: number }) => void
  onThoughtChange: (thought: Thought) => void
  onThoughtReplicated: (id: ThoughtId, thought: Thought | undefined) => void
  onUpdateThoughts: (args: UpdateThoughtsOptions) => void
  tsid: string
  tsidShared: string | null
}

type ThoughtspaceConfig = ThoughtspaceOptions & {
  updateQueue: TaskQueue<void>
}

/**********************************************************************
 * Constants
 **********************************************************************/

/** Number of milliseconds after which to retry a failed IndexeddbPersistence sync. */
const IDB_ERROR_RETRY = 1000

/** Number of milliseconds to throttle dispatching updateThoughts on thought/lexeme change. */
const UPDATE_THOUGHTS_THROTTLE = 100

/** Maps ThoughtDb keys to Thought keys. */
// const thoughtKeyFromDb = {
//   l: 'lastUpdated',
//   m: 'childrenMap',
//   p: 'parentId',
//   r: 'rank',
//   u: 'updatedBy',
//   v: 'value',
//   a: 'archived',
// } as const

/** Maps Thought keys to ThoughtDb keys. */
const thoughtKeyToDb = {
  lastUpdated: 'l',
  childrenMap: 'm',
  parentId: 'p',
  rank: 'r',
  updatedBy: 'u',
  value: 'v',
  archived: 'a',
} as const

/** Maps Lexeme keys to LexemeDb keys. */
const lexemeKeyToDb = {
  created: 'c',
  lastUpdated: 'l',
  contexts: 'x',
  updatedBy: 'u',
} as const

/** Maps LexemeDb keys to Lexeme keys. */
const lexemeKeyFromDb = {
  c: 'created',
  l: 'lastUpdated',
  x: 'contexts',
  u: 'updatedBy',
} as const

/**********************************************************************
 * Helper Functions
 **********************************************************************/

/** Attaches a resolve function to a promise. */
const resolvable = <T, E = any>() => {
  let _resolve: (value: T) => void
  let _reject: (err: E) => void
  const promise = new Promise<T>((resolve, reject) => {
    _resolve = resolve
    _reject = reject
  })
  const p = promise as ResolvablePromise<T, E>
  p.resolve = _resolve!
  p.reject = _reject!
  return promise as ResolvablePromise<T, E>
}

/** Dispatches updateThoughts with all updates in the throttle period. */
const updateThoughtsThrottled = throttleConcat<PushBatch, void>((batches: PushBatch[]) => {
  const merged = batches.reduce(mergeBatch, {
    thoughtIndexUpdates: {},
    lexemeIndexUpdates: {},
    lexemeIndexUpdatesOld: {},
  })

  // dispatch on next tick, since the leading edge is synchronous and can be triggered during a reducer
  setTimeout(() => {
    config.then(({ onUpdateThoughts: updateThoughts }) =>
      updateThoughts?.({ ...merged, local: false, remote: false, repairCursor: true }),
    )
  })
}, UPDATE_THOUGHTS_THROTTLE)

/** Convert a Thought to a ThoughtDb for efficient storage. */
const thoughtToDb = (thought: Thought): ThoughtDb => ({
  c: thought.created,
  l: thought.lastUpdated,
  m: thought.childrenMap,
  p: thought.parentId,
  r: thought.rank,
  u: thought.updatedBy,
  v: thought.value,
  ...(thought.archived ? { a: thought.archived } : null),
})

/**********************************************************************
 * Module variables
 **********************************************************************/

// Map of all YJS thought Docs loaded into memory.
// Keyed by docKey (See docKeys below).
const thoughtDocs = new Map<string, Y.Doc>()
const thoughtPersistence = new Map<string, IndexeddbPersistence>()
// Thoughts retained until freeThought is called. These are thoughts that are replicated in the foreground and kept in Redux State.
const thoughtRetained = new Set<string>()
const thoughtIDBSynced = new Map<string, Promise<unknown>>()
const thoughtWebsocketSynced = new Map<string, Promise<unknown>>()

const lexemeDocs = new Map<string, Y.Doc>()
const lexemePersistence = new Map<string, IndexeddbPersistence>()
// Lexemes retained until freeLexeme is called. These are lexemes that are replicated in the foreground and kept in Redux State.
const lexemeRetained: Set<string> = new Set()
const lexemeIDBSynced = new Map<string, Promise<unknown>>()
const lexemeWebsocketSynced = new Map<string, Promise<unknown>>()

/** Map all known thought ids to document keys. This allows us to co-locate children in a single Doc without changing the DataProvider API. Currently the thought's parentId is used, and a special ROOT_PARENT_ID value for the root and em contexts. */
const docKeys: Map<ThoughtId, string> = new Map([...ROOT_CONTEXTS, EM_TOKEN].map(id => [id, ROOT_PARENT_ID]))

/**********************************************************************
 * Module variables
 **********************************************************************/

/** The thoughtspace config that is resolved after init is called. Used to pass objects and callbacks into the thoughtspace from the UI. After they are initialized, they can be accessed synchronously on the module-level config variable. This avoids timing issues with concurrent replicateChildren calls that need conflict to check if the doc already exists. */
const config = resolvable<ThoughtspaceConfig>()

/** Cache the config for synchronous access. This is needed by replicateChildren to set thoughtDocs synchronously, otherwise it will not be idempotent. */
let configCache: ThoughtspaceConfig

/** Initialize the thoughtspace with event handlers and selectors to call back to the UI. */
export const init = async (options: ThoughtspaceOptions) => {
  const {
    isLexemeLoaded,
    isThoughtLoaded,
    onError,
    onProgress,
    onThoughtChange,
    onThoughtIDBSynced,
    onThoughtReplicated,
    onUpdateThoughts,
  } = options

  const accessToken = await options.accessToken
  const tsid = await options.tsid
  const tsidShared = await options.tsidShared
  const cursor = await options.cursor

  // generate docKeys for cursor, otherwise replicateThought will fail
  if (cursor) {
    cursor.forEach((id, i) => docKeys.set(id, cursor[i - 1] ?? HOME_TOKEN))
  }

  // limit the number of thoughts and lexemes that are updated in the Y.Doc at once
  const updateQueue = taskQueue<void>({
    // concurrency above 16 make the % go in bursts as batches of tasks are processed and awaited all at once
    // this may vary based on # of cores and network conditions
    concurrency: 16,
    onStep: ({ completed, expected, total }) => {
      const estimatedTotal = expected || total
      onProgress({ savingProgress: completed / estimatedTotal })
    },
    onEnd: () => {
      onProgress({ savingProgress: 1 })
    },
    onError: (err: Error) => {
      onError(
        `Oops! That's embarrassing. I was not able to save the last change. You should restart the app to avoid additional data loss. Error: ${err.message}`,
        err,
      )
    },
  })

  configCache = {
    accessToken,
    cursor,
    isLexemeLoaded,
    isThoughtLoaded,
    onError,
    onProgress,
    onThoughtChange,
    onThoughtIDBSynced,
    onThoughtReplicated,
    onUpdateThoughts,
    tsid,
    tsidShared,
    updateQueue,
  }

  config.resolve(configCache)
}

/**********************************************************************
 * Methods
 **********************************************************************/

/** Updates a yjs thought doc. Converts childrenMap to a nested Y.Map for proper children merging. Resolves when transaction is committed and IDB is synced (not when websocket is synced). */
// NOTE: Ids are added to the thought log in updateThoughts for efficiency. If updateThought is ever called outside of updateThoughts, we will need to push individual thought ids here.
export const updateThought = async (id: ThoughtId, thought: Thought): Promise<void> => {
  let docKey = docKeys.get(id)
  let lexemeOldIDBSynced: Promise<unknown> | undefined
  let thoughtOldIDBSynced: Promise<unknown> | undefined
  if (docKey) {
    // When a thought changes parents, we need to delete it from the old parent Doc and update the docKey.
    // Unfortunately, transactions on two different Documents are not atomic, so there is a possibility that one will fail and the other will succeed, resulting in an invalid tree.
    if (docKey !== thought.parentId) {
      const lexemeKey = hashThought(thought.value)
      const lexemeDoc = lexemeDocs.get(lexemeKey)
      if (!lexemeDoc && id !== HOME_TOKEN && id !== EM_TOKEN) {
        // TODO: Why does throwing an error get suppressed?
        console.error(`updateThought: Missing Lexeme doc for thought ${id}`)
        return
      }

      // delete from old parent
      const thoughtDocOld = thoughtDocs.get(docKey)
      thoughtDocOld?.transact(() => {
        const yChildren = thoughtDocOld.getMap<Y.Map<ThoughtYjs>>('children')
        yChildren.delete(id)
        docKey = thought.parentId
        docKeys.set(id, docKey)
      }, thoughtDocOld.clientID)

      // subscribe to thoughtPersistence directly since thoughtIDBSynced can await websocketSynced on new devices
      thoughtOldIDBSynced = thoughtPersistence.get(docKey)?.whenSynced

      // update Lexeme context docKey
      if (lexemeDoc) {
        lexemeDoc.transact(() => {
          const lexemeMap = lexemeDoc.getMap<LexemeYjs>()
          lexemeMap.set(`cx-${id}`, thought.parentId)
        }, lexemeDoc.clientID)
        // subscribe to lexemePersistence directly since lexemeIDBSynced can await websocketSynced on new devices
        lexemeOldIDBSynced = lexemePersistence.get(lexemeKey)?.whenSynced
      }
    }
  } else {
    docKey = thought.parentId
    docKeys.set(id, docKey)
    Object.values(thought.childrenMap).forEach(childId => {
      docKeys.set(childId, id)
    })
  }

  // Get the thought Doc if it has been cached, or initiate a replication.
  // Do not wait for thought to full replicate.
  const thoughtDoc =
    thoughtDocs.get(docKey) ||
    (await new Promise<Y.Doc>(resolve => {
      replicateThought(id, { onDoc: resolve })
    }))

  // subscribe to thoughtPersistence directly since thoughtIDBSynced can await websocketSynced on new devices
  const thoughtNewIdbSynced = thoughtPersistence.get(docKey)?.whenSynced.catch((err: Error) => {
    // AbortError happens if the app is closed during replication.
    // Not sure if the timeout will be preserved, but at least we can retry.
    if (err.name === 'AbortError' || err.message.includes('[AbortError]')) {
      setTimeout(() => {
        updateThought(id, thought)
      }, IDB_ERROR_RETRY)
      return
    }
    config.then(({ onError }) => {
      onError?.(`Error saving thought ${id}: ${err.message}`, err)
    })
  })

  thoughtDoc.transact(() => {
    // Set parent docKey directly on the thought Doc.
    // This is needed to traverse up the ancestor path of tangential contexts.
    const yThought = thoughtDoc.getMap<ThoughtId | null>('thought')
    const parentDocKey =
      thought.parentId === ROOT_PARENT_ID ? null : (docKeys.get(thought.parentId) as ThoughtId | undefined)
    if (parentDocKey === undefined) {
      // TODO: Since pushQueue batchns are no longer merged, this occurs consistently in the CI, but not on local machine.
      console.error(`updateThought: Missing docKey for parent ${thought.parentId} of thought ${id}`)
    } else {
      yThought.set('docKey', parentDocKey)
    }

    const yChildren = thoughtDoc.getMap<Y.Map<ThoughtYjs>>('children')
    if (!yChildren.has(id)) {
      yChildren.set(id, new Y.Map<ThoughtYjs>())
    }
    const thoughtMap = yChildren.get(id)!
    const thoughtDb = thoughtToDb(thought)
    ;(Object.keys(thoughtDb) as (keyof ThoughtDb)[]).forEach(key => {
      // merge childrenMap Y.Map
      if (key === thoughtKeyToDb.childrenMap) {
        const value = thoughtDb[key]
        let childrenMap = thoughtMap.get('childrenMap') as Y.Map<ThoughtId>

        // create new Y.Map for new thought
        if (!childrenMap) {
          childrenMap = new Y.Map()
          thoughtMap.set(thoughtKeyToDb.childrenMap, childrenMap)
        }

        // delete children from the yjs thought that are no longer in the state thought
        childrenMap.forEach((childKey: string, childId: string) => {
          if (!value[childId]) {
            childrenMap.delete(childId)
          }
        })

        // add children that are not in the yjs thought
        Object.entries(thoughtDb[thoughtKeyToDb.childrenMap]).forEach(([key, childId]) => {
          if (!childrenMap.has(key)) {
            childrenMap.set(key, childId)
          }
        })
      }
      // other keys
      else {
        const value = thoughtDb[key]
        // Only set a value if it has changed.
        // Otherwise YJS adds another update.
        if (value !== thoughtMap.get(key)) {
          thoughtMap.set(key, value)
        }
      }
    })
  }, thoughtDoc.clientID)

  await Promise.all([thoughtNewIdbSynced, thoughtOldIDBSynced, lexemeOldIDBSynced])
}

/** Updates a yjs lexeme doc. Converts contexts to a nested Y.Map for proper context merging. Resolves when transaction is committed and IDB is synced (not when websocket is synced). */
// NOTE: Keys are added to the lexeme log in updateLexemes for efficiency. If updateLexeme is ever called outside of updateLexemes, we will need to push individual keys here.
export const updateLexeme = async (
  key: string,
  lexemeNew: Lexeme,
  /** The old Lexeme to determine context deletions. Should be undefined only if Lexeme is completely new. */
  // TODO: Pass the diffed contexts all the way through from updateThoughts.
  // The YJS Lexeme should be the same as the old Lexeme in State, since they are synced.
  // If the Lexeme has not yet been loaded from YJS, then we can ignore deletions, as a Lexeme normally cannot be deleted before it has been loaded. Unless the user creates and deletes the Lexeme so quickly that IDB is still loading (?).
  // In light of all that, it would be better to get the deletions directly from the reducer.
  lexemeOld: Lexeme | undefined,
): Promise<void> => {
  if (!lexemeDocs.has(key)) {
    // TODO: Why is replication awaited here, but not in updateThought?
    await replicateLexeme(key)
  }
  const lexemeDoc = lexemeDocs.get(key)
  const contextsOld = new Set(lexemeOld?.contexts)

  // The Lexeme may be deleted if the user creates and deletes a thought very quickly
  if (!lexemeDoc) return

  // subscribe to lexemePersistence directly since lexemeIDBSynced can await websocketSynced on new devices
  const idbSynced = lexemePersistence.get(key)?.whenSynced.catch((err: Error) => {
    // AbortError happens if the app is closed during replication.
    // Not sure if the timeout will be preserved, but at least we can retry.
    if (err.name === 'AbortError' || err.message.includes('[AbortError]')) {
      setTimeout(() => {
        updateLexeme(key, lexemeNew, lexemeOld)
      }, IDB_ERROR_RETRY)
      return
    }
    config.then(({ onError }) => {
      const message = `Error saving lexeme: ${err.message}`
      console.error(message, lexemeNew)
      onError?.(message, err)
    })
  })

  lexemeDoc.transact(() => {
    const lexemeMap = lexemeDoc.getMap<LexemeYjs>()
    ;(Object.keys(lexemeNew) as (keyof Lexeme)[]).forEach(key => {
      if (key === 'contexts') {
        const value = lexemeNew[key]
        const contextsNew = new Set(value)

        value.forEach(cxid => {
          if (!contextsOld.has(cxid)) {
            const docKey = docKeys.get(cxid)
            if (!docKey) {
              throw new Error(`updateLexeme: Missing docKey for context ${cxid} in Lexeme.`)
            }
            lexemeMap.set(`cx-${cxid}`, docKey)
          }
        })

        // delete contexts that have been deleted, i.e. exist in lexemeOld but not lexemeNew
        lexemeOld?.contexts.forEach(cxid => {
          if (!contextsNew.has(cxid)) {
            lexemeMap.delete(`cx-${cxid}`)
          }
        })
      } else {
        const value = lexemeNew[key]
        // Only set a value if it has changed.
        // Otherwise YJS adds another update.
        if (value !== lexemeMap.get(lexemeKeyToDb[key])) {
          lexemeMap.set(lexemeKeyToDb[key], value)
        }
      }
    })
  }, lexemeDoc.clientID)

  await idbSynced
}

/** Handles the Thought observe event. Ignores events from self. */
const onThoughtChange = (id: ThoughtId) => (e: SimpleYMapEvent<ThoughtYjs>) => {
  const thoughtDoc = e.target.doc!
  if (e.transaction.origin === thoughtDoc.clientID) return

  const thought = getThought(thoughtDoc, id)
  if (!thought) return

  // update docKeys of children
  Object.values(thought.childrenMap).forEach(childId => {
    docKeys.set(childId, id)
  })

  config.then(({ onThoughtChange }) => onThoughtChange?.(thought))
}

/** Handles the Lexeme observe event. Ignores events from self. */
const onLexemeChange = (e: SimpleYMapEvent<LexemeYjs>) => {
  const lexemeDoc = e.target.doc!
  if (e.transaction.origin === lexemeDoc.clientID) return

  const lexeme = getLexeme(lexemeDoc)
  if (!lexeme) return

  // we can assume id is defined since lexeme doc guids are always in the format `${tsid}/lexeme/${id}`
  const { id: key } = parseDocumentName(lexemeDoc.guid) as { id: string }

  updateThoughtsThrottled({
    thoughtIndexUpdates: {},
    lexemeIndexUpdates: {
      [key]: lexeme,
    },
    lexemeIndexUpdatesOld: {},
  })
}

/**
 * Replicates a thought from the persistence layers to state, IDB, and the Websocket server. If already replicating or replicated, resolves as soon as data is available (depends on background/remote params). The Doc can be updated concurrently while replicating.
 *
 * Precondition: docKey of id must be cached.
 *
 * Warning: It is not recommended to run replicateThought in background mode. The Doc is not cached in background mode, so calling replicateThought on multiple siblings will result in multiple replications of the parent.
 */
export const replicateThought = async (
  id: ThoughtId,
  {
    background,
    onDoc,
    remote = true,
  }: {
    /**
     * Replicate in the background, meaning:
     * - Only update Redux state if thought is visible.
     * - Do not cache Doc or providers in memory.
     * - Destroy providers after sync.
     * - If remote is also true, does not resolve until websocket replication is complete (e.g. replicationController).
     */
    background?: boolean
    /** Callback with the doc as soon as it has been instantiated. */
    onDoc?: (doc: Y.Doc) => void
    /** Sync with websocket server. Set to false during export. Default: true. */
    remote?: boolean
  } = {},
): Promise<Thought | undefined> => {
  const docKey = docKeys.get(id)
  if (!docKey) {
    console.warn(`replicateThought: Missing docKey for thought ${id}`);
  }
  const children = await replicateChildren(docKey, { background, onDoc, remote })
  const child = children?.find(child => child.id === id)
  return child
}

/**
 * Replicates all thoughts contained within a Thought doc.
 *
 * @see replicateThought
 */
export const replicateChildren = async (
  docKey: string,
  {
    background,
    onDoc,
    remote = true,
  }: {
    background?: boolean
    onDoc?: (doc: Y.Doc) => void
    remote?: boolean
  } = {},
): Promise<Thought[] | undefined> => {
  // Only await the config promise once. Otherwise the initial call to replicateChildren for a given docKey will not set thoughtDocs synchronously, and we will lose memoization of concurrent calls.
  if (!configCache) {
    await config
  }
  const { onError, onThoughtIDBSynced, tsid } = configCache
  const documentName = encodeThoughtDocumentName(tsid, docKey)
  const doc = thoughtDocs.get(docKey) || new Y.Doc({ guid: documentName })
  onDoc?.(doc)

  // Foreground replication retains the thought in the cache even when replication completes.
  // The thought will only be removed after freeThoughts is called.
  if (!background) {
    thoughtRetained.add(docKey)
  }

  // If the doc is cached, return as soon as the appropriate providers are synced.
  // Disable IDB during tests because of TransactionInactiveError in fake-indexeddb.
  // Disable websocket during tests because of infinite loop in sinon runAllAsync.
  if (thoughtDocs.get(docKey)) {
    // The Doc exists, but it may not be populated yet if replication has not completed.
    // Wait for the appropriate replication to complete before accessing children.
    if (background && remote) {
      await thoughtWebsocketSynced.get(docKey)
    } else {
      await thoughtIDBSynced.get(docKey)
    }

    const children = getChildren(doc)

    // TODO: There may be a bug in freeThought, because we should not have to recreate the docKeys if the doc is already cached.
    // Without this, a missing docKey error will occur if a thought is re-loaded after being deallocated.
    children?.forEach(child => {
      docKeys.set(child.id, docKey)
      Object.values(child.childrenMap).forEach(grandchildId => {
        docKeys.set(grandchildId, child.id)
      })
    })

    return children
  }

  // set up idb and websocket persistence and subscribe to changes
  const persistence = new IndexeddbPersistence(documentName, doc)
  const idbSynced = persistence.whenSynced
    .then(() => {
      const children = getChildren(doc)

      // if idb is empty, then we have to wait for websocketSynced before we can get the docKey
      const parentDocKey =
        docKey === ROOT_PARENT_ID
          ? null
          : docKey === HOME_TOKEN || docKey === EM_TOKEN
            ? ROOT_PARENT_ID
            : doc.getMap<ThoughtId>('thought').get('docKey')
      if (parentDocKey) {
        docKeys.set(docKey as ThoughtId, parentDocKey)
      }

      // update docKeys of children and grandchildren
      children?.forEach(child => {
        docKeys.set(child.id, docKey)
        Object.values(child.childrenMap).forEach(grandchildId => {
          docKeys.set(grandchildId, child.id)
        })
      })

      children?.forEach(child => {
        onThoughtIDBSynced?.(child, { background: !!background })
      })
    })
    .catch((err: Error) => {
      // AbortError happens if the app is closed during replication.
      // Not sure if the timeout will be preserved, but we can at least try to re-replicate.
      if (err.name === 'AbortError' || err.message.includes('[AbortError]')) {
        freeThought(docKey)
        setTimeout(() => {
          replicateChildren(docKey, { background, onDoc, remote })
        }, IDB_ERROR_RETRY)
        return
      }
      onError?.(`Error loading thought ${docKey} from IndexedDB: ${err.message}`, err)
    })

  // Cache docs, promises, and providers
  // Must be done synchronously, before waiting for idbSynced or websocketSynced, so that the cached objects are available immediately for concurrent calls to replicateChildren.
  thoughtDocs.set(docKey, doc)
  thoughtIDBSynced.set(docKey, idbSynced)
  thoughtPersistence.set(docKey, persistence)

  // always wait for IDB to sync
  await idbSynced

  // foreground
  if (!background) {
    // Subscribe to changes after first sync to ensure that pending is set properly.
    // If thought is updated as non-pending first (i.e. before pull), then mergeUpdates will not set pending by design.
    const yChildren = doc.getMap<Y.Map<ThoughtYjs>>('children')
    const childrenEntries = [...(yChildren.entries() as IterableIterator<[ThoughtId, Y.Map<ThoughtYjs>]>)]
    childrenEntries.forEach(([childId, thoughtMap]) => {
      thoughtMap.observe(onThoughtChange(childId))
    })
  }
  const children = getChildren(doc)

  // If the thought is not retained by foreground replication, deallocate it.
  tryDeallocateThought(docKey)

  return children
}

/** Replicates a Lexeme from the persistence layers to state, IDB, and the Websocket server. Does nothing if the Lexeme is already replicated, or is being replicated. Otherwise creates a new, empty YDoc that can be updated concurrently while syncing. */
export const replicateLexeme = async (
  key: string,
  {
    background,
  }: {
    /**
     * Do not store thought doc in memory.
     * Do not update thoughtIndex.
     * Destroy IndexedDBPersistence after sync.
     */
    background?: boolean
  } = {},
): Promise<Lexeme | undefined> => {
  // special contexts do not have Lexemes
  // Redux state will store dummy Lexemes with empty contexts, but there is no reason to try to replicate them
  if (key === HOME_TOKEN || key === EM_TOKEN || key === ABSOLUTE_TOKEN) return undefined

  // Do not await config if it is already cached. Otherwise the initial call to replicateLexeme will not set thoughtDocs synchronously and concurrent calls to replicateLexeme will not be idempotent.
  if (!configCache) {
    await config
  }
  const { onError, tsid } = configCache
  const documentName = encodeLexemeDocumentName(tsid, key)
  const doc = lexemeDocs.get(key) || new Y.Doc({ guid: documentName })
  const lexemeMap = doc.getMap<LexemeYjs>()

  // Foreground replication retains the lexeme in the cache even when replication completes.
  // The lexeme will only be removed after freeLexeme is called.
  if (!background) {
    lexemeRetained.add(key)
  }

  // If the doc is cached, return as soon as the appropriate providers are synced.
  // Disable IDB during tests because of TransactionInactiveError in fake-indexeddb.
  // Disable websocket during tests because of infinite loop in sinon runAllAsync.
  if (lexemeDocs.get(key)) {
    if (background) {
      await lexemeWebsocketSynced.get(key)
    } else {
      await lexemeIDBSynced.get(key)
    }

    return getLexeme(doc)
  }

  // set up idb and websocket persistence and subscribe to changes
  const persistence = new IndexeddbPersistence(documentName, doc)

  // if replicating in the background, destroy the IndexeddbProvider once synced
  const idbSynced = persistence.whenSynced.catch((err: Error) => {
    // AbortError happens if the app is closed during replication.
    // Not sure if the timeout will be preserved, but we can at least try to re-replicate.
    if (err.name === 'AbortError' || err.message.includes('[AbortError]')) {
      freeLexeme(key)
      setTimeout(() => {
        replicateLexeme(key, { background })
      }, IDB_ERROR_RETRY)
      return
    }
    onError?.(`Error loading lexeme ${key}: ${err.message}`, err)
  }) as Promise<void>

  // Cache docs, promises, and providers
  // Must be done synchronously, before waiting for idbSynced or websocketSynced, so that the cached objects are available immediately for concurrent calls to replicateChildren.
  lexemeDocs.set(key, doc)
  lexemeIDBSynced.set(key, idbSynced)
  lexemePersistence.set(key, persistence)

  // always wait for IDB to sync
  await idbSynced

  // foreground
  if (!background) {
    // subscribe to changes after idbSynced since foreground replicated lexemes are already updated through pull
    lexemeMap.observe(onLexemeChange)
  }

  // get the Lexeme before we destroy the Doc
  const lexeme = getLexeme(doc)
  const lexemeRaw = lexemeMap.toJSON() as Index<LexemeYjs>

  // set docKey from Lexeme context to allow tangential contexts to be loaded
  ;(Object.keys(lexemeRaw) as (keyof LexemeDb | `cx-${string}`)[]).forEach(key => {
    const cxid = key.split('cx-')[1] as ThoughtId | undefined

    if (cxid) {
      const docKey = lexemeRaw[key as `cx-${string}`] as ThoughtId
      docKeys.set(cxid, docKey)
    }
  })

  // If the lexeme is not retained by foreground replication, deallocate it.
  tryDeallocateLexeme(key)

  return lexeme
}

/** Gets all children from a thought Y.Doc. Returns undefined if the doc does not exist. */
const getChildren = (thoughtDoc: Y.Doc | undefined): Thought[] | undefined => {
  if (!thoughtDoc) return undefined

  // If docKey is not set, then the doc does not exist.
  // It is important to return undefined here instead of an empty array so that the caller (specifically, replicateChildren) can distinguish between a non-existent thought and a synced thought with no children. It uses that to force remote replication to wait for websocketSynced on the initial replication.
  const yThought = thoughtDoc.getMap<ThoughtId | null>('thought')
  if (!yThought.has('docKey')) return undefined

  const yChildren = thoughtDoc.getMap<Y.Map<ThoughtYjs>>('children')

  return [...(yChildren.keys() as IterableIterator<ThoughtId>)].map(id => getThought(thoughtDoc, id)).filter(nonNull)
}

/** Gets a Thought from a thought Y.Doc. */
const getThought = (thoughtDoc: Y.Doc | undefined, id: ThoughtId): Thought | undefined => {
  if (!thoughtDoc) return
  const yChildren = thoughtDoc.getMap<Y.Map<ThoughtYjs>>('children')
  const thoughtMap = yChildren.get(id)
  if (!thoughtMap || thoughtMap.size === 0) return
  const thoughtRaw = thoughtMap.toJSON() as Omit<ThoughtDb, 'm'> & {
    // TODO: Why is childrenMap sometimes a YMap and sometimes a plain object?
    // toJSON is not recursive so we need to toJSON childrenMap as well
    // It is possible that this was fixed in later versions of yjs after v13.5.41
    [thoughtKeyToDb.childrenMap]: Y.Map<ThoughtId> | Index<ThoughtId>
  }
  return {
    childrenMap:
      thoughtRaw[thoughtKeyToDb.childrenMap] instanceof Y.Map
        ? (thoughtRaw[thoughtKeyToDb.childrenMap] as Y.Map<ThoughtId>).toJSON()
        : (thoughtRaw[thoughtKeyToDb.childrenMap] as Index<ThoughtId>),
    created: thoughtRaw.c,
    id,
    lastUpdated: thoughtRaw.l,
    parentId: thoughtRaw.p,
    rank: thoughtRaw.r,
    updatedBy: thoughtRaw.u,
    value: thoughtRaw.v,
    ...(thoughtRaw.a ? { archived: thoughtRaw.a } : null),
  }
}

/** Gets a Lexeme from a lexeme Y.Doc. */
// SIDE EFFECT: Sets docKeys for contexts.
const getLexeme = (lexemeDoc: Y.Doc | undefined): Lexeme | undefined => {
  if (!lexemeDoc) return
  const lexemeMap = lexemeDoc.getMap<LexemeYjs>()
  if (lexemeMap.size === 0) return
  const lexemeRaw = lexemeMap.toJSON() as Index<LexemeYjs>

  // convert LexemeDb to Lexeme
  // Lexeme is bult up one key at a time, so accum is a Partial<Lexeme> while the final value is assumed to be a complete Lexeme
  const lexeme = (Object.keys(lexemeRaw) as (keyof LexemeDb | `cx-${string}`)[]).reduce<Partial<Lexeme>>(
    (acc, key) => {
      const cxid = key.split('cx-')[1] as ThoughtId | undefined

      // Set docKey from Lexeme context to allow tangential contexts to be loaded.
      if (cxid) {
        return {
          ...acc,
          contexts: [...(acc.contexts || []), cxid],
        }
      } else {
        const keyNonContext = key as Exclude<keyof LexemeDb, `cx-${string}`>
        const value = lexemeRaw[keyNonContext]
        return {
          ...acc,
          [lexemeKeyFromDb[keyNonContext]]: value,
        }
      }
    },
    { contexts: [] },
  ) as Lexeme

  return lexeme
}

/** Waits until the thought finishes replicating, then deallocates the cached thought and associated providers (without permanently deleting the persisted data). */
// Note: freeThought and deleteThought are the only places where we use the id as the docKey directly.
// This is because we want to free all of the thought's children, not the thought's siblings, which are contained in the parent Doc accessed via docKeys.
export const freeThought = async (docKey: string): Promise<void> => {
  thoughtRetained.delete(docKey)

  // wait for idb replication, otherwise the deletion may not be saved to disk
  await thoughtIDBSynced.get(docKey)

  // TODO: How to prevent background replication from getting interrupted by editing? If a user edits a thought while its lexeme is being replicated in the background, then the provider will be destroyed and replication will halt. It should not affect the replication cursors, but will require a refresh to resume.
  // However, we cannot wait for websocketSynced when offline.
  // await thoughtWebsocketSynced.get(docKey)

  // if the thought is retained again, it means it has been replicated in the foreground, and tryDeallocateThought will be a noop.
  await tryDeallocateThought(docKey)
}

/** Deallocates the cached thought and associated providers (without permanently deleting the persisted data). If the thought is retained, noop. Call freeThought to both safely unretain the thought and trigger deallocation when replication completes. */
const tryDeallocateThought = async (docKey: string): Promise<void> => {
  if (thoughtRetained.has(docKey)) return

  // Destroying the doc does not remove top level shared type observers, so we need to unobserve onLexemeChange.
  // YJS logs an error if the event handler does not exist, which can occur when rapidly deleting thoughts.
  // Unfortunately there is no way to catch this, since YJS logs it directly to the console, so we have to override the YJS internals.
  // https://github.com/yjs/yjs/blob/5db1eed181b70cb6a6d7eab66c7e6d752f70141a/src/utils/EventHandler.js#L58
  // const yChildren = thoughtDocs.get(id)?.getMap<Y.Map<ThoughtYjs>>('children')
  // yChildren?.forEach(thoughtMap => {
  //   const listeners = thoughtMap?._eH.l.slice(0) || []
  //   if (listeners.some(l => l === onThoughtChange)) {
  //     thoughtMap?.unobserve(onThoughtChange)
  //   }
  // })

  // Remove children docKeys.
  // They may have already been deleted by deleteThought, but we need to also delete them here to handle thought deallocation independent from delete.
  // TODO: Why is not safe to remove the thought docKey here? Doing that causes replication on a new device to throw "Missing docKey for thought".
  const thoughtDoc = thoughtDocs.get(docKey)
  const yChildren = thoughtDoc?.getMap<Y.Map<ThoughtYjs>>('children')
  yChildren?.forEach(thoughtMap => {
    const childId = thoughtMap.get('id') as ThoughtId
    docKeys.delete(childId)
  })

  // Destroy doc and websocket provider.
  // IndexedDB provider is automatically destroyed when the Doc is destroyed
  thoughtDocs.get(docKey)?.destroy()

  // delete from cache
  thoughtDocs.delete(docKey)
  thoughtPersistence.delete(docKey)
  thoughtIDBSynced.delete(docKey)
  thoughtWebsocketSynced.delete(docKey)
}

/** Deletes a thought and clears the doc from IndexedDB. Resolves when local database is deleted. */
const deleteThought = async (docKey: string): Promise<void> => {
  // freeThought and deleteThought are the only places where we use the id as the docKey directly.
  // This is because we want to free all of the thought's children, not the thought's siblings, which are contained in the parent Doc accessed via docKeys.

  const { tsid } = await config
  const persistence = thoughtPersistence.get(docKey)

  // delete thought from parent
  const docKeyParent = docKeys.get(docKey as ThoughtId)
  if (docKeyParent) {
    const docParent = thoughtDocs.get(docKeyParent)
    const yChildren = docParent?.getMap<Y.Map<ThoughtYjs>>('children')
    yChildren?.delete(docKey)
  }

  // delete children docKeys here since freeThought will no longer have access to the deleted children
  docKeys.delete(docKey as ThoughtId)
  const children = getChildren(thoughtDocs.get(docKey))
  children?.forEach(child => {
    docKeys.delete(child.id)
  })

  try {
    // if there is no persistence in memory (e.g. because the thought has not been loaded or has been deallocated by freeThought), then we need to manually delete it from the db
    const deleted = persistence ? persistence.clearData() : clearDocument(encodeThoughtDocumentName(tsid, docKey))
    await freeThought(docKey)
    await deleted
  } catch (e: any) {
    // Ignore NotFoundError, which indicates that the object stores have already been deleted.
    // This is currently expected on load, when the thoughtReplicationCursor is synced with the doclog
    // TODO: Update the thoughtReplicationCursor immediateley rather than waiting till the next reload (is the order of updates preserved even when integrating changes from other clients?)
    if (e.name !== 'NotFoundError') {
      throw e
    }
  }
}

/** Waits until the lexeme finishes replicating, then deallocates the cached lexeme and associated providers (without permanently deleting the persisted data). */
export const freeLexeme = async (key: string): Promise<void> => {
  lexemeRetained.delete(key)
  await lexemeIDBSynced.get(key)

  // TODO: See freeThought for problems with awaiting websocketSynced.
  // await lexemeWebsocketSynced.get(key)

  // if the lexeme is retained again, it means it has been replicated in the foreground, and tryDeallocateLexeme will be a noop.
  await tryDeallocateLexeme(key)
}

/** Deallocates the cached lexeme and associated providers (without permanently deleting the persisted data). If the lexeme is retained, noop. Call freeLexeme to both safely unretain the lexeme and trigger deallocation when replication completes. */
const tryDeallocateLexeme = async (key: string): Promise<void> => {
  if (lexemeRetained.has(key)) return

  // Destroying the doc does not remove top level shared type observers, so we need to unobserve onLexemeChange.
  // YJS logs an error if the event handler does not exist, which can occur when rapidly deleting thoughts.
  // Unfortunately there is no way to catch this, since YJS logs it directly to the console, so we have to override the YJS internals.
  // https://github.com/yjs/yjs/blob/5db1eed181b70cb6a6d7eab66c7e6d752f70141a/src/utils/EventHandler.js#L58
  const lexemeMap: Y.Map<LexemeYjs> | undefined = lexemeDocs.get(key)?.getMap<LexemeYjs>()
  const listeners = lexemeMap?._eH.l.slice(0) || []
  if (listeners.some(l => l === onLexemeChange)) {
    lexemeMap?.unobserve(onLexemeChange)
  }

  // IndeeddbPersistence is automatically destroyed when the Doc is destroyed
  lexemeDocs.get(key)?.destroy()
  lexemeDocs.delete(key)
  lexemePersistence.delete(key)
  lexemeIDBSynced.delete(key)
  lexemeWebsocketSynced.delete(key)
}

/** Deletes a Lexeme and clears the doc from IndexedDB. The server-side doc will eventually get deleted by the doclog replicationController. Resolves when the local database is deleted. */
const deleteLexeme = async (key: string): Promise<void> => {
  const { tsid } = await config
  const persistence = lexemePersistence.get(key)

  // When deleting a Lexeme, clear out the contexts first to ensure that if a new Lexeme with the same key gets created, it doesn't accidentally pull the old contexts.
  const lexemeOld = getLexeme(lexemeDocs.get(key) || persistence?.doc)
  if (lexemeOld) {
    await updateLexeme(key, { ...lexemeOld, contexts: [] }, lexemeOld)
  }

  try {
    // if there is no persistence in memory (e.g. because the thought has not been loaded or has been deallocated by freeThought), then we need to manually delete it from the db
    const deleted = persistence ? persistence.clearData() : clearDocument(encodeLexemeDocumentName(tsid, key))
    await freeLexeme(key)
    await deleted
  } catch (e: any) {
    // See: deleteThought NotFoundError handler
    if (e.name !== 'NotFoundError') {
      throw e
    }
  }
}

/** Updates shared thoughts and lexemes. Resolves when IDB is synced (not when websocket is synced). */
// Note: Does not await updates, but that could be added.
export const updateThoughts = async ({
  thoughtIndexUpdates,
  lexemeIndexUpdates,
  lexemeIndexUpdatesOld,
}: {
  thoughtIndexUpdates: Index<Thought | null>
  lexemeIndexUpdates: Index<Lexeme | null>
  lexemeIndexUpdatesOld: Index<Lexeme | undefined>
  schemaVersion: number
}) => {
  const { updateQueue } = await config

  // group thought updates and deletes so that we can use the db bulk functions
  const { update: thoughtUpdates, delete: thoughtDeletes } = groupObjectBy(thoughtIndexUpdates, (id, thought) =>
    thought ? 'update' : 'delete',
  ) as {
    update?: Index<Thought>
    delete?: Index<null>
  }

  // group lexeme updates and deletes so that we can use the db bulk functions
  const { update: lexemeUpdates, delete: lexemeDeletes } = groupObjectBy(lexemeIndexUpdates, (id, lexeme) =>
    lexeme ? 'update' : 'delete',
  ) as {
    update?: Index<Lexeme>
    delete?: Index<null>
  }

  // update
  await updateQueue.add([
    ...Object.entries(thoughtUpdates || {}).map(
      ([id, thought]) =>
        () =>
          updateThought(id as ThoughtId, thought),
    ),
    ...Object.entries(lexemeUpdates || {}).map(
      ([key, lexeme]) =>
        () =>
          updateLexeme(key, lexeme, lexemeIndexUpdatesOld[key]),
    ),
  ])

  // delete
  await updateQueue.add([
    ...(Object.keys(thoughtDeletes || {}) as ThoughtId[]).map(id => () => deleteThought(id)),
    ...Object.keys(lexemeDeletes || {}).map(key => () => deleteLexeme(key)),
  ])
}

/** Clears all thoughts and lexemes from the db. */
export const clear = async () => {
  const deleteThoughtPromises = Array.from(thoughtDocs, ([id]) => deleteThought(id as ThoughtId))
  const deleteLexemePromises = Array.from(lexemeDocs, ([key]) => deleteLexeme(key))

  await Promise.all([...deleteThoughtPromises, ...deleteLexemePromises])

  // TODO: reset to initialState, otherwise a missing ROOT error will occur when thought observe is triggered
  // const state = initialState()
  // const thoughtIndexUpdates = keyValueBy(state.thoughts.thoughtIndex, (id, thought) => ({
  //   [id]: thoughtToDb(thought),
  // }))
  // const lexemeIndexUpdates = state.thoughts.lexemeIndex

  // await updateThoughts({
  //   thoughtIndexUpdates,
  //   lexemeIndexUpdates,
  //   lexemeIndexUpdatesOld: {},
  //   schemaVersion: SCHEMA_LATEST,
  // })
}

/** Gets a thought from the thoughtIndex. Replicates the thought if not already done. */
export const getLexemeById = (key: string) => replicateLexeme(key)

/** Gets multiple thoughts from the lexemeIndex by key. */
export const getLexemesByIds = (keys: string[]): Promise<(Lexeme | undefined)[]> => Promise.all(keys.map(getLexemeById))

/** Gets a thought from the thoughtIndex. Replicates the thought if not already done. */
export const getThoughtById = async (id: ThoughtId): Promise<Thought | undefined> => {
  await replicateThought(id)
  const docKey = docKeys.get(id)
  return getThought(thoughtDocs.get(docKey!), id)
}

/** Gets multiple contexts from the thoughtIndex by ids. O(n). */
export const getThoughtsByIds = (ids: ThoughtId[]): Promise<(Thought | undefined)[]> =>
  Promise.all(ids.map(getThoughtById))

const db: DataProvider = {
  clear,
  freeLexeme,
  freeThought,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtsByIds,
  updateThoughts,
}

export default db
