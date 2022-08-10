/** Defines global keyboard shortcuts and gestures. */
import Emitter from 'emitter20'
import { GestureResponderEvent } from 'react-native'
import { Store } from 'redux'
import Direction from './@types/Direction'
import GesturePath from './@types/GesturePath'
import Index from './@types/IndexType'
import Key from './@types/Key'
import Shortcut from './@types/Shortcut'
import State from './@types/State'
import alert from './action-creators/alert'
import showLatestShortcuts from './action-creators/showLatestShortcuts'
import suppressExpansion from './action-creators/suppressExpansion'
import { isMac } from './browser'
import { GESTURE_HINT_EXTENDED_TIMEOUT } from './constants'
import globals from './globals'
import * as shortcutObject from './shortcuts/index'
import keyValueBy from './util/keyValueBy'

export const globalShortcuts = Object.values(shortcutObject) as Shortcut[]

export const shortcutEmitter = new Emitter()

/* A mapping of key codes to uppercase letters.
 * {
 *   65: 'A',
 *   66: 'B',
 *   67: 'C',
 *   ...
 * }
 */
const letters = keyValueBy(Array(26).fill(0), (n, i) => ({
  [65 + i]: String.fromCharCode(65 + i).toUpperCase(),
}))

/* A mapping of key codes to digits.
 * {
 *   48: '0',
 *   49: '1',
 *   50: '2',
 *   ...
 * }
 */
const digits = keyValueBy(Array(58 - 48).fill(0), (n, i) => ({
  [48 + i]: i.toString(),
}))

/** Hash all the properties of a shortcut into a string. */
const hashShortcut = (shortcut: Shortcut): string => {
  const keyboard = typeof shortcut.keyboard === 'string' ? { key: shortcut.keyboard } : shortcut.keyboard || ({} as Key)
  return (
    (keyboard.meta ? 'META_' : '') +
    (keyboard.alt ? 'ALT_' : '') +
    (keyboard.shift ? 'SHIFT_' : '') +
    keyboard.key?.toUpperCase()
  )
}

/** Hash all the properties of a keydown event into a string that matches hashShortcut. */
const hashKeyDown = (e: KeyboardEvent): string =>
  (e.metaKey || e.ctrlKey ? 'META_' : '') +
  (e.altKey ? 'ALT_' : '') +
  (e.shiftKey ? 'SHIFT_' : '') +
  // for some reason, e.key returns 'Dead' in some cases, perhaps because of alternate keyboard settings
  // e.g. alt + meta + n
  // use e.keyCode if available instead
  (letters[e.keyCode] || digits[e.keyCode] || e.key || '').toUpperCase()

/** Initializes shortcut indices and stores conflicts. */
const index = (): {
  shortcutKeyIndex: Index<Shortcut>
  shortcutIdIndex: Index<Shortcut>
  shortcutGestureIndex: Index<Shortcut>
} => {
  // index shortcuts for O(1) lookup by keyboard
  const shortcutKeyIndex: Index<Shortcut> = keyValueBy(globalShortcuts, (shortcut, i, accum) => {
    if (!shortcut.keyboard) return null

    const hash = hashShortcut(shortcut)
    const conflict = !!accum[hash]

    if (conflict) {
      console.error(
        `"${shortcut.id}" uses the same shortcut as "${accum[hash].id}": ${formatKeyboardShortcut(shortcut.keyboard)}"`,
      )
    }

    return {
      // if there is a conflict, append the shortcut id to the conflicts property so that the conflicts can be displayed to the user
      [hash]: conflict
        ? {
            ...shortcut,
            conflicts: [...(shortcut.conflicts || [accum[hash].id]), shortcut.id],
          }
        : shortcut,
    }
  })

  // index shortcuts for O(1) lookup by id
  const shortcutIdIndex: Index<Shortcut> = keyValueBy(globalShortcuts, shortcut =>
    shortcut.id ? { [shortcut.id]: shortcut } : null,
  )

  // index shortcuts for O(1) lookup by gesture
  const shortcutGestureIndex: Index<Shortcut> = keyValueBy(globalShortcuts, shortcut =>
    shortcut.gesture
      ? {
          // shortcut.gesture may be a string or array of strings
          // normalize intro array of strings
          ...keyValueBy(Array.prototype.concat([], shortcut.gesture), gesture => ({
            [gesture]: shortcut,
          })),
        }
      : null,
  )

  return { shortcutKeyIndex, shortcutIdIndex, shortcutGestureIndex }
}

let gestureHintExtendedTimeout: number | undefined // eslint-disable-line fp/no-let

/**
 * Keyboard and gesture handlers factory function that binds the store to event handlers.
 *
 * There are two alert types for gesture hints:
 * - gestureHint - The basic gesture hint that is shown immediately on swipe.
 * - gestureHintExtended - The extended gesture hint that shows all possible gestures from the current sequence after a delay.
 *
 * There is no automated test coverage since timers are so messed up in the current Jest version. It may be possible to write tests if Jest is upgraded. Manual test cases.
 * - Basic gesture hint.
 * - Preserve gesture hint for valid shortcut.
 * - Only show "Cancel gesture" if gesture hint is already activated.
 * - Dismiss gesture hint after release for invalid shortcut.
 * - Extended gesture hint on hold.
 * - Extended gesture hint from invalid gesture (e.g. ←↓, hold, ←↓←).
 * - Change extended gesture hint to basic gesture hint on gesture end.
 */
