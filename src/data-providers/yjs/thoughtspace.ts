/** Thoughtspace worker accessed from the main thread via thoughtspace.main.ts. */
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider'
import { nanoid } from 'nanoid'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import DocLogAction from '../../@types/DocLogAction'
import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
import LexemeDb from '../../@types/LexemeDb'
import Path from '../../@types/Path'
import PushBatch from '../../@types/PushBatch'
import ReplicationCursor from '../../@types/ReplicationCursor'
import Storage from '../../@types/Storage'
import Thought from '../../@types/Thought'
import ThoughtDb from '../../@types/ThoughtDb'
import ThoughtId from '../../@types/ThoughtId'
import ValueOf from '../../@types/ValueOf'
import WebsocketStatus from '../../@types/WebsocketStatus'
import { EM_TOKEN, HOME_TOKEN, ROOT_CONTEXTS, ROOT_PARENT_ID, WEBSOCKET_CONNECTION_TIME } from '../../constants'
import { UpdateThoughtsOptions } from '../../reducers/updateThoughts'
import cancellable from '../../util/cancellable'
import groupObjectBy from '../../util/groupObjectBy'
import hashThought from '../../util/hashThought'
import mergeBatch from '../../util/mergeBatch'
import taskQueue, { TaskQueue } from '../../util/taskQueue'
import thoughtToDb from '../../util/thoughtToDb'
import throttleConcat from '../../util/throttleConcat'
import when from '../../util/when'
import { DataProvider } from '../DataProvider'
import {
  encodeDocLogBlockDocumentName,
  encodeDocLogDocumentName,
  encodeLexemeDocumentName,
  encodeThoughtDocumentName,
  parseDocumentName,
} from './documentNameEncoder'
import replicationController from './replicationController'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { clearDocument } = require('y-indexeddb') as { clearDocument: (name: string) => Promise<void> }

/**********************************************************************
 * Types
 **********************************************************************/

// YMap takes a generic type representing the union of values
// Individual values must be explicitly type cast, e.g. thoughtMap.get('childrenMap') as Y.Map<ThoughtId>
type ThoughtYjs = ValueOf<Omit<ThoughtDb, 'childrenMap'> & { childrenMap: Y.Map<ThoughtId> }>
type LexemeYjs = ValueOf<Omit<LexemeDb, 'contexts'> & { contexts: Y.Map<true> }>

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
  onError: (message: string, objects: any[]) => void
  onProgress: (args: { replicationProgress?: number; savingProgress?: number }) => void
  onThoughtChange: (thought: Thought) => void
  onThoughtReplicated: (id: ThoughtId, thought: Thought | undefined) => void
  onUpdateThoughts: (args: UpdateThoughtsOptions) => void
  getItem: Storage<Index<ReplicationCursor>>['getItem']
  setItem: Storage<Index<ReplicationCursor>>['setItem']
  tsid: string
  tsidShared: string | null
  websocketUrl: string
}

type ThoughtspaceConfig = ThoughtspaceOptions & {
  replication: ReturnType<typeof replicationController>
  updateQueue: TaskQueue<void>
  websocket: HocuspocusProviderWebsocket
}

/**********************************************************************
 * Constants
 **********************************************************************/

/** Number of milliseconds after which to retry a failed IndexeddbPersistence sync. */
const IDB_ERROR_RETRY = 1000

/** Number of milliseconds to throttle dispatching updateThoughts on thought/lexeme change. */
const UPDATE_THOUGHTS_THROTTLE = 100

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
    config.then(
      ({ onUpdateThoughts: updateThoughts }) =>
        updateThoughts?.({ ...merged, local: false, remote: false, repairCursor: true }),
    )
  })
}, UPDATE_THOUGHTS_THROTTLE)

/**********************************************************************
 * Module variables
 **********************************************************************/

// Map of all YJS thought Docs loaded into memory.
// Keyed by docKey (See docKeys below).
const thoughtDocs: Map<string, Y.Doc> = new Map()
const thoughtPersistence: Map<string, IndexeddbPersistence> = new Map()
const thoughtWebsocketProvider: Map<string, HocuspocusProvider> = new Map()
const thoughtIDBSynced: Map<string, Promise<unknown>> = new Map()
const thoughtWebsocketSynced: Map<string, Promise<unknown>> = new Map()
/** Cache a promise of the replicateChildren result for subsequent calls. This is a temporary memoization that is cleared when replication completes. Use the appropriate local/remote cache, since remote replication may never resolve. */
const thoughtReplicating: {
  // IDB
  local: Map<string, Promise<void>>
  // websocket
  remote: Map<string, Promise<void>>
} = {
  local: new Map(),
  remote: new Map(),
}
const lexemeDocs: Map<string, Y.Doc> = new Map()
const lexemePersistence: Map<string, IndexeddbPersistence> = new Map()
const lexemeWebsocketProvider: Map<string, HocuspocusProvider> = new Map()
const lexemeIDBSynced: Map<string, Promise<unknown>> = new Map()
const lexemeWebsocketSynced: Map<string, Promise<unknown>> = new Map()
/** Cache a promise of the replicateLexeme result for subsequent calls. This is a temporary memoization that is cleared when replication completes. */
const lexemeReplicating: Map<string, Promise<Lexeme | undefined>> = new Map()

