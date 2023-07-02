import { HocuspocusProvider } from '@hocuspocus/provider'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import DocLogAction from '../../@types/DocLogAction'
import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
import Thought from '../../@types/Thought'
import ThoughtDb from '../../@types/ThoughtDb'
import ThoughtId from '../../@types/ThoughtId'
import alert from '../../action-creators/alert'
import updateThoughtsActionCreator from '../../action-creators/updateThoughts'
import { HOME_TOKEN, SCHEMA_LATEST } from '../../constants'
import { accessToken, tsid, websocketThoughtspace } from '../../data-providers/yjs/index'
import getLexemeSelector from '../../selectors/getLexeme'
import getThoughtByIdSelector from '../../selectors/getThoughtById'
import store from '../../stores/app'
import offlineStatusStore from '../../stores/offlineStatusStore'
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { clearDocument } = require('y-indexeddb') as { clearDocument: (name: string) => Promise<void> }

/** A Lexeme database type that defines contexts as separate keys. */
type LexemeDb = Omit<Lexeme, 'contexts'> & {
  [`cx-{string}`]: boolean
}

// YMap takes a generic type representing the union of values
// Individual values must be explicitly type cast, e.g. thoughtMap.get('childrenMap') as Y.Map<ThoughtId>
type ValueOf<T> = T[keyof T]
type ThoughtYjs = ValueOf<Omit<ThoughtDb, 'childrenMap'> & { childrenMap: Y.Map<ThoughtId> }>
type LexemeYjs = ValueOf<Omit<LexemeDb, 'contexts'> & { contexts: Y.Map<true> }>

/** A partial YMapEvent that can be more easily constructed than a complete YMapEvent. */
interface SimpleYMapEvent<T> {
  target: Y.Map<T>
  transaction: {
    origin: any
  }
}

/** A weak cancellable promise. The cancel function must be added to an existing promise and then cast to a Cancellable Promise. Promise chains created with then are not cancellable. */
interface CancellablePromise<T> extends Promise<T> {
  cancel: () => void
}

