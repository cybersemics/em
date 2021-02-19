/** Defines global keyboard shortcuts and gestures. */

import Emitter from 'emitter20'
import { Store } from 'redux'
import { isMac, isTouch } from './browser'
import globals from './globals'
import { alert, suppressExpansion, toggleTopControlsAndBreadcrumbs } from './action-creators'
import { GESTURE_SEGMENT_HINT_TIMEOUT } from './constants'
import { State } from './util/initialState'
import { keyValueBy } from './util/keyValueBy'
import { GestureResponderEvent } from 'react-native'
import { Direction, GesturePath, Index, Key, Shortcut } from './types'

import * as shortcutObject from './shortcuts/index'
export const globalShortcuts = Object.values(shortcutObject) as Shortcut[]

export const shortcutEmitter = new Emitter()

/* A mapping of uppercase letters to char codes. Use with e.keyCode.
 * {
 *   65: 'A',
 *   66: 'B',
 *   67: 'C',
 *   ...
 * }
 */
const letters = keyValueBy(Array(26).fill(0), (n, i) => ({
  [65 + i]: String.fromCharCode(65 + i).toUpperCase()
}))

/** Hash all the properties of a shortcut into a string. */
const hashShortcut = (shortcut: Shortcut): string => {
  const keyboard = typeof shortcut.keyboard === 'string'
    ? { key: shortcut.keyboard }
    : shortcut.keyboard || {} as Key
  return (keyboard.meta ? 'META_' : '') +
    (keyboard.alt ? 'ALT_' : '') +
    (keyboard.shift ? 'SHIFT_' : '') +
    keyboard.key?.toUpperCase()
}

/** Hash all the properties of a keydown event into a string that matches hashShortcut. */
const hashKeyDown = (e: KeyboardEvent) =>
  (e.metaKey || e.ctrlKey ? 'META_' : '') +
  (e.altKey ? 'ALT_' : '') +
  (e.shiftKey ? 'SHIFT_' : '') +
  // for some reason, e.key returns 'Dead' in some cases, perhaps because of alternate keyboard settings
  // e.g. alt + meta + n
  // use e.keyCode if available instead
  (letters[e.keyCode] || e.key).toUpperCase()

/** Initializes shortcut indices and stores conflicts. */
const index = (): {
  shortcutKeyIndex: Index<Shortcut>,
  shortcutIdIndex: Index<Shortcut>,
  shortcutGestureIndex: Index<Shortcut>,
  } => {

  // index shortcuts for O(1) lookup by keyboard
  const shortcutKeyIndex: Index<Shortcut> = keyValueBy(globalShortcuts, (shortcut, i, accum) => {

    if (!shortcut.keyboard) return null

    const hash = hashShortcut(shortcut)
    const conflict = !!accum[hash]

    if (conflict) {
      console.error(`"${shortcut.id}" uses the same shortcut as "${accum[hash].id}": ${formatKeyboardShortcut(shortcut.keyboard)}"`)
    }

    return {
      // if there is a conflict, append the shortcut id to the conflicts property so that the conflicts can be displayed to the user
      [hash]: conflict
        ? {
          ...shortcut,
          conflicts: [...shortcut.conflicts || [accum[hash].id], shortcut.id]
        }
        : shortcut
    }
  })

  // index shortcuts for O(1) lookup by id
  const shortcutIdIndex: Index<Shortcut> = keyValueBy(globalShortcuts, shortcut =>
    shortcut.id ? { [shortcut.id]: shortcut } : null
  )

  // index shortcuts for O(1) lookup by gesture
  const shortcutGestureIndex: Index<Shortcut> = keyValueBy(globalShortcuts, shortcut => shortcut.gesture
    ? {
      // shortcut.gesture may be a string or array of strings
      // normalize intro array of strings
      ...keyValueBy(Array.prototype.concat([], shortcut.gesture), gesture => ({
        [gesture]: shortcut
      }))
    }
    : null
  )

  return { shortcutKeyIndex, shortcutIdIndex, shortcutGestureIndex }
}

/** Returns true if the current alert is a gestureHint. */
export const isGestureHint = ({ alert }: State) =>
  alert && alert.alertType === 'gestureHint'

let handleGestureSegmentTimeout: number | undefined // eslint-disable-line fp/no-let

/**
 * Keyboard handlers factory function.
 */
