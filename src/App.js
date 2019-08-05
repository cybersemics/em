/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'
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
import logo from './logo-black.png'
import logoDark from './logo-white.png'
import logoInline from './logo-black-inline.png'
import logoDarkInline from './logo-white-inline.png'
import { MultiGesture } from './MultiGesture.js'
import * as AsyncFocus from './async-focus.js'
import * as uuid from 'uuid/v4'

const asyncFocus = AsyncFocus()
const parse = require('esprima').parse


/*=============================================================
 * Globals
 *============================================================*/

// maximum number of characters of children to allow expansion
const MAX_DISTANCE_FROM_CURSOR = 3
const MAX_DEPTH = 20
const FADEOUT_DURATION = 400
// ms on startup before offline mode is enabled
// sufficient to avoid flash on login
const OFFLINE_TIMEOUT = 8000
const RENDER_DELAY = 50
const MAX_CURSOR_HISTORY = 50
const HELPER_REMIND_ME_LATER_DURATION = 1000 * 60 * 60 * 2 // 2 hours
// const HELPER_REMIND_ME_TOMORROW_DURATION = 1000 * 60 * 60 * 20 // 20 hours
const HELPER_CLOSE_DURATION = 1000//1000 * 60 * 5 // 5 minutes
// const HELPER_NEWCHILD_DELAY = 1800
// const HELPER_SUPERSCRIPT_SUGGESTOR_DELAY = 1000 * 30
// const HELPER_SUPERSCRIPT_DELAY = 800
// per-character frequency of text animation (ms)
const ANIMATE_CHAR_STEP = 36
const ANIMATE_PAUSE_BETWEEN_ITEMS = 500

const TUTORIAL_STEP0_START = 0
const TUTORIAL_STEP1_NEWTHOUGHTINCONTEXT = 1
const TUTORIAL_STEP2_ANIMATING = 2
const TUTORIAL_STEP3_DELETE = 3
const TUTORIAL_STEP4_END = 4

// store the empty string as a non-empty token in firebase since firebase does not allow empty child records
// See: https://stackoverflow.com/questions/15911165/create-an-empty-child-record-in-firebase
const EMPTY_TOKEN = '__EMPTY__'

// store the root string as a token that is not likely to be written by the user (bad things will happen)
const ROOT_TOKEN = '__ROOT__'

// allow the results of the new getChildrenWithRank which uses contextChildren to be compared against getChildrenWithRankDEPRECATED which uses inefficient memberOf collation to test for functional parity at the given probability between 0 (no testing) and 1 (test every call to getChildrenWithRank
const GETCHILDRENWITHRANK_VALIDATION_FREQUENCY = 0

const isMobile = /Mobile/.test(navigator.userAgent)
const isMac = navigator.platform === 'MacIntel'
const rankedRoot = [{ key: ROOT_TOKEN, rank: 0 }]

const firebaseConfig = {
  apiKey: "AIzaSyB7sj38woH-oJ7hcSwpq0lB7hUteyZMxNo",
  authDomain: "em-proto.firebaseapp.com",
  databaseURL: "https://em-proto.firebaseio.com",
  projectId: "em-proto",
  storageBucket: "em-proto.appspot.com",
  messagingSenderId: "91947960488"
}

// holds the timeout that waits for a certain amount of time after an edit before showing the newChild and superscript helpers
let newChildHelperTimeout
let superscriptHelperTimeout

// track whether the user is touching the screen so that we can distinguish touchend events from tap or drag
// not related to react-dnd
let touching

// simulate dragging and hovering over all drop targets for debugging
const simulateDrag = false
const simulateDropHover = false

// disable the tutorial for debugging
const disableTutorial = false

// Use clientId to ignore value events from firebase originating from this client in this session
// This approach has a possible race condition though. See https://stackoverflow.com/questions/32087031/how-to-prevent-value-event-on-the-client-that-issued-set#comment100885493_32107959
const clientId = uuid()

// a silly global variable used to preserve localStorage.queue for new users
// see usage below
let queuePreserved = {}

/*=============================================================
 * Initial State
 *============================================================*/

