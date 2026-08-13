/* eslint-disable import/prefer-default-export */
/** Defines global keyboard shortcuts and gestures. */
import Emitter from 'emitter20'
import { GestureResponderEvent } from 'react-native'
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
import Patch from './@types/Patch'
import Path from './@types/Path'
import State from './@types/State'
import { addMulticursorActionCreator as addMulticursor } from './actions/addMulticursor'
import { alertActionCreator as alert } from './actions/alert'
import { clearMulticursorsActionCreator as clearMulticursors } from './actions/clearMulticursors'
import { gestureMenuActionCreator as gestureMenu } from './actions/gestureMenu'
import { indentActionCreator as indent } from './actions/indent'
import { redoActionCreator as redo } from './actions/redo'
import { setCursorActionCreator as setCursor } from './actions/setCursor'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from './actions/setIsMulticursorExecuting'
import { showLatestCommandsActionCreator as showLatestCommands } from './actions/showLatestCommands'
import { suppressExpansionActionCreator as suppressExpansion } from './actions/suppressExpansion'
import { undoActionCreator as undo } from './actions/undo'
import { isMac } from './browser'
import * as commandsObject from './commands/index'
import openMobileCommandUniverseCommand from './commands/openMobileCommandUniverse'
import { AlertType, COMMAND_PALETTE_TIMEOUT, HOME_PATH, LongPressState, Settings, noop } from './constants'
import * as selection from './device/selection'
import globals from './globals'
import documentSort from './selectors/documentSort'
import getThoughtById from './selectors/getThoughtById'
import getUserSetting from './selectors/getUserSetting'
import hasMulticursor from './selectors/hasMulticursor'
import isAllSelected from './selectors/isAllSelected'
import isMulticursorPath from './selectors/isMulticursorPath'
import isUndoEnabled from './selectors/isUndoEnabled'
import splitChain from './selectors/splitChain'
import thoughtToPath from './selectors/thoughtToPath'
import store from './stores/app'
import editingValueStore from './stores/editingValue'
import gestureStore from './stores/gesture'
import { isNavigation } from './util/actionMetadata.registry'
import debugLog from './util/debugLog'
import equalPath from './util/equalPath'
import haptics from './util/haptics'
import hashPath from './util/hashPath'
import head from './util/head'
import isAttribute from './util/isAttribute'
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

  return (
    (key.meta ? 'META_' : '') +
    (key.alt ? 'ALT_' : '') +
    // On non-Mac platforms Ctrl is already the meta modifier, so control falls back to Shift (see Key).
    (isMac && key.control ? 'CONTROL_' : '') +
    (key.shift || (!isMac && key.control) ? 'SHIFT_' : '') +
    key.key?.toUpperCase()
  )
}

/** Hash all the properties of a keydown event into a string that can be compared with the result of hashCommand. */
export const hashKeyDown = (e: KeyboardEvent): string =>
  (e.metaKey || e.ctrlKey ? 'META_' : '') +
  (e.altKey ? 'ALT_' : '') +
  (isMac && e.ctrlKey ? 'CONTROL_' : '') +
  (e.shiftKey ? 'SHIFT_' : '') +
  // for some reason, e.key returns 'Dead' in some cases, perhaps because of alternate keyboard settings
  // e.g. alt + meta + n
  // use e.keyCode if available instead
  (letters[e.keyCode] || digits[e.keyCode] || e.key || '').toUpperCase()

/* A map of typed modifier tokens to the corresponding Key modifier property.
 * Command and Ctrl are the same modifier on their respective platforms, so they both map to meta. Literal Control is
 * a distinct modifier on Mac only; on other platforms Ctrl is already meta, so a typed Ctrl maps to meta there too.
 * See docs/commands.md.
 */
const SHORTCUT_MODIFIERS: Index<'meta' | 'alt' | 'shift' | 'control'> = {
  cmd: 'meta',
  command: 'meta',
  meta: 'meta',
  ctrl: isMac ? 'control' : 'meta',
  control: isMac ? 'control' : 'meta',
  '⌘': 'meta',
  '⌃': isMac ? 'control' : 'meta',
  opt: 'alt',
  option: 'alt',
  alt: 'alt',
  '⌥': 'alt',
  shift: 'shift',
  '⇧': 'shift',
}

