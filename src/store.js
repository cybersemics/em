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
  SCHEMA_CONTEXTCHILDREN,
  SCHEMA_HASHKEYS,
  SCHEMA_ROOT,
  TUTORIAL_STEP_START,
} from './constants.js'

// util
import {
  hashContext,
  equalPath,
  getThought,
  sync,
  syncRemote,
  userAuthenticated
} from './util.js'

/** Save all firebase thoughtIndex to state and localStorage. */
export const fetch = value => {

  const state = store.getState()
  const lastUpdated = value.lastUpdated
  const settings = value.settings || {}
  const schemaVersion = value.schemaVersion || 0 // convert to integer to allow numerical comparison

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
  Object.keys(value.proseViews || {}).forEach(key => {
    if (value.proseViews[key]) {
      localForage.setItem('proseViews-' + key, true)
    }
  })

  const migrateRootUpdates = {}

  // thoughtIndex
  // keyRaw is firebase encoded
  const thoughtIndexUpdates = Object.keys(value.thoughtIndex).reduce((accum, keyRaw) => {

    const key = schemaVersion < SCHEMA_HASHKEYS
      ? (keyRaw === EMPTY_TOKEN ? ''
        : keyRaw === 'root' && schemaVersion < SCHEMA_ROOT ? ROOT_TOKEN
          : firebaseDecode(keyRaw))
      : keyRaw
    const thought = value.thoughtIndex[keyRaw]

    // migrate contexts 'root' to ROOT_TOKEN
    if (schemaVersion < SCHEMA_ROOT) {
      let migratedThought = false // eslint-disable-line fp/no-let
      thought.contexts = (thought.contexts || []).map(parent => {
        const migrateParent = parent.context && parent.context[0] === 'root'
        if (migrateParent) {
          migratedThought = true
        }
        return migrateParent ? Object.assign({}, parent, {
          context: [ROOT_TOKEN].concat(parent.context.slice(1))
        }) : parent
      })

      if (migratedThought) {
        migrateRootUpdates[thought.value] = thought
      }
    }

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

  // delete local thoughtIndex that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (state.lastUpdated <= lastUpdated) {
    Object.keys(state.thoughtIndex).forEach(key => {
      if (!(key in value.thoughtIndex)) {
        // do not force render here, but after all values have been deleted
        store.dispatch({ type: 'deleteData', value: state.thoughtIndex[key].value })
      }
    })
  }

  // migrate from version without contextIndex
  if (schemaVersion < SCHEMA_CONTEXTCHILDREN) {
    // after thoughtIndex dispatch
    setTimeout(() => {
      console.info('Migrating contextIndex...')

      // keyRaw is firebase encoded
      const contextIndexUpdates = Object.keys(value.thoughtIndex).reduce((accum, keyRaw) => {

        const key = keyRaw === EMPTY_TOKEN ? '' : firebaseDecode(keyRaw)
        const thought = value.thoughtIndex[keyRaw]

        return Object.assign({}, accum, (thought.contexts || []).reduce((parentAccum, parent) => {

          if (!parent || !parent.context) return parentAccum
          const contextEncoded = hashContext(parent.context)

          return Object.assign({}, parentAccum, {
            [contextEncoded]: (parentAccum[contextEncoded] || accum[contextEncoded] || [])
              .concat({
                key,
                rank: parent.rank,
                lastUpdated: thought.lastUpdated
              })
          })
        }, {}))
      }, {})

      console.info('Syncing thoughtIndex...')

      sync({}, contextIndexUpdates, {
        updates: { schemaVersion: SCHEMA_CONTEXTCHILDREN }, forceRender: true, callback: () => {
          console.info('Done')
        }
      })

    })
  }
  else {
    // contextEncodedRaw is firebase encoded
    const contextIndexUpdates = Object.keys(value.contextIndex || {}).reduce((accum, contextEncodedRaw) => {

      const subthoughts = value.contextIndex[contextEncodedRaw]
      const contextEncoded = schemaVersion < SCHEMA_HASHKEYS
        ? (contextEncodedRaw === EMPTY_TOKEN ? ''
          : contextEncodedRaw === hashContext(['root']) && !getThought(ROOT_TOKEN, value.thoughtIndex) ? hashContext([ROOT_TOKEN])
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
        if (!(contextEncoded in (value.contextIndex || {}))) {
          contextIndexUpdates[contextEncoded] = null
        }
      })
    }

    // TODO: Re-render only thoughts that have changed
    store.dispatch({
      type: 'thoughtIndex',
      thoughtIndexUpdates,
      contextIndexUpdates,
      proseViews: value.proseViews,
      forceRender: true
    })
  }

  // sync migrated root with firebase
  if (schemaVersion < SCHEMA_ROOT) {

    setTimeout(() => {

      const migrateRootContextUpdates = {
        [hashContext(['root'])]: null,
        [hashContext([ROOT_TOKEN])]: state.contextIndex[hashContext([ROOT_TOKEN])],
      }

      console.info('Migrating "root"...', migrateRootUpdates, migrateRootContextUpdates)

      migrateRootUpdates.root = null
      migrateRootUpdates[ROOT_TOKEN] = getThought(ROOT_TOKEN, state.thoughtIndex)
      syncRemote(migrateRootUpdates, migrateRootContextUpdates, { schemaVersion: SCHEMA_ROOT }, () => {
        console.info('Done')
      })

      // re-render after everything has been updated
      // only if there is no cursor, otherwise it interferes with editing
      if (!state.cursor) {
        store.dispatch({ type: 'render' })
      }
    })
  }

  // WARNING: These migrations will not run serially as implemented. Promise-based migration sequencing algorithm needed.
  if (schemaVersion < SCHEMA_HASHKEYS) {
    setTimeout(() => {
      migrate(value)
    })
  }
}

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
