import './constants.js'

import {
  ROOT_TOKEN,
} from './constants.js'

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

export const escapeRegExp = s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

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

