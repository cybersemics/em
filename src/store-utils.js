import { createStore } from 'redux'
import { encode as firebaseEncode, decode as firebaseDecode } from 'firebase-encode'
import { clientId } from './browser.js'
import globals from './globals.js'
import store from './store.js'

// constants
import {
  EMPTY_TOKEN,
  FIREBASE_CONFIG,
  OFFLINE_TIMEOUT,
  RANKED_ROOT,
  RENDER_DELAY,
  ROOT_TOKEN,
  SCHEMA_CONTEXTCHILDREN,
  SCHEMA_LATEST,
  SCHEMA_ROOT,
  TUTORIAL_STEP0_START,
  TUTORIAL_STEP4_END,
} from './constants.js'

// util
import {
  animateWelcome,
  canShowHelper,
  decodeItemsUrl,
  equalItemsRanked,
  encodeItems,
  expandItems,
  isRoot,
  splitChain,
  timestamp,
  updateUrlHistory,
  userAuthenticated
} from './util.js'

/** Adds remote updates to a local queue so they can be resumed after a disconnect. */
// invokes callback asynchronously whether online or not in order to not outrace re-render
export const syncRemote = (updates = {}, callback) => {
  const state = store.getState()

  // add updates to queue appending clientId and timestamp
  const queue = Object.assign(
    JSON.parse(localStorage.queue || '{}'),
    // encode keys for firebase
    Object.keys(updates).length > 0 ? Object.assign(updates, {
      lastClientId: clientId,
      lastUpdated: timestamp()
    }) : {}
  )

  localStorage.queue = JSON.stringify(queue)

  // if authenticated, execute all updates
  // otherwise, queue them up
  if (state.status === 'authenticated' && Object.keys(queue).length > 0) {
    state.userRef.update(queue, (...args) => {
      delete localStorage.queue
      if (callback) {
        callback(...args)
      }
    })
  }
  else if (callback) {
    setTimeout(callback, RENDER_DELAY)
  }
}

/** alias for syncing data updates only */
export const syncRemoteData = (dataUpdates = {}, contextChildrenUpdates = {}, updates = {}, callback) => {
  // prepend data/ and encode key
  const prependedUpdates = Object.keys(dataUpdates).reduce((accum, key) =>
    Object.assign({}, accum, {
      ['data/' + (key === '' ? EMPTY_TOKEN : firebaseEncode(key))]: dataUpdates[key]
    }),
    {}
  )
  const prependedContextChildrenUpdates = Object.keys(contextChildrenUpdates).reduce((accum, contextEncoded) =>
    Object.assign({}, accum, {
      ['contextChildren/' + (contextEncoded === '' ? EMPTY_TOKEN : firebaseEncode(contextEncoded))]: contextChildrenUpdates[contextEncoded]
    }),
    {}
  )
  return syncRemote(Object.assign({}, updates, prependedUpdates, prependedContextChildrenUpdates), callback)
}

/** Saves data to state, localStorage, and Firebase. */
// assume timestamp has already been updated on dataUpdates
export const sync = (dataUpdates={}, contextChildrenUpdates={}, { localOnly, forceRender, updates, callback } = {}) => {

  const lastUpdated = timestamp()
  const { data } = store.getState()

  // state
  store.dispatch({ type: 'data', data: dataUpdates, contextChildrenUpdates, forceRender })

  // localStorage
  for (let key in dataUpdates) {
    if (dataUpdates[key] && !dataUpdates[key].tutorial) {
      localStorage['data-' + key] = JSON.stringify(dataUpdates[key])
    }
    else {
      delete localStorage['data-' + key]
    }
    localStorage.lastUpdated = lastUpdated
  }

  // go to some extra trouble to not store tutorial thoughts
  for (let contextEncoded in contextChildrenUpdates) {
    const children = contextChildrenUpdates[contextEncoded].filter(child => {
      return !(data[child.key] && data[child.key].tutorial) && !(dataUpdates[child.key] && dataUpdates[child.key].tutorial)
    })
    if (children.length > 0) {
      localStorage['contextChildren' + contextEncoded] = JSON.stringify(children)
    }
  }

  // firebase
  if (!localOnly) {
    syncRemoteData(dataUpdates, contextChildrenUpdates, updates, callback)
  }
  else {
    // do not let callback outrace re-render
    if (callback) {
      setTimeout(callback, RENDER_DELAY)
    }
  }
}