export const inputHandlers = (store: Store<State, any>) => ({

  /** Handles gesture hints when a valid segment is entered. */
  handleGestureSegment: (g: Direction | null, path: GesturePath) => {

    const state = store.getState()
    const { toolbarOverlay, scrollPrioritized } = state

    if (toolbarOverlay || scrollPrioritized) return

    // disable when modal is displayed or a drag is in progress
    if (state.showModal || state.dragInProgress) return

    const shortcut = shortcutGestureIndex[path as string]

    // display gesture hint
    clearTimeout(handleGestureSegmentTimeout)
    handleGestureSegmentTimeout = window.setTimeout(
      () => {
        // only show "Invalid gesture" if hint is already being shown
        store.dispatch(alert(shortcut ? shortcut.name
          : isGestureHint(state) ? '✗ Invalid gesture'
          : null, { alertType: 'gestureHint', showCloseLink: false }))
      },
      // if the hint is already being shown, do not wait to change the value
      isGestureHint(state) ? 0 : GESTURE_SEGMENT_HINT_TIMEOUT
    )
  },

  /** Executes a valid gesture and closes the gesture hint. */
  handleGestureEnd: (gesture: GesturePath | null, e: GestureResponderEvent) => {
    const state = store.getState()
    const { scrollPrioritized } = state

    if (scrollPrioritized) return

    // disable when modal is displayed or a drag is in progress
    if (gesture && !state.showModal && !state.dragInProgress) {
      const shortcut = shortcutGestureIndex[gesture as string]
      if (shortcut) {
        shortcutEmitter.trigger('shortcut', shortcut)
        shortcut.exec(store.dispatch, store.getState, e, { type: 'gesture' })
      }
    }

    // clear gesture hint
    clearTimeout(handleGestureSegmentTimeout)
    handleGestureSegmentTimeout = undefined // clear the timer to track when it is running for handleGestureSegment

    // needs to be delayed until the next tick otherwise there is a re-render which inadvertantly calls the automatic render focus in the Thought component.
    setTimeout(() => {
      if (isGestureHint(store.getState())) {
        store.dispatch(alert(null))
      }
    })
  },

  /** Global keyUp handler. */
  keyUp: (e: KeyboardEvent) => {
    // track meta key for expansion algorithm
    if (e.key === (isMac ? 'Meta' : 'Control')) {
      if (globals.suppressExpansion) {
        store.dispatch(suppressExpansion({ cancel: true }))
      }
    }
  },

  /** Global keyDown handler. */
  keyDown: (e: KeyboardEvent) => {
    const state = store.getState()
    const { toolbarOverlay, scrollPrioritized } = state

    // track meta key for expansion algorithm
    if (!(isMac ? e.metaKey : e.ctrlKey)) {
      // disable suppress expansion without triggering re-render
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

        // dispatch action to hide toolbar and breadcrumbs
        if (!isTouch) {
          store.dispatch(toggleTopControlsAndBreadcrumbs(false))
        }

        // execute shortcut
        shortcut.exec(store.dispatch, store.getState, e, { type: 'keyboard' })
      }
    }
  }
})

/** Converts a gesture letter or event key of an arrow key to an arrow utf8 character. Defaults to input. */
// eslint-disable-next-line @typescript-eslint/no-extra-parens
const arrowTextToArrowCharacter = (s: string) => (({
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓'
} as Index)[s] || s)

/** Formats a keyboard shortcut to display to the user. */
export const formatKeyboardShortcut = (keyboardOrString: Key | string): string => {
  const keyboard = typeof keyboardOrString === 'string'
    ? { key: keyboardOrString as string }
    : keyboardOrString
  return (keyboard.meta ? (isMac ? 'Command' : 'Ctrl') + ' + ' : '') +
    (keyboard.alt ? (isMac ? 'Option' : 'Alt') + ' + ' : '') +
    (keyboard.control ? 'Control + ' : '') +
    (keyboard.shift ? 'Shift + ' : '') +
    arrowTextToArrowCharacter(keyboard.shift && keyboard.key.length === 1 ? keyboard.key.toUpperCase() : keyboard.key)
}

/** Finds a shortcut by its id. */
export const shortcutById = (id: string): Shortcut | null => shortcutIdIndex[id]

const { shortcutKeyIndex, shortcutIdIndex, shortcutGestureIndex } = index()
