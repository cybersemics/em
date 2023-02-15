import _ from 'lodash'
import moize from 'moize'
import Context from './@types/Context'
import State from './@types/State'
import Thunk from './@types/Thunk'
import './App.css'
import loadFromUrl from './action-creators/loadFromUrl'
import loadLocalState from './action-creators/loadLocalState'
import preloadSources from './action-creators/preloadSources'
import pull from './action-creators/pull'
import setCursor from './action-creators/setCursor'
import getLexemeHelper from './data-providers/data-helpers/getLexeme'
import initDB from './data-providers/dexie'
import * as db from './data-providers/yjs/thoughtspace'
import * as selection from './device/selection'
import contextToThoughtId from './selectors/contextToThoughtId'
import decodeThoughtsUrl from './selectors/decodeThoughtsUrl'
import { getAllChildren, getAllChildrenAsThoughts, getChildrenRanked } from './selectors/getChildren'
import getContexts from './selectors/getContexts'
import getLexeme from './selectors/getLexeme'
import getThoughtById from './selectors/getThoughtById'
import thoughtToContext from './selectors/thoughtToContext'
import store from './stores/app'
import { init as initOfflineStatusStore } from './stores/offlineStatusStore'
import importToContext from './test-helpers/importToContext'
import prettyPath from './test-helpers/prettyPath'
import hashThought from './util/hashThought'
import initEvents from './util/initEvents'
import isRoot from './util/isRoot'
import owner from './util/owner'
import * as sessionManager from './util/sessionManager'
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
export const initialize = async () => {
  await initOfflineStatusStore()

  // initialize the session id
  sessionManager.init()

  // load local state unless loading a public context or source url
  await initDB()

  const src = urlDataSource()
  const thoughtsLocalPromise =
    owner() === '~'
      ? // authenticated or offline user
        store.dispatch(src ? loadFromUrl(src) : loadLocalState())
      : // other user context
        Promise.resolve()

  // load =preload sources
  thoughtsLocalPromise.then(() => {
    // extra delay for good measure to not block rendering
    setTimeout(() => {
      store.dispatch(preloadSources)
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
  contextToThoughtId,
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
  // helper functions that will be used by puppeteer tests
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