const initialState = () => {

  const state = {

    /* status:
      'disconnected'   Yet to connect to firebase, but not in explicit offline mode.
      'connecting'     Connecting to firebase.
      'connected'      Connected to firebase, but not necessarily authenticated.
      'authenticated'  Connected and authenticated.
      'offline'        Disconnected and working in offline mode.
    */
    status: 'disconnected',
    focus: rankedRoot,
    contextViews: {},
    data: {
      [ROOT_TOKEN]: {
        value: ROOT_TOKEN,
        memberOf: [],
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
      tutorialStep: disableTutorial ? TUTORIAL_STEP4_END : JSON.parse(localStorage['settings-tutorialStep'] || TUTORIAL_STEP0_START),
    },
    // cheap trick to re-render when data has been updated
    dataNonce: 0,
    helpers: {},
    cursorHistory: []
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

  // must go after data has been initialized
  // set cursor to null instead of root
  const { itemsRanked, contextViews } = decodeItemsUrl(state.data)
  state.cursor = isRoot(itemsRanked) ? null : itemsRanked
  state.cursorBeforeEdit = state.cursor
  state.contextViews = contextViews
  state.expanded = state.cursor ? expandItems(state.cursor, state.data, state.contextChildren, contextViews, splitChain(state.cursor, contextViews)) : {}

  // initial helper states
  const helpers = ['welcome', 'shortcuts', 'home', 'newItem', 'newChild', 'newChildSuccess', 'autofocus', 'superscriptSuggestor', 'superscript', 'contextView', 'editIdentum', 'depthBar', 'feedback']
  for (let i = 0; i < helpers.length; i++) {
    state.helpers[helpers[i]] = {
      complete: disableTutorial || JSON.parse(localStorage['helper-complete-' + helpers[i]] || 'false'),
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

  // contextView helper
  // else if(canShowHelper('contextView')) {
  //   const itemsRanked = decodeItemsUrl(state.data).itemsRanked
  //   if(!isRoot(itemsRanked)) {
  //     state.showHelperIcon = 'contextView'
  //     state.helperData = sigKey(itemsRanked)
  //   }
  // }

  return state
}


/*=============================================================
 * Helper Functions
 *============================================================*/

/**
 * custom console logging that handles itemsRanked
 * @param o { itemsRanked }
 */
const log = o => { // eslint-disable-line no-unused-vars
  for (let key in o) {
    console.info(key, unrank(o[key] || []), o[key])
  }
}

/** Encodes an items array into a URL. */
const encodeItemsUrl = (items, { contextViews = store.getState().contextViews} = {}) =>
  '/' + (!items || isRoot(items)
    ? ''
    : items.map((item, i) =>
        window.encodeURIComponent(item) + (contextViews[encodeItems(items.slice(0, i + 1))] ? '~' : '')
      ).join('/'))

/** Convert a single url component to an item */
const componentToItem = component => window.decodeURIComponent(component.replace(/~$/, ''))

/**
 * parses the items from the url
 * @return { items, contextViews }
 */
// declare using traditional function syntax so it is hoisted
function decodeItemsUrl(data) {
  const urlPath = window.location.pathname.slice(1)
  const urlComponents = urlPath ? urlPath.split('/') : [ROOT_TOKEN]
  const path = urlComponents.map(componentToItem)
  const contextViews = urlComponents.reduce((accum, cur, i) =>
    /~$/.test(cur) ? Object.assign({}, accum, {
      [encodeItems(path.slice(0, i + 1))]: true
    }) : accum,
  {})
  return {
    // infer ranks of url path so that url can be /A/a1 instead of /A_0/a1_0 etc
    itemsRanked: rankItemsFirstMatch(path, data, contextViews),
    contextViews
  }
}

/** Set the url and history to the given items */
// optional contextViews argument can be used during toggleContextViews when the state has not yet been updated
// defaults to URL contextViews
// SIDE EFFECTS: window.history
const updateUrlHistory = (itemsRanked=rankedRoot, { replace, data, contextViews } = {}) => {

  const decoded = decodeItemsUrl(data)
  const encoded = itemsRanked ? encodeItems(unrank(itemsRanked)) : null

  // if we are already on the page we are trying to navigate to (both in items and contextViews), then NOOP
  if (equalItemsRanked(decoded.itemsRanked, itemsRanked) && decoded.contextViews[encoded] === (contextViews || decoded.contextViews)[encoded]) return

  try {
    window.history[replace ? 'replaceState' : 'pushState'](
      unrank(itemsRanked),
      '',
      encodeItemsUrl(unrank(itemsRanked), { contextViews: contextViews || decoded.contextViews })
    )
  }
  catch(e) {
    // TODO: Fix SecurityError on mobile when ['', ''] gets encoded into '//'
  }
}

const timestamp = () => (new Date()).toISOString()

/** Equality for lists of lists. */
const equalArrays = (a, b) =>
  a === b ||
  (a && b &&
  a.length === b.length &&
  a.find &&
  a.find((item, i) => b[i] !== item)) == null // compare with null to avoid false positive for ''

// assert(equalArrays([], []))
// assert(equalArrays(['a', 'b'], ['a', 'b']))
// assert(!equalArrays([''], ['a']))
// assert(!equalArrays(['a'], []))
// assert(!equalArrays(['a', 'b'], ['a', 'b', 'c']))
// assert(!equalArrays(['a', 'b', 'c'], ['a', 'b']))
// assert(!equalArrays(['a', 'b'], ['b', 'a']))

/** Compares two item objects using { key, rank } as identity and ignoring other properties. */
const equalItemRanked = (a, b) =>
  a === b || (a && b && a.key === b.key && a.rank === b.rank)

/** Compares two itemsRanked arrays using { key, rank } as identity and ignoring other properties. */
const equalItemsRanked = (a, b) =>
  a === b || (a && b && a.length === b.length && a.every && a.every((_, i) => equalItemRanked(a[i], b[i])))

/** Returns true if items subset is contained within superset (inclusive) */
const subsetItems = (superset, subset) => {
  if (!superset || !subset || !superset.length || !subset.length || superset.length < subset.length) return false
  if (superset === subset || (superset.length === 0 && subset.length === 0)) return true

  return !!superset.find((ax, i) => equalItemsRanked(superset.slice(i, i + subset.length), subset))
}

// TESTS
// assert(subsetItems([{ key: 'a', rank: 0 }], [{ key: 'a', rank: 0 }]))
// assert(subsetItems([], []))
// assert(subsetItems([{ key: 'a', rank: 0 }, { key: 'b', rank: 0 }], [{ key: 'a', rank: 0 }]))
// assert(subsetItems([{ key: 'a', rank: 0 }, { key: 'b', rank: 0 }, { key: 'c', rank: 0 }], [{ key: 'b', rank: 0 }, { key: 'c', rank: 0 }]))
// assert(!subsetItems([{ key: 'a', rank: 0 }], [{ key: 'b', rank: 0 }]))
// assert(!subsetItems([{ key: 'a', rank: 0 }], [{ key: 'a', rank: 1 }]))
// assert(!subsetItems([{ key: 'a', rank: 0 }, { key: 'b', rank: 0 }, { key: 'c', rank: 0 }, { key: 'd', rank: 0 }], [{ key: 'b', rank: 0 }, { key: 'd', rank: 0 }]))
// assert(subsetItems([{ key: 'a', rank: 0 }], []))

/** Returns the index of the first element in list that starts with items. */
// const deepIndexContains = (items, list) => {
//   for(let i=0; i<list.length; i++) {
//     // NOTE: this logic is probably not correct. It is unclear why the match is in the front of the list sometimes and at the end other times. It depends on from. Nevertheless, it is "working" at least for typical use cases.
//     if (
//       // items at beginning of list
//       equalArrays(items, list[i].slice(0, items.length)) ||
//       // items at end of list
//       equalArrays(items, list[i].slice(list[i].length - items.length))
//     ) return i
//   }
//   return -1
// }

/** Strip HTML tags, convert nbsp to normal spaces, and trim. */
const strip = html => html
  .replace(/<(?:.|\n)*?>/gm, '')
  .replace(/&nbsp;/gm, ' ')
  .trim()

const escapeRegExp = s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

// replace characters that are invalid in document.querySelector with their respective character codes
// prepend _ to escape leading digits
const regExpEscapeSelector = new RegExp('[' + escapeRegExp(' !"#$%&\'()*+,./:;<=>?@[]^`{|}~') + ']', 'g')
const escapeSelector = s => '_' + s.replace(regExpEscapeSelector, s => '_' + s.charCodeAt())

/** Returns a function that calls the given function once then returns the same result forever */
const perma = f => {
  let result = null
  return (...args) => result || (result = f(...args))
}

/* Proof:

let invalidChars = []
for(let i=0;i<256;i++) {
  let char = String.fromCharCode(i);
    let error
    try {
      let query = document.querySelector('_' + char)
    }
    catch(e) {
      error = e
    }
    if (error) {
      invalidChars.push(char)
    }
}

*/

// gets a unique list of parents
// const uniqueParents = memberOf => {
//   const output = []
//   const dict = {}
//   for (let i=0; i<memberOf.length; i++) {
//     let key = memberOf[i].context.join('___SEP___')
//     if (!dict[key]) {
//       dict[key] = true
//       output.push(memberOf[i])
//     }
//   }
//   return output
// }

const flatten = list => Array.prototype.concat.apply([], list)
const flatMap = (list, f) => Array.prototype.concat.apply([], list.map(f))

/** Sums the length of all items in the list of items. */
// works on children with key or context
const sumChildrenLength = children => children.reduce((accum, child) =>
  accum + (
    'key' in child ? child.key.length
    : child.context.length > 0 ? signifier(child.context).length
    : 0
  )
, 0)

// sorts the given item to the front of the list
// const sortToFront = (items, listItemsRanked) => {
//   if (listItemsRanked.length === 0) return []
//   const list = listItemsRanked.map(unrank)
//   const i = deepIndexContains(items, list)
//   if (i === -1) throw new Error(`[${items}] not found in [${list.map(items => '[' + items + ']')}]`)
//   return [].concat(
//     [listItemsRanked[i]],
//     listItemsRanked.slice(0, i),
//     listItemsRanked.slice(i + 1)
//   )
// }

/** Create a function that takes two values and compares the given key.
   Does case insensitive comparison with strings.
*/
const makeCompareByProp = key => (a, b) => {
  const lower = x => x && x.toLowerCase ? x.toLowerCase() : x
  return lower(a[key]) > lower(b[key]) ? 1
    : lower(a[key]) < lower(b[key]) ? -1
    : 0
}

const compareByRank = makeCompareByProp('rank')

const splice = (arr, start, deleteCount, ...items) =>
  [].concat(
    arr.slice(0, start),
    items,
    arr.slice(start + deleteCount)
  )

// assert.deepEqual(splice([1,2,3], 1, 1), [1,3])
// assert.deepEqual(splice([1,2,3], 1, 1, 4), [1,4,3])

/** Merges items into a context chain, removing the overlapping signifier */
// use autogenerated rank of context
// if there is no/empty context chain, return itemsRanked as-is
const chain = (contextChain, itemsRanked, data=store.getState().data) => {

  if (!contextChain || contextChain.length === 0) return itemsRanked

  const pivot = signifier(contextChain[contextChain.length - 1])
  const i = itemsRanked.findIndex(child => equalItemRanked(child, pivot))
  const append = itemsRanked.slice(i - 1)
  const contexts = getContextsSortedAndRanked([pivot], data)
  const appendedItemInContext = contexts.find(child => signifier(child.context) === append[0].key)

  return flatten(
    // keep the first segment intact
    // then remove the overlapping signifier of each one after
    contextChain.concat([
      appendedItemInContext
        ? [{ key: append[0].key, rank: appendedItemInContext.rank }].concat(append.slice(1))
        : append
    ]).map((items, i) => i > 0 ? splice(items, 1, 1) : items)
  )
}

// assert.deepEqual(chain(
//   [
//     [{ key: 'a', rank: 0 }, { key: 'b', rank: 0 }]
//   ],
//   [{ key: 'a', rank: 0 }, { key: 'b', rank: 0 }, { key: 'c', rank: 0 }],
// ), [{ key: 'a', rank: 0 }, { key: 'b', rank: 0 }, { key: 'a', rank: 0 }, { key: 'c', rank: 0 }])

// assert.deepEqual(unrank(chain(
//   [
//     rankItemsSequential(['2', 'A']),
//     rankItemsSequential(['1', 'A', 'Nope']),
//   ],
//   rankItemsSequential(['START', 'B', 'Nope', 'Butter', 'Bread'])
// )), ['2', 'A', '1', 'Nope', 'B', 'Butter', 'Bread'])

/**
 * Splits a path into a contextChain based on contextViews.
 * @eample (shown without ranks): splitChain(['A', 'B', 'A'], { B: true }) === [['A', 'B'], ['A']]
 */
const splitChain = (path, contextViews) => {
  const contextChain = []
  let contextIndex = 0

  for (let i=0; i<path.length; i++) {

    // create empty component in the context chain
    if (contextChain.length <= contextIndex) {
      contextChain.push([])
    }

    // push item onto the last component of the context chain
    contextChain[contextIndex].push(path[i])

    // advance the contextIndex so that the next item gets pushed onto a new component of the context chain
    if (contextViews[encodeItems(unrank(path.slice(0, i + 1)))]) {
      contextIndex++
    }
  }

  return contextChain
}

/** Generates itemsRanked from the last segment of a context chain */
const lastItemsFromContextChain = contextChain => {
  if (contextChain.length === 1) return contextChain[0]
  const penult = contextChain[contextChain.length - 2]
  const ult = contextChain[contextChain.length - 1]
  return splice(ult, 1, 0, signifier(penult))
}

// sorts items emoji and whitespace insensitive
// const sorter = (a, b) =>
//   emojiStrip(a.toString()).trim().toLowerCase() >
//   emojiStrip(b.toString()).trim().toLowerCase() ? 1 : -1

/** gets the signifying label of the given context.
  Declare using traditional function syntax so it is hoisted
*/
function signifier(items) { return items[items.length - 1] }

const sigKey = itemsRanked => signifier(itemsRanked).key
const sigRank = itemsRanked => signifier(itemsRanked).rank

/** Returns true if the signifier of the given context exists in the data */
const exists = (items, data=store.getState().data) => !!data[signifier(items)]

/** Gets the intersections of the given context; i.e. the context without the signifier */
const intersections = items => items.slice(0, items.length - 1)

/** Returns a list of unique contexts that the given item is a member of. */
const getContexts = (items, data=store.getState().data) => {
  const key = signifier(items)
  const cache = {}

  // this can occur during normal operations and should probably be rearchitected
  // e.g. while deleting an item, the following function stack is invoked after the data has been updated but before the url has: updateUrlHistory > decodeItemsUrl > rankItemsFirstMatch > getContexts
  if (!exists(items, data)) {
    // console.error(`getContexts: Unknown key "${key}" context: ${items.join(',')}`)
    return []
  }
  return (data[key].memberOf || [])
    .filter(member => {
      const exists = cache[encodeItems(member.context)]
      cache[encodeItems(member.context)] = true
      // filter out items that exist
      return !exists
    })
}

const getContextsSortedAndRanked = (itemsRanked, data=store.getState().data) =>
  getContexts(unrank(itemsRanked), data)
    // sort
    .sort(makeCompareByProp('context'))
    // generate dynamic ranks
    .map((item, i) => ({
      context: item.context,
      rank: i
    }))

/** Returns a subset of items from the start to the given item (inclusive) */
const ancestors = (itemsRanked, itemRanked) => itemsRanked.slice(0, itemsRanked.findIndex(cur => equalItemRanked(cur, itemRanked)) + 1)

// Returns a subset of items without all ancestors up to the given time (exclusive)
// const disown = (items, item) => items.slice(items.indexOf(item))

/** Get the intersections of an items or [ROOT_TOKEN] if there are none */
const rootedIntersections = items => items.length > 1 ? intersections(items) : [ROOT_TOKEN]

function unroot(items) {
  return  isRoot(items.slice(0, 1))
    ? items.slice(1)
    : items
}

/** Returns true if the items or itemsRanked is the root item. */
// declare using traditional function syntax so it is hoisted
function isRoot(items) {
  return items.length === 1 && items[0] && (items[0].key === ROOT_TOKEN || items[0] === ROOT_TOKEN || (items[0].context && isRoot(items[0].context)))
}

/** Generates a flat list of all descendants */
const getDescendants = (itemsRanked, recur/*INTERNAL*/) => {
  const children = getChildrenWithRank(itemsRanked)
  // only append current item in recursive calls
  return (recur ? [signifier(itemsRanked)] : []).concat(
    flatMap(children, child => getDescendants(itemsRanked.concat(child), true))
  )
}

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
const getChildrenWithRank = (itemsRanked, data, contextChildren) => {
  data = data || store.getState().data
  contextChildren = contextChildren || store.getState().contextChildren
  const children = (contextChildren[encodeItems(unrank(itemsRanked))] || [])
    .filter(child => {
      if (data[child.key]) {
        return true
      }
      else
      {
        // TODO: This should never happen
        console.warn(`Could not find item data for "${child.key} in ${JSON.stringify(unrank(itemsRanked))}`)
        // Mitigation (does not remove data items)
        // setTimeout(() => {
        //   if (store) {
        //     const state = store.getState()
        //     // check again in case state has changed
        //     if (!state.data[child.key]) {
        //       const contextEncoded = encodeItems(unrank(itemsRanked))
        //       store.dispatch({
        //         type: 'data',
        //         contextChildrenUpdates: {
        //           [contextEncoded]: (state.contextChildren[contextEncoded] || [])
        //             .filter(child2 => child2.key !== child.key)
        //         }
        //       })
        //     }
        //   }
        // })
        return false
      }
    })
    .map(child => {
      const animateCharsVisible = data[child.key].animateCharsVisible
      return animateCharsVisible != null
        ? Object.assign({}, child, { animateCharsVisible })
        : child
    })
    .sort(compareByRank)

  const validateGetChildrenDeprecated = Math.random() < GETCHILDRENWITHRANK_VALIDATION_FREQUENCY
  const childrenDEPRECATED = validateGetChildrenDeprecated ? getChildrenWithRankDEPRECATED(unrank(itemsRanked), data) : undefined

  // compare with legacy function a percentage of the time to not affect performance
  if (validateGetChildrenDeprecated && !equalItemsRanked(children, childrenDEPRECATED)) {
    console.warn(`getChildrenWithRank returning different result from getChildrenWithRankDEPRECATED for children of ${JSON.stringify(unrank(itemsRanked))}`)
    log({ children })
    log({ childrenDEPRECATED })
  }

  return children
}

// preserved for testing functional parity with new function
/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
const getChildrenWithRankDEPRECATED = (items, data) => {
  data = data || store.getState().data
  return flatMap(Object.keys(data), key =>
    ((data[key] || []).memberOf || [])
      .map(member => {
        if (!member) {
          throw new Error(`Key "${key}" has  null parent`)
        }
        return {
          key,
          rank: member.rank || 0,
          animateCharsVisible: data[key].animateCharsVisible,
          isMatch: equalArrays(items, member.context || member)
        }
      })
    )
    // filter out non-matches
    .filter(match => match.isMatch)
    // remove isMatch attribute
    .map(({ key, rank, animateCharsVisible }) => Object.assign({
      key,
      rank
    }, notNull({ animateCharsVisible })))
    // sort by rank
    .sort(compareByRank)
}

/** Returns true if itemsA comes immediately before itemsB
    Assumes they have the same context.
*/
const isBefore = (itemsRankedA, itemsRankedB) => {

  const valueA = sigKey(itemsRankedA)
  const rankA = sigRank(itemsRankedA)
  const valueB = sigKey(itemsRankedB)
  const rankB = sigRank(itemsRankedB)
  const context = intersections(itemsRankedA)
  const children = getChildrenWithRank(context)

  if (children.length === 0 || valueA === undefined || valueB === undefined) {
    return false
  }

  const i = children.findIndex(child => child.key === valueB && child.rank === rankB)
  const prevChild = children[i - 1]
  return prevChild && prevChild.key === valueA && prevChild.rank === rankA
}

// Returns true if itemsA comes immediately before itemsB
// Assumes they have the same context.
// const isLastItem = (itemsRanked) => {

//   const value = sigKey(itemsRanked)
//   const rank = sigRank(itemsRanked)
//   const context = intersections(unrank(itemsRanked))
//   const children = getChildrenWithRank(context)

//   if (children.length === 0 || value === undefined) {
//     return false
//   }

//   const i = children.findIndex(child => child.key === value && child.rank === rank)
//   return i === children.length - 1
// }

/** Gets a new rank before the given item in a list but after the previous item. */
const getRankBefore = itemsRanked => {

  const value = sigKey(itemsRanked)
  const rank = sigRank(itemsRanked)
  const context = rootedIntersections(itemsRanked)
  const children = getChildrenWithRank(context)

  // if there are no children, start with rank 0
  if (children.length === 0) {
    return 0
  }
  // if there is no value, it means nothing is selected
  // get rank before the first child
  else if (value === undefined) {
    return children[0].rank - 1
  }

  const i = children.findIndex(child => child.key === value && child.rank === rank)

  // cannot find items with given rank
  if (i === -1) {
    return 0
  }

  const prevChild = children[i - 1]
  const nextChild = children[i]

  const newRank = prevChild
    ? (prevChild.rank + nextChild.rank) / 2
    : nextChild.rank - 1

  return newRank
}

/** Gets a new rank after the given item in a list but before the following item. */
const getRankAfter = itemsRanked => {

  const value = sigKey(itemsRanked)
  const rank = sigRank(itemsRanked)
  const context = rootedIntersections(itemsRanked)
  const children = getChildrenWithRank(context)

  // if there are no children, start with rank 0
  if (children.length === 0) {
    return 0
  }
  // if there is no value, it means nothing is selected
  // get rank after the last child
  else if (value === undefined) {
    return children[children.length - 1].rank + 1
  }

  let i = children.findIndex(child => child.key === value && child.rank === rank)

  // quick hack for context view when rank has been supplied as 0
  if (i === -1) {
    i = children.findIndex(child => child.key === value)
  }

  // cannot find items with given rank
  if (i === -1) {
    return 0
  }

  const prevChild = children[i]
  const nextChild = children[i + 1]

  const newRank = nextChild
    ? (prevChild.rank + nextChild.rank) / 2
    : prevChild.rank + 1

  return newRank
}

/** Gets an items's previous sibling with its rank. */
const prevSibling = (value, contextRanked, rank) => {
  const siblings = getChildrenWithRank(contextRanked)
  let prev
  siblings.find(child => {
    if (child.key === value && child.rank === rank) {
      return true
    }
    else {
      prev = child
      return false
    }
  })
  return prev
}

/** Gets a rank that comes before all items in a context. */
const getPrevRank = (itemsRanked, data, contextChildren) => {
  const children = getChildrenWithRank(itemsRanked, data, contextChildren)
  return children.length > 0
    ? children[0].rank - 1
    : 0
}

/** Gets the next rank at the end of a list. */
const getNextRank = (itemsRanked, data, contextChildren) => {
  const children = getChildrenWithRank(itemsRanked, data, contextChildren)
  return children.length > 0
    ? children[children.length - 1].rank + 1
    : 0
}

/** Ranks the items from 0 to n. */
function rankItemsSequential(items) {
  return items.map((item, i) => ({ key: item, rank: i }))
}

/** Ranks the items from their rank in their context. */
// if there is a duplicate item in the same context, takes the first
// NOTE: path is unranked
const rankItemsFirstMatch = (path, data=store.getState().data, contextViews={}) => {
  if (isRoot(path)) return rankedRoot

  return flatten(path.map((key, i) => {
    const context = i === 0 ? [ROOT_TOKEN] : path.slice(0, i)
    const item = data[key]
    const inContextView = i > 0 && contextViews[encodeItems(context)]
    const contexts = getContextsSortedAndRanked(inContextView ? context : [key], data)

    const parent = inContextView
      ? contexts.find(child => signifier(child.context) === key)
      : ((item && item.memberOf) || []).find(p =>
        equalArrays(p.context, context) ||
        // TODO: Is this right? It's late and I'm tired and it kind of works at the moment.
        // context is a full (cyclic) path
        // p.context is an unranked address
        context.indexOf(p.context[0]) !== -1
      )

    return [{
      key,
      // NOTE: we cannot throw an error if there is no parent, as it may be a floating context
      // unfortunately this that there is no protection against a (incorrectly) missing parent
      rank: parent ? parent.rank : 0
    }]
  }))
}

/** Converts [{ key, rank }, ...] to just [key, ...]. */
// if already converted, return a shallow copy
// if falsey, return as-is
function unrank(items) {
  return items
    ? items.length > 0 && typeof items[0] === 'object' && 'key' in items[0]
      ? items.map(child => child.key)
      : items.slice()
    // return falsey value as-is
    : items
}

// derived children are all grandchildren of the parents of the given context
// signifier rank is accurate; all other ranks are filled in 0
// const getDerivedChildren = items =>
//   getContexts(items)
//     .filter(member => !isRoot(member))
//     .map(member => rankItemsSequential(member.context).concat({
//       key: signifier(items),
//       rank: member.rank
//     }))

/** Returns a new item less the given context. */
const removeContext = (item, context, rank) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return Object.assign({}, item, {
      memberOf: item.memberOf ? item.memberOf.filter(parent =>
        !(equalArrays(parent.context, context) && (rank == null || parent.rank === rank))
      ) : [],
      lastUpdated: timestamp()
    })
}

/** Returns a new item that has been moved either between contexts or within a context (i.e. changed rank) */
const moveItem = (item, oldContext, newContext, oldRank, newRank) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return Object.assign({}, item, {
      memberOf: item.memberOf ? item.memberOf
        // remove old context
        .filter(parent => !(equalArrays(parent.context, oldContext) && parent.rank === oldRank))
        // add new context
        .concat({
          context: newContext,
          rank: newRank
        })
        : [],
      lastUpdated: timestamp()
    })
}

/** Encode the items (and optionally rank) as a string for use in a className. */
const encodeItems = (items, rank) => items
  .map(item => item ? escapeSelector(item) : '')
  .join('__SEP__')
  + (rank != null ? '__SEP__' + rank : '')

/** Returns the editable DOM node of the given items */
const editableNode = itemsRanked => {
  const rank = sigRank(itemsRanked)
  return document.getElementsByClassName('editable-' + encodeItems(unrank(itemsRanked), rank))[0]
}

/** Gets the editable node immediately after the node of the given path. */
const nextEditable = path => {
  const editable = path && editableNode(path)
  const child = editable && editable.closest('.child')
  const nextChild = child && child.nextElementSibling
  return nextChild && nextChild.querySelector('.editable')
}

/** Gets the editable node immediately before the node of the given path. */
const prevEditable = path => {
  const editable = path && editableNode(path)
  const child = editable && editable.closest('.child')
  const prevChild = child && child.previousElementSibling
  return prevChild && prevChild.querySelector('.editable')
}

const isElementHiddenByAutoFocus = el => {
  const children = el.closest('.children')
  return (children.classList.contains('distance-from-cursor-2') && !el.closest('.cursor-parent')) ||
    children.classList.contains('distance-from-cursor-3')
}

// allow editable onFocus to be disabled temporarily
// this allows the selection to be re-applied after the onFocus event changes without entering an infinite focus loop
// this would not be a problem if the node was not re-rendered on state change
let disableOnFocus = false

/** Restores the selection to a given editable item and then dispatches setCursor. */
// from the element's event handler. Opt-in for performance.
// asyncFocus.enable() must be manually called before when trying to focus the selection on mobile
// (manual call since restoreSelection is often called asynchronously itself, which is too late for asyncFocus.enable() to work)
const restoreSelection = (itemsRanked, { offset, cursorHistoryClear, done } = {}) => {

  // no selection
  if (!itemsRanked || isRoot(itemsRanked)) return

  const items = unrank(itemsRanked)

  // only re-apply the selection the first time
  if (!disableOnFocus) {

    disableOnFocus = true

    // use current focusOffset if not provided as a parameter
    let focusOffset = offset != null
      ? offset
      : window.getSelection().focusOffset

    store.dispatch({ type: 'setCursor', itemsRanked, cursorHistoryClear })

    // re-apply selection
    setTimeout(() => {

      // wait until this "artificial" focus event fires before re-enabling onFocus
      setTimeout(() => {
        disableOnFocus = false
        if (done) done()
      }, 0)

      // re-apply the selection
      const el = editableNode(itemsRanked)
      if (!el) {
        console.error(`restoreSelection: Could not find DOM node for ${JSON.stringify(items)}"`)
        console.error(encodeItems(unrank(itemsRanked), sigRank(itemsRanked)), itemsRanked)
        // throw new Error(`Could not find element: "editable-${encodeItems(items)}"`)
        return
      }
      if (el.childNodes.length === 0) {
        el.appendChild(document.createTextNode(''))
      }
      const textNode = el.childNodes[0]
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(textNode, Math.min(focusOffset, textNode.textContent.length))
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)

    }, 0)
  }
}

/** join the segments of a context chain, eliminating the overlap, and return the resulting itemsRanked */
// how is this different than chain()? Hmmmm... good question...
const contextChainToItemsRanked = contextChain =>
  flatten([contextChain[0]].concat(contextChain.slice(1).map(itemsRanked => itemsRanked.slice(1))))

/** Returns an expansion map marking all items that should be expanded
  * @example {
    A: true,
    A__SEP__A1: true,
    A__SEP__A2: true
  }
*/
const expandItems = (path, data, contextChildren, contextViews={}, contextChain=[], depth=0) => {

  // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
  if (!path || path.length === 0 || depth > 5) return {}

  const itemsRanked = contextChain.length > 0
    ? contextChainToItemsRanked(contextChain)
    : path

  const children = getChildrenWithRank(itemsRanked, data, contextChildren)

  // expand only child
  return (children.length === 1 ? children : []).reduce(
    (accum, child) => {
      let newContextChain = []
      if (contextChain.length > 0) {
        newContextChain = contextChain.map(items => items.concat())
        newContextChain[newContextChain.length - 1].push(child)
      }

      return Object.assign({}, accum,
        // RECURSIVE
        // passing contextChain here creates an infinite loop
        expandItems(path.concat(child), data, contextChildren, contextViews, newContextChain, ++depth)
      )
    },
    // expand current item
    {
      [encodeItems(unrank(path))]: true
    }
  )
}

// declare using traditional function syntax so it is hoisted
function canShowHelper(id, state=store ? store.getState() : null) {
  return state &&
    (!state.showHelper || state.showHelper === id) &&
    !state.helpers[id].complete &&
    state.helpers[id].hideuntil < Date.now()
}

/** Renders a list of items as a sentence. */
const conjunction = items =>
  items.slice(0, items.length - 1).join(', ') + (items.length !== 2 ? ',' : '') + ' and ' + items[items.length - 1]

const numbers = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
const spellNumber = n => numbers[n - 1] || n

const nextSiblings = el =>
  el.nextSibling
    ? [el.nextSibling].concat(nextSiblings(el.nextSibling))
    : []

const selectNextEditable = currentNode => {
  const allElements = document.querySelectorAll('.editable')
  const currentIndex = Array.prototype.findIndex.call(allElements, el => currentNode.isEqualNode(el))
  if (currentIndex < allElements.length - 1) {
    allElements[currentIndex + 1].focus()
  }
}

const selectPrevEditable = currentNode => {
  const allElements = document.querySelectorAll('.editable')
  const currentIndex = Array.prototype.findIndex.call(allElements, el => currentNode.isEqualNode(el))
  if (currentIndex > 0) {
    allElements[currentIndex - 1].focus()
  }
}

const helperCleanup = () => {
  const helperContainer = document.querySelector('.helper-container')
  if (helperContainer) {
    helperContainer.classList.remove('helper-container')
  }
  const siblingsAfter = document.querySelectorAll('.sibling-after')
  for (let i=0; i<siblingsAfter.length; i++) {
    siblingsAfter[i].classList.remove('sibling-after')
  }
}

/** Exits the search or code view, or move the cursor back, whichever is first. */
const exit = () => {
  const state = store.getState()
  if (state.search != null) {
    store.dispatch({ type: 'search', value: null })
    restoreCursorBeforeSearch()
  }
  else if (state.codeView) {
    store.dispatch({ type: 'toggleCodeView', value: false })
  }
  else if (state.cursor) {
    cursorBack()
  }
}

/** Moves the cursor up one level. */
const cursorBack = () => {
  const state = store.getState()
  const cursorOld = state.cursor
  if (cursorOld) {
    const cursorNew = intersections(cursorOld)

    store.dispatch({ type: 'setCursor', itemsRanked: cursorNew.length > 0 ? cursorNew : null })

    // append to cursor history to allow 'forward' gesture
    store.dispatch({ type: 'cursorHistory', cursor: cursorOld })

    if (cursorNew.length > 0) {
      if (!isMobile || state.editing) {
        restoreSelection(cursorNew, { offset: 0 })
      }
    }
    else {
      document.activeElement.blur()
      document.getSelection().removeAllRanges()
    }
  }
  else if (state.search === '') {
    store.dispatch({ type: 'search', value: null })
    restoreCursorBeforeSearch()
  }
}

const cursorForward = () => {
  const state = store.getState()

  // pop from cursor history
  if (state.cursorHistory.length > 0) {
    const cursorNew = state.cursorHistory[state.cursorHistory.length - 1]
    store.dispatch({ type: 'setCursor', itemsRanked: cursorNew, cursorHistoryPop: true })

    if (state.cursor) {
      restoreSelection(cursorNew, { offset: 0 })
    }
  }
  // otherwise move cursor to first child
  else {
    const cursorOld = state.cursor
    const firstChild = cursorOld && getChildrenWithRank(cursorOld)[0]
    if (firstChild) {
      const cursorNew = cursorOld.concat(firstChild)
      store.dispatch({ type: 'setCursor', itemsRanked: cursorNew })
      restoreSelection(cursorNew, { offset: 0 })
    }
  }
}

/** Gets the items that are being edited from a context chain. */
const itemsEditingFromChain = (path, contextViews) => {

  const contextChain = splitChain(path, contextViews)

  // the last context in the context chain, which is the context of the item being edited
  const contextFromChain = contextChain && contextChain[contextChain.length - 1]

  // the penultimate context in the context chain, which is the items that is being edited in the context view
  const itemsEditing = contextChain && contextChain.length > 1
    ? contextChain[contextChain.length - 2]
    : rankedRoot

  return contextFromChain.concat(signifier(itemsEditing))
}

const deleteItem = () => {

  const state = store.getState()
  const path = state.cursor

  // same as in newItem
  const contextChain = splitChain(path, state.contextViews)
  const showContexts = state.contextViews[encodeItems(unrank(intersections(path)))]
  const itemsRanked = contextChain.length > 1
    ? lastItemsFromContextChain(contextChain)
    : path
  const contextRanked = showContexts && contextChain.length > 1 ? contextChain[contextChain.length - 2]
    : !showContexts && itemsRanked.length > 1 ? intersections(itemsRanked) :
    rankedRoot
  const context = unrank(contextRanked)

  const { key, rank } = signifier(itemsRanked)
  const items = unrank(itemsRanked)

  const prevContext = () => {
    const itemsContextView = itemsEditingFromChain(itemsRanked, state.contextViews)
    const contexts = showContexts && getContextsSortedAndRanked(itemsContextView)
    const removedContextIndex = contexts.findIndex(context => signifier(context.context) === key)
    const prevContext = contexts[removedContextIndex - 1]
    return prevContext && {
      key: signifier(prevContext.context),
      rank: prevContext.rank
    }
  }

  // prev must be calculated before dispatching existingItemDelete
  const prev = showContexts
    ? prevContext()
    : prevSibling(key, contextRanked, rank)

  const next = perma(() =>
    showContexts
      ? unroot(getContextsSortedAndRanked(intersections(path)))[0]
      : getChildrenWithRank(contextRanked)[0]
  )

  store.dispatch({
    type: 'existingItemDelete',
    rank,
    showContexts,
    itemsRanked: showContexts
      ? lastItemsFromContextChain(contextChain)
      : unroot(itemsRanked)
  })

  // setCursor or restore selection if editing

  // encapsulate special cases for mobile and last thought
  const restore = (itemsRanked, options) => {
    if (!itemsRanked) {
      cursorBack()
    }
    else if (!isMobile || state.editing) {
      asyncFocus.enable()
      restoreSelection(itemsRanked, options)
    }
    else {
      store.dispatch({ type: 'setCursor', itemsRanked })
    }
  }

  restore(...(
    // Case I: restore selection to prev item
    prev ? [intersections(path).concat(prev), { offset: prev.key.length }] :
    // Case II: restore selection to next item
    next() ? [showContexts
      ? intersections(path).concat(rankItemsSequential(next().context))
      : intersections(path).concat(next()), { offset: 0 }] :
    // Case III: delete last thought in context; restore selection to context
    items.length > 1 ? [rootedIntersections(path), { offset: signifier(context).length }]
    // Case IV: delete very last thought; remove cursor
    : [null]
  ))
}

// const resetScrollContentIntoView = () => {
//   const contentEl = document.getElementById('content')
//   contentEl.style.transform = `translate3d(0,0,0)`
//   contentEl.style.marginBottom = `0`
// }

/** Positions the content so the parent of the cursor is in the top 33% of the viewport.
   Mobile will scroll to the selection when the cursor changes anyway. scrollContentIntoView is needed to hide all of the empty space created by autoscroll.
*/
const scrollContentIntoView = (scrollBehavior='smooth') => {
  const cursor = store.getState().cursor
  const contentEl = document.getElementById('content')

  if (cursor && cursor.length > 1) {
    const visibleEl = editableNode(cursor)
    if (!visibleEl) return

    const parentEl = visibleEl.closest('.child').closest('.children').closest('.child')
    if (!parentEl) return

    const existingScroll = contentEl.style.transform
      ? +contentEl.style.transform.slice(18, contentEl.style.transform.indexOf('px', 18))
      : 0
    const elY = parentEl.getBoundingClientRect().y // relative to viewport
    const extraScrollY = Math.max(0, elY - window.innerHeight/3 + existingScroll) // 33% of window height
    contentEl.style.transform = `translate3d(0, -${extraScrollY}px, 0)`
    contentEl.style.marginBottom = `-${extraScrollY}px`
  }
  else {
    contentEl.style.transform = `translate3d(0, 0, 0)`
    contentEl.style.marginBottom = `0`
  }
}

/** Adds a new item to the cursor. */
// NOOP if the cursor is not set
const newItem = ({ at, insertNewChild, insertBefore } = {}) => {

  const state = store.getState()
  const path = at || state.cursor || rankedRoot
  const dispatch = store.dispatch
  const tutorialStep1Completed = state.settings.tutorialStep === TUTORIAL_STEP0_START && !insertNewChild
  const tutorialStep2Completed = state.settings.tutorialStep === TUTORIAL_STEP1_NEWTHOUGHTINCONTEXT && insertNewChild
  const isTutorial = tutorialStep1Completed || tutorialStep2Completed

  const contextChain = splitChain(path, state.contextViews)
  const showContexts = state.contextViews[encodeItems(unrank(path))]
  const showContextsParent = state.contextViews[encodeItems(unrank(intersections(path)))]
  const itemsRanked = contextChain.length > 1
    ? lastItemsFromContextChain(contextChain)
    : path
  const contextRanked = showContextsParent && contextChain.length > 1 ? contextChain[contextChain.length - 2]
    : !showContextsParent && itemsRanked.length > 1 ? intersections(itemsRanked) :
    rankedRoot
  const context = unrank(contextRanked)

  // use the live-edited value
  // const itemsLive = showContextsParent
  //   ? intersections(intersections(items)).concat().concat(signifier(items))
  //   : items
  // const itemsRankedLive = showContextsParent
  //   ? intersections(intersections(path).concat({ key: innerTextRef, rank })).concat(signifier(path))
  //   : path

  const shortcutTextLinkAction = isMobile ? 'tap' : 'click'
  const shortcutTextLinkName = isMobile ? 'gestures' : 'keyboard shortcuts'

  const value = tutorialStep1Completed ? "Nice work! There's one more command you should know."
    : tutorialStep2Completed ? `You've got it! ${shortcutTextLinkAction} "Shortcuts" at the bottom of the screen for a list of all ${shortcutTextLinkName}.`
    : ''

  // if meta key is pressed, add a child instead of a sibling of the current thought
  // if shift key is pressed, insert the child before the current thought
  const newRank = showContextsParent && !insertNewChild ? 0 // rank does not matter here since it is autogenerated
    : (insertBefore
        ? (insertNewChild ? getPrevRank : getRankBefore)
        : (insertNewChild || tutorialStep1Completed ? getNextRank : getRankAfter)
      )(itemsRanked)

  // TODO: Add to the new '' context

  dispatch({
    type: 'newItemSubmit',
    context: insertNewChild
      ? unrank(itemsRanked)
      : context,
    // inserting a new child into a context functions the same as in the normal item view
    addAsContext: (showContextsParent && !insertNewChild) || (showContexts && insertNewChild),
    rank: newRank,
    value,
    tutorial: isTutorial
  })

  // tutorial step 1
  if (tutorialStep1Completed) {

    animateItem(value)

    // increment tutorial step
    dispatch({
      type: 'settings',
      key: 'tutorialStep',
      value: TUTORIAL_STEP1_NEWTHOUGHTINCONTEXT
    })

    const valueNewThoughtInContext = 'To add a thought to a context, ' + (isMobile ? 'swipe 👉🏽👇🏽👉🏽'
      : isMac ? 'hit ⌘ + Enter.'
      : 'hit Ctrl + Enter.')

    dispatch({
      type: 'newItemSubmit',
      context,
      rank: newRank + 0.1,
      value: valueNewThoughtInContext,
      tutorial: true
    })

    // delay second item until after first item has finished animating
    setTimeout(() => {

      animateItem(valueNewThoughtInContext)

      // must delay restoreSelection since animationCharsVisible === 0 will cause element to not initially be rendered
      setTimeout(() => {
        restoreSelection([{
          key: valueNewThoughtInContext,
          rank: newRank + 0.1
        }])
      }, ANIMATE_CHAR_STEP)

    }, value.length * ANIMATE_CHAR_STEP + ANIMATE_PAUSE_BETWEEN_ITEMS)
  }
  else if(tutorialStep2Completed) {

    animateItem(value)

    // increment tutorial step
    dispatch({
      type: 'settings',
      key: 'tutorialStep',
      value: TUTORIAL_STEP2_ANIMATING
    })

    dispatch({
      type: 'newItemSubmit',
      context: unrank(itemsRanked),
      rank: newRank + 0.1,
      value: 'Happy sensemaking!',
      tutorial: true
    })

    // delay second item until after first item has finished animating
    setTimeout(() => {
      animateItem('Happy sensemaking!')

      // must delay restoreSelection since animationCharsVisible === 0 will cause element to not initially be rendered
      setTimeout(() => {
        restoreSelection(unroot(itemsRanked.concat({
          key: 'Happy sensemaking!',
          rank: newRank + 0.1
        })))
      }, ANIMATE_CHAR_STEP)

      // move to delete tutorial step after "Happy sensemaking!" has finished animating
      setTimeout(() =>
        dispatch({
          type: 'settings',
          key: 'tutorialStep',
          value: TUTORIAL_STEP3_DELETE
        })
      , 'Happy sensemaking'.length * ANIMATE_CHAR_STEP)

    }, value.length * ANIMATE_CHAR_STEP + ANIMATE_PAUSE_BETWEEN_ITEMS)
  }

  disableOnFocus = true
  asyncFocus.enable()
  setTimeout(() => {
    // track the transcendental identifier if editing
    disableOnFocus = false
    restoreSelection((insertNewChild ? unroot(path) : intersections(path)).concat({ key: value, rank: newRank }), { offset: value.length })
  }, RENDER_DELAY + (isTutorial ? 50 : 0)) // for some reason animated items require more of a delay before restoring selection

  // // newItem helper
  // if(canShowHelper('newItem') && !insertNewChild && Object.keys(store.getState().data).length > 1) {
  //   dispatch({ type: 'showHelperIcon', id: 'newItem', data: {
  //     itemsRanked: intersections(path).concat({ key: value, rank: newRank })
  //   }})
  // }
  // // newChildSuccess helper
  // else if (canShowHelper('newChildSuccess') && insertNewChild) {
  //   dispatch({ type: 'showHelperIcon', id: 'newChildSuccess', data: {
  //     itemsRanked: path.concat({ key: value, rank: newRank })
  //   }})
  // }

  return {
    rank: newRank
  }
}

/** Create a new item, merging collisions. */
const addItem = ({ data=store.getState().data, value, rank, context }) =>
  Object.assign({}, data[value], {
    value: value,
    memberOf: (value in data && data[value] && data[value].memberOf ? data[value].memberOf : []).concat({
      context,
      rank
    }),
    lastUpdated: timestamp()
  })

/** Animates an item one character at a time, left to right. */
const animateItem = value => {
  let i = 0
  const welcomeTextAInterval = setInterval(() => {

    const data = store.getState().data

    // cancel the animation if the user cancelled the tutorial
    if (!data[value]) {
      clearInterval(welcomeTextAInterval)
      return
    }

    // end interval
    if (i > value.length) {
      delete data[value].animateCharsVisible
      store.dispatch({
        type: 'data',
        data: {
          [value]: Object.assign({}, data[value])
        }
      })
      clearInterval(welcomeTextAInterval)
    }
    // normal case
    else {
      store.dispatch({
        type: 'data',
        data: {
          [value]: Object.assign({}, data[value], {
            animateCharsVisible: ++i
          })
        },
        forceRender: true
      })
    }
  }, ANIMATE_CHAR_STEP)
}

/** Kicks off the welcome animation. */
const animateWelcome = () => {
  const { tutorialStep } = store.getState().settings
  if (tutorialStep === TUTORIAL_STEP0_START) {

    const tutorialValues = [
      'Welcome to em!',
      'To add a thought, ' + (isMobile ? 'swipe 👉🏽👇🏽': 'hit Enter.'),
      'Try it now!'
    ]

    // data and contextChildren updates
    const contextEncoded = encodeItems([ROOT_TOKEN])
    const updates = tutorialValues.reduce((accum, value, i) =>
      ({
        data: Object.assign({}, accum.data, {
          [value]: {
            value: value,
            memberOf: [
              {
                context: [ROOT_TOKEN],
                rank: i
              }
            ],
            tutorial: true,
            animateCharsVisible: 0
          }
        }),
        contextChildrenUpdates: {
          [contextEncoded]: (accum.contextChildrenUpdates[contextEncoded] || [])
            .concat([{
              key: value,
              rank: i,
              lastUpdated: timestamp(),
              tutorial: true
            }])
        }
      })
    , {
      data: {},
      contextChildrenUpdates: {}
    })

    store.dispatch(Object.assign({ type: 'data' }, updates))

    // start animating the item after the last animation has completed
    let animationStart = 0
    tutorialValues.forEach((value, i) => {
      setTimeout(() => animateItem(value), animationStart)
      animationStart += value.length * ANIMATE_CHAR_STEP + ANIMATE_PAUSE_BETWEEN_ITEMS
    })
  }
}

/** Restores cursor to its position before search. */
const restoreCursorBeforeSearch = () => {
  const cursor = store.getState().cursorBeforeSearch
  if (cursor) {
    store.dispatch({ type: 'setCursor', itemsRanked: cursor })
    setTimeout(() => {
      restoreSelection(cursor, { offset: 0 })
    }, RENDER_DELAY)
  }
}

/** Imports the given text or html into the given items */
const importText = (itemsRanked, inputText) => {

  const hasLines = /<li|p>.*<\/li|p>/mi.test(inputText)

  // true plaintext won't have any <li>'s or <p>'s
  // transform newlines in plaintext into <li>'s
  const text = !hasLines
    ? inputText
      .split('\n')
      .map(line => `<li>${line}</li>`)
      .join('')
    // if it's an entire HTML page, ignore everything outside the body tags
    : inputText.replace(/[\s\S]*<body>([\s\S]+?)<\/body>[\s\S]*/gmi, (input, bodyContent) => bodyContent)

  const updates = {}
  const contextChildrenUpdates = {}
  const context = unrank(intersections(itemsRanked))
  const importIntoEmpty = sigKey(itemsRanked) === ''
  const sig = signifier(itemsRanked)
  const state = store.getState()
  const data = Object.assign({}, state.data)

  let importCursor, firstImported

  // if the item where we are pasting is empty, replace it instead of adding to it
  if (importIntoEmpty) {
    updates[''] = data[''] && data[''].memberOf && data[''].memberOf.length > 1
      ? removeContext(data[''], context, sigRank(itemsRanked))
      : null
    const contextEncoded = encodeItems(unrank(rootedIntersections(itemsRanked)))
    contextChildrenUpdates[contextEncoded] = (state.contextChildren[contextEncoded] || [])
      .filter(child => !equalItemRanked(child, sig))
    importCursor = intersections(itemsRanked)
  }
  // otherwise paste as child of current items
  else {
    importCursor = itemsRanked.slice(0) // shallow copy
  }

  // paste after last child of current item
  let rank = getNextRank(importCursor.length > 0 ? importCursor : rankedRoot)
  let lastValue

  const parser = new htmlparser.Parser({
    onopentag: tagname => {
      // when there is a nested list, add an item to the cursor so that the next item will be added in the last item's context
      // the item is empty until the text is parsed
      if (lastValue && (tagname === 'ul' || tagname === 'ol')) {
        importCursor.push({ key: lastValue, rank })
      }
    },
    ontext: text => {
      const value = text.trim()
      if (value.length > 0) {

        const context = importCursor.length > 0 ? unrank(importCursor) : [ROOT_TOKEN]

        // increment rank regardless of depth
        // ranks will not be sequential, but they will be sorted since the parser is in order
        const itemNew = addItem({
          data,
          value,
          rank,
          context
        })

        // save the first imported item to restore the selection to
        if (!firstImported) {
          firstImported = { key: value, rank }
        }

        // update data
        // keep track of individual updates separate from data for updating data sources
        data[value] = itemNew
        updates[value] = itemNew

        // update contextChildrenUpdates
        const contextEncoded = encodeItems(context)
        contextChildrenUpdates[contextEncoded] = contextChildrenUpdates[contextEncoded] || state.contextChildren[contextEncoded] || []
        contextChildrenUpdates[contextEncoded].push({
          key: value,
          rank,
          lastUpdated: timestamp()
        })

        // update lastValue and increment rank for next iteration
        lastValue = value
        rank++
      }
    },
    onclosetag: tagname => {
      if (tagname === 'ul' || tagname === 'ol') {
        importCursor.pop()
      }
    }
  }, { decodeEntities: true })

  parser.write(text)
  parser.end()

  sync(updates, contextChildrenUpdates, {
    forceRender: true,
    callback: () => {
      // restore the selection to the first imported item
      restoreSelection(
        (importIntoEmpty ? intersections(itemsRanked) : itemsRanked).concat(firstImported),
        { offset: firstImported.key.length }
      )
    }
  })
}

/** Returns a shallow copy of an object with all keys that do not have a value of null or undefined */
const notNull = o => {
  const output = {}
  for (let key in o) {
    if (o[key] != null) {
      output[key] = o[key]
    }
  }
  return output
}

/** Returns a shallow copy of an object with all keys that do not have a falsey value */
const notFalse = o => {
  const output = {}
  for (let key in o) {
    if (o[key]) {
      output[key] = o[key]
    }
  }
  return output
}


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
      const { cursor } = store.getState()
      if (cursor && sigKey(cursor) === '') {
        deleteItem()
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
    exec: e => {
      const { cursor } = store.getState()

      // cancel if invalid New Uncle
      if (e.metaKey && e.altKey && (!cursor || cursor.length <= 1)) return

      newItem({
        // new uncle
        at: e.metaKey && e.altKey ? intersections(cursor) : null,
        // new item in context
        insertNewChild: e.metaKey && !e.altKey,
        // new item above
        insertBefore: e.shiftKey
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
    gesture: 'rdru',
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
    name: 'Categorize One',
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
    name: 'Categorize All',
    description: `Insert all thoughts in the current context into a new, intermediate context between them and the current context.`,
    gesture: 'lud',
    keyboard: { key: 'l', shift: true, meta: true },
    exec: e => {
      const { contextViews, cursor } = store.getState()
      if (cursor) {
        const contextChain = splitChain(cursor, contextViews)
        const itemsRanked = cursor.length > 1
          ? (intersections(contextChain.length > 1
            ? lastItemsFromContextChain(contextChain)
            : cursor))
          : rankedRoot

        const children = getChildrenWithRank(itemsRanked)

        const { rank } = newItem({
          at: cursor.length > 1 ? intersections(cursor) : rankedRoot,
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
    gesture: 'ldr',
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

        const cursorNew = intersections(cursor).concat(prev(), {
            key: sigKey(cursor),
            rank: getNextRank(intersections(cursor).concat(prev()))
          })

        store.dispatch({
          type: 'existingItemMove',
          oldItemsRanked: cursor,
          newItemsRanked: cursorNew
        })

        restoreSelection(cursorNew)
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

        const cursorNew = unroot(rootedIntersections(intersections(cursor)).concat({
            key: sigKey(cursor),
            rank: getRankAfter(intersections(cursor))
          }))

        store.dispatch({
          type: 'existingItemMove',
          oldItemsRanked: cursor,
          newItemsRanked: cursorNew
        })

        restoreSelection(cursorNew)
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
    shortcut.exec(e)
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
    (!shortcut.keyboard.meta || e.metaKey) &&
    (!shortcut.keyboard.alt || e.altKey) &&
    (!shortcut.keyboard.shift || e.shiftKey)
  )

  // execute the shortcut if it exists
  // preventDefault by default, unless e.allowDefault() is called
  let isAllowDefault = false
  e.allowDefault = () => isAllowDefault = true
  if (shortcut) {
    shortcut.exec(e)
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

const appReducer = (state = initialState(), action) => {
  // console.info('ACTION', action)
  return Object.assign({}, state, (({

    status: ({ value }) => ({
      status: value
    }),

    authenticate: ({ value, user, userRef }) => ({
      // autologin is set to true in separate 'settings' action to set localStorage
      // assume firebase is connected and return to connected state
      status: value ? 'authenticated' : 'connected',
      user,
      userRef
    }),

    // SIDE EFFECTS: localStorage, scroll
    // preserves some settings
    clear: () => {
      window.scrollTo({ top: 0 })
      localStorage.clear()
      localStorage['settings-dark'] = state.settings.dark
      localStorage['settings-tutorialStep'] = TUTORIAL_STEP0_START
      localStorage['helper-complete-welcome'] = true
      return Object.assign({}, initialState(), {
        'helper-complete-welcome': true,
        showHelper: null,
        // override welcome tutorial data
        data: {
          [ROOT_TOKEN]: {
            value: ROOT_TOKEN,
            memberOf: [],
            lastUpdated: timestamp()
          }
        },
        settings: {
          dark: state.settings.dark
        }
      })
    },

    // force re-render
    render: () => ({
      dataNonce: state.dataNonce + 1
    }),

    // updates data and contextChildren with any number of items
    data: ({ data, contextChildrenUpdates, forceRender }) => {

      const newData = data ? Object.assign({}, state.data, data) : state.data

      // delete null items
      if (data) {
        for (let key in data) {
          if (data[key] == null) {
            delete newData[key]
          }
        }
      }

      const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

      // delete empty children
      for (let contextEncoded in contextChildrenUpdates) {
        if (!contextChildrenUpdates[contextEncoded] || contextChildrenUpdates[contextEncoded].length === 0) {
          delete newContextChildren[contextEncoded]
        }
      }

      return {
        // remove null items
        dataNonce: state.dataNonce + (forceRender ? 1 : 0),
        data: newData,
        lastUpdated: timestamp(),
        contextChildren: newContextChildren
      }
    },

    // SIDE EFFECTS: localStorage, sync
    deleteTutorial: () => {

      const rootEncoded = encodeItems([ROOT_TOKEN])

      return Object.assign({
        data: Object.assign({}, Object.keys(state.data).reduce((accum, cur) => {
          return Object.assign({}, !state.data[cur] || !state.data[cur].tutorial ? {
            [cur]: state.data[cur]
          } : null, accum)
        }, {})),
        contextChildren: Object.assign({}, state.contextChildren, {
          [rootEncoded]: state.contextChildren[rootEncoded]
            .filter(child => !child.tutorial)
        }),
        lastUpdated: timestamp(),
        dataNonce: state.dataNonce + 1
      }, settingsReducer({
          type: 'settings',
          key: 'tutorialStep',
          value: TUTORIAL_STEP4_END
        }, state))
    },

    // SIDE EFFECTS: localStorage
    delete: ({ value, forceRender }) => {

      const data = Object.assign({}, state.data)
      const item = state.data[value]
      delete data[value]
      localStorage.removeItem('data-' + value)
      localStorage.lastUpdated = timestamp()

      // delete value from all contexts
      const contextChildren = Object.assign({}, state.contextChildren)
      if (item && item.memberOf && item.memberOf.length > 0) {
        item.memberOf.forEach(parent => {
          const contextEncoded = encodeItems(parent.context)
          contextChildren[contextEncoded] = contextChildren[contextEncoded]
            .filter(child => child.key !== value)
          if (contextChildren[contextEncoded].length === 0) {
            delete contextChildren[contextEncoded]
          }
        })
      }

      return {
        data,
        contextChildren,
        lastUpdated: timestamp(),
        dataNonce: state.dataNonce + (forceRender ? 1 : 0)
      }
    },

    // SIDE EFFECTS: sync
    // addAsContext adds the given context to the new item
    newItemSubmit: ({ value, context, addAsContext, rank, tutorial }) => {

      const animateCharsVisible = tutorial ? 0 : null

      // create item if non-existent
      const item = value in state.data && state.data[value]
        ? state.data[value]
        : Object.assign({
          value: value,
          memberOf: [],
          lastUpdated: timestamp()
        }, notNull({ animateCharsVisible, tutorial }))

      // store children indexed by the encoded context for O(1) lookup of children
      const contextEncoded = encodeItems(addAsContext ? [value] : context)
      const newContextChild = Object.assign({
        key: addAsContext ? signifier(context) : value,
        rank: addAsContext ? getNextRank([{ key: value, rank }], state.data, state.contextChildren): rank,
        lastUpdated: timestamp()
      }, notNull({ tutorial }))
      const itemChildren = (state.contextChildren[contextEncoded] || [])
        .filter(child => !equalItemRanked(child, newContextChild))
        .concat(newContextChild)
      const contextChildrenUpdates = { [contextEncoded]: itemChildren }
      const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

      // if adding as the context of an existing item
      let itemChildNew
      if (addAsContext) {
        const itemChildOld = state.data[signifier(context)]
        itemChildNew = Object.assign({}, itemChildOld, {
          memberOf: itemChildOld.memberOf.concat({
            context: [value],
            rank: getNextRank([{ key: value, rank }], state.data, state.contextChildren)
          }),
          lastUpdated: timestamp()
        }, notNull({ animateCharsVisible }), notFalse({ tutorial }))

        setTimeout(() => {
          syncOne(itemChildNew)
        }, RENDER_DELAY)
      }
      else {
        if (!item.memberOf) {
          item.memberOf = []
        }
        item.memberOf.push({
          context,
          rank
        })
      }

      // get around requirement that reducers cannot dispatch actions
      setTimeout(() => {
        syncOne(item, contextChildrenUpdates, { localOnly: tutorial })
      }, RENDER_DELAY)

      return {
        data: Object.assign({}, state.data, {
          [value]: item
        }, itemChildNew ? {
          [itemChildNew.value]: itemChildNew
        } : null),
        dataNonce: state.dataNonce + 1,
        contextChildren: newContextChildren
      }
    },

    // SIDE EFFECTS: updateUrlHistory
    // set both cursorBeforeEdit (the transcendental signifier) and cursor (the live value during editing)
    // the other contexts superscript uses cursor when it is available
    setCursor: ({ itemsRanked, contextChain=[], cursorHistoryClear, cursorHistoryPop, replaceContextViews, editing }) => {

      const itemsResolved = contextChain.length > 0
        ? chain(contextChain, itemsRanked, state.data)
        : itemsRanked

      // sync replaceContextViews with state.contextViews
      // ignore items that are not in the path of replaceContextViews
      // shallow copy
      const newContextViews = replaceContextViews
        ? Object.assign({}, state.contextViews)
        : state.contextViews

      if (replaceContextViews) {

        // add
        for (let encoded in replaceContextViews) {
          newContextViews[encoded] = true
        }

        // remove
        for (let encoded in state.contextViews) {
          if (!(encoded in replaceContextViews)) {
            delete newContextViews[encoded]
          }
        }
      }

      // only change editing status but do not move the cursor if cursor has not changed
      if (equalItemsRanked(itemsResolved, state.cursor) && state.contextViews === newContextViews) return {
        editing: editing != null ? editing : state.editing
      }

      clearTimeout(newChildHelperTimeout)
      clearTimeout(superscriptHelperTimeout)

      // do not update tutorial during inline tutorial
      const item = itemsRanked ? state.data[sigKey(itemsRanked)] : null
      if (!item || !item.tutorial) {
        setTimeout(() => {
          scrollContentIntoView()
          updateUrlHistory(itemsResolved, { contextViews: newContextViews })
        })
      }

      return {
        // dataNonce must be bumped so that <Children> are re-rendered
        // otherwise the cursor gets lost when changing focus from an edited item
        expanded: itemsResolved ? expandItems(
          itemsResolved,
          state.data,
          state.contextChildren,
          newContextViews,
          contextChain.length > 0
            ? contextChain.concat([itemsResolved.slice(lastItemsFromContextChain(contextChain).length)])
            : []
        ) : {},
        dataNonce: state.dataNonce + 1,
        cursor: itemsResolved,
        cursorBeforeEdit: itemsResolved,
        codeView: false,
        cursorHistory: cursorHistoryClear ? [] :
          cursorHistoryPop ? state.cursorHistory.slice(0, state.cursorHistory.length - 1)
          : state.cursorHistory,
        contextViews: newContextViews,
        editing: editing != null ? editing : state.editing
      }
    },

    cursorHistory: ({ cursor }) => {
      return {
        cursorHistory: state.cursorHistory
          // shift first entry if history has exceeded its maximum size
          .slice(state.cursorHistory.length >= MAX_CURSOR_HISTORY ? 1 : 0)
          .concat([cursor])
      }
    },

    // SIDE EFFECTS: syncRemoteData, localStorage, updateUrlHistory
    existingItemChange: ({ oldValue, newValue, context, showContexts, itemsRanked, rankInContext, contextChain }) => {

      // items may exist for both the old value and the new value
      const key = sigKey(itemsRanked)
      const rank = sigRank(itemsRanked)
      const itemOld = state.data[oldValue]
      const itemCollision = state.data[newValue]
      const itemParentOld = state.data[key]
      const items = unroot(context).concat(oldValue)
      const itemsNew = unroot(context).concat(newValue)
      const itemsRankedLiveOld = intersections(itemsRanked).concat({ key: oldValue, rank })

      // get a copy of state.data before modification for updateUrlHistory
      const data = Object.assign({}, state.data)

      // replace the old value with the new value in the cursor
      const itemEditingIndex = state.cursor.findIndex(item => item.key === oldValue && item.rank === rankInContext)
      const cursorNew = itemEditingIndex !== -1
        ? splice(state.cursor, itemEditingIndex, 1, {
          key: newValue,
          rank: state.cursor[itemEditingIndex].rank
        })
        : state.cursor

      // hasDescendantOfFloatingContext can be done in O(edges)
      const isItemOldOrphan = () => !itemOld.memberOf || itemOld.memberOf.length < 2
      const isItemOldChildless = () => getChildrenWithRank([{ key: oldValue, rank }], state.data, state.contextChildren).length < 2

      // the old item less the context
      const newOldItem = !isItemOldOrphan() || (showContexts && !isItemOldChildless())
        ? removeContext(itemOld, context, rank)
        : null

      const itemNew = Object.assign({}, itemOld, {
        value: newValue,
        memberOf: (itemCollision ? itemCollision.memberOf || [] : []).concat(context && context.length && !showContexts ? {
          context,
          rank
        } : []),
        lastUpdated: timestamp()
      })

      // update local data so that we do not have to wait for firebase
      state.data[newValue] = itemNew
      if (newOldItem) {
        state.data[oldValue] = newOldItem
      }
      else {
        delete state.data[oldValue]
      }

      // if context view, change the memberOf of the current thought (which is rendered visually as the parent of the context since are in the context view)
      if (showContexts) {
        // RESUME
        const itemParentNew = Object.assign({}, itemParentOld, {
          memberOf: removeContext(itemParentOld, intersections(unrank(itemsRanked)), rank).memberOf.concat({
            context: itemsNew,
            rank
          }),
          lastUpdated: timestamp()
        })
        state.data[key] = itemParentNew
      }

      // preserve context view
      const oldEncoded = encodeItems(unrank(state.cursor))
      const newEncoded = encodeItems(unrank(cursorNew))
      const contextViews = Object.assign({}, state.contextViews)
      if (oldEncoded !== newEncoded) {
        contextViews[newEncoded] = contextViews[oldEncoded]
        delete contextViews[oldEncoded]
      }

      // preserve contextChildren
      const contextEncoded = encodeItems(showContexts ? itemsNew : context)
      const itemChildren = (state.contextChildren[contextEncoded] || [])
        .filter(child =>
          !equalItemRanked(child, { key: oldValue, rank }) &&
          !equalItemRanked(child, { key: newValue, rank })
        )
        .concat({
          key: showContexts ? key : newValue,
          rank,
          lastUpdated: timestamp()
        })

      const contextParentEncoded = encodeItems(intersections(unrank(itemsRanked)))
      const itemParentChildren = showContexts ? (state.contextChildren[contextParentEncoded] || [])
        .filter(child => !equalItemRanked(child, signifier(itemsRanked))) : null

      setTimeout(() => {
        localStorage['data-' + newValue] = JSON.stringify(itemNew)
        if (newOldItem) {
          localStorage['data-' + oldValue] = JSON.stringify(newOldItem)
        }
        else {
          localStorage.removeItem('data-' + oldValue)
        }

        localStorage['contextChildren' + contextEncoded] = JSON.stringify(itemChildren)
      })

      // recursive function to change item within the context of all descendants
      // the inheritance is the list of additional ancestors built up in recursive calls that must be concatenated to itemsNew to get the proper context
      const recursiveUpdates = (itemsRanked, inheritance=[]) => {

        return getChildrenWithRank(itemsRanked, state.data, state.contextChildren).reduce((accum, child) => {
          const childItem = state.data[child.key]

          // remove and add the new context of the child
          const childNew = removeContext(childItem, unrank(itemsRanked), child.rank)
          childNew.memberOf.push({
            context: itemsNew.concat(inheritance),
            rank: child.rank
          })

          // update local data so that we do not have to wait for firebase
          state.data[child.key] = childNew
          setTimeout(() => {
            localStorage['data-' + child.key] = JSON.stringify(childNew)
          })

          return Object.assign(accum,
            {
              [child.key]: {
                data: childNew,
                context: unrank(itemsRanked)
              }
            },
            recursiveUpdates(itemsRanked.concat(child), inheritance.concat(child.key))
          )
        }, {})
      }

      const recUpdatesResult = recursiveUpdates(itemsRankedLiveOld)
      const recUpdates = Object.keys(recUpdatesResult).reduce((accum, key) =>
        Object.assign({}, accum, {
          [key]: recUpdatesResult[key].data
        })
      , {})
      const contextChildrenRecursiveUpdates = Object.keys(recUpdatesResult).reduce((accum, key) => {
        const contextEncodedOld = encodeItems(recUpdatesResult[key].context)
        const contextEncodedNew = encodeItems(itemsNew.concat(recUpdatesResult[key].context.slice(itemsNew.length)))
        return Object.assign({}, accum, {
          [contextEncodedOld]: [],
          [contextEncodedNew]: state.contextChildren[contextEncodedOld]
        })
      }, {})

      const updates = Object.assign(
        {
          [oldValue]: newOldItem,
          [newValue]: itemNew
        },
        recUpdates
      )

      const contextChildrenUpdates = Object.assign(
        { [contextEncoded]: itemChildren },
        showContexts ? { [contextParentEncoded]: itemParentChildren } : null,
        contextChildrenRecursiveUpdates
      )

      const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

      // delete empty contextChildren and sync to localStorage
      for (let contextEncoded in contextChildrenUpdates) {
        const itemChildren = contextChildrenUpdates[contextEncoded]
        if (itemChildren && itemChildren.length > 0) {
          localStorage['contextChildren' + contextEncoded] = JSON.stringify(itemChildren)
        }
        else {
          delete localStorage['contextChildren' + contextEncoded]
          delete newContextChildren[contextEncoded]
        }
      }

      setTimeout(() => {
        syncRemoteData(updates, contextChildrenUpdates)
        updateUrlHistory(cursorNew, { data, replace: true, contextViews })
      })

      const newContextViews = state.contextViews[encodeItems(itemsNew)] !== state.contextViews[encodeItems(items)]
        ? Object.assign({}, state.contextViews, {
          [encodeItems(itemsNew)]: state.contextViews[encodeItems(items)]
        })
        : state.contextViews

      return Object.assign(
        {
          // do not bump data nonce, otherwise editable will be re-rendered
          data: state.data,
          // update cursor so that the other contexts superscript and depth-bar will re-render
          // do not update cursorBeforeUpdate as that serves as the transcendental signifier to identify the item being edited
          cursor: cursorNew,
          expanded: expandItems(cursorNew, state.data, newContextChildren, newContextViews, contextChain),
          // copy context view to new value
          contextViews: newContextViews,
          contextChildren: newContextChildren
        },
        // canShowHelper('editIdentum', state) && itemOld.memberOf && itemOld.memberOf.length > 1 && newOldItem.memberOf.length > 0 && !equalArrays(context, newOldItem.memberOf[0].context) ? {
        //   showHelperIcon: 'editIdentum',
        //   helperData: {
        //     oldValue,
        //     newValue,
        //     context,
        //     rank,
        //     oldContext: newOldItem.memberOf[0].context
        //   }
        // } : {}
      )
    },

    // SIDE EFFECTS: syncRemoteData, localStorage
    existingItemDelete: ({ itemsRanked, rank, showContexts }) => {

      const items = unrank(itemsRanked)
      if (!exists(items, state.data)) return

      const value = signifier(items)
      const item = state.data[value]
      const context = rootedIntersections(items)
      const newData = Object.assign({}, state.data)

      // the old item less the context
      const newOldItem = item.memberOf && item.memberOf.length > 1
        ? removeContext(item, context, showContexts ? null : rank)
        : null

      // update local data so that we do not have to wait for firebase
      if (newOldItem) {
        newData[value] = newOldItem
      }
      else {
        delete newData[value]
      }

      const contextEncoded = encodeItems(context)
      const itemChildren = (state.contextChildren[contextEncoded] || [])
        .filter(child => !equalItemRanked(child, { key: value, rank }))

      setTimeout(() => {
        if (newOldItem) {
          localStorage['data-' + value] = JSON.stringify(newOldItem)
        }
        else {
          localStorage.removeItem('data-' + value)
        }

        if (itemChildren.length > 0) {
          localStorage['contextChildren' + contextEncoded] = JSON.stringify(itemChildren)
        }
        else {
          delete localStorage['contextChildren' + contextEncoded]
        }
      })

      // if removing an item from a context via the context view and the context has no more members or contexts, delete the context
      // const isItemOldOrphan = () => !item.memberOf || item.memberOf.length < 2
      // const isItemOldChildless = () => getChildrenWithRank([value], newData).length < 2
      let emptyContextDelete = {}
      // if(showContexts && getChildrenWithRank(intersections(items), newData).length === 0) {
        // const emptyContextValue = signifier(intersections(items))
        // delete newData[emptyContextValue]
        // localStorage.removeItem('data-' + emptyContextValue)
        // emptyContextDelete = {
        //   [emptyContextValue]: null
        // }
      // }

      // generates a firebase update object that can be used to delete/update all descendants and delete/update contextChildren
      const recursiveDeletes = itemsRanked => {
        return getChildrenWithRank(itemsRanked, newData, state.contextChildren).reduce((accum, child) => {
          const childItem = newData[child.key]
          const childNew = childItem && childItem.memberOf && childItem.memberOf.length > 1
            // update child with deleted context removed
            ? removeContext(childItem, unrank(itemsRanked), child.rank)
            // if this was the only context of the child, delete the child
            : null

          // update local data so that we do not have to wait for firebase
          if (childNew) {
            newData[child.key] = childNew
          }
          else {
            delete newData[child.key]
          }
          setTimeout(() => {
            if (childNew) {
              localStorage['data-' + child.key] = JSON.stringify(childNew)
            }
            else {
              localStorage.removeItem('data-' + child.key)
            }
          })

          return Object.assign(accum,
            { [child.key]: {
              data: childNew,
              context: unrank(itemsRanked)
            }}, // direct child
            recursiveDeletes(itemsRanked.concat(child)) // RECURSIVE
          )
        }, {})
      }

      const deleteUpdatesResult = recursiveDeletes(itemsRanked)
      const deleteUpdates = Object.keys(deleteUpdatesResult).reduce((accum, key) =>
        Object.assign({}, accum, {
          [key]: deleteUpdatesResult[key].data
        })
      , {})
      const contextChildrenRecursiveUpdates = Object.keys(deleteUpdatesResult).reduce((accum, key) => {
        const encodedContextRecursive = encodeItems(deleteUpdatesResult[key].context)
        return Object.assign({}, accum, {
          [encodedContextRecursive]: (state.contextChildren[encodedContextRecursive] || [])
            .filter(child => child.key !== key),
        })
      }, {})

      setTimeout(() => {
        for (let contextEncoded in contextChildrenRecursiveUpdates) {
          const itemChildren = contextChildrenRecursiveUpdates[contextEncoded]
          if (itemChildren && itemChildren.length > 0) {
            localStorage['contextChildren' + contextEncoded] = JSON.stringify(itemChildren)
          }
          else {
            delete localStorage['contextChildren' + contextEncoded]
          }
        }
      })

      const updates = Object.assign(
        {
          [value]: newOldItem
        },
        deleteUpdates,
        emptyContextDelete
      )

      const contextChildrenUpdates = Object.assign({
        [contextEncoded]: itemChildren.length > 0 ? itemChildren : null
      }, contextChildrenRecursiveUpdates)
      const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

      if (!itemChildren || itemChildren.length === 0) {
        delete newContextChildren[contextEncoded]
      }

      for (let contextEncoded in contextChildrenRecursiveUpdates) {
        const itemChildren = contextChildrenRecursiveUpdates[contextEncoded]
        if (!itemChildren || itemChildren.length === 0) {
          delete newContextChildren[contextEncoded]
        }
      }

      setTimeout(() => {
        syncRemoteData(updates, contextChildrenUpdates)
      })

      return {
        data: Object.assign({}, newData),
        dataNonce: state.dataNonce + 1,
        contextChildren: newContextChildren
      }
    },

    // side effect: sync
    existingItemMove: ({ oldItemsRanked, newItemsRanked }) => {

      const data = Object.assign({}, state.data)
      const oldItems = unrank(oldItemsRanked)
      const newItems = unrank(newItemsRanked)
      const value = signifier(oldItems)
      const oldRank = sigRank(oldItemsRanked)
      const newRank = sigRank(newItemsRanked)
      const oldContext = rootedIntersections(oldItems)
      const newContext = rootedIntersections(newItems)
      const sameContext = equalArrays(oldContext, newContext)
      const oldItem = data[value]
      const newItem = moveItem(oldItem, oldContext, newContext, oldRank, newRank)
      const editing = equalItemsRanked(state.cursorBeforeEdit, oldItemsRanked)

      // preserve contextChildren
      const contextEncodedOld = encodeItems(oldContext)
      const contextEncodedNew = encodeItems(newContext)

      // if the contexts have changed, remove the value from the old contextChildren and add it to the new
      const itemChildrenOld = (state.contextChildren[contextEncodedOld] || [])
        .filter(child => !equalItemRanked(child, { key: value, rank: oldRank }))
      const itemChildrenNew = (state.contextChildren[contextEncodedNew] || [])
        .filter(child => !equalItemRanked(child, { key: value, rank: oldRank }))
        .concat({
          key: value,
          rank: newRank,
          lastUpdated: timestamp()
        })

      const recursiveUpdates = (itemsRanked, inheritance=[]) => {

        return getChildrenWithRank(itemsRanked, state.data, state.contextChildren).reduce((accum, child) => {
          const childItem = state.data[child.key]

          // remove and add the new context of the child
          const childNew = removeContext(childItem, unrank(itemsRanked), child.rank)
          childNew.memberOf.push({
            context: newItems.concat(inheritance),
            rank: child.rank
          })

          // update local data so that we do not have to wait for firebase
          data[child.key] = childNew
          setTimeout(() => {
            localStorage['data-' + child.key] = JSON.stringify(childNew)
          })

          return Object.assign(accum,
            {
              [child.key]: {
                data: childNew,
                context: unrank(itemsRanked),
                rank: child.rank
              }
            },
            recursiveUpdates(itemsRanked.concat(child), inheritance.concat(child.key))
          )
        }, {})
      }

      const recUpdatesResult = recursiveUpdates(oldItemsRanked)
      const recUpdates = Object.keys(recUpdatesResult).reduce((accum, key) =>
        Object.assign({}, accum, {
          [key]: recUpdatesResult[key].data
        })
      , {})

      const contextChildrenRecursiveUpdates = sameContext
        ? {}
        : Object.keys(recUpdatesResult).reduce((accum, key) => {
          const contextEncodedOld = encodeItems(recUpdatesResult[key].context)
          const contextEncodedNew = encodeItems(newItems.concat(recUpdatesResult[key].context.slice(newItems.length + unroot(oldContext).length - unroot(newContext).length)))

          return Object.assign({}, accum, {
            [contextEncodedOld]: (accum[contextEncodedOld] || state.contextChildren[contextEncodedOld] || [])
              .filter(child => child.key !== key),
            [contextEncodedNew]: (accum[contextEncodedNew] || state.contextChildren[contextEncodedNew] || [])
              .concat({
                key,
                rank: recUpdatesResult[key].rank,
                lastUpdated: timestamp()
              })
          })
        }, {})

      const contextChildrenUpdates = Object.assign({
        [contextEncodedOld]: itemChildrenOld,
        [contextEncodedNew]: itemChildrenNew,
      }, contextChildrenRecursiveUpdates)
      const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

      for (let contextEncoded in newContextChildren) {
        const itemChildren = newContextChildren[contextEncoded]
        if (!itemChildren || itemChildren.length === 0) {
          delete newContextChildren[contextEncoded]
        }
      }

      const updates = Object.assign(
        {
          [value]: newItem
        },
        // RECURSIVE
        recUpdates
      )

      data[value] = newItem

      setTimeout(() => {
        localStorage['data-' + value] = JSON.stringify(newItem)

        if (itemChildrenOld.length > 0) {
          localStorage['contextChildren' + contextEncodedOld] = JSON.stringify(itemChildrenOld)
        }
        else {
          delete localStorage['contextChildren' + contextEncodedOld]
        }
        if (itemChildrenNew.length > 0) {
          localStorage['contextChildren' + contextEncodedNew] = JSON.stringify(itemChildrenNew)
        }
        else {
          delete localStorage['contextChildren' + contextEncodedNew]
        }

        syncRemoteData(updates, contextChildrenUpdates)
        if (editing) {
          updateUrlHistory(newItemsRanked, { replace: true })
        }
      })

      return {
        data,
        dataNonce: state.dataNonce + 1,
        cursor: editing ? newItemsRanked : state.cursor,
        cursorBeforeEdit: editing ? newItemsRanked : state.cursorBeforeEdit,
        contextChildren: newContextChildren
      }
    },

    codeChange: ({ itemsRanked, newValue }) => {

      const value = sigKey(itemsRanked)
      const oldItem = state.data[value]
      const newItem = Object.assign({}, oldItem, {
        code: newValue
      })

      state.data[value] = newItem

      setTimeout(() => {
        localStorage['data-' + value] = JSON.stringify(newItem)
        syncRemoteData({
          [value]: newItem
        }, {})
      })

      return {
        data: Object.assign({}, state.data)
      }
    },

    // SIDE EFFECTS: localStorage, syncRemote
    settings: settingsReducer,

    // SIDE EFFECTS: localStorage
    helperComplete: ({ id }) => {
      localStorage['helper-complete-' + id] = true
      return {
        showHelper: null,
        helpers: Object.assign({}, state.helpers, {
          [id]: Object.assign({}, state.helpers[id], {
            complete: true
          })
        })
      }
    },

    // SIDE EFFECTS: localStorage, restoreSelection
    helperRemindMeLater: ({ id, duration=0 }) => {

      if (state.cursor && (state.editing || !isMobile)) {
        setTimeout(() => {
          restoreSelection(state.cursor)
        }, 0)
      }

      const time = Date.now() + duration
      localStorage['helper-hideuntil-' + id] = time

      helperCleanup()

      return {
        showHelper: null,
        helpers: Object.assign({}, state.helpers, {
          [id]: Object.assign({}, state.helpers[id], {
            hideuntil: time
          })
        })
      }
    },

    expandContextItem: ({ itemsRanked }) => ({
      expandedContextItem: equalItemsRanked(state.expandedContextItem, itemsRanked)
        ? null
        : itemsRanked
    }),

    showHelperIcon: ({ id, data }) =>
      canShowHelper(id, state)
        ? {
          showHelperIcon: id,
          helperData: data
        }
        : {},

    showHelper: ({ id, data }) =>
      canShowHelper(id, state)
        ? {
          showHelper: id,
          showHelperIcon: null,
          helperData: data || state.helperData
        }
        : {},

    // track editing independently of cursor to allow navigation when keyboard is hidden
    editing: ({ value }) => ({
      editing: value
    }),

    // SIDE EFFECTS: updateUrlHistory
    toggleContextView: () => {

      const encoded = encodeItems(unrank(state.cursor))
      const contextViews = Object.assign({}, state.contextViews)

      if (encoded in state.contextViews) {
        delete contextViews[encoded]
      }
      else {
        Object.assign(contextViews, {
          [encoded]: true
        })
      }

      updateUrlHistory(state.cursor, { data: state.data, contextViews })

      return {
        contextViews
      }
    },

    toggleCodeView: ({ value }) => ({
      codeView: equalItemsRanked(state.cursor, state.codeView) || value === false ? null : state.cursor
    }),

    search: ({ value }) => ({
      search: value
    }),

    cursorBeforeSearch: ({ value }) => ({
      cursorBeforeSearch: value
    }),

    dragInProgress: ({ value }) => ({
      dragInProgress: value
    }),

  })[action.type] || (() => state))(action, state))
}

// SIDE EFFECTS: localStorage, syncRemote
const settingsReducer = ({ key, value, localOnly }, state) => {
  localStorage['settings-' + key] = value

  if (!localOnly) {
    setTimeout(() => {
      syncRemote({ ['settings/' + key]: value })
    })
  }

  return {
    settings: Object.assign({}, state.settings, { [key]: value })
  }
}

const store = createStore(
  appReducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)


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
  updateUrlHistory(rankedRoot)
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
    if (value.lastClientId === clientId) return

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
        syncOne({
          value: ROOT_TOKEN
        })
      }
    }
    // otherwise sync all data locally
    else {
      fetch(value)
    }
  })
}

/** Saves data to state, localStorage, and Firebase. */
// assume timestamp has already been updated on dataUpdates
const sync = (dataUpdates={}, contextChildrenUpdates={}, { localOnly, forceRender, callback } = {}) => {

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
      localStorage.removeItem('data-' + key)
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
    syncRemoteData(dataUpdates, contextChildrenUpdates, callback)
  }
  else {
    // do not let callback outrace re-render
    if (callback) {
      setTimeout(callback, RENDER_DELAY)
    }
  }
}

/** Shortcut for sync with single item. */
const syncOne = (item, contextChildrenUpdates={}, options) => {
  sync({
    [item.value]: item
  }, contextChildrenUpdates, options)
}

/** Save all firebase data to state and localStorage. */
const fetch = value => {

  const state = store.getState()
  const lastUpdated = value.lastUpdated
  const settings = value.settings || {}

  // migrate the user to use ROOT_TOKEN if they are still using root
  // state and localStorage will be migrated immediately
  const migrateRoot = value.data.root && !value.data[ROOT_TOKEN]

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
      : keyRaw === 'root' && migrateRoot ? ROOT_TOKEN
      : firebaseDecode(keyRaw)
    const item = value.data[keyRaw]

    // migrate memberOf 'root' to ROOT_TOKEN
    if (migrateRoot) {
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

  if (value.contextChildren) {
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

        if (!(firebaseEncode(contextEncoded || EMPTY_TOKEN) in value.contextChildren)) {
          contextChildrenUpdates[contextEncoded] = null
        }
      }
    }

    store.dispatch({ type: 'data', data: dataUpdates, contextChildrenUpdates })
  }
  // migrate from version without contextChildren
  else {
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

      sync({}, contextChildrenUpdates, { forceRender: true, callback: () => {
        console.info('Done')
      }})

    })
  }

  const migrateRootContextUpdates = migrateRoot ? {
    [encodeItems(['root'])]: null,
    [encodeItems([ROOT_TOKEN])]: state.contextChildren[encodeItems([ROOT_TOKEN])],
  } : {}

  // sync migrated root with firebase
  if (migrateRoot) {
    console.info('Migrating "root"...', migrateRootUpdates, migrateRootContextUpdates)
    migrateRootUpdates.root = null
    migrateRootUpdates[ROOT_TOKEN] = state.data[ROOT_TOKEN]
    syncRemoteData(migrateRootUpdates, migrateRootContextUpdates, () => {
      console.info('Done')
    })
  }

  // re-render after everything has been updated
  // only if there is no cursor, otherwise it interferes with editing
  if (!state.cursor) {
    store.dispatch({ type: 'render' })
  }
}

