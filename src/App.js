/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react'
import { Provider, connect } from 'react-redux'
import ContentEditable from 'react-contenteditable'
import { encode as firebaseEncode, decode as firebaseDecode } from 'firebase-encode'
import * as evaluate from 'static-eval'
import * as htmlparser from 'htmlparser2'
// import { parse } from 'esprima'
import assert from 'assert'
import { DragDropContext, DragSource, DropTarget } from 'react-dnd'
import HTML5Backend, { getEmptyImage } from 'react-dnd-html5-backend'
import TouchBackend from 'react-dnd-touch-backend'
import MultiBackend, { TouchTransition } from 'react-dnd-multi-backend'
import * as classNames from 'classnames'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

import * as pkg from '../package.json'
import './App.css'
import logo from './logo-black-inline.png'
import logoDark from './logo-white-inline.png'
import logoInline from './logo-black-inline.png'
import logoDarkInline from './logo-white-inline.png'
import * as AsyncFocus from './async-focus.js'
import { clientId, isMac, isMobile } from './browser.js'
import { initialState, store } from './store.js'

// globals
import globals from './globals.js'

// components
import { MultiGesture } from './components/MultiGesture.js'
import { GestureDiagram } from './components/GestureDiagram.js'

// constants
import {
  ANIMATE_CHAR_STEP,
  ANIMATE_PAUSE_BETWEEN_ITEMS,
  EMPTY_TOKEN,
  FADEOUT_DURATION,
  GETCHILDRENWITHRANK_VALIDATION_FREQUENCY,
  HELPER_CLOSE_DURATION,
  HELPER_REMIND_ME_LATER_DURATION,
  MAX_CURSOR_HISTORY,
  MAX_DEPTH,
  MAX_DISTANCE_FROM_CURSOR,
  OFFLINE_TIMEOUT,
  RANKED_ROOT,
  RENDER_DELAY,
  ROOT_TOKEN,
  SCHEMA_CONTEXTCHILDREN,
  SCHEMA_LATEST,
  SCHEMA_ROOT,
  TUTORIAL_STEP0_START,
  TUTORIAL_STEP1_NEWTHOUGHTINCONTEXT,
  TUTORIAL_STEP2_ANIMATING,
  TUTORIAL_STEP3_DELETE,
  TUTORIAL_STEP4_END,
} from './constants.js'

// util
import {
  addContext,
  ancestors,
  animateWelcome,
  canShowHelper,
  chain,
  compareByRank,
  componentToItem,
  conjunction,
  contextChainToItemsRanked,
  cursorBack,
  cursorForward,
  decodeItemsUrl,
  deleteItem,
  disableTutorial,
  editableNode,
  encodeItems,
  encodeItemsUrl,
  equalArrays,
  equalItemRanked,
  equalItemsRanked,
  exists,
  exit,
  expandItems,
  flatMap,
  flatten,
  getContexts,
  getContextsSortedAndRanked,
  getChildrenWithRank,
  getDescendants,
  getNextRank,
  getRankAfter,
  getRankBefore,
  helperCleanup,
  importText,
  intersections,
  isBefore,
  isContextViewActive,
  isElementHiddenByAutoFocus,
  isRoot,
  lastItemsFromContextChain,
  log,
  makeCompareByProp,
  moveItem,
  newItem,
  nextEditable,
  notFalse,
  notNull,
  perma,
  prevEditable,
  prevSibling,
  rankItemsFirstMatch,
  rankItemsSequential,
  removeContext,
  restoreCursorBeforeSearch,
  restoreSelection,
  rootedIntersections,
  selectNextEditable,
  selectPrevEditable,
  sigKey,
  signifier,
  sigRank,
  spellNumber,
  splice,
  splitChain,
  strip,
  stripPunctuation,
  subsetItems,
  sumChildrenLength,
  sync,
  syncOne,
  syncRemote,
  syncRemoteData,
  timestamp,
  translateContentIntoView,
  unrank,
  unroot,
  updateUrlHistory
} from './util.js'

const asyncFocus = AsyncFocus()
const parse = require('esprima').parse


/*=============================================================
 * Globals
 *============================================================*/

const firebaseConfig = {
  apiKey: "AIzaSyB7sj38woH-oJ7hcSwpq0lB7hUteyZMxNo",
  authDomain: "em-proto.firebaseapp.com",
  databaseURL: "https://em-proto.firebaseio.com",
  projectId: "em-proto",
  storageBucket: "em-proto.appspot.com",
  messagingSenderId: "91947960488"
}

// a silly global variable used to preserve localStorage.queue for new users
// see usage below
let queuePreserved = {}


/*=============================================================
 * Helper Functions
 *============================================================*/


/*=============================================================
 * Global Shortcuts
 *============================================================*/

