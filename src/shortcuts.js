/** Defines global keyboard shortcuts and gestures. */

import { isMobile, isMac } from './browser.js'
import { store } from './store.js'
import { tutorialNext } from './action-creators/tutorial.js'
import globals from './globals.js'

// constants
import {
  RANKED_ROOT,
  RENDER_DELAY,
  ROOT_TOKEN,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
} from './constants.js'

// util
import {
  AsyncFocus,
  cursorForward,
  deleteItem,
  exit,
  getChildrenWithRank,
  getNextRank,
  getRankAfter,
  home,
  intersections,
  isContextViewActive,
  lastItemsFromContextChain,
  newItem,
  nextEditable,
  prevEditable,
  prevSibling,
  restoreCursorBeforeSearch,
  restoreSelection,
  rootedIntersections,
  selectNextEditable,
  selectPrevEditable,
  sigKey,
  signifier,
  sigRank,
  splitChain,
  unrank,
  unroot,
} from './util.js'

// weird that we have to inline perma since all of the util functions are initially undefined when globalShortcuts gets initiated
/** Returns a function that calls the given function once then returns the same result forever */
function perma(f) {
  let result = null
  return (...args) => result || (result = f(...args))
}

const asyncFocus = AsyncFocus()

/* Map global keyboard shortcuts and gestures to commands */
// define globalShortcuts as a function to avoid import timing issues
export const globalShortcuts = perma(() => [

  {
    id: 'cursorBack',
    name: 'Move Cursor: Up a level',
    gesture: 'r',
    keyboard: 'Escape',
    exec: exit
  },

  {
    id: 'cursorForward',
    name: 'Move Cursor: Down a level',
    gesture: 'l',
    exec: cursorForward
  },

  {
    id: 'delete',
    name: 'Delete',
    description: 'Delete the current thought.',
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
    id: 'deleteEmptyThought',
    name: 'Delete Empty Thought',
    keyboard: { key: 'Backspace' },
    hideFromInstructions: true,
    exec: e => {
      const { cursor, contextViews, editing } = store.getState()
      const offset = window.getSelection().focusOffset

      if (cursor) {
        const showContexts = isContextViewActive(unrank(intersections(cursor)), { state: store.getState() })
        const contextChain = splitChain(cursor, contextViews)
        const itemsRanked = lastItemsFromContextChain(contextChain)
        const children = getChildrenWithRank(itemsRanked)

        if (sigKey(cursor) === '' && children.length === 0) {
          deleteItem()
        }
        else if (offset === 0 && !showContexts) {
          const key = sigKey(cursor)
          const rank = sigRank(cursor)
          const items = unrank(itemsRanked)
          const context = items.length > 1 ? intersections(items) : [ROOT_TOKEN]
          const prev = prevSibling(key, rootedIntersections(cursor), rank)

          if (prev) {

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
    id: 'newThought',
    name: 'New Thought',
    description: 'Create a new thought.',
    keyboard: { key: 'Enter' },
    gesture: 'rd',
    exec: (e, { type }) => {
      const { cursor, contextViews, settings: { tutorialStep } = {} } = store.getState()

      if (
        // cancel if tutorial has just started
        tutorialStep === TUTORIAL_STEP_START ||
        // cancel if invalid New Uncle
        ((e.metaKey || e.ctrlKey) && e.altKey && (!cursor || cursor.length <= 1))
      ) return

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
          insertNewChild: (e.metaKey || e.ctrlKey) && !e.altKey,
          // new item above
          insertBefore: e.shiftKey,
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

      if (cursor && sigKey(cursor).length > 0 &&
        (tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_ENTER ||
        tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT_ENTER)) {
        clearTimeout(globals.newChildHelperTimeout)
        tutorialNext()
      }
    }
  },

  {
    id: 'newThoughtAbove',
    name: 'New Thought Above',
    description: 'Create a new thought immediately above the current thought.',
    gesture: 'rul',
    // do not define keyboard, since the actual behavior is handled by newThought
    keyboardLabel: { key: 'Enter', shift: true },
    exec: () => {
      newItem({ insertBefore: true })
    }
  },

  {
    id: 'newSubthought',
    name: 'New Subhought',
    description: 'Create a new subthought in the current thought. Add it to the bottom of any existing subthoughts.',
    gesture: 'rdr',
    // do not define keyboard, since the actual behavior is handled by newThought
    keyboardLabel: { key: 'Enter', meta: true },
    exec: () => newItem({ insertNewChild: true })
  },

  {
    id: 'newSubthoughtTop',
    name: 'New Subthought (top)',
    description: 'Create a new subthought in the current thought. Add it to the top of any existing subthoughts.',
    gesture: 'rdu',
    // do not define keyboard, since the actual behavior is handled by newThought
    keyboardLabel: { key: 'Enter', shift: true, meta: true },
    exec: () => {
      newItem({ insertNewChild: true, insertBefore: true })
    }
  },

  // NOTE: The keyboard shortcut for New Uncle handled in New Item command until it is confirmed that shortcuts are evaluated in the correct order
  {
    id: 'newUncle',
    name: 'New Thought After Parent',
    description: `Add a new thought to the context that immediately follows the current thought's context. It's like creating a new thought and then de-indenting it.`,
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
    id: 'subcategorizeOne',
    name: 'Subcategorize One',
    description: `Insert the current thought into a new context one level up.`,
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
    id: 'subcategorizeAll',
    name: 'Subcategorize All',
    description: `Insert all thoughts in the current context into a new context one level up.`,
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
    id: 'toggleContextView',
    name: 'Toggle Context View',
    description: 'Open the context view of the current thought in order to see all of the different contexts in which that thought can be found. Use the same shortcut to close the context view.',
    gesture: 'ru',
    keyboard: { key: 'c', shift: true, meta: true },
    exec: () => store.dispatch({ type: 'toggleContextView' })
  },

  {
    id: 'cursorDown',
    name: 'Cursor Down',
    keyboard: { key: 'ArrowDown', meta: true },
    hideFromInstructions: true,
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
    id: 'cursorNextThought',
    name: 'Cursor Next Thought',
    description: 'Move the cursor to the next thought, skipping expanded children.',
    keyboard: 'ArrowDown',
    exec: () => {
      const { cursor } = store.getState()

      // select next editable
      if (cursor) {
        const next = nextEditable(cursor)
        if (next) {
          next.focus()
        }
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
    id: 'cursorUp',
    name: 'Cursor Up',
    keyboard: { key: 'ArrowUp', meta: true },
    hideFromInstructions: true,
    exec: e => {
      selectPrevEditable(e.target)
    }
  },

  {
    id: 'cursorPrev',
    name: 'Cursor Previous Item',
    description: 'Move cursor to previous thought, skipping expanded children.',
    gesture: 'lur',
    keyboard: 'ArrowUp',
    exec: () => {
      const { cursor } = store.getState()
      const prev = prevEditable(cursor)
      if (prev) {
        prev.focus()
      }
    }
  },

  {
    id: 'toggleCodeView',
    name: 'Toggle Code View',
    description: 'Open a code view that allows input of queries from which a context\'s children will be generated dynamically. Use the same shortcut to close the code view.',
    keyboard: { key: 'e', shift: true, meta: true },
    exec: () => {
      const state = store.getState()
      if (state.cursor) {
        store.dispatch({ type: 'toggleCodeView' })
      }
    }
  },

  {
    id: 'search',
    name: 'Search',
    description: 'Open the Search input. Use the same shortcut to close.',
    gesture: 'rl',
    keyboard: { key: 'f', shift: true, meta: true },
    exec: () => {
      const state = store.getState()
      store.dispatch({ type: 'search', value: state.search == null ? window.getSelection().toString() : null })

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
    id: 'indent',
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
    id: 'outdent',
    name: 'De-indent',
    description: `Move the current thought to the next sibling of its context. Really should be called "dedent".`,
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
  },

  {
    id: 'home',
    name: 'Home',
    description: 'Navigate to Home.',
    keyboard: { key: 'h', shift: true, meta: true },
    exec: home
  },

  {
    id: 'openShortcutPopup',
    name: 'Open Shortcut Popup',
    description: `Open the help screen which contains the tutorials and a list of all ${isMobile ? 'gestures' : 'keyboard shortcuts'}.`,
    keyboard: { key: '/', meta: true },
    exec: e => {
      window.scrollTo(0, 0)
      store.dispatch({ type: 'showHelper', id: 'shortcuts' })
    }
  },

  {
    id: 'bindContext',
    name: 'Bind two different contexts of a thought so that they always have the same children.',
    gesture: 'rud',
    keyboard: { key: 'b', shift: true, meta: true },
    exec: () => {
      store.dispatch({ type: 'toggleBindContext' })
    }
  },

]

// ensure modified shortcuts are checked before unmodified
// sort the original list to avoid performance hit in handleKeyboard
.sort((a, b) =>
  a.keyboard &&
  b.keyboard &&
  ((a.keyboard.meta && !b.keyboard.meta) ||
   (a.keyboard.alt && !b.keyboard.alt) ||
   (a.keyboard.shift && !b.keyboard.shift)) ? -1 : 1
))

export const handleGesture = (gesture, e) => {

  // disable when welcome, shortcuts, or feeback helpers are displayed, a drag is in progress, or focus has been disabled
  const state = store.getState()
  if (state.showHelper === 'welcome' || state.showHelper === 'shortcuts' || state.showHelper === 'feedback' || state.dragInProgress) return

  const shortcut = globalShortcuts().find(shortcut => shortcut.gesture === gesture)
  if (shortcut) {
    shortcut.exec(e, { type: 'gesture' })
  }
}

export const handleKeyboard = e => {

  // disable when welcome, shortcuts, or feeback helpers are displayed
  const state = store.getState()
  if (state.showHelper === 'welcome' || state.showHelper === 'shortcuts' || state.showHelper === 'feedback') return

  const shortcut = globalShortcuts().find(shortcut =>
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
  e.allowDefault = () => isAllowDefault = true // eslint-disable-line no-return-assign
  if (shortcut) {
    shortcut.exec(e, { type: 'keyboard' })
    if (!isAllowDefault) {
      e.preventDefault()
    }
  }
}

/** Converts a gesture letter or event key of an arrow key to an arrow utf8 character. Defaults to input. */
const arrowTextToArrowCharacter = str => ({
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓'
}[str] || str)

export const formatKeyboardShortcut = keyboard => {
  const key = keyboard.key || keyboard
  return (keyboard.meta ? (isMac ? 'Command' : 'Ctrl') + ' + ' : '') +
    (keyboard.control ? 'Control + ' : '') +
    (keyboard.option ? 'Option + ' : '') +
    (keyboard.shift ? 'Shift + ' : '') +
    arrowTextToArrowCharacter(keyboard.shift && key.length === 1 ? key.toUpperCase() : key)
}

export const shortcutById = id => globalShortcuts().find(shortcut => shortcut.id === id)
