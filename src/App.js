/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react'
import { Provider, connect } from 'react-redux'
import { DragDropContext, DragSource, DropTarget } from 'react-dnd'
import { encode as firebaseEncode, decode as firebaseDecode } from 'firebase-encode'
import * as evaluate from 'static-eval'
import * as htmlparser from 'htmlparser2'
// import { parse } from 'esprima'
import HTML5Backend from 'react-dnd-html5-backend'
import TouchBackend from 'react-dnd-touch-backend'
import MultiBackend, { TouchTransition } from 'react-dnd-multi-backend'
import { CSSTransition, TransitionGroup } from 'react-transition-group'

import './App.css'
import * as AsyncFocus from './async-focus.js'
import { clientId, isMac, isMobile } from './browser.js'
import { initialState, store } from './store.js'
import { handleKeyboard } from './shortcuts.js'
import globals from './globals.js'

// components
import { App } from './components/App.js'
import { GestureDiagram } from './components/GestureDiagram.js'
import { MultiGesture } from './components/MultiGesture.js'

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
  updateUrlHistory,
  userAuthenticated,
} from './util.js'

const asyncFocus = AsyncFocus()


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