/* Map global keyboard shortcuts and gestures to commands */
const globalShortcuts = [

  {
    name: 'Cursor Back',
    gesture: 'r',
    keyboard: 'Escape',
    exec: exit
  },

  {
    name: 'Cursor Forward',
    gesture: 'l',
    exec: cursorForward
  },

  {
    name: 'Delete Item',
    gesture: 'ldl',
    keyboard: { key: 'Backspace', shift: true, meta: true },
    exec: e => {
      const { cursor } = store.getState()
      if (cursor) {
        deleteItem()
      }
      else {
        e.allowDefault()
      }
    }
  },

  {
    name: 'Delete Empty Item',
    keyboard: { key: 'Backspace' },
    hideFromInstructions: true,
    exec: e => {
      const { cursor, contextViews, editing } = store.getState()
      const showContexts = isContextViewActive(unrank(intersections(cursor)), { state: store.getState() })
      const offset = window.getSelection().focusOffset

      if (cursor) {
        if (sigKey(cursor) === '') {
          deleteItem()
        }
        else if (offset === 0 && !showContexts) {

          const key = sigKey(cursor)
          const rank = sigRank(cursor)
          const contextChain = splitChain(cursor, contextViews)
          const itemsRanked = lastItemsFromContextChain(contextChain)
          const items = unrank(itemsRanked)
          const context = items.length > 1 ? intersections(items) : [ROOT_TOKEN]
          const children = getChildrenWithRank(itemsRanked)
          const prev = prevSibling(key, rootedIntersections(cursor), rank)
          const keyNew = prev.key + key
          const itemsRankedPrevNew = intersections(itemsRanked).concat({
            key: keyNew,
            rank: prev.rank
          })

          store.dispatch({
            type: 'existingItemChange',
            oldValue: prev.key,
            newValue: keyNew,
            context,
            itemsRanked: intersections(itemsRanked).concat(prev)
          })

          // merge children into merged thought
          children.forEach(child => {
            store.dispatch({
              type: 'existingItemMove',
              oldItemsRanked: itemsRanked.concat(child),
              newItemsRanked: itemsRankedPrevNew.concat(child)
            })
          })

          store.dispatch({
            type: 'existingItemDelete',
            rank,
            itemsRanked: unroot(itemsRanked)
          })

          // restore selection
          if (!isMobile || editing) {
            asyncFocus.enable()
            restoreSelection(itemsRankedPrevNew, { offset: prev.key.length })
          }
          else {
            store.dispatch({ type: 'setCursor', itemsRanked: itemsRankedPrevNew })
          }

        }
        else {
          e.allowDefault()
        }
      }
      else {
        e.allowDefault()
      }
    }
  },

  {
    name: 'New Item',
    keyboard: { key: 'Enter' },
    gesture: 'rd',
    exec: (e, { type }) => {
      const { cursor, contextViews } = store.getState()

      // cancel if invalid New Uncle
      if ((e.metaKey || e.ctrlKey) && e.altKey && (!cursor || cursor.length <= 1)) return

      let key = ''
      let keyLeft, keyRight, rankRight, itemsRankedLeft
      const offset = window.getSelection().focusOffset
      const showContexts = cursor && isContextViewActive(unrank(intersections(cursor)), { state: store.getState() })
      const itemsRanked = perma(() => lastItemsFromContextChain(splitChain(cursor, contextViews)))

      // for normal command with no modifiers, split the thought at the selection
      // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
      // do not split with gesture, as Enter is avialable and separate in the context of mobile
      const split = type !== 'gesture' && cursor && !showContexts && !(e.metaKey || e.ctrlKey) && !e.shiftKey && offset > 0 && offset < sigKey(cursor).length
      if (split) {

        const items = unrank(itemsRanked())
        const context = items.length > 1 ? intersections(items) : [ROOT_TOKEN]

        // split the key into left and right parts
        key = sigKey(cursor)
        keyLeft = key.slice(0, offset)
        keyRight = key.slice(offset)
        itemsRankedLeft = intersections(itemsRanked()).concat({ key: keyLeft, rank: sigRank(cursor) })

        store.dispatch({
          type: 'existingItemChange',
          oldValue: key,
          newValue: keyLeft,
          context,
          itemsRanked: itemsRanked()
        })
      }

      // when the 'Enter' key is pressed and the selection is at the end of the line, and the thought has children/contexts, it should insert a new first child (as if insertNewChild && insertBefore were true)
      const newFirstChild = type !== 'gesture' && cursor && !(e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && offset > 0 && offset === sigKey(cursor).length && (showContexts ? getContexts(sigKey(cursor)) : getChildrenWithRank(itemsRanked())).length > 0

      // wait for existing itemChange to update state
      // should be done reducer combination
      asyncFocus.enable()
      setTimeout(() => {
        ({ rankRight } = newItem({
          value: !(e.metaKey || e.ctrlKey) && !e.shiftKey ? keyRight : '',
          // new uncle
          at: (e.metaKey || e.ctrlKey) && e.altKey ? intersections(cursor) :
            split ? itemsRankedLeft :
            null,
          // new item in context
          insertNewChild: newFirstChild || ((e.metaKey || e.ctrlKey) && !e.altKey),
          // new item above
          insertBefore: newFirstChild || e.shiftKey,
          // selection offset
          offset: 0
        }))

        if (split) {

          const itemsRankedRight = intersections(itemsRanked()).concat({ key: keyRight, rank: rankRight })
          const children = getChildrenWithRank(itemsRankedLeft)

          children.forEach(child => {
            store.dispatch({
              type: 'existingItemMove',
              oldItemsRanked: itemsRankedLeft.concat(child),
              newItemsRanked: itemsRankedRight.concat(child)
            })
          })
        }
      })
    }
  },

  {
    name: 'New Item Above',
    gesture: 'rul',
    exec: () => {
      newItem({ insertBefore: true })
    }
  },

  {
    name: 'New Item in Context',
    gesture: 'rdr',
    exec: () => newItem({ insertNewChild: true })
  },

  {
    name: 'New Item In Context Above',
    gesture: 'rdu',
    exec: () => {
      newItem({ insertNewChild: true, insertBefore: true })
    }
  },

  // NOTE: The keyboard shortcut for New Uncle handled in New Item command until it is confirmed that shortcuts are evaluated in the correct order
  {
    name: 'New Uncle',
    description: `Add a new thought after the current thought's parent.`,
    gesture: 'rdl',
    exec: () => {
      const { cursor } = store.getState()
      if (cursor && cursor.length > 1) {
        newItem({
          at: intersections(cursor)
        })
      }
    }
  },

  {
    name: 'Subcategorize One',
    description: `Insert the current thought into a new, intermediate context between itself and its context.`,
    gesture: 'lu',
    keyboard: { key: 'o', shift: true, meta: true },
    exec: e => {
      const { cursor } = store.getState()
      if (cursor) {
        const { rank } = newItem({ insertBefore: true })
        setTimeout(() => {
          store.dispatch({
            type: 'existingItemMove',
            oldItemsRanked: cursor,
            newItemsRanked: intersections(cursor).concat({ key: '', rank }, signifier(cursor))
          })
        }, RENDER_DELAY)
      }
      else {
        e.allowDefault()
      }
    }
  },

  {
    name: 'Subcategorize All',
    description: `Insert all thoughts at the current level into a new thought one level up.`,
    gesture: 'ldr',
    keyboard: { key: 'l', shift: true, meta: true },
    exec: e => {
      const { contextViews, cursor } = store.getState()
      if (cursor) {
        const contextChain = splitChain(cursor, contextViews)
        const itemsRanked = cursor.length > 1
          ? (intersections(contextChain.length > 1
            ? lastItemsFromContextChain(contextChain)
            : cursor))
          : RANKED_ROOT

        const children = getChildrenWithRank(itemsRanked)

        const { rank } = newItem({
          at: cursor.length > 1 ? intersections(cursor) : RANKED_ROOT,
          insertNewChild: true,
          insertBefore: true
        })

        setTimeout(() => {
          children.forEach(child => {
            store.dispatch({
              type: 'existingItemMove',
              oldItemsRanked: intersections(cursor).concat(child),
              newItemsRanked: intersections(cursor).concat({ key: '', rank }, child)
            })
          })
        }, RENDER_DELAY)
      }
      else {
        e.allowDefault()
      }
    }
  },

  {
    name: 'Toggle Context View',
    gesture: 'ru',
    keyboard: { key: 'c', shift: true, meta: true },
    exec: () => store.dispatch({ type: 'toggleContextView' })
  },

  {
    name: 'Cursor Down',
    keyboard: 'ArrowDown',
    exec: e => {
      // select next editable
      if (store.getState().cursor) {
        selectNextEditable(e.target)
      }
      // if no cursor, select first editable
      else {
        const firstEditable = document.querySelector('.editable')
        if (firstEditable) {
          firstEditable.focus()
        }
      }
    }
  },

  {
    name: 'Cursor Next Item',
    description: 'Move cursor to next item, skipping expanded children.',
    keyboard: { key: 'ArrowDown', meta: true },
    exec: () => {
      const { cursor } = store.getState()
      const next = nextEditable(cursor)
      if (next) {
        next.focus()
      }
    }
  },

  {
    name: 'Cursor Up',
    keyboard: 'ArrowUp',
    exec: e => {
      selectPrevEditable(e.target)
    }
  },

  {
    name: 'Cursor Previous Item',
    description: 'Move cursor to previous item, skipping expanded children.',
    gesture: 'lur',
    keyboard: { key: 'ArrowUp', meta: true },
    exec: () => {
      const { cursor } = store.getState()
      const prev = prevEditable(cursor)
      if (prev) {
        prev.focus()
      }
    }
  },

  {
    name: 'Toggle Code View',
    keyboard: { key: '/', meta: true },
    exec: () => {
      const state = store.getState()
      if (state.cursor) {
        store.dispatch({ type: 'toggleCodeView' })
      }
    }
  },

  {
    name: 'Search',
    gesture: 'rl',
    keyboard: { key: 'f', shift: true, meta: true },
    exec: () => {
      const state = store.getState()
      store.dispatch({ type: 'search', value: state.search == null ? '' : null })

      // if enabling search, save current cursor
      if (state.search == null) {
        store.dispatch({ type: 'cursorBeforeSearch', value: state.cursor })
      }
      // otherwise restore cursor
      else {
        restoreCursorBeforeSearch()
      }
    }
  },

  {
    name: 'Indent',
    description: `Move the current thought to the end of the previous thought.`,
    keyboard: { key: 'Tab' },
    exec: e => {
      const { cursor } = store.getState()
      const prev = perma(() => prevSibling(sigKey(cursor), rootedIntersections(cursor), sigRank(cursor)))
      if (cursor && prev()) {

        // store selection offset before existingItemMove is dispatched
        const offset = window.getSelection().focusOffset

        const cursorNew = intersections(cursor).concat(prev(), {
            key: sigKey(cursor),
            rank: getNextRank(intersections(cursor).concat(prev()))
          })

        store.dispatch({
          type: 'existingItemMove',
          oldItemsRanked: cursor,
          newItemsRanked: cursorNew
        })

        restoreSelection(cursorNew, { offset })
      }
    }
  },

  {
    name: 'Outdent',
    description: `Move the current thought to the next sibling of its context.`,
    keyboard: { key: 'Tab', shift: true },
    exec: e => {
      const { cursor } = store.getState()
      if (cursor && cursor.length > 1) {

        // store selection offset before existingItemMove is dispatched
        const offset = window.getSelection().focusOffset

        const cursorNew = unroot(rootedIntersections(intersections(cursor)).concat({
            key: sigKey(cursor),
            rank: getRankAfter(intersections(cursor))
          }))

        store.dispatch({
          type: 'existingItemMove',
          oldItemsRanked: cursor,
          newItemsRanked: cursorNew
        })

        restoreSelection(cursorNew, { offset })
      }
    }
  }

]
// ensure modified shortcuts are checked before unmodified
// sort the original list to avoid performance hit in handleKeyboard
.sort((a, b) =>
  a.keyboard &&
  b.keyboard &&
  ((a.keyboard.meta && !b.keyboard.meta) ||
   (a.keyboard.alt && !b.keyboard.alt) ||
   (a.keyboard.shift && !b.keyboard.shift)) ? -1 : 1
)

const handleGesture = (gesture, e) => {

  // disable when welcome, shortcuts, or feeback helpers are displayed, a drag is in progress, or focus has been disabled
  const state = store.getState()
  if (state.showHelper === 'welcome' || state.showHelper === 'shortcuts' || state.showHelper === 'feedback' || state.dragInProgress) return

  const shortcut = globalShortcuts.find(shortcut => shortcut.gesture === gesture)
  if (shortcut) {
    shortcut.exec(e, { type: 'gesture' })
  }
}

const handleKeyboard = e => {

  // disable when welcome, shortcuts, or feeback helpers are displayed
  const state = store.getState()
  if (state.showHelper === 'welcome' || state.showHelper === 'shortcuts' || state.showHelper === 'feedback') return

  const shortcut = globalShortcuts.find(shortcut =>
    shortcut.keyboard &&
    (shortcut.keyboard.key || shortcut.keyboard) === e.key &&
    // either the modifier is pressed, or it is not necessary
    (!shortcut.keyboard.meta || (e.metaKey || e.ctrlKey)) &&
    (!shortcut.keyboard.alt || e.altKey) &&
    (!shortcut.keyboard.shift || e.shiftKey)
  )

  // execute the shortcut if it exists
  // preventDefault by default, unless e.allowDefault() is called
  let isAllowDefault = false
  e.allowDefault = () => isAllowDefault = true
  if (shortcut) {
    shortcut.exec(e, { type: 'keyboard' })
    if (!isAllowDefault) {
      e.preventDefault()
    }
  }
}

/** Converts a gesture letter or event key of an arrow key to an arrow utf8 character. Defaults to input. */
const lettersToArrow = str => ({
  l: '←',
  r: '→',
  u: '↑',
  d: '↓',
  ArrowUp: '↑',
  ArrowDown: '↓'
}[str] || str)

const formatKeyboardShortcut = keyboard =>
  (keyboard.meta ? '⌘ + ' : '') +
  (keyboard.control ? '⌃ + ' : '') +
  (keyboard.option ? '⌥ + ' : '') +
  (keyboard.shift ? '⇧ + ' : '') +
  lettersToArrow(keyboard.key || keyboard)


/*=============================================================
 * Reducer
 *============================================================*/


/*=============================================================
 * LocalStorage && Firebase Setup
 *============================================================*/

if (window.firebase) {
  const firebase = window.firebase
  firebase.initializeApp(firebaseConfig)

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
      window.clearTimeout(offlineTimer)

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

// Set to offline mode 5 seconds after startup. Cancelled with successful login.
const offlineTimer = window.setTimeout(() => {
  store.dispatch({ type: 'status', value: 'offline' })
}, OFFLINE_TIMEOUT)

const logout = () => {
  store.dispatch({ type: 'clear' })
  updateUrlHistory(RANKED_ROOT)
  window.firebase.auth().signOut()
}

const login = () => {
  const firebase = window.firebase
  const provider = new firebase.auth.GoogleAuthProvider();
  store.dispatch({ type: 'status', value: 'connecting' })
  firebase.auth().signInWithRedirect(provider)
}

/** Updates local state with newly authenticated user. */
function userAuthenticated(user) {

  const firebase = window.firebase

  // once authenticated, disable offline mode timer
  window.clearTimeout(offlineTimer)

  // save the user ref and uid into state
  const userRef = firebase.database().ref('users/' + user.uid)

  store.dispatch({ type: 'authenticate', value: true, userRef, user })

  // once authenticated, login automatically on page load
  store.dispatch({ type: 'settings', key: 'autologin', value: true, localOnly: true })

  // update user information
  userRef.update({
    name: user.displayName,
    email: user.email
  })

  // store user email locally so that we can delete the offline queue instead of overwriting user's data
  // preserve the queue until the value handler in case the user is new (no data), in which case we can sync the queue
  // TODO: A malicious user could log out, make edits offline, and change the email so that the next logged in user's data would be overwritten; warn user of queued updates and confirm
  if (localStorage.user !== user.email) {
    if (localStorage.queue && localStorage.queue !== '{}') {
      Object.assign(queuePreserved, JSON.parse(localStorage.queue))
    }
    delete localStorage.queue
    localStorage.user = user.email
  }

  // load Firebase data
  // TODO: Prevent userAuthenticated from being called twice in a row to avoid having to detach the value handler
  userRef.off('value')
  userRef.on('value', snapshot => {
    const value = snapshot.val()

    // ignore updates originating from this client
    if (!value || value.lastClientId === clientId) return

    // init root if it does not exist (i.e. local == false)
    if (!value.data || (!value.data.root && !value.data[ROOT_TOKEN])) {
      if (queuePreserved && Object.keys(queuePreserved).length > 0) {
        syncRemote(Object.assign({
          lastClientId: clientId,
          lastUpdated: timestamp()
        }, queuePreserved))
        queuePreserved = {}
      }
      else {
        const state = store.getState()
        sync(state.data, state.contextChildren, {
          updates: {
            schemaVersion: SCHEMA_LATEST
          }
        })
      }
    }
    // otherwise sync all data locally
    else {
      fetch(value)
    }
  })
}

/** Save all firebase data to state and localStorage. */
const fetch = value => {

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

    store.dispatch({ type: 'data', data: dataUpdates, contextChildrenUpdates })
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


/*=============================================================
 * Window Init
 *============================================================*/

// prevent browser from restoring the scroll position so that we can do it manually
window.history.scrollRestoration = 'manual'

window.addEventListener('keydown', handleKeyboard)

window.addEventListener('popstate', () => {
  const { itemsRanked, contextViews } = decodeItemsUrl(window.location.pathname, store.getState().data)
  store.dispatch({ type: 'setCursor', itemsRanked, replaceContextViews: contextViews })
  restoreSelection(itemsRanked)
  translateContentIntoView(store.getState().cursor)
})

document.addEventListener('selectionchange', () => {
  const focusOffset = window.getSelection().focusOffset
  store.dispatch({
    type: 'selectionChange',
    focusOffset
  })
})

// if (canShowHelper('superscriptSuggestor')) {
//   const interval = setInterval(() => {
//     const data = store.getState().data
//     const rootChildren = Object.keys(data).filter(key =>
//       data[key] &&
//       data[key].memberOf &&
//       data[key].memberOf.length > 0 &&
//       data[key].memberOf[0].context &&
//       data[key].memberOf[0].context.length === 1 &&
//       data[key].memberOf[0].context[0] === 'root'
//     )
//     if (
//       // no identums
//       Object.keys(data).every(key => data[key] && (!data[key].memberOf || data[key].memberOf.length <= 1)) &&
//       // at least two contexts in the root
//       Object.keys(data).filter(key =>
//         data[key].memberOf &&
//         data[key].memberOf.length > 0 &&
//         data[key].memberOf[0].context.length === 1 &&
//         rootChildren.includes(data[key].memberOf[0].context[0])
//       ).length >= 2
//     ) {
//       clearInterval(interval)
//       store.dispatch({ type: 'showHelperIcon', id: 'superscriptSuggestor' })
//     }
//   }, HELPER_SUPERSCRIPT_SUGGESTOR_DELAY)
// }

// if (canShowHelper('depthBar')) {
//   store.dispatch({ type: 'showHelperIcon', id: 'depthBar' })
// }


/*=============================================================
 * Components
 *============================================================*/

const AppComponent = connect(({ dataNonce, focus, search, showContexts, user, settings, dragInProgress }) => ({ dataNonce,
  focus,
  search,
  showContexts,
  user,
  dragInProgress,
  dark: settings.dark
}))((
    { dataNonce, focus, search, showContexts, user, dragInProgress, dark, dispatch }) => {

  const directChildren = getChildrenWithRank(focus)

  return <div ref={() => {
    document.body.classList[dark ? 'add' : 'remove']('dark')

    // set selection on desktop on load
    const { cursor } = store.getState()
    if (!isMobile && cursor && !window.getSelection().focusNode) {
      restoreSelection(cursor)
    }

    if (!globals.rendered) {
      translateContentIntoView(cursor, { scrollIntoViewOptions: { behavior: 'auto' } })
      globals.rendered = true
    }

  }} onTouchMove={() => globals.touching = true} onTouchEnd={() => { globals.touching = false; globals.touched = true }} className={classNames({
    container: true,
    // mobile safari must be detected because empty and full bullet points in Helvetica Neue have different margins
    mobile: isMobile,
    'drag-in-progress': dragInProgress,
    chrome: /Chrome/.test(navigator.userAgent),
    safari: /Safari/.test(navigator.userAgent)
  })}><MultiGesture onEnd={handleGesture}>

{/*

    TESTING

    <GestureDiagram path='rlu' size='75' />
    <GestureDiagram path='lru' size='75' />
    <GestureDiagram path='url' size='75' />
    <GestureDiagram path='ulr' size='75' />

    <GestureDiagram path='udl' size='75' />
    <GestureDiagram path='dul' size='75' />
    <GestureDiagram path='lud' size='75' />
    <GestureDiagram path='ldu' size='75' />

    <GestureDiagram path='rld' size='75' />
    <GestureDiagram path='lrd' size='75' />
    <GestureDiagram path='rud' size='75' />
    <GestureDiagram path='rdu' size='75' />

    <GestureDiagram path='udr' size='75' />
    <GestureDiagram path='dur' size='75' />
    <GestureDiagram path='drl' size='75' />
    <GestureDiagram path='dlr' size='75' />
*/}

    <HelperWelcome />
    <HelperShortcuts />
    <HelperFeedback />

    { // render as header on desktop
    !isMobile ? <NavBar position='top' /> : null}

    <div id='content' className='content' ref={el => {
      setTimeout(() => {
        if (el) {
          el.style.transitionDuration = "0.75s"
        }
      }, RENDER_DELAY)
    }} /*onClick={() => {
      // remove the cursor if the click goes all the way through to the content
      // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
      if (!disableOnFocus) {
        const showHelper = store.getState().showHelper
        if (showHelper) {
          dispatch({ type: 'helperRemindMeLater', showHelper, HELPER_CLOSE_DURATION })
        }
        else {
          cursorBack()
          dispatch({ type: 'expandContextItem', itemsRanked: null })
        }
      }
    }}*/>

        {/* These helpers are connected to helperData. We cannot connect AppComponent to helperData because we do not want it to re-render when a helper is shown. */}
        <HelperAutofocus />
        <HelperContextView />

        { // only show suggestor if superscript helper is not completed/hidden
        canShowHelper('superscript') ? <Helper id='superscriptSuggestor' title="Just like in your mind, items can exist in multiple contexts in em." center>
          <p>For example, you may have "Todo" in both a "Work" context and a "Groceries" context.</p>
          <p><HomeLink inline /> allows you to easily view an item across multiple contexts without having to decide all the places it may go when it is first created.</p>
          <p><i>To see this in action, try entering an item that already exists in one context to a new context.</i></p>
        </Helper> : null}

      <div onClick={e => {
          // stop propagation to prevent default content onClick (which removes the cursor)
          e.stopPropagation()
        }}
      >

        {showContexts || directChildren.length === 0

          // context view
          // data-items must be embedded in each Context as Item since paths are different for each one
          ? <div className='content-container'>
            <Children
              focus={focus}
              itemsRanked={focus}
              expandable={true}
              showContexts={true}
            />
            <NewItem contextRanked={focus} showContexts={showContexts} />
          </div>

          // items (non-context view)
          : (() => {

            const children = (directChildren.length > 0
              ? directChildren
              : getChildrenWithRank(focus)
            )//.sort(sorter)

            // get a flat list of all grandchildren to determine if there is enough space to expand
            // const grandchildren = flatMap(children, child => getChildren(items.concat(child)))

            return <React.Fragment>
              {search != null ? <Search /> : <React.Fragment>
                <Children
                  focus={focus}
                  itemsRanked={focus}
                  expandable={true}
                />

                { /* New Item */ }
                {children.length > 0 ? <NewItem contextRanked={focus} /> : null}
              </React.Fragment>}

            </React.Fragment>
          })()
        }
      </div>
    </div>

    { // render as footer on mobile
    isMobile ? <NavBar position='bottom' /> : null}

    <Footer />

    {/*<HelperIcon />*/}

  </MultiGesture></div>
})

/** A navigation bar that contains a link to home, breadcrumbs, and status. */
const NavBar = connect(({ cursor }) => ({ cursor }))(({ cursor, position }) =>
  <div className={classNames({
    nav: true,
    ['nav-' + position]: true
  })}>
    <div className={classNames({
      'nav-container': true,
      'nav-fill': cursor && cursor.length > 1
    })}>
      <HomeLink />
      <Breadcrumbs />
      <Status />
      <CancelTutorial />
    </div>
  </div>
)

const Footer = connect(({ status, settings, user }) => ({ status, settings, user }))(({ status, settings, user, dispatch }) => {

  // hide footer during tutorial
  if (settings.tutorialStep < TUTORIAL_STEP3_DELETE) return null

  return <ul className='footer list-none' onClick={() => {
    // remove the cursor when the footer is clicked (the other main area besides .content)
    cursorBack()
  }}>
    <li>
      <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ className='settings-dark' onClick={() => dispatch({ type: 'settings', key: 'dark', value: !settings.dark })}>Dark Mode</a>
      <span> | </span>
      <a tabIndex='-1' href='https://forms.gle/ooLVTDNCSwmtdvfA8' target='_blank' rel='noopener noreferrer'>Feedback <img src={`https://img.icons8.com/small/16/${settings.dark ? '87ceeb' : '1b6f9a'}/open-in-popup.png`} alt='' style={{ verticalAlign: 'middle' }}/></a>
      <span> | </span>
      <a tabIndex='-1' onClick={() => {
        window.scrollTo(0, 0)
        dispatch({ type: 'showHelper', id: 'shortcuts' })
      }}>{isMobile ? 'Gestures' : 'Shortcuts'}</a>
      {window.firebase ? <span>
        <span> | </span>
        {status === 'offline' || status === 'disconnected' || status === 'connected' ? <a tabIndex='-1' className='settings-logout' onClick={login}>Log In</a>
        : <a tabIndex='-1' className='settings-logout' onClick={logout}>Log Out</a>
        }
      </span> : null}
    </li><br/>
    {user ? <li><span className='dim'>Logged in as: </span>{user.email}</li> : null}
    {user ? <li><span className='dim'>User ID: </span><span className='mono'>{user.uid.slice(0, 6)}</span></li> : null}
    <li><span className='dim'>Version: </span>{pkg.version.split('.')[0]}</li>
  </ul>
})

/** Main navigation breadcrumbs */
const Breadcrumbs = connect(({ cursor }) => ({ cursor }))(({ cursor }) => {

  const itemsRanked = cursor ? cursor.slice(0, cursor.length - 1) : []

  return <div className='breadcrumbs nav-breadcrumbs'>
    <TransitionGroup>
      {itemsRanked.map((itemRanked, i) => {
        const subitems = ancestors(itemsRanked, itemRanked)
        return <CSSTransition key={i} timeout={200} classNames='fade'>
          {/* Cannot use React.Fragment with CSSTransition, as it applies the class to the first child */}
          <span>
            {!isMobile || i > 0 ? <span className='breadcrumb-divider'> • </span> : null}
            <Link itemsRanked={subitems} />
            <Superscript itemsRanked={subitems} />
          </span>
        </CSSTransition>
      })}
    </TransitionGroup>
  </div>
})

/** Breadcrumbs for contexts within the context views. */
const ContextBreadcrumbs = ({ itemsRanked, showContexts }) => {
  return <div className='breadcrumbs context-breadcrumbs'>
    {itemsRanked.map((itemRanked, i) => {
      const subitems = ancestors(itemsRanked, itemRanked)
      return <React.Fragment key={i}>
        <Link itemsRanked={subitems} />
        <Superscript itemsRanked={subitems} />
        {i < itemsRanked.length - 1 || showContexts ? <span className='breadcrumb-divider'> • </span> : null}
      </React.Fragment>
    })}
    {showContexts ? <span> </span> : null}
  </div>
}

const Status = connect(({ status, settings }) => ({ status, settings }))(({ status, settings }) =>
  settings.autologin ? <div className='status'>
    {status === 'disconnected' || status === 'connecting' ? <span>Connecting...</span> : null}
    {status === 'offline' ? <span className='error'>Offline</span> : null}
  </div> : null
)

/** A close button to cancel the inline tutorial. */
const CancelTutorial = connect(({ settings }) => ({ settings }))(({ settings, dispatch }) =>
  settings.tutorialStep < TUTORIAL_STEP4_END ? <div className='status'>
    <a className={classNames({
      'status-button': true,
      'status-button-fade': settings.tutorialStep === TUTORIAL_STEP3_DELETE
    })} onClick={() => dispatch({ type: 'deleteTutorial' }) }>✕ skip tutorial</a>
  </div> : null
)

/** A link to the home screen */
const HomeLink = connect(({ settings, focus, showHelper }) => ({
  dark: settings.dark,
  focus,
  showHelper
}))(({ dark, focus, showHelper, inline, dispatch }) =>
  <span className='home'>
    <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ href='/' onClick={e => {
      e.preventDefault()
      if (store.getState().search != null) {
        dispatch({ type: 'search', value: null })
        restoreCursorBeforeSearch()
      }
      else {
        dispatch({ type: 'setCursor', itemsRanked: null, cursorHistoryClear: true })
        window.scrollTo(0, 0)
      }
    }}><span role='img' arial-label='home'><img className='logo' src={inline ? (dark ? logoDarkInline : logoInline) : (dark ? logoDark : logo)} alt='em' /></span></a>
    {showHelper === 'home' ? <Helper id='home' title='Tap the "em" icon to return to the home context' arrow='arrow arrow-top arrow-topleft' /> : null}
  </span>
)

/** A recursive child element that consists of a <li> containing a <div> and <ul> */
const Child = connect(({ cursor, cursorBeforeEdit, expanded, expandedContextItem, codeView }, props) => {

  // <Child> connect

  // resolve items that are part of a context chain (i.e. some parts of items expanded in context view) to match against cursor subset
  const itemsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.itemsRanked)
    : unroot(props.itemsRanked)

  // check if the cursor path includes the current item
  // check if the cursor is editing an item directly
  const isEditing = equalItemsRanked(cursorBeforeEdit, itemsResolved)
  const itemsRankedLive = isEditing
    ? intersections(props.itemsRanked).concat(signifier(props.showContexts ? intersections(cursor) : cursor))
    : props.itemsRanked

  return {
    cursor,
    isEditing,
    expanded: expanded[encodeItems(unrank(itemsResolved))],
    itemsRankedLive,
    expandedContextItem,
    isCodeView: cursor && equalItemsRanked(codeView, props.itemsRanked)
  }
})(DragSource('item',
  // spec (options)
  {
    // do not allow dragging before first touch
    // a false positive occurs when the first touch should be a scroll
    canDrag: () => {
      return !isMobile || globals.touched
    },
    beginDrag: props => {

      store.dispatch({ type: 'dragInProgress', value: true })

      // disable hold-and-select on mobile
      if (isMobile) {
        setTimeout(() => {
          document.getSelection().removeAllRanges()
        })
      }
      return { itemsRanked: props.itemsRankedLive }
    },
    endDrag: () => {
      setTimeout(() => {
        // re-enable hold-and-select on mobile
        if (isMobile) {
          document.getSelection().removeAllRanges()
        }
        // reset dragInProgress after a delay to prevent cursor from moving
        store.dispatch({ type: 'dragInProgress', value: false })
      })
    }
  },
  // collect (props)
  (connect, monitor) => ({
    dragSource: connect.dragSource(),
    dragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
  })
)(DropTarget('item',
  // <Child> spec (options)
  {
    canDrop: (props, monitor) => {

      const { itemsRanked: itemsFrom } = monitor.getItem()
      const itemsTo = props.itemsRankedLive
      const cursor = store.getState().cursor
      const distance = cursor ? cursor.length - itemsTo.length : 0
      const isHidden = distance >= 2
      const isSelf = equalItemsRanked(itemsTo, itemsFrom)
      const isDescendant = subsetItems(itemsTo, itemsFrom) && !isSelf

      // do not drop on descendants (exclusive) or items hidden by autofocus
      // allow drop on itself or after itself even though it is a noop so that drop-hover appears consistently
      return !isHidden && !isDescendant
    },
    drop: (props, monitor, component) => {

      // no bubbling
      if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

      const { itemsRanked: itemsFrom } = monitor.getItem()
      const itemsTo = props.itemsRankedLive

      // drop on itself or after itself is a noop
      if (!equalItemsRanked(itemsFrom, itemsTo) && !isBefore(itemsFrom, itemsTo)) {

        const newItemsRanked = unroot(intersections(itemsTo)).concat({
          key: sigKey(itemsFrom),
          rank: getRankBefore(itemsTo)
        })

        store.dispatch(props.showContexts
          ? {
            type: 'newItemSubmit',
            value: sigKey(itemsTo),
            context: unrank(itemsFrom),
            rank: getNextRank(itemsFrom)
          }
          : {
            type: 'existingItemMove',
            oldItemsRanked: itemsFrom,
            newItemsRanked
          }
        )
      }
    }
  },
  // collect (props)
  (connect, monitor) => ({
    dropTarget: connect.dropTarget(),
    isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop()
  })
)(({ cursor=[], isEditing, expanded, expandedContextItem, isCodeView, focus, itemsRankedLive, itemsRanked, rank, contextChain, childrenForced, showContexts, depth=0, count=0, isDragging, isHovering, dragSource, dragPreview, dropTarget, dispatch }) => {

  // <Child> render

  // resolve items that are part of a context chain (i.e. some parts of items expanded in context view) to match against cursor subset
  const itemsResolved = contextChain && contextChain.length > 0
    ? chain(contextChain, itemsRanked)
    : unroot(itemsRanked)

  const children = childrenForced || getChildrenWithRank(itemsRankedLive)

  // if rendering as a context and the item is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([signifier(intersections(itemsRanked))])

  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth)
  ) : 0

  // prevent fading out cursor parent
  // there is a special case here for the cursor grandparent when the cursor is a leaf
  // See: <Children> render
  const isCursorParent = distance === 2
    // grandparent
    ? equalItemsRanked(rootedIntersections(intersections(cursor || [])), chain(contextChain, itemsRanked)) && getChildrenWithRank(cursor).length === 0
    // parent
    : equalItemsRanked(intersections(cursor || []), chain(contextChain, itemsRanked))

  const isCursorGrandparent =
    equalItemsRanked(rootedIntersections(intersections(cursor || [])), chain(contextChain, itemsRanked))

  const item = store.getState().data[sigKey(itemsRankedLive)]

  return item ? dropTarget(dragSource(<li className={classNames({
    child: true,
    leaf: children.length === 0,
    // used so that the autofocus can properly highlight the immediate parent of the cursor
    editing: isEditing,
    'cursor-parent': isCursorParent,
    'cursor-grandparent': isCursorGrandparent,
    'code-view': isCodeView,
    dragging: isDragging,
    'show-contexts': showContexts,
    expanded
  })} ref={el => {

    if (el) {
      dragPreview(getEmptyImage())
    }

    if (el && !isMobile && isEditing) {
      // must delay document.getSelection() until after render has completed
      setTimeout(() => {
        const editable = perma(() => el.querySelector('.editable'))
        if (!document.getSelection().focusNode && editable()) {
          // select the Editable
          editable().focus()
        }
      })
    }

  }}>
    <Bullet itemsResolved={itemsResolved} />
    <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none' }}></span>

    <ThoughtAnnotation itemsRanked={itemsRanked} showContexts={showContexts} contextChain={contextChain} homeContext={homeContext} />

    <div className='thought' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>

      {showContexts && (!globals.ellipsizeContextItems || equalItemsRanked(itemsRanked, expandedContextItem)) && itemsRanked.length > 2 ? <ContextBreadcrumbs itemsRanked={intersections(intersections(itemsRanked))} showContexts={showContexts} />
        : showContexts && itemsRanked.length > 2 ? <span className='ellipsis'><a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => {
          dispatch({ type: 'expandContextItem', itemsRanked })
        }}>... </a></span>
        : null}

      {homeContext
        ? <HomeLink/>
        // cannot use itemsRankedLive here else Editable gets re-rendered during editing
        : <Editable focus={focus} itemsRanked={itemsRanked} rank={rank} contextChain={contextChain} showContexts={showContexts} />}

      <Superscript itemsRanked={itemsRanked} showContexts={showContexts} contextChain={contextChain} superscript={false} />
    </div>

    {isCodeView ? <Code itemsRanked={itemsRanked} /> : null}

    { /* Recursive Children */ }
    <Children
      focus={focus}
      itemsRanked={itemsRanked}
      childrenForced={childrenForced}
      count={count}
      depth={depth}
      contextChain={contextChain}
    />
  </li>)) : null
})))

