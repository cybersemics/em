/** Defines global keyboard shortcuts and gestures. */

import { isMac } from './browser.js'
import { store } from './store.js'

// constants
import {
  GESTURE_SEGMENT_HINT_TIMEOUT
} from './constants.js'

import bindContext from './shortcuts/bindContext.js'
import cursorBack from './shortcuts/cursorBack.js'
import cursorDown from './shortcuts/cursorDown.js'
import cursorForward from './shortcuts/cursorForward.js'
import cursorNextThought from './shortcuts/cursorNextThought.js'
import cursorPrev from './shortcuts/cursorPrev.js'
import cursorUp from './shortcuts/cursorUp.js'
import deleteEmptyThought from './shortcuts/deleteEmptyThought.js'
import deleteThought, { deleteAliases } from './shortcuts/delete.js'
import exportContext from './shortcuts/exportContext.js'
import home from './shortcuts/home.js'
import indent from './shortcuts/indent.js'
import moveThoughtDown from './shortcuts/moveThoughtDown.js'
import moveThoughtUp from './shortcuts/moveThoughtUp.js'
import newSubthought, { newSubthoughtAliases } from './shortcuts/newSubthought.js'
import newSubthoughtTop from './shortcuts/newSubthoughtTop.js'
import newThought, { newThoughtAliases } from './shortcuts/newThought.js'
import newThoughtAbove from './shortcuts/newThoughtAbove.js'
import newUncle from './shortcuts/newUncle.js'
import openShortcutPopup from './shortcuts/openShortcutPopup.js'
import outdent from './shortcuts/outdent.js'
import search from './shortcuts/search.js'
import subcategorizeAll from './shortcuts/subcategorizeAll.js'
import subcategorizeOne from './shortcuts/subcategorizeOne.js'
import toggleCodeView from './shortcuts/toggleCodeView.js'
import toggleContextView from './shortcuts/toggleContextView.js'
import toggleProseView from './shortcuts/toggleProseView.js'
import toggleTableView from './shortcuts/toggleTableView.js'
import undo from './shortcuts/undo'
import redo from './shortcuts/redo'

// weird that we have to inline perma since all of the util functions are initially undefined when globalShortcuts gets initiated
/** Returns a function that calls the given function once then returns the same result forever */
function perma(f) {
  let result = null // eslint-disable-line fp/no-let
  return (...args) => result || (result = f(...args))
}

/* Map global keyboard shortcuts and gestures to commands */
// define globalShortcuts as a function to avoid import timing issues
export const globalShortcuts = perma(() => [ // eslint-disable-line fp/no-mutating-methods

  cursorNextThought, // must go BEFORE cursorDown so keyboard shortucts take precedence

  bindContext,
  cursorBack,
  cursorDown,
  cursorForward,
  cursorPrev,
  cursorUp,
  deleteAliases,
  deleteEmptyThought,
  deleteThought,
  exportContext,
  home,
  indent,
  moveThoughtDown,
  moveThoughtUp,
  newSubthought,
  newSubthoughtAliases,
  newSubthoughtTop,
  newThought,
  newThoughtAbove,
  newThoughtAliases,
  newUncle,
  openShortcutPopup,
  outdent,
  search,
  subcategorizeAll,
  subcategorizeOne,
  toggleCodeView,
  toggleContextView,
  toggleProseView,
  toggleTableView,
  undo,
  redo,
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

let handleGestureSegmentTimeout // eslint-disable-line fp/no-let

export const handleGestureSegment = (g, sequence, e) => {

  const state = store.getState()
  const { toolbarOverlay, scrollPrioritized } = state

  if (toolbarOverlay || scrollPrioritized) return

  // disable when modal is displayed or a drag is in progress
  if (state.showModal || state.dragInProgress) return

  const shortcut = globalShortcuts().find(shortcut => [].concat(shortcut.gesture).includes(sequence))

  // display gesture hint
  clearTimeout(handleGestureSegmentTimeout)
  handleGestureSegmentTimeout = setTimeout(
    () => {
      store.dispatch({
        type: 'alert',
        // only show "Invalid gesture" if hint is already being shown
        value: shortcut ? shortcut.name
          : state.alert ? '✗ Invalid gesture'
            : null
      })
    },
    // if the hint is already being shown, do not wait to change the value
    state.alert ? 0 : GESTURE_SEGMENT_HINT_TIMEOUT
  )
}

export const handleGestureEnd = (gesture, e) => {
  const state = store.getState()
  const { scrollPrioritized } = state

  if (scrollPrioritized) return

  // disable when modal is displayed or a drag is in progress
  if (gesture && !state.showModal && !state.dragInProgress) {
    const shortcut = globalShortcuts().find(shortcut => [].concat(shortcut.gesture).includes(gesture))
    if (shortcut) {
      shortcut.exec(e, { type: 'gesture' })
    }
  }

  // clear gesture hint
  clearTimeout(handleGestureSegmentTimeout)
  handleGestureSegmentTimeout = null // null the timer to track when it is running for handleGestureSegment

  // needs to be delayed until the next tick otherwise there is a re-render which inadvertantly calls the automatic render focus in the Thought component.
  setTimeout(() => {
    store.dispatch({
      type: 'alert',
      value: null
    })
  })
}

export const handleKeyboard = (e) => {
  const state = store.getState()
  const { toolbarOverlay, scrollPrioritized } = state

  if (toolbarOverlay || scrollPrioritized) return

  // disable when welcome, shortcuts, or feeback modals are displayed
  if (state.showModal === 'welcome' || state.showModal === 'help' || state.showModal === 'feedback') return

  const shortcut = globalShortcuts().find(shortcut =>
    shortcut.keyboard &&
    (shortcut.keyboard.key || shortcut.keyboard).toLowerCase() === e.key.toLowerCase() &&
    // either the modifier is pressed, or it is not necessary
    (!shortcut.keyboard.meta || (e.metaKey || e.ctrlKey)) &&
    (!shortcut.keyboard.alt || e.altKey) &&
    (!shortcut.keyboard.shift || e.shiftKey)
  )

  // execute the shortcut if it exists
  // preventDefault by default, unless e.allowDefault() is called
  let isAllowDefault = false // eslint-disable-line fp/no-let
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
