import _ from 'lodash'
import moize from 'moize'
import CommandId from './@types/CommandId'
import Context from './@types/Context'
import MimeType from './@types/MimeType'
import State from './@types/State'
import ThoughtId from './@types/ThoughtId'
import Thunk from './@types/Thunk'
import { importFilesActionCreator as importFiles } from './actions/importFiles'
import { initThoughtsActionCreator as initThoughts } from './actions/initThoughts'
import { loadFromUrlActionCreator as loadFromUrl } from './actions/loadFromUrl'
import { preloadSourcesActionCreator as preloadSources } from './actions/preloadSources'
import { pullActionCreator as pull } from './actions/pull'
import { setCursorActionCreator as setCursor } from './actions/setCursor'
import { commandById, commandEmitter, executeCommand } from './commands'
import getLexemeHelper from './data-providers/data-helpers/getLexeme'
import { initPermissionsStore } from './data-providers/permissionsStore'
import { clientIdReady } from './data-providers/thoughtspaceSession'
import { dumpTreecrdt, treeFromJson } from './data-providers/treecrdt/debug'
import {
  enqueueMaterializedThoughtsToStore,
  tryStartTreecrdtWebSocketSyncFromEnv as tryStartTreecrdtWebSocketSync,
} from './data-providers/treecrdt/sync'
import db, { init as initTreecrdtThoughtspace } from './data-providers/treecrdt/thoughtspace'
import {
  dropTreecrdt,
  getTreecrdtClient,
  initTreecrdt,
  registerBeforeTreecrdtClose,
} from './data-providers/treecrdt/treecrdt'
import { isTreecrdtLocalMaterialization, waitForTreecrdtWriteBarrier } from './data-providers/treecrdt/writeBarrier'
import * as selection from './device/selection'
import testFlags from './e2e/testFlags'
import contextToThoughtId from './selectors/contextToThoughtId'
import decodeThoughtsUrl from './selectors/decodeThoughtsUrl'
import exportContext from './selectors/exportContext'
import { getAllChildren, getAllChildrenAsThoughts, getChildrenRanked } from './selectors/getChildren'
import getContexts from './selectors/getContexts'
import getLexeme from './selectors/getLexeme'
import getThoughtById from './selectors/getThoughtById'
import thoughtToContext from './selectors/thoughtToContext'
import store from './stores/app'
import offlineStatusStore, { init as initOfflineStatusStore } from './stores/offlineStatusStore'
import syncStatusStore from './stores/syncStatus'
import importToContext from './test-helpers/importToContext'
import prettyPath from './test-helpers/prettyPath'
import hashThought from './util/hashThought'
import initEvents from './util/initEvents'
import isRoot from './util/isRoot'
import owner from './util/owner'
import urlDataSource from './util/urlDataSource'

/**
 * Decode cursor from url, pull and initialize the cursor.
 */
const initializeCursor = async () => {
  const { path } = decodeThoughtsUrl(store.getState())
  // if no path in decoded from the url initialize the cursor with null
  if (!path || isRoot(path)) {
    store.dispatch(setCursor({ path: null }))
  } else {
    // pull the path thoughts
    await store.dispatch(pull(path, { maxDepth: 0 }))
    const newState = store.getState()
    const isCursorLoaded = path.every(thoughtId => getThoughtById(newState, thoughtId))
    store.dispatch(
      setCursor({
        path: isCursorLoaded ? path : null,
      }),
    )
  }
}

/** Initilaize local db and window events. */
const initializeInternal = async () => {
  initOfflineStatusStore(/* websocket */)

  // Initialize clientId before treecrdt thoughtspace (needs replicaId) and before any actions that create thoughts
  const clientId = await clientIdReady

  await initPermissionsStore()
  const treecrdtClient = await initTreecrdt()
  // TODO: revisit the clientId to replicaId conversion
  // TreeCRDT expects 32-byte replicaId; clientId is base64 of SHA-256 (44 chars) — decode to get 32 bytes
  const replicaId =
    clientId.length === 44
      ? Uint8Array.from(atob(clientId), c => c.charCodeAt(0))
      : (() => {
          const bytes = new TextEncoder().encode(clientId)
          const out = new Uint8Array(32)
          out.set(bytes.subarray(0, 32))
          return out
        })()
  await initTreecrdtThoughtspace(replicaId)

  // load local state unless loading a public context or source url
  // await initDB()

  const src = urlDataSource()
  const thoughtsLocalPromise =
    owner() === '~'
      ? // authenticated or offline user
        Promise.resolve(store.dispatch(src ? loadFromUrl(src) : initThoughts(clientId)))
      : // other user context
        Promise.resolve()

  // load =preload sources
  thoughtsLocalPromise.then(() => {
    // extra delay for good measure to not block rendering
    setTimeout(() => {
      store.dispatch(preloadSources)
      store.dispatch(importFiles({ resume: true }))
    }, 500)
  })

  await thoughtsLocalPromise

  await initializeCursor()

  const unsubscribeMaterialized = treecrdtClient.onMaterialized(event => {
    // Local TreeCRDT writes are already reflected optimistically in Redux. Peer-tab and server-sync writes arrive
    // without this tab's write id, so those materialization events must be read back into Redux.
    if (isTreecrdtLocalMaterialization(event)) return

    void enqueueMaterializedThoughtsToStore(event).catch(err =>
      console.error('TreeCRDT materialized UI sync failed', err),
    )
  })
  registerBeforeTreecrdtClose(async () => {
    unsubscribeMaterialized()
  })

  await tryStartTreecrdtWebSocketSync(treecrdtClient)

  return {
    thoughtsLocalPromise,
    ...initEvents(store),
  }
}

