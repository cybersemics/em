import _ from 'lodash'
import moize from 'moize'
import Context from './@types/Context'
import Lexeme from './@types/Lexeme'
import PushBatch from './@types/PushBatch'
import State from './@types/State'
import Thought from './@types/Thought'
import Thunk from './@types/Thunk'
import './App.css'
import { errorActionCreator as error } from './actions/error'
import { importFilesActionCreator as importFiles } from './actions/importFiles'
import { initThoughtsActionCreator as initThoughts } from './actions/initThoughts'
import { loadFromUrlActionCreator as loadFromUrl } from './actions/loadFromUrl'
import { preloadSourcesActionCreator as preloadSources } from './actions/preloadSources'
import { pullActionCreator as pull } from './actions/pull'
import { repairThoughtActionCreator } from './actions/repairThought'
import { setCursorActionCreator as setCursor } from './actions/setCursor'
import { updateThoughtsActionCreator } from './actions/updateThoughts'
import { HOME_TOKEN } from './constants'
import getLexemeHelper from './data-providers/data-helpers/getLexeme'
import { init as initRxThoughtspace } from './data-providers/rxdb/thoughtspace'
import { accessToken, clientIdReady, tsid, tsidShared, websocket, websocketUrl } from './data-providers/yjs'
import db, { init as initThoughtspace, pauseReplication, startReplication } from './data-providers/yjs/thoughtspace'
import * as selection from './device/selection'
import testFlags from './e2e/testFlags'
import contextToThoughtId from './selectors/contextToThoughtId'
import decodeThoughtsUrl from './selectors/decodeThoughtsUrl'
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
import mergeBatch from './util/mergeBatch'
import owner from './util/owner'
import storage from './util/storage'
import throttleConcat from './util/throttleConcat'
import urlDataSource from './util/urlDataSource'

/** Number of milliseconds to throttle dispatching updateThoughts on thought/lexeme change. */
const UPDATE_THOUGHTS_THROTTLE = 100

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

/** Dispatches updateThoughts with all updates in the throttle period. */
const updateThoughtsThrottled = throttleConcat<PushBatch, void>((batches: PushBatch[]) => {
  const merged = batches.reduce(mergeBatch, {
    thoughtIndexUpdates: {},
    lexemeIndexUpdates: {},
    lexemeIndexUpdatesOld: {},
  })

  // dispatch on next tick, since the leading edge is synchronous and can be triggered during a reducer
  setTimeout(() => {
    store.dispatch(updateThoughtsActionCreator({ ...merged, local: false, remote: false, repairCursor: true }))
  })
}, UPDATE_THOUGHTS_THROTTLE)

