/** Defines the Redux app reducer and exports a global store.
  NOTE: Exporting the store is not compatible with server-side rendering.
*/

import { createStore, applyMiddleware } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import thunk from 'redux-thunk'
import globals from './globals.js'
import loadThoughts from './action-creators/loadThoughts.js'
import { migrate } from './migrations/index.js'
import * as localForage from 'localforage'

// app reducer
import appReducer from './reducers'

// constants
import {
  FIREBASE_CONFIG,
  OFFLINE_TIMEOUT,
  SCHEMA_HASHKEYS,
  TUTORIAL_STEP_START,
} from './constants.js'

// util
import {
  sync,
  userAuthenticated
} from './util.js'

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

  // delete local thoughts that no longer exists in firebase
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
    migrate(newState).then(({ thoughtIndexUpdates, contextIndexUpdates }) =>
      sync(thoughtIndexUpdates, contextIndexUpdates, { updates: { schemaVersion: SCHEMA_HASHKEYS }, local: false, forceRender: true, callback: () => {
        console.info('Done')
      } })
    )
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
