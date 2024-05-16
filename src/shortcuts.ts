/** Defines global keyboard shortcuts and gestures. */
import Emitter from 'emitter20'
import { GestureResponderEvent } from 'react-native'
import { Store } from 'redux'
import Direction from './@types/Direction'
import GesturePath from './@types/GesturePath'
import Index from './@types/IndexType'
import Key from './@types/Key'
import Shortcut from './@types/Shortcut'
import ShortcutId from './@types/ShortcutId'
import State from './@types/State'
import { alertActionCreator as alert } from './actions/alert'
import { commandPaletteActionCreator as commandPalette } from './actions/commandPalette'
import { showLatestShortcutsActionCreator as showLatestShortcuts } from './actions/showLatestShortcuts'
import { suppressExpansionActionCreator as suppressExpansion } from './actions/suppressExpansion'
import { isMac } from './browser'
import { AlertType, COMMAND_PALETTE_TIMEOUT, GESTURE_CANCEL_ALERT_TEXT, Settings } from './constants'
import globals from './globals'
import getUserSetting from './selectors/getUserSetting'
import * as shortcutObject from './shortcuts/index'
import keyValueBy from './util/keyValueBy'

export const globalShortcuts: Shortcut[] = Object.values(shortcutObject)

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

/** Hash all the properties of a shortcut into a string that can be compared with the result of hashKeyDown. */
export const hashShortcut = (shortcut: Shortcut): string => {
  const keyboard = typeof shortcut.keyboard === 'string' ? { key: shortcut.keyboard } : shortcut.keyboard || ({} as Key)
  return (
    (keyboard.meta ? 'META_' : '') +
    (keyboard.alt ? 'ALT_' : '') +
    (keyboard.shift ? 'SHIFT_' : '') +
    keyboard.key?.toUpperCase()
  )
}

/** Hash all the properties of a keydown event into a string that can be compared with the result of hashShortcut. */
export const hashKeyDown = (e: KeyboardEvent): string =>
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

let commandPaletteGesture: number | undefined

/**
 * Keyboard and gesture handlers factory function that binds the store to event handlers.
 *
 * There are two alert types for gesture hints:
 * - GestureHint - The basic gesture hint that is shown immediately on swipe.
 * - CommandPaletteGesture - The command palette  that shows all possible gestures from the current sequence after a delay.
 *
 * There is no automated test coverage since timers are so messed up in the current Jest version. It may be possible to write tests if Jest is upgraded. Manual test cases.
 * - Basic gesture hint.
 * - Preserve gesture hint for valid shortcut.
 * - Only show "Cancel gesture" if gesture hint is already activated.
 * - Dismiss gesture hint after release for invalid shortcut.
 * - command palette  on hold.
 * - command palette  from invalid gesture (e.g. ←↓, hold, ←↓←).
 * - Change command palette  to basic gesture hint on gesture end.
 */
