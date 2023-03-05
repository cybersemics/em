import { HocuspocusProvider } from '@hocuspocus/provider'
import Emitter from 'emitter20'
import _ from 'lodash'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import Index from '../../@types/IndexType'
import Lexeme from '../../@types/Lexeme'
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
import taskQueue from '../../util/taskQueue'
import thoughtToDb from '../../util/thoughtToDb'
import { DataProvider } from '../DataProvider'
import {
  encodeDocLogDocumentName,
  encodeLexemeDocumentName,
  encodeThoughtDocumentName,
  parseDocumentName,
} from './documentNameEncoder'

// action types for the doclog
// See: doclog
enum DocLogAction {
  Delete,
  Update,
}

/** Filters out null and undefined values and properly types the result. */
const nonempty = <T>(arr: (T | null | undefined)[]) => arr.filter(x => x != null) as T[]

/** Deletes an IndexedDB database. */
const deleteDB = (name: string): Promise<void> => {
  const request = indexedDB.deleteDatabase(name)
  return new Promise((resolve, reject) => {
    request.onerror = (e: any) => reject(new Error(e.target.error))
    request.onsuccess = (e: any) => resolve()
  })
}

const replicationQueue = taskQueue({
  autostart: false,
  onStep: (current, total) => {
    syncStatusStore.update({ replicationProgress: current / total })
  },
})

// pause replication during pushing and pulling
syncStatusStore.subscribeSelector(
  ({ isPushing, isPulling }) => isPushing || isPulling,
  isPushingOrPulling => {
    if (isPushingOrPulling) {
      replicationQueue.pause()
    } else {
      replicationQueue.start()
    }
  },
)

// map of all YJS thought Docs loaded into memory
// indexed by ThoughtId
// parallel to thoughtIndex and lexemeIndex
const thoughtDocs: Index<Y.Doc> = {}
const thoughtPersistence: Index<IndexeddbPersistence> = {}
const thoughtWebsocketProvider: Index<HocuspocusProvider> = {}
const lexemeDocs: Index<Y.Doc> = {}
const lexemePersistence: Index<IndexeddbPersistence> = {}
const lexemeWebsocketProvider: Index<HocuspocusProvider> = {}

// doclog is an append-only log of all thought ids and lexeme keys that are updated.
// Since Thoughts and Lexemes are stored in separate docs, we need a unified list of all ids to replicate.
// They are stored as Y.Arrays to allow for replication deltas instead of repeating full replications, and regular compaction.
// Deletes must be marked, otherwise there is no way to differentiate it from an update (because there is no way to tell if a websocket has no data for a thought, or just has not yet returned any data.)
const doclog = new Y.Doc()
const thoughtLog = doclog.getArray<[ThoughtId, DocLogAction]>('thoughtLog')
const lexemeLog = doclog.getArray<[string, DocLogAction]>('lexemeLog')
// set to true after first observe from thoughtLog/lexemeLog
// used to start rendering the replication progress
let thoughtLogLoaded = false
let lexemeLogLoaded = false
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
thoughtLog.observe(e => {
  if (e.transaction.origin === doclog.clientID) return
  // since the doglogs are append-only, ids are only on .insert
  const deltas: [ThoughtId, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])
  // traverse from recent to old, and ignore older updates to the same thought
  // eslint-disable-next-line fp/no-mutating-methods
  deltas.reverse()
  const idsTraversed = new Set()
  const tasks = deltas.map(([id, action]) => {
    if (idsTraversed.has(id)) return null
    idsTraversed.add(id)

    return async () => {
      if (action === DocLogAction.Update) {
        await replicateThought(id)
      } else {
        store.dispatch(
          updateThoughtsActionCreator({
            thoughtIndexUpdates: {
              [id]: null,
            },
            lexemeIndexUpdates: {},
            local: false,
            remote: false,
            repairCursor: true,
          }),
        )
        deleteThought(id)
      }
    }
  })

  replicationQueue.add(nonempty(tasks))
  thoughtLogLoaded = true
  if (lexemeLogLoaded) {
    replicationQueue.start()
  }
})
lexemeLog.observe(e => {
  if (e.transaction.origin === doclog.clientID) return
  // since the doglogs are append-only, ids are only on .insert
  const deltas: [string, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])
  // traverse from recent to old, and ignore older updates to the same lexeme
  // eslint-disable-next-line fp/no-mutating-methods
  deltas.reverse()
  const keysTraversed = new Set()
  const tasks = deltas.map(([key, action]) => {
    if (keysTraversed.has(key)) return null
    keysTraversed.add(key)

    return async () => {
      if (action === DocLogAction.Update) {
        await replicateLexeme(key)
      } else {
        store.dispatch(
          updateThoughtsActionCreator({
            thoughtIndexUpdates: {},
            lexemeIndexUpdates: {
              [key]: null,
            },
            local: false,
            remote: false,
            repairCursor: true,
          }),
        )
        deleteLexeme(key)
      }
    }
  })

  replicationQueue.add(nonempty(tasks))
  lexemeLogLoaded = true
  if (thoughtLogLoaded) {
    replicationQueue.start()
  }
})

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
const [rootSyncedPromise, resolveRootSynced] = promiseOnDemand<ThoughtDb>()
export const rootSynced = rootSyncedPromise

