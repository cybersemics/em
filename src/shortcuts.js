/** Defines global keyboard shortcuts and gestures. */

import { isMac } from './browser'
import { store } from './store'
import globals from './globals'
import alert from './action-creators/alert'

import Emitter from 'emitter20'

// constants
import {
  GESTURE_SEGMENT_HINT_TIMEOUT,
} from './constants'

import * as shortcutObject from './shortcuts/index'
export const globalShortcuts = Object.values(shortcutObject)

export const shortcutEmitter = new Emitter()

/* A mapping of uppercase letters to char codes. Use with e.keyCode.
  {
    65: 'A',
    66: 'B',
    67: 'C',
    ...
  }
*/
const letters = Array(26).fill(0)
  .reduce((accum, n, i) => ({
    ...accum,
    [65 + i]: String.fromCharCode(65 + i).toUpperCase()
  }), {})

/* Hash all the properties of a shortcut into a string */
const hashShortcut = shortcut =>
  (shortcut.keyboard.meta ? 'META_' : '') +
  (shortcut.keyboard.alt ? 'ALT_' : '') +
  (shortcut.keyboard.shift ? 'SHIFT_' : '') +
  (shortcut.keyboard.key || shortcut.keyboard).toUpperCase()

/* Hash all the properties of a keydown event into a string that matches hashShortcut */
const hashKeyDown = e =>
  (e.metaKey || e.ctrlKey ? 'META_' : '') +
  (e.altKey ? 'ALT_' : '') +
  (e.shiftKey ? 'SHIFT_' : '') +
  // for some reason, e.key returns 'Dead' in some cases, perhaps because of alternate keyboard settings
  // e.g. alt + meta + n
  // use e.keyCode if available instead
  (letters[e.keyCode] || e.key).toUpperCase()

// index shortcuts for O(1) lookup by keyboard
const shortcutKeyIndex = globalShortcuts.reduce((accum, shortcut) => shortcut.keyboard
  ? {
    ...accum,
    [hashShortcut(shortcut)]: shortcut
  }
  : accum,
{}
)

// index shortcuts for O(1) lookup by id
const shortcutIdIndex = globalShortcuts.reduce((accum, shortcut) => shortcut.id
  ? {
    ...accum,
    [shortcut.id]: shortcut
  }
  : accum,
{}
)

// index shortcuts for O(1) lookup by gesture
const shortcutGestureIndex = globalShortcuts.reduce((accum, shortcut) => shortcut.gesture
  ? {
    ...accum,
    // shortcut.gesture may be a string or array of strings
    // normalize intro array of strings
    ...[].concat(shortcut.gesture)
      .reduce((accumInner, gesture) => ({
        ...accumInner,
        [gesture]: shortcut
      }), {})
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

  const shortcut = shortcutGestureIndex[sequence]

  // display gesture hint
  clearTimeout(handleGestureSegmentTimeout)
  handleGestureSegmentTimeout = setTimeout(
    () => {
      // only show "Invalid gesture" if hint is already being shown
      alert(shortcut ? shortcut.name
        : state.alert ? '✗ Invalid gesture'
        : null, { showCloseLink: false })
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
    const shortcut = shortcutGestureIndex[gesture]
    if (shortcut) {
      shortcutEmitter.trigger('shortcut', shortcut)
      shortcut.exec(e, store.dispatch, store.getState, { type: 'gesture' })
    }
  }

  // clear gesture hint
  clearTimeout(handleGestureSegmentTimeout)
  handleGestureSegmentTimeout = null // null the timer to track when it is running for handleGestureSegment

  // needs to be delayed until the next tick otherwise there is a re-render which inadvertantly calls the automatic render focus in the Thought component.
  setTimeout(() => alert(null))
}

/** Global keyUp handler */
export const keyUp = e => {
  // track meta key for expansion algorithm
  if (e.key === (isMac ? 'Meta' : 'Control')) {
    const state = store.getState()
    globals.suppressExpansion = false
    // trigger re-expansion
    // preserve noteFocus
    store.dispatch({ type: 'setCursor', thoughtsRanked: state.cursor, noteFocus: state.noteFocus })
  }
}

/** Global keyDown handler */
export const keyDown = e => {
  const state = store.getState()
  const { toolbarOverlay, scrollPrioritized } = state

  // track meta key for expansion algorithm
  if (!(isMac ? e.metaKey : e.ctrlKey)) {
    globals.suppressExpansion = false
  }

  if (toolbarOverlay || scrollPrioritized) return

  // disable when welcome, shortcuts, or feeback modals are displayed
  if (state.showModal === 'welcome' || state.showModal === 'help' || state.showModal === 'feedback') return

  const shortcut = shortcutKeyIndex[hashKeyDown(e)]

  // execute the shortcut if it exists
  if (shortcut) {

    shortcutEmitter.trigger('shortcut', shortcut)

    if (!shortcut.canExecute || shortcut.canExecute(store.getState, e)) {
      e.preventDefault()
      shortcut.exec(store.dispatch, store.getState, e, { type: 'keyboard' })
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

export const shortcutById = id => shortcutIdIndex[id]
