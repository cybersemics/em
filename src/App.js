/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'
import ContentEditable from 'react-contenteditable'
import { encode as firebaseEncode, decode as firebaseDecode } from 'firebase-encode'
import * as evaluate from 'static-eval'
// import { parse } from 'esprima'
import assert from 'assert'

import * as pkg from '../package.json'
import './App.css'
import logo from './logo-black.png'
import logoDark from './logo-white.png'
import logoInline from './logo-black-inline.png'
import logoDarkInline from './logo-white-inline.png'
import { MultiGesture } from './MultiGesture.js'

const parse = require('esprima').parse


/**************************************************************
 * Globals
 **************************************************************/

// maximum number of characters of children to allow expansion
const NESTING_CHAR_MAX = 250
const MAX_DISTANCE_FROM_CURSOR = 3
const FADEOUT_DURATION = 400
// ms on startup before offline mode is enabled
// sufficient to avoid flash on login
const OFFLINE_TIMEOUT = 8000
const RENDER_DELAY = 50
const MAX_CURSOR_HISTORY = 50
const HELPER_REMIND_ME_LATER_DURATION = 1000 * 60 * 60 * 2 // 2 hours
// const HELPER_REMIND_ME_TOMORROW_DURATION = 1000 * 60 * 60 * 20 // 20 hours
const HELPER_CLOSE_DURATION = 1000//1000 * 60 * 5 // 5 minutes
const HELPER_NEWCHILD_DELAY = 1800
const HELPER_AUTOFOCUS_DELAY = 2400
const HELPER_SUPERSCRIPT_SUGGESTOR_DELAY = 1000 * 30
const HELPER_SUPERSCRIPT_DELAY = 800
const HELPER_CONTEXTVIEW_DELAY = 800

const isMobile = /Mobile/.test(navigator.userAgent)

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
let autofocusHelperTimeout
let superscriptHelperTimeout

// track whether the user is dragging so that we can distinguish touchend events from tap or drag
let dragging

/**************************************************************
 * Initial State
 **************************************************************/

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
    focus: decodeItemsUrl(),
    from: getFromFromUrl(),
    showContexts: decodeUrlContexts(),
    contextViews: {},
    data: {
      root: {}
    },
    settings: {
      dark: JSON.parse(localStorage['settings-dark'] || 'false'),
      autologin: JSON.parse(localStorage['settings-autologin'] || 'false'),
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
  }

  // initial helper states
  const helpers = ['welcome', 'home', 'newItem', 'newChild', 'newChildSuccess', 'autofocus', 'superscriptSuggestor', 'superscript', 'contextView', 'editIdentum', 'depthBar']
  for (let i = 0; i < helpers.length; i++) {
    state.helpers[helpers[i]] = {
      complete: JSON.parse(localStorage['helper-complete-' + helpers[i]] || 'false'),
      hideuntil: JSON.parse(localStorage['helper-hideuntil-' + helpers[i]] || '0')
    }
  }

  // welcome helper
  if (canShowHelper('welcome', state)) {
    state.showHelper = 'welcome'
  }
  // contextView helper
  else if(canShowHelper('contextView')) {
    const items = decodeItemsUrl()
    if(!isRoot(items)) {
      state.showHelperIcon = 'contextView'
      state.helperData = signifier(items)
    }
  }

  return state
}


/**************************************************************
 * Helper Functions
 **************************************************************/

// parses the items from the url
// declare using traditional function syntax so it is hoisted
function decodeItemsUrl() {
  const urlComponents = window.location.pathname.slice(1)
  return urlComponents
    ? urlComponents.split('/').map(component => window.decodeURIComponent(component))
    : ['root']
}

const encodeItemsUrl = (items, from, showContexts) =>
  '/' + (isRoot(items)
    ? ''
    : items.map(item =>
      window.encodeURIComponent(item)).join('/')) +
      (from && from.length > 0
        ? '?from=' + window.encodeURIComponent(from.join('/'))
        : '') +
      (showContexts
        ? ((from && from.length > 0 ? '&' : '?') + 'contexts=true')
        : '')

// declare using traditional function syntax so it is hoisted
function getFromFromUrl() {
  const from = (new URL(document.location)).searchParams.get('from')
  return from
    ? from.split('/')
      .map(item => window.decodeURIComponent(item))
    : null
}

// declare using traditional function syntax so it is hoisted
function decodeUrlContexts() {
  return (new URL(document.location)).searchParams.get('contexts') === 'true'
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

const equalItemRanked = (a, b) =>
  a === b || (a && b && a.key === b.key && a.rank === b.rank)

const equalItemsRanked = (a, b) =>
  a === b || (a && b && a.length === b.length && a.every && a.every((_, i) => equalItemRanked(a[i], b[i])))

/* Returns true if items subset is contained within superset */
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

const strip = html => html.replace(/<(?:.|\n)*?>/gm, '')

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

const flatMap = (list, f) => Array.prototype.concat.apply([], list.map(f))

/** Sums the length of all items in the list of items. */
// works on children with key or context
const sumChildrenLength = children => children.reduce((accum, child) => accum + ('key' in child ? child.key.length : signifier(child.context).length), 0)

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

/* Create a function that takes two values and compares the given key */
const makeCompareByProp = key => (a, b) =>
  a[key] > b[key] ? 1 :
  a[key] < b[key] ? -1 :
  0

const compareByRank = makeCompareByProp('rank')

const splice = (arr, start, deleteCount, ...items) =>
  [].concat(
    arr.slice(0, start),
    items,
    arr.slice(start + deleteCount)
  )

// assert.deepEqual(splice([1,2,3], 1, 1), [1,3])
// assert.deepEqual(splice([1,2,3], 1, 1, 4), [1,4,3])

/* Merge items into a context chain, removing the overlapping signifier */
const chain = (contextChain, itemsRanked) =>
  Array.prototype.concat.apply([], contextChain/*.map(
    chain => chain.length >= 2 ? splice(chain, 1, 1) : ['C']
  )*/)
  .concat(splice(unroot(itemsRanked), 1, 1))

// sorts items emoji and whitespace insensitive
// const sorter = (a, b) =>
//   emojiStrip(a.toString()).trim().toLowerCase() >
//   emojiStrip(b.toString()).trim().toLowerCase() ? 1 : -1

// gets the signifying label of the given context.
// declare using traditional function syntax so it is hoisted
function signifier(items) { return items[items.length - 1] }

// returns true if the signifier of the given context exists in the data
const exists = items => !!store.getState().data[signifier(items)]

// gets the intersections of the given context; i.e. the context without the signifier
const intersections = items => items.slice(0, items.length - 1)

/** Returns a list of unique contexts that the given item is a member of. */
const getContexts = items => {
  const key = signifier(items)
  const cache = {}
  if (!exists(items)) {
    console.error(`getContexts: Unknown key "${key}", from context: ${items.join(',')}`)
    return []
  }
  return (store.getState().data[key].memberOf || [])
    .filter(member => {
      const exists = cache[encodeItems(member.context)]
      cache[encodeItems(member.context)] = true
      // filter out items that exist
      return !exists
    })
}

/** Returns a subset of items from the start to the given item (inclusive) */
const ancestors = (items, item) => items.slice(0, items.indexOf(item) + 1)

/** Returns a subset of items without all ancestors up to the given time (exclusive) */
// const disown = (items, item) => items.slice(items.indexOf(item))

/** Returns a subset of items without all ancestors up to the given time (exclusive) */
const unroot = (items, item) => isRoot(items.slice(0, 1))
  ? items.slice(1)
  : items

/** Returns true if the items or itemsRanked is the root item. */
// declare using traditional function syntax so it is hoisted
function isRoot(items) {
  return items.length === 1 && items[0] && (items[0].key === 'root' || items[0] === 'root')
}

// generates a flat list of all descendants
const getDescendants = (items, recur/*INTERNAL*/) => {
  const children = getChildrenWithRank(items)
  // only append current item in recursive calls
  return (recur ? [signifier(items)] : []).concat(
    flatMap(children, child => getDescendants(items.concat(child.key), true))
  )
}

// generates children with their ranking
// TODO: cache for performance, especially of the app stays read-only
const getChildrenWithRank = (items, data) => {
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
          isMatch: equalArrays(items, member.context || member)
        }
      })
    )
    // filter out non-matches
    .filter(match => match.isMatch)
    // remove isMatch attribute
    .map(({ key, rank}) => ({
      key,
      rank
    }))
    // sort by rank
    .sort(compareByRank)
}