// connect bullet to contextViews so it can re-render independent from <Child>
const Bullet = connect(({ contextViews }, props) => ({
  showContexts: isContextViewActive(unrank(props.itemsResolved), { state: store.getState() })
}))(({ showContexts }) =>
  <span className={classNames({
    bullet: true,
    'show-contexts': showContexts
  })} />
)

/*
  @focus: needed for Editable to determine where to restore the selection after delete
*/
const Children = connect(({ cursorBeforeEdit, cursor, contextViews, data, dataNonce }, props) => {

  // resolve items that are part of a context chain (i.e. some parts of items expanded in context view) to match against cursor subset
  const itemsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.itemsRanked)
    : unroot(props.itemsRanked)

  // check if the cursor path includes the current item
  // check if the cursor is editing an item directly
  const isEditingPath = subsetItems(cursorBeforeEdit, itemsResolved)
  const isEditing = equalItemsRanked(cursorBeforeEdit, itemsResolved)

  const itemsResolvedLive = isEditing ? cursor : itemsResolved
  const showContexts = props.showContexts || isContextViewActive(unrank(itemsResolvedLive), { state: store.getState() })
  const showContextsParent = isContextViewActive(unrank(intersections(itemsResolvedLive)), { state: store.getState() })
  const itemsRanked = showContexts && showContextsParent
    ? intersections(props.itemsRanked)
    : props.itemsRanked

  // use live items if editing
  // if editing, replace the signifier with the live value from the cursor
  const itemsRankedLive = isEditing && props.contextChain.length === 0
    ? intersections(props.itemsRanked).concat(signifier(cursor))
    : itemsRanked

  return {
    isEditingPath,
    showContexts,
    itemsRanked: itemsRankedLive,
    dataNonce
  }
})(
// dropping at end of list requires different logic since the default drop moves the dragged item before the drop target
(DropTarget('item',
  // <Children> spec (options)
  {
    canDrop: (props, monitor) => {

      const { itemsRanked: itemsFrom } = monitor.getItem()
      const itemsTo = props.itemsRanked
      const cursor = store.getState().cursor
      const distance = cursor ? cursor.length - itemsTo.length : 0
      const isHidden = distance >= 2
      // there is no self item to check since this is <Children>
      const isDescendant = subsetItems(itemsTo, itemsFrom)

      // do not drop on descendants or items hidden by autofocus
      return !isHidden && !isDescendant
    },
    drop: (props, monitor, component) => {

      // no bubbling
      if (monitor.didDrop() || !monitor.isOver({ shallow: true })) return

      const { itemsRanked: itemsFrom } = monitor.getItem()
      const newItemsRanked = unroot(props.itemsRanked).concat({
        key: sigKey(itemsFrom),
        rank: getNextRank(props.itemsRanked)
      })

      if (!equalItemsRanked(itemsFrom, newItemsRanked)) {

        store.dispatch(props.showContexts
          ? {
            type: 'newItemSubmit',
            value: sigKey(props.itemsRanked),
            context: unrank(itemsFrom),
            rank: getNextRank(itemsFrom)
          }
          : {
            type: 'existingItemMove',
            oldItemsRanked: itemsFrom,
            newItemsRanked
          }
        )

      }
    }
  },
  // collect (props)
  (connect, monitor) => ({
    dropTarget: connect.dropTarget(),
    isDragInProgress: monitor.getItem(),
    isHovering: monitor.isOver({ shallow: true }) && monitor.canDrop()
  })
)(
({ dataNonce, isEditingPath, focus, itemsRanked, contextChain=[], childrenForced, expandable, showContexts, count=0, depth=0, dropTarget, isDragInProgress, isHovering }) => {

  // <Children> render

  const data = store.getState().data
  const item = data[sigKey(itemsRanked)]
  const cursor = store.getState().cursor
  // If the cursor is a leaf, treat its length as -1 so that the autofocus stays one level zoomed out.
  // This feels more intuitive and stable for moving the cursor in and out of leaves.
  // In this case, the grandparent must be given the cursor-parent className so it is not hidden (below)
  const cursorDepth = cursor
    ? cursor.length - (getChildrenWithRank(cursor).length === 0 ? 1 : 0)
    : 0
  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursorDepth - depth)
  ) : 0

  // resolve items that are part of a context chain (i.e. some parts of items expanded in context view) to match against cursor subset
  const itemsResolved = contextChain && contextChain.length > 0
    ? chain(contextChain, itemsRanked)
    : unroot(itemsRanked)

  let codeResults

  if (item && item.code) {

    // ignore parse errors
    let ast
    try {
      ast = parse(item.code).body[0].expression
    }
    catch(e) {
    }

    try {
      const env = {
        // find: predicate => Object.keys(data).find(key => predicate(data[key])),
        find: predicate => rankItemsSequential(Object.keys(data).filter(predicate)),
        findOne: predicate => Object.keys(data).find(predicate),
        home: () => getChildrenWithRank(RANKED_ROOT),
        itemInContext: getChildrenWithRank,
        item: Object.assign({}, data[sigKey(itemsRanked)], {
          children: () => getChildrenWithRank(itemsRanked)
        })
      }
      codeResults = evaluate(ast, env)

      // validate that each item is ranked
      if (codeResults && codeResults.length > 0) {
        codeResults.forEach(item => {
          assert(item)
          assert.notEqual(item.key, undefined)
        })
      }
    }
    catch(e) {
      console.error('Dynamic Context Execution Error', e.message)
      codeResults = null
    }
  }

  const show = depth < MAX_DEPTH && (isRoot(itemsRanked) || isEditingPath || store.getState().expanded[encodeItems(unrank(itemsResolved))])

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // const subthought = perma(() => getSubthoughtUnderSelection(sigKey(itemsRanked), 3))

  const children = childrenForced ? childrenForced
    : codeResults && codeResults.length && codeResults[0] && codeResults[0].key ? codeResults
    : showContexts ? getContextsSortedAndRanked(/*subthought() || */sigKey(itemsRanked))
    : getChildrenWithRank(itemsRanked)

  // expand root, editing path, and contexts previously marked for expansion in setCursor
  return <React.Fragment>
    {show && showContexts ?
      (children.length === 1 ? <div className='children-subheading'>This thought is not found in any other contexts. <br/>{isMobile ? <span>Swipe <GestureDiagram path='ru' size='14' color='darkgray'/* mtach .children-subheading color */ /></span> : 'Type ⌘ + ⇧ + C'} to go back.</div> :
      children.length > 1 ? <div className='children-subheading' style={{ top: '4px' }}>Contexts:</div> : null)
    : null}
    {children.length > (showContexts ? 1 : 0) && show ? <ul
        // data-items={showContexts ? encodeItems(unroot(unrank(itemsRanked))) : null}
        className={classNames({
          children: true,
          'context-chain': showContexts,
          ['distance-from-cursor-' + distance]: true,
          'editing-path': isEditingPath
        })}
      >
        {children.map((child, i) => {
          // do not render items pending animation
          const childItemsRanked = showContexts
            // replace signifier rank with rank from child when rendering showContexts as children
            // i.e. Where Context > Item, use the Item rank while displaying Context
            ? rankItemsFirstMatch(child.context)
              // override original rank of first item with rank in context
              .map((item, i) => i === 0 ? { key: item.key, rank: child.rank } : item)
              .concat(signifier(itemsRanked))
            : unroot(itemsRanked).concat(child)

          return !child || child.animateCharsVisible === 0 ? null : <Child
            key={i}
            focus={focus}
            itemsRanked={childItemsRanked}
            // grandchildren can be manually added in code view
            childrenForced={child.children}
            rank={child.rank}
            showContexts={showContexts}
            contextChain={showContexts ? contextChain.concat([itemsRanked]) : contextChain}
            count={count + sumChildrenLength(children)}
            depth={depth + 1}
          />
        })}
      {dropTarget(<li className={classNames({
        child: true,
        'drop-end': true,
        last: depth===0
      })} style={{ display: globals.simulateDrag || isDragInProgress ? 'list-item' : 'none'}}>
        <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none'}}></span>
      </li>)}
      </ul> : <ul className='empty-children' style={{ display: globals.simulateDrag || isDragInProgress ? 'block' : 'none'}}>{dropTarget(<li className={classNames({
          child: true,
          'drop-end': true,
          last: depth===0
        })}>
        <span className='drop-hover' style={{ display: globals.simulateDropHover || isHovering ? 'inline' : 'none'}}></span>
      </li>)}</ul>}

    </React.Fragment>
})))