/** Adds remote updates to a local queue so they can be resumed after a disconnect. */
// invokes callback asynchronously whether online or not in order to not outrace re-render
const syncRemote = (updates = {}, callback) => {
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
const syncRemoteData = (dataUpdates = {}, contextChildrenUpdates = {}, callback) => {
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
  return syncRemote(Object.assign({}, prependedUpdates, prependedContextChildrenUpdates), callback)
}


/*=============================================================
 * Window Init
 *============================================================*/

window.addEventListener('keydown', handleKeyboard)

window.addEventListener('popstate', () => {
  const { itemsRanked, contextViews } = decodeItemsUrl()
  store.dispatch({ type: 'setCursor', itemsRanked, replaceContextViews: contextViews })
  restoreSelection(itemsRanked)
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

// not smooth enough
// window.addEventListener('scroll', e => {
//   if (!disableScrollContent) {
//     scrollContentIntoView('auto')
//   }
// })


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

  }} onTouchMove={() => touching = true} onTouchEnd={() => touching = false} className={classNames({
    container: true,
    // mobile safari must be detected because empty and full bullet points in Helvetica Neue have different margins
    mobile: isMobile,
    'drag-in-progress': dragInProgress,
    chrome: /Chrome/.test(navigator.userAgent),
    safari: /Safari/.test(navigator.userAgent)
  })}><MultiGesture onEnd={handleGesture}>

    <HelperWelcome />
    <HelperShortcuts />
    <HelperFeedback />

    <header>
      <div className='header-container'>
        <HomeLink />
        <Breadcrumbs />
        <Status />
        <CancelTutorial />
      </div>
    </header>

    <div id='content' className='content' onClick={() => {
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
    }}>

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
            {!isRoot(focus) ? <div className='subheading-container'>
              <Subheading itemsRanked={focus} />
              <div className='subheading-caption dim'>appears in these contexts:</div>
            </div> : null}
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
              { /* Subheading */ }
              {!isRoot(focus) ? (children.length > 0
                ? <div className='subheading-container'>
                  <Subheading itemsRanked={focus} />
                </div>
                : <ul className='subheading-leaf-children'><li className='leaf'><Subheading itemsRanked={focus} /></li></ul>
              ) : null}

              {/* Subheading Children
                  Note: Override directChildren by passing children
              */}

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

    <Footer />

    {/*<HelperIcon />*/}

  </MultiGesture></div>
})