/** Shortcut for sync with single item. */
export const syncOne = (item, contextChildrenUpdates={}, options) => {
  sync({
    [item.value]: item
  }, contextChildrenUpdates, options)
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
      value: settings.tutorialStep || TUTORIAL_STEP0_START,
      localOnly: true
    })
  }

  // when logging in, we assume the user has already seen the tutorial
  // cancel and delete the tutorial if it is already running
  if (settings.tutorialStep < TUTORIAL_STEP4_END) {
    store.dispatch({ type: 'deleteTutorial' })
  }

  const migrateRootUpdates = {}

  // data
  // keyRaw is firebase encoded
  const dataUpdates = Object.keys(value.data).reduce((accum, keyRaw) => {

    const key = keyRaw === EMPTY_TOKEN ? ''
      : keyRaw === 'root' && schemaVersion < SCHEMA_ROOT ? ROOT_TOKEN
      : firebaseDecode(keyRaw)
    const item = value.data[keyRaw]

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

    const oldItem = state.data[key]
    const updated = item && (!oldItem || item.lastUpdated > oldItem.lastUpdated)

    if (updated) {
      // do not force render here, but after all values have been added
      localStorage['data-' + key] = JSON.stringify(item)
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
        store.dispatch({ type: 'delete', value: key })
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
        const item = value.data[keyRaw]

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
        : contextEncodedRaw === encodeItems(['root']) && !value.data[ROOT_TOKEN] ? encodeItems([ROOT_TOKEN])
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
      migrateRootUpdates[ROOT_TOKEN] = state.data[ROOT_TOKEN]
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

export const initialState = () => {

  const state = {

    /* status:
      'disconnected'   Yet to connect to firebase, but not in explicit offline mode.
      'connecting'     Connecting to firebase.
      'connected'      Connected to firebase, but not necessarily authenticated.
      'authenticated'  Connected and authenticated.
      'offline'        Disconnected and working in offline mode.
    */
    status: 'disconnected',
    focus: RANKED_ROOT,
    contextViews: {},
    data: {
      [ROOT_TOKEN]: {
        value: ROOT_TOKEN,
        memberOf: [],
        created: timestamp(),
        lastUpdated: timestamp()
      }
    },
    // store children indexed by the encoded context for O(1) lookup of children
    contextChildren: {
      [encodeItems([ROOT_TOKEN])]: []
    },
    lastUpdated: localStorage.lastUpdated,
    settings: {
      dark: JSON.parse(localStorage['settings-dark'] || 'false'),
      autologin: JSON.parse(localStorage['settings-autologin'] || 'false'),
      tutorialStep: globals.disableTutorial ? TUTORIAL_STEP4_END : JSON.parse(localStorage['settings-tutorialStep'] || TUTORIAL_STEP0_START),
    },
    // cheap trick to re-render when data has been updated
    dataNonce: 0,
    helpers: {},
    cursorHistory: [],
    schemaVersion: SCHEMA_LATEST
  }

  // initial data
  for (let key in localStorage) {
    if (key.startsWith('data-')) {
      const value = key.substring(5)
      state.data[value] = JSON.parse(localStorage[key])
    }
    else if (key.startsWith('contextChildren_')) {
      const value = key.substring('contextChildren'.length)
      state.contextChildren[value] = JSON.parse(localStorage[key])
    }
  }

  // if we land on the home page, restore the saved cursor
  // this is helpful for running em as a home screen app that refreshes from time to time
  const restoreCursor = window.location.pathname.length <= 1 && localStorage.cursor
  const { itemsRanked, contextViews } = decodeItemsUrl(restoreCursor ? localStorage.cursor : window.location.pathname, state.data)

  if (restoreCursor) {
    updateUrlHistory(itemsRanked, { data: state.data })
  }

  // set cursor to null instead of root
  state.cursor = isRoot(itemsRanked) ? null : itemsRanked
  state.cursorBeforeEdit = state.cursor
  state.contextViews = contextViews
  state.expanded = state.cursor ? expandItems(state.cursor, state.data, state.contextChildren, contextViews, splitChain(state.cursor, { state: { data: state.data, contextViews }})) : {}

  // initial helper states
  const helpers = ['welcome', 'shortcuts', 'home', 'newItem', 'newChild', 'newChildSuccess', 'autofocus', 'superscriptSuggestor', 'superscript', 'contextView', 'editIdentum', 'depthBar', 'feedback']
  for (let i = 0; i < helpers.length; i++) {
    state.helpers[helpers[i]] = {
      complete: globals.disableTutorial || JSON.parse(localStorage['helper-complete-' + helpers[i]] || 'false'),
      hideuntil: JSON.parse(localStorage['helper-hideuntil-' + helpers[i]] || '0')
    }
  }

  // welcome helper
  if (canShowHelper('welcome', state)) {
    state.showHelper = 'welcome'
  }
  else {
    setTimeout(animateWelcome)
  }

  return state
}