const Code = connect(({ cursorBeforeEdit, cursor, data }, props) => {

  const isEditing = equalItemsRanked(cursorBeforeEdit, props.itemsRanked)

  // use live items if editing
  const itemsRanked = isEditing
    ? cursor || []
    : props.itemsRanked

  const value = sigKey(itemsRanked)

  return {
    code: data[value] && data[value].code,
    itemsRanked
  }
})(({ code, itemsRanked, dispatch  }) => {

  return <code>
    <ContentEditable
      html={code || ''}
      onChange={e => {
        // NOTE: When Child components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
        const newValue = strip(e.target.value)
        dispatch({ type: 'codeChange', itemsRanked, newValue })
      }}
    />
  </code>
})

// renders a link with the appropriate label to the given context
const Link = connect()(({ itemsRanked, label, dispatch }) => {
  const value = label || sigKey(itemsRanked)
  // TODO: Fix tabIndex for accessibility
  return <a tabIndex='-1' href={encodeItemsUrl(unrank(itemsRanked), { contextViews: store.getState().contextViews })} className='link' onClick={e => {
    e.preventDefault()
    document.getSelection().removeAllRanges()
    dispatch({ type: 'setCursor', itemsRanked })
    // updateUrlHistory(rankItemsFirstMatch(e.shiftKey ? [signifier(items)] : items, store.getState().data))
  }}>{value}</a>
})