// gets a new rank before the given item in a list but after the previous item
const getRankBefore = (value, context, rank) => {
  const children = getChildrenWithRank(context)
  const i = children.findIndex(child => child.key === value && child.rank === rank)

  const prevChild = children[i - 1]
  const nextChild = children[i]

  const newRank = prevChild
    ? (prevChild.rank + nextChild.rank) / 2
    : nextChild.rank - 1

  return newRank
}


// gets a new rank after the given item in a list but before the following item
const getRankAfter = (value, context, rank) => {
  const children = getChildrenWithRank(context)
  let i = children.findIndex(child => child.key === value && child.rank === rank)

  // quick hack for context view when rank has been supplied as 0
  if (i === -1) {
    i = children.findIndex(child => child.key === value)
  }

  const prevChild = children[i]
  const nextChild = children[i + 1]

  const newRank = nextChild
    ? (prevChild.rank + nextChild.rank) / 2
    : prevChild.rank + 1

  return newRank
}

// gets an items's previous sibling with its rank
const prevSibling = (value, context, rank) => {
  const siblings = getChildrenWithRank(context)
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

// gets a rank that comes before all items in a context
const getPrevRank = (items, data) => {
  const children = getChildrenWithRank(items, data)
  return children.length > 0
    ? children[0].rank - 1
    : 0
}

// gets the next rank at the end of a list
const getNextRank = (items, data) => {
  const children = getChildrenWithRank(items, data)
  return children.length > 0
    ? children[children.length - 1].rank + 1
    : 0
}

const fillRank = items => items.map((item, i) => ({ key: item, rank: i }))
const unrank = items => items.map(child => child.key)

// derived children are all grandchildren of the parents of the given context
// signifier rank is accurate; all other ranks are filled in 0
// const getDerivedChildren = items =>
//   getContexts(items)
//     .filter(member => !isRoot(member))
//     .map(member => fillRank(member.context).concat({
//       key: signifier(items),
//       rank: member.rank
//     }))

/** Returns a new item less the given context. */
const removeContext = (item, context, rank) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return {
      value: item.value,
      memberOf: item.memberOf ? item.memberOf.filter(parent =>
        !(equalArrays(parent.context, context) && (rank == null || parent.rank === rank))
      ) : [],
      lastUpdated: timestamp()
    }
}

// encode the items (and optionally rank) as a string for use in a className
const encodeItems = (items, rank) => items
  .map(item => item ? item.replace(/ /g, '_') : '')
  .join('__SEP__')
  + (rank ? '__SEP__' + rank : '')

/** Returns the editable DOM node of the given items */
const editableNode = itemsRanked => {
  const signifierRank = signifier(itemsRanked).rank
  return document.getElementsByClassName('editable-' + encodeItems(unrank(itemsRanked), signifierRank))[0]
}

// Allow a focus to be set asynchronously on mobile
// See: https://stackoverflow.com/a/45703019/480608
const asyncFocus = (() => {

  // create invisible dummy input to receive the focus
  const fakeInput = document.createElement('input')
  fakeInput.setAttribute('type', 'text')
  fakeInput.style.position = 'absolute'
  fakeInput.style.opacity = 0
  fakeInput.style.height = 0

  // disable auto zoom
  // See: https://stackoverflow.com/questions/2989263/disable-auto-zoom-in-input-text-tag-safari-on-iphone
  fakeInput.style.fontSize = '16px'

  return {
    enable: () => {
      // no need to fake a focus if there already is one
      if (document.activeElement !== document.body) return

      // prepend to body and focus
      document.body.prepend(fakeInput)
      fakeInput.focus()
    },

    cleanup: () => {
      fakeInput.remove()
    }
  }

})()

// allow editable onFocus to be disabled temporarily
// this allows the selection to be re-applied after the onFocus event changes without entering an infinite focus loop
// this would not be a problem if the node was not re-rendered on state change
let disableOnFocus = false