/** Map all known thought ids to document keys. This allows us to co-locate children in a single Doc without changing the DataProvider API. Currently the thought's parentId is used, and a special ROOT_PARENT_ID value for the root and em contexts. */
const docKeys: Map<ThoughtId, string> = new Map([...ROOT_CONTEXTS, EM_TOKEN].map(id => [id, ROOT_PARENT_ID]))

// doclog is an append-only log of all thought ids and lexeme keys that are updated.
// Since Thoughts and Lexemes are stored in separate docs, we need a unified list of all ids to replicate.
// They are stored as Y.Arrays to allow for replication deltas instead of repeating full replications, and regular compaction.
// Deletes must be marked, otherwise there is no way to differentiate it from an update (because there is no way to tell if a websocket has no data for a thought, or just has not yet returned any data.)
let doclog: Y.Doc

/**********************************************************************
 * Module variables
 **********************************************************************/

/** The thoughtspace config that is resolved after init is called. Mainly used to pass objects and callbacks into the worker that it cannot access natively, e.g. localStorage. After they are initialized, they can be accessed synchronously on the module-level config variable. This avoids timing issues with concurrent replicateChildren calls that need conflict to check if the doc already exists. */
const config = resolvable<ThoughtspaceConfig>()

/** Cache the config for synchronous access. This is needed by replicateChildren to set thoughtDocs synchronously, otherwise it will not be idempotent. */
let configCache: ThoughtspaceConfig