/* A map of typed named keys to their canonical key name. */
const SHORTCUT_NAMED_KEYS: Index<string> = {
  enter: 'Enter',
  return: 'Enter',
  esc: 'Escape',
  escape: 'Escape',
  space: 'Space',
  backspace: 'Backspace',
  delete: 'Delete',
  del: 'Delete',
  tab: 'Tab',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
}

/**
 * Parses a search query that looks like a keyboard shortcut (e.g. "cmd option k", "ctrl+option+k") into a hash string
 * that can be compared directly against hashCommand. Returns null if the query is not a recognized shortcut, in which
 * case the query should be treated as a normal label search.
 *
 * Tokens are case-insensitive and order-independent, separated by whitespace and/or "+". A query is recognized as a
 * shortcut iff it contains at least one modifier token and exactly one valid key token (a single character or a known
 * named key). Modifier tokens map to the same Key properties that em matches keypresses against at runtime, so typing
 * a command's displayed shortcut (e.g. "Command + Control + e") always resolves to that command's hash.
 */
export const parseCommandShortcut = (query: string): string | null => {
  const tokens = query
    .toLowerCase()
    .split(/[\s+]+/)
    .filter(token => token.length > 0)

  if (tokens.length === 0) return null

  const modifiers = new Set<'meta' | 'alt' | 'shift' | 'control'>()
  const keys: string[] = []

  tokens.forEach(token => {
    const modifier = SHORTCUT_MODIFIERS[token]
    if (modifier) {
      modifiers.add(modifier)
    } else {
      // a valid key is a known named key or a single character
      const key = SHORTCUT_NAMED_KEYS[token] || (token.length === 1 ? token : null)
      if (key) keys.push(key)
      // an unrecognized multi-character token means this is not a shortcut
      else keys.push('')
    }
  })

  // recognized as a shortcut iff at least one modifier and exactly one valid key
  if (modifiers.size === 0 || keys.length !== 1 || keys[0] === '') return null

  return hashCommand({
    key: keys[0],
    meta: modifiers.has('meta'),
    alt: modifiers.has('alt'),
    control: modifiers.has('control'),
    shift: modifiers.has('shift'),
  })
}

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
    (keyboard.control ? (isMac ? 'Control' : 'Shift') + ' + ' : '') +
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

/** Recomputes a path after a command has executed, in case the thought was moved. Returns null if the thought no longer exists. Paths that cross a context view are returned as-is, since they do not follow the parent chain and therefore cannot be reconstructed by thoughtToPath. */
const recomputePath = (state: State, path: Path): Path | null => {
  // e.g. a/m~/a does not follow the parent chain (the trailing a is a context of the Lexeme m, whose real parent is the root), so thoughtToPath would collapse it to a.
  if (splitChain(state, path).length > 1) return getThoughtById(state, head(path)) ? path : null

  const recomputed = thoughtToPath(state, head(path))
  return recomputed && equalPath(recomputed, HOME_PATH) ? null : recomputed
}

/**
 * Truncates a path to its nearest ancestor that is not within a metaprogramming attribute. If a command moves the cursor or a multicursor into a metaprogramming attribute (e.g. swapNote moving a thought into =note), the selection should be set to the nearest non-attribute ancestor instead. Returns the path unchanged if it contains no attribute, or null if truncation would leave an empty path.
 */
const nearestNonAttributeAncestor = (state: State, path: Path): Path | null => {
  const attributeIndex = path.findIndex(id => {
    const thought = getThoughtById(state, id)
    return !!thought && isAttribute(thought.value)
  })
  if (attributeIndex === -1) return path
  const truncated = path.slice(0, attributeIndex) as Path
  return truncated.length > 0 ? truncated : null
}

