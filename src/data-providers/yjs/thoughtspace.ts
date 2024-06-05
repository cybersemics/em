import { clientId } from '.'
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider'
import { nanoid } from 'nanoid'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import DocLogAction from '../../@types/DocLogAction'
import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
import Path from '../../@types/Path'
import PushBatch from '../../@types/PushBatch'
import ReplicationCursor from '../../@types/ReplicationCursor'
import Storage from '../../@types/Storage'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import { UpdateThoughtsOptions } from '../../actions/updateThoughts'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, ROOT_CONTEXTS, ROOT_PARENT_ID } from '../../constants'
import groupObjectBy from '../../util/groupObjectBy'
import hashThought from '../../util/hashThought'
import mergeBatch from '../../util/mergeBatch'
import taskQueue, { TaskQueue } from '../../util/taskQueue'
import throttleConcat from '../../util/throttleConcat'
import timestamp from '../../util/timestamp'
import { DataProvider } from '../DataProvider'
import { LexemeDocument } from '../rxdb/schemas/lexeme'
import { ThoughtDocument } from '../rxdb/schemas/thought'
import { rxDB } from '../rxdb/thoughtspace'
import { encodeDocLogBlockDocumentName, encodeDocLogDocumentName } from './documentNameEncoder'
import replicationController from './replicationController'

/**********************************************************************
 * Types
 **********************************************************************/

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

/**********************************************************************
 * Module variables
 **********************************************************************/

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

/** The thoughtspace config that is resolved after init is called. Used to pass objects and callbacks into the thoughtspace from the UI. After they are initialized, they can be accessed synchronously on the module-level config variable. This avoids timing issues with concurrent replicateChildren calls that need conflict to check if the doc already exists. */
const config = resolvable<ThoughtspaceConfig>()

/** Cache the config for synchronous access. This is needed by replicateChildren to set thoughtDocs synchronously, otherwise it will not be idempotent. */
let configCache: ThoughtspaceConfig