export const inputHandlers = (store: Store<State, any>) => ({
  /** Handles gesture hints when a valid segment is entered. */
  handleGestureSegment: ({ gesture, sequence }: { gesture: Direction | null; sequence: GesturePath }) => {
    const state = store.getState()
    const experienceMode = getUserSetting(state, Settings.experienceMode)

    if (state.showModal || state.dragInProgress) return

    const shortcut = shortcutGestureIndex[sequence as string]

    // basic gesture hint (training mode only)
    if (
      !experienceMode &&
      // only show basic gesture hint if the command palette is not already being shown
      !state.showCommandPalette &&
      // ignore back
      shortcut?.id !== 'cursorBack' &&
      // ignore forward
      shortcut?.id !== 'cursorForward' &&
      // only show
      (shortcut || state.alert?.alertType === AlertType.GestureHint)
    ) {
      store.dispatch(
        // alert the shortcut label if it is a valid gesture
        // alert "Cancel gesture" if it is not a valid gesture (basic gesture hint)
        alert(shortcut ? shortcut?.label : GESTURE_CANCEL_ALERT_TEXT, {
          alertType: AlertType.GestureHint,
          clearDelay: 5000,
          showCloseLink: false,
        }),
      )
    }

    // command palette
    // alert after a delay of COMMAND_PALETTE_TIMEOUT
    clearTimeout(commandPaletteGesture)
    commandPaletteGesture = window.setTimeout(
      () => {
        store.dispatch((dispatch, getState) => {
          // do not show "Cancel gesture" if already being shown by basic gesture hint
          const state = getState()
          if (getState().alert?.value === GESTURE_CANCEL_ALERT_TEXT || state.showCommandPalette) return
          dispatch(commandPalette())
        })
      },
      // if the hint is already being shown, do not wait to change the value
      COMMAND_PALETTE_TIMEOUT,
    )
  },

  /** Executes a valid gesture and closes the gesture hint. */
  handleGestureEnd: ({ sequence, e }: { sequence: GesturePath | null; e: GestureResponderEvent }) => {
    const state = store.getState()

    // Get the shortcut from the shortcut gesture index.
    // When the command palette  is displayed, disable gesture aliases (i.e. gestures hidden from instructions). This is because the gesture hints are meant only as an aid when entering gestures quickly.
    const shortcut =
      !state.showCommandPalette || !shortcutGestureIndex[sequence as string]?.hideFromInstructions
        ? shortcutGestureIndex[sequence as string]
        : null

    // execute shortcut
    // do not execute when modal is displayed or a drag is in progress
    if (shortcut && !state.showModal && !state.dragInProgress) {
      shortcutEmitter.trigger('shortcut', shortcut)
      shortcut.exec(store.dispatch, store.getState, e, { type: 'gesture' })
      if (store.getState().enableLatestShortcutsDiagram) store.dispatch(showLatestShortcuts(shortcut))
    }

    // clear gesture hint
    clearTimeout(commandPaletteGesture)
    commandPaletteGesture = undefined // clear the timer to track when it is running for handleGestureSegment

    // In experienced mode, close the alert.
    // In training mode, convert CommandPaletteGesture back to GestureHint on gesture end.
    // This needs to be delayed until the next tick otherwise there is a re-render which inadvertantly calls the automatic render focus in the Thought component.
    setTimeout(() => {
      store.dispatch((dispatch, getState) => {
        const state = getState()
        const alertType = state.alert?.alertType
        const experienceMode = getUserSetting(Settings.experienceMode)
        if (alertType === AlertType.GestureHint || state.showCommandPalette) {
          if (state.showCommandPalette) {
            dispatch(commandPalette())
          } else {
            dispatch(
              alert(
                // clear alert if gesture is cancelled (no shortcut)
                // clear alert if back/forward
                !experienceMode && shortcut && shortcut?.id !== 'cursorForward' && shortcut?.id !== 'cursorBack'
                  ? shortcut.label
                  : null,
                { alertType: AlertType.GestureHint, clearDelay: 5000 },
              ),
            )
          }
        }
      })
    })
  },

  /** Dismiss gesture hint that is shown by alert. */
  handleGestureCancel: () => {
    clearTimeout(commandPaletteGesture)
    store.dispatch((dispatch, getState) => {
      if (getState().alert?.alertType === AlertType.GestureHint || getState().showCommandPalette) {
        dispatch(alert(null))
      }
    })
  },

  /** Global keyUp handler. */
  keyUp: (e: KeyboardEvent) => {
    // track meta key for expansion algorithm
    if (e.key === (isMac ? 'Meta' : 'Control') && globals.suppressExpansion) {
      store.dispatch(suppressExpansion(false))
    }
  },

  /** Global keyDown handler. */
  keyDown: (e: KeyboardEvent) => {
    const state = store.getState()

    // track meta key for expansion algorithm
    if (!(isMac ? e.metaKey : e.ctrlKey)) {
      // disable suppress expansion without triggering re-render
      globals.suppressExpansion = false
    }

    // disable if command palette is displayed
    if (state.showCommandPalette) return

    const shortcut = shortcutKeyIndex[hashKeyDown(e)]

    // disable if modal is shown, except for navigation shortcuts
    if (!shortcut || (state.showModal && !shortcut.allowExecuteFromModal)) return

    // execute the shortcut
    shortcutEmitter.trigger('shortcut', shortcut)

    if (!shortcut.canExecute || shortcut.canExecute(store.getState)) {
      e.preventDefault()

      // execute shortcut
      shortcut.exec(store.dispatch, store.getState, e, { type: 'keyboard' })
    }
  },
})

/** Converts a gesture letter or event key of an arrow key to an arrow utf8 character. Defaults to input. */
// eslint-disable-next-line @typescript-eslint/no-extra-parens
const arrowTextToArrowCharacter = (s: string) =>
  (
    ({
      ArrowLeft: '←',
      ArrowRight: '→',
      ArrowUp: '↑',
      ArrowDown: '↓',
    }) as Index
  )[s] || s

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

/** Get a shortcut by its id. */
export const shortcutById = (id: ShortcutId): Shortcut => shortcutIdIndex[id]

/** Gets the canonical gesture of the shortcut as a string, ignoring aliases. Returns an empty string if the shortcut does not have a gesture. */
export const gestureString = (shortcut: Shortcut): string =>
  (typeof shortcut.gesture === 'string' ? shortcut.gesture : shortcut.gesture?.[0] || '') as string

const { shortcutKeyIndex, shortcutIdIndex, shortcutGestureIndex } = index()
