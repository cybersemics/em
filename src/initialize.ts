import moize from 'moize'
import Context from './@types/Context'
import MimeType from './@types/MimeType'
import State from './@types/State'
import ThoughtId from './@types/ThoughtId'
import Thunk from './@types/Thunk'
import { importFilesActionCreator as importFiles } from './actions/importFiles'
import { initThoughtsActionCreator as initThoughts } from './actions/initThoughts'
import { pullActionCreator as pull } from './actions/pull'
import { setCursorActionCreator as setCursor } from './actions/setCursor'
import { updateThoughtsActionCreator } from './actions/updateThoughts'
import { type ThoughtspaceStorage, thoughtspaceRuntime } from './data-providers/thoughtspace'
import testFlags from './e2e/testFlags'
import contextToThoughtId from './selectors/contextToThoughtId'
import decodeThoughtsUrl from './selectors/decodeThoughtsUrl'
import exportContext from './selectors/exportContext'
import { getAllChildren, getChildrenRanked } from './selectors/getChildren'
import getContexts from './selectors/getContexts'
import getLexeme from './selectors/getLexeme'
import getThoughtById from './selectors/getThoughtById'
import thoughtToContext from './selectors/thoughtToContext'
import store from './stores/app'
import offlineStatusStore, { init as initOfflineStatusStore } from './stores/offlineStatusStore'
import storageStatusStore from './stores/storageStatus'
import syncStatusStore from './stores/syncStatus'
import importToContext from './test-helpers/importToContext'
import prettyPath from './test-helpers/prettyPath'
import hashThought from './util/hashThought'
import initEvents from './util/initEvents'
import isRoot from './util/isRoot'
import owner from './util/owner'

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

type InitializeOptions = { storage: ThoughtspaceStorage }

/** Initialize local db and window events. */
const initializeInternal = async ({ storage }: InitializeOptions) => {
  initOfflineStatusStore(/* websocket */)
  const eventHandlers = initEvents(store)

  const { clientId, storage: storageInUse } = await thoughtspaceRuntime.init({
    storage,
    materialization: {
      getSnapshot: () => {
        const state = store.getState()
        return {
          thoughtIndex: state.thoughts.thoughtIndex,
          lexemeIndex: state.thoughts.lexemeIndex,
        }
      },
      apply: ({ thoughtIndex, lexemeIndex }) => {
        store.dispatch(
          updateThoughtsActionCreator({
            thoughtIndexUpdates: thoughtIndex,
            lexemeIndexUpdates: lexemeIndex,
            local: false,
            remote: false,
            repairCursor: true,
          }),
        )
      },
    },
  })

  storageStatusStore.update(storageInUse)

  // load local state unless loading a public context
  // await initDB()

  const thoughtsLocalPromise =
    owner() === '~'
      ? // authenticated or offline user
        Promise.resolve(store.dispatch(initThoughts(clientId)))
      : // other user context
        Promise.resolve()

  thoughtsLocalPromise.then(() => {
    // extra delay for good measure to not block rendering
    setTimeout(() => {
      store.dispatch(importFiles({ resume: true }))
    }, 500)
  })

  await thoughtsLocalPromise

  await initializeCursor()

  return eventHandlers
}

let initializationPromise: ReturnType<typeof initializeInternal> | null = null
let resolveInitializationStarted: (() => void) | null = null

/** Allows readiness waiters to arrive before access acquisition finishes. */
const initializationStartedPromise = new Promise<void>(resolve => {
  resolveInitializationStarted = resolve
})

/** Initialize local db and window events. */
export const initialize = (options: InitializeOptions): ReturnType<typeof initializeInternal> => {
  initializationPromise = initializeInternal(options)
  resolveInitializationStarted?.()
  resolveInitializationStarted = null
  return initializationPromise
}

/** Waits for app initialization to finish. Used by e2e tests before interacting with exposed helpers. */
export const waitForInitialized = async (): Promise<void> => {
  if (!initializationPromise) await initializationStartedPromise
  await initializationPromise
}

testFlags.initialize = initialize

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
  waitForInitialized,
  waitForThoughtspaceRuntimeIdle: thoughtspaceRuntime.waitForIdle,
  importToContext: withDispatch(importToContext),
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
