import './App.css'
import _ from 'lodash'
import initDB, * as db from './data-providers/dexie'
import { store } from './store'
import { getContexts, getParent, getLexeme, getAllChildren, getChildrenRanked, isPending } from './selectors'
import { hashContext, hashThought, initEvents, owner, setSelection, urlDataSource } from './util'
import {
  authenticate,
  loadPublicThoughts,
  setRemoteSearch,
  status as statusActionCreator,
  userAuthenticated,
  loadFromUrl,
  loadLocalState,
  preloadSources,
  updateThoughtsFromSubscription,
} from './action-creators'
import importToContext from './test-helpers/importToContext'
import getLexemeFromDB from './test-helpers/getLexemeFromDB'
import checkDataIntegrity from './test-helpers/checkDataIntegrity'
import { SessionType } from './util/sessionManager'
import * as sessionManager from './util/sessionManager'
import { Firebase, State, ThoughtSubscriptionUpdates, Thunk } from './@types'
import { ALGOLIA_CONFIG, FIREBASE_CONFIG, OFFLINE_TIMEOUT } from './constants'
import globals from './globals'
import { subscribe } from './data-providers/firebase'
import initAlgoliaSearch from './search/algoliaSearch'

interface InitFirebaseOptions {
  onConnected?: (connected: boolean, authenticated: boolean) => void
}

/** Initialize firebase and event handlers. */
export const initFirebase = async ({ onConnected }: InitFirebaseOptions): Promise<void> => {
  if (window.firebase) {
    const firebase = window.firebase
    firebase.initializeApp(FIREBASE_CONFIG)

    // on auth change
    // this is called when the user logs in or the page refreshes when the user is already authenticated
    firebase.auth().onAuthStateChanged((user: Firebase.User) => {
      if (user) {
        store.dispatch(userAuthenticated(user))

        subscribe(user.uid, (updates: ThoughtSubscriptionUpdates) => {
          store.dispatch(updateThoughtsFromSubscription(updates, SessionType.REMOTE))
        })

        const { applicationId, index } = ALGOLIA_CONFIG
        const hasRemoteConfig = applicationId && index

        if (!hasRemoteConfig) console.warn('Algolia configs not found. Remote search is not enabled.')
        else initAlgoliaSearch(user.uid, { applicationId, index }, store)
      } else {
        store.dispatch(authenticate({ value: false }))
        store.dispatch(setRemoteSearch({ value: false }))
      }
    })

    // load a public context
    if (owner() !== '~') {
      store.dispatch(loadPublicThoughts())
    }

    // on connect change
    // this is called when moving from online to offline and vice versa
    const connectedRef = firebase.database().ref('.info/connected')
    connectedRef.on('value', async (snapshot: Firebase.Snapshot<boolean>) => {
      const connected = snapshot.val()
      const status = store.getState().status

      onConnected?.(connected, !!firebase.auth().currentUser)

      // either connect with authenticated user or go to connected state until they login
      if (connected) {
        // unsubscribe from Dexie subscriptions to avoid redundant updates since we will get all updates from Firebase

        // once connected, disable offline mode timer
        window.clearTimeout(globals.offlineTimer)

        // if reconnecting from offline mode, onAuthStateChange is not called since Firebase is still authenticated, but we still need to execute the app authentication logic and subscribe to the main value event
        // if status is loading, we can assume onAuthStateChanged and thus userAuthenticated was already called
        if (status !== 'loading' && firebase.auth().currentUser) {
          await store.dispatch(userAuthenticated(firebase.auth().currentUser))
        }
      }

      // if thoughtIndex was already loaded and we go offline, enter offline mode immediately
      else if (status === 'loaded') {
        store.dispatch(statusActionCreator({ value: 'offline' }))
      }
    })
  }

  // before thoughtIndex has been loaded, wait a bit before going into offline mode to avoid flashing the Offline status message
  globals.offlineTimer = window.setTimeout(() => {
    store.dispatch(statusActionCreator({ value: 'offline' }))
  }, OFFLINE_TIMEOUT)
}
/** Initilaize local db , firebase and window events. */
export const initialize = async () => {
  /** Dispatches updateThoughtsFromSubscription when a local subscription is received. Passed to db.subscribe. */
  const onLocalSubscription = (updates: ThoughtSubscriptionUpdates) => {
    console.log('onLocalSubscription')
    store.dispatch(updateThoughtsFromSubscription(updates, SessionType.LOCAL))
  }
  // initialize the session id
  sessionManager.init()

  // Note: Initialize firebase as soon as possible. Some components like ModalSignup needs to use firebase as soon as it renders.
  // TODO: Check if initializing firebase before local db causes any problem.
  initFirebase({
    // we subscribe/unsubscribe from Dexie depending on whether Firebase is connected
    // this avoids processing subscriptions before they get to updateThoughtsFromSubscription
    onConnected: (connected: boolean, authenticated: boolean) => {
      if (connected) {
        console.log('unsubscribe')
        db.unsubscribe()
      } else {
        console.log('re-subscribe')
        db.subscribe(onLocalSubscription)
      }
    },
  })

  // load local state unless loading a public context or source url
  await initDB()

  console.log('subscribe')
  db.subscribe(onLocalSubscription)

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
