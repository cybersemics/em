import _ from 'lodash'
import { State, Thunk } from './@types'
import './App.css'
import { loadFromUrl, loadLocalState, preloadSources } from './action-creators'
import initDB, * as db from './data-providers/dexie'
import { getContexts, getParent, getLexeme, getAllChildren, getChildrenRanked, isPending } from './selectors'
import { store } from './store'
import checkDataIntegrity from './test-helpers/checkDataIntegrity'
import getLexemeFromDB from './test-helpers/getLexemeFromDB'
import importToContext from './test-helpers/importToContext'
import { hashContext, hashThought, initEvents, initFirebase, owner, setSelection, urlDataSource } from './util'

/** Initilaize local db , firebase and window events. */
export const initialize = async () => {
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

  initFirebase({ store })

  await thoughtsLocalPromise

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
  setSelection,
  importToContext: withDispatch(importToContext),
  getLexemeFromDB,
  getState: store.getState,
  subscribe: store.subscribe,
  _: _,
  clearAll: db.clearAll,
}

// add em object to window for debugging
const windowEm = {
  db,
  store,
  // helper functions that will be used by puppeteer tests
  testHelpers,
  getContexts: withState(getContexts),
  getLexeme: withState(getLexeme),
  getParent: withState(getParent),
  getAllChildren: withState(getAllChildren),
  getChildrenRanked: withState(getChildrenRanked),
  hashContext,
  hashThought,
  isPending: withState(isPending),
  checkDataIntegrity: withState(checkDataIntegrity),
}

window.em = windowEm

/** Logs debugging information to a fixed position debug window. Useful for PWA debugging. */
window.debug = (message: string) => {
  const debugEl = document.getElementById('debug')!
  debugEl.innerHTML = `${new Date()}: ${message}\n${debugEl.innerHTML}`
}

export type TestHelpers = typeof windowEm.testHelpers
export type WindowEm = typeof windowEm
