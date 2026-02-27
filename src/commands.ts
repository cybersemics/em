/* eslint-disable import/prefer-default-export */
/** Defines global keyboard shortcuts and gestures. */
import Emitter from 'emitter20'
import { Store } from 'redux'
import { ArrowKey } from './@types/ArrowKey'
import Command from './@types/Command'
import CommandId from './@types/CommandId'
import CommandType from './@types/CommandType'
import Direction from './@types/Direction'
import Gesture from './@types/Gesture'
import Index from './@types/IndexType'
import Key from './@types/Key'
import MulticursorFilter from './@types/MulticursorFilter'
import Path from './@types/Path'
import State from './@types/State'
import ThoughtId from './@types/ThoughtId'
import { addMulticursorActionCreator as addMulticursor } from './actions/addMulticursor'
import { alertActionCreator as alert } from './actions/alert'
import { gestureMenuActionCreator as gestureMenu } from './actions/gestureMenu'
import { setCursorActionCreator as setCursor } from './actions/setCursor'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from './actions/setIsMulticursorExecuting'
import { showLatestCommandsActionCreator as showLatestCommands } from './actions/showLatestCommands'
import { suppressExpansionActionCreator as suppressExpansion } from './actions/suppressExpansion'
import { isMac } from './browser'
import * as commandsObject from './commands/index'
import openGestureCheatsheetCommand from './commands/openGestureCheatsheet'
import { GestureResponderEvent } from './components/PanResponder'
import { AlertType, COMMAND_PALETTE_TIMEOUT, HOME_PATH, LongPressState, Settings, noop } from './constants'
import * as selection from './device/selection'
import globals from './globals'
import documentSort from './selectors/documentSort'
import getUserSetting from './selectors/getUserSetting'
import hasMulticursor from './selectors/hasMulticursor'
import isAllSelected from './selectors/isAllSelected'
import thoughtToPath from './selectors/thoughtToPath'
import store from './stores/app'
import editingValueStore from './stores/editingValue'
import gestureStore from './stores/gesture'
import equalPath from './util/equalPath'
import haptics from './util/haptics'
import hashPath from './util/hashPath'
import head from './util/head'
import keyValueBy from './util/keyValueBy'
import parentOf from './util/parentOf'
import UnreachableError from './util/unreachable'

export const globalCommands: Command[] = Object.values(commandsObject)

export const commandEmitter = new Emitter()

let keyCommandId: string | null = null

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

/**
 * Hash a keyboard shortcut into a string that can be compared with the result of hashKeyDown.
 * This function only handles a single keyboard shortcut, not arrays.
 */
export const hashCommand = (keyboard: string | Key): string => {
  const key = typeof keyboard === 'string' ? { key: keyboard } : keyboard

  return (key.meta ? 'META_' : '') + (key.alt ? 'ALT_' : '') + (key.shift ? 'SHIFT_' : '') + key.key?.toUpperCase()
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

const ARROW_KEYS_TO_CHARACTER: Record<ArrowKey, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
}

/** Returns true if key is an arrow key. */
export const isArrowKey = (key: string): key is ArrowKey => {
  return key in ARROW_KEYS_TO_CHARACTER
}

/** Converts a gesture letter or event key of an arrow key to an arrow utf8 character. Defaults to input. */
export const arrowTextToArrowCharacter = (s: ArrowKey) => ARROW_KEYS_TO_CHARACTER[s]

/** Formats a keyboard shortcut to display to the user. */
export const formatKeyboardShortcut = (keyboardOrString: Key | Key[] | string): string => {
  // If it's an array, format only the first shortcut for display
  if (Array.isArray(keyboardOrString)) {
    return formatKeyboardShortcut(keyboardOrString[0])
  }

  const keyboard = typeof keyboardOrString === 'string' ? { key: keyboardOrString } : keyboardOrString

  const text = keyboard.shift && keyboard.key.length === 1 ? keyboard.key.toUpperCase() : keyboard.key
  return (
    (keyboard.meta ? (isMac ? 'Command' : 'Ctrl') + ' + ' : '') +
    (keyboard.alt ? (isMac ? 'Option' : 'Alt') + ' + ' : '') +
    (keyboard.control ? 'Control + ' : '') +
    (keyboard.shift ? 'Shift + ' : '') +
    (isArrowKey(text) ? arrowTextToArrowCharacter(text) : text)
  )
}