// restores the selection to a given editable item
// and then dispatches setCursor
const restoreSelection = (itemsRanked, offset) => {

  const items = unrank(itemsRanked)

  // only re-apply the selection the first time
  if (!disableOnFocus) {

    disableOnFocus = true

    // use current focusOffset if not provided as a parameter
    let focusOffset = offset != null
      ? offset
      : window.getSelection().focusOffset

    store.dispatch({ type: 'setCursor', itemsRanked })

    // re-apply selection
    setTimeout(() => {

      // wait until this "artificial" focus event fires before re-enabling onFocus
      setTimeout(() => {
        disableOnFocus = false
      }, 0)

      // re-apply the selection
      const el = editableNode(itemsRanked)
      if (!el) {
        console.error(`restoreSelection: Could not find element "editable-${encodeItems(items, signifier(itemsRanked).rank)}"`)
        return
        // throw new Error(`Could not find element: "editable-${encodeItems(items)}"`)
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

/* Update the distance-from-cursor classes for all given elements (children or children-new) */
const autofocus = (els, items, enableAutofocusHelper) => {

  const baseDepth = decodeItemsUrl().length
  let autofocusHelperHiddenItems = []
  for (let i=0; i<els.length; i++) {

    const el = els[i]
    const hasDepth = el.hasAttribute('data-items-length')
    const firstChild = !hasDepth ? el.querySelector('.children') : null

    // if it does not have the attribute data-items-length, use first child's - 1
    // this is for the contexts view (see Children component)
    if (!hasDepth && !firstChild) return // skip missing children
    const depth = hasDepth
      ? +el.getAttribute('data-items-length')
      : +firstChild.getAttribute('data-items-length') - 1

    const distance = Math.max(0,
      Math.min(MAX_DISTANCE_FROM_CURSOR,
        items.length - depth - baseDepth
      )
    )

    // add class if it doesn't already have it
    if (!el.classList.contains('distance-from-cursor-' + distance)) {

      el.classList.remove('distance-from-cursor-0', 'distance-from-cursor-1', 'distance-from-cursor-2', 'distance-from-cursor-3')
      el.classList.add('distance-from-cursor-' + distance)

      if (distance >= 2 && enableAutofocusHelper) {
        autofocusHelperHiddenItems = autofocusHelperHiddenItems.concat(Array.prototype.map.call(el.children, child => child.firstChild.textContent))
      }
    }
  }

  // autofocus helper
  if (enableAutofocusHelper) {
    clearTimeout(autofocusHelperTimeout)
    autofocusHelperTimeout = setTimeout(() => {
      if (enableAutofocusHelper && autofocusHelperHiddenItems.length > 0 && canShowHelper('autofocus')) {
        store.dispatch({ type: 'showHelperIcon', id: 'autofocus', data: autofocusHelperHiddenItems })
      }
    }, HELPER_AUTOFOCUS_DELAY)
  }
}

const removeAutofocus = els => {
  clearTimeout(autofocusHelperTimeout)
  for (let i=0; i<els.length; i++) {
    els[i].classList.remove('distance-from-cursor-0', 'distance-from-cursor-1', 'distance-from-cursor-2', 'distance-from-cursor-3')
  }
}

// declare using traditional function syntax so it is hoisted
function canShowHelper(id, state=store ? store.getState() : null) {
  return state &&
    (!state.showHelper || state.showHelper === id) &&
    !state.helpers[id].complete &&
    state.helpers[id].hideuntil < Date.now()
}

// render a list of items as a sentence
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

/* Move the cursor up one level and update the autofocus */
const cursorBack = () => {
  const cursorOld = store.getState().cursor
  if (cursorOld) {
    const cursorNew = intersections(cursorOld)

    store.dispatch({ type: 'setCursor', itemsRanked: cursorNew.length > 0 ? cursorNew : null })

    // append to cursor history to allow 'forward' gesture
    store.dispatch({ type: 'cursorHistory', cursor: cursorOld })

    if (cursorNew.length) {
      restoreSelection(cursorNew, 0)
    }
    else {
      document.activeElement.blur()
      document.getSelection().removeAllRanges()
    }
  }
}

const cursorForward = () => {
  const state = store.getState()

  // pop from cursor history
  if (state.cursorHistory.length > 0) {
    const cursorNew = state.cursorHistory[state.cursorHistory.length - 1]
    store.dispatch({ type: 'setCursor', itemsRanked: cursorNew, cursorHistoryPop: true })

    if (state.cursor) {
      restoreSelection(cursorNew, 0)
    }
  }
  // otherwise move cursor to first child
  else {
    const cursorOld = state.cursor
    const firstChild = getChildrenWithRank(unrank(cursorOld))[0]
    if (firstChild) {
      const cursorNew = cursorOld.concat(firstChild)
      store.dispatch({ type: 'setCursor', itemsRanked: cursorNew })

      if (state.cursor) {
        restoreSelection(cursorNew, 0)
      }
    }
  }
}

/* Position the content so the cursor is in the top 33% of the viewport */
const scrollContentIntoView = (scrollBehavior='smooth') => {
  const cursor = store.getState().cursor
  const contentEl = document.getElementById('content')

  if (cursor && cursor.length > 1) {

    const visibleEl = editableNode(cursor)

    if (visibleEl) {

      const existingScroll = contentEl.style.transform
        ? +contentEl.style.transform.slice(18, contentEl.style.transform.indexOf('px', 18))
        : 0
      const elY = visibleEl.getBoundingClientRect().y // relative to viewport
      const extraScrollY = Math.max(0, elY - window.innerHeight/3 + existingScroll) // 33% of window height
      contentEl.style.transform = `translate3d(0, -${extraScrollY}px, 0)`
      contentEl.style.marginBottom = `-${extraScrollY}px`

    }
  }
  else {
    contentEl.style.transform = `translate3d(0, 0, 0)`
    contentEl.style.marginBottom = `0`
  }
}

const resetScrollContentIntoView = () => {
  const contentEl = document.getElementById('content')
  contentEl.style.transform = `translate3d(0,0,0)`
  contentEl.style.marginBottom = `0`
}

/* Adds a new item to the cursor */
const newItem = ({ showContexts, insertNewChild, insertBefore } = {}) => {

  const dispatch = store.dispatch
  const state = store.getState()
  const items = unrank(state.cursor)
  const rank = signifier(state.cursor).rank
  const context = showContexts && items.length > 2 ? intersections(intersections(items))
    : !showContexts && items.length > 1 ? intersections(items)
    : ['root']

  // use the live-edited value
  // const itemsLive = showContexts
  //   ? intersections(intersections(items)).concat().concat(signifier(items))
  //   : items
  // const itemsRankedLive = showContexts
  //   ? intersections(intersections(state.cursor).concat({ key: innerTextRef, rank })).concat(signifier(state.cursor))
  //   : state.cursor

  // if shift key is pressed, add a child instead of a sibling
  const newRank = insertNewChild
    ? (insertBefore ? getPrevRank : getNextRank)(items)
    : (insertBefore ? getRankBefore : getRankAfter)(signifier(items), context, rank)

  // TODO: Add to the new '' context

  dispatch({
    type: 'newItemSubmit',
    context: insertNewChild ? items : context,
    rank: newRank,
    value: ''
  })

  asyncFocus.enable()

  disableOnFocus = true
  setTimeout(() => {
    // track the transcendental identifier if editing
    disableOnFocus = false
    restoreSelection((insertNewChild ? state.cursor : intersections(state.cursor)).concat({ key: '', rank: newRank }))
    setTimeout(asyncFocus.cleanup)
  }, RENDER_DELAY)

  // newItem helper
  if(canShowHelper('newItem') && !insertNewChild && Object.keys(store.getState().data).length > 1) {
    dispatch({ type: 'showHelperIcon', id: 'newItem', data: {
      itemsRanked: intersections(state.cursor).concat({ key: '', rank: newRank })
    }})
  }
  // newChildSuccess helper
  else if (canShowHelper('newChildSuccess') && insertNewChild) {
    dispatch({ type: 'showHelperIcon', id: 'newChildSuccess', data: {
      itemsRanked: state.cursor.concat({ key: '', rank: newRank })
    }})
  }
}

const handleGesture = gesture => {
  const shortcut = globalShortcuts.find(shortcut => shortcut.gesture && shortcut.gesture === gesture)
  if (shortcut) {
    shortcut.exec()
  }
}

const handleKeyboard = e => {
  const shortcut = globalShortcuts.find(shortcut =>
    shortcut.keyboard &&
    (shortcut.keyboard.key || shortcut.keyboard) === e.key &&
    (!shortcut.keyboard.meta || e.metaKey) &&
    (!shortcut.keyboard.shift || e.shiftKey)
  )
  if (shortcut) {
    e.preventDefault()
    shortcut.exec()
  }
}

// restore cursor to its position before search
const restoreCursorBeforeSearch = () => {
  const cursor = store.getState().cursor
  if (cursor) {
    store.dispatch({ type: 'setCursor', itemsRanked: cursor })
    setTimeout(() => {
      restoreSelection(cursor, 0)
      autofocus(document.querySelectorAll('.children'), cursor)
      autofocus(document.querySelectorAll('.children-new'), cursor)
    }, RENDER_DELAY)
  }
}

/* Map global keyboard shortcuts and gestures to commands */
const globalShortcuts = [
  {
    name: 'Cursor Back',
    gesture: 'r',
    keyboard: 'Escape',
    exec: () => {
      const state = store.getState()
      if (state.search != null) {
        store.dispatch({ type: 'search', value: null })
        restoreCursorBeforeSearch()
      }
      else if (state.cursor) {
        cursorBack()
      }
    }
  },
  {
    name: 'Cursor Forward',
    gesture: 'l',
    exec: cursorForward
  },
  {
    name: 'New Item in Context',
    gesture: 'rd',
    exec: () => newItem({ insertNewChild: true })
  },
  {
    name: 'Toggle Context View',
    gesture: 'ru',
    keyboard: { key: 'c', shift: true, meta: true },
    exec: () => store.dispatch({ type: 'toggleContextView' })
  },
  {
    name: 'Focus First',
    keyboard: 'ArrowDown',
    exec: () => {
      if (!store.getState().cursor) {
        const firstEditable = document.querySelector('.editable')
        if (firstEditable) {
          firstEditable.focus()
        }
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
  }
]

/**************************************************************
 * Reducer
 **************************************************************/

const appReducer = (state = initialState(), action) => {
  // console.info('ACTION', action)
  return Object.assign({}, state, (({

    status: ({ value }) => ({
      status: value
    }),

    authenticate: ({ value, user, userRef }) => {

      // autologin is set to true in separate 'settings' action to set localStorage
      return {
        // assume firebase is connected and return to connected state
        status: value ? 'authenticated' : 'connected',
        user,
        userRef
      }
    },

    // SIDE EFFECTS: localStorage, scroll
    clear: () => {
      window.scrollTo({ top: 0 })
      localStorage.clear()
      return initialState()
    },

    // force re-render
    render: ({ dataNonce }) => ({
      dataNonce: ++dataNonce
    }),

    data: ({ item, forceRender }) => ({
      data: item ? Object.assign({}, state.data, {
        [item.value]: item,
      }) : state.data,
      lastUpdated: timestamp(),
      dataNonce: state.dataNonce + (forceRender ? 1 : 0)
    }),

    // SIDE EFFECTS: localStorage
    delete: ({ value, forceRender }) => {

      delete state.data[value]
      localStorage.removeItem('data-' + value)
      localStorage.lastUpdated = timestamp()

      return {
        data: Object.assign({}, state.data),
        lastUpdated: timestamp(),
        dataNonce: state.dataNonce + (forceRender ? 1 : 0)
      }
    },

    // SIDE EFFECTS: removeAutofocus, window.history
    navigate: ({ to, from, history, replace, showContexts }) => {
      if (equalArrays(state.focus, to) && equalArrays([].concat(getFromFromUrl()), [].concat(from)) && decodeUrlContexts() === state.showContexts) return state
      if (history !== false) {
        window.history[replace ? 'replaceState' : 'pushState'](
          state.focus,
          '',
          encodeItemsUrl(to, from, showContexts)
        )
      }

      setTimeout(() => {
        removeAutofocus(document.querySelectorAll('.children,.children-new'))
        window.scrollTo({ top: 0 })
        resetScrollContentIntoView()
      })

      return {
        cursor: [],
        cursorBeforeEdit: [],
        focus: to,
        from: from,
        showContexts,
        showHelper: null,
        // remove helper icon for contextual helpers
        showHelperIcon: state.helperData ? null : state.showHelperIcon
      }
    },

    // SIDE EFFECTS: sync
    // addAsContext adds the given context to the new item
    newItemSubmit: ({ value, context, addAsContext, rank }) => {

      // create item if non-existent
      const item = value in state.data
        ? state.data[value]
        : {
          id: value,
          value: value,
          memberOf: []
        }

      // add to context
      if (!addAsContext) {
        item.memberOf.push({
          context,
          rank
        })
      }

      // get around requirement that reducers cannot dispatch actions
      setTimeout(() => {

        sync(value, {
          value: item.value,
          memberOf: item.memberOf,
          lastUpdated: timestamp()
        }, null, true)
      }, RENDER_DELAY)

      // if adding as the context of an existing item
      if (addAsContext) {
        const itemChildOld = state.data[signifier(context)]
        const itemChildNew = Object.assign({}, itemChildOld, {
          memberOf: itemChildOld.memberOf.concat({
            context: [value],
            rank: getNextRank(context, state.data)
          }),
          lastUpdated: timestamp()
        })

        setTimeout(() => {
          sync(itemChildNew.value, itemChildNew, null, true)
        }, RENDER_DELAY)
      }

      return {}
    },

    // SIDE EFFECTS: autofocus
    // set both cursorBeforeEdit (the transcendental signifier) and cursor (the live value during editing)
    // the other contexts superscript uses cursor when it is available
    setCursor: ({ itemsRanked, cursorHistoryClear, cursorHistoryPop }) => {

      if (equalItemsRanked(itemsRanked, state.cursor)) return {}

      clearTimeout(newChildHelperTimeout)
      clearTimeout(superscriptHelperTimeout)

      // if the cursor is being removed, remove the autofocus as well
      setTimeout(() => {
        if (itemsRanked) {
          autofocus(document.querySelectorAll('.children'), itemsRanked)
          autofocus(document.querySelectorAll('.children-new'), itemsRanked)
        }
        else {
          removeAutofocus(document.querySelectorAll('.children,.children-new'))
        }
        scrollContentIntoView()
      })

      return {
        cursor: itemsRanked,
        cursorBeforeEdit: itemsRanked,
        cursorHistory: cursorHistoryClear ? [] :
          cursorHistoryPop ? state.cursorHistory.slice(0, state.cursorHistory.length - 1)
          : state.cursorHistory
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

    // SIDE EFFECTS: localStorage
    existingItemChange: ({ oldValue, newValue, context, showContexts, rank }) => {

      // items may exist for both the old value and the new value
      const itemOld = state.data[oldValue]
      const itemCollision = state.data[newValue]
      const items = unroot(context).concat(oldValue)
      const itemsNew = unroot(context).concat(newValue)

      // replace the old value with the new value in the cursor
      const itemEditing = state.cursor[unroot(context).length]
      const cursorNew = itemEditing.key === oldValue && itemEditing.rank === rank
        ? splice(state.cursor, unroot(context).length, 1, {
          key: newValue,
          rank: itemEditing.rank
        })
        : state.cursor

      // the old item less the context
      const newOldItem = (itemOld.memberOf && itemOld.memberOf.length > 1) || showContexts
        ? removeContext(itemOld, context, rank)
        : null

      const itemNew = {
        value: newValue,
        memberOf: (itemCollision ? itemCollision.memberOf || [] : []).concat(context && context.length ? {
          context,
          rank // TODO: Add getNextRank(itemCollision.memberOf) ?
        } : []),
        lastUpdated: timestamp()
      }

      // update local data so that we do not have to wait for firebase
      state.data[newValue] = itemNew
      if (newOldItem) {
        state.data[oldValue] = newOldItem
      }
      else {
        delete state.data[oldValue]
      }

      setTimeout(() => {
        localStorage['data-' + newValue] = JSON.stringify(itemNew)
        if (newOldItem) {
          localStorage['data-' + oldValue] = JSON.stringify(newOldItem)
        }
        else {
          localStorage.removeItem('data-' + oldValue)
        }
      })

      // recursive function to change item within the context of all descendants
      // the inheritance is the list of additional ancestors built up in recursive calls that must be concatenated to itemsNew to get the proper context
      const recursiveUpdates = (items, inheritance=[]) => {

        return getChildrenWithRank(items, state.data).reduce((accum, child) => {
          const childItem = state.data[child.key]

          // remove and add the new context of the child
          const childNew = removeContext(childItem, items, child.rank)
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
              ['data/data-' + child.key]: childNew
            },
            recursiveUpdates(items.concat(child.key), inheritance.concat(child.key))
          )
        }, {})
      }

      const updates = Object.assign(
        {
          ['data/data-' + firebaseEncode(oldValue)]: newOldItem,
          ['data/data-' + firebaseEncode(newValue)]: itemNew
        },
        // RECURSIVE
        recursiveUpdates(items)
      )

      setTimeout(() => {
        syncUpdates(updates)
      })

      return Object.assign(
        {
          data: state.data,
          // update cursor so that the other contexts superscript and depth-bar will re-render
          // do not update cursor as that serves as the transcendental signifier to identify the item being edited
          cursor: cursorNew
        },
        canShowHelper('editIdentum', state) && itemOld.memberOf && itemOld.memberOf.length > 1 && newOldItem.memberOf.length > 0 && !equalArrays(context, newOldItem.memberOf[0].context) ? {
          showHelperIcon: 'editIdentum',
          helperData: {
            oldValue,
            newValue,
            context,
            rank,
            oldContext: newOldItem.memberOf[0].context
          }
        } : {}
      )
    },

    // SIDE EFFECTS: localStorage
    existingItemDelete: ({ items, rank, showContexts }) => {

      const value = signifier(items)
      const item = state.data[value]

      // if showContexts, ignore the rank since it is a fake value
      const newItem = item.memberOf.length > 1
        ? removeContext(item, items.length > 1 ? intersections(items) : ['root'], showContexts ? null : rank)
        : null

      // update local data so that we do not have to wait for firebase
      if (newItem) {
        state.data[value] = newItem
      }
      else {
        delete state.data[value]
      }

      setTimeout(() => {
        if (newItem) {
          localStorage['data-' + value] = JSON.stringify(newItem)
        }
        else {
          localStorage.removeItem('data-' + value)
        }
      })

      // if removing an item from a context via the context view and the context has no more children, delete the context
      let emptyContextDelete = {}
      if(showContexts && getChildrenWithRank(intersections(items), state.data).length === 0) {
        const emptyContextValue = signifier(intersections(items))
        delete state.data[emptyContextValue]
        localStorage.removeItem('data-' + emptyContextValue)
        emptyContextDelete = {
          ['data/data-' + firebaseEncode(emptyContextValue)]: null
        }
      }

      // generates a firebase update object deleting the item and deleting/updating all descendants
      const recursiveDeletes = items => {
        return getChildrenWithRank(items, state.data).reduce((accum, child) => {
          const childItem = state.data[child.key]
          const childNew = childItem.memberOf.length > 1
            // update child with deleted context removed
            ? removeContext(childItem, items, child.rank)
            // if this was the only context of the child, delete the child
            : null

          // update local data so that we do not have to wait for firebase
          state.data[child.key] = childNew
          setTimeout(() => {
            if (childNew) {
              localStorage['data-' + child.key] = JSON.stringify(childNew)
            }
            else {
              localStorage.removeItem('data-' + child.key)
            }
          })

          return Object.assign(accum,
            { ['data/data-' + firebaseEncode(child.key)]: childNew }, // direct child
            recursiveDeletes(items.concat(child.key)) // RECURSIVE
          )
        }, {})
      }

      const updates = Object.assign({
        ['data/data-' + firebaseEncode(value)]: newItem
      }, newItem ? recursiveDeletes(items) : null, emptyContextDelete)

      setTimeout(() => {
        syncUpdates(updates)
      })

      return {
        data: Object.assign({}, state.data),
        dataNonce: state.dataNonce + 1
      }
    },

    codeChange: ({ itemsRanked, newValue }) => {

      const value = signifier(itemsRanked).key
      const oldItem = state.data[value]
      const newItem = Object.assign({}, oldItem, {
        code: newValue
      })

      state.data[value] = newItem

      setTimeout(() => {
        localStorage['data-' + value] = JSON.stringify(newItem)
        syncUpdates({
          ['data/data-' + firebaseEncode(value)]: newItem
        })
      })

      return {
        data: Object.assign({}, state.data)
      }
    },

    // SIDE EFFECTS: localStorage
    settings: ({ key, value }) => {
      // TODO: Sync to firebase?
      localStorage['settings-' + key] = value
      return {
        settings: Object.assign({}, state.settings, { [key]: value })
      }
    },

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

      if (state.cursor && state.editing) {
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

    toggleContextView: () => {

      const encoded = encodeItems(unrank(state.cursor))
      let newContextViews = Object.assign({}, state.contextViews)


      if (encoded in state.contextViews) {
        delete newContextViews[encoded]
      }
      else {
        Object.assign(newContextViews, {
          [encoded]: true
        })
      }

      return {
        contextViews: newContextViews
      }
    },

    toggleCodeView: () => ({
      codeView: equalItemsRanked(state.cursor, state.codeView) ? null : state.cursor
    }),

    search: ({ value }) => ({
      search: value
    }),

    cursorBeforeSearch: ({ value }) => ({
      cursorBeforeSearch: value
    }),

  })[action.type] || (() => state))(action))
}

const store = createStore(appReducer)


/**************************************************************
 * LocalStorage && Firebase Setup
 **************************************************************/

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
  connectedRef.on('value', snap => {
    const connected = snap.val()
    const status = store.getState().status

    // either connect with authenticated user or go to connected state until they login
    if (connected) {

      // once connected, disable offline mode timer
      window.clearTimeout(offlineTimer)

      if (firebase.auth().currentUser) {
        userAuthenticated(firebase.auth().currentUser)
        syncUpdates()
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
  store.dispatch({ type: 'navigate', to: ['root'] })
  window.firebase.auth().signOut()
}

const login = () => {
  const firebase = window.firebase
  const provider = new firebase.auth.GoogleAuthProvider();
  store.dispatch({ type: 'status', value: 'connecting' })
  firebase.auth().signInWithRedirect(provider)
}

// update local state with newly authenticated user
function userAuthenticated(user) {

  const firebase = window.firebase

  // once authenticated, disable offline mode timer
  window.clearTimeout(offlineTimer)

  // save the user ref and uid into state
  const userRef = firebase.database().ref('users/' + user.uid)

  store.dispatch({ type: 'authenticate', value: true, userRef, user })

  // once authenticated, login automatically on page load
  store.dispatch({ type: 'settings', key: 'autologin', value: true })

  // update user information
  userRef.update({
    name: user.displayName,
    email: user.email
  })

  // load Firebase data
  userRef.on('value', snapshot => {
    const value = snapshot.val()

    // init root if it does not exist (i.e. local == false)
    if (!value.data || !value.data['data-root']) {
      sync('root')
    }
    // otherwise sync all data locally
    else {
      fetch(value.data, value.lastUpdated)
    }
  })
}

// save data to state, localStorage, and Firebase
const sync = (key, item={}, localOnly, forceRender, callback) => {

  const lastUpdated = timestamp()
  const timestampedItem = Object.assign({}, item, { lastUpdated })

  // state
  store.dispatch({ type: 'data', item: timestampedItem, forceRender })

  // localStorage
  localStorage['data-' + key] = JSON.stringify(timestampedItem)
  localStorage.lastUpdated = lastUpdated

  // firebase
  if (!localOnly) {
    syncUpdates({
      ['data/data-' + firebaseEncode(key)]: timestampedItem,
      lastUpdated
    }, callback)
  }

}

// save all firebase data to state and localStorage
const fetch = (data, lastUpdated) => {

  const state = store.getState()

  for (let key in data) {
    const item = data[key]
    const oldItem = state.data[firebaseDecode(key).slice(5)]

    if (!oldItem || item.lastUpdated > oldItem.lastUpdated) {
      // do not force render here, but after all values have been added
      store.dispatch({ type: 'data', item })
      localStorage[firebaseDecode(key)] = JSON.stringify(item)
    }
  }

  // delete local data that no longer exists in firebase
  // only if remote was updated more recently than local
  if (state.lastUpdated <= lastUpdated) {
    for (let value in state.data) {
      if (!(('data-' + firebaseEncode(value)) in data)) {
        // do not force render here, but after all values have been deleted
        store.dispatch({ type: 'delete', value })
      }
    }
  }

  // re-render after everything has been updated
  // only if there is no cursor, otherwise it interferes with editing
  if (!state.cursor) {
    store.dispatch({ type: 'render' })
  }
}

// add remote updates to a local queue so they can be resumed after a disconnect
const syncUpdates = (updates = {}, callback) => {
  const state = store.getState()
  const queue = Object.assign(JSON.parse(localStorage.queue || '{}'), updates)

  // if authenticated, execute all updates
  // otherwise, queue thnem up
  if (state.userRef) {
    state.userRef.update(queue, (...args) => {
      localStorage.queue = '{}'
      if (callback) {
        callback(...args)
      }
    })
  }
  else {
    localStorage.queue = JSON.stringify(queue)
    if (callback) {
      callback()
    }
  }
}


/**************************************************************
 * Window Init
 **************************************************************/

window.addEventListener('popstate', () => {
  store.dispatch({
    type: 'navigate',
    to: decodeItemsUrl(),
    from: getFromFromUrl(),
    showContexts: decodeUrlContexts(),
    history: false
  })
})

if (canShowHelper('superscriptSuggestor')) {
  const interval = setInterval(() => {
    const data = store.getState().data
    const rootChildren = Object.keys(data).filter(key =>
      data[key] &&
      data[key].memberOf &&
      data[key].memberOf.length > 0 &&
      data[key].memberOf[0].context.length === 1 &&
      data[key].memberOf[0].context[0] === 'root'
    )
    if (
      // no identums
      Object.keys(data).every(key => !data[key].memberOf || data[key].memberOf.length <= 1) &&
      // at least two contexts in the root
      Object.keys(data).filter(key =>
        data[key].memberOf &&
        data[key].memberOf.length > 0 &&
        data[key].memberOf[0].context.length === 1 &&
        rootChildren.includes(data[key].memberOf[0].context[0])
      ).length >= 2
    ) {
      clearInterval(interval)
      store.dispatch({ type: 'showHelperIcon', id: 'superscriptSuggestor' })
    }
  }, HELPER_SUPERSCRIPT_SUGGESTOR_DELAY)
}

if (canShowHelper('depthBar')) {
  store.dispatch({ type: 'showHelperIcon', id: 'depthBar' })
}

// let disableScrollContent

// desktop only in case it improves performance
if (!isMobile) {

  window.addEventListener('keydown', handleKeyboard)

  // not smooth enough
  // window.addEventListener('scroll', e => {
  //   if (!disableScrollContent) {
  //     scrollContentIntoView('auto')
  //   }
  // })

}


/**************************************************************
 * Components
 **************************************************************/

const AppComponent = connect(({ dataNonce, focus, from, search, showContexts, user, settings }) => ({ dataNonce,
  focus,
  from,
  search,
  showContexts,
  user,
  dark: settings.dark
}))((
    { dataNonce, focus, from, search, showContexts, user, dark, dispatch }) => {

  const directChildren = getChildrenWithRank(focus)

  return <div ref={() => {
    document.body.classList[dark ? 'add' : 'remove']('dark')
  }} onTouchMove={() => dragging = true} onTouchEnd={() => dragging = false} className={
    'container' +
    // mobile safari must be detected because empty and full bullet points in Helvetica Neue have different margins
    (isMobile ? ' mobile' : '') +
    (/Chrome/.test(navigator.userAgent) ? ' chrome' : '') +
    (/Safari/.test(navigator.userAgent) ? ' safari' : '')
  }><MultiGesture onEnd={handleGesture}>

    <Helper id='welcome' title='Welcome to em' className='welcome' center>
      <p><HomeLink inline /> is a tool that helps you become more aware of your own thinking process.</p>
      <p>The features of <HomeLink inline /> mirror the features of your mind—from the interconnectedness of ideas, to multiple contexts, to focus, and more.</p>
    </Helper>

    <header>
      <div className='header-container'>
        <HomeLink />
        <Status />
      </div>
    </header>

    <div id='content' className={'content' + (from ? ' from' : '')} onClick={() => {
      // remove the cursor if the click goes all the way through to the content
      // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
      if (!disableOnFocus) {
        const showHelper = store.getState().showHelper
        if (showHelper) {
          dispatch({ type: 'helperRemindMeLater', showHelper, HELPER_CLOSE_DURATION })
        }
        else {
          cursorBack()
          dispatch({ type: 'expandContextItem', items: null })
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
              <Subheading itemsRanked={fillRank(focus)} />
              <div className='subheading-caption dim'>appears in these contexts:</div>
            </div> : null}
            <Children
              focus={focus}
              itemsRanked={fillRank(focus)}
              subheadingItems={unroot(focus)}
              expandable={true}
              showContexts={true}
            />
            <NewItem context={focus} showContexts={showContexts} />
          </div>

          // items (non-context view)
          : (() => {

            const items = focus

            const children = (directChildren.length > 0
              ? directChildren
              : getChildrenWithRank(items)
            )//.sort(sorter)

            // get a flat list of all grandchildren to determine if there is enough space to expand
            // const grandchildren = flatMap(children, child => getChildren(items.concat(child)))

            return <div
              // embed items so that autofocus can limit scope to one subheading
              data-items={encodeItems(items)}
            >
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

              {search != null ? <Search /> : <div>
                <Children
                  focus={focus}
                  itemsRanked={fillRank(focus)}
                  subheadingItems={unroot(items)}
                  expandable={true}
                />

                { /* New Item */ }
                {children.length > 0 ? <NewItem context={items} /> : null}
              </div>}

            </div>
          })()
        }
      </div>
    </div>

    <Footer />

    <HelperIcon />

  </MultiGesture></div>
})

const Footer = connect(({ status, settings, user }) => ({ status, settings, user }))(({ status, settings, user, dispatch }) =>
  <ul className='footer list-none' onClick={() => {
    // remove the cursor when the footer is clicked (the other main area besides .content)
    cursorBack()
  }}>
    <li>
      <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ className='settings-dark' onClick={() => dispatch({ type: 'settings', key: 'dark', value: !settings.dark })}>Dark Mode</a>
      <span> | </span>
      {window.firebase ? <span>
        {status === 'offline' || status === 'disconnected' || status === 'connected' ? <a tabIndex='-1' className='settings-logout' onClick={login}>Log In</a>
        : <a tabIndex='-1' className='settings-logout' onClick={logout}>Log Out</a>
        }
      </span> : null}
    </li><br/>
    <li><span className='dim'>Version: </span>{pkg.version}</li>
    {user ? <li><span className='dim'>Logged in as: </span>{user.email}</li> : null}
    {user ? <li><span className='dim'>User ID: </span><span className='mono'>{user.uid}</span></li> : null}
    <li><span className='dim'>Support: </span><a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ className='support-link' href='mailto:raine@clarityofheart.com'>raine@clarityofheart.com</a></li>
  </ul>
)

const Status = connect(({ status, settings }) => ({ status, settings }))(({ status, settings }) =>
  settings.autologin ? <div className='status'>
    {status === 'disconnected' || status === 'connecting' ? <span>Connecting...</span> : null}
    {status === 'offline' ? <span className='error'>Offline</span> : null}
  </div> : null
)

const HomeLink = connect(({ settings, focus, showHelper }) => ({
  dark: settings.dark,
  focus: focus,
  showHelper
}))(({ dark, focus, showHelper, inline, dispatch }) =>
  <span className='home'>
    <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ href='/' onClick={e => {
      e.preventDefault()
      dispatch({ type: 'navigate', to: ['root'] })
    }}><span role='img' arial-label='home'><img className='logo' src={inline ? (dark ? logoDarkInline : logoInline) : (dark ? logoDark : logo)} alt='em' width='24' /></span></a>
    {showHelper === 'home' ? <Helper id='home' title='Tap the "em" icon to return to the home context' arrow='arrow arrow-top arrow-topleft' /> : null}
  </span>
)

const Subheading = ({ itemsRanked, showContexts }) => {
  const items = unrank(itemsRanked)
  return <div className='subheading'>
    {items.map((item, i) => {
      const subitems = ancestors(items, item)
      return <span key={i} className={item === signifier(items) && !showContexts ? 'subheading-focus' : ''}>
        <Link items={subitems} />
        <Superscript itemsRanked={fillRank(subitems)} />
        {i < items.length - 1 || showContexts ? <span> + </span> : null}
      </span>
    })}
    {showContexts ? <span> </span> : null}
  </div>
}

/** A recursive child element that consists of a <li> containing an <h3> and <ul> */
// subheadingItems passed to Editable to constrain autofocus
// cannot use itemsLive here else Editable gets re-rendered during editing
const Child = connect(({ cursor, expandedContextItem, codeView }, props) => {
  return { cursor, expandedContextItem, isCodeView: cursor && equalItemsRanked(codeView, props.itemsRanked)   }
})(({ expandedContextItem, isCodeView, focus, cursor=[], itemsRanked, rank, contextChain, subheadingItems, childrenForced, showContexts, depth=0, count=0, dispatch }) => {

  const children = childrenForced || getChildrenWithRank(unrank(itemsRanked))

  // if rendering as a context and the item is the root, render home icon instead of Editable
  const homeContext = showContexts && isRoot([signifier(intersections(itemsRanked))])

  // prevent fading out cursor parent
  const isCursorParent = equalItemsRanked(intersections(cursor || []), itemsRanked)

  const item = store.getState().data[signifier(itemsRanked).key]

  return <li className={
    'child' +
    (children.length === 0 ? ' leaf' : '')
    // used so that the autofocus can properly highlight the immediate parent of the cursor
    + (isCursorParent ? ' cursor-parent' : '')
    + (isCodeView ? ' code-view' : '')
  }>
    <h3 className='child-heading' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>

      {equalItemsRanked(itemsRanked, expandedContextItem) && itemsRanked.length > 2 ? <Subheading itemsRanked={intersections(intersections(itemsRanked))} showContexts={showContexts} />
        : showContexts && itemsRanked.length > 2 ? <span className='ellipsis'><a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => {
          dispatch({ type: 'expandContextItem', itemsRanked })
        }}>... </a></span>
        : null}

      {homeContext
        ? <HomeLink/>
        : <Editable focus={focus} itemsRanked={itemsRanked} subheadingItems={subheadingItems} contextChain={contextChain} showContexts={showContexts} />}

      <Superscript itemsRanked={itemsRanked} showContexts={showContexts} />
    </h3>

    {isCodeView ? <code>
      <ContentEditable
        html={item && item.code ? item.code : ''}
        onChange={e => {
          // NOTE: When Child components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
          const newValue = e.target.value
            .replace(/&nbsp;/g, '')
            .replace(/^(<br>)+|(<br>)+$/g, '')

          // const item = store.getState().data[newValue]
            // if (item) {
          dispatch({ type: 'codeChange', itemsRanked, newValue })
          // }
        }}
      />
    </code> : null}

    { /* Recursive Children */ }
    <Children
      focus={focus}
      itemsRanked={itemsRanked}
      subheadingItems={subheadingItems}
      childrenForced={childrenForced}
      count={count}
      depth={depth}
      contextChain={contextChain}
    />
  </li>
})

/*
  @focus: needed for Editable to determine where to restore the selection after delete
  @subheadingItems: needed for Editable to constrain autofocus
*/
const Children = connect(({ cursorBeforeEdit, contextViews, data }, props) => {

  // resolve items that are part of a context chain (i.e. some parts of items expanded in context view) to match against cursor subset
  const itemsResolved = props.contextChain && props.contextChain.length > 0
    ? Array.prototype.concat.apply([], props.contextChain/*.map(
        chain => chain.length >= 2 ? splice(chain, 1, 1) : ['C']
      )*/)
      .concat(splice(unroot(props.itemsRanked), 1, 1))
    : unroot(props.itemsRanked)

  const value = signifier(props.itemsRanked).key
  const item = data[value]

  return {
    item,
    isEditing: subsetItems(cursorBeforeEdit, itemsResolved),
    contextViews
  }
})(({ item, isEditing, contextViews, focus, itemsRanked, contextChain=[], subheadingItems, childrenForced, expandable, showContexts, count=0, depth=0 }) => {

  showContexts = showContexts || contextViews[encodeItems(unrank(itemsRanked))]

  const data = store.getState().data
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
        find: predicate => fillRank(Object.keys(data).filter(predicate)),
        findOne: predicate => Object.keys(data).find(predicate),
        home: () => getChildrenWithRank(['root']),
        itemInContext: getChildrenWithRank,
        item: Object.assign({}, item, {
          children: () => getChildrenWithRank(unrank(itemsRanked))
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

  const children = childrenForced ? childrenForced :
    codeResults && codeResults.length && codeResults[0] && codeResults[0].key ? codeResults :
    showContexts ? getContexts(unrank(itemsRanked))
      // sort
      .sort(makeCompareByProp('context'))
      // generate dynamic ranks
      .map((item, i) => ({
        context: item.context,
        rank: i
      }))
    : getChildrenWithRank(unrank(itemsRanked))

  if(!((isRoot(itemsRanked) || isEditing || expandable) &&
    children.length > 0 &&
    count + sumChildrenLength(children) <= NESTING_CHAR_MAX)) return null

  // embed data-items-length so that distance-from-cursor can be set on each ul when there is a new cursor location (autofocus)
  // unroot items so ['root'] is not counted as 1
  return <ul
      // data-items={showContexts ? encodeItems(unroot(unrank(itemsRanked))) : null}
      // when in the showContexts view, autofocus will look at the first child's data-items-length and subtract 1
      // this is because, unlike with normal items, each Context as Item has a different path and thus different items.length
      data-items-length={showContexts ? null : contextChain.reduce((accum, cur) => accum + cur.length - 1, 0) + unroot(itemsRanked).length}
      className={'children' + (showContexts ?  ' context-chain' : '')}
    >
      {children.map((child, i) =>
        <Child
          key={i}
          focus={focus}
          itemsRanked={showContexts
            // replace signifier rank with rank from child when rendering showContexts as children
            // i.e. Where Context > Item, use the Item rank while displaying Context
            ? fillRank(child.context).concat(signifier(itemsRanked))
            // ? fillRank(child.context).concat(intersections(itemsRanked), { key: signifier(itemsRanked).key, rank: child.rank })
            : unroot(itemsRanked).concat(child)}
          subheadingItems={subheadingItems}
          // grandchildren can be manually added in code view
          childrenForced={child.children}
          rank={child.rank}
          showContexts={showContexts}
          contextChain={showContexts ? contextChain.concat([itemsRanked]) : contextChain}
          count={count + sumChildrenLength(children)} depth={depth + 1}
        />
      )}
    </ul>
})

// renders a link with the appropriate label to the given context
const Link = connect()(({ items, label, from, dispatch }) => {
  const value = label || signifier(items)
  return <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ href={encodeItemsUrl(items, from)} className='link' onClick={e => {
    e.preventDefault()
    document.getSelection().removeAllRanges()
    dispatch({ type: 'navigate', to: e.shiftKey ? [signifier(items)] : items, from: e.shiftKey ? decodeItemsUrl() : from })
  }}>{value}</a>
})

/*
  @subheadingItems: needed to constrain autofocus
  @contexts indicates that the item is a context rendered as a child, and thus needs to be displayed as the context while maintaining the correct items path
*/
const Editable = connect()(({ focus, itemsRanked, subheadingItems, contextChain, from, showContexts, dispatch }) => {
  const items = unrank(itemsRanked)
  const value = signifier(showContexts ? intersections(items) : items)
  const ref = React.createRef()
  const context = showContexts && items.length > 2 ? intersections(intersections(items))
    : !showContexts && items.length > 1 ? intersections(items)
    : ['root']
  const rank = itemsRanked[itemsRanked.length - 1].rank

  // store the old value so that we have a transcendental signifier when it is changed
  let oldValue = value

  // used in all autofocus DOM queries
  let subheadingItemsQuery = subheadingItems && subheadingItems.length > 0
    ? `[data-items="${encodeItems(subheadingItems)}"] `
    : ''

  const setCursorOnItem = () => {
    // delay until after the render
    if (!disableOnFocus) {

      disableOnFocus = true
      setTimeout(() => {
        disableOnFocus = false
      }, 0)

      // if there is a context chain, merge it with itemsRanked to create the new cursor
      dispatch({ type: 'setCursor', itemsRanked: contextChain.length ? chain(contextChain, itemsRanked) : itemsRanked, cursorHistoryClear: true })
    }
  }

  // add identifiable className for restoreSelection
  return <ContentEditable
    className={
      'editable editable-' + encodeItems(unrank(contextChain.length ? chain(contextChain, itemsRanked) : itemsRanked), itemsRanked[itemsRanked.length - 1].rank)
      + (value.length === 0 ? ' empty' : '')}
    html={value}
    innerRef={el => {
      ref.current = el

      // update autofocus for children-new ("Add item") on render in order to reset distance-from-cursor after new focus when "Add item" was hidden.
      // autofocusing the children here causes significant preformance issues
      // instead, autofocus the children on blur
      if (el && subheadingItems) {
        autofocus(document.querySelectorAll(subheadingItemsQuery + '.children-new'), items)
      }
    }}
    onKeyDown={e => {

      // strip HTML because <br> elements get added when deleting the last character on mobile
      const innerText = strip(e.target.innerHTML)
      const innerTextRef = strip(ref.current.innerHTML)

      /**************************
       * Delete
       **************************/

      if ((e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Escape') && innerText === '') {
        e.preventDefault()
        const prev = prevSibling('', context, rank)
        dispatch({ type: 'existingItemDelete', items: showContexts
          ? items
          : unroot(context.concat(innerTextRef)), rank, showContexts })

        // normal delete: restore selection to prev item
        if (prev) {
          restoreSelection(
            intersections(itemsRanked).concat(prev),
            prev.key.length
          )
        }
        else if (signifier(context) === signifier(focus)) {
          const next = getChildrenWithRank(context)[0]

          // delete from head of focus: restore selection to next item
          if (next) {
            restoreSelection(intersections(itemsRanked).concat(next))
          }

          // delete last item in focus
          else {
            cursorBack()
          }
        }
        // delete from first child: restore selection to context
        else {
          const contextRanked = items.length > 1 ? intersections(itemsRanked) : [{ key: 'root', rank: 0 }]
          restoreSelection(
            contextRanked,
            signifier(context).length
          )
        }
      }

      /**************************
       * Enter
       **************************/
      else if (e.key === 'Enter') {
        e.preventDefault()

        newItem({
          insertNewChild: e.metaKey,
          insertBefore: e.shiftKey
        })
      }

      /**************************
       * Up/Down
       **************************/
      else if (e.key === 'ArrowDown') {
        e.preventDefault()
        selectNextEditable(e.target)
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault()
        selectPrevEditable(e.target)
      }

    }}
    onClick={e => {
      // stop propagation to prevent default content onClick (which removes the cursor)
      e.stopPropagation()
    }}
    onTouchEnd={e => {
      const state = store.getState()

      showContexts = showContexts || state.contextViews[encodeItems(unrank(itemsRanked))]

      const children = showContexts
        ? getContexts(unrank(itemsRanked))
        : getChildrenWithRank(unrank(itemsRanked))

      if (
        children.length > 0 &&
        // no cursor
        (!state.cursor ||
        // clicking a different item (when not editing)
        (!state.editing && !equalItemsRanked(itemsRanked, state.cursor)))) {

        // prevent focus to allow navigation with mobile keyboard down
        e.preventDefault()
        setCursorOnItem()
      }
    }}
    onFocus={() => {
      setCursorOnItem()
      dispatch({ type: 'editing', value: true })
    }}
    onBlur={() => {
      dispatch({ type: 'editing', value: false })
    }}
    onChange={e => {
      // NOTE: When Child components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
      const newValue = e.target.value
        .replace(/&nbsp;/g, '')
        .replace(/^(<br>)+|(<br>)+$/g, '')

      // dynamically set empty attribute on element for css selection
      // :empty does not work because the DOM value may include <br>
      ref.current.classList.toggle('empty', newValue.length === 0)

      if (newValue !== oldValue) {
        const item = store.getState().data[oldValue]
        if (item) {
          dispatch({ type: 'existingItemChange', context: showContexts ? unroot(context) : context, showContexts, oldValue, newValue, rank })

          // store the value so that we have a transcendental signifier when it is changed
          oldValue = newValue

          // newChild and superscript helpers appear with a slight delay after editing
          clearTimeout(newChildHelperTimeout)
          clearTimeout(superscriptHelperTimeout)

          newChildHelperTimeout = setTimeout(() => {
            // edit the 3rd item (excluding root)
            if (Object.keys(store.getState().data).length > 3) {
              dispatch({ type: 'showHelperIcon', id: 'newChild', data: { itemsRanked }})
            }
          }, HELPER_NEWCHILD_DELAY)

          superscriptHelperTimeout = setTimeout(() => {
            const data = store.getState().data
            // new item belongs to at least 2 contexts
            if (data[newValue].memberOf && data[newValue].memberOf.length >= 2) {
              dispatch({ type: 'showHelperIcon', id: 'superscript', data: {
                value: newValue,
                num: data[newValue].memberOf.length,
                itemsRanked
              }})
            }
          }, HELPER_SUPERSCRIPT_DELAY)
        }
      }
    }}
  />
})

// renders superscript if there are other contexts
// optionally pass items (used by Subheading) or itemsRanked (used by Child)
const Superscript = connect(({ contextViews, cursorBeforeEdit, cursor, showHelper, helperData }, props) => {

  // track the transcendental identifier if editing
  const editing = equalArrays(unrank(cursorBeforeEdit || []), unrank(props.itemsRanked || [])) && exists(unrank(cursor || []))

  const itemsRanked = props.showContexts && props.itemsRanked
    ? intersections(props.itemsRanked)
    : props.itemsRanked

  const items = props.items || unrank(itemsRanked)

  const itemsLive = editing
    ? (props.showContexts ? intersections(unrank(cursor || [])) : unrank(cursor || []))
    : items

  return {
    contextViews,
    items,
    itemsLive,
    itemsRanked,
    // valueRaw is the signifier that is removed when showContexts is true
    valueRaw: props.showContexts ? signifier(unrank(props.itemsRanked)) : signifier(itemsLive),
    empty: signifier(itemsLive).length === 0, // ensure re-render when item becomes empty
    numContexts: exists(itemsLive) && getContexts(itemsLive).length,
    showHelper,
    helperData
  }
})(({ contextViews, items, itemsLive, itemsRanked, valueRaw, empty, numContexts, showHelper, helperData, showSingle, showContexts, dispatch }) => {

  const numDescendantCharacters = getDescendants(showContexts ? itemsLive.concat(valueRaw) : itemsLive )
    .reduce((charCount, child) => charCount + child.length, 0)

  showContexts = showContexts || contextViews[encodeItems(unrank(itemsRanked))]

  const children = showContexts
    ? getContexts(unrank(itemsRanked))
    : getChildrenWithRank(unrank(itemsRanked))

  const selectFromExpandedArea = e => {
    e.preventDefault()
    const state = store.getState()

    if (isMobile &&
      children.length > 0 &&
      // no cursor
      (!state.cursor ||
      // clicking a different item (when not editing)
      (!state.editing && !equalItemsRanked(itemsRanked, state.cursor)))) {

      // prevent focus to allow navigation with mobile keyboard down
      dispatch({ type: 'setCursor', itemsRanked })
    }
    else {

      // restoreSelection does not work here for some reason
      const el = e.currentTarget.parentNode.previousSibling
      if (el.childNodes.length === 0) {
        el.appendChild(document.createTextNode(''))
      }
      const textNode = el.childNodes[0]
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(textNode, textNode.length)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

  const DepthBar = () => <span>

    {numDescendantCharacters >= 16 ? <Helper id='depthBar' title="The length of this bar indicates the number of items in this context." style={{ top: 30, marginLeft: -16 }} arrow='arrow arrow-up arrow-upleft' opaque>
      <p>This helps you quickly recognize contexts with greater depth as you navigate.</p>
    </Helper> : null}

    {(showContexts ? intersections(itemsLive) : itemsLive) && numDescendantCharacters ? <span className={'depth-bar' + (itemsLive.length > 1 && (getContexts(showContexts ? intersections(itemsLive) : itemsLive).length > 1) ? ' has-other-contexts' : '')} style={{ width: Math.log(numDescendantCharacters) + 2 }} /> : null}
  </span>

  return <span className='superscript-container'>{!empty && numContexts > (showSingle ? 0 : 1)
    ? <span className='num-contexts'> {/* Make the container position:relative so that the helper is positioned correctly */}
      <sup>
        <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ href={encodeItemsUrl([signifier(itemsLive)], /*intersections(itemsLive)*/null, true)} onClick={e => {
          e.preventDefault()
          dispatch({ type: 'navigate', to: [signifier(itemsLive)], /*from: intersections(itemsLive), */showContexts: true })

          setTimeout(() => {
            dispatch({ type: 'showHelperIcon', id: 'contextView', data: signifier(itemsLive) })
          }, HELPER_CONTEXTVIEW_DELAY)
        }}>{numContexts}</a>
      </sup>

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
    signifier(itemsRanked).rank === helperData.rank ? <EditIdentumHelper itemsLive={itemsLive} showContexts={showContexts} />

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

    <span className='child-expanded-click' onTouchEnd={e => { if (!dragging) { selectFromExpandedArea(e, itemsRanked) }}} onClick={e => !isMobile ? selectFromExpandedArea(e, itemsRanked) : null}></span>
  </span>
})

const NewItem = connect(({ cursor }, props) => {
  const children = getChildrenWithRank(props.context)
  return {
    show:  !children.length || children[children.length - 1].key !== ''
  }
})(({ show, context, showContexts, dispatch }) => {
  return show ? <ul
      style={{ marginTop: 0 }}
      data-items-length={unroot(context).length}
      className='children-new'
  >
    <li className='leaf'><h3 className='child-heading'>
        <a className='placeholder'
          onClick={() => {
            // do not preventDefault or stopPropagation as it prevents cursor

            // setup fake input focus to allow focus outside of click event
            // See: https://stackoverflow.com/a/45703019/480608
            asyncFocus.enable()

            const newRank = getNextRank(context)

            dispatch({
              type: 'newItemSubmit',
              context,
              addAsContext: showContexts,
              rank: newRank,
              value: ''
            })

            disableOnFocus = true
            setTimeout(() => {
              disableOnFocus = false
              restoreSelection(fillRank(unroot(context)).concat({ key: '', rank: newRank }))

              // remove fake input
              // must be delayed since restoreSelection is asynchronous
              setTimeout(asyncFocus.cleanup)
            }, RENDER_DELAY)

          }}
        >Add {showContexts ? 'context' : 'item'}</a>
      </h3>
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
    const { show, id, title, arrow, center, opaque, className, style, positionAtCursor, top, children, dispatch } = this.props

    const sel = document.getSelection()
    const cursorCoords = sel.type !== 'None' ? sel.getRangeAt(0).getClientRects()[0] || {} : {}

    if (!show) return null

    return <div ref={this.ref} style={Object.assign({}, style, top ? { top: 55 } : null, positionAtCursor ? {
      top: cursorCoords.y,
      left: cursorCoords.x
    } : null )} className={`helper helper-${id} animate` +
        (center ? ' center' : '') +
        (opaque ? ' opaque' : '') +
        (className ? ' ' + className : '')
      }>
      <div className={`helper-content ${arrow}`}>
        {title ? <p className='helper-title'>{title}</p> : null}
        <div className='helper-text'>{children}</div>
        <div className='helper-actions'>
          {id === 'welcome'
          ? <a className='button' onClick={() => { dispatch({ type: 'helperComplete', id }) }}>START</a>
          : <span>
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

const EditIdentumHelper = connect(({ helperData }) => ({ helperData }))(({ helperData, itemsLive, showContexts }) =>
  <Helper id='editIdentum' title="When you edit an item, it is only changed in its current context" style={{ top: 40, left: 0 }} arrow='arrow arrow-up arrow-upleft' opaque>
    <p>Now "{helperData.newValue}" exists in "{showContexts ? signifier(itemsLive) : signifier(intersections(itemsLive))}" and "{helperData.oldValue}" exists in "{signifier(helperData.oldContext)}".</p>
  </Helper>
)

const HelperIcon = connect(({ showHelperIcon, helperData, dispa }) => ({ showHelperIcon, helperData }))(({ showHelperIcon, helperData, dispatch }) =>
  showHelperIcon ? <div className='helper-icon'><a className='helper-icon-inner' onClick={() => dispatch({ type: 'showHelper', id: showHelperIcon })}>?</a></div> : null
)

const Search = connect(({ search }) => ({ show: search != null }))(({ show, dispatch }) => {
  return show ? <div>
    <ul style={{ marginTop: 0 }} >
      <li><h3 className='child-heading'>
          <ContentEditable
            className='editable search'
            html=''
            placeholder='Search'
            innerRef={el => {
              if (el) {
                el.focus()
              }
            }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                selectNextEditable(e.target)
              }
            }}
            onChange={e => {
              dispatch({ type: 'search', value: e.target.value })
            }}
          />
        </h3>
        <SearchChildren />
      </li>
    </ul>
  </div> : null
})

const SearchChildren = connect(
  ({ data, search }) => ({
      children: search ? fillRank(Object.keys(data).filter(key =>
        key !== 'root' && (new RegExp(search, 'gi')).test(key)
      )) : []
  })
)(({ children }) =>
  <div
    // must go into DOM to modify the parent li classname since we do not want the li to re-render
    ref={el => {
      if (el) {
        el.parentNode.classList.toggle('leaf', children.length === 0)
      }
    }}
  >
    <Children
      childrenForced={children}
      focus={fillRank(['root'])}
      itemsRanked={fillRank(['root'])}
      // subheadingItems={unroot(items)}
      // expandable={true}
    />
  </div>
)

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
