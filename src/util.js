/** Defines aaaaaaaaaaaaaaaaaallll the helper functions */

import * as htmlparser from 'htmlparser2'
import { clientId, isMobile } from './browser.js'
import { fetch, store } from './store.js'
import globals from './globals.js'
import { handleKeyboard } from './shortcuts.js'
import { encode as firebaseEncode } from 'firebase-encode'

import {
  ANIMATE_CHAR_STEP,
  GETCHILDRENWITHRANK_VALIDATION_FREQUENCY,
  EMPTY_TOKEN,
  NUMBERS,
  RANKED_ROOT,
  RENDER_DELAY,
  ROOT_TOKEN,
  SCHEMA_LATEST,
  TUTORIAL_STEP_NONE,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_SECONDTHOUGHT,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT1_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT1_HINT,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL2_STEP_CONTEXT2_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL2_STEP_CONTEXT2_HINT,
} from './constants.js'

import {
  tutorialNext,
} from './action-creators/tutorial.js'

const asyncFocus = AsyncFocus()

/** Converts [{ key, rank }, ...] to just [key, ...]. */
// if already converted, return a shallow copy
// if falsey, return as-is
export const unrank = items => {
  return items
    ? items.length > 0 && typeof items[0] === 'object' && 'key' in items[0]
      ? items.map(child => child.key)
      : items.slice()
    // return falsey value as-is
    : items
}

/**
 * custom console logging that handles itemsRanked
 * @param o { itemsRanked }
 */
export const log = o => { // eslint-disable-line no-unused-vars
  for (let key in o) {
    console.info(key, unrank(o[key] || []), o[key])
  }
}

/** Returns true if the given element is visibly within the viewport */
export const isElementInViewport = el => {
  const rect = el.getBoundingClientRect()
  return rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
}

/** Replace deprecated built-in */
export const scrollIntoViewIfNeeded = (el, options) => {
  if(!isElementInViewport(el)) {
    el.scrollIntoView(options)
  }
}

/** Returns true if the items or itemsRanked is the root item. */
// declare using traditional function syntax so it is hoisted
export const isRoot = items =>
  items.length === 1 && items[0] && (items[0].key === ROOT_TOKEN || items[0] === ROOT_TOKEN || (items[0].context && isRoot(items[0].context)))

/** Make a string safe to instantiate a RegExp */
// NOTE: The escape-string-regexp npm package crashes the react production build.
export const escapeRegExp = s => s.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&')

// replace characters that are invalid in document.querySelector with their respective character codes
// prepend _ to escape leading digits
export const regExpEscapeSelector = new RegExp('[' + escapeRegExp(' !"#$%&\'()*+,./:;<=>?@[]^`{|}~') + ']', 'g')
export const escapeSelector = s => '_' + s.replace(regExpEscapeSelector, s => '_' + s.charCodeAt())

/** Returns a function that calls the given function once then returns the same result forever */
export const perma = f => {
  let result = null
  return (...args) => result || (result = f(...args))
}

/** Returns the subthought that contains the given index. */
// const findSubthoughtByIndex = (subthoughts, index) =>
//   subthoughts.find(subthought => subthought.index + subthought.text.length >= index)

// const getSubthoughtUnderSelection = (key, numWords, { state = store.getState()} = {}) => {
//   const { data } = state
//   const subthoughts = getSubthoughts(key, 3, { data })
//   const subthoughtUnderSelection = findSubthoughtByIndex(subthoughts, window.getSelection().focusOffset)
//   return subthoughtUnderSelection && subthoughtUnderSelection.contexts.length > 0
//     ? stripPunctuation(subthoughtUnderSelection.text)
//     : null
// }

/** Encode the items (and optionally rank) as a string for use in a className. */
export const encodeItems = (items, rank) => items
  .map(item => item ? escapeSelector(item) : '')
  .join('__SEP__')
  + (rank != null ? '__SEP__' + rank : '')

/** Return true if the context view is active for the given key, including selected subthoughts */
export const isContextViewActive = (items, { state } = {}) => {

  if (!items || items.length === 0) return false

  return state.contextViews[encodeItems(items)]

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // TODO: Figure out why this causes unwanted re-rendering during editing
  // const { contextViews } = state
  // const subthought = perma(() => getSubthoughtUnderSelection(signifier(items), 3, { state }))
  // return contextViews[encodeItems(items)] || (subthought() && contextViews[encodeItems(intersections(items).concat(subthought()))])
}


/** Encodes an items array into a URL. */
export const encodeItemsUrl = (items, { contextViews } = {}) =>
  '/' + (!items || isRoot(items)
    ? ''
    : items.map((item, i) =>
        window.encodeURIComponent(item) + (isContextViewActive(items.slice(0, i + 1), { state: { contextViews } }) ? '~' : '')
      ).join('/'))

/** Convert a single url component to an item */
export const componentToItem = component => window.decodeURIComponent(component.replace(/~$/, ''))

export const timestamp = () => (new Date()).toISOString()

/** Equality for lists of lists. */
export const equalArrays = (a, b) =>
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
export const equalItemRanked = (a, b) =>
  a === b || (a && b && a.key === b.key && a.rank === b.rank)

