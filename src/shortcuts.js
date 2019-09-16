import * as AsyncFocus from './async-focus.js'
import { clientId, isMac, isMobile } from './browser.js'
import { store } from './store.js'

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

/* Map global keyboard shortcuts and gestures to commands */
export const globalShortcuts = [

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

export const handleGesture = (gesture, e) => {

  // disable when welcome, shortcuts, or feeback helpers are displayed, a drag is in progress, or focus has been disabled
  const state = store.getState()
  if (state.showHelper === 'welcome' || state.showHelper === 'shortcuts' || state.showHelper === 'feedback' || state.dragInProgress) return

  const shortcut = globalShortcuts.find(shortcut => shortcut.gesture === gesture)
  if (shortcut) {
    shortcut.exec(e, { type: 'gesture' })
  }
}

export const handleKeyboard = e => {

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
export const lettersToArrow = str => ({
  l: '←',
  r: '→',
  u: '↑',
  d: '↓',
  ArrowUp: '↑',
  ArrowDown: '↓'
}[str] || str)

export const formatKeyboardShortcut = keyboard =>
  (keyboard.meta ? '⌘ + ' : '') +
  (keyboard.control ? '⌃ + ' : '') +
  (keyboard.option ? '⌥ + ' : '') +
  (keyboard.shift ? '⇧ + ' : '') +
  lettersToArrow(keyboard.key || keyboard)

