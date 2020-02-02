/** Defines global keyboard shortcuts and gestures. */

import { isMac } from './browser.js'
import { store } from './store.js'

// constants
import {
  GESTURE_SEGMENT_HINT_TIMEOUT,
} from './constants.js'

import * as shortcutObject from './shortcuts/index.js'
export const globalShortcuts = Object.values(shortcutObject)

/* Hash all the properties of a shortcut into a string */
const hashShortcut = shortcut =>
  (shortcut.keyboard.meta ? 'meta_' : '') +
  (shortcut.keyboard.alt ? 'alt_' : '') +
  (shortcut.keyboard.shift ? 'shift_' : '') +
  (shortcut.keyboard.key || shortcut.keyboard).toLowerCase()

/* Hash all the properties of a keydown event into a string that matches hashShortcut */
const hashKeyDown = e =>
  (e.metaKey || e.ctrlKey ? 'meta_' : '') +
  (e.altKey ? 'alt_' : '') +
  (e.shiftKey ? 'shift_' : '') +
  e.key.toLowerCase()

// index shortcuts for O(1) lookup
const shortcutKeyIndex = globalShortcuts.reduce((accum, shortcut) => shortcut.keyboard
  ? {
    ...accum,
    [hashShortcut(shortcut)]: shortcut
  }
  : accum,
  {}
)

let handleGestureSegmentTimeout // eslint-disable-line fp/no-let

export const handleGestureSegment = (g, sequence, e) => {

  const state = store.getState()
  const { toolbarOverlay, scrollPrioritized } = state

  if (toolbarOverlay || scrollPrioritized) return

  // disable when modal is displayed or a drag is in progress
  if (state.showModal || state.dragInProgress) return

  const shortcut = globalShortcuts.find(shortcut => [].concat(shortcut.gesture).includes(sequence))

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
    const shortcut = globalShortcuts.find(shortcut => [].concat(shortcut.gesture).includes(gesture))
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

  const shortcut = shortcutKeyIndex[hashKeyDown(e)]

  // execute the shortcut if it exists
  if (shortcut) {
    // preventDefault by default, unless e.allowDefault() is called
    let isAllowDefault = false // eslint-disable-line fp/no-let
    e.allowDefault = () => isAllowDefault = true // eslint-disable-line no-return-assign
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

export const shortcutById = id => globalShortcuts.find(shortcut => shortcut.id === id)