/** Initialize the thoughtspace with a storage module; localStorage cannot be accessed from within a web worker, so we need the caller to pass in the tsid and access token. */
export const init = async (options: ThoughtspaceOptions) => {
  const {
    isLexemeLoaded,
    isThoughtLoaded,
    getItem,
    setItem,
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
  const websocketUrl = await options.websocketUrl
  const cursor = await options.cursor

  // generate docKeys for cursor, otherwise replicateThought will fail
  if (cursor) {
    cursor.forEach((id, i) => docKeys.set(id, cursor[i - 1] ?? HOME_TOKEN))
  }

  // websocket provider
  // TODO: Reuse websocket connection from ./index?
  const websocket = new HocuspocusProviderWebsocket({ url: websocketUrl })

  doclog = new Y.Doc({ guid: encodeDocLogDocumentName(tsid) })

  // bind blocks to providers on load
  doclog.on('subdocs', ({ added, removed, loaded }: { added: Set<Y.Doc>; removed: Set<Y.Doc>; loaded: Set<Y.Doc> }) => {
    loaded.forEach((subdoc: Y.Doc) => {
      const persistence = new IndexeddbPersistence(subdoc.guid, subdoc)
      persistence.whenSynced
        .then(() => {
          // eslint-disable-next-line no-new
          new HocuspocusProvider({
            // disable awareness for performance
            // doclog doc has awareness enabled to keep the websocket open
            awareness: null,
            websocketProvider: websocket,
            name: subdoc.guid,
            document: subdoc,
            token: accessToken,
          })
        })
        .catch(e => {
          const errorMessage = `Error loading doclog block: ${e.message}`
          onError?.(errorMessage, e)
        })
    })
  })

  const doclogPersistence = new IndexeddbPersistence(encodeDocLogDocumentName(tsid), doclog)
  doclogPersistence.whenSynced
    .then(() => {
      const blocks = doclog.getArray<Y.Doc>('blocks')
      // The doclog's initial block must be created outside the replicationController, after IDB syncs. This is necessary to avoid creating a new block when one already exists.
      // Do not create a starting block if this is shared from another device.
      // We need to wait for the existing block(s) to load.
      if (blocks.length === 0 && !tsidShared) {
        const blockNew = new Y.Doc({ guid: encodeDocLogBlockDocumentName(tsid, nanoid(13)) })

        // eslint-disable-next-line fp/no-mutating-methods
        blocks.push([blockNew])
      }

      // eslint-disable-next-line no-new
      new HocuspocusProvider({
        // doclog doc has awareness enabled to keep the websocket open
        // disable awareness for all other websocket providers
        websocketProvider: websocket,
        name: encodeDocLogDocumentName(tsid),
        document: doclog,
        token: accessToken,
      })
    })
    .catch(e => {
      const errorMessage = `Error loading doclog: ${e.message}`
      onError?.(errorMessage, e)
    })

  const replication = replicationController({
    // begin paused, and only start after initial pull has completed
    autostart: false,
    doc: doclog,
    storage: {
      getItem,
      setItem,
    },
    next: async ({
      action,
      /** Update actions use docKey as id. Delete actions will use thoughtId as id. */
      id,
      type,
    }) => {
      if (action === DocLogAction.Update) {
        await (type === 'thought'
          ? replicateChildren(id as ThoughtId, { background: true })
          : replicateLexeme(id, { background: true }))
      } else if (action === DocLogAction.Delete) {
        updateThoughtsThrottled({
          thoughtIndexUpdates: {},
          lexemeIndexUpdates: {},
          // override thought/lexemeIndexUpdates based on type
          [`${type}IndexUpdates`]: {
            [id]: null,
          },
          lexemeIndexUpdatesOld: {},
        })

        if (type === 'thought') {
          await deleteThought(id as ThoughtId)
        } else if (type === 'lexeme') {
          await deleteLexeme(id)
        }
      } else {
        throw new Error('Unknown DocLogAction: ' + action)
      }
    },
    onStep: ({ completed, index, total, value }) => {
      onProgress({ replicationProgress: completed / total })
    },
    onEnd: () => {
      onProgress({ replicationProgress: 1 })
    },
  })

  // limit the number of thoughts and lexemes that are updated in the Y.Doc at once
  const updateQueue = taskQueue<void>({
    // concurrency above 16 make the % go in bursts as batches of tasks are processed and awaited all at once
    // this may vary based on # of cores and network conditions
    concurrency: 16,
    onStep: ({ completed, total }) => {
      onProgress({ savingProgress: completed / total })
    },
    onEnd: () => {
      onProgress({ savingProgress: 1 })
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
    replication,
    getItem,
    setItem,
    tsid,
    tsidShared,
    updateQueue,
    websocket,
    websocketUrl,
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
  let lexemeIdbSynced: Promise<unknown> | undefined
  let thoughtOldIdbSynced: Promise<unknown> | undefined
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
      thoughtOldIdbSynced = thoughtPersistence.get(docKey)?.whenSynced

      // update Lexeme context docKey
      if (lexemeDoc) {
        lexemeDoc.transact(() => {
          const lexemeMap = lexemeDoc.getMap<LexemeYjs>()
          lexemeMap.set(`cx-${id}`, thought.parentId)
        }, lexemeDoc.clientID)
        lexemeIdbSynced = lexemePersistence.get(lexemeKey)?.whenSynced
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

  const thoughtIdbSynced = thoughtPersistence.get(docKey)?.whenSynced.catch(e => {
    // AbortError happens if the app is closed during replication.
    // Not sure if the timeout will be preserved, but at least we can retry.
    if (e.name === 'AbortError' || e.message.includes('[AbortError]')) {
      setTimeout(() => {
        updateThought(id, thought)
      }, IDB_ERROR_RETRY)
      return
    }
    config.then(({ onError }) => {
      onError?.(`Error saving thought ${id}: ${e.message}`, e)
    })
  })

  thoughtDoc.transact(() => {
    // Set parent docKey directly on the thought Doc.
    // This is needed to traverse up the ancestor path of tangential contexts.
    const yThought = thoughtDoc.getMap<ThoughtId | null>('thought')
    const parentDocKey =
      thought.parentId === ROOT_PARENT_ID ? null : (docKeys.get(thought.parentId) as ThoughtId | undefined)
    if (parentDocKey === undefined) {
      throw new Error(`updateThought: Missing docKey for parent ${thought.parentId} of thought ${id}`)
    }
    yThought.set('docKey', parentDocKey)

    const yChildren = thoughtDoc.getMap<Y.Map<ThoughtYjs>>('children')
    if (!yChildren.has(id)) {
      yChildren.set(id, new Y.Map<ThoughtYjs>())
    }
    const thoughtMap = yChildren.get(id)!
    Object.entries(thoughtToDb(thought)).forEach(([key, value]) => {
      // merge childrenMap Y.Map
      if (key === 'childrenMap') {
        let childrenMap = thoughtMap.get('childrenMap') as Y.Map<ThoughtId>

        // create new Y.Map for new thought
        if (!childrenMap) {
          childrenMap = new Y.Map()
          thoughtMap.set('childrenMap', childrenMap)
        }

        // delete children from the yjs thought that are no longer in the state thought
        childrenMap.forEach((childKey: string, childId: string) => {
          if (!value[childId]) {
            childrenMap.delete(childId)
          }
        })

        // add children that are not in the yjs thought
        Object.entries(thought.childrenMap).forEach(([key, childId]) => {
          if (!childrenMap.has(key)) {
            childrenMap.set(key, childId)
          }
        })
      }
      // other keys
      else {
        // Only set a value if it has changed.
        // Otherwise YJS adds another update.
        if (value !== thoughtMap.get(key)) {
          thoughtMap.set(key, value)
        }
      }
    })
  }, thoughtDoc.clientID)

  await Promise.all([thoughtIdbSynced, thoughtOldIdbSynced, lexemeIdbSynced])
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
  const lexemeReplicated = getLexeme(lexemeDoc)
  const contextsOld = new Set(lexemeOld?.contexts)

  // The Lexeme may be deleted if the user creates and deletes a thought very quickly
  if (!lexemeDoc) return

  const idbSynced = lexemePersistence.get(key)?.whenSynced.catch(e => {
    // AbortError happens if the app is closed during replication.
    // Not sure if the timeout will be preserved, but at least we can retry.
    if (e.name === 'AbortError' || e.message.includes('[AbortError]')) {
      setTimeout(() => {
        updateLexeme(key, lexemeNew, lexemeOld)
      }, IDB_ERROR_RETRY)
      return
    }
    config.then(({ onError }) => {
      onError?.(`Error saving lexeme ${lexemeNew.lemma}: ${e.message}`, e)
    })
  })

  lexemeDoc.transact(() => {
    const lexemeMap = lexemeDoc.getMap<LexemeYjs>()
    Object.entries(lexemeNew).forEach(([key, value]) => {
      if (key === 'contexts') {
        const contextsNew = new Set(value)

        // add contexts to YJS that have been added to state
        lexemeNew.contexts.forEach(cxid => {
          if (!contextsOld.has(cxid)) {
            const docKey = docKeys.get(cxid)
            if (!docKey) {
              throw new Error(`updateLexeme: Missing docKey for context ${cxid} in Lexeme ${lexemeNew.lemma}`)
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
      }
      // other keys
      else {
        // Only set a value if it has changed.
        // Otherwise YJS adds another update.
        if (value !== lexemeMap.get(key)) {
          lexemeMap.set(key, value)
        }
      }
    })

    // If the Lexeme was pending, we need to update state with the new Lexeme with merged cxids.
    // Otherwise, Redux state can become out of sync with YJS, and additional edits can result in missing Lexeme cxids.
    // (It is not entirely clear how this occurs, as the delete case does not seem to be triggered.)
    if (!lexemeOld && lexemeReplicated) {
      onLexemeChange({
        target: lexemeDoc.getMap<LexemeYjs>(),
        transaction: {
          origin: lexemePersistence.get(key),
        },
      })
    }
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
const onLexemeChange = (e: {
  target: Y.Map<LexemeYjs>
  transaction: {
    origin: any
  }
}) => {
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
    throw new Error(`replicateThought: Missing docKey for thought ${id}`)
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
const replicateChildren = async (
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
  const { accessToken, isThoughtLoaded, onError, onThoughtIDBSynced, onThoughtReplicated, tsid, websocket } =
    configCache
  const documentName = encodeThoughtDocumentName(tsid, docKey)
  const doc = thoughtDocs.get(docKey) || new Y.Doc({ guid: documentName })
  onDoc?.(doc)

  // If the doc is cached, return as soon as the appropriate providers are synced.
  // Disable IDB during tests because of TransactionInactiveError in fake-indexeddb.
  // Disable websocket during tests because of infinite loop in sinon runAllAsync.
  if (thoughtDocs.get(docKey) || process.env.NODE_ENV === 'test') {
    // The Doc exists, but it may not be populated yet if replication has not completed.
    // Wait for the appropriate replication to complete before accessing children.
    await thoughtReplicating[background && remote ? 'remote' : 'local'].get(docKey)
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

  // Create a promise that resolves when the thought is fully replicated, according to the background/remote logic.
  // This is used to memoize duplicate calls to replicateChildren at, during, and after replication.
  const replicating = resolvable<void>()
  thoughtReplicating[background && remote ? 'remote' : 'local'].set(docKey, replicating)

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
    .catch(e => {
      // AbortError happens if the app is closed during replication.
      // Not sure if the timeout will be preserved, but we can at least try to re-replicate.
      if (e.name === 'AbortError' || e.message.includes('[AbortError]')) {
        freeThought(docKey)
        setTimeout(() => {
          replicateChildren(docKey, { background, onDoc, remote })
        }, IDB_ERROR_RETRY)
        return
      }
      onError?.(`Error loading thought ${docKey} from IndexedDB: ${e.message}`, e)
    })

  // sync Websocket after IDB to ensure that only the latest updates since the local state vector are synced
  const websocketProvider = remote
    ? new HocuspocusProvider({
        // disable awareness for performance
        // doclog doc has awareness enabled to keep the websocket open
        awareness: null,
        websocketProvider: websocket,
        name: documentName,
        document: doc,
        token: accessToken,
      })
    : null

  const websocketSynced = websocketProvider ? when(websocketProvider, 'synced') : null
  websocketSynced?.then(() => {
    const children = getChildren(doc)

    const parentDocKey =
      docKey === ROOT_PARENT_ID
        ? null
        : docKey === HOME_TOKEN || docKey === EM_TOKEN
        ? ROOT_PARENT_ID
        : doc.getMap<ThoughtId>('thought').get('docKey')
    if (parentDocKey) {
      docKeys.set(docKey as ThoughtId, parentDocKey)
    }

    children?.forEach(child => {
      onThoughtReplicated?.(child.id, getThought(doc, child.id))

      // update docKeys of children and grandchildren
      docKeys.set(child.id, docKey)
      Object.values(child.childrenMap).forEach(grandchildId => {
        docKeys.set(grandchildId, child.id)
      })
    })
  })

  // Cache docs, promises, and persistence objects at the start of foreground replication.
  // Must be done synchronously, before waiting for idbSynced or websocketSynced, so that the cached objects are available immediately for concurrent calls to replicateChildren.
  if (!background) {
    thoughtDocs.set(docKey, doc)
    thoughtIDBSynced.set(docKey, idbSynced)
    thoughtPersistence.set(docKey, persistence)
    if (websocketProvider) {
      thoughtWebsocketProvider.set(docKey, websocketProvider)
      thoughtWebsocketSynced.set(docKey, websocketSynced!)
    }
  }

  // always wait for IDB to sync
  await idbSynced

  // During foreground replication, if there is no value in IndexedDB, wait for the websocket to sync before resolving.
  // Otherwise, db.getThoughtById will return undefined to getDescendantThoughts and the pull will end prematurely.
  // This can be observed when a thought appears pending on load and its child is missing.
  // This will not be activated when remote is false (e.g. export).
  const forceRemote = !getChildren(doc) && !background && websocketSynced

  // Gets enabled if background mode is switched to local mode because the Lexeme is already loaded.
  // This is used to determine if the Doc should be destroyed after background replication.
  let forceLocal = false

  // foreground
  if (!background) {
    if (forceRemote) {
      // abort websocketSynced if the user goes offline
      let offlineTimeout = 0
      let onStatusChange: ({ status }: { status: WebsocketStatus }) => void
      const offline = cancellable(
        new Promise<void>((resolve, reject) => {
          /** Set offlineTimeout when the websocket goes offline. */
          onStatusChange = ({ status }: { status: WebsocketStatus }) => {
            clearTimeout(offlineTimeout)
            if (status !== 'connected') {
              offlineTimeout = setTimeout(() => {
                websocket.off('status', onStatusChange)
                resolve()
              }, WEBSOCKET_CONNECTION_TIME) as unknown as number
            }
          }
          websocket.on('status', onStatusChange)
          onStatusChange({ status: websocket.status })
        }),
        // cancel function
        () => {
          websocket.off('status', onStatusChange)
          clearTimeout(offlineTimeout)
        },
      )

      // Offline promise with timeout.
      // Do not set thoughtReplicating.remote which is a true background replication that does not timout.
      await Promise.race([websocketSynced, offline]).finally(() => offline.cancel())
    }

    // Subscribe to changes after first sync to ensure that pending is set properly.
    // If thought is updated as non-pending first (i.e. before pull), then mergeUpdates will not set pending by design.
    const yChildren = doc.getMap<Y.Map<ThoughtYjs>>('children')
    const childrenEntries = [...(yChildren.entries() as IterableIterator<[ThoughtId, Y.Map<ThoughtYjs>]>)]
    childrenEntries.forEach(([childId, thoughtMap]) => {
      thoughtMap.observe(onThoughtChange(childId))
    })
  }
  // background
  else {
    if (remote) {
      await websocketSynced
    }

    // After the initial replication, if the thought or its parent is already loaded, update Redux state, even in background mode.
    // Otherwise remote changes will not be rendered.
    const children = getChildren(doc) || []
    await Promise.all(
      children.map(async child => {
        const loaded = await isThoughtLoaded(child)
        if (loaded) {
          forceLocal = true
          thoughtDocs.set(docKey, doc)
          thoughtIDBSynced.set(docKey, idbSynced)
          thoughtPersistence.set(docKey, persistence)
          if (websocketProvider) {
            thoughtWebsocketProvider.set(docKey, websocketProvider)
          }
          onThoughtChange(child.id)({
            target: doc.getMap<Y.Map<ThoughtYjs>>('children').get(child.id)!,
            transaction: {
              origin: websocketProvider,
            },
          })

          const yChildren = doc.getMap<Y.Map<ThoughtYjs>>('children')
          if (!yChildren.has(child.id)) {
            yChildren.set(child.id, new Y.Map<ThoughtYjs>())
          }
          const thoughtMap = yChildren.get(child.id)!
          thoughtMap.observe(onThoughtChange(child.id))
        }
      }),
    )
  }

  // resolve the replicating promise so that concurrent calls to replicateChildren can resolve
  const children = getChildren(doc)
  replicating.resolve()

  // Once the replicating promise has resolved, it is safe to remove from the replicating map.
  // We must remove it manually to free memory.
  // This will not break concurrent calls, which retain their own reference.
  const thoughtReplicatingMap = thoughtReplicating[(background && remote) || forceRemote ? 'remote' : 'local']
  if (thoughtReplicatingMap.get(docKey) === replicating) {
    thoughtReplicatingMap.delete(docKey)
  }

  // destroy the Doc and providers once fully synced
  if (background && !forceLocal) {
    doc.destroy()
    websocketProvider?.destroy()
  }

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
     * Destroy HocuspocusProvider after sync.
     */
    background?: boolean
  } = {},
): Promise<Lexeme | undefined> => {
  // Do not await config if it is already cached. Otherwise the initial call to replicateLexeme will not set thoughtDocs synchronously and concurrent calls to replicateLexeme will not be idempotent.
  if (!configCache) {
    await config
  }
  const { accessToken, isLexemeLoaded, onError, tsid, websocket } = configCache
  const documentName = encodeLexemeDocumentName(tsid, key)
  const doc = lexemeDocs.get(key) || new Y.Doc({ guid: documentName })
  const lexemeMap = doc.getMap<LexemeYjs>()

  // If the doc is cached, return as soon as the appropriate providers are synced.
  // Disable IDB during tests because of TransactionInactiveError in fake-indexeddb.
  // Disable websocket during tests because of infinite loop in sinon runAllAsync.
  if (lexemeDocs.get(key) || process.env.NODE_ENV === 'test') {
    return lexemeReplicating.get(key)
  }

  const replicating = resolvable<Lexeme | undefined>()
  lexemeReplicating.set(key, replicating)

  // set up idb and websocket persistence and subscribe to changes
  const persistence = new IndexeddbPersistence(documentName, doc)

  // if replicating in the background, destroy the IndexeddbProvider once synced
  const idbSynced = persistence.whenSynced.catch(e => {
    // AbortError happens if the app is closed during replication.
    // Not sure if the timeout will be preserved, but we can at least try to re-replicate.
    if (e.name === 'AbortError' || e.message.includes('[AbortError]')) {
      freeLexeme(key)
      setTimeout(() => {
        replicateLexeme(key, { background })
      }, IDB_ERROR_RETRY)
      return
    }
    onError?.(`Error loading lexeme ${key}: ${e.message}`, e)
  }) as Promise<void>

  const websocketProvider = new HocuspocusProvider({
    // disable awareness for performance
    // doclog doc has awareness enabled to keep the websocket open
    awareness: null,
    websocketProvider: websocket,
    name: documentName,
    document: doc,
    token: accessToken,
  })

  const websocketSynced = when(websocketProvider, 'synced')

  // Cache docs, promises, and persistence objects at the start of foreground replication.
  // Must be done synchronously, before waiting for idbSynced or websocketSynced, so that the cached objects are available immediately for concurrent calls to replicateChildren.
  if (!background) {
    lexemeDocs.set(key, doc)
    lexemeIDBSynced.set(key, idbSynced)
    lexemePersistence.set(key, persistence)
    lexemeWebsocketSynced.set(key, websocketSynced)
    lexemeWebsocketProvider.set(key, websocketProvider)
  }

  // Start observing before websocketSynced immediately. This differs from replicateChildren, where we cannot start observing until we know if a thought is pending or not.
  // This will be unobserved in background replication.
  lexemeMap.observe(onLexemeChange)

  // always wait for IDB to sync
  await idbSynced

  // Gets enabled if background mode is switched to local mode because the Lexeme is already loaded.
  // This is used to determine if the Doc should be destroyed after background replication.
  let forceLocal = false

  if (background) {
    // do not resolve background replication until websocket has synced
    await websocketSynced

    forceLocal = await isLexemeLoaded(key, getLexeme(doc))

    // After the initial replication, if the lexeme or any of its contexts are already loaded, update Redux state, even in background mode.
    // Otherwise remote changes will not be rendered.
    if (forceLocal) {
      lexemeDocs.set(key, doc)
      lexemeIDBSynced.set(key, idbSynced)
      lexemePersistence.set(key, persistence)
      lexemeWebsocketProvider.set(key, websocketProvider)
      onLexemeChange({
        target: doc.getMap<LexemeYjs>(),
        transaction: {
          origin: websocketProvider,
        },
      })
    }
  }

  // get the Lexeme before we destroy the Doc
  const lexeme = getLexeme(doc)
  replicating.resolve(lexeme)

  // Once the replicating promise has resolved, it is safe to remove from the replicating map.
  // We must remove it manually to free memory.
  // This will not break concurrent calls, which retain their own reference.
  if (lexemeReplicating.get(key) === replicating) {
    lexemeReplicating.delete(key)
  }

  // destroy the Doc and providers once fully synced
  if (background && !forceLocal) {
    lexemeMap.unobserve(onLexemeChange)
    doc.destroy()
    websocketProvider.destroy()
  }

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
  const childrenYjs = [...(yChildren.values() as IterableIterator<Y.Map<ThoughtYjs>>)]

  return childrenYjs.map(thoughtMap => {
    const thoughtRaw = thoughtMap.toJSON()
    return {
      ...thoughtRaw,
      // TODO: Why is childrenMap sometimes a YMap and sometimes a plain object?
      // toJSON is not recursive so we need to toJSON childrenMap as well
      // It is possible that this was fixed in later versions of yjs after v13.5.41
      childrenMap: thoughtRaw.childrenMap.toJSON ? thoughtRaw.childrenMap.toJSON() : thoughtRaw.childrenMap,
    } as Thought
  })
}

/** Gets a Thought from a thought Y.Doc. */
const getThought = (thoughtDoc: Y.Doc | undefined, id: ThoughtId): Thought | undefined => {
  if (!thoughtDoc) return
  const yChildren = thoughtDoc.getMap<Y.Map<ThoughtYjs>>('children')
  const thoughtMap = yChildren.get(id)
  if (!thoughtMap || thoughtMap.size === 0) return
  const thoughtRaw = thoughtMap.toJSON()
  return {
    ...thoughtRaw,
    // TODO: Why is childrenMap sometimes a YMap and sometimes a plain object?
    // toJSON is not recursive so we need to toJSON childrenMap as well
    // It is possible that this was fixed in later versions of yjs after v13.5.41
    childrenMap: thoughtRaw.childrenMap.toJSON ? thoughtRaw.childrenMap.toJSON() : thoughtRaw.childrenMap,
  } as Thought
}

/** Gets a Lexeme from a lexeme Y.Doc. */
const getLexeme = (lexemeDoc: Y.Doc | undefined): Lexeme | undefined => {
  if (!lexemeDoc) return
  const lexemeMap = lexemeDoc.getMap<LexemeYjs>()
  if (lexemeMap.size === 0) return
  const lexemeRaw = lexemeMap.toJSON() as LexemeDb

  // convert LexemeDb to Lexeme
  const lexeme = Object.entries(lexemeRaw).reduce<Lexeme>(
    (acc, [key, value]) => {
      const cxid = key.split('cx-')[1] as ThoughtId | undefined

      // Set docKey from Lexeme context to allow tangential contexts to be loaded.
      if (cxid) {
        docKeys.set(cxid, value as string)
      }

      return {
        ...acc,
        [cxid ? 'contexts' : key]: cxid ? [...(acc.contexts || []), cxid] : value,
      }
    },
    { contexts: [] } as unknown as Lexeme,
  )

  return lexeme
}

/** Destroys the thoughtDoc and associated providers without deleting the persisted data. */
export const freeThought = async (docKey: string): Promise<void> => {
  // freeThought and deleteThought are the only places where we use the id as the docKey directly.
  // This is because we want to free all of the thought's children, not the thought's siblings, which are contained in the parent Doc accessed via docKeys.

  // await idbSynced to ensure that export is not interrupted
  // do not await websocketSynced as it is not guaranteed to resolve
  await thoughtIDBSynced.get(docKey)

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

  // remove children from docKeys
  const thoughtDoc = thoughtDocs.get(docKey)
  const yChildren = thoughtDoc?.getMap<Y.Map<ThoughtYjs>>('children')
  yChildren?.forEach(thoughtMap => {
    const childId = thoughtMap.get('id') as ThoughtId
    docKeys.delete(childId)
  })
  docKeys.delete(docKey as ThoughtId)

  // Destroy doc and websocket provider.
  // IndexedDB provider is automatically destroyed when the Doc is destroyed, but HocuspocusProvider is not.
  thoughtDocs.get(docKey)?.destroy()
  thoughtWebsocketProvider.get(docKey)?.destroy()

  // delete from cache
  thoughtDocs.delete(docKey)
  thoughtPersistence.delete(docKey)
  thoughtIDBSynced.delete(docKey)
  thoughtWebsocketProvider.delete(docKey)
  thoughtWebsocketSynced.delete(docKey)
  thoughtReplicating.remote.delete(docKey)
  thoughtReplicating.local.delete(docKey)
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

/** Destroys the lexemeDoc and associated providers without deleting the persisted data. */
export const freeLexeme = async (key: string): Promise<void> => {
  await lexemeIDBSynced.get(key)

  // Destroying the doc does not remove top level shared type observers, so we need to unobserve onLexemeChange.
  // YJS logs an error if the event handler does not exist, which can occur when rapidly deleting thoughts.
  // Unfortunately there is no way to catch this, since YJS logs it directly to the console, so we have to override the YJS internals.
  // https://github.com/yjs/yjs/blob/5db1eed181b70cb6a6d7eab66c7e6d752f70141a/src/utils/EventHandler.js#L58
  const lexemeMap: Y.Map<LexemeYjs> | undefined = lexemeDocs.get(key)?.getMap<LexemeYjs>()
  const listeners = lexemeMap?._eH.l.slice(0) || []
  if (listeners.some(l => l === onLexemeChange)) {
    lexemeMap?.unobserve(onLexemeChange)
  }

  // IndeeddbPersistence is automatically destroyed when the Doc is destroyed, but HocuspocusProvider is not
  lexemeDocs.get(key)?.destroy()
  lexemeWebsocketProvider.get(key)?.destroy()
  lexemeDocs.delete(key)
  lexemePersistence.delete(key)
  lexemeIDBSynced.delete(key)
  lexemeWebsocketProvider.delete(key)
  lexemeWebsocketSynced.delete(key)
  lexemeReplicating.delete(key)
}

/** Deletes a Lexeme and clears the doc from IndexedDB. The server-side doc will eventually get deleted by the doclog replicationController. Resolves when the local database is deleted. */
const deleteLexeme = async (key: string): Promise<void> => {
  const { tsid } = await config
  const persistence = lexemePersistence.get(key)

  // When deleting a Lexeme, clear out the contexts first to ensure that if a new Lexeme with the same key gets created, it doesn't accidentally pull the old contexts.
  const lexemeOld = getLexeme(lexemeDocs.get(key) || persistence?.doc || lexemeWebsocketProvider.get(key)?.document)
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
  schemaVersion,
}: {
  thoughtIndexUpdates: Index<ThoughtDb | null>
  lexemeIndexUpdates: Index<Lexeme | null>
  lexemeIndexUpdatesOld: Index<Lexeme | undefined>
  schemaVersion: number
}) => {
  const { replication, updateQueue } = await config

  // group thought updates and deletes so that we can use the db bulk functions
  const { update: thoughtUpdates, delete: thoughtDeletes } = groupObjectBy(thoughtIndexUpdates, (id, thought) =>
    thought ? 'update' : 'delete',
  ) as {
    update?: Index<ThoughtDb>
    delete?: Index<null>
  }

  // group lexeme updates and deletes so that we can use the db bulk functions
  const { update: lexemeUpdates, delete: lexemeDeletes } = groupObjectBy(lexemeIndexUpdates, (id, lexeme) =>
    lexeme ? 'update' : 'delete',
  ) as {
    update?: Index<Lexeme>
    delete?: Index<null>
  }

  const updatePromise = updateQueue.add([
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

  // When thought ids are pushed to the doclog, the first log is trimmed if it matches the last log.
  // This is done to reduce the growth of the doclog during the common operation of editing a single thought.
  // The only cost is that any clients that go offline will not replicate a delayed contiguous edit when reconnecting.
  const ids = Object.keys(thoughtIndexUpdates || {}) as ThoughtId[]
  const thoughtLogs: [ThoughtId, DocLogAction][] = ids.map(id =>
    thoughtIndexUpdates[id] ? [thoughtIndexUpdates[id]!.parentId, DocLogAction.Update] : [id, DocLogAction.Delete],
  )

  const keys = Object.keys(lexemeIndexUpdates || {})
  const lexemeLogs: [string, DocLogAction][] = keys.map(key => [
    key,
    lexemeIndexUpdates[key] ? DocLogAction.Update : DocLogAction.Delete,
  ])

  replication.log({ thoughtLogs, lexemeLogs })

  const deletePromise = updateQueue.add([
    ...(Object.keys(thoughtDeletes || {}) as ThoughtId[]).map(id => () => deleteThought(id)),
    ...Object.keys(lexemeDeletes || {}).map(key => () => deleteLexeme(key)),
  ])

  return Promise.all([updatePromise, deletePromise])
}

/** Clears all thoughts and lexemes from the db. */
export const clear = async () => {
  const deleteThoughtPromises = Array.from(thoughtDocs, ([id, doc]) => deleteThought(id as ThoughtId))
  const deleteLexemePromises = Array.from(lexemeDocs, ([key, doc]) => deleteLexeme(key))

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
export const getThoughtById = async (id: ThoughtId) => {
  await replicateThought(id)
  const docKey = docKeys.get(id)
  return getThought(thoughtDocs.get(docKey!), id)
}

/** Gets multiple contexts from the thoughtIndex by ids. O(n). */
export const getThoughtsByIds = (ids: ThoughtId[]): Promise<(Thought | undefined)[]> =>
  Promise.all(ids.map(getThoughtById))

/** Pauses replication for higher priority network activity, such as push or pull. */
export const pauseReplication = async () => {
  const { replication } = await config
  replication.pause()
}

/** Starts or resumes replication after being paused for higher priority network actvity such as push or pull. */
export const startReplication = async () => {
  const { replication } = await config
  replication.start()
}

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
