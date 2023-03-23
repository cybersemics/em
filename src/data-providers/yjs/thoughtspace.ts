import { HocuspocusProvider } from '@hocuspocus/provider'
import Emitter from 'emitter20'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import DocLogAction from '../../@types/DocLogAction'
import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
import LexemeDb from '../../@types/LexemeDb'
import Thought from '../../@types/Thought'
import ThoughtDb from '../../@types/ThoughtDb'
import ThoughtId from '../../@types/ThoughtId'
import alert from '../../action-creators/alert'
import updateThoughtsActionCreator from '../../action-creators/updateThoughts'
import { HOME_TOKEN, SCHEMA_LATEST } from '../../constants'
import { accessToken, tsid, websocketThoughtspace } from '../../data-providers/yjs/index'
import store from '../../stores/app'
import syncStatusStore from '../../stores/syncStatus'
import groupObjectBy from '../../util/groupObjectBy'
import initialState from '../../util/initialState'
import keyValueBy from '../../util/keyValueBy'
import storage from '../../util/storage'
import taskQueue from '../../util/taskQueue'
import thoughtToDb from '../../util/thoughtToDb'
import { DataProvider } from '../DataProvider'
import {
  encodeDocLogDocumentName,
  encodeLexemeDocumentName,
  encodeThoughtDocumentName,
  parseDocumentName,
} from './documentNameEncoder'
import replicationController from './replicationController'

// YMap takes a generic type representing the union of values
// Individual values must be explicitly type cast, e.g. thoughtMap.get('childrenMap') as Y.Map<ThoughtId>
type ValueOf<T> = T[keyof T]
type ThoughtYjs = ValueOf<Omit<ThoughtDb, 'childrenMap'> & { childrenMap: Y.Map<ThoughtId> }>
type LexemeYjs = ValueOf<Omit<LexemeDb, 'contexts'> & { contexts: Y.Map<true> }>

/** Deletes an IndexedDB database. */
const deleteDB = (name: string): Promise<void> => {
  const request = indexedDB.deleteDatabase(name)
  return new Promise((resolve, reject) => {
    request.onerror = (e: any) => reject(new Error(e.target.error))
    request.onsuccess = (e: any) => resolve()
  })
}

// map of all YJS thought Docs loaded into memory
// indexed by ThoughtId
// parallel to thoughtIndex and lexemeIndex
const thoughtDocs: Index<Y.Doc> = {}
const thoughtSynced: Index<Promise<void>> = {}
const thoughtPersistence: Index<IndexeddbPersistence> = {}
const thoughtWebsocketProvider: Index<HocuspocusProvider> = {}
const lexemeDocs: Index<Y.Doc> = {}
const lexemeSynced: Index<Promise<void>> = {}
const lexemePersistence: Index<IndexeddbPersistence> = {}
const lexemeWebsocketProvider: Index<HocuspocusProvider> = {}

// doclog is an append-only log of all thought ids and lexeme keys that are updated.
// Since Thoughts and Lexemes are stored in separate docs, we need a unified list of all ids to replicate.
// They are stored as Y.Arrays to allow for replication deltas instead of repeating full replications, and regular compaction.
// Deletes must be marked, otherwise there is no way to differentiate it from an update (because there is no way to tell if a websocket has no data for a thought, or just has not yet returned any data.)
const doclog = new Y.Doc()
const doclogPersistence = new IndexeddbPersistence(encodeDocLogDocumentName(tsid), doclog)
doclogPersistence.whenSynced.catch(e => {
  console.error(e)
  store.dispatch(alert('Error loading doclog'))
})

// eslint-disable-next-line no-new
new HocuspocusProvider({
  websocketProvider: websocketThoughtspace,
  name: encodeDocLogDocumentName(tsid),
  document: doclog,
  token: accessToken,
})