const Footer = connect(({ status, settings, user }) => ({ status, settings, user }))(({ status, settings, user, dispatch }) =>
  // hack marginTop so that the footer is pinned against the bottom whether logged in or not
  <ul className='footer list-none' style={ !user ? { marginTop: (isMobile ? '22px' : '15px') } : null } onClick={() => {
    // remove the cursor when the footer is clicked (the other main area besides .content)
    cursorBack()
  }}>
    <li>
      <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ className='settings-dark' onClick={() => dispatch({ type: 'settings', key: 'dark', value: !settings.dark })}>Dark Mode</a>
      <span> | </span>
      <a tabIndex='-1' href='https://forms.gle/ooLVTDNCSwmtdvfA8' target='_blank' rel='noopener noreferrer'>Feedback <img src={`https://img.icons8.com/small/16/${settings.dark ? '87ceeb' : '1b6f9a'}/open-in-popup.png`} alt='' style={{ verticalAlign: 'middle' }}/></a>
      <span> | </span>
      <a tabIndex='-1' onClick={() => {
        window.scrollTo({ top: 0 })
        dispatch({ type: 'showHelper', id: 'shortcuts' })
      }}>Shortcuts</a>
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
)

const Breadcrumbs = connect(({ cursor }) => ({ cursor }))(({ cursor }) => {

  if (!cursor) return null

  const itemsRanked = cursor.slice(0, cursor.length - 2)

  return <div className='breadcrumbs'>
    <TransitionGroup>
      {itemsRanked.map((itemRanked, i) => {
        const subitems = ancestors(itemsRanked, itemRanked)
        return <CSSTransition key={i} timeout={500} classNames='fade'>
          <span>
            <span className='breadcrumb-divider'> • </span>
            <Link itemsRanked={subitems} />
          </span>
        </CSSTransition>
      })}
    </TransitionGroup>
  </div>
})

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
    })} onClick={() => dispatch({ type: 'deleteTutorial' }) }>✕ tutorial</a>
  </div> : null
)

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
      }
    }}><span role='img' arial-label='home'><img className='logo' src={inline ? (dark ? logoDarkInline : logoInline) : (dark ? logoDark : logo)} alt='em' width='24' /></span></a>
    {showHelper === 'home' ? <Helper id='home' title='Tap the "em" icon to return to the home context' arrow='arrow arrow-top arrow-topleft' /> : null}
  </span>
)

