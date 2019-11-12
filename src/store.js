/** Defines the Redux app reducer and exports a global store.
  NOTE: Exporting the store is not compatible with server-side rendering.
*/

import { createStore } from 'redux'
import { encode as firebaseEncode, decode as firebaseDecode } from 'firebase-encode'
import globals from './globals.js'

// reducers
import { authenticate } from './reducers/authenticate.js'
import { clear } from './reducers/clear.js'
import { codeChange } from './reducers/codeChange.js'
import { cursorBeforeSearch } from './reducers/cursorBeforeSearch.js'
import { cursorHistory } from './reducers/cursorHistory.js'
import { data } from './reducers/data.js'
import { deleteData } from './reducers/deleteData.js'
import { dragInProgress } from './reducers/dragInProgress.js'
import { editing } from './reducers/editing.js'
import { existingItemChange } from './reducers/existingItemChange.js'
import { existingItemDelete } from './reducers/existingItemDelete.js'
import { existingItemMove } from './reducers/existingItemMove.js'
import { expandContextItem } from './reducers/expandContextItem.js'
import { helperComplete } from './reducers/helperComplete.js'
import { helperRemindMeLater } from './reducers/helperRemindMeLater.js'
import { newItemSubmit } from './reducers/newItemSubmit.js'
import { render } from './reducers/render.js'
import { search } from './reducers/search.js'
import { searchLimit } from './reducers/searchLimit.js'
import { selectionChange } from './reducers/selectionChange.js'
import { showHelper } from './reducers/showHelper.js'
import { setCursor } from './reducers/setCursor.js'
import { settings } from './reducers/settings.js'
import { status } from './reducers/status.js'
import { toggleCodeView } from './reducers/toggleCodeView.js'
import { toggleContextView } from './reducers/toggleContextView.js'
import { toggleQueue } from './reducers/toggleQueue.js'
import { tutorialChoice } from './reducers/tutorialChoice.js'
import { tutorialStep } from './reducers/tutorialStep.js'

// constants
import {
  EMPTY_TOKEN,
  FIREBASE_CONFIG,
  OFFLINE_TIMEOUT,
  ROOT_TOKEN,
  SCHEMA_CONTEXTCHILDREN,
  SCHEMA_ROOT,
  TUTORIAL_STEP_NONE,
  TUTORIAL_STEP_START,
} from './constants.js'

// util
import {
  equalItemsRanked,
  encodeItems,
  getThought,
  hashThought,
  initialState,
  isTutorial,
  sync,
  syncRemoteData,
  userAuthenticated
} from './util.js'

export const appReducer = (state = initialState(), action) => {
  // console.info('ACTION', action)
  return Object.assign({}, state, (({

    authenticate,
    clear,
    codeChange,
    cursorBeforeSearch,
    cursorHistory,
    data,
    deleteData,
    dragInProgress,
    editing,
    existingItemChange,
    existingItemDelete,
    existingItemMove,
    expandContextItem,
    helperComplete,
    helperRemindMeLater,
    newItemSubmit,
    render,
    search,
    searchLimit,
    selectionChange,
    setCursor,
    settings,
    showHelper,
    status,
    toggleCodeView,
    toggleContextView,
    toggleQueue,
    tutorialChoice,
    tutorialStep,

  })[action.type] || (() => {
    if (!action.type.startsWith('@@')) {
      console.error('Unrecognized action:', action.type, action)
    }
    return state
  }))(state, action))
}