const replication = replicationController({
  // begin paused, and only start after initial pull has completed
  autostart: false,
  doc: doclog,
  storage,
  next: async ({ action, id, type }) => {
    if (action === DocLogAction.Update) {
      await (type === 'thought'
        ? replicateThought(id as ThoughtId, { background: true })
        : replicateLexeme(id, { background: true }))
    } else {
      store.dispatch(
        updateThoughtsActionCreator({
          thoughtIndexUpdates: {},
          lexemeIndexUpdates: {},
          [`${type}IndexUpdates`]: {
            [id]: null,
          },
          local: false,
          remote: false,
          repairCursor: true,
        }),
      )

      if (type === 'thought') {
        await deleteThought(id as ThoughtId)
      } else {
        await deleteLexeme(id)
      }
    }
  },
  onStep: ({ completed, total }) => {
    syncStatusStore.update({ replicationProgress: completed / total })
  },
  onEnd: () => {
    syncStatusStore.update({ replicationProgress: 1 })
  },
})

// limit the number of thoughts and lexemes that are updated in the Y.Doc at once
const updateQueue = taskQueue<void>({
  // concurrency above 16 make the % go in bursts as batches of tasks are processed and awaited all at once
  // this may vary based on # of cores and network conditions
  concurrency: 16,
  onStep: ({ completed, total }) => {
    syncStatusStore.update({ savingProgress: completed / total })
  },
  onEnd: () => {
    syncStatusStore.update({ savingProgress: 1 })
  },
})

// pause replication during pushing and pulling
syncStatusStore.subscribeSelector(
  ({ isPulling, savingProgress }) => savingProgress < 1 || isPulling,
  isPushingOrPulling => {
    if (isPushingOrPulling) {
      replication.pause()
    } else {
      // because replicationQueue starts paused, this line starts it for the first time after the initial pull
      replication.start()
    }
  },
)

/** Returns a [promise, resolve] pair. The promise is resolved when resolve(value) is called. */
const promiseOnDemand = <T>(): [Promise<T>, (value: T) => void] => {
  const emitter = new Emitter()
  const promise = new Promise<T>((resolve, reject) => {
    emitter.on('resolve', resolve)
  })

  /** Triggers the emitter to resolve the promise. */
  const resolve = (value: T) => emitter.trigger('resolve', value)

  return [promise, resolve]
}

/** A promise that resolves to true when the root thought has been synced from IndexedDB. */
const [rootSyncedPromise, resolveRootSynced] = promiseOnDemand<Thought>()
export const rootSynced = rootSyncedPromise

/** Updates a yjs thought doc. Converts childrenMap to a nested Y.Map for proper children merging. Resolves when transaction is committed and IDB is synced (not when websocket is synced). */
// NOTE: Ids are added to the thought log in updateThoughts for efficiency. If updateThought is ever called outside of updateThoughts, we will need to push individual thought ids here.
const updateThought = async (id: ThoughtId, thought: Thought): Promise<void> => {
  if (!thoughtDocs[id]) {
    replicateThought(id)
  }
  const thoughtDoc = thoughtDocs[id]

  // Must add afterTransaction handler BEFORE transact.
  // Resolves after in-memory transaction is complete, not after synced with providers.
  const transactionPromise = new Promise<void>(resolve => thoughtDoc.once('afterTransaction', resolve))

  const idbSynced = thoughtPersistence[thought.id]?.whenSynced.catch(e => {
    console.error(e)
    store.dispatch(alert('Error saving thought'))
  })

  thoughtDoc.transact(() => {
    const thoughtMap = thoughtDoc.getMap<ThoughtYjs>()
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
        thoughtMap.set(key, value)
      }
    })
  }, thoughtDoc.clientID)

  await Promise.all([transactionPromise, idbSynced])
}