/** Attaches a cancel function to a promise. It is up to you to abort any functionality after the cancel function is called. */
const cancellable = <T>(p: Promise<T>, cancel: () => void) => {
  const promise = p as CancellablePromise<T>
  promise.cancel = cancel
  return promise
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
  const errorMessage = 'Error loading doclog.'
  console.error(errorMessage, e)
  store.dispatch(alert(errorMessage))
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
    } else if (action === DocLogAction.Delete) {
      store.dispatch(
        updateThoughtsActionCreator({
          thoughtIndexUpdates: {},
          lexemeIndexUpdates: {},
          // override thought/lexemeIndexUpdates based on type
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
      } else if (type === 'lexeme') {
        await deleteLexeme(id)
      }
    } else {
      throw new Error('Unknown DocLogAction: ' + action)
    }
  },
  onStep: ({ completed, index, total, value }) => {
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
const updateLexeme = async (
  key: string,
  lexemeNew: Lexeme,
  // undefined only if Lexeme is completely new
  lexemeOld: Lexeme | undefined,
): Promise<void> => {
  // get the old Lexeme to determine context deletions
  // TODO: Pass the diffed contexts all the way through from updateThouhgts.
  // The YJS Lexeme should be the same as the old Lexeme in State, since they are synced.
  // If the Lexeme has not yet been loaded from YJS, then we can ignore deletions, as a Lexeme normally cannot be deleted before it has been loaded. Unless the user creates and deletes the Lexeme so quickly that IDB is still loading (?).
  // In light of all that, it would be better to get the deletions directly from the reducer.

  if (!lexemeDocs[key]) {
    await replicateLexeme(key)
  }
  const lexemeReplicated = getLexeme(lexemeDocs[key])
  const lexemeDoc = lexemeDocs[key]
  const contextsOld = new Set(lexemeOld?.contexts)

  // The Lexeme may be deleted if the user creates and deletes a thought very quickly
  if (!lexemeDoc) return

  // Must add afterTransaction handler BEFORE transact.
  // Resolves after in-memory transaction is complete, not after synced with providers.
  const transactionPromise = new Promise<void>(resolve => lexemeDoc.once('afterTransaction', resolve))

  const idbSynced = lexemePersistence[key]?.whenSynced.catch(e => {
    console.error(e)
    store.dispatch(alert('Error saving thought'))
  })

  lexemeDoc.transact(() => {
    const lexemeMap = lexemeDoc.getMap<LexemeYjs>()
    Object.entries(lexemeNew).forEach(([key, value]) => {
      if (key === 'contexts') {
        const contextsNew = new Set(value)

        // add contexts to YJS that have been added to state
        lexemeNew.contexts.forEach(cxid => {
          if (!contextsOld.has(cxid)) {
            lexemeMap.set(`cx-${cxid}`, true)
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
        lexemeMap.set(key, value)
      }
    })

    // If the Lexeme was pending, we need to update state with the new Lexeme with merged cxids.
    // Otherwise, Redux state can become out of sync with YJS, and additional edits can result in missing Lexeme cxids.
    // (It is not entirely clear how this occurs, as the delete case does not seem to be triggered.)
    if (!lexemeOld && lexemeReplicated) {
      onLexemeChange({
        target: lexemeDoc.getMap(),
        transaction: {
          origin: lexemePersistence[key],
        },
      })
    }
  }, lexemeDoc.clientID)

  await Promise.all([transactionPromise, idbSynced])
}

/** Handles the Thought observe event. Ignores events from self. */
const onThoughtChange = (e: SimpleYMapEvent<ThoughtYjs>) => {
  const thoughtDoc = e.target.doc!
  if (e.transaction.origin === thoughtDoc.clientID) return

  // dispatch on the next tick, since observe is fired synchronously and a reducer may be running
  setTimeout(() => {
    const thought = getThought(thoughtDoc)
    if (!thought) return

    store.dispatch((dispatch, getState) => {
      // if parent is pending, the thought must be marked pending.
      // Note: Do not clear pending from the parent, because other children may not be loaded.
      // The next pull should handle that automatically.
      const state = getState()
      const thoughtInState = getThoughtByIdSelector(state, thought.id)
      const parentInState = getThoughtByIdSelector(state, thought.parentId)
      const pending = thoughtInState?.pending || parentInState?.pending

      dispatch(
        updateThoughtsActionCreator({
          thoughtIndexUpdates: {
            [thought.id]: {
              ...thought,
              ...(pending ? { pending } : null),
            },
          },
          lexemeIndexUpdates: {},
          local: false,
          remote: false,
          repairCursor: true,
        }),
      )
    })
  })
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

  // dispatch on the next tick, since observe is fired synchronously and a reducer may be running
  setTimeout(() => {
    const lexeme = getLexeme(lexemeDoc)
    if (!lexeme) return

    // we can assume id is defined since lexeme doc guids are always in the format `${tsid}/lexeme/${id}`
    const { id: key } = parseDocumentName(lexemeDoc.guid) as { id: string }

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
    remote,
  }: {
    /**
     * Replicate in the background, meaning:
     * - *Do not update Redux state.
     * - Do not store thought doc in memory.
     * - Destroy IndexedDBPersistence after sync.
     * - Destroy HocuspocusProvider after sync.
     * *Redux state *will* be updated if the thought is already loaded. This ensures that remote changes are rendered.
     */
    background?: boolean
    /** Wait for websocket to sync before resolving (background replication only). Default: true. This is currently set to false during export. */
    remote?: boolean
  } = {},
): Promise<Thought | undefined> => {
  if (remote == null) {
    remote = true
  }
  const documentName = encodeThoughtDocumentName(tsid, id)
  const doc = thoughtDocs[id] || new Y.Doc({ guid: documentName })
  const thoughtMap = doc.getMap<ThoughtYjs>()

  // if the doc has already been initialized and added to thoughtDocs, return immediately
  // disable y-indexeddb during tests because of TransactionInactiveError in fake-indexeddb
  // disable hocuspocus during tests because of infinite loop in sinon runAllAsync
  if (thoughtDocs[id] || process.env.NODE_ENV === 'test') {
    return thoughtSynced[id]?.then(() => getThought(doc)) || Promise.resolve()
  }

  // set up idb and websocket persistence and subscribe to changes
  const persistence = new IndexeddbPersistence(documentName, doc)
  const websocketProvider = new HocuspocusProvider({
    websocketProvider: websocketThoughtspace,
    name: documentName,
    document: doc,
    token: accessToken,
  })

  const websocketSynced = new Promise<void>(resolve => {
    /** Resolves when synced fires. */
    const onSynced = () => {
      websocketProvider.off('synced', onSynced)
      resolve()
    }
    websocketProvider.on('synced', onSynced)
  })

  const idbSynced = persistence.whenSynced
    .then(() => {
      // If the websocket is still connecting for the first time when IDB is synced and non-empty, change the status to reconnecting to dismiss "Connecting..." and render the available thoughts. See: NoThoughts.tsx.
      if (!background && id === HOME_TOKEN) {
        const thought = getThought(doc)
        if (Object.keys(thought?.childrenMap || {}).length > 0) {
          offlineStatusStore.update(statusOld =>
            statusOld === 'preconnecting' || statusOld === 'connecting' ? 'reconnecting' : statusOld,
          )
        }
      }
    })
    .catch(e => {
      const errorMessage = `Error loading thought ${id}. ${e.message || e}`
      console.error(errorMessage, e)
      store.dispatch(alert(errorMessage))
    })

  // if foreground replication (i.e. pull), set thoughtDocs entry so that further calls to replicateThought will not re-replicate
  if (!background) {
    thoughtDocs[id] = doc
    thoughtSynced[id] = idbSynced
    thoughtPersistence[id] = persistence
    thoughtWebsocketProvider[id] = websocketProvider
  }

  // always wait for IDB to sync
  await idbSynced

  // if background replication, wait until websocket has synced
  if (background) {
    if (remote) {
      await websocketSynced
    }

    // After the initial replication, if the thought or its parent is already loaded, update Redux state, even in background mode.
    // Otherwise remote changes will not be rendered.
    const thought = getThought(doc)
    if (!thought) return
    const state = store.getState()
    const thoughtInState = getThoughtByIdSelector(state, id)
    const parentIntState = getThoughtByIdSelector(state, thought.parentId)
    if (thoughtInState || parentIntState) {
      onThoughtChange({
        target: doc.getMap(),
        transaction: {
          origin: websocketProvider,
        },
      })
      thoughtMap.observe(onThoughtChange)
    }

    // destroy the providers once fully synced
    persistence.destroy()
    websocketProvider.destroy()
  } else {
    // During foreground replication, if there is no value in IndexedDB, wait for the websocket to sync before resolving.
    // Otherwise, db.getThoughtById will return undefined to getDescendantThoughts and the pull will end prematurely.
    // This can be observed when a thought appears pending on load and its child is missing.
    if (!getThought(doc) && offlineStatusStore.getState() !== 'offline') {
      // abort websocketSynced if the user goes offline
      let unsubscribe: null | (() => void) = null
      const offline = new Promise<void>(resolve => {
        unsubscribe = offlineStatusStore.subscribe(status => {
          if (status === 'offline') {
            unsubscribe?.()
            resolve()
          }
        })
      })
      await Promise.race([websocketSynced.then(unsubscribe), offline])
    }

    // Note: onThoughtChange is not pending-aware.
    // Subscribe to changes after first sync to ensure that pending is set properly.
    // If thought is updated as non-pending first (i.e. before pull), then mergeUpdates will not set pending by design.
    thoughtMap.observe(onThoughtChange)
  }

  return getThought(doc)
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
  const documentName = encodeLexemeDocumentName(tsid, key)
  const doc = lexemeDocs[key] || new Y.Doc({ guid: documentName })
  const lexemeMap = doc.getMap<LexemeYjs>()

  // set up persistence and subscribe to changes
  // disable during tests because of TransactionInactiveError in fake-indexeddb
  // disable during tests because of infinite loop in sinon runAllAsync
  if (lexemeDocs[key] || process.env.NODE_ENV === 'test')
    return lexemeSynced[key]?.then(() => getLexeme(doc)) || Promise.resolve()

  // set up idb and websocket persistence and subscribe to changes
  const persistence = new IndexeddbPersistence(documentName, doc)
  const websocketProvider = new HocuspocusProvider({
    websocketProvider: websocketThoughtspace,
    name: documentName,
    document: doc,
    token: accessToken,
  })

  const websocketSynced = new Promise<void>(resolve => {
    /** Resolves when synced fires. */
    const onSynced = () => {
      websocketProvider.off('synced', onSynced)
      resolve()
    }
    websocketProvider.on('synced', onSynced)
  })

  // if replicating in the background, destroy the IndexeddbProvider once synced
  const idbSynced = persistence.whenSynced
    .then(() => {
      if (!background) {
        // TODO: Is this necessary?
        onLexemeChange({
          target: doc.getMap(),
          transaction: {
            origin: persistence,
          },
        })
      }
    })
    .catch(e => {
      const errorMessage = `Error loading lexeme ${key}. ${e.message || e}`
      console.error(errorMessage, e)
      store.dispatch(alert(errorMessage))
    })

  // if foreground replication (i.e. pull), set the lexemeDocs entry so that further calls to replicateLexeme will not re-replicate
  if (!background) {
    lexemeDocs[key] = doc
    lexemeSynced[key] = idbSynced
    lexemePersistence[key] = persistence
    lexemeWebsocketProvider[key] = websocketProvider
  }

  // Start observing before websocketSynced since we don't need to worry about pending (See: replicateThought).
  // This will be unobserved in background replication.
  lexemeMap.observe(onLexemeChange)

  // always wait for IDB to sync
  await idbSynced

  if (background) {
    // do not resolve background replication until websocket has synced
    await websocketSynced

    // After the initial replication, if the lexeme or any of its contexts are already loaded, update Redux state, even in background mode.
    // Otherwise remote changes will not be rendered.
    const lexeme = getLexeme(doc)
    const state = store.getState()
    const loaded = !!getLexemeSelector(state, key) || lexeme?.contexts.some(cxid => getThoughtByIdSelector(state, cxid))
    if (!lexeme) return
    if (loaded) {
      lexemeDocs[key] = doc
      lexemeSynced[key] = idbSynced
      lexemePersistence[key] = persistence
      lexemeWebsocketProvider[key] = websocketProvider
      onLexemeChange({
        target: doc.getMap(),
        transaction: {
          origin: websocketProvider,
        },
      })
    } else {
      // destroy the providers once fully synced
      const lexeme = getLexeme(doc)
      doc.destroy()
      lexemeMap.unobserve(onLexemeChange)
      return lexeme
    }
  }

  return getLexeme(doc)
}

/** Gets a Thought from a thought Y.Doc. */
const getThought = (thoughtDoc: Y.Doc | undefined): Thought | undefined => {
  if (!thoughtDoc) return
  const thoughtMap = thoughtDoc.getMap()
  if (thoughtMap.size === 0) return
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
  const lexemeMap = lexemeDoc.getMap()
  if (lexemeMap.size === 0) return
  const lexemeRaw = lexemeMap.toJSON() as LexemeDb
  const lexeme = Object.entries(lexemeRaw).reduce<Partial<Lexeme>>(
    (acc, [key, value]) => {
      const cxid = key.split('cx-')[1] as ThoughtId | undefined
      return {
        ...acc,
        [cxid ? 'contexts' : key]: cxid ? [...(acc.contexts || []), cxid] : value,
      }
    },
    { contexts: [] },
  )
  return lexeme as Lexeme
}

/** Destroys the thoughtDoc and associated providers without deleting the persisted data. */
const freeThought = (id: ThoughtId): void => {
  // destroying the doc does not remove top level shared type observers, so we need to unobserve onLexemeChange
  // yjs logs an error if the event handler does not exist, which can occur when rapidly deleting thoughts.
  // https://github.com/yjs/yjs/blob/5db1eed181b70cb6a6d7eab66c7e6d752f70141a/src/utils/EventHandler.js#L58
  const thoughtMap: Y.Map<ThoughtYjs> | undefined = thoughtDocs[id]?.getMap<ThoughtYjs>()
  const listeners = thoughtMap?._eH.l.slice(0) || []
  if (listeners.some(l => l === onThoughtChange)) {
    thoughtMap.unobserve(onThoughtChange)
  }

  thoughtDocs[id]?.destroy()
  delete thoughtDocs[id]
  delete thoughtPersistence[id]
  delete thoughtSynced[id]
  delete thoughtWebsocketProvider[id]
}

/** Deletes a thought and clears the doc from IndexedDB. Resolves when local database is deleted. */
const deleteThought = async (id: ThoughtId): Promise<void> => {
  const persistence = thoughtPersistence[id]

  try {
    // if there is no persistence in memory (e.g. because the thought has not been loaded or has been deallocated by freeThought), then we need to manually delete it from the db
    const deleted = persistence ? persistence.clearData() : clearDocument(encodeThoughtDocumentName(tsid, id))
    freeThought(id)
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
const freeLexeme = (key: string): void => {
  // destroying the doc does not remove top level shared type observers, so we need to unobserve onLexemeChange
  // yjs logs an error if the event handler does not exist, which can occur when rapidly deleting thoughts.
  // https://github.com/yjs/yjs/blob/5db1eed181b70cb6a6d7eab66c7e6d752f70141a/src/utils/EventHandler.js#L58
  const lexemeMap: Y.Map<LexemeYjs> | undefined = lexemeDocs[key]?.getMap<LexemeYjs>()
  const listeners = lexemeMap?._eH.l.slice(0) || []
  if (listeners.some(l => l === onLexemeChange)) {
    lexemeMap.unobserve(onLexemeChange)
  }

  lexemeDocs[key]?.destroy()
  delete lexemeDocs[key]
  delete lexemePersistence[key]
  delete lexemeSynced[key]
  delete lexemeWebsocketProvider[key]
}

/** Deletes a Lexeme and clears the doc from IndexedDB. The server-side doc will eventually get deleted by the doclog replicationController. Resolves when the local database is deleted. */
const deleteLexeme = async (key: string): Promise<void> => {
  const persistence = lexemePersistence[key]

  // When deleting a Lexeme, clear out the contexts first to ensure that if a new Lexeme with the same key gets created, it doesn't accidentally pull the old contexts.
  const lexemeOld = getLexeme(lexemeDocs[key] || persistence?.doc || lexemeWebsocketProvider[key]?.document)
  if (lexemeOld) {
    await updateLexeme(key, { ...lexemeOld, contexts: [] }, lexemeOld)
  }

  try {
    // if there is no persistence in memory (e.g. because the thought has not been loaded or has been deallocated by freeThought), then we need to manually delete it from the db
    const deleted = persistence ? persistence.clearData() : clearDocument(encodeLexemeDocumentName(tsid, key))
    freeLexeme(key)
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
export const updateThoughts = ({
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

  await updateThoughts({
    thoughtIndexUpdates,
    lexemeIndexUpdates,
    lexemeIndexUpdatesOld: {},
    schemaVersion: SCHEMA_LATEST,
  })
}

/** Gets a thought from the thoughtIndex. Replicates the thought if not already done. */
export const getLexemeById = (key: string) => replicateLexeme(key)

/** Gets multiple thoughts from the lexemeIndex by key. */
export const getLexemesByIds = (keys: string[]): Promise<(Lexeme | undefined)[]> => Promise.all(keys.map(getLexemeById))

/** Gets a thought from the thoughtIndex. Replicates the thought if not already done. */
export const getThoughtById = (id: ThoughtId) => replicateThought(id)

/** Gets multiple contexts from the thoughtIndex by ids. O(n). */
export const getThoughtsByIds = (ids: ThoughtId[]): Promise<(Thought | undefined)[]> =>
  Promise.all(ids.map(getThoughtById))

/** Replicates an entire subtree, starting at a given thought. Replicates in the background (not populating the Redux state). Does not wait for Websocket to sync. */
export const replicateTree = (
  id: ThoughtId,
  {
    remote,
    onThought,
  }: {
    /** Wait for Websocket to sync before resolving. Default: true. */
    remote?: boolean
    onThought?: (thought: Thought, thoughtIndex: Index<Thought>) => void
  } = {},
): CancellablePromise<Index<Thought>> => {
  if (remote == null) {
    remote = true
  }
  // no significant performance gain above concurrency 4
  const queue = taskQueue<void>({ concurrency: 4 })
  const thoughtIndex: Index<Thought> = {}
  let abort = false

  /** Creates a task to replicate a thought and add it to the thoughtIndex. Queues up children replication. */
  const replicateTask = (id: ThoughtId) => async () => {
    const thought = await replicateThought(id, { background: true, remote })
    if (!thought || abort) return
    thoughtIndex[id] = thought
    onThought?.(thought, thoughtIndex)

    queue.add(Object.values(thought.childrenMap).map(replicateTask))
  }

  queue.add([replicateTask(id)])

  // return a promise that can cancel the replication
  const promise = queue.end.then(() => thoughtIndex)
  return cancellable(promise, () => {
    queue.clear()
    abort = true
  })
}

const db: DataProvider = {
  clear,
  freeThought,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtsByIds,
  updateThoughts,
}

export default db