/** Updates a yjs thought doc. Converts childrenMap to a nested Y.Map for proper children merging. */
// NOTE: Ids are added to the thought log in updateThoughts for efficiency. If updateThought is ever called outside of updateThoughts, we will need to push individual thought ids here.
const updateThought = async (id: ThoughtId, thought: Thought): Promise<void> => {
  if (!thoughtDocs[id]) {
    replicateThought(id)
  }
  const thoughtDoc = thoughtDocs[id]

  // set updateQueue and isPushing
  // dequeued after syncing to IndexedDB
  syncStatusStore.pushStart(thought.id)

  // Must add afterTransaction handler BEFORE transact.
  // Resolves after in-memory transaction is complete, not after synced with providers.
  const done = new Promise<void>(resolve => thoughtDoc.once('afterTransaction', resolve))

  thoughtPersistence[thought.id]?.whenSynced
    .catch(e => {
      console.error(e)
      store.dispatch(alert('Error saving thought'))
    })
    .then(() => syncStatusStore.pushEnd(thought.id))

  thoughtDoc.transact(() => {
    const thoughtMap = thoughtDoc.getMap()
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

  return done
}

/** Updates a yjs lexeme doc. Converts contexts to a nested Y.Map for proper context merging. */
// NOTE: Keys are added to the lexeme log in updateLexemes for efficiency. If updateLexeme is ever called outside of updateLexemes, we will need to push individual keys here.
const updateLexeme = (key: string, lexeme: Lexeme): Promise<void> => {
  if (!lexemeDocs[key]) {
    replicateLexeme(key)
  }
  const lexemeDoc = lexemeDocs[key]

  // set updateQueue and isPushing
  // dequeued after syncing to IndexedDB
  syncStatusStore.pushStart(key)

  // Must add afterTransaction handler BEFORE transact.
  // Resolves after in-memory transaction is complete, not after synced with providers.
  const done = new Promise<void>(resolve => lexemeDoc.once('afterTransaction', resolve))

  lexemePersistence[key]?.whenSynced
    .catch(e => {
      console.error(e)
      store.dispatch(alert('Error saving thought'))
    })
    .then(() => syncStatusStore.pushEnd(key))

  lexemeDoc.transact(() => {
    const lexemeMap = lexemeDoc.getMap()
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

  return done
}

/** Handles the thought observer. Updates thoughtIndex if the thought or its parent is in the state. Ignores events from self. */
const onThoughtChange = (e: Y.YMapEvent<unknown>) => {
  const targetDoc = e.target.doc!
  // we can assume id is defined since thought doc guids are always in the format `${tsid}/thought/${id}`
  const { id } = parseDocumentName(targetDoc.guid) as { id: string }
  const thoughtDoc = thoughtDocs[id]
  if (thoughtDoc !== targetDoc) {
    throw new Error(`e.target.doc does not equal thoughtDocs['${id}']. An observe handler was probably not unobserved.`)
  }
  if (e.transaction.origin === thoughtDoc.clientID) return
  const thought = getThought(thoughtDoc)
  if (!thought) return

  // dispatch on the next tick, since a reducer may be running
  setTimeout(() => {
    store.dispatch((dispatch, getState) => {
      // Only update state if the thought or its parent is already loaded.
      // Otherwise let it load into IndexedDB in the background.
      // Is there a chance of a false positive if updates arrive out of order?
      if (!getState().thoughts.thoughtIndex[id] && !getState().thoughts.thoughtIndex[thought.parentId]) return

      dispatch(
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
  })
}

/** Handles the lexeme observer. Updates lexemeIndex if the lexeme or at least one of its contexts is in the state. Ignores events from self. */
const onLexemeChange = (e: Y.YMapEvent<unknown>) => {
  const targetDoc = e.target.doc!
  // we can assume id is defined since lexeme doc guids are always in the format `${tsid}/lexeme/${id}`
  const { id: key } = parseDocumentName(targetDoc.guid) as { id: string }
  const lexemeDoc = lexemeDocs[key]
  if (lexemeDoc !== targetDoc) {
    throw new Error(`e.target.doc does not equal lexemeDocs['${key}']. An observe handler was probably not unobserved.`)
  }
  if (e.transaction.origin === lexemeDoc.clientID) return
  const lexeme = getLexeme(lexemeDoc)
  if (!lexeme) return

  // dispatch on the next tick, since a reducer may be running
  setTimeout(() => {
    store.dispatch((dispatch, getState) => {
      // Only update state if the lexeme or at least one of its contets is loaded.
      // Otherwise let it load into IndexedDB in the background.
      // Is there a chance of a false positive if the thought arrives after the lexeme?
      if (
        !getState().thoughts.lexemeIndex[key] &&
        lexeme.contexts.every(cxid => !getState().thoughts.thoughtIndex[cxid])
      )
        return

      dispatch(
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
  })
}

/** Replicates a thought from the persistence layers to state and IndexedDB. Does nothing if the thought is already replicated, or is being replicated. Otherwise creates a new, empty YDoc that can be updated concurrently while replicating. */
export const replicateThought = async (id: ThoughtId): Promise<void> => {
  const documentName = encodeThoughtDocumentName(tsid, id)

  // use the existing Doc if possible, otherwise the map will not be immediately populated
  const thoughtDoc = thoughtDocs[id] || new Y.Doc({ guid: documentName })

  // set up persistence and subscribe to changes
  if (!thoughtDocs[id]) {
    thoughtDocs[id] = thoughtDoc

    // connect providers
    // disable y-indexeddb during tests because of TransactionInactiveError in fake-indexeddb
    // disable hocuspocus during tests because of infinite loop in sinon runAllAsync
    if (process.env.NODE_ENV !== 'test') {
      thoughtPersistence[id] = new IndexeddbPersistence(documentName, thoughtDoc)
      thoughtWebsocketProvider[id] = new HocuspocusProvider({
        websocketProvider: websocketThoughtspace,
        name: documentName,
        document: thoughtDoc,
        token: accessToken,
      })
    }

    // TODO: Subscribe to changes after first sync to ensure that pending is not overwritten.
    thoughtDoc.getMap().observe(onThoughtChange)
  }

  await thoughtPersistence[id]?.whenSynced
    .then(() => {
      if (id === HOME_TOKEN) {
        resolveRootSynced(thoughtDocs[HOME_TOKEN]?.getMap().toJSON() as ThoughtDb)
      }
    })
    .catch(e => {
      console.error(e)
      store.dispatch(alert('Error loading thought'))
    })

  // TODO: race IDB and socket?
}

/** Loads a lexeme from the persistence layers and returns a Y.Doc. Reuses the existing Y.Doc if it exists, otherwise creates a new, empty YDoc that can be updated concurrently while syncing. */
export const replicateLexeme = async (key: string): Promise<void> => {
  const documentName = encodeLexemeDocumentName(tsid, key)
  const lexemeDoc = lexemeDocs[key] || new Y.Doc({ guid: documentName })

  // set up persistence and subscribe to changes
  if (!lexemeDocs[key]) {
    lexemeDocs[key] = lexemeDoc

    // connect providers
    // disable during tests because of TransactionInactiveError in fake-indexeddb
    // disable during tests because of infinite loop in sinon runAllAsync
    if (process.env.NODE_ENV !== 'test') {
      lexemePersistence[key] = new IndexeddbPersistence(documentName, lexemeDoc)
      lexemeWebsocketProvider[key] = new HocuspocusProvider({
        websocketProvider: websocketThoughtspace,
        name: documentName,
        document: lexemeDoc,
        token: accessToken,
      })
    }

    // TODO: Subscribe to changes after first sync to ensure that pending is not overwritten.
    lexemeDoc.getMap().observe(onLexemeChange)
  }

  await lexemePersistence[key]?.whenSynced.catch(e => {
    console.error(e)
    store.dispatch(alert('Error loading thought'))
  })
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

/** Deletes a thought and clears the doc from IndexedDB. */
const deleteThought = (id: ThoughtId): Promise<void> => {
  syncStatusStore.pushStart(id)
  // destroying the doc does not remove top level shared type observers
  thoughtDocs[id]?.getMap().unobserve(onThoughtChange)
  thoughtDocs[id]?.destroy()
  delete thoughtDocs[id]
  delete thoughtPersistence[id]
  delete thoughtWebsocketProvider[id]

  // there may not be a persistence instance in memory at all, so delete the database directly
  return deleteDB(encodeThoughtDocumentName(tsid, id))
    .catch((e: Error) => {
      console.error(e)
      store.dispatch(alert('Error deleting thought'))
    })
    .finally(() => {
      syncStatusStore.pushEnd(id)
    })
}

/** Deletes a lexemes and clears the doc from IndexedDB. */
const deleteLexeme = (key: string): Promise<void> => {
  syncStatusStore.pushStart(key)
  // destroying the doc does not remove top level shared type observers
  lexemeDocs[key]?.getMap().unobserve(onLexemeChange)
  lexemeDocs[key]?.destroy()
  delete lexemeDocs[key]
  delete lexemePersistence[key]
  delete lexemeWebsocketProvider[key]

  // there may not be a persistence instance in memory at all, so delete the database directly
  return deleteDB(encodeLexemeDocumentName(tsid, key))
    .catch((e: Error) => {
      console.error(e)
      store.dispatch(alert('Error deleting thought'))
    })
    .finally(() => {
      syncStatusStore.pushEnd(key)
    })
}

/** Updates shared thoughts and lexemes. */
export const updateThoughts = async (
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

  const thoughtUpdatesPromise = Object.entries(thoughtUpdates || {}).map(([id, thought]) =>
    updateThought(id as ThoughtId, thought),
  )

  const lexemeUpdatesPromise = Object.entries(lexemeUpdates || {}).map(async ([key, lexeme]) =>
    updateLexeme(key, lexeme),
  )

  // When thought ids are pushed to the doclog, the first log is trimmed if it matches the last log.
  // This is done to reduce the growth of the doclog during the common operation of editing a single thought.
  // The only cost is that any clients that go offline will not replicate a delayed contiguous edit when reconnecting.
  const ids = Object.keys(thoughtIndexUpdates || {}) as ThoughtId[]
  const thoughtLogs: [ThoughtId, DocLogAction][] = ids.map(id => [
    id,
    thoughtIndexUpdates[id] ? DocLogAction.Update : DocLogAction.Delete,
  ])
  if (_.isEqual(thoughtLogs[0], thoughtLog.slice(-1)[0])) {
    // eslint-disable-next-line fp/no-mutating-methods
    thoughtLogs.shift()
  }

  const keys = Object.keys(lexemeIndexUpdates || {})
  const lexemeLogs: [string, DocLogAction][] = keys.map(key => [
    key,
    lexemeIndexUpdates[key] ? DocLogAction.Update : DocLogAction.Delete,
  ])
  if (_.isEqual(lexemeLogs[0], lexemeLog.slice(-1)[0])) {
    // eslint-disable-next-line fp/no-mutating-methods
    lexemeLogs.shift()
  }
  doclog.transact(() => {
    // eslint-disable-next-line fp/no-mutating-methods
    thoughtLog.push(thoughtLogs)
    // eslint-disable-next-line fp/no-mutating-methods
    lexemeLog.push(lexemeLogs)
  }, doclog.clientID)

  const thoughtDeleteIds = Object.keys(thoughtDeletes || {}) as ThoughtId[]
  const lexemeDeleteKeys = Object.keys(lexemeDeletes || {})

  return Promise.all([
    ...thoughtUpdatesPromise,
    ...lexemeUpdatesPromise,
    ...thoughtDeleteIds.map(deleteThought),
    ...lexemeDeleteKeys.map(deleteLexeme),
  ] as Promise<void>[])
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

  updateThoughts(thoughtIndexUpdates, lexemeIndexUpdates, SCHEMA_LATEST)
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