export const inputHandlers = (store: Store<State, any>) => ({
  /** Handles gesture hints when a valid segment is entered. */
  handleGestureSegment: ({ gesture, sequence }: { gesture: Direction | null; sequence: GesturePath }) => {
    const state = store.getState()
    const { toolbarOverlay, scrollPrioritized } = state

    if (toolbarOverlay || scrollPrioritized || state.showModal || state.dragInProgress) return

    const shortcut = shortcutGestureIndex[sequence as string]

    // basic gesture hint
    if (
      // only show basic gesture hint if the extended gesture hint is not already being shown
      state.alert?.alertType !== 'gestureHintExtended' &&
      // ignore back
      shortcut?.id !== 'cursorBack' &&
      // ignore forward
      shortcut?.id !== 'cursorForward' &&
      // only show
      (shortcut || state.alert?.alertType === 'gestureHint')
    ) {
      store.dispatch(
        // alert the shortcut label if it is a valid gesture
        // alert "Cancel gesture" if it is not a valid gesture (basic gesture hint)
        alert(shortcut ? shortcut?.label : '✗ Cancel gesture', {
          alertType: 'gestureHint',
          showCloseLink: !!shortcut,
        }),
      )
    }

    // extended gesture hint
    // alert after a delay of GESTURE_HINT_EXTENDED_TIMEOUT
    clearTimeout(gestureHintExtendedTimeout)
    gestureHintExtendedTimeout = window.setTimeout(
      () => {
        store.dispatch((dispatch, getState) => {
          // do not show "Cancel gesture" if already being shown by basic gesture hint
          if (getState().alert?.value === '✗ Cancel gesture') return
          dispatch(
            alert(sequence as string, {
              alertType: 'gestureHintExtended',
              // no need to show close link on "Cancel gesture" since it is dismiss automatically
              showCloseLink: !!shortcut,
            }),
          )
        })
      },
      // if the hint is already being shown, do not wait to change the value
      state.alert?.alertType === 'gestureHintExtended' ? 0 : GESTURE_HINT_EXTENDED_TIMEOUT,
    )
  },

  /** Executes a valid gesture and closes the gesture hint. */
  handleGestureEnd: ({ sequence, e }: { sequence: GesturePath | null; e: GestureResponderEvent }) => {
    const state = store.getState()
    const { scrollPrioritized } = state

    if (scrollPrioritized) return

    const shortcut = shortcutGestureIndex[sequence as string]

    // disable when modal is displayed or a drag is in progress
    if (shortcut && !state.showModal && !state.dragInProgress) {
      shortcutEmitter.trigger('shortcut', shortcut)
      shortcut.exec(store.dispatch, store.getState, e, { type: 'gesture' })
      if (store.getState().enableLatestShorcutsDiagram) store.dispatch(showLatestShortcuts(shortcut))
    }

    // clear gesture hint
    clearTimeout(gestureHintExtendedTimeout)
    gestureHintExtendedTimeout = undefined // clear the timer to track when it is running for handleGestureSegment

    // Convert gestureHintExtended to gestureHint on gesture end
    // needs to be delayed until the next tick otherwise there is a re-render which inadvertantly calls the automatic render focus in the Thought component.
    setTimeout(() => {
      store.dispatch((dispatch, getState) => {
        if (
          getState().alert?.alertType?.startsWith('gestureHint') &&
          shortcut?.id !== 'cursorForward' &&
          shortcut?.id !== 'cursorBack'
        ) {
          // TODO: Add a setting to auto dismiss alerts after the gesture ends
          // clear alert if gesture is cancelled
          dispatch(alert(shortcut?.label || null))
        }
      })
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
    if (
      state.showModal === 'welcome' ||
      state.showModal === 'help' ||
      state.showModal === 'feedback' ||
      state.showModal === 'auth' ||
      state.showModal === 'invites'
    )
      return

    const shortcut = shortcutKeyIndex[hashKeyDown(e)]

    // execute the shortcut if it exists
    if (shortcut) {
      shortcutEmitter.trigger('shortcut', shortcut)

      if (!shortcut.canExecute || shortcut.canExecute(store.getState)) {
        e.preventDefault()

        // execute shortcut
        shortcut.exec(store.dispatch, store.getState, e, { type: 'keyboard' })
      }
    }
  },
})

/** Converts a gesture letter or event key of an arrow key to an arrow utf8 character. Defaults to input. */
// eslint-disable-next-line @typescript-eslint/no-extra-parens
const arrowTextToArrowCharacter = (s: string) =>
  ((
    {
      ArrowLeft: '←',
      ArrowRight: '→',
      ArrowUp: '↑',
      ArrowDown: '↓',
    } as Index
  )[s] || s)

/** Formats a keyboard shortcut to display to the user. */
export const formatKeyboardShortcut = (keyboardOrString: Key | string): string => {
  const keyboard = typeof keyboardOrString === 'string' ? { key: keyboardOrString as string } : keyboardOrString
  return (
    (keyboard.meta ? (isMac ? 'Command' : 'Ctrl') + ' + ' : '') +
    (keyboard.alt ? (isMac ? 'Option' : 'Alt') + ' + ' : '') +
    (keyboard.control ? 'Control + ' : '') +
    (keyboard.shift ? 'Shift + ' : '') +
    arrowTextToArrowCharacter(keyboard.shift && keyboard.key.length === 1 ? keyboard.key.toUpperCase() : keyboard.key)
  )
}

/** Finds a shortcut by its id. */
export const shortcutById = (id: string): Shortcut | null => shortcutIdIndex[id]

const { shortcutKeyIndex, shortcutIdIndex, shortcutGestureIndex } = index()