/** A non-interactive annotation overlay that contains intrathought links (superscripts and underlining). */
const ThoughtAnnotation = connect(({ cursor, cursorBeforeEdit, focusOffset }, props) => {

  // reerender annotation in realtime when thought is edited
  const itemsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.itemsRanked)
    : unroot(props.itemsRanked)
  const isEditing = equalItemsRanked(cursorBeforeEdit, itemsResolved)
  const itemsRankedLive = isEditing
    ? intersections(props.itemsRanked).concat(signifier(props.showContexts ? intersections(cursor) : cursor))
    : props.itemsRanked

  return {
    itemsRanked: itemsRankedLive,
    isEditing,
    focusOffset
  }
})(({ itemsRanked, showContexts, contextChain, homeContext, isEditing, focusOffset }) => {

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // get all subthoughts and the subthought under the selection
  const key = sigKey(showContexts ? intersections(itemsRanked) : itemsRanked)
  const subthoughts = /*getSubthoughts(key, 3)*/key ? [{
    text: key,
    contexts: getContexts(key)
  }] : []
  // const subthoughtUnderSelection = perma(() => findSubthoughtByIndex(subthoughts, focusOffset))

  return <div className='thought-annotation' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>
    {homeContext
      ? <HomeLink/>
      : subthoughts.map((subthought, i) => {

        return <React.Fragment key={i}>
          {i > 0 ? ' ' : null}
          <span className={classNames({
            subthought: true,
            // disable intrathought linking until add, edit, delete, and expansion can be implemented
            // 'subthought-highlight': isEditing && focusOffset != null && subthought.contexts.length > (subthought.text === key ? 1 : 0) && subthoughtUnderSelection() && subthought.text === subthoughtUnderSelection().text
          })}>
            <span className='subthought-text'>{subthought.text}</span>
          </span>
          {subthought.contexts.length > (subthought.text === key ? 1 : 0)
            ? <StaticSuperscript n={subthought.contexts.length} />
            : null
          }
        </React.Fragment>
      })
    }
  </div>
})

