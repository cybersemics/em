import { isMobile } from './browser.js'
import { NUMBERS } from './constants.js'
import { ROOT_TOKEN } from './constants.js'

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
  const lower = x => x && x.toLowerCase ? x.toLowerCase() : x
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
  return Object.assign({}, item, {
      memberOf: item.memberOf ? item.memberOf.filter(parent =>
        !(equalArrays(parent.context, context) && (rank == null || parent.rank === rank))
      ) : [],
      lastUpdated: timestamp()
    })
}

/** Returns a new item plus the given context. Does not add duplicates. */
export const addContext = (item, context, rank) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return Object.assign({}, item, {
      memberOf: (item.memberOf || [])
        .filter(parent =>
          !(equalArrays(parent.context, context) && parent.rank === rank)
        )
        .concat({ context, rank }),
      lastUpdated: timestamp()
    })
}

/** Returns a new item that has been moved either between contexts or within a context (i.e. changed rank) */
export const moveItem = (item, oldContext, newContext, oldRank, newRank) => {
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
export const rankItemsSequential =items =>
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
  contentEl.style.transform = `translate3d(0,0,0)`
  contentEl.style.marginBottom = `0`
}

/** Positions the content so the parent of the cursor is in the top specified portion of the viewport.
   This is needed to hide all of the empty space created by the autofocus.
*/
export const translateContentIntoView = (itemsRanked, { top = 0.25, scrollIntoViewOptions } = {}) => {

  if (itemsRanked && itemsRanked.length > 1) {

    const editingEl = editableNode(itemsRanked)

    // shim for mobile
    // since autoscrolling happens when editables are focused on mobile, the content's vertical position needs to be an invariant otherwise it feels too jumpy
    // instead, use scrollIntoView only if out of view
    // Note: Mobile currently autoscrolls to the focused editable anyway
    if (isMobile) {
      scrollIntoViewIfNeeded(editingEl, Object.assign({ block: 'center', behavior: 'auto' }, scrollIntoViewOptions))
    }
    else {
      const contentEl = document.getElementById('content')
      if (!editingEl) return

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