/** Compares two itemsRanked arrays using { key, rank } as identity and ignoring other properties. */
export const equalItemsRanked = (a, b) =>
  a === b || (a && b && a.length === b.length && a.every && a.every((_, i) => equalItemRanked(a[i], b[i])))

/** Returns true if items subset is contained within superset (inclusive) */
export const subsetItems = (superset, subset) => {
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
export const strip = html => html
  .replace(/<(?:.|\n)*?>/gm, '')
  .replace(/&nbsp;/gm, ' ')
  .trim()

export const stripPunctuation = text => text
  .replace(/[;:.?!\-—,'"]/gi, '')


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

export const flatten = list => Array.prototype.concat.apply([], list)
export const flatMap = (list, f) => Array.prototype.concat.apply([], list.map(f))

/** gets the signifying label of the given context.
  Declare using traditional function syntax so it is hoisted
*/
export const signifier = items => items[items.length - 1]

/** Sums the length of all items in the list of items. */
// works on children with key or context
export const sumChildrenLength = children => children.reduce((accum, child) =>
  accum + (
    'key' in child ? child.key.length
    : child.context.length > 0 ? signifier(child.context).length
    : 0
  )
, 0)

/** Guarded toLowercase */
const lower = x => x && x.toLowerCase ? x.toLowerCase() : x

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
export const makeCompareByProp = key => (a, b) => {
  return lower(a[key]) > lower(b[key]) ? 1
    : lower(a[key]) < lower(b[key]) ? -1
    : 0
}

export const compareByRank = makeCompareByProp('rank')

export const splice = (arr, start, deleteCount, ...items) =>
  [].concat(
    arr.slice(0, start),
    items,
    arr.slice(start + deleteCount)
  )

// assert.deepEqual(splice([1,2,3], 1, 1), [1,3])
// assert.deepEqual(splice([1,2,3], 1, 1, 4), [1,4,3])

// sorts items emoji and whitespace insensitive
// const sorter = (a, b) =>
//   emojiStrip(a.toString()).trim().toLowerCase() >
//   emojiStrip(b.toString()).trim().toLowerCase() ? 1 : -1

export const sigKey = itemsRanked => signifier(itemsRanked).key
export const sigRank = itemsRanked => signifier(itemsRanked).rank

/** Gets the intersections of the given context; i.e. the context without the signifier */
export const intersections = items => items.slice(0, items.length - 1)

/** Returns a subset of items from the start to the given item (inclusive) */
export const ancestors = (itemsRanked, itemRanked) => itemsRanked.slice(0, itemsRanked.findIndex(cur => equalItemRanked(cur, itemRanked)) + 1)

/** Returns a new item less the given context. */
export const removeContext = (item, context, rank) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return Object.assign({}, item, notNull({
      memberOf: item.memberOf ? item.memberOf.filter(parent =>
        !(equalArrays(parent.context, context) && (rank == null || parent.rank === rank))
      ) : [],
      created: item.created,
      lastUpdated: timestamp()
    }))
}

/** Returns a new item plus the given context. Does not add duplicates. */
export const addContext = (item, context, rank) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return Object.assign({}, item, notNull({
      memberOf: (item.memberOf || [])
        .filter(parent =>
          !(equalArrays(parent.context, context) && parent.rank === rank)
        )
        .concat({ context, rank }),
      created: item.created,
      lastUpdated: timestamp()
    }))
}

/** Returns a new item that has been moved either between contexts or within a context (i.e. changed rank) */
export const moveItem = (item, oldContext, newContext, oldRank, newRank) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return Object.assign({}, item, notNull({
      memberOf: item.memberOf ? item.memberOf
        // remove old context
        .filter(parent => !(equalArrays(parent.context, oldContext) && parent.rank === oldRank))
        // add new context
        .concat({
          context: newContext,
          rank: newRank
        })
        : [],
      created: item.created,
      lastUpdated: timestamp()
    }))
}

/** Returns the editable DOM node of the given items */
export const editableNode = itemsRanked => {
  const rank = sigRank(itemsRanked)
  return document.getElementsByClassName('editable-' + encodeItems(unrank(itemsRanked), rank))[0]
}

/** Gets the editable node immediately after the node of the given path. */
export const nextEditable = path => {
  const editable = path && editableNode(path)
  const child = editable && editable.closest('.child')
  const nextChild = child && child.nextElementSibling
  return nextChild && nextChild.querySelector('.editable')
}

/** Gets the editable node immediately before the node of the given path. */
export const prevEditable = path => {
  const editable = path && editableNode(path)
  const child = editable && editable.closest('.child')
  const prevChild = child && child.previousElementSibling
  return prevChild && prevChild.querySelector('.editable')
}

export const isElementHiddenByAutoFocus = el => {
  const children = el.closest('.children')
  return (children.classList.contains('distance-from-cursor-2') && !el.closest('.cursor-parent')) ||
    children.classList.contains('distance-from-cursor-3')
}

/** Ranks the items from 0 to n. */
export const rankItemsSequential = items =>
  items.map((item, i) => ({ key: item, rank: i }))

/** join the segments of a context chain, eliminating the overlap, and return the resulting itemsRanked */
// how is this different than chain()? Hmmmm... good question...
export const contextChainToItemsRanked = contextChain =>
  flatten([contextChain[0]].concat(contextChain.slice(1).map(itemsRanked => itemsRanked.slice(1))))