/** Save all firebase data to state and localStorage. */
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
      localOnly: true
    })
  }

  if (settings.tutorialStep !== state.settings.tutorialStep) {
    store.dispatch({
      type: 'settings',
      key: 'tutorialStep',
      value: settings.tutorialStep || TUTORIAL_STEP_START,
      localOnly: true
    })
  }

  // when logging in, we assume the user has already seen the tutorial
  // cancel and delete the tutorial if it is already running
  if (isTutorial()) {
    store.dispatch({ type: 'tutorialStep', value: TUTORIAL_STEP_NONE })
  }

  const migrateRootUpdates = {}

  // data
  // keyRaw is firebase encoded
  const dataUpdates = Object.keys(value.data).reduce((accum, keyRaw) => {

    const key = keyRaw === EMPTY_TOKEN ? ''
      : keyRaw === 'root' && schemaVersion < SCHEMA_ROOT ? ROOT_TOKEN
      : firebaseDecode(keyRaw)
    const item = getThought(keyRaw, value.data)

    // migrate memberOf 'root' to ROOT_TOKEN
    if (schemaVersion < SCHEMA_ROOT) {
      let migratedItem = false
      item.memberOf = (item.memberOf || []).map(parent => {
        const migrateParent = parent.context && parent.context[0] === 'root'
        if (migrateParent) {
          migratedItem = true
        }
        return migrateParent ? Object.assign({}, parent, {
          context: [ROOT_TOKEN].concat(parent.context.slice(1))
        }) : parent
      })

      if (migratedItem) {
        migrateRootUpdates[item.value] = item
      }
    }

    const oldItem = getThought(key, state.data)
    const updated = item && (!oldItem || item.lastUpdated > oldItem.lastUpdated)

    if (updated) {
      // do not force render here, but after all values have been added
      localStorage['data-' + hashThought(key)] = JSON.stringify(item)
    }

    return updated ? Object.assign({}, accum, {
      [key]: item
    }) : accum
  }, {})

  // delete local data that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (state.lastUpdated <= lastUpdated) {
    for (let key in state.data) {

      const keyRaw = key === '' ? EMPTY_TOKEN : firebaseEncode(key)
      if (!(keyRaw in value.data)) {
        // do not force render here, but after all values have been deleted
        store.dispatch({ type: 'deleteData', value: key })
      }
    }
  }

  // migrate from version without contextChildren
  if (schemaVersion < SCHEMA_CONTEXTCHILDREN) {
    // after data dispatch
    setTimeout(() => {
      console.info('Migrating contextChildren...')

      // keyRaw is firebase encoded
      const contextChildrenUpdates = Object.keys(value.data).reduce((accum, keyRaw) => {

        const key = keyRaw === EMPTY_TOKEN ? '' : firebaseDecode(keyRaw)
        const item = getThought(keyRaw, value.data)

        return Object.assign({}, accum, (item.memberOf || []).reduce((parentAccum, parent) => {

          if (!parent || !parent.context) return parentAccum
          const contextEncoded = encodeItems(parent.context)

          return Object.assign({}, parentAccum, {
            [contextEncoded]: (parentAccum[contextEncoded] || accum[contextEncoded] || [])
              .concat({
                key,
                rank: parent.rank,
                lastUpdated: item.lastUpdated
              })
          })
        }, {}))
      }, {})

      console.info('Syncing data...')

      sync({}, contextChildrenUpdates, { updates: { schemaVersion: SCHEMA_CONTEXTCHILDREN }, forceRender: true, callback: () => {
        console.info('Done')
      }})

    })
  }
  else {
    // contextEncodedRaw is firebase encoded
    const contextChildrenUpdates = Object.keys(value.contextChildren || {}).reduce((accum, contextEncodedRaw) => {

      const itemChildren = value.contextChildren[contextEncodedRaw]
      const contextEncoded = contextEncodedRaw === EMPTY_TOKEN ? ''
        : contextEncodedRaw === encodeItems(['root']) && !getThought(ROOT_TOKEN, value.data) ? encodeItems([ROOT_TOKEN])
        : firebaseDecode(contextEncodedRaw)

      // const oldChildren = state.contextChildren[contextEncoded]
      // if (itemChildren && (!oldChildren || itemChildren.lastUpdated > oldChildren.lastUpdated)) {
      if (itemChildren && itemChildren.length > 0) {
        // do not force render here, but after all values have been added
        localStorage['contextChildren' + contextEncoded] = JSON.stringify(itemChildren)
      }

      const itemChildrenOld = state.contextChildren[contextEncoded] || []

      // technically itemChildren is a disparate list of ranked item objects (as opposed to an intersection representing a single context), but equalItemsRanked works
      return Object.assign({}, accum, itemChildren && itemChildren.length > 0 && !equalItemsRanked(itemChildren, itemChildrenOld) ? {
        [contextEncoded]: itemChildren
      } : null)
    }, {})

    // delete local contextChildren that no longer exists in firebase
    // only if remote was updated more recently than local since it is O(n)
    if (state.lastUpdated <= lastUpdated) {
      for (let contextEncoded in state.contextChildren) {

        if (!(firebaseEncode(contextEncoded || EMPTY_TOKEN) in (value.contextChildren || {}))) {
          contextChildrenUpdates[contextEncoded] = null
        }
      }
    }

    // TODO: Re-render all thoughts except the thought being edited
    store.dispatch({ type: 'data', data: dataUpdates, contextChildrenUpdates, forceRender: !window.getSelection().focusNode })
  }

  // sync migrated root with firebase
  if (schemaVersion < SCHEMA_ROOT) {

    setTimeout(() => {

      const migrateRootContextUpdates = {
        [encodeItems(['root'])]: null,
        [encodeItems([ROOT_TOKEN])]: state.contextChildren[encodeItems([ROOT_TOKEN])],
      }

      console.info('Migrating "root"...', migrateRootUpdates, migrateRootContextUpdates)

      migrateRootUpdates.root = null
      migrateRootUpdates[ROOT_TOKEN] = getThought(ROOT_TOKEN, state.data)
      syncRemoteData(migrateRootUpdates, migrateRootContextUpdates, { schemaVersion: SCHEMA_ROOT }, () => {
        console.info('Done')
      })

      // re-render after everything has been updated
      // only if there is no cursor, otherwise it interferes with editing
      if (!state.cursor) {
        store.dispatch({ type: 'render' })
      }
    })
  }
}

export const initFirebase = () => {
  if (window.firebase) {
    const firebase = window.firebase
    firebase.initializeApp(FIREBASE_CONFIG)

    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        userAuthenticated(user)
      }
      else {
        store.dispatch({ type: 'authenticate', value: false })
      }
    })

    const connectedRef = firebase.database().ref(".info/connected")
    connectedRef.on('value', snapshot => {
      const connected = snapshot.val()
      const status = store.getState().status

      // either connect with authenticated user or go to connected state until they login
      if (connected) {

        // once connected, disable offline mode timer
        window.clearTimeout(globals.offlineTimer)

        if (firebase.auth().currentUser) {
          userAuthenticated(firebase.auth().currentUser)
          syncRemoteData() // sync any items in the queue
        }
        else {
          store.dispatch({ type: 'status', value: 'connected' })
        }
      }

      // enter offline mode
      else if (status === 'authenticated') {
        store.dispatch({ type: 'status', value: 'offline' })
      }
    })
  }

  globals.offlineTimer = window.setTimeout(() => {
    store.dispatch({ type: 'status', value: 'offline' })
  }, OFFLINE_TIMEOUT)
}

export const store = createStore(
  appReducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)