/*
  @contexts indicates that the item is a context rendered as a child, and thus needs to be displayed as the context while maintaining the correct items path
*/
// use rank instead of sigRank(itemsRanked) as it will be different for context view
const Editable = connect()(({ focus, itemsRanked, contextChain, showContexts, rank, dispatch }) => {
  const items = unrank(itemsRanked)
  const itemsResolved = contextChain.length ? chain(contextChain, itemsRanked) : itemsRanked
  const value = signifier(showContexts ? intersections(items) : items) || ''
  const ref = React.createRef()
  const context = showContexts && items.length > 2 ? intersections(intersections(items))
    : !showContexts && items.length > 1 ? intersections(items)
    : [ROOT_TOKEN]

  // store the old value so that we have a transcendental signifier when it is changed
  let oldValue = value

  const item = store.getState().data[value]

  if (!item) {
    console.warn(`Editable: Could not find item data for "${value} in ${JSON.stringify(unrank(intersections(itemsRanked)))}.`)
    // Mitigration strategy (incomplete)
    // store.dispatch({
    //   type: 'existingItemDelete',
    //   itemsRanked,
    //   rank: sigRank(itemsRanked)
    // })
    return null
  }

  const setCursorOnItem = ({ editing } = {}) => {
    // delay until after the render
    if (!globals.disableOnFocus) {

      globals.disableOnFocus = true
      setTimeout(() => {
        globals.disableOnFocus = false
      }, 0)

      dispatch({ type: 'setCursor', itemsRanked, contextChain, cursorHistoryClear: true, editing })
    }
    else if (editing) {
      dispatch({ type: 'editing', value: true })
    }
  }

  // add identifiable className for restoreSelection
  return <ContentEditable
    className={classNames({
      editable: true,
      ['editable-' + encodeItems(unrank(itemsResolved), rank)]: true,
      empty: value.length === 0
    })}
    // trim so that trailing whitespace doesn't cause it to wrap
    html={item.animateCharsVisible != null ? value.slice(0, item.animateCharsVisible).trim() : value}
    onClick={e => {
      // stop propagation to prevent default content onClick (which removes the cursor)
      e.stopPropagation()
    }}
    onTouchEnd={e => {
      const state = store.getState()

      showContexts = showContexts || isContextViewActive(unrank(itemsRanked), { state })

      if (
        !globals.touching &&
        // not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be safe
        !state.dragInProgress &&
        !isElementHiddenByAutoFocus(e.target) &&
        (
          // no cursor
          !state.cursor ||
          // clicking a different item (when not editing)
          (!state.editing && !equalItemsRanked(itemsResolved, state.cursor))
        )) {

        // prevent focus to allow navigation with mobile keyboard down
        e.preventDefault()
        setCursorOnItem()
      }
    }}
    // focus can only be prevented in mousedown event
    onMouseDown={e => {
      // disable focus on hidden items
      if(isElementHiddenByAutoFocus(e.target)) {
        e.preventDefault()
        cursorBack()
      }
    }}
    // prevented by mousedown event above for hidden items
    onFocus={e => {
      const state = store.getState()

      // not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be. safe
      if (!state.dragInProgress) {

        // it is possible that the focus event fires with no onTouchEnd.
        // in this case, make sure it is not a valid attempt to enter edit mode.
        // we cannot assume all focus events without touchEnd events are false positives, because the user may have simply pressed tab/next field
        const falseFocus = (
          // no cursor
          !state.cursor ||
          // clicking a different item (when not editing)
          (!state.editing && !equalItemsRanked(itemsResolved, state.cursor))
        )

        setCursorOnItem({ editing: !falseFocus })

        // remove the selection caused by the falseFocus
        if (falseFocus) {
          document.activeElement.blur()
          document.getSelection().removeAllRanges()
        }
      }
    }}
    onBlur={() => {
      // wait until the next render to determine if we have really blurred
      // otherwise editing may be incorrectly false for expanded-click
      if (isMobile) {
        setTimeout(() => {
          if (!window.getSelection().focusNode) {
            dispatch({ type: 'editing', value: false })
          }
        })
      }
    }}
    onChange={e => {
      // NOTE: When Child components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
      const newValue = strip(e.target.value)

      // safari adds <br> to empty contenteditables after editing, so strip thnem out
      // make sure empty items are truly empty
      if (ref.current && newValue.length === 0) {
        ref.current.innerHTML = newValue
      }

      if (newValue !== oldValue) {
        const item = store.getState().data[oldValue]
        if (item) {
          dispatch({ type: 'existingItemChange', context, showContexts, oldValue, newValue, rankInContext: rank, itemsRanked, contextChain })

          // store the value so that we have a transcendental signifier when it is changed
          oldValue = newValue

          // newChild and superscript helpers appear with a slight delay after editing
          clearTimeout(globals.newChildHelperTimeout)
          clearTimeout(globals.superscriptHelperTimeout)

          // newChildHelperTimeout = setTimeout(() => {
          //   // edit the 3rd item (excluding root)
          //   if (Object.keys(store.getState().data).length > 3) {
          //     dispatch({ type: 'showHelperIcon', id: 'newChild', data: { itemsRanked }})
          //   }
          // }, HELPER_NEWCHILD_DELAY)

          // superscriptHelperTimeout = setTimeout(() => {
          //   const data = store.getState().data
          //   // new item belongs to at least 2 contexts
          //   if (data[newValue].memberOf && data[newValue].memberOf.length >= 2) {
          //     dispatch({ type: 'showHelperIcon', id: 'superscript', data: {
          //       value: newValue,
          //       num: data[newValue].memberOf.length,
          //       itemsRanked
          //     }})
          //   }
          // }, HELPER_SUPERSCRIPT_DELAY)
        }
      }
    }}

    onPaste={e => {
      e.preventDefault()

      // the data will be available as text/plain or text/html
      // this reflects the format of the source data more than the actual contents
      // text/plain may contain text that ultimately looks like html (contains <li>) and should be parsed as html
      const plainText = e.clipboardData.getData('text/plain')
      const htmlText = e.clipboardData.getData('text/html')

      // import into the live items
      // neither ref.current is set here nor can newValue be stored from onChange
      // not sure exactly why, but it appears that the DOM node has been removed before the paste handler is called
      const editing = equalItemsRanked(store.getState().cursorBeforeEdit, itemsRanked)
      const itemsRankedLive = editing ? store.getState().cursor : itemsRanked

      importText(itemsRankedLive, htmlText || plainText)
    }}
  />
})