/** Initilaize local db and window events. */
export const initialize = async () => {
  initOfflineStatusStore(websocket)

  await initRxThoughtspace()

  await initThoughtspace({
    cursor: decodeThoughtsUrl(store.getState()).path,
    accessToken,
    /** Returns true if the Thought or its parent is in State. */
    isThoughtLoaded: async (thought: Thought | undefined): Promise<boolean> => {
      const state = store.getState()
      return !!(thought && (getThoughtById(state, thought.parentId) || getThoughtById(state, thought.id)))
    },
    /** Returns true if the Lexeme or one of its contexts are in State. */
    isLexemeLoaded: async (key: string, lexeme: Lexeme | undefined): Promise<boolean> => {
      const state = store.getState()
      return !!((lexeme && getLexeme(state, key)) || lexeme?.contexts.some(cxid => getThoughtById(state, cxid)))
    },
    onError: (message, object) => {
      console.error(message, object)
      store.dispatch(error({ value: message }))
    },
    onProgress: syncStatusStore.update,
    onThoughtChange: (thought: Thought) => {
      store.dispatch((dispatch, getState) => {
        // if parent is pending, the thought must be marked pending.
        // Note: Do not clear pending from the parent, because other children may not be loaded.
        // The next pull should handle that automatically.
        // TODO: Do we need to use fresh State when updateThoughtsThrottled resolves?
        const state = getState()
        const thoughtInState = getThoughtById(state, thought.id)
        const parentInState = getThoughtById(state, thought.parentId)
        const pending = thoughtInState?.pending || parentInState?.pending

        updateThoughtsThrottled({
          thoughtIndexUpdates: {
            [thought.id]: {
              ...thought,
              ...(pending ? { pending } : null),
            },
          },
          lexemeIndexUpdates: {},
          lexemeIndexUpdatesOld: {},
        })
      })
    },
    onThoughtIDBSynced: (thought, { background }) => {
      // If the websocket is still connecting for the first time when IDB is synced and non-empty, change the status to reconnecting to dismiss "Connecting..." and render the available thoughts. See: EmptyThoughtspace.tsx.
      if (!background && thought?.id === HOME_TOKEN) {
        const hasRootChildren = Object.keys(thought?.childrenMap || {}).length > 0
        if (hasRootChildren) {
          offlineStatusStore.update(statusOld =>
            statusOld === 'preconnecting' || statusOld === 'connecting' ? 'reconnecting' : statusOld,
          )
        }
      }
    },
    onThoughtReplicated: (id, thought) => {
      store.dispatch(repairThoughtActionCreator(id, thought))
    },
    onUpdateThoughts: options => {
      store.dispatch(updateThoughtsActionCreator(options))
    },
    getItem: (key: string) => JSON.parse(storage.getItem(key) || '{}'),
    setItem: (key: string, value: any) => storage.setItem(key, JSON.stringify(value)),
    tsid,
    tsidShared,
    websocketUrl,
  })

  // pause replication during pushing and pulling
  syncStatusStore.subscribeSelector(
    ({ isPulling, savingProgress }) => savingProgress < 1 || isPulling,
    isPushingOrPulling => {
      if (isPushingOrPulling) {
        pauseReplication()
      } else {
        // because replicationQueue starts paused, this line starts it for the first time after the initial pull
        startReplication()
      }
    },
  )

  // load local state unless loading a public context or source url
  // await initDB()

  // initialize clientId before dispatching any actions that create new thoughts
  const clientId = await clientIdReady

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

  return {
    thoughtsLocalPromise,
    ...initEvents(store),
  }
}

/** Partially apply state to a function. */
const withState =
  <T, R>(f: (state: State, ...args: T[]) => R) =>
  (...args: T[]) =>
    f(store.getState(), ...args)

/** Partially dispatches an action to the store. */
const withDispatch =
  <T extends any[], R extends Thunk>(f: (...args: T) => R) =>
  (...args: T) =>
    store.dispatch(f(...args))

const testHelpers = {
  setSelection: selection.set,
  importToContext: withDispatch(importToContext),
  getLexemeFromIndexedDB: (value: string) => getLexemeHelper(db, value),
  getState: store.getState,
  _: _,
}

// add useful functions to window.em for debugging
const windowEm = {
  contextToThoughtId: withState((state: State, thoughts: Context) => contextToThoughtId(state, thoughts)),
  getContexts: withState(getContexts),
  getLexeme: withState(getLexeme),
  getLexemeContexts: withState((state: State, value: string) => {
    const contexts = getLexeme(state, value)?.contexts || []
    return contexts.map(id => thoughtToContext(state, getThoughtById(state, id)?.parentId))
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
  thoughtToContext: withState(thoughtToContext),
}

window.em = windowEm

/*
  Uncomment em.moize.collectStats() to start collecting stats on load.
  Do not enable in production.
  Call em.moize.getStats in the console to analyze cache hits, e.g. em.moize.getStats('getSetting').
*/
// moize.collectStats()

/** Logs debugging information to a fixed position debug window. Useful for PWA debugging. */
window.debug = (message: string) => {
  const debugEl = document.getElementById('debug')!
  debugEl.innerHTML = `${new Date()}: ${message}\n${debugEl.innerHTML}`
}

export type TestHelpers = typeof windowEm.testHelpers
export type WindowEm = typeof windowEm