/**
 * The last command that was executed, tracked so that it can be executed again by the repeat command. Not reactive — nothing subscribes to it — so it is a plain module variable rather than a ministore.
 *
 * Repeat has no behavior of its own. Both executeCommand and executeCommandWithMulticursor swap it out for lastCommand before executing, rather than executing from within its exec, so that the repeated command runs through the same path as any other command and gets its own canExecute and multicursor handling. Since repeat is repeatable: false, it is never recorded here, so the swap never resolves to repeat itself and cannot recurse.
 *
 * The keyboardIndex that triggered the command is recorded alongside it, since it cannot be recovered from the repeat keypress. Without it, a command bound to an array of shortcuts (applyColor) would have no shortcut to repeat.
 */
let lastCommand: { command: Command; keyboardIndex?: number } | null = null

/** Resets the last command. For testing only, since lastCommand persists across tests within a file. */
export const resetLastCommand = () => {
  lastCommand = null
}

/** Returns the index of the command's keyboard shortcut that was pressed, so that it can be read in exec (e.g. to select a color based on the pressed shortcut). Returns undefined if the command was not activated by one of its own keyboard shortcuts. */
const keyboardIndexOf = (
  command: Command,
  type: CommandType,
  event: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent,
): number | undefined => {
  if (type !== 'keyboard' || !(event instanceof KeyboardEvent) || !command.keyboard) return undefined
  const keyboardShortcuts = Array.isArray(command.keyboard) ? command.keyboard : [command.keyboard]
  const index = keyboardShortcuts.findIndex(keyboard => hashCommand(keyboard) === hashKeyDown(event))
  return index === -1 ? undefined : index
}

/** Returns the last undo patch that is not a navigation action, i.e. the patch that Undo would revert. Mirrors getLatestActionType, but returns the patch itself so that patches can be compared by identity. */
const lastUndoablePatch = (state: State): Patch | undefined => {
  for (let i = state.undoPatches.length - 1; i >= 0; i--) {
    if (!isNavigation(state.undoPatches[i][0]?.actions[0])) return state.undoPatches[i]
  }
  return undefined
}

/** Execute a single command. Defaults to global store and keyboard shortcuts. Use `executeCommandWithMulticursor` to execute a command with multicursor mode. */
export const executeCommand = (
  commandArg: Command,
  {
    store: storeArg,
    type,
    event,
    keyboardIndex: keyboardIndexArg,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store?: Store<State, any>
    type?: CommandType
    event?: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent
    /** The index of the keyboard shortcut that triggered the command, when it cannot be derived from the event. Set by executeCommandWithMulticursor, which resolves repeat before delegating here and so must carry the recorded index with it. */
    keyboardIndex?: number
  } = {},
) => {
  const commandStore = storeArg ?? store
  type = type ?? 'keyboard'
  event = event ?? eventNoop

  // resolve repeat to the last command that was executed and the keyboardIndex it was triggered with, and exit early if there is none
  const resolved = commandArg.id === 'repeat' ? lastCommand : { command: commandArg }
  if (!resolved) return
  const command = resolved.command

  const canExecute = !command.canExecute || command.canExecute(commandStore.getState())
  // Exit early if the command cannot execute
  if (!canExecute) return

  // A repeated command takes the keyboardIndex that was recorded with it, since the repeat keypress matches none of its own keyboard shortcuts. Otherwise it is derived from the event.
  const keyboardIndex = keyboardIndexArg ?? resolved.keyboardIndex ?? keyboardIndexOf(command, type, event)

  debugLog.log('command', { id: command.id, commandType: type })

  const undoablePatchPrev = lastUndoablePatch(commandStore.getState())

  // execute single command
  command.exec(commandStore.dispatch, commandStore.getState, event, { type, keyboardIndex })

  // Record the last command so that it can be executed again by the repeat command, but only if it made an undoable, non-navigational change to the thoughtspace. Otherwise repeat would repeat cursor movements and commands that dispatch no undoable actions (e.g. Cursor Down, Export) rather than the last edit, no matter how many of them occurred since.
  // Patches are compared by identity rather than by action type, since the same command may be executed repeatedly (e.g. Bold twice in a row). A command that only dispatches asynchronously (e.g. Generate Thought) is not recorded, as its patch does not exist yet.
  if (command.repeatable !== false && lastUndoablePatch(commandStore.getState()) !== undoablePatchPrev) {
    lastCommand = { command, keyboardIndex }
  }
}

