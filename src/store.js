/** Defines the Redux app reducer and exports a global store.
  NOTE: Exporting the store is not compatible with server-side rendering.
*/

import { createStore, applyMiddleware } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'
import { decode as firebaseDecode } from 'firebase-encode'
import globals from './globals.js'
import { migrate } from './migrations/index.js'
import * as localForage from 'localforage'

// app reducer
import appReducer from './reducers'

// constants
import {
  EMPTY_TOKEN,
  FIREBASE_CONFIG,
  OFFLINE_TIMEOUT,
  ROOT_TOKEN,
  SCHEMA_HASHKEYS,
  TUTORIAL_STEP_START,
} from './constants.js'

// util
import {
  hashContext,
  equalPath,
  getThought,
  userAuthenticated
} from './util.js'

/** Loads state from Firebase into local store */
const loadThoughts = state => {

  const lastUpdated = state.lastUpdated
  const schemaVersion = state.schemaVersion || 0 // convert to integer to allow numerical comparison

  // thoughtIndex
  // keyRaw is firebase encoded
  const thoughtIndexUpdates = Object.keys(state.thoughtIndex).reduce((accum, keyRaw) => {

    const key = schemaVersion < SCHEMA_HASHKEYS
      ? (keyRaw === EMPTY_TOKEN ? '' : firebaseDecode(keyRaw))
      : keyRaw
    const thought = state.thoughtIndex[keyRaw]

    const oldThought = state.thoughtIndex[key]
    const updated = thought && (!oldThought || thought.lastUpdated > oldThought.lastUpdated)

    if (updated) {
      // do not force render here, but after all values have been added
      localForage.setItem('thoughtIndex-' + key, thought)
    }

    return updated ? Object.assign({}, accum, {
      [key]: thought
    }) : accum
  }, {})

  // contextEncodedRaw is firebase encoded
  const contextIndexUpdates = Object.keys(state.contextIndex || {}).reduce((accum, contextEncodedRaw) => {

    const subthoughts = state.contextIndex[contextEncodedRaw]
    const contextEncoded = schemaVersion < SCHEMA_HASHKEYS
      ? (contextEncodedRaw === EMPTY_TOKEN ? ''
        : contextEncodedRaw === hashContext(['root']) && !getThought(ROOT_TOKEN, state.thoughtIndex) ? hashContext([ROOT_TOKEN])
          : firebaseDecode(contextEncodedRaw))
      : contextEncodedRaw
    const subthoughtsOld = state.contextIndex[contextEncoded] || []

    // TODO: Add lastUpdated to contextIndex. Requires migration.
    // subthoughts.lastUpdated > oldSubthoughts.lastUpdated
    // technically subthoughts is a disparate list of ranked thought objects (as opposed to an intersection representing a single context), but equalPath works
    if (subthoughts && subthoughts.length > 0 && !equalPath(subthoughts, subthoughtsOld)) {
      localForage.setItem('contextIndex-' + contextEncoded, subthoughts)

      return {
        ...accum,
        [contextEncoded]: subthoughts
      }
    }
    else {
      return accum
    }

  }, {})

  // delete local contextIndex that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (state.lastUpdated <= lastUpdated) {
    Object.keys(state.contextIndex).forEach(contextEncoded => {
      if (!(contextEncoded in (state.contextIndex || {}))) {
        contextIndexUpdates[contextEncoded] = null
      }
    })
  }

  // TODO: Re-render only thoughts that have changed
  store.dispatch({
    type: 'thoughtIndex',
    thoughtIndexUpdates,
    contextIndexUpdates,
    proseViews: state.proseViews,
    forceRender: true
  })
}

/** Save all firebase state to state and localStorage. */
export const updateState = newState => {

  const state = store.getState()
  const lastUpdated = newState.lastUpdated
  const settings = newState.settings || {}

  // settings
  // avoid unnecessary actions if values are identical
  if (settings.dark !== state.settings.dark) {
    store.dispatch({
      type: 'settings',
      key: 'dark',
      value: settings.dark || false,
      remote: false
    })
  }

  if (settings.tutorial !== state.settings.tutorial) {
    store.dispatch({
      type: 'settings',
      key: 'tutorial',
      value: settings.tutorial != null ? settings.tutorial : true,
      remote: false
    })
  }

  if (settings.tutorialStep !== state.settings.tutorialStep) {
    store.dispatch({
      type: 'settings',
      key: 'tutorialStep',
      value: settings.tutorialStep || TUTORIAL_STEP_START,
      remote: false
    })
  }

  // persist proseViews locally
  // TODO: handle merges
  Object.keys(newState.proseViews || {}).forEach(key => {
    if (newState.proseViews[key]) {
      localForage.setItem('proseViews-' + key, true)
    }
  })

  // delete local thoughtIndex that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (state.lastUpdated <= lastUpdated) {
    Object.keys(state.thoughtIndex).forEach(key => {
      if (!(key in newState.thoughtIndex)) {
        // do not force render here, but after all values have been deleted
        store.dispatch({ type: 'deleteData', value: state.thoughtIndex[key].value })
      }
    })
  }

  loadThoughts(newState)

  // give time for loadThoughts to complete
  setTimeout(() => {
    migrate(newState)
  }, 100)
}

/** Initialize firebase and event handlers. */
export const initFirebase = async () => {
  if (window.firebase) {
    const firebase = window.firebase
    firebase.initializeApp(FIREBASE_CONFIG)

    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        await userAuthenticated(user)
      }
      else {
        store.dispatch({ type: 'authenticate', value: false })
      }
    })

    const connectedRef = firebase.database().ref('.info/connected')
    connectedRef.on('value', async (snapshot) => {
      const connected = snapshot.val()
      const status = store.getState().status

      // either connect with authenticated user or go to connected state until they login
      if (connected) {

        // once connected, disable offline mode timer
        window.clearTimeout(globals.offlineTimer)

        if (firebase.auth().currentUser) {
          await userAuthenticated(firebase.auth().currentUser)
        }
      }

      // if thoughtIndex was already loaded and we go offline, enter offline mode immediately
      else if (status === 'loaded') {
        store.dispatch({ type: 'status', value: 'offline' })
      }
    })
  }

  // before thoughtIndex has been loaded, wait a bit before going into offline mode to avoid flashing the Offline status message
  globals.offlineTimer = window.setTimeout(() => {
    store.dispatch({ type: 'status', value: 'offline' })
  }, OFFLINE_TIMEOUT)
}

export const store = createStore(
  appReducer,
  composeWithDevTools(applyMiddleware(thunk))
)