/** Updates a yjs lexeme doc. Converts contexts to a nested Y.Map for proper context merging. Resolves when transaction is committed and IDB is synced (not when websocket is synced). */
// NOTE: Keys are added to the lexeme log in updateLexemes for efficiency. If updateLexeme is ever called outside of updateLexemes, we will need to push individual keys here.
const updateLexeme = async (key: string, lexeme: Lexeme): Promise<void> => {
  if (!lexemeDocs[key]) {
    replicateLexeme(key)
  }
  const lexemeDoc = lexemeDocs[key]

  // Must add afterTransaction handler BEFORE transact.
  // Resolves after in-memory transaction is complete, not after synced with providers.
  const transactionPromise = new Promise<void>(resolve => lexemeDoc.once('afterTransaction', resolve))

  const idbSynced = lexemePersistence[key]?.whenSynced.catch(e => {
    console.error(e)
    store.dispatch(alert('Error saving thought'))
  })

  lexemeDoc.transact(() => {
    const lexemeMap = lexemeDoc.getMap<LexemeYjs>()
    Object.entries(lexeme).forEach(([key, value]) => {
      // merge contexts Y.Map
      if (key === 'contexts') {
        const contextsObject = keyValueBy(value as ThoughtId[], cxid => ({ [cxid]: true }))
        // keyed by context ThoughtId
        let contextsMap = lexemeMap.get('contexts') as Y.Map<true>

        // create new Y.Map for new lexeme
        if (!contextsMap) {
          contextsMap = new Y.Map()
          lexemeMap.set('contexts', contextsMap)
        }

        // delete contexts from the yjs lexeme that are no longer in the state lexeme
        contextsMap.forEach((value: true, cxid: string) => {
          if (!contextsObject[cxid]) {
            contextsMap.delete(cxid)
          }
        })

        // add children that are not in the yjs lexeme
        lexeme.contexts.forEach(cxid => {
          if (!contextsMap.has(cxid)) {
            contextsMap.set(cxid, true)
          }
        })
      }
      // other keys
      else {
        lexemeMap.set(key, value)
      }
    })
  }, lexemeDoc.clientID)

  await Promise.all([transactionPromise, idbSynced])
}

/** Handles the Thought observe event. Ignores events from self. */
const onThoughtChange = (e: Y.YMapEvent<ThoughtYjs>) => {
  const thoughtDoc = e.target.doc!
  if (e.transaction.origin === thoughtDoc.clientID) return
  const thought = getThought(thoughtDoc)
  if (!thought) return

  // dispatch on the next tick, since observe is fired synchronously and a reducer may be running
  setTimeout(() => {
    store.dispatch(
      updateThoughtsActionCreator({
        thoughtIndexUpdates: {
          [thought.id]: thought,
        },
        lexemeIndexUpdates: {},
        local: false,
        remote: false,
        repairCursor: true,
      }),
    )
  })
}

/** Handles the Lexeme observe event. Ignores events from self. */
const onLexemeChange = (e: Y.YMapEvent<LexemeYjs>) => {
  const lexemeDoc = e.target.doc!
  if (e.transaction.origin === lexemeDoc.clientID) return
  const lexeme = getLexeme(lexemeDoc)
  // we can assume id is defined since lexeme doc guids are always in the format `${tsid}/lexeme/${id}`
  const { id: key } = parseDocumentName(lexemeDoc!.guid) as { id: string }

  if (!lexeme) return

  // dispatch on the next tick, since observe is fired synchronously and a reducer may be running
  setTimeout(() => {
    store.dispatch(
      updateThoughtsActionCreator({
        thoughtIndexUpdates: {},
        lexemeIndexUpdates: {
          [key]: lexeme,
        },
        local: false,
        remote: false,
        repairCursor: true,
      }),
    )
  })
}