// renders a given number as a superscript
const StaticSuperscript = ({ n }) => {
  return <span className='superscript-container'>
    <span className='num-contexts'>
      <sup>{n}</sup>
    </span>
  </span>
}

// renders superscript if there are other contexts
// optionally pass items (used by ContextBreadcrumbs) or itemsRanked (used by Child)
const Superscript = connect(({ contextViews, cursorBeforeEdit, cursor, showHelper, helperData }, props) => {

  // track the transcendental identifier if editing
  const editing = equalArrays(unrank(cursorBeforeEdit || []), unrank(props.itemsRanked || [])) && exists(sigKey(cursor || []))

  const itemsRanked = props.showContexts && props.itemsRanked
    ? rootedIntersections(props.itemsRanked)
    : props.itemsRanked

  const items = props.items || unrank(itemsRanked)

  const itemsLive = editing
    ? (props.showContexts ? intersections(unrank(cursor || [])) : unrank(cursor || []))
    : items

  const itemsRankedLive = editing
    ? (props.showContexts ? intersections(cursor || []) : cursor || [])
    : itemsRanked

  return {
    contextViews,
    items,
    itemsRankedLive,
    itemsRanked,
    // itemRaw is the signifier that is removed when showContexts is true
    itemRaw: props.showContexts ? signifier(props.itemsRanked) : signifier(itemsRankedLive),
    empty: itemsLive.length > 0 ? signifier(itemsLive).length === 0 : true, // ensure re-render when item becomes empty
    numContexts: exists(signifier(itemsLive)) && getContexts(signifier(itemsLive)).length,
    showHelper,
    helperData
  }
})(({ contextViews, contextChain=[], items, itemsRanked, itemsRankedLive, itemRaw, empty, numContexts, showHelper, helperData, showSingle, showContexts, superscript=true, dispatch }) => {

  showContexts = showContexts || isContextViewActive(unrank(itemsRanked), { state: store.getState() })

  const itemsLive = unrank(itemsRankedLive)

  const numDescendantCharacters = getDescendants(showContexts ? itemsRankedLive.concat(itemRaw) : itemsRankedLive )
    .reduce((charCount, child) => charCount + child.length, 0)

  const DepthBar = () => <span>

    {numDescendantCharacters >= 16 ? <Helper id='depthBar' title="The length of this bar indicates the number of items in this context." style={{ top: 30, marginLeft: -16 }} arrow='arrow arrow-up arrow-upleft' opaque>
      <p>This helps you quickly recognize contexts with greater depth as you navigate.</p>
    </Helper> : null}

    {(showContexts ? intersections(itemsLive) : itemsLive) && numDescendantCharacters ? <span className={classNames({
      'depth-bar': true,
      'has-other-contexts': itemsLive.length > 1 && (getContexts(signifier(showContexts ? intersections(itemsLive) : itemsLive)).length > 1)
    })} style={{ width: Math.log(numDescendantCharacters) + 2 }} /> : null}
  </span>

  return <span className='superscript-container'>{!empty && superscript && numContexts > (showSingle ? 0 : 1)
    ? <span className='num-contexts'> {/* Make the container position:relative so that the helper is positioned correctly */}
      {numContexts ? <sup>{numContexts}</sup> : null}

      {showHelper === 'superscript' && equalItemsRanked(itemsRanked, helperData.itemsRanked) ? <Helper id='superscript' title="Superscripts indicate how many contexts an item appears in" style={{ top: 30, left: -19 }} arrow='arrow arrow-up arrow-upleft' opaque center>
        <p>In this case, {helperData && helperData.value}<sup>{helperData && helperData.num}</sup> indicates that "{helperData && helperData.value}" appears in {spellNumber(helperData && helperData.num)} different contexts.</p>
        <p><i>Tap the superscript to view all of {helperData && helperData.value}'s contexts.</i></p>
      </Helper> : null}

      {/* render the depth-bar inside the superscript so that it gets re-rendered with it */}
      <DepthBar/>

    </span>

    : <DepthBar/>}

  {// editIdentum fires from existingItemChanged which does not have access to itemsRanked
  // that is why this helper uses different logic for telling if it is on the correct item
  showHelper === 'editIdentum' &&
    signifier(itemsLive) === helperData.newValue &&
    sigRank(itemsRanked) === helperData.rank ? <HelperEditIdentum itemsLive={itemsLive} showContexts={showContexts} />

    : showHelper === 'newItem' && equalItemsRanked(itemsRanked, helperData.itemsRanked) ? <Helper id='newItem' title="You've added an item!" arrow='arrow arrow-up arrow-upleft' style={{ marginTop: 36, marginLeft: -140 }}>
        <p><i>Hit Enter to add an item below.</i></p>
        {isMobile ? null : <p><i>Hit Shift + Enter to add an item above.</i></p>}
      </Helper>

    : showHelper === 'newChild' && equalItemsRanked(itemsRanked, helperData.itemsRanked) && signifier(itemsLive) !== '' ? <Helper id='newChild' title="Any item can become a context" arrow='arrow arrow-up arrow-upleft' style={{ marginTop: 36, marginLeft: -51 }}>
        <p>Contexts are items that contain other items.</p>
        {isMobile ? null : <p><i>Hit Command + Enter to turn this item into a context.</i></p>}
      </Helper>

    : showHelper === 'newChildSuccess' && equalItemsRanked(itemsRanked, helperData.itemsRanked) ? <Helper id='newChildSuccess' title="You've created a context!" arrow='arrow arrow-up arrow-upleft' style={{ marginTop: 36, marginLeft: -140 }}>
        <p>In <HomeLink inline />, items can exist in multiple contexts. </p>
        <p>For example, let's say you are reading a book about nutrition and taking copious notes as it sparks ideas related to changes you want to make to your diet, the science behind exercise, etc. In em, your notes will seamlessly appear in the context of that particular book and also in the context of "My Diet", "Exercise Science", etc. Other notes you had previously made in "My Diet" will appear side-by-side with your new notes.</p>
        <p>Instead of using files and folders, use contexts to freely associate and categorize your thoughts.</p>
      </Helper>

    : null}
  </span>
})

const NewItem = connect(({ cursor }, props) => {
  const children = getChildrenWithRank(props.contextRanked)
  return {
    cursor,
    show: !children.length || children[children.length - 1].key !== ''
  }
})(({ show, contextRanked, cursor, showContexts, dispatch }) => {

  const context = unrank(contextRanked)
  const depth = unroot(context).length
  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR,
      cursor.length - depth - 1
    )
  ) : 0

  return show ? <ul
      style={{ marginTop: 0 }}
      className={'children-new distance-from-cursor-' + distance}
  >
    <li className='child leaf'>
      <span className='bullet' />
      <div className='thought'>
        <a className='placeholder'
          onClick={() => {
            // do not preventDefault or stopPropagation as it prevents cursor

            // do not allow clicks if hidden by autofocus
            if (distance > 0) {
              cursorBack()
              return
            }

            const newRank = getNextRank(contextRanked)

            dispatch({
              type: 'newItemSubmit',
              context,
              addAsContext: showContexts,
              rank: newRank,
              value: ''
            })

            globals.disableOnFocus = true
            asyncFocus.enable()
            setTimeout(() => {
              globals.disableOnFocus = false
              restoreSelection(rankItemsSequential(unroot(context)).concat({ key: '', rank: newRank }))
            }, RENDER_DELAY)

          }}
        >Add a {showContexts ? 'context' : 'thought'}</a>
      </div>
    </li>
  </ul> : null
})

// needs to be a class component to use componentWillUnmount
class HelperComponent extends React.Component {

  constructor(props) {
    super(props)
    this.ref = React.createRef()
  }

  componentDidMount() {

    // for helpers that appear within the hierarchy, we have to do some hacky css patching to fix the stack order of next siblings and descendants.

    // if (this.ref.current) {
    //   const closestParentItem = this.ref.current.parentNode.parentNode
    //   closestParentItem.parentNode.classList.add('helper-container')
    //   let siblingsAfter = nextSiblings(closestParentItem)
    //   for (let i=0; i<siblingsAfter.length; i++) {
    //     if (siblingsAfter[i].classList) {
    //       siblingsAfter[i].classList.add('sibling-after')
    //     }
    //   }
    //   siblingsAfter = nextSiblings(closestParentItem.parentNode)
    //   for (let i=0; i<siblingsAfter.length; i++) {
    //     if (siblingsAfter[i].classList) {
    //       siblingsAfter[i].classList.add('sibling-after')
    //     }
    //   }
    // }

    // add a global escape listener
    this.escapeListener = e => {
      if (this.props.show && e.key === 'Escape') {
        e.stopPropagation()
        this.close(HELPER_CLOSE_DURATION)
        window.removeEventListener('keydown', this.escapeListener)
      }
    }

    // helper method to animate and close the helper
    this.close = duration => {
      const { id, dispatch } = this.props
      window.removeEventListener('keydown', this.escapeListener)
      helperCleanup()
      if (this.ref.current) {
        this.ref.current.classList.add('animate-fadeout')
      }
      setTimeout(() => {
        dispatch({ type: 'helperRemindMeLater', id, duration })
        if (this.props.id === 'welcome') {
          animateWelcome()
        }
      }, FADEOUT_DURATION)
    }

    // use capturing so that this fires before the global window Escape which removes the cursor
    window.addEventListener('keydown', this.escapeListener, true)
  }

