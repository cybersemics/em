import './App.css'
import initDB, * as db from './data-providers/dexie'
import { store } from './store'
import { getContexts, getParent, getThought, getAllChildren, getChildrenRanked, isPending } from './selectors'
import { State } from './util/initialState'
import { hashContext, hashThought, initEvents, initFirebase, owner, setSelection, urlDataSource } from './util'
import { loadFromUrl, loadLocalState, preloadSources } from './action-creators'
import { setCursorFirstMatchActionCreator } from './test-helpers/setCursorFirstMatch'
import importOnFirstMatchPathActionCreator from './test-helpers/importOnFirstMatchPath'
/** Initilaize local db , firebase and window events. */
export const initialize = async () => {

  // load local state unless loading a public context or source url
  await initDB()
  const src = urlDataSource()
  const thoughtsLocalPromise = owner() === '~'
    // authenticated or offline user
    ? store.dispatch(src
      ? loadFromUrl(src)
      : loadLocalState())
    // other user context
    : Promise.resolve()

  // load =preload sources
  thoughtsLocalPromise.then(() => {
    // extra delay for good measure to not block rendering
    setTimeout(() => {
      store.dispatch(preloadSources)
    }, 500)
  })

  initFirebase({ store })

  await thoughtsLocalPromise

  return {
    thoughtsLocalPromise,
    ...initEvents(store),
  }

}

/** Partially apply state to a function. */
const withState = <T, R>(f: (state: State, ...args: T[]) => R) =>
  (...args: T[]) => f(store.getState(), ...args)

/** Set cursor function that is exposed to window for puppeteer testing. */
const setCursorFirstMatch = (unrankedPath: string[]) => store.dispatch(setCursorFirstMatchActionCreator(unrankedPath))

/** Imports text on given unranked path. Used in puppeteer testing. */
const importTextFirstMatch = (unrankedPath: string[], text: string) => store.dispatch(importOnFirstMatchPathActionCreator(unrankedPath, text))

// add em object to window for debugging
window.em = {
  db,
  store,
  // helper functions that will be used by puppeteer tests
  testHelpers: {
    setCursorFirstMatch,
    setSelection,
    importTextFirstMatch,
    clearAll: db.clearAll
  },
  getContexts: withState(getContexts),
  getThought: withState(getThought),
  getParent: withState(getParent),
  getAllChildren: withState(getAllChildren),
  getChildrenRanked: withState(getChildrenRanked),
  hashContext,
  hashThought,
  isPending: withState(isPending),
}

/** Logs debugging information to a fixed position debug window. Useful for PWA debugging. */
window.debug = (message: string) => {
  const debugEl = document.getElementById('debug')!
  debugEl.innerHTML = `${new Date()}: ${message}\n${debugEl.innerHTML}`
}