let initializePromise: ReturnType<typeof initializeInternal> | null = null

/** Initialize local db and window events. */
export const initialize = (): ReturnType<typeof initializeInternal> => {
  initializePromise = initializeInternal()
  return initializePromise
}

/** Waits for app initialization to finish. Used by e2e tests before interacting with exposed helpers. */
export const waitForInitialized = async (): Promise<void> => {
  await initializePromise
}

/** Partially apply state to a function. */
const withState =
  <T, R>(f: (state: State, ...args: T[]) => R) =>
  (...args: T[]) =>
    f(store.getState(), ...args)

/** Partially dispatches an action to the store. */
const withDispatch =
  <
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends any[],
    R extends Thunk,
  >(
    f: (...args: T) => R,
  ) =>
  (...args: T) =>
    store.dispatch(f(...args))

const testHelpers = {
  executeCommandById: (id: CommandId) => {
    executeCommand(commandById(id))
  },
  flushPendingEdits: () => {
    commandEmitter.trigger('command')
  },
  dropTreecrdt,
  waitForInitialized,
  waitForTreecrdtIdle: waitForTreecrdtWriteBarrier,
  setSelection: selection.set,
  importToContext: withDispatch(importToContext),
  getLexemeFromIndexedDB: (value: string) => getLexemeHelper(db, value),
  getState: store.getState,
  _: _,
}

// add useful functions to window.em for debugging
const windowEm = {
  contextToThoughtId: withState((state: State, thoughts: Context) => contextToThoughtId(state, thoughts)),
  exportContext: (contextOrThoughtId: Context | ThoughtId, format?: MimeType) =>
    exportContext(store.getState(), contextOrThoughtId, format),
  getContexts: withState(getContexts),
  getLexeme: withState(getLexeme),
  getLexemeContexts: withState((state: State, value: string) => {
    const contexts = getLexeme(state, value)?.contexts || []
    return contexts
      .map(id => getThoughtById(state, id))
      .filter(Boolean)
      .map(thought => thoughtToContext(state, thought.parentId))
  }),
  getAllChildrenByContext: withState((state: State, context: Context) =>
    getAllChildren(state, contextToThoughtId(state, context) || null),
  ),
  getAllChildrenAsThoughts: withState((state: State, context: Context) =>
    getAllChildrenAsThoughts(state, contextToThoughtId(state, context) || null),
  ),
  getAllChildrenRankedByContext: withState((state: State, context: Context) =>
    getChildrenRanked(state, contextToThoughtId(state, context) || null),
  ),
  getThoughtById: withState(getThoughtById),
  getThoughtByContext: withState((state: State, context: Context) => {
    const id = contextToThoughtId(state, context)
    return id ? getThoughtById(state, id) : undefined
  }),
  hashThought,
  moize,
  // subscribe state changes for debugging
  // e.g. em.onStateChange(state => state.editingValue)
  onStateChange: <T>(
    select: (state: State) => T,
    // default logging function
    f: (prev: T | null, current: T) => void = (prev: T | null, current: T) => console.info(`${prev} → ${current}`),
  ) => {
    let current: T
    /** Store listener. */
    const onState = () => {
      const prev = current
      current = select(store.getState())

      if (prev !== current) {
        f(prev, current)
      }
    }

    // return unsubscribe function
    return store.subscribe(onState)
  },
  prettyPath,
  store,
  offlineStatusStore,
  syncStatusStore,
  // helper functions that will be used by puppeteer tests
  testFlags,
  testHelpers,
  thoughtToContext: withState((state: State, thoughtId: ThoughtId) => thoughtToContext(state, thoughtId)),
  treecrdtClient: getTreecrdtClient,
  treecrdtNodeCount: async () => {
    try {
      return await getTreecrdtClient().tree.nodeCount()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('not initialized')) {
        console.warn('TreeCRDT not initialized (test mode?)')
        return 0
      }
      throw err
    }
  },
  dumpTreecrdt: async (opts?: { includeTombstones?: boolean }) => {
    try {
      const rows = await dumpTreecrdt(opts)
      // eslint-disable-next-line no-console
      console.table(rows)
      return rows
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('not initialized')) {
        console.warn('TreeCRDT not initialized (test mode?)')
      } else {
        throw err
      }
      return []
    }
  },
  treeFromJson: async () => {
    try {
      return await treeFromJson()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('not initialized')) {
        console.warn('TreeCRDT not initialized (test mode?)')
      } else {
        throw err
      }
      return null
    }
  },
}

window.em = windowEm

/*
  Uncomment em.moize.collectStats() to start collecting stats on load.
  Do not enable in production.
  Call em.moize.getStats in the console to analyze cache hits, e.g. em.moize.getStats('getSetting').
*/
// moize.collectStats()

export type TestHelpers = typeof windowEm.testHelpers
export type WindowEm = typeof windowEm