/** Execute command. Defaults to global store and keyboard shortcuts. */
export const executeCommandWithMulticursor = (
  commandArg: Command,
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

  // resolve repeat to the last command that was executed and the keyboardIndex it was triggered with, and exit early if there is none
  const resolved = commandArg.id === 'repeat' ? lastCommand : { command: commandArg }
  if (!resolved) return
  const command = resolved.command
  // Every executeCommand call below is given the already resolved command, so it cannot resolve repeat itself. Forward the recorded keyboardIndex explicitly, otherwise it would be derived from the repeat keypress and lost.
  const keyboardIndex = resolved.keyboardIndex

  const state = commandStore.getState()

  // If we don't have active multicursors or the command ignores multicursors, execute the command normally.
  if (!command.multicursor || !hasMulticursor(state)) {
    return executeCommand(command, { store: commandStore, type, event, keyboardIndex })
  }

  /** The value of Command['multicursor'] resolved to an object. That is, bare false has already short circuited, and bare true resolves to an empty object so that we don't need to make existential checks everywhere. */
  const multicursor = typeof command.multicursor === 'boolean' ? {} : command.multicursor

  const paths = documentSort(state, Object.values(state.multicursors))

  // if multicursor is disallowed for this command, alert and exit early
  // Only multiple selected thoughts are disallowed. A single selected thought is executed as usual, otherwise commands would be blocked whenever exactly one thought is selected, e.g. by opening the Command Center.
  if (multicursor.disallow) {
    if (paths.length > 1) {
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

    // Execute the single selected thought here rather than falling through to the multicursor loop below, which restores the cursor when it is done. That restore dispatches setCursor, which resets noteFocus and would move the caret out of a note just created by the note command.
    // For the same reason, only set the cursor when it is not already on the selected thought.
    if (!state.cursor || !isMulticursorPath(state, state.cursor)) {
      commandStore.dispatch(setCursor({ path: paths[0] }))
    }
    return executeCommand(command, { store: commandStore, type, event, keyboardIndex })
  }

  // For each multicursor, place the cursor on the path and execute the command by calling executeCommand.
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
      const recomputedPath = recomputePath(commandStore.getState(), path)
      if (!recomputedPath) continue

      commandStore.dispatch(setCursor({ path: recomputedPath }))
      executeCommand(command, { store: commandStore, type, event, keyboardIndex })
    }
  }

  // Restore the cursor to its original value if not prevented.
  // Note that state.cursor is the old cursor, before any commands were executed.
  // If the cursor thought was moved into a metaprogramming attribute (e.g. swapNote moves it into =note),
  // restore it to the nearest non-attribute ancestor instead.
  if (!multicursor.preventSetCursor && state.cursor) {
    const restoreState = commandStore.getState()
    const recomputedPath = recomputePath(restoreState, state.cursor)
    commandStore.dispatch(
      setCursor({ path: recomputedPath && nearestNonAttributeAncestor(restoreState, recomputedPath) }),
    )
  }

  // Restore multicursors
  if (!multicursor.clearMulticursor) {
    commandStore.dispatch(
      paths.map(path => (dispatch, getState) => {
        const state = getState()
        const recomputedPath = recomputePath(state, path)
        // If a multicursor thought was moved into a metaprogramming attribute (e.g. swapNote moves it into
        // =note), restore it to the nearest non-attribute ancestor instead.
        const restoredPath = recomputedPath && nearestNonAttributeAncestor(state, recomputedPath)
        if (!restoredPath) return
        dispatch(addMulticursor({ path: restoredPath }))
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

  if (state.showModal || state.longPress === LongPressState.DragInProgress || state.showMobileCommandUniverse) return

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

  const openMobileCommandUniverseGesture = gestureString(openMobileCommandUniverseCommand)

  // If sequence ends with help gesture, use help command.
  // If sequence starts with a chainable command gesture and has additional swipes, use the chained command with the longest matching gesture.
  // Otherwise use the normal command lookup.
  let command: Command | null = null

  // mobile command universe
  if (sequence?.toString().endsWith(openMobileCommandUniverseGesture)) {
    command = openMobileCommandUniverseCommand
  }
  // normal command
  else {
    command =
      !state.showDesktopCommandUniverse || !commandGestureIndex[sequence as string]?.hideFromHelp
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
    !state.showMobileCommandUniverse &&
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
    if (chainableCommandInProgressExclusive?.id === 'selectAll') {
      store.dispatch(clearMulticursors())
    }
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

/** In the specific case of the newThought and indent commands, prevent default in beforeinput event instead of keydown to preserve default iOS auto-capitalization behavior. The Enter and space characters needs to be prevented so that it doesn't get inserted into the thought (#3707).
 *
 * Android soft keyboards report the space keydown as keyCode 229 ('Unidentified'), so the space-to-indent
 * command is never matched in keyDown and keyCommandId is never set. The second branch catches that case:
 * a `beforeinput` insertText of a single space over an empty thought indents it instead of inserting the
 * space, mirroring the keyDown-matched path on desktop/iOS (#4178). */
export const beforeInput = (e: InputEvent) => {
  // Native undo/redo (iOS shake-to-undo or three-finger swipe) fires a cancelable beforeinput with inputType
  // historyUndo/historyRedo. Left unhandled, it mutates the contenteditable DOM directly, bypassing em's undo and
  // leaving stale formatting markup (e.g. a black font color from a removed background highlight) that renders the
  // thought invisible (#3954). Block the native undo before it touches the DOM and route it through em's undo/redo,
  // which reverts to the correct Redux state and re-renders the editable. Each formatSelection registers exactly one
  // native undo step (#4637), so one native gesture maps to one em undo/redo — no dedupe is needed. The cancelable check
  // gates on the case we can actually prevent; native browser undo is intentionally superseded by em's undo (#3879).
  if ((e.inputType === 'historyUndo' || e.inputType === 'historyRedo') && e.cancelable) {
    e.preventDefault()
    const state = store.getState()
    if (e.inputType === 'historyUndo') {
      if (isUndoEnabled(state)) store.dispatch(undo())
    } else if (state.redoPatches.length > 0) {
      store.dispatch(redo())
    }
    return
  }

  if (keyCommandId === 'newThought' || (keyCommandId === 'indent' && editingValueStore.getState() === '')) {
    e.preventDefault()
    return
  }

  // On Android, the soft keyboard reports the space keydown with keyCode 229 ('Unidentified'), so the
  // space-to-indent command is never matched in keyDown and keyCommandId is not set. Catch the space here
  // and indent the empty thought instead of letting the literal space get inserted (#4178). Non-empty
  // thoughts and other input types (paste, IME composition) are excluded, so typing a space mid-word is
  // unaffected; desktop/iOS reach indent via their keyDown-matched path and short-circuit above.
  if (e.inputType === 'insertText' && e.data === ' ' && editingValueStore.getState() === '') {
    e.preventDefault()
    store.dispatch(indent())
  }
}

/** Global keyUp handler. */
export const keyUp = (e: KeyboardEvent) => {
  // track meta key for expansion algorithm
  if (e.key === (isMac ? 'Meta' : 'Control') && globals.suppressExpansion) {
    store.dispatch(suppressExpansion(false))
  }

  // clear the table column boundary crossing suppression once the arrow key is released, so it can cross again on the next discrete press
  if (globals.arrowKeyBoundaryCross === e.key) {
    globals.arrowKeyBoundaryCross = null
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

  // After a table column boundary is crossed on a discrete keypress, hard-stop auto-repeat of the same arrow key until it is released.
  // This prevents holding the arrow key from continuously advancing the caret into or through the adjacent thought — it must be released and pressed again to move further.
  if (globals.arrowKeyBoundaryCross === e.key && e.repeat) {
    e.preventDefault()
    return
  }

  // disable if desktop command universe is displayed
  if (state.showDesktopCommandUniverse) return

  const command = commandKeyIndex[hashKeyDown(e)]
  keyCommandId = command?.id

  // disable if modal is shown, except for navigation commands
  if (!command || state.showMobileCommandUniverse || (state.showModal && !command.allowExecuteFromModal)) return

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
