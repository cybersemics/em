/* eslint-disable import/prefer-default-export */

/** Defines global keyboard shortcuts and gestures. */
import Emitter from 'emitter20'
import { GestureResponderEvent } from 'react-native'
import { Store } from 'redux'
import Command from './@types/Command'
import CommandId from './@types/CommandId'
import Direction from './@types/Direction'
import GesturePath from './@types/GesturePath'
import Index from './@types/IndexType'
import Key from './@types/Key'
import State from './@types/State'
import { alertActionCreator as alert } from './actions/alert'
import { commandPaletteActionCreator as commandPalette } from './actions/commandPalette'
import { showLatestCommandsActionCreator as showLatestCommands } from './actions/showLatestCommands'
import { suppressExpansionActionCreator as suppressExpansion } from './actions/suppressExpansion'
import { isMac } from './browser'
import * as commandsObject from './commands/index'
import { AlertType, COMMAND_PALETTE_TIMEOUT, Settings } from './constants'
import * as selection from './device/selection'
import globals from './globals'
import getUserSetting from './selectors/getUserSetting'
import gestureStore from './stores/gesture'
import { executeCommandWithMulticursor } from './util/executeCommand'
import haptics from './util/haptics'
import keyValueBy from './util/keyValueBy'

export const globalCommands: Command[] = Object.values(commandsObject)

export const commandEmitter = new Emitter()

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

/** Hash all the properties of a command into a string that can be compared with the result of hashKeyDown. */
export const hashCommand = (command: Command): string => {
  const keyboard = typeof command.keyboard === 'string' ? { key: command.keyboard } : command.keyboard || ({} as Key)
  return (
    (keyboard.meta ? 'META_' : '') +
    (keyboard.alt ? 'ALT_' : '') +
    (keyboard.shift ? 'SHIFT_' : '') +
    keyboard.key?.toUpperCase()
  )
}

/** Hash all the properties of a keydown event into a string that can be compared with the result of hashCommand. */
export const hashKeyDown = (e: KeyboardEvent): string =>
  (e.metaKey || e.ctrlKey ? 'META_' : '') +
  (e.altKey ? 'ALT_' : '') +
  (e.shiftKey ? 'SHIFT_' : '') +
  // for some reason, e.key returns 'Dead' in some cases, perhaps because of alternate keyboard settings
  // e.g. alt + meta + n
  // use e.keyCode if available instead
  (letters[e.keyCode] || digits[e.keyCode] || e.key || '').toUpperCase()

/** Converts a gesture letter or event key of an arrow key to an arrow utf8 character. Defaults to input. */
export const arrowTextToArrowCharacter = (s: string) => {
  return ((
    ({
      ArrowLeft: '←',
      ArrowRight: '→',
      ArrowUp: '↑',
      ArrowDown: '↓',
    }) as Index
  )[s] || s)
}

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
/** Initializes command indices and logs keyboard shortcut conflicts. */
const index = (): {
  commandKeyIndex: Index<Command>
  commandIdIndex: Index<Command>
  commandGestureIndex: Index<Command>
} => {
  // index commands for O(1) lookup by keyboard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commandKeyIndex: Index<Command & { conflicts?: any[] }> = keyValueBy(globalCommands, (command, i, accum) => {
    if (!command.keyboard) return null

    const hash = hashCommand(command)

    // check if the shortcut is used by another command
    if (accum[hash]) {
      console.error(
        `"${command.id}" uses the same shortcut as "${accum[hash].id}": ${formatKeyboardShortcut(command.keyboard)}"`,
      )
    }

    return {
      [hash]: command,
    }
  })

  // index command for O(1) lookup by id
  const commandIdIndex: Index<Command> = keyValueBy(globalCommands, command =>
    command.id ? { [command.id]: command } : null,
  )

  // index command for O(1) lookup by gesture
  const commandGestureIndex: Index<Command> = keyValueBy(globalCommands, command =>
    command.gesture
      ? {
          // command.gesture may be a string or array of strings
          // normalize intro array of strings
          ...keyValueBy(Array.prototype.concat([], command.gesture), gesture => ({
            [gesture]: command,
          })),
        }
      : null,
  )

  return {
    commandKeyIndex,
    commandIdIndex,
    commandGestureIndex,
  }
}

let commandPaletteGesture: number | undefined

const { commandKeyIndex, commandIdIndex, commandGestureIndex } = index()

/** Gets the canonical gesture of the command as a string, ignoring aliases. Returns an empty string if the command does not have a gesture. */
export const gestureString = (command: Command): string =>
  (typeof command.gesture === 'string' ? command.gesture : command.gesture?.[0] || '') as string

