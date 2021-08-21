import './App.css'
import _ from 'lodash'
import initDB, * as db from './data-providers/dexie'
import { store } from './store'
import { getContexts, getParent, getLexeme, getAllChildren, getChildrenRanked, isPending } from './selectors'
import { hashContext, hashThought, initEvents, initFirebase, owner, setSelection, urlDataSource } from './util'
import { loadFromUrl, loadLocalState, preloadSources, updateThoughtsFromSubscription } from './action-creators'
import importToContext from './test-helpers/importToContext'
import getLexemeFromDB from './test-helpers/getLexemeFromDB'
import checkDataIntegrity from './test-helpers/checkDataIntegrity'
import { SessionType } from './util/sessionManager'
import * as sessionManager from './util/sessionManager'
import { State, ThoughtSubscriptionUpdates, Thunk } from './@types'

/** Initilaize local db , firebase and window events. */
export const initialize = async () => {
  // initialize the session id
  sessionManager.init()

  // Note: Initialize firebase as soon as possible. Some components like ModalSignup needs to use firebase as soon as it renders.
  // TODO: Check if initializing firebase before local db causes any problem.
  initFirebase({ store })

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

  db.subscribe((updates: ThoughtSubscriptionUpdates) => {
    store.dispatch(updateThoughtsFromSubscription(updates, SessionType.LOCAL))
  })

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
