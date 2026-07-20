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
import { updateThoughtsActionCreator } from './actions/updateThoughts'
import { commandById, executeCommand } from './commands'
import db, { thoughtspaceRuntime } from './data-providers/thoughtspace'
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

/** Initialize local db and window events. */
const initializeInternal = async () => {
  initOfflineStatusStore(/* websocket */)
  const eventHandlers = initEvents(store)

  const { clientId } = await thoughtspaceRuntime.init({
    materialization: {
      getSnapshot: () => {
        const state = store.getState()
        return {
          schemaVersion: state.schemaVersion,
          thoughtIndex: state.thoughts.thoughtIndex,
          lexemeIndex: state.thoughts.lexemeIndex,
        }
      },
      apply: updates => {
        store.dispatch(
          updateThoughtsActionCreator({
            ...updates,
            local: false,
            remote: false,
            repairCursor: true,
          }),
        )
      },
    },
  })

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

  return eventHandlers
}

let initializePromise: ReturnType<typeof initializeInternal> | null = null
let initializeStartedResolve: (() => void) | null = null
const initializeStarted = new Promise<void>(resolve => {
  initializeStartedResolve = resolve
})

/** Initialize local db and window events. */
export const initialize = (): ReturnType<typeof initializeInternal> => {
  initializePromise = initializeInternal()
  initializeStartedResolve?.()
  initializeStartedResolve = null
  return initializePromise
}

/** Waits for app initialization to finish. Used by e2e tests before interacting with exposed helpers. */
export const waitForInitialized = async (): Promise<void> => {
  if (!initializePromise) await initializeStarted
  await initializePromise
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
  executeCommandById: (id: CommandId) => {
    executeCommand(commandById(id))
  },
  dropThoughtspace: thoughtspaceRuntime.drop,
  waitForInitialized,
  waitForThoughtspaceRuntimeIdle: thoughtspaceRuntime.waitForIdle,
  setSelection: selection.set,
  importToContext: withDispatch(importToContext),
  getLexemeFromThoughtspace: (value: string) => db.getLexemeById(hashThought(value)),
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