  componentWillUnmount() {
    helperCleanup()
    window.removeEventListener('keydown', this.escapeListener)
  }

  render() {
    const { show, id, title, arrow, center, opaque, onSubmit, className, style, positionAtCursor, top, children, dispatch } = this.props

    const sel = document.getSelection()
    const cursorCoords = sel.type !== 'None' ? sel.getRangeAt(0).getClientRects()[0] || {} : {}

    if (!show) return null

    return <div ref={this.ref} style={Object.assign({}, style, top ? { top: 55 } : null, positionAtCursor ? {
      top: cursorCoords.y,
      left: cursorCoords.x
    } : null )} className={className + ' ' + classNames({
        helper: true,
        animate: true,
        [`helper-${id}`]: true,
        center,
        opaque
      })}>
      <div className={`helper-content ${arrow}`}>
        {title ? <p className='helper-title'>{title}</p> : null}
        <div className='helper-text'>{children}</div>
        <div className='helper-actions'>
          {
          id === 'welcome' ? <a className='button' onClick={() => {
            animateWelcome()
            dispatch({ type: 'helperComplete', id })
          }}>START TUTORIAL</a> :
          id === 'feedback' ? <div>
            <a className='button button-small button-inactive' onClick={() => {
              dispatch({ type: 'helperRemindMeLater', id })
            }}>Cancel</a>
            <a className='button button-small button-active' onClick={e => {
              if (onSubmit) {
                onSubmit(e)
              }
              dispatch({ type: 'helperRemindMeLater', id })
          }}>Send</a>
          </div> :
          id === 'shortcuts' ? <a className='button' onClick={() => {
            dispatch({ type: 'helperRemindMeLater', id })
          }}>Close</a> :
          <span>
            <a onClick={() => { dispatch({ type: 'helperComplete', id }) }}>Got it!</a>
            <span> </span><a onClick={() => this.close(HELPER_REMIND_ME_LATER_DURATION)}>Remind me later</a>
            {//<span> </span><a onClick={() => this.close(HELPER_REMIND_ME_TOMORROW_DURATION)}>Remind me tomorrow</a>
            }
          </span>}
          {id === 'welcome' ? <div><a className='' onClick={() => {
            dispatch({ type: 'helperComplete', id })
            dispatch({ type: 'deleteTutorial' })
          }}>Skip tutorial</a></div> : null}
        </div>
        <a className='helper-close' onClick={() => this.close(HELPER_CLOSE_DURATION)}><span>✕</span></a>
      </div>
    </div>
  }
}

const Helper = connect(({ showHelper }, props) => ({ show: showHelper === props.id }))(HelperComponent)

const HelperAutofocus = connect(({ helperData }) => ({ helperData }))(({ helperData }) =>
    <Helper id='autofocus' title={(helperData && helperData.map ? conjunction(helperData.slice(0, 3).map(value => `"${value}"`).concat(helperData.length > 3 ? (`${spellNumber(helperData.length - 3)} other item` + (helperData.length > 4 ? 's' : '')) : [])) : 'no items') + ' have been hidden by autofocus'} center>
    <p>Autofocus follows your attention, controlling the number of items shown at once.</p>
    <p>When you move the selection, nearby items return to view.</p>
  </Helper>
)

const HelperContextView = connect(({ helperData }) => ({ helperData }))(({ helperData }) =>
  <Helper id='contextView' title={`This view shows a new way of looking at "${helperData}"`} center>
    <p>Instead of all items within the "{helperData}" context, here you see all contexts that "{helperData}" is in.</p>
    <p><i>Tap the <HomeLink inline /> icon in the upper left corner to return to the home context.</i></p>
  </Helper>
)

const HelperEditIdentum = connect(({ helperData }) => ({ helperData }))(({ helperData, itemsLive, showContexts }) =>
  <Helper id='editIdentum' title="When you edit an item, it is only changed in its current context" style={{ top: 40, left: 0 }} arrow='arrow arrow-up arrow-upleft' opaque>
    <p>Now "{helperData.newValue}" exists in "{showContexts ? signifier(itemsLive) : signifier(intersections(itemsLive))}" and "{helperData.oldValue}" exists in "{signifier(helperData.oldContext)}".</p>
  </Helper>
)

// const HelperIcon = connect(({ showHelperIcon, helperData, dispa }) => ({ showHelperIcon, helperData }))(({ showHelperIcon, helperData, dispatch }) =>
//   showHelperIcon ? <div className='helper-icon'><a className='helper-icon-inner' onClick={() => dispatch({ type: 'showHelper', id: showHelperIcon })}>?</a></div> : null
// )

const HelperWelcome = () =>
  <div ref={el => {
    // shrink text and logos to fit container vertically
    if (el) {
      const BOTTOM_MARGIN = 20
      const MIN_FONT_SIZE = 10
      const LOGO_SCALE_PX_PER_PERCENTAGE = 0.3

      const contentEl = el.querySelector('.helper-content')

      if (!contentEl) return

      const logoEls = el.querySelectorAll('.logo')
      let fontSize = 100
      let width = logoEls[0] && logoEls[0].width

      /** Returns true if the text overflows past the window height. */
      const overflow = () => {
        const { y, height } = contentEl.getBoundingClientRect()
        return y + height + BOTTOM_MARGIN > window.innerHeight
      }

      const shrinkFontSize = el => el.style.fontSize = --fontSize + '%'
      const shrinkWidth = el => el.style.width = (width -= LOGO_SCALE_PX_PER_PERCENTAGE) + 'px'

      while(overflow() && fontSize >= MIN_FONT_SIZE) {
        shrinkFontSize(contentEl)
        logoEls.forEach(shrinkWidth)
      }
    }
  }}>
    <Helper id='welcome' title='Welcome to em' className='popup' center>
      <p><HomeLink inline /> is a tool that helps you become more aware of your own thinking process.</p>
      <p>The features of <HomeLink inline /> mirror the features of your mind—from focus, to multiple contexts, to the interconnectedness of ideas.</p>
    </Helper>
  </div>

const HelperFeedback = () => {
  const ref = React.createRef()
  return <Helper id='feedback' title='Feedback' className='popup' onSubmit={e => {
    if (ref.current && ref.current.value) {
      // sendEmail('from', 'raine@clarityofheart.com', ref.current.value)
    }
  }} center>
    <textarea ref={el => {
      if (el) {
        ref.current = el
      }
    }} placeholder='Enter feedback' />
  </Helper>
}

const HelperShortcuts = () =>
  <Helper id='shortcuts' title={isMobile ? 'Gestures' : 'Shortcuts'} className='popup' center>
    <table className='shortcuts'>
      <tbody>
        {globalShortcuts.concat() // shallow copy for sort
          .sort(makeCompareByProp('name'))
          // filter out shortcuts that do not exist for the current platform
          .filter(shortcut => !shortcut.hideFromInstructions && (isMobile ? shortcut.gesture : shortcut.keyboard))
          .map((shortcut, i) =>
            <tr key={i}>
              <th>{shortcut.name}</th>
              <td>{isMobile
                ? <GestureDiagram path={shortcut.gesture} size='24' />
                : formatKeyboardShortcut(shortcut.keyboard)
              }</td>
            </tr>
          )
        }
      </tbody>
    </table>
  </Helper>

const Search = connect(({ search }) => ({ show: search != null }))(({ show, dispatch }) => {
  const ref = React.createRef()
  const state = store.getState()
  return show ? <React.Fragment>
    <ul style={{ marginTop: 0 }} >
      <li className='child'><div className='thought'>
          <ContentEditable
            className='editable search'
            html=''
            placeholder='Search'
            innerRef={el => {
              ref.current = el
              if (el) {
                el.focus()
              }
            }}
            onFocus={() => {
              dispatch({ type: 'setCursor', itemsRanked: null })
            }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                selectNextEditable(e.target)
              }
            }}
            onChange={e => {
              const newValue = strip(e.target.value)

              // safari adds <br> to empty contenteditables after editing, so strip thnem out
              // make sure empty items are truly empty
              if (ref.current && newValue.length === 0) {
                ref.current.innerHTML = newValue
              }

              dispatch({ type: 'search', value: newValue })
            }}
          />
        </div>
        <SearchChildren children={state.search ? rankItemsSequential(Object.keys(state.data).filter(key =>
          key !== ROOT_TOKEN && (new RegExp(state.search, 'gi')).test(key)
        )) : []} />
      </li>
    </ul>
  </React.Fragment> : null
})

const SearchChildren = connect(
  ({ data, search }) => ({
    search
  })
)(({ search, children }) => {
  children = search ? rankItemsSequential(Object.keys(store.getState().data).filter(key =>
    key !== ROOT_TOKEN && (new RegExp(search, 'gi')).test(key)
  )) : []
  return <div
    // must go into DOM to modify the parent li classname since we do not want the li to re-render
    ref={el => {
      if (el) {
        el.parentNode.classList.toggle('leaf', children.length === 0)
      }
    }}
  >
    <Children
      childrenForced={children}
      focus={RANKED_ROOT}
      itemsRanked={RANKED_ROOT}
      // expandable={true}
    />
  </div>
})

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

const HTML5toTouch = {
  backends: [
    {
      backend: HTML5Backend
    },
    {
      backend: TouchBackend({ delayTouchStart: 200 }),
      preview: true,
      transition: TouchTransition
    }
  ]
}

export default DragDropContext(MultiBackend(HTML5toTouch))(App)