const Subheading = ({ itemsRanked, showContexts }) => {
  return <div className='subheading'>
    {itemsRanked.map((itemRanked, i) => {
      const subitems = ancestors(itemsRanked, itemRanked)
      return <span key={i} className={equalItemRanked(itemRanked, signifier(itemsRanked)) && !showContexts ? 'subheading-focus' : ''}>
        <Link itemsRanked={subitems} />
        <Superscript itemsRanked={subitems} />
        {i < itemsRanked.length - 1 || showContexts ? <span> + </span> : null}
      </span>
    })}
    {showContexts ? <span> </span> : null}
  </div>
}

/** A recursive child element that consists of a <li> containing a <div> and <ul> */
const Child = connect(({ cursor, cursorBeforeEdit, expandedContextItem, codeView }, props) => {

  // <Child> connect

  // resolve items that are part of a context chain (i.e. some parts of items expanded in context view) to match against cursor subset
  const itemsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.itemsRanked)
    : unroot(props.itemsRanked)

  // check if the cursor path includes the current item
  // check if the cursor is editing an item directly
  const isEditing = equalItemsRanked(cursorBeforeEdit, itemsResolved)
  const itemsRankedLive = isEditing ? cursor : props.itemsRanked

  return {
    cursor,
    isEditing,
    itemsRankedLive,
    expandedContextItem,
    isCodeView: cursor && equalItemsRanked(codeView, props.itemsRanked)
  }
})(DragSource('item',
  // spec (options)
  {
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
)(({ cursor=[], isEditing, expandedContextItem, isCodeView, focus, itemsRankedLive, itemsRanked, rank, contextChain, childrenForced, showContexts, depth=0, count=0, isDragging, isHovering, dragSource, dragPreview, dropTarget, dispatch }) => {

  // <Child> render

  const children = childrenForced || getChildrenWithRank(itemsRankedLive)

  // if rendering as a context and the item is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([signifier(intersections(itemsRanked))])

  // prevent fading out cursor parent
  const isCursorParent = equalItemsRanked(intersections(cursor || []), chain(contextChain, itemsRanked))

  const item = store.getState().data[sigKey(itemsRankedLive)]

  return item ? dropTarget(dragSource(<li className={classNames({
    child: true,
    leaf: children.length === 0,
    // used so that the autofocus can properly highlight the immediate parent of the cursor
    editing: isEditing,
    'cursor-parent': isCursorParent,
    'code-view': isCodeView,
    dragging: isDragging
  })} ref={el => {

    if (el) {
      dragPreview(getEmptyImage())
    }

    if (el && !isMobile && isEditing) {
      // must delay document.getSelection() until after render has completed
      setTimeout(() => {
        if (!document.getSelection().focusNode && el.firstChild.firstChild && el.firstChild.firstChild.focus) {
          // select the Editable
          el.firstChild.firstChild.focus()
        }
      })
    }

  }}>
    <span className='drop-hover' style={{ display: simulateDropHover || isHovering ? 'inline' : 'none' }}></span>
    <div className='child-heading' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>

      {equalItemsRanked(itemsRanked, expandedContextItem) && itemsRanked.length > 2 ? <Subheading itemsRanked={intersections(intersections(itemsRanked))} showContexts={showContexts} />
        : showContexts && itemsRanked.length > 2 ? <span className='ellipsis'><a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => {
          dispatch({ type: 'expandContextItem', itemsRanked })
        }}>... </a></span>
        : null}

      {homeContext
        ? <HomeLink/>
        // cannot use itemsRankedLive here else Editable gets re-rendered during editing
        : <Editable focus={focus} itemsRanked={itemsRanked} rank={rank} contextChain={contextChain} showContexts={showContexts} />}

      <Superscript itemsRanked={itemsRanked} showContexts={showContexts} contextChain={contextChain} />
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
  const showContexts = props.showContexts || contextViews[encodeItems(unrank(itemsResolvedLive))]
  const showContextsParent = contextViews[encodeItems(unrank(intersections(itemsResolvedLive)))]
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
  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth)
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
        home: () => getChildrenWithRank(rankedRoot),
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

  const children = childrenForced ? childrenForced
    : codeResults && codeResults.length && codeResults[0] && codeResults[0].key ? codeResults
    : showContexts ? getContextsSortedAndRanked(itemsRanked)
    : getChildrenWithRank(itemsRanked)

  // expand root, editing path, and contexts previously marked for expansion in setCursor
  return <React.Fragment>
    {children.length > 0 && depth < MAX_DEPTH && (isRoot(itemsRanked) || isEditingPath || store.getState().expanded[encodeItems(unrank(itemsResolved))]) ? <ul
        // data-items={showContexts ? encodeItems(unroot(unrank(itemsRanked))) : null}
        className={classNames({
          children: true,
          'context-chain': showContexts,
          ['distance-from-cursor-' + distance]: true
        })}
      >
        {children.map((child, i) => {
          // do not render items pending animation
          const childItemsRanked = showContexts
            // replace signifier rank with rank from child when rendering showContexts as children
            // i.e. Where Context > Item, use the Item rank while displaying Context
            ? rankItemsFirstMatch(
                child.context,
                store.getState().data,
                store.getState().contextViews
              )
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
      })} style={{ display: simulateDrag || isDragInProgress ? 'list-item' : 'none'}}>
        <span className='drop-hover' style={{ display: simulateDropHover || isHovering ? 'inline' : 'none'}}></span>
      </li>)}
      </ul> : <ul className='empty-children' style={{ display: simulateDrag || isDragInProgress ? 'block' : 'none'}}>{dropTarget(<li className={classNames({
          child: true,
          'drop-end': true,
          last: depth===0
        })}>
        <span className='drop-hover' style={{ display: simulateDropHover || isHovering ? 'inline' : 'none'}}></span>
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
  return <a tabIndex='-1' href={encodeItemsUrl(unrank(itemsRanked))} className='link' onClick={e => {
    e.preventDefault()
    document.getSelection().removeAllRanges()
    dispatch({ type: 'setCursor', itemsRanked })
    // updateUrlHistory(rankItemsFirstMatch(e.shiftKey ? [signifier(items)] : items, store.getState().data))
  }}>{value}</a>
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
    if (!disableOnFocus) {

      disableOnFocus = true
      setTimeout(() => {
        disableOnFocus = false
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

      showContexts = showContexts || state.contextViews[encodeItems(unrank(itemsRanked))]

      if (
        !touching &&
        // not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be safe
        !state.dragInProgress &&
        !isElementHiddenByAutoFocus(e.target) &&
        (
          // no cursor
          !state.cursor ||
          // clicking a different item (when not editing)
          (!state.editing && !equalItemsRanked(itemsRanked, state.cursor))
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
      // not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be safe
      if (!store.getState().dragInProgress) {
        setCursorOnItem({ editing: true })
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
          clearTimeout(newChildHelperTimeout)
          clearTimeout(superscriptHelperTimeout)

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

// renders superscript if there are other contexts
// optionally pass items (used by Subheading) or itemsRanked (used by Child)
const Superscript = connect(({ contextViews, cursorBeforeEdit, cursor, showHelper, helperData }, props) => {

  // track the transcendental identifier if editing
  const editing = equalArrays(unrank(cursorBeforeEdit || []), unrank(props.itemsRanked || [])) && exists(unrank(cursor || []))

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
    numContexts: exists(itemsLive) && getContexts(itemsLive).length,
    showHelper,
    helperData
  }
})(({ contextViews, contextChain=[], items, itemsRanked, itemsRankedLive, itemRaw, empty, numContexts, showHelper, helperData, showSingle, showContexts, dispatch }) => {

  showContexts = showContexts || contextViews[encodeItems(unrank(itemsRanked))]

  const itemsLive = unrank(itemsRankedLive)

  const numDescendantCharacters = getDescendants(showContexts ? itemsRankedLive.concat(itemRaw) : itemsRankedLive )
    .reduce((charCount, child) => charCount + child.length, 0)

  // resolve items that are part of a context chain (i.e. some parts of items expanded in context view)
  const itemsResolved = contextChain.length > 0
    ? chain(contextChain, itemsRanked)
    : itemsRanked

  const selectFromExpandedArea = () => {
    const state = store.getState()

    if (isMobile &&
      // no cursor
      (!state.cursor ||
      // clicking a different item (when not editing)
      (!state.editing && !equalItemsRanked(itemsResolved, state.cursor)))) {

      // prevent focus to allow navigation with mobile keyboard down
      dispatch({ type: 'setCursor', itemsRanked: itemsResolved, cursorHistoryClear: true })
    }
    else {
      asyncFocus.enable()
      // TODO: for some reason itemsRanked and itemsResolved are different here in nested context views compared to setCursorOnItem
      restoreSelection(itemsResolved, { offset: sigKey(itemsResolved).length, cursorHistoryClear: true })
    }
  }

  const DepthBar = () => <span>

    {numDescendantCharacters >= 16 ? <Helper id='depthBar' title="The length of this bar indicates the number of items in this context." style={{ top: 30, marginLeft: -16 }} arrow='arrow arrow-up arrow-upleft' opaque>
      <p>This helps you quickly recognize contexts with greater depth as you navigate.</p>
    </Helper> : null}

    {(showContexts ? intersections(itemsLive) : itemsLive) && numDescendantCharacters ? <span className={classNames({
      'depth-bar': true,
      'has-other-contexts': itemsLive.length > 1 && (getContexts(showContexts ? intersections(itemsLive) : itemsLive).length > 1)
    })} style={{ width: Math.log(numDescendantCharacters) + 2 }} /> : null}
  </span>

  return <span className='superscript-container'>{!empty && numContexts > (showSingle ? 0 : 1)
    ? <span className='num-contexts'> {/* Make the container position:relative so that the helper is positioned correctly */}
      <sup>{numContexts}</sup>

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

    <span className='child-expanded-click'
      // disable focus on hidden items
      // focus can only be prevented on mousedown, not click
      onMouseDown={e => {
        if(touching || isElementHiddenByAutoFocus(e.target)) {
          e.preventDefault()
          // delay cursorBack otherwise the items will re-render before onClick resolves and distance-from-cursor will be wrong
          setTimeout(cursorBack)
        }
      }}
      onClick={e => {
        // also need to prevent cursor movement on hidden items
        // not prevented by mousedown being prevented
        if(!touching &&
          !isElementHiddenByAutoFocus(e.target)) {
          selectFromExpandedArea()
          e.preventDefault()
        }
      }}
    ></span>
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
    <li className='child leaf'><div className='child-heading'>
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

            disableOnFocus = true
            asyncFocus.enable()
            setTimeout(() => {
              disableOnFocus = false
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
          }}>START</a> :
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
  <Helper id='welcome' title='Welcome to em' className='popup' center>
    <p><HomeLink inline /> is a tool that helps you become more aware of your own thinking process.</p>
    <p>The features of <HomeLink inline /> mirror the features of your mind—from focus, to multiple contexts, to the interconnectedness of ideas.</p>
  </Helper>

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
  <Helper id='shortcuts' title='Shortcuts' className='popup' center>
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
                ? shortcut.gesture.split('').map(lettersToArrow).join('')
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
      <li className='child'><div className='child-heading'>
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
      focus={rankedRoot}
      itemsRanked={rankedRoot}
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