/** Renders a list of items as a sentence. */
export const conjunction = items =>
  items.slice(0, items.length - 1).join(', ') + (items.length !== 2 ? ',' : '') + ' and ' + items[items.length - 1]

export const spellNumber = n => NUMBERS[n - 1] || n

export const nextSiblings = el =>
  el.nextSibling
    ? [el.nextSibling].concat(nextSiblings(el.nextSibling))
    : []

export const selectNextEditable = currentNode => {
  const allElements = document.querySelectorAll('.editable')
  const currentIndex = Array.prototype.findIndex.call(allElements, el => currentNode.isEqualNode(el))
  if (currentIndex < allElements.length - 1) {
    allElements[currentIndex + 1].focus()
  }
}

export const selectPrevEditable = currentNode => {
  const allElements = document.querySelectorAll('.editable')
  const currentIndex = Array.prototype.findIndex.call(allElements, el => currentNode.isEqualNode(el))
  if (currentIndex > 0) {
    allElements[currentIndex - 1].focus()
  }
}

export const helperCleanup = () => {
  const helperContainer = document.querySelector('.helper-container')
  if (helperContainer) {
    helperContainer.classList.remove('helper-container')
  }
  const siblingsAfter = document.querySelectorAll('.sibling-after')
  for (let i=0; i<siblingsAfter.length; i++) {
    siblingsAfter[i].classList.remove('sibling-after')
  }
}

export const resetTranslateContentIntoView = () => {
  const contentEl = document.getElementById('content')
  if (contentEl) {
    contentEl.style.transform = `translate3d(0,0,0)`
    contentEl.style.marginBottom = `0`
  }
}

/** Positions the content so the parent of the cursor is in the top specified portion of the viewport.
   This is needed to hide all of the empty space created by the autofocus.
*/
export const translateContentIntoView = (itemsRanked, { top = 0.25, scrollIntoViewOptions } = {}) => {

  // disable during tutorial
  if (isTutorial()) return

  if (itemsRanked && itemsRanked.length > 1) {

    const editingEl = editableNode(itemsRanked)
    if (!editingEl) return

    // shim for mobile
    // since autoscrolling happens when editables are focused on mobile, the content's vertical position needs to be an invariant otherwise it feels too jumpy
    // instead, use scrollIntoView only if out of view
    // Note: Mobile currently autoscrolls to the focused editable anyway
    if (isMobile) {
      scrollIntoViewIfNeeded(editingEl, Object.assign({ block: 'center', behavior: 'auto' }, scrollIntoViewOptions))
    }
    else {
      const contentEl = document.getElementById('content')
      if (contentEl) {
        const parentEl = editingEl.closest('.child').closest('.children').closest('.child')
        if (!parentEl) return

        const existingScroll = contentEl.style.transform
          ? +contentEl.style.transform.slice(18, contentEl.style.transform.indexOf('px', 18))
          : 0
        const elY = parentEl.getBoundingClientRect().y // relative to viewport
        const extraScrollY = Math.max(0, elY - window.innerHeight * top + existingScroll)
        contentEl.style.transform = `translate3d(0, -${extraScrollY}px, 0)`
        contentEl.style.marginBottom = `-${extraScrollY}px`
      }
    }
  }
  else {
    resetTranslateContentIntoView()
  }
}

/** Returns a shallow copy of an object with all keys that do not have a value of null or undefined */
export const notNull = o => {
  const output = {}
  for (let key in o) {
    if (o[key] != null) {
      output[key] = o[key]
    }
  }
  return output
}

/** Returns a shallow copy of an object with all keys that do not have a falsey value */
export const notFalse = o => {
  const output = {}
  for (let key in o) {
    if (o[key]) {
      output[key] = o[key]
    }
  }
  return output
}

/** Returns the opposite direction of the given direction l/r/d/u */
export const oppositeDirection = dir =>({
  l: 'r',
  r: 'l',
  u: 'd',
  d: 'u'
}[dir])

/** Returns the direction resulting from a 90 degree clockwise rotation. */
export const rotateClockwise = dir =>({
  l: 'u',
  r: 'd',
  u: 'r',
  d: 'l'
}[dir])


/**
 * parses the items from the url
 * @return { items, contextViews }
 */
// declare using traditional function syntax so it is hoisted
export const decodeItemsUrl = (pathname, data) => {
  const urlPath = pathname.slice(1)
  const urlComponents = urlPath ? urlPath.split('/') : [ROOT_TOKEN]
  const pathUnranked = urlComponents.map(componentToItem)
  const contextViews = urlComponents.reduce((accum, cur, i) =>
    /~$/.test(cur) ? Object.assign({}, accum, {
      [encodeItems(pathUnranked.slice(0, i + 1))]: true
    }) : accum,
  {})
  const itemsRanked = rankItemsFirstMatch(pathUnranked, { state: { data, contextViews } })
  return {
    // infer ranks of url path so that url can be /A/a1 instead of /A_0/a1_0 etc
    itemsRanked,//: rankItemsFirstMatch(pathUnranked, data, contextViews),
    contextViews
  }
}