/** Replicates a thought from the persistence layers to state, IDB, and the Websocket server. Does nothing if the thought is already replicated, or is being replicated. Otherwise creates a new, empty YDoc that can be updated concurrently while replicating. */
export const replicateThought = async (
  id: ThoughtId,
  {
    background,
  }: {
    // do not store thought doc in memory
    // do not update thoughtIndex
    // destroy IndexedDBPersistence after sync
    // destroy HocuspocusProvider after sync
    background?: boolean
  } = {},
): Promise<void> => {
  const documentName = encodeThoughtDocumentName(tsid, id)
  const doc = thoughtDocs[id] || new Y.Doc({ guid: documentName })
  const thoughtMap = doc.getMap<ThoughtYjs>()

  // if the doc has already been initialized and added to thoughtDocs, return immediately
  // disable y-indexeddb during tests because of TransactionInactiveError in fake-indexeddb
  // disable hocuspocus during tests because of infinite loop in sinon runAllAsync
  if (thoughtDocs[id] || process.env.NODE_ENV === 'test') return thoughtSynced[id] || Promise.resolve()

  // set up idb and websocket persistence and subscribe to changes
  const persistence = new IndexeddbPersistence(documentName, doc)
  const websocketProvider = new HocuspocusProvider({
    websocketProvider: websocketThoughtspace,
    name: documentName,
    document: doc,
    token: accessToken,
  })

  const idbSynced = persistence.whenSynced
    .then(() => {
      // if replicating in the background, destroy the HocuspocusProvider once synced
      if (background) {
        persistence.destroy()
      } else if (id === HOME_TOKEN) {
        const thought = getThought(doc)
        if (thought) {
          resolveRootSynced(thought)
        }
      }
    })
    .catch(e => {
      console.error(e)
      store.dispatch(alert('Error loading thought'))
    })

  // TODO: How to tell if a thought exists on the websocket server?
  // Thought is always empty on synced, and observe may never be called.
  // We need to wait for the websocket to sync when replicating foreground thoughts that are not yet in IDB, without stalling if the thought is not on the websocket server.
  const websocketSynced = new Promise<void>(resolve => {
    /** Resolves the promise after a valid thought is observed. */
    // TODO: Why is the document empty on synced?
    const observeUntilValue = (e: Y.YMapEvent<ThoughtYjs>) => {
      if (e.transaction.origin !== websocketProvider) return
      const thought = getThought(doc)
      if (!thought) return

      thoughtMap.unobserve(observeUntilValue)

      if (background) {
        // Since onThoughtChange is not added as an observe handler during background replication, we need to call it manually when the thought or its parent is already in state.
        // Otherwise, this client will not see real-time edits from remote clients.
        // TODO: How to limit in-memory thoughts when they arrive out of order?
        // TODO: Check state.visibleThoughts (needs to be added to state) instead of all in-memory thoughts to avoid loading hidden descendants
        // const state = store.getState()
        // const exists = !!getThoughtByIdSelector(state, id)
        // const existsParent = !!getThoughtByIdSelector(state, thought.parentId)
        // if (exists || existsParent) {
        onThoughtChange(e)
        thoughtMap.observe(onThoughtChange)
        // } else {
        //   websocketProvider.destroy()
        // }
      }

      resolve()
    }
    thoughtMap.observe(observeUntilValue)
  })

  const synced = Promise.race([idbSynced, websocketSynced])

  // if foreground replication (i.e. pull), set thoughtDoc so that further calls to replicateThought will not re-replicate
  if (!background) {
    thoughtDocs[id] = doc
    thoughtSynced[id] = synced
    thoughtPersistence[id] = persistence
    thoughtWebsocketProvider[id] = websocketProvider
  }

  await synced

  if (background) {
    // do not resolve background replication until websocket has synced
    await websocketSynced
  } else {
    // Subscribe to changes on foreground replication
    // If thought is updated as non-pending first (i.e. before pull), then mergeUpdates will not set pending by design.
    thoughtMap.observe(onThoughtChange)
  }
}