/** Initialize the thoughtspace with event handlers and selectors to call back to the UI. */
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

  console.info(
    'TODO_RXDB: thoughtspace.init - The thoughtspace has been initialized and has received the thoughtspace id (tsid), secret access token (accessToken) and various callbacks from the UI.',
    { accessToken, tsid },
  )

  // generate docKeys for cursor, otherwise replicateThought will fail
  if (cursor) {
    cursor.forEach((id, i) => docKeys.set(id, cursor[i - 1] ?? HOME_TOKEN))
  }

  // websocket provider
  // TODO: Reuse websocket connection from ./index?
  const websocket = new HocuspocusProviderWebsocket({
    // disable websocket since YJS is being sunset and server is no longer deployed.
    // eslint-disable-next-line no-constant-condition
    connect: false,
    url: websocketUrl,
  })

  doclog = new Y.Doc({ guid: encodeDocLogDocumentName(tsid) })

  // bind blocks to providers on load
  doclog.on('subdocs', ({ added, removed, loaded }: { added: Set<Y.Doc>; removed: Set<Y.Doc>; loaded: Set<Y.Doc> }) => {
    loaded.forEach((subdoc: Y.Doc) => {
      // Disable IndexedDB during tests because of TransactionInactiveError in fake-indexeddb.
      if (import.meta.env.MODE !== 'test') {
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
      }
    })
  })

  // Disable IndexedDB during tests because of TransactionInactiveError in fake-indexeddb.
  if (import.meta.env.MODE !== 'test') {
    const doclogPersistence = new IndexeddbPersistence(encodeDocLogDocumentName(tsid), doclog)
    doclogPersistence.whenSynced
      .then(() => {
        const blocks = doclog.getArray<Y.Doc>('blocks')
        // The doclog's initial block must be created outside the replicationController, after IDB syncs. This is necessary to avoid creating a new block when one already exists.
        // Do not create a starting block if this is shared from another device.
        // We need to wait for the existing block(s) to load.
        if (blocks.length === 0 && !tsidShared) {
          const blockNew = new Y.Doc({ guid: encodeDocLogBlockDocumentName(tsid, nanoid(13)) })

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
  }

  const replication = replicationController({
    // begin paused and only start after initial pull has completed
    paused: true,
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
        await (type === 'thought' ? replicateChildren(id as ThoughtId) : replicateLexeme(id))
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
    onStep: ({ completed, expected, index, total, value }) => {
      const estimatedTotal = expected || total
      onProgress({ replicationProgress: completed / estimatedTotal })
    },
    onEnd: total => {
      onProgress({ replicationProgress: 1 })
    },
  })

  // limit the number of thoughts and lexemes that are updated in the Y.Doc at once
  const updateQueue = taskQueue<void>({
    // concurrency above 16 make the % go in bursts as batches of tasks are processed and awaited all at once
    // this may vary based on # of cores and network conditions
    concurrency: 16,
    onStep: ({ completed, expected, index, total, value }) => {
      const estimatedTotal = expected || total
      onProgress({ savingProgress: completed / estimatedTotal })
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
  console.info(
    'TODO_RXDB: thoughtspace.updateThought - A thought has been updated in the Redux state and the change needs to be synced to the persistence layer and other clients.',
    { id, thought },
  )

  const { thoughts: thoughtCollection, lexemes: lexemeCollection } = rxDB

  if (docKey) {
    // When a thought changes parents, we need to delete it from the old parent Doc and update the docKey.
    // Unfortunately, transactions on two different Documents are not atomic, so there is a possibility that one will fail and the other will succeed, resulting in an invalid tree.
    if (docKey !== thought.parentId) {
      const lexemeKey = hashThought(thought.value)
      const lexemeDoc = await lexemeCollection.findOne(lexemeKey).exec()
      const lexeme = getLexeme(lexemeDoc)
      if (!lexemeDoc && id !== HOME_TOKEN && id !== EM_TOKEN) {
        // TODO: Why does throwing an error get suppressed?
        console.error(`updateThought: Missing Lexeme doc for thought ${id}`)
        return
      }
      // delete from old parent
      const thoughtDocOld = await thoughtCollection.findOne(docKey).exec()

      if (thoughtDocOld?.isInstanceOfRxDocument) {
        const { [id]: prevThought, ...newChildrenMap } = thoughtDocOld.toJSON().childrenMap

        await thoughtDocOld?.incrementalPatch({
          childrenMap: newChildrenMap,
        })

        docKey = thought.parentId
        docKeys.set(id, docKey)
      }

      // update Lexeme context docKey
      if (lexeme && !lexeme.contexts.includes(id)) {
        updateLexeme(lexemeKey, {
          ...lexeme,
          contexts: [...(lexeme.contexts || []), id],
        })
      }
    }
  } else {
    docKey = thought.parentId
    docKeys.set(id, docKey)
    Object.values(thought.childrenMap).forEach(childId => {
      docKeys.set(childId, id)
    })
  }

  // Insert or Update current thought
  await thoughtCollection.incrementalUpsert({
    id,
    childrenMap: thought.childrenMap,
    created: thought.created,
    lastUpdated: thought.lastUpdated,
    parentId: thought.parentId,
    rank: thought.rank,
    updatedBy: thought.updatedBy,
    value: thought.value,
    archived: thought.archived,
    docKey,
  })

  // Update parent thought
  const parentThoughtDoc = await thoughtCollection.findOne(docKey).exec()

  if (parentThoughtDoc?.isInstanceOfRxDocument) {
    await parentThoughtDoc.incrementalPatch({
      childrenMap: {
        ...(parentThoughtDoc.toJSON().childrenMap! || {}),
        [id]: id,
      },
    })
  }
}

/** Updates a rxdb lexeme doc. Converts contexts to a nested Y.Map for proper context merging. Resolves when transaction is committed and IDB is synced (not when websocket is synced). */
// NOTE: Keys are added to the lexeme log in updateLexemes for efficiency. If updateLexeme is ever called outside of updateLexemes, we will need to push individual keys here.
export const updateLexeme = async (key: string, lexemeNew: Lexeme): Promise<void> => {
  const { lexemes: lexemeCollection } = rxDB

  await lexemeCollection.incrementalUpsert({
    id: key,
    created: lexemeNew.created || timestamp(),
    lastUpdated: lexemeNew.lastUpdated || timestamp(),
    updatedBy: lexemeNew.updatedBy || clientId,
    contexts: lexemeNew.contexts || [],
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
    onDoc,
  }: {
    /** Callback with the doc as soon as it has been instantiated. */
    onDoc?: (doc: ThoughtDocument) => void
  } = {},
): Promise<Thought | undefined> => {
  /* 
    A thought has been created or made visible in the Redux state and needs to be synced from the persistence layer.
    It should stay in memory and we should be subscribed to realtime changes from other clients until freeThought is called.
    If background is true, this function should resolve as soon as the thought is loaded from the local db, but not wait until it is synced with the server.
    If background is false, this function should only resolve when the thought is fully synced with the server.
  */
  const docKey = docKeys.get(id)
  if (!docKey) {
    throw new Error(`replicateThought: Missing docKey for thought ${id}`)
  }
  const children = await replicateChildren(docKey, { onDoc })
  const child = children?.find(child => child.id === id)
  console.info('TODO_RXDB: thoughtspace.replicateThought', { id, children, child })
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
    onDoc,
  }: {
    onDoc?: (doc: ThoughtDocument) => void
  } = {},
): Promise<Thought[] | undefined> => {
  const { thoughts: thoughtCollection } = rxDB

  let thoughtDoc: ThoughtDocument | null = await thoughtCollection.findOne(docKey).exec()

  if (!thoughtDoc?.isInstanceOfRxDocument) {
    thoughtDoc = await thoughtCollection.insert({
      id: docKey,
      childrenMap: {},
      created: timestamp(),
      lastUpdated: timestamp(),
      parentId: docKey === ROOT_PARENT_ID ? null : ROOT_PARENT_ID,
      rank: 0,
      updatedBy: clientId,
      value: docKey,
    })
  }

  onDoc?.(thoughtDoc)

  const children = await getChildren(thoughtDoc)
  // if idb is empty, then we have to wait for websocketSynced before we can get the docKey
  const parentDocKey =
    docKey === ROOT_PARENT_ID
      ? null
      : docKey === HOME_TOKEN || docKey === EM_TOKEN
        ? ROOT_PARENT_ID
        : thoughtDoc.get('docKey')

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

  return children
}

/** Replicates a Lexeme from the persistence layers to state, IDB, and the Websocket server. Does nothing if the Lexeme is already replicated, or is being replicated. Otherwise creates a new, empty YDoc that can be updated concurrently while syncing. */
export const replicateLexeme = async (key: string): Promise<Lexeme | undefined> => {
  // special contexts do not have Lexemes
  // Redux state will store dummy Lexemes with empty contexts, but there is no reason to try to replicate them
  if (key === HOME_TOKEN || key === EM_TOKEN || key === ABSOLUTE_TOKEN) return undefined

  const { lexemes: lexemeCollection } = rxDB

  let lexemeDoc: LexemeDocument | null = await lexemeCollection.findOne(key).exec()

  if (!lexemeDoc) {
    lexemeDoc = await lexemeCollection.insert({
      id: key,
      created: timestamp(),
      lastUpdated: timestamp(),
      updatedBy: clientId,
      contexts: [],
    })
  }

  const lexeme = getLexeme(lexemeDoc)

  return lexeme
}

/** Gets all children from a thought RxDocument. Returns undefined if the doc does not exist. */
const getChildren = async (thoughtDoc: ThoughtDocument): Promise<Thought[] | undefined> => {
  if (!thoughtDoc?.isInstanceOfRxDocument) return undefined

  const { thoughts: thoughtCollection } = rxDB.collections
  const thought = thoughtDoc.toJSON()
  const childrenIds = Object.keys(thought.childrenMap || {})
  const thoughtsMap = await thoughtCollection.findByIds(childrenIds).exec()
  const thoughts = Array.from(thoughtsMap.values()).map(thought => thought.toJSON())
  return thoughts as Thought[]
}

/** Deletes a thought and clears the doc from IndexedDB. Resolves when local database is deleted. */
const deleteThought = async (docKey: string): Promise<void> => {
  console.info(
    'TODO_RXDB: thoughtspace.deleteThought - The thought has been permanently deleted, which should be synced to the persistence layer and other clients.',
    { id: docKey },
  )
  const { thoughts: thoughtCollection } = rxDB.collections

  const thoughtDoc = await thoughtCollection.findOne(docKey).exec()

  docKeys.delete(docKey as ThoughtId)

  if (thoughtDoc?.isInstanceOfRxDocument) {
    const children = await getChildren(thoughtDoc)
    children?.forEach(child => {
      docKeys.delete(child.id)
    })

    await thoughtDoc?.remove()
  }
}

/** Waits until the lexeme finishes replicating, then deallocates the cached lexeme and associated providers (without permanently deleting the persisted data). */
export const freeLexeme = async (key: string): Promise<void> => {
  await tryDeallocateLexeme(key)
}

/** Deallocates the cached lexeme and associated providers (without permanently deleting the persisted data). If the lexeme is retained, noop. Call freeLexeme to both safely unretain the lexeme and trigger deallocation when replication completes. */
const tryDeallocateLexeme = async (key: string): Promise<void> => {}

/** Deletes a Lexeme and clears the doc from IndexedDB. The server-side doc will eventually get deleted by the doclog replicationController. Resolves when the local database is deleted. */
const deleteLexeme = async (key: string): Promise<void> => {
  const { lexemes: lexemeCollection } = rxDB

  const lexemeDocOld = await lexemeCollection.findOne(key).exec()
  const lexemeOld = getLexeme(lexemeDocOld)

  if (lexemeDocOld && lexemeOld) {
    // When deleting a Lexeme, clear out the contexts first to ensure that if a new Lexeme with the same key gets created, it doesn't accidentally pull the old contexts.
    await updateLexeme(key, { ...lexemeOld, contexts: [] })

    await lexemeDocOld.remove()
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
  thoughtIndexUpdates: Index<Thought | null>
  lexemeIndexUpdates: Index<Lexeme | null>
  lexemeIndexUpdatesOld: Index<Lexeme | undefined>
  schemaVersion: number
}) => {
  const { replication, updateQueue } = await config

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

  const updatePromise = updateQueue.add([
    ...Object.entries(thoughtUpdates || {}).map(
      ([id, thought]) =>
        () =>
          updateThought(id as ThoughtId, thought),
    ),
    ...Object.entries(lexemeUpdates || {}).map(
      ([key, lexeme]) =>
        () =>
          updateLexeme(key, lexeme),
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

/** Gets a Lexeme from a lexeme RxDocument. */
const getLexeme = (lexemeDoc: LexemeDocument | undefined | null): Lexeme | undefined => {
  if (!lexemeDoc) return
  // TODO - check type conversion to Lexeme
  const lexeme = lexemeDoc.toJSON() as unknown as Lexeme
  return lexeme
}

/** Clears all thoughts and lexemes from the db. */
export const clear = async () => {
  console.info('TODO_RXDB: thoughtspace.clear.')
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

  const { thoughts: thoughtCollection } = rxDB.collections
  const doc = await thoughtCollection.findOne(id).exec()
  if (!doc?.isInstanceOfRxDocument) return undefined
  return doc.toJSON() as Thought
}

/** Gets multiple contexts from the thoughtIndex by ids. O(n). */
export const getThoughtsByIds = (ids: ThoughtId[]): Promise<(Thought | undefined)[]> =>
  Promise.all(ids.map(getThoughtById))

/** Pauses replication for higher priority network activity, such as push or pull. */
export const pauseReplication = async () => {
  console.info(
    'TODO_RXDB: thoughtspace.pauseReplication - Background replication should be paused, e.g. to give priority to loading visible thoughts or syncing realtime edits.',
  )
  const { replication } = await config
  replication.pause()
}

/** Starts or resumes replication after being paused for higher priority network actvity such as push or pull. */
export const startReplication = async () => {
  console.info('TODO_RXDB: thoughtspace.startReplication - Background replication can be resumed.')
  // Disable replication controller as part of winding down YJS
  // const { replication } = await config
  // replication.start()
}

const db: DataProvider = {
  clear,
  freeLexeme,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtsByIds,
  updateThoughts,
}

export default db