/** Set the url and history to the given items */
// optional contextViews argument can be used during toggleContextViews when the state has not yet been updated
// defaults to URL contextViews
// SIDE EFFECTS: window.history
export const updateUrlHistory = (itemsRanked=RANKED_ROOT, { replace, data = store.getState().data, contextViews } = {}) => {

  const decoded = decodeItemsUrl(window.location.pathname, data)
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

/** Merges items into a context chain, removing the overlapping signifier */
// use autogenerated rank of context
// if there is no/empty context chain, return itemsRanked as-is
export const chain = (contextChain, itemsRanked, data=store.getState().data) => {

  if (!contextChain || contextChain.length === 0) return itemsRanked

  const pivot = signifier(contextChain[contextChain.length - 1])
  const i = itemsRanked.findIndex(child => equalItemRanked(child, pivot))
  const append = itemsRanked.slice(i - 1)
  const contexts = getContextsSortedAndRanked(pivot, data)
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
 * @example (shown without ranks): splitChain(['A', 'B', 'A'], { B: true }) === [['A', 'B'], ['A']]
 */
export const splitChain = (path, { state = store.getState() } = {}) => {

  const contextChain = [[]]

  for (let i=0; i<path.length; i++) {

    // push item onto the last component of the context chain
    contextChain[contextChain.length - 1].push(path[i])

    // push an empty array when we encounter a contextView so that the next item gets pushed onto a new component of the context chain
    const showContexts = isContextViewActive(unrank(path.slice(0, i + 1)), { state })
    if (showContexts && i < path.length - 1) {
      contextChain.push([])
    }
  }

  return contextChain
}

/** Generates itemsRanked from the last segment of a context chain */
export const lastItemsFromContextChain = (contextChain, state = store.getState()) => {
  if (contextChain.length === 1) return contextChain[0]
  const penult = contextChain[contextChain.length - 2]
  const item = state.data[sigKey(penult)]
  const ult = contextChain[contextChain.length - 1]
  const parent = item.memberOf.find(parent => signifier(parent.context) === ult[0].key)
  const itemsRankedPrepend = intersections(rankItemsFirstMatch(parent.context, { state }))
  return itemsRankedPrepend.concat(splice(ult, 1, 0, signifier(penult)))
}

/** Gets the ranked items that are being edited from a context chain. */
export const itemsEditingFromChain = (path, contextViews) => {

  const contextChain = splitChain(path, contextViews)

  // the last context in the context chain, which is the context of the item being edited
  const contextFromChain = contextChain && contextChain[contextChain.length - 1]

  // the penultimate context in the context chain, which is the items that is being edited in the context view
  const itemsEditing = contextChain && contextChain.length > 1
    ? contextChain[contextChain.length - 2]
    : RANKED_ROOT

  return contextFromChain.concat(signifier(itemsEditing))
}


/** Returns true if the signifier of the given context exists in the data */
export const exists = (key, data=store.getState().data) => !!data[key]

/** Returns a list of unique contexts that the given item is a member of. */
export const getContexts = (key, data=store.getState().data) => {
  const cache = {}

  // this can occur during normal operations and should probably be rearchitected
  // e.g. while deleting an item, the following function stack is invoked after the data has been updated but before the url has: updateUrlHistory > decodeItemsUrl > rankItemsFirstMatch > getContexts
  if (!exists(key, data)) {
    // console.error(`getContexts: Unknown key "${key}" context: ${items.join(',')}`)
    return []
  }
  return (data[key].memberOf || [])
    .filter(member => {
      if (!member.context) return false
      const exists = cache[encodeItems(member.context)]
      cache[encodeItems(member.context)] = true
      // filter out items that exist
      return !exists
    })
}

export const getContextsSortedAndRanked = (key, data=store.getState().data) =>
  getContexts(key, data)
    // sort
    .sort(makeCompareByProp('context'))
    // generate dynamic ranks
    .map((item, i) => ({
      context: item.context,
      rank: i
    }))

// Returns a subset of items without all ancestors up to the given time (exclusive)
// const disown = (items, item) => items.slice(items.indexOf(item))

/** Get the intersections of an items or [ROOT_TOKEN] if there are none */
export const rootedIntersections = items => items.length > 1 ? intersections(items) : [ROOT_TOKEN]

export const unroot = items =>
  items.length > 0 && isRoot(items.slice(0, 1))
    ? items.slice(1)
    : items

/** Generates a flat list of all descendants */
export const getDescendants = (itemsRanked, recur/*INTERNAL*/) => {
  const children = getChildrenWithRank(itemsRanked)
  // only append current item in recursive calls
  return (recur ? [signifier(itemsRanked)] : []).concat(
    flatMap(children, child => getDescendants(itemsRanked.concat(child), true))
  )
}

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
export const getChildrenWithRank = (itemsRanked, data, contextChildren) => {
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
        // console.warn(`Could not find item data for "${child.key} in ${JSON.stringify(unrank(itemsRanked))}`)

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
export const getChildrenWithRankDEPRECATED = (items, data) => {
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
export const isBefore = (itemsRankedA, itemsRankedB) => {

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
export const getRankBefore = itemsRanked => {

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
export const getRankAfter = itemsRanked => {

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
export const prevSibling = (value, contextRanked, rank) => {
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

/** Gets an items's next sibling with its rank. */
export const nextSibling = itemsRanked => {
  const siblings = getChildrenWithRank(rootedIntersections(itemsRanked))
  const i = siblings.findIndex(child =>
    child.key === sigKey(itemsRanked) && child.rank === sigRank(itemsRanked)
  )
  return siblings[i+1]
}

/** Gets a rank that comes before all items in a context. */
export const getPrevRank = (itemsRanked, data, contextChildren) => {
  const children = getChildrenWithRank(itemsRanked, data, contextChildren)
  return children.length > 0
    ? children[0].rank - 1
    : 0
}

/** Gets the next rank at the end of a list. */
export const getNextRank = (itemsRanked, data, contextChildren) => {
  const children = getChildrenWithRank(itemsRanked, data, contextChildren)
  return children.length > 0
    ? children[children.length - 1].rank + 1
    : 0
}

/** Ranks the items from their rank in their context. */
// if there is a duplicate item in the same context, takes the first
// NOTE: path is unranked
export const rankItemsFirstMatch = (pathUnranked, { state = store.getState() } = {}) => {
  if (isRoot(pathUnranked)) return RANKED_ROOT

  const { data } = state
  let itemsRankedResult = RANKED_ROOT
  let prevParentContext = [ROOT_TOKEN]

  return pathUnranked.map((key, i) => {
    const item = data[key]
    const contextPathUnranked = i === 0 ? [ROOT_TOKEN] : pathUnranked.slice(0, i)
    const contextChain = splitChain(itemsRankedResult, { state })
    const itemsRanked = contextChainToItemsRanked(contextChain)
    const context = unroot(prevParentContext).concat(sigKey(itemsRanked))
    const inContextView = i > 0 && isContextViewActive(contextPathUnranked, { state })
    const contexts = (inContextView ? getContextsSortedAndRanked : getContexts)(inContextView ? signifier(contextPathUnranked) : key, data)

    const parent = inContextView
      ? contexts.find(child => signifier(child.context) === key)
      : ((item && item.memberOf) || []).find(p => equalArrays(p.context, context))

    if (parent) {
      prevParentContext = parent.context
    }

    const itemRanked = {
      key,
      // NOTE: we cannot throw an error if there is no parent, as it may be a floating context
      // unfortunately this that there is no protection against a (incorrectly) missing parent
      rank: parent ? parent.rank : 0
    }

    itemsRankedResult = unroot(itemsRankedResult.concat(itemRanked))

    return itemRanked
  })
}

// derived children are all grandchildren of the parents of the given context
// signifier rank is accurate; all other ranks are filled in 0
// const getDerivedChildren = items =>
//   getContexts(signifier(items))
//     .filter(member => !isRoot(member))
//     .map(member => rankItemsSequential(member.context).concat({
//       key: signifier(items),
//       rank: member.rank
//     }))

/** Restores the selection to a given editable item and then dispatches setCursor. */
// from the element's event handler. Opt-in for performance.
// asyncFocus.enable() must be manually called before when trying to focus the selection on mobile
// (manual call since restoreSelection is often called asynchronously itself, which is too late for asyncFocus.enable() to work)
export const restoreSelection = (itemsRanked, { offset, cursorHistoryClear, done } = {}) => {

  // no selection
  if (!itemsRanked || isRoot(itemsRanked)) return

  const items = unrank(itemsRanked)

  // only re-apply the selection the first time
  if (!globals.disableOnFocus) {

    globals.disableOnFocus = true

    // use current focusOffset if not provided as a parameter
    let focusOffset = offset != null
      ? offset
      : window.getSelection().focusOffset

    store.dispatch({ type: 'setCursor', itemsRanked, cursorHistoryClear })

    // re-apply selection
    setTimeout(() => {

      // wait until this "artificial" focus event fires before re-enabling onFocus
      setTimeout(() => {
        globals.disableOnFocus = false
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

/** Returns an expansion map marking all items that should be expanded
  * @example {
    A: true,
    A__SEP__A1: true,
    A__SEP__A2: true
  }
*/
export const expandItems = (path, data, contextChildren, contextViews={}, contextChain=[], depth=0) => {

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
export const canShowHelper = (id, state=store ? store.getState() : null) => {
  return state &&
    (!state.showHelper || state.showHelper === id) &&
    !state.helpers[id].complete &&
    state.helpers[id].hideuntil < Date.now()
}

/** Exits the search or code view, or move the cursor back, whichever is first. */
export const exit = () => {
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
export const cursorBack = () => {
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

export const cursorForward = () => {
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

export const deleteItem = () => {

  const state = store.getState()
  const path = state.cursor

  // same as in newItem
  const contextChain = splitChain(path, state.contextViews)
  const showContexts = isContextViewActive(unrank(intersections(path)), { state })
  const itemsRanked = contextChain.length > 1
    ? lastItemsFromContextChain(contextChain)
    : path
  const contextRanked = showContexts && contextChain.length > 1 ? contextChain[contextChain.length - 2]
    : !showContexts && itemsRanked.length > 1 ? intersections(itemsRanked) :
    RANKED_ROOT
  const context = unrank(contextRanked)

  const { key, rank } = signifier(itemsRanked)
  const items = unrank(itemsRanked)

  const prevContext = () => {
    const itemsContextView = itemsEditingFromChain(itemsRanked, state.contextViews)
    const contexts = showContexts && getContextsSortedAndRanked(sigKey(itemsContextView))
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
      ? unroot(getContextsSortedAndRanked(sigKey(intersections(path))))[0]
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
      ? intersections(path).concat({ key: signifier(next().context), rank: next().rank })
      : intersections(path).concat(next()), { offset: 0 }] :
    // Case III: delete last thought in context; restore selection to context
    items.length > 1 ? [rootedIntersections(path), { offset: signifier(context).length }]
    // Case IV: delete very last thought; remove cursor
    : [null]
  ))
}

/** Adds a new item to the cursor.
 * @param offset The focusOffset of the selection in the new item. Defaults to end.
*/
// NOOP if the cursor is not set
export const newItem = ({ at, insertNewChild, insertBefore, value='', offset } = {}) => {

  const state = store.getState()
  const tutorialStep = state.settings.tutorialStep
  const tutorialStepNewThoughtCompleted =
    // new thought
    (!insertNewChild && (
      Math.floor(tutorialStep) === TUTORIAL_STEP_FIRSTTHOUGHT ||
      Math.floor(tutorialStep) === TUTORIAL_STEP_SECONDTHOUGHT
    )) ||
    // new thought in context
    (insertNewChild && Math.floor(tutorialStep) === TUTORIAL_STEP_SUBTHOUGHT)

  const path = at || state.cursor || RANKED_ROOT
  const dispatch = store.dispatch

  const contextChain = splitChain(path, state.contextViews)
  const showContexts = isContextViewActive(unrank(path), { state })
  const showContextsParent = isContextViewActive(unrank(intersections(path)), { state })
  const itemsRanked = contextChain.length > 1
    ? lastItemsFromContextChain(contextChain)
    : path
  const contextRanked = showContextsParent && contextChain.length > 1 ? contextChain[contextChain.length - 2]
    : !showContextsParent && itemsRanked.length > 1 ? intersections(itemsRanked) :
    RANKED_ROOT
  const context = unrank(contextRanked)

  // use the live-edited value
  // const itemsLive = showContextsParent
  //   ? intersections(intersections(items)).concat().concat(signifier(items))
  //   : items
  // const itemsRankedLive = showContextsParent
  //   ? intersections(intersections(path).concat({ key: innerTextRef, rank })).concat(signifier(path))
  //   : path

  // if meta key is pressed, add a child instead of a sibling of the current thought
  // if shift key is pressed, insert the child before the current thought
  const newRank = (showContextsParent && !insertNewChild) || (showContexts && insertNewChild) ? 0 // rank does not matter here since it is autogenerated
    : (insertBefore
        ? (insertNewChild || !state.cursor ? getPrevRank : getRankBefore)
        : (insertNewChild || !state.cursor ? getNextRank : getRankAfter)
      )(itemsRanked)

  dispatch({
    type: 'newItemSubmit',
    context: insertNewChild
      ? unrank(itemsRanked)
      : context,
    // inserting a new child into a context functions the same as in the normal item view
    addAsContext: (showContextsParent && !insertNewChild) || (showContexts && insertNewChild),
    rank: newRank,
    value
  })

  // tutorial step 1
  if (tutorialStepNewThoughtCompleted) {
    tutorialNext()
  }
  // some hints are rolled back when a new item is created
  else if (tutorialStep === TUTORIAL2_STEP_CONTEXT1_PARENT_HINT) {
    dispatch({ type: 'tutorialStep', value: TUTORIAL2_STEP_CONTEXT1_PARENT })
  }
  else if (tutorialStep === TUTORIAL2_STEP_CONTEXT1_HINT) {
    dispatch({ type: 'tutorialStep', value: TUTORIAL2_STEP_CONTEXT1 })
  }
  else if (tutorialStep === TUTORIAL2_STEP_CONTEXT2_PARENT_HINT) {
    dispatch({ type: 'tutorialStep', value: TUTORIAL2_STEP_CONTEXT2_PARENT })
  }
  else if (tutorialStep === TUTORIAL2_STEP_CONTEXT2_HINT) {
    dispatch({ type: 'tutorialStep', value: TUTORIAL2_STEP_CONTEXT2 })
  }

  globals.disableOnFocus = true
  asyncFocus.enable()
  setTimeout(() => {
    // track the transcendental identifier if editing
    globals.disableOnFocus = false
    restoreSelection((insertNewChild ? unroot(path) : intersections(path)).concat({ key: value, rank: newRank }), { offset: offset != null ? offset : value.length })
  }, RENDER_DELAY)

  return {
    rank: newRank
  }
}

/** Create a new item, merging collisions. */
export const addItem = ({ data=store.getState().data, value, rank, context }) =>
  Object.assign({}, data[value], {
    value: value,
    memberOf: (value in data && data[value] && data[value].memberOf ? data[value].memberOf : []).concat({
      context,
      rank
    }),
    created: timestamp(),
    lastUpdated: timestamp()
  })

/** Animates an item one character at a time, left to right. */
export const animateItem = value => {
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

/** Restores cursor to its position before search. */
export const restoreCursorBeforeSearch = () => {
  const cursor = store.getState().cursorBeforeSearch
  if (cursor) {
    store.dispatch({ type: 'setCursor', itemsRanked: cursor })
    setTimeout(() => {
      restoreSelection(cursor, { offset: 0 })
    }, RENDER_DELAY)
  }
}

/** Imports the given text or html into the given items */
export const importText = (itemsRanked, inputText) => {

  const hasLines = /<li|p>.*<\/li|p>/mi.test(inputText)

  // true plaintext won't have any <li>'s or <p>'s
  // transform newlines in plaintext into <li>'s
  const text = !hasLines
    ? inputText
      .split('\n')
      .filter(s => s.trim())
      .map(line => `<li>${line}</li>`)
      .join('')
    // if it's an entire HTML page, ignore everything outside the body tags
    : inputText.replace(/[\s\S]*<body>([\s\S]+?)<\/body>[\s\S]*/gmi, (input, bodyContent) => bodyContent)

  const numLines = (text.match(/<li>/gmi) || []).length

  const importCursor = intersections(itemsRanked)
  const updates = {}
  const contextChildrenUpdates = {}
  const context = unrank(intersections(itemsRanked))
  const destSig = signifier(itemsRanked)
  const destKey = destSig.key
  const destRank = destSig.rank
  const destEmpty = destKey === '' && getChildrenWithRank(itemsRanked).length === 0
  const state = store.getState()
  const data = Object.assign({}, state.data)

  // if we are only importing a single line of text, then simply modify the current thought
  if (numLines === 1) {
    const focusOffset = window.getSelection().focusOffset
    const newText = (destKey !== '' ? ' ': '') + strip(text)
    const selectedText = window.getSelection().toString()

    const newValue = destKey.slice(0, focusOffset) + newText + destKey.slice(focusOffset + selectedText.length)

    store.dispatch({
      type: 'existingItemChange',
      oldValue: destKey,
      newValue,
      context: rootedIntersections(unrank(itemsRanked)),
      itemsRanked: itemsRanked
    })

    setTimeout(() => {
      restoreSelection(intersections(itemsRanked).concat({ key: newValue, rank: destRank }), { offset: focusOffset + newText.length})
    })
  }
  else {

    // keep track of the last thought of the first level, as this is where the selection will be restored to
    let lastThoughtFirstLevel

    // if the item where we are pasting is empty, replace it instead of adding to it
    if (destEmpty) {
      updates[''] = data[''] && data[''].memberOf && data[''].memberOf.length > 1
        ? removeContext(data[''], context, sigRank(itemsRanked))
        : null
      const contextEncoded = encodeItems(unrank(rootedIntersections(itemsRanked)))
      contextChildrenUpdates[contextEncoded] = (state.contextChildren[contextEncoded] || [])
        .filter(child => !equalItemRanked(child, destSig))
    }

    // paste after last child of current item
    let rank = getRankAfter(itemsRanked)
    const next = nextSibling(itemsRanked)
    const rankIncrement = next ? (next.rank - rank) / numLines : 1
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
          if (importCursor.length === itemsRanked.length - 1) {
            lastThoughtFirstLevel = { key: value, rank }
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
          rank += rankIncrement
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
          intersections(itemsRanked).concat(lastThoughtFirstLevel),
          { offset: lastThoughtFirstLevel.key.length }
        )
      }
    })
  }
}

/** Returns an array of { text, numContexts, charIndex } objects consisting of the largest contiguous linked or unlinked subthoughts of the given text.
 * @param text Thought text.
 * @param numWords Maximum number of words in a subphrase
*/
export const getSubthoughts = (text, numWords, { data=store.getState().data } = {}) => {

  const words = text.split(' ')

  // the list of subthoughts that are recursively decomposed
  const subthoughts = []

  // keep track of the starting index of the most recent unlinked (no other contexts) subthought
  // this allows the largest unlinked subthought to be
  let unlinkedStart = 0

  // keep track of the character index which will be passed in the result object for each subthought
  let charIndex = 0

  /** recursively decoposes the current unlinked subthought */
  const pushUnlinkedSubthoughts = wordIndex => {
    if (unlinkedStart < wordIndex) {
      const subthought = words.slice(unlinkedStart, wordIndex).join(' ')
      subthoughts.push(numWords > 1
        // RECURSION
        ? getSubthoughts(subthought, numWords - 1, { data })
        : {
          text: subthought,
          contexts: [],
          index: charIndex - subthought.length - 1
        }
      )
    }
  }


  // loop through each subthought of the given phrase size (numWords)
  for (let i=0; i<=words.length - numWords; i++) {

    const subthought = words.slice(i, i + numWords).join(' ')
    if (subthought.length > 0) {
      const contexts = getContexts(stripPunctuation(subthought), data)

      if (contexts.length > 0) {

        // decompose previous unlinked subthought
        pushUnlinkedSubthoughts(i)

        // subthought with other contexts
        subthoughts.push({
          text: subthought,
          contexts,
          index: charIndex
        })

        i += numWords - 1
        unlinkedStart = i + numWords
      }
    }

    charIndex += subthought.length + 1
  }

  // decompose final unlinked subthought
  pushUnlinkedSubthoughts(words.length)

  return flatten(subthoughts)
}

export const logout = () => {
  store.dispatch({ type: 'clear' })
  updateUrlHistory(RANKED_ROOT)
  window.firebase.auth().signOut()
}

export const login = () => {
  const firebase = window.firebase
  const provider = new firebase.auth.GoogleAuthProvider();
  store.dispatch({ type: 'status', value: 'connecting' })
  firebase.auth().signInWithRedirect(provider)
}

/** Updates local state with newly authenticated user. */
export const userAuthenticated = user => {

  const firebase = window.firebase

  // once authenticated, disable offline mode timer
  window.clearTimeout(globals.offlineTimer)

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
      Object.assign(globals.queuePreserved, JSON.parse(localStorage.queue))
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
      if (globals.queuePreserved && Object.keys(globals.queuePreserved).length > 0) {
        syncRemote(Object.assign({
          lastClientId: clientId,
          lastUpdated: timestamp()
        }, globals.queuePreserved))
        globals.queuePreserved = {}
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

export const initEvents = () => {
  // prevent browser from restoring the scroll position so that we can do it manually
  window.history.scrollRestoration = 'manual'

  window.addEventListener('keydown', handleKeyboard)

  window.addEventListener('popstate', () => {
    const { itemsRanked, contextViews } = decodeItemsUrl(window.location.pathname, store.getState().data)
    store.dispatch({ type: 'setCursor', itemsRanked, replaceContextViews: contextViews })
    restoreSelection(itemsRanked)
    translateContentIntoView(store.getState().cursor)
  })

  // disabled until ngram linking is implemented
  // document.addEventListener('selectionchange', () => {
  //   const focusOffset = window.getSelection().focusOffset
  //   store.dispatch({
  //     type: 'selectionChange',
  //     focusOffset
  //   })
  // })
}

// Allow a focus to be set asynchronously on mobile
// See: https://stackoverflow.com/a/45703019/480608
export function AsyncFocus() {

  // create invisible dummy input to receive the focus
  const hiddenInput = document.createElement('input')
  hiddenInput.setAttribute('type', 'text')
  hiddenInput.style.position = 'absolute'
  hiddenInput.style.opacity = 0
  hiddenInput.style.height = 0

  // disable auto zoom
  // See: https://stackoverflow.com/questions/2989263/disable-auto-zoom-in-input-text-tag-safari-on-iphone
  hiddenInput.style.fontSize = '16px'

  return {

    // move focus to hidden input
    enable: () => {
      // no need to hidden a focus if there already is one
      if (document.activeElement !== document.body) return

      // prepend to body and focus
      document.body.prepend(hiddenInput)
      hiddenInput.focus()
    },

    // remove hidden input (not recommended; instead reuse enable)
    cleanup: () => {
      hiddenInput.remove()
    }

  }
}

/** Adds commas to a number */
// TODO: Localize
export const formatNumber = n => {
  let s = ''
  const digits = n.toString()
  for (let i=0; i<digits.length; i++) {
    s = digits[digits.length - 1 - i] + s
    if (i%3 === 2 && i < digits.length - 1) {
      s = ',' + s
    }
  }
  return s
}

export const decodeCharacterEntities = s => s
  .replace(/&amp;/gi, '&')
  .replace(/&gt;/gi, '<')
  .replace(/&gt;/gi, '>')

/* Navigates home and resets the scroll position */
export const home = () => {
  store.dispatch({ type: 'setCursor', itemsRanked: null, cursorHistoryClear: true })
  window.scrollTo(0, 0)
  resetTranslateContentIntoView()
}

/** Returns true if the tutorial is active. */
export const isTutorial = () =>
  store.getState().settings.tutorialStep !== TUTORIAL_STEP_NONE

/** Join a list of strings with "," and insert the given conjunction (default: 'and') before the last string. */
export const joinConjunction = (arr, conjunction = 'and') =>
  arr.length === 0 ? ''
  : arr.length === 1 ? arr[0]
  : arr.slice(0, arr.length - 1).join(', ') + (arr.length === 2 ? '' : ',') + ` ${conjunction} ` + arr[arr.length - 1]

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
      dark: JSON.parse(localStorage['settings-dark'] || 'true'),
      autologin: JSON.parse(localStorage['settings-autologin'] || 'false'),
      tutorialChoice: +(localStorage['settings-tutorialChoice'] || 0),
      tutorialStep: globals.disableTutorial ? TUTORIAL_STEP_NONE : JSON.parse(localStorage['settings-tutorialStep'] || TUTORIAL_STEP_START),
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
  const helpers = ['welcome', 'help', 'home', 'newItem', 'newChild', 'newChildSuccess', 'autofocus', 'superscriptSuggestor', 'superscript', 'contextView', 'editIdentum', 'depthBar', 'feedback']
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

  return state
}

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

/** Shortcut for sync with single item. */
export const syncOne = (item, contextChildrenUpdates={}, options) => {
  sync({
    [item.value]: item
  }, contextChildrenUpdates, options)
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
    if (dataUpdates[key]) {
      localStorage['data-' + key] = JSON.stringify(dataUpdates[key])
    }
    else {
      delete localStorage['data-' + key]
    }
    localStorage.lastUpdated = lastUpdated
  }

  for (let contextEncoded in contextChildrenUpdates) {
    const children = contextChildrenUpdates[contextEncoded]
      .filter(child => !data[child.key] && !dataUpdates[child.key])
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