/** Replicates a Lexeme from the persistence layers to state, IDB, and the Websocket server. Does nothing if the Lexeme is already replicated, or is being replicated. Otherwise creates a new, empty YDoc that can be updated concurrently while syncing. */
export const replicateLexeme = async (
  key: string,
  {
    background,
  }: {
    // do not store lexeme doc in memory
    // do not update lexemeIndex
    // destroy IndexedDBPersistence after sync
    // destroy HocuspocusProvider after sync
    background?: boolean
  } = {},
): Promise<void> => {
  const documentName = encodeLexemeDocumentName(tsid, key)
  const doc = lexemeDocs[key] || new Y.Doc({ guid: documentName })
  const lexemeMap = doc.getMap<LexemeYjs>()

  // set up persistence and subscribe to changes
  // disable during tests because of TransactionInactiveError in fake-indexeddb
  // disable during tests because of infinite loop in sinon runAllAsync
  if (lexemeDocs[key] || process.env.NODE_ENV === 'test') return lexemeSynced[key] || Promise.resolve()

  // set up idb and websocket persistence and subscribe to changes
  const persistence = new IndexeddbPersistence(documentName, doc)
  const websocketProvider = new HocuspocusProvider({
    websocketProvider: websocketThoughtspace,
    name: documentName,
    document: doc,
    token: accessToken,
  })

  // if replicating in the background, destroy the IndexeddbProvider once synced
  const idbSynced = persistence.whenSynced
    .then(() => {
      if (background) {
        persistence.destroy()
      }
    })
    .catch(e => {
      console.error(e)
      store.dispatch(alert('Error loading thought'))
    })

  const websocketSynced = new Promise<void>(resolve => {
    /** Resolves the promise after a valid thought is observed. */
    // TODO: Why is the document empty on synced?
    const observeUntilValue = (e: Y.YMapEvent<LexemeYjs>) => {
      if (e.transaction.origin !== websocketProvider) return
      const lexeme = getLexeme(doc)
      if (!lexeme) return

      lexemeMap.unobserve(observeUntilValue)

      if (background) {
        websocketProvider.destroy()

        // Since onLexemeChange is not added as an observe handler during background replication, we need to call it manually when any of its contexts are already in state.
        // Otherwise, this client will not see real-time edits from remote clients.

        // TODO: How to check if Lexeme is in view when context may not be replicated yet? We could only replicate lexemes after thoughts are replicated, but that would create a gap in state, and state really requires the thoughtIndex and lexemeIndex to be in sync.
        // if (lexeme.contexts.some(cxid => getThoughtByIdSelector(state, cxid))) {
        onLexemeChange(e)
        lexemeMap.observe(onLexemeChange)
        // }
      }

      resolve()
    }
    lexemeMap.observe(observeUntilValue)
  })

  const synced = Promise.race([idbSynced, websocketSynced])

  // if foreground replication (i.e. pull), set lexemeDoc so that further calls to replicateLexeme will not re-replicate
  if (!background) {
    lexemeDocs[key] = doc
    lexemeSynced[key] = synced
    lexemePersistence[key] = persistence
    lexemeWebsocketProvider[key] = websocketProvider
  }

  await synced

  if (background) {
    // do not resolve background replication until websocket has synced
    await websocketSynced
  } else {
    // Subscribe to changes after first sync to ensure that pending is set properly.
    // If thought is updated as non-pending first (i.e. before pull), then mergeUpdates will not set pending by design.
    lexemeMap.observe(onLexemeChange)
  }
}