/** Get a command by its id. */
export const commandById = (id: CommandId): Command => commandIdIndex[id]

/**
 * Keyboard and gesture handlers factory function that binds the store to event handlers.
 *
 * There are two alert types for gesture hints:
 * - GestureHint - The basic gesture hint that is shown immediately on swipe.
 * - CommandPaletteGesture - The command palette  that shows all possible gestures from the current sequence after a delay.
 *
 * There is no automated test coverage since timers are so messed up in the current Jest version. It may be possible to write tests if Jest is upgraded. Manual test cases.
 * - Basic gesture hint.
 * - Preserve gesture hint for valid command.
 * - Only show "Cancel gesture" if gesture hint is already activated.
 * - Dismiss gesture hint after release for invalid command.
 * - command palette  on hold.
 * - command palette  from invalid gesture (e.g. ←↓, hold, ←↓←).
 * - Change command palette  to basic gesture hint on gesture end.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const inputHandlers = (store: Store<State, any>) => ({
  /** Handles gesture hints when a valid segment is entered. */
  handleGestureSegment: ({ sequence }: { gesture: Direction | null; sequence: GesturePath }) => {
    const state = store.getState()
    const experienceMode = getUserSetting(state, Settings.experienceMode)

    if (state.showModal || state.dragInProgress) return

    // Stop gesture segment haptics when there are no more possible commands that can be completed from the current sequence.
    // useFilteredCommands updates the possibleCommands in a back channel for efficiency.
    // Always allow haptics for the first swipe, as possibleCommands may not be populated yet.
    if (sequence.length === 1 || gestureStore.getState().possibleCommands.length > 2) {
      haptics.light()
    }

    const command = commandGestureIndex[sequence as string]

    // basic gesture hint (training mode only)
    if (
      !experienceMode &&
      // only show basic gesture hint if the command palette is not already being shown
      !state.showCommandPalette &&
      // ignore back
      command?.id !== 'cursorBack' &&
      // ignore forward
      command?.id !== 'cursorForward' &&
      // only show
      (command || state.alert?.alertType === AlertType.GestureHint)
    ) {
      store.dispatch(
        // alert the command label if it is a valid gesture
        alert(command && command?.label, {
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
          if (state.showCommandPalette) return
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

    // Get the command from the command gesture index.
    // When the command palette  is displayed, disable gesture aliases (i.e. gestures hidden from instructions). This is because the gesture hints are meant only as an aid when entering gestures quickly.

    const helpCommand = commandById('help')
    const helpGesture = gestureString(helpCommand)

    // If sequence ends with help gesture, use help command
    // Otherwise use the normal command lookup
    const command = sequence?.toString().endsWith(helpGesture)
      ? helpCommand
      : !state.showCommandPalette || !commandGestureIndex[sequence as string]?.hideFromHelp
        ? commandGestureIndex[sequence as string]
        : null

    // execute command
    // do not execute when modal is displayed or a drag is in progress
    if (command && !state.showModal && !state.dragInProgress) {
      commandEmitter.trigger('command', command)
      executeCommandWithMulticursor(command, { event: e, type: 'gesture', store })
      if (store.getState().enableLatestCommandsDiagram) store.dispatch(showLatestCommands(command))
    }

    // if no command was found, execute the cancel command

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
                // clear alert if gesture is cancelled (no command)
                // clear alert if back/forward
                !experienceMode && command && command?.id !== 'cursorForward' && command?.id !== 'cursorBack'
                  ? command.label
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

    // For some reason, when the caret is at the beginning of the thought, alt + ArrowLeft sets the caret to the end.
    // Prevent this default behavior, as the caret should have nowhere to go when it is already at the beginning.
    if (e.altKey && e.key === 'ArrowLeft' && selection.offset() === 0 && selection.isThought()) {
      e.preventDefault()
      return
    }

    // disable if command palette is displayed
    if (state.showCommandPalette) return

    const command = commandKeyIndex[hashKeyDown(e)]

    // disable if modal is shown, except for navigation commands
    if (!command || (state.showModal && !command.allowExecuteFromModal)) return

    // execute the command
    commandEmitter.trigger('command', command)

    if (!command.canExecute || command.preventDefault || command.canExecute(store.getState())) {
      if (!command.permitDefault) {
        e.preventDefault()
      }

      // execute command
      executeCommandWithMulticursor(command, { event: e, type: 'keyboard', store })
    }
  },
})