/** Initializes command indices and logs keyboard shortcut conflicts. */
const index = (): {
  commandKeyIndex: Index<Command>
  commandIdIndex: Index<Command>
  commandGestureIndex: Index<Command>
} => {
  // index commands for O(1) lookup by keyboard
  const commandKeyIndex: Index<Command> = keyValueBy(globalCommands, (command, i, accum) => {
    if (!command.keyboard) return null

    // Handle both single keyboard shortcut and arrays of shortcuts
    const keyboardShortcuts = Array.isArray(command.keyboard) ? command.keyboard : [command.keyboard]

    // Process each keyboard shortcut and create entries in the index
    return keyboardShortcuts.reduce((result: Record<string, Command>, keyboardShortcut) => {
      const hash = hashCommand(keyboardShortcut)

      // check if the same shortcut is used by multiple commands
      if (accum[hash]) {
        console.error(
          `"${command.id}" uses the same shortcut as "${accum[hash].id}": ${formatKeyboardShortcut(keyboardShortcut)}`,
        )
      }

      return { ...result, [hash]: command }
    }, {})
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

let gestureMenuTimeout: number | undefined

const { commandKeyIndex, commandIdIndex, commandGestureIndex } = index()

/** Gets the canonical gesture of the command as a string, ignoring aliases. Returns an empty string if the command does not have a gesture. */
export const gestureString = (command: Command): Gesture =>
  typeof command.gesture === 'string' ? command.gesture : command.gesture?.[0] || ''

/** Get a command by its id. Only use this for dynamic ids that are only known at runtime. If you know the id of the command at compile time, use a static import. */
export const commandById = (id: CommandId): Command => commandIdIndex[id]

/** Generates a synthetic Command object that is the result of chaining two commands together. Prefixes gesture and label. */
export const chainCommand = (command1: Command, command2: Command): Command => {
  const command1GestureString = gestureString(command1)
  const command2GestureString = gestureString(command2)
  // collapse duplicate swipes when the command starts with the same character that the first gesture ends with
  const chainedGesture =
    command1GestureString +
    command2GestureString.slice(command1GestureString.endsWith(command2GestureString[0]) ? 1 : 0)
  const chainedCommand: Command = {
    ...command2,
    gesture: chainedGesture,
    label: `${command1.label} + ${command2.label}`,
  }
  return chainedCommand
}

const eventNoop = { preventDefault: noop } as Event

/** Filter the cursors based on the filter type. Cursors are sorted in document order. */
const filterCursors = (state: State, cursors: Path[], filter: MulticursorFilter = 'all') => {
  switch (filter) {
    case 'all':
      return cursors

    case 'first-sibling': {
      const seenParents = new Set<string>()

      return cursors.filter(cursor => {
        const parent = hashPath(parentOf(cursor))

        if (seenParents.has(parent)) return false
        seenParents.add(parent)

        return true
      })
    }

    case 'last-sibling': {
      const seenParents = new Set<string>()

      return cursors.reverse().filter(cursor => {
        const parent = hashPath(parentOf(cursor))

        if (seenParents.has(parent)) return false
        seenParents.add(parent)

        return true
      })
    }

    case 'prefer-ancestor': {
      const seenCursors = new Set<string>()

      return cursors.filter(cursor => {
        const parent = hashPath(parentOf(cursor))

        // Always add the cursor to the set to resolve direct chains.
        seenCursors.add(hashPath(cursor))

        return !seenCursors.has(parent)
      })
    }

    default:
      // Make sure all cases are covered
      throw new UnreachableError(filter)
  }
}

/** Recomputes the path to a thought. Returns null if the thought does not exist. */
const recomputePath = (state: State, thoughtId: ThoughtId) => {
  const path = thoughtToPath(state, thoughtId)
  return path && equalPath(path, HOME_PATH) ? null : path
}

/** Execute a single command. Defaults to global store and keyboard shortcuts. Use `executeCommandWithMulticursor` to execute a command with multicursor mode. */
export const executeCommand = (
  command: Command,
  {
    store: storeArg,
    type,
    event,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store?: Store<State, any>
    type?: CommandType
    event?: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent
  } = {},
) => {
  const commandStore = storeArg ?? store
  type = type ?? 'keyboard'
  event = event ?? eventNoop

  const canExecute = !command.canExecute || command.canExecute(commandStore.getState())
  // Exit early if the command cannot execute
  if (!canExecute) return

  // execute single command
  command.exec(commandStore.dispatch, commandStore.getState, event, { type })
}

/** Execute command. Defaults to global store and keyboard shortcuts. */
export const executeCommandWithMulticursor = (
  command: Command,
  {
    store: storeArg,
    type,
    event,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store?: Store<State, any>
    type?: CommandType
    event?: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent
  } = {},
) => {
  const commandStore = storeArg ?? store
  type = type ?? 'keyboard'
  event = event ?? eventNoop

  const state = commandStore.getState()

  // If we don't have active multicursors or the command ignores multicursors, execute the command normally.
  if (!command.multicursor || !hasMulticursor(state)) {
    return executeCommand(command, { store: commandStore, type, event })
  }

  /** The value of Command['multicursor'] resolved to an object. That is, bare false has already short circuited, and bare true resolves to an empty object so that we don't need to make existential checks everywhere. */
  const multicursor = typeof command.multicursor === 'boolean' ? {} : command.multicursor

  // if multicursor is disallowed for this command, alert and exit early
  if (multicursor.disallow) {
    const errorMessage = !multicursor.error
      ? 'Cannot execute this command with multiple thoughts.'
      : typeof multicursor.error === 'function'
        ? multicursor.error(commandStore.getState())
        : multicursor.error
    commandStore.dispatch(
      alert(errorMessage, {
        alertType: AlertType.MulticursorError,
      }),
    )
    return
  }

  // For each multicursor, place the cursor on the path and execute the command by calling executeCommand.
  const paths = documentSort(state, Object.values(state.multicursors))

  const filteredPaths = filterCursors(state, paths, multicursor.filter)

  // Exit early if the command cannot execute on any of the filtered paths
  const canExecute = filteredPaths.every(path => !command.canExecute || command.canExecute({ ...state, cursor: path }))
  if (!canExecute) return

  // Reverse the order of the cursors if the command has reverse multicursor mode enabled.
  if (multicursor.reverse) {
    filteredPaths.reverse()
  }

  // Set isMulticursorExecuting before executing commands
  // Include the command type to ensure proper undo labeling
  commandStore.dispatch(
    setIsMulticursorExecuting({
      value: true,
      undoLabel: command.id,
    }),
  )

  // If there is a custom execMulticursor function, call it with the filtered multicursors.
  // Otherwise, execute the command once for each of the filtered multicursors.
  if (multicursor.execMulticursor) {
    multicursor.execMulticursor(filteredPaths, commandStore.dispatch, commandStore.getState)
  } else {
    for (const path of filteredPaths) {
      // Make sure we have the correct path to the thought in case it was moved during execution.
      const recomputedPath = recomputePath(commandStore.getState(), head(path))
      if (!recomputedPath) continue

      commandStore.dispatch(setCursor({ path: recomputedPath }))
      executeCommand(command, { store: commandStore, type, event })
    }
  }

  // Restore the cursor to its original value if not prevented.
  // Note that state.cursor is the old cursor, before any commands were executed.
  if (!multicursor.preventSetCursor && state.cursor) {
    commandStore.dispatch(setCursor({ path: recomputePath(commandStore.getState(), head(state.cursor)) }))
  }

  // Restore multicursors
  if (!multicursor.clearMulticursor) {
    commandStore.dispatch(
      paths.map(path => (dispatch, getState) => {
        const recomputedPath = recomputePath(getState(), head(path))
        if (!recomputedPath) return
        dispatch(addMulticursor({ path: recomputedPath }))
      }),
    )
  }

  multicursor.onComplete?.(filteredPaths, commandStore.dispatch, commandStore.getState)

  // Reset isMulticursorExecuting after all operations
  commandStore.dispatch(setIsMulticursorExecuting({ value: false }))
}

/**
 * Handles gesture hints when a valid segment is entered.
 *
 * There are two alert types for gesture hints:
 * - GestureHint - The basic gesture hint that is shown immediately on swipe.
 * - gestureMenuTimeout - The gesture menu that shows all possible gestures from the current sequence after a delay.
 *
 * There is no automated test coverage since timers are so messed up in the current Jest version. It may be possible to write tests if Jest is upgraded. Manual test cases.
 * - Basic gesture hint.
 * - Preserve gesture hint for valid command.
 * - Only show "Cancel gesture" if gesture hint is already activated.
 * - Dismiss gesture hint after release for invalid command.
 * - gesture menu on hold.
 * - gesture menu from invalid gesture (e.g. ←↓, hold, ←↓←).
 * - Change gesture menu to basic gesture hint on gesture end.
 */
export const handleGestureSegment = ({ sequence }: { gesture: Direction | null; sequence: Gesture }) => {
  const state = store.getState()

  if (state.showModal || state.longPress === LongPressState.DragInProgress || state.showGestureCheatsheet) return

  // Stop gesture segment haptics when there are no more possible commands that can be completed from the current sequence.
  // useFilteredCommands updates the possibleCommands in a back channel for efficiency.
  // Always allow haptics for the first swipe, as possibleCommands may not be populated yet.
  if (sequence.length === 1 || gestureStore.getState().possibleCommands.length > 2) {
    haptics.light()
  }

  // gesture menu
  // alert after a delay of COMMAND_PALETTE_TIMEOUT
  clearTimeout(gestureMenuTimeout)
  gestureMenuTimeout = window.setTimeout(
    () => {
      store.dispatch((dispatch, getState) => {
        // do not show "Cancel gesture" if already being shown by basic gesture hint
        const state = getState()
        if (state.showGestureMenu) return
        dispatch(gestureMenu())
      })
    },
    // if the hint is already being shown, do not wait to change the value
    COMMAND_PALETTE_TIMEOUT,
  )
}

/** Executes a valid gesture and closes the gesture hint. Special handling for chainable commands. */
export const handleGestureEnd = ({ sequence, e }: { sequence: Gesture | null; e: GestureResponderEvent }) => {
  const state = store.getState()

  // Get the command from the command gesture index.
  // When the gesture menu  is displayed, disable gesture aliases (i.e. gestures hidden from instructions). This is because the gesture hints are meant only as an aid when entering gestures quickly.

  const openGestureCheatsheetGesture = gestureString(openGestureCheatsheetCommand)

  // If sequence ends with help gesture, use help command.
  // If sequence starts with a chainable command gesture and has additional swipes, use the chained command with the longest matching gesture.
  // Otherwise use the normal command lookup.
  let command: Command | null = null

  // gesture cheatsheet
  if (sequence?.toString().endsWith(openGestureCheatsheetGesture)) {
    command = openGestureCheatsheetCommand
  }
  // normal command
  else {
    command =
      !state.showCommandPalette || !commandGestureIndex[sequence as string]?.hideFromHelp
        ? commandGestureIndex[sequence as string]
        : null
  }

  // The chainable command that is in progress (only if there is at least one additional swipe). Otherwise null.
  const chainableCommandInProgressExclusive: Command | undefined = command
    ? undefined
    : globalCommands.find(
        command =>
          command.isChainable &&
          sequence?.toString().startsWith(gestureString(command)) &&
          sequence?.toString()?.length > gestureString(command).length,
      )

  // chained command
  // only if there is no exact match command
  if (!command && chainableCommandInProgressExclusive) {
    const chainedGesture1 = gestureString(chainableCommandInProgressExclusive)
    const chainedGestureCollapsed = sequence!.toString().slice(chainedGesture1.length - 1)
    const chainedGesture = sequence!.toString().slice(chainedGesture1.length)
    const commandMatch = commandGestureIndex[chainedGestureCollapsed] ?? commandGestureIndex[chainedGesture]
    if (commandMatch) {
      command = chainCommand(chainableCommandInProgressExclusive, commandMatch)
    }
  }

  // execute command
  // do not execute when modal is displayed or a drag is in progress
  if (
    command &&
    !state.showModal &&
    !state.showGestureCheatsheet &&
    state.longPress !== LongPressState.DragInProgress
  ) {
    commandEmitter.trigger('command', command)
    if (chainableCommandInProgressExclusive && !isAllSelected(state)) {
      executeCommandWithMulticursor(chainableCommandInProgressExclusive, {
        event: {
          ...e,
          // Hacky magic value, but it's the easiest way to tell the command that this is a chained gesture so that it can adjust the undo behavior.
          // Both commands need to be undone together, and this is not a property of the Command object but of the way it is invoked, so is somewhat appropriately stored on the event object, albeit ad hoc.
          type: 'chainedGesture',
        },
        type: 'gesture',
        store,
      })
    }
    executeCommandWithMulticursor(command, { event: e, type: 'gesture', store })
    if (store.getState().enableLatestCommandsDiagram) store.dispatch(showLatestCommands(command))
  }

  // if no command was found, execute the cancel command

  // clear gesture hint
  clearTimeout(gestureMenuTimeout)
  gestureMenuTimeout = undefined // clear the timer to track when it is running for handleGestureSegment

  // In training mode, show alert for any valid command (except forward/back)
  // In experience mode, clear any existing gesture hint
  setTimeout(() => {
    store.dispatch((dispatch, getState) => {
      const state = getState()
      const alertType = state.alert?.alertType
      const experienceMode = getUserSetting(state, Settings.experienceMode)

      if (state.showGestureMenu) {
        dispatch(gestureMenu())
      }

      // Show alert for valid commands in training mode
      if (!experienceMode && command && !command.hideAlert) {
        dispatch(
          alert(command.label, {
            alertType: AlertType.GestureHint,
          }),
        )
      } else if (
        // Clear alert if gesture is cancelled (no command)
        !command ||
        // Clear alert if back/forward
        command?.id === 'cursorForward' ||
        command?.id === 'cursorBack' ||
        // In experience mode, clear any existing gesture hint
        (experienceMode && alertType === AlertType.GestureHint)
      ) {
        dispatch(alert(null))
      }
    })
  })
}

/** Dismiss gesture hint that is shown by alert. */
export const handleGestureCancel = () => {
  clearTimeout(gestureMenuTimeout)
  store.dispatch((dispatch, getState) => {
    const state = getState()
    if (state.showGestureMenu) {
      dispatch(gestureMenu())
    }
    if (state.alert?.alertType === AlertType.GestureHint || state.showGestureMenu) {
      dispatch(alert(null))
    }
  })
}

/** In the specific case of the newThought and indent commands, prevent default in beforeinput event instead of keydown to preserve default iOS auto-capitalization behavior. The Enter and space characters needs to be prevented so that it doesn't get inserted into the thought (#3707). */
export const beforeInput = (e: InputEvent) => {
  if (keyCommandId === 'newThought' || (keyCommandId === 'indent' && editingValueStore.getState() === '')) {
    e.preventDefault()
  }
}

/** Global keyUp handler. */
export const keyUp = (e: KeyboardEvent) => {
  // track meta key for expansion algorithm
  if (e.key === (isMac ? 'Meta' : 'Control') && globals.suppressExpansion) {
    store.dispatch(suppressExpansion(false))
  }
  keyCommandId = null
}

/** Global keyDown handler. */
export const keyDown = (e: KeyboardEvent) => {
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
  keyCommandId = command?.id

  // disable if modal is shown, except for navigation commands
  if (!command || state.showGestureCheatsheet || (state.showModal && !command.allowExecuteFromModal)) return

  // execute the command
  commandEmitter.trigger('command', command)

  if (!command.canExecute || command.preventDefault || command.canExecute(store.getState())) {
    if (!command.permitDefault) {
      e.preventDefault()
    }

    // execute command
    executeCommandWithMulticursor(command, { event: e, type: 'keyboard', store })
  }
}