/** Gets a Thought from a thought Y.Doc. */
const getThought = (thoughtDoc: Y.Doc): Thought | undefined => {
  const thoughtMap = thoughtDoc.getMap()
  if (thoughtMap.size === 0) return undefined
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
const getLexeme = (lexemeDoc: Y.Doc): Lexeme | undefined => {
  const lexemeMap = lexemeDoc.getMap()
  if (lexemeMap.size === 0) return undefined
  const lexemeRaw = lexemeMap.toJSON()
  return {
    ...lexemeRaw,
    // convert between yjs contexts and state contexts
    // contexts are stored as an object { [key: ThoughtId]: true } in yjs
    // contexts are stored as an array in local state
    // TODO: Change state contexts to objects for consistency
    // TODO: Why is contexts sometimes a YMap and sometimes a plain object?
    contexts: Object.keys(lexemeRaw.contexts.toJSON ? lexemeRaw.contexts.toJSON() : lexemeRaw.contexts) as ThoughtId[],
  } as Lexeme
}

/** Deletes a thought and clears the doc from IndexedDB. Resolves when local database is deleted. */
const deleteThought = (id: ThoughtId): Promise<void> => {
  // destroying the doc does not remove top level shared type observers
  thoughtDocs[id]?.getMap<ThoughtYjs>().unobserve(onThoughtChange)
  thoughtDocs[id]?.destroy()
  delete thoughtDocs[id]
  delete thoughtPersistence[id]
  delete thoughtSynced[id]
  delete thoughtWebsocketProvider[id]

  // there may not be a persistence instance in memory at all, so delete the database directly
  return deleteDB(encodeThoughtDocumentName(tsid, id)).catch((e: Error) => {
    console.error(e)
    store.dispatch(alert('Error deleting thought'))
  })
}

/** Deletes a lexemes and clears the doc from IndexedDB. Resolves when local database is deleted. */
const deleteLexeme = (key: string): Promise<void> => {
  // destroying the doc does not remove top level shared type observers
  lexemeDocs[key]?.getMap<LexemeYjs>().unobserve(onLexemeChange)
  lexemeDocs[key]?.destroy()
  delete lexemeDocs[key]
  delete lexemePersistence[key]
  delete lexemeSynced[key]
  delete lexemeWebsocketProvider[key]

  // there may not be a persistence instance in memory at all, so delete the database directly
  return deleteDB(encodeLexemeDocumentName(tsid, key)).catch((e: Error) => {
    console.error(e)
    store.dispatch(alert('Error deleting thought'))
  })
}

/** Updates shared thoughts and lexemes. Resolves when IDB is synced (not when websocket is synced). */
// Note: Does not await updates, but that could be added.
export const updateThoughts = (
  thoughtIndexUpdates: Index<ThoughtDb | null>,
  lexemeIndexUpdates: Index<Lexeme | null>,
  schemaVersion: number,
) => {
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
          updateLexeme(key, lexeme),
    ),
  ])

  // When thought ids are pushed to the doclog, the first log is trimmed if it matches the last log.
  // This is done to reduce the growth of the doclog during the common operation of editing a single thought.
  // The only cost is that any clients that go offline will not replicate a delayed contiguous edit when reconnecting.
  const ids = Object.keys(thoughtIndexUpdates || {}) as ThoughtId[]
  const thoughtLogs: [ThoughtId, DocLogAction][] = ids.map(id => [
    id,
    thoughtIndexUpdates[id] ? DocLogAction.Update : DocLogAction.Delete,
  ])

  const keys = Object.keys(lexemeIndexUpdates || {})
  const lexemeLogs: [string, DocLogAction][] = keys.map(key => [
    key,
    lexemeIndexUpdates[key] ? DocLogAction.Update : DocLogAction.Delete,
  ])

  // eslint-disable-next-line fp/no-mutating-methods
  replication.log({ thoughtLogs, lexemeLogs })
  const deletePromise = updateQueue.add([
    ...(Object.keys(thoughtDeletes || {}) as ThoughtId[]).map(id => () => deleteThought(id)),
    ...Object.keys(lexemeDeletes || {}).map(key => () => deleteLexeme(key)),
  ])

  return Promise.all([updatePromise, deletePromise])
}

/** Clears all thoughts and lexemes from the db. */
export const clear = async () => {
  const deleteThoughtPromises = Object.entries(thoughtDocs).map(([id, doc]) => deleteThought(id as ThoughtId))
  const deleteLexemePromises = Object.entries(lexemeDocs).map(([key, doc]) => deleteLexeme(key))

  await Promise.all([...deleteThoughtPromises, ...deleteLexemePromises])

  // reset to initialState, otherwise a missing ROOT error will occur when thought observe is triggered
  const state = initialState()
  const thoughtIndexUpdates = keyValueBy(state.thoughts.thoughtIndex, (id, thought) => ({
    [id]: thoughtToDb(thought),
  }))
  const lexemeIndexUpdates = state.thoughts.lexemeIndex

  await updateThoughts(thoughtIndexUpdates, lexemeIndexUpdates, SCHEMA_LATEST)
}

/** Gets a thought from the thoughtIndex. Replicates the thought if not already done. */
export const getLexemeById = async (key: string) => {
  await replicateLexeme(key)
  return getLexeme(lexemeDocs[key])
}

/** Gets multiple thoughts from the lexemeIndex by key. */
export const getLexemesByIds = async (keys: string[]): Promise<(Lexeme | undefined)[]> =>
  Promise.all(keys.map(getLexemeById))

/** Gets a thought from the thoughtIndex. Replicates the thought if not already done. */
export const getThoughtById = async (id: ThoughtId) => {
  await replicateThought(id)
  return getThought(thoughtDocs[id])
}

/** Gets multiple contexts from the thoughtIndex by ids. O(n). */
export const getThoughtsByIds = async (ids: ThoughtId[]): Promise<(Thought | undefined)[]> =>
  Promise.all(ids.map(getThoughtById))

const db: DataProvider = {
  clear,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtsByIds,
  updateThoughts,
}

export default db
