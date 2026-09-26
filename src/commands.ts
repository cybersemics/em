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
import { CommandPatchMetadata } from './@types/Patch'
import Path from './@types/Path'
import State from './@types/State'
import { addMulticursorActionCreator as addMulticursor } from './actions/addMulticursor'
import { alertActionCreator as alert } from './actions/alert'
import { clearMulticursorsActionCreator as clearMulticursors } from './actions/clearMulticursors'
import { cursorClearedActionCreator as cursorCleared } from './actions/cursorCleared'
import { gestureMenuActionCreator as gestureMenu } from './actions/gestureMenu'
import { indentActionCreator as indent } from './actions/indent'
import { redoActionCreator as redo } from './actions/redo'
import { setCursorActionCreator as setCursor } from './actions/setCursor'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from './actions/setIsMulticursorExecuting'
import { showLatestCommandsActionCreator as showLatestCommands } from './actions/showLatestCommands'
import { suppressExpansionActionCreator as suppressExpansion } from './actions/suppressExpansion'
import { undoActionCreator as undo } from './actions/undo'
import { isCapacitor, isMac, isSafari, isTouch } from './browser'
import * as commandsObject from './commands/index'
import openMobileCommandUniverseCommand from './commands/openMobileCommandUniverse'
import {
  AlertType,
  COMMAND_PALETTE_TIMEOUT,
  HOME_PATH,
  LongPressState,
  NATIVE_HISTORY_GESTURE_TIMEOUT,
  Settings,
  noop,
} from './constants'
import focusNativeHistoryAnchor from './device/nativeHistoryAnchor'
import * as selection from './device/selection'
import documentSort from './selectors/documentSort'
import filterCursors from './selectors/filterCursors'
import getThoughtById from './selectors/getThoughtById'
import getUserSetting from './selectors/getUserSetting'
import hasMulticursor from './selectors/hasMulticursor'
import isAllSelected from './selectors/isAllSelected'
import isRedoEnabled from './selectors/isRedoEnabled'
import isUndoEnabled from './selectors/isUndoEnabled'
import splitChain from './selectors/splitChain'
import thoughtToPath from './selectors/thoughtToPath'
import store from './stores/app'
import editableSyncStore from './stores/editableSyncStore'
import editingValueStore from './stores/editingValueStore'
import gestureStore from './stores/gestureStore'
import heldKeysStore from './stores/heldKeysStore'
import nativeHistoryGestureStore from './stores/nativeHistoryGestureStore'
import commandTransaction from './util/commandTransaction'
import createId from './util/createId'
import debugLog from './util/debugLog'
import equalPath from './util/equalPath'
import haptics from './util/haptics'
import head from './util/head'
import isAttribute from './util/isAttribute'
import isCommandKey from './util/isCommandKey'
import keyValueBy from './util/keyValueBy'

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
  type: CommandType | undefined,
  event: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent,
): number | undefined => {
  if (type !== 'keyboard' || !(event instanceof KeyboardEvent) || !command.keyboard) return undefined
  const keyboardShortcuts = Array.isArray(command.keyboard) ? command.keyboard : [command.keyboard]
  const index = keyboardShortcuts.findIndex(keyboard => hashCommand(keyboard) === hashKeyDown(event))
  return index === -1 ? undefined : index
}

/**
 * Records the last command so that it can be executed again by the repeat command, but only if it made an undoable, non-navigational change to the thoughtspace. Otherwise repeat would repeat cursor movements and commands that dispatch no undoable actions (e.g. Cursor Down, Export) rather than the last edit, no matter how many of them occurred since.
 *
 * The newest patch records the command directly, so no patch-identity comparison or action inference is needed.
 */
const recordLastCommand = (command: Command, metadata: CommandPatchMetadata, stateAfter: State) => {
  const latest = [...stateAfter.undoPatches].reverse().find(patch => !patch.metadata.isNavigation)
  if (
    command.repeatable !== false &&
    latest?.metadata.source === 'command' &&
    latest.metadata.invocationId === metadata.invocationId &&
    !latest.metadata.isNavigation
  ) {
    lastCommand = { command, keyboardIndex: metadata.keyboardIndex }
  }
}

/** Records the resolved command and input once per invocation, including the shortcut used by Repeat. */
const createCommandMetadata = (
  command: Command,
  {
    type,
    event,
    keyboardIndex,
  }: {
    type?: CommandType
    event: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent
    keyboardIndex?: number
  },
): CommandPatchMetadata => ({
  source: 'command',
  invocationId: createId(),
  commandId: command.id,
  label: command.label,
  type,
  keyboardIndex: keyboardIndex ?? keyboardIndexOf(command, type, event),
})

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
  const inputMethod = type
  const commandType = type ?? 'keyboard'
  event = event ?? eventNoop

  // resolve repeat to the last command that was executed and the keyboardIndex it was triggered with, and exit early if there is none
  const resolved = commandArg.id === 'repeat' ? lastCommand : { command: commandArg }
  if (!resolved) return
  const command = resolved.command

  const canExecute = !command.canExecute || command.canExecute(commandStore.getState())
  // Exit early if the command cannot execute
  if (!canExecute) return

  // A repeated command takes the keyboardIndex that was recorded with it, since the repeat keypress matches none of its own keyboard shortcuts. Otherwise it is derived from the event.
  const keyboardIndex = keyboardIndexArg ?? resolved.keyboardIndex
  const commandMetadata = createCommandMetadata(command, { type: inputMethod, event, keyboardIndex })
  debugLog.log('command', { id: command.id, commandType })

  return commandStore.dispatch(
    commandTransaction(commandMetadata, (dispatch, metadata) => {
      const result = command.exec(dispatch, commandStore.getState, event, {
        type: commandType,
        keyboardIndex: commandMetadata.keyboardIndex,
      })
      if (result instanceof Promise) {
        return result.then(() => recordLastCommand(command, metadata, commandStore.getState()))
      }
      recordLastCommand(command, metadata, commandStore.getState())
    }),
  )
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
  const inputMethod = type
  const commandType = type ?? 'keyboard'
  event = event ?? eventNoop

  // resolve repeat to the last command that was executed and the keyboardIndex it was triggered with, and exit early if there is none
  const resolved = commandArg.id === 'repeat' ? lastCommand : { command: commandArg }
  if (!resolved) return
  const command = resolved.command
  // Every executeCommand call below is given the already resolved command, so it cannot resolve repeat itself. Forward the recorded keyboardIndex explicitly, otherwise it would be derived from the repeat keypress and lost.
  const keyboardIndex = resolved.keyboardIndex

  // Editable dispatches editThought on a throttle with leading: false, so a command that runs inside that window would
  // read the pre-edit value and the trailing edit would then commit over the command's own result (#4774). Keyboard and
  // gesture already flushed in keyDown and handleGestureEnd; every other entry point (toolbar, Command Center, Command
  // Universe) flushes here, before the state read below.
  if (commandType !== 'keyboard' && commandType !== 'gesture') {
    commandEmitter.trigger('command', command)
  }

  const state = commandStore.getState()

  // If we don't have active multicursors or the command ignores multicursors, execute the command normally.
  if (!command.multicursor || !hasMulticursor(state)) {
    return executeCommand(command, {
      store: commandStore,
      type: inputMethod,
      event,
      keyboardIndex,
    })
  }

  /** The value of Command['multicursor'] resolved to an object. That is, bare false has already short circuited, and bare true resolves to an empty object so that we don't need to make existential checks everywhere. */
  const multicursor = typeof command.multicursor === 'boolean' ? {} : command.multicursor

  const paths = documentSort(state, Object.values(state.multicursors))

  // For each multicursor, place the cursor on the path and execute the command by calling executeCommand.
  const filteredPaths = filterCursors(state, paths, multicursor.filter)

  // Exit early if the command cannot execute on any of the filtered paths
  const canExecute = filteredPaths.every(path => !command.canExecute || command.canExecute({ ...state, cursor: path }))
  if (!canExecute) return

  const commandMetadata = createCommandMetadata(command, { type: inputMethod, event, keyboardIndex })
  return commandStore.dispatch(
    commandTransaction(commandMetadata, (dispatch, metadata) => {
      // Pass the attributed dispatch through the existing executor API so nested asynchronous work retains its parent.
      const scopedStore = { ...commandStore, dispatch }

      // Reverse the order of the cursors if the command has reverse multicursor mode enabled.
      if (multicursor.reverse) {
        filteredPaths.reverse()
      }

      // Keep direct multicursor action-creators grouped while command metadata identifies this transaction.
      dispatch(setIsMulticursorExecuting({ value: true }))

      // The thoughts created by the executions, collected for selectNewCursors.
      const newCursors: Path[] = []

      /** Restores selection state and closes the synchronous multicursor bracket. */
      const completeMulticursorExecution = () => {
        // Restore the cursor to its original value if not prevented.
        // Note that state.cursor is the old cursor, before any commands were executed.
        // If the cursor thought was moved into a metaprogramming attribute (e.g. swapNote moves it into =note),
        // restore it to the nearest non-attribute ancestor instead.
        if (!multicursor.preventSetCursor && state.cursor) {
          const restoreState = commandStore.getState()
          const recomputedPath = recomputePath(restoreState, state.cursor)
          dispatch(setCursor({ path: recomputedPath && nearestNonAttributeAncestor(restoreState, recomputedPath) }))
        }

        // Restore multicursors, or select the thoughts created by commands that opt into selectNewCursors.
        if (multicursor.selectNewCursors) {
          // Setting the cursor to each selected thought emptied the multicursors, so the thoughts that were created can
          // simply be selected. A single new thought is not a selection, so clear it and end as the command does without a
          // multiselect, with the caret in the new thought.
          dispatch(
            newCursors.length < 2
              ? [clearMulticursors()]
              : [
                  ...newCursors.map(path => addMulticursor({ path })),
                  // state.expanded is recalculated on setCursor, so set the cursor to the last new thought to expand the
                  // ancestors of the new selection. The cursor is already there, so this does not move it.
                  // The new thoughts are selected rather than edited — there is no typing into several of them at once — so
                  // close the keyboard that each exec opened. Otherwise multicursorAlertMiddleware reads the selection as a
                  // multiselection being edited (Clear Thought) and leaves the Command Center closed over it on mobile.
                  setCursor({
                    path: newCursors[newCursors.length - 1],
                    isKeyboardOpen: false,
                    preserveMulticursor: true,
                  }),
                ],
          )
        } else if (!multicursor.clearMulticursor) {
          dispatch(
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

        // A command tapped in the Command Center that ends with an empty selection (e.g. delete, whose thoughts no
        // longer exist to be restored above) would dismiss the Command Center, since multicursorAlertMiddleware
        // closes it when nothing is selected. Select the thought the cursor landed on instead, the same way the
        // Command Center is opened in the first place, so that it stays open and can be used again. When the last
        // thought was deleted there is no cursor left to select and it closes as usual.
        if (commandType === 'commandCenter') {
          const state = commandStore.getState()
          if (!hasMulticursor(state) && state.cursor) {
            dispatch(addMulticursor({ path: state.cursor }))
          }
        }

        multicursor.onComplete?.(filteredPaths, dispatch, commandStore.getState)

        // The cleared state is preserved while the cursor is set to each selected thought (see setCursor), so reset it now
        // that the command has completed, just as setCursor resets it when a command moves the cursor off a single cleared
        // thought. Only reset it if it was set before the command, otherwise clearThought's own multiselect clear is undone.
        if (state.cursorCleared) {
          dispatch(cursorCleared({ value: false }))
        }

        dispatch(setIsMulticursorExecuting({ value: false }))
      }

      // If there is a custom execMulticursor function, call it with the filtered multicursors.
      // Otherwise, execute the command once for each of the filtered multicursors.
      if (multicursor.execMulticursor) {
        // Custom execution may settle asynchronously; record Repeat once its attributed work is complete.
        let result: void | Promise<void>
        try {
          result = multicursor.execMulticursor(filteredPaths, dispatch, commandStore.getState)
        } catch (error) {
          completeMulticursorExecution()
          throw error
        }

        if (result instanceof Promise) {
          // Restore the selection and close the synchronous command bracket now. The custom command owns any asynchronous
          // multicursor bracket; its supplied dispatch automatically attributes the completed edits.
          completeMulticursorExecution()
          return result.then(() => recordLastCommand(command, metadata, commandStore.getState()))
        }
      } else {
        try {
          for (const path of filteredPaths) {
            // Make sure we have the correct path to the thought in case it was moved during execution.
            const recomputedPath = recomputePath(commandStore.getState(), path)
            if (!recomputedPath) continue

            dispatch(setCursor({ path: recomputedPath }))
            executeCommand(command, {
              store: scopedStore,
              type: inputMethod,
              event,
              keyboardIndex,
            })

            // The command sets the cursor to the thought it created, so a cursor on a different thought than the one that was
            // just set is the new thought. A command that could not act on the selected thought leaves the cursor where it
            // was and contributes nothing (e.g. newUncle on a thought at the root).
            const cursorAfter = commandStore.getState().cursor
            if (multicursor.selectNewCursors && cursorAfter && !equalPath(cursorAfter, recomputedPath)) {
              newCursors.push(cursorAfter)
            }
          }
        } catch (error) {
          completeMulticursorExecution()
          throw error
        }
      }

      completeMulticursorExecution()
      recordLastCommand(command, metadata, commandStore.getState())
    }),
  )
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
    if (chainableCommandInProgressExclusive) {
      const commandMetadata = createCommandMetadata(command, { type: 'gesture', event: e })
      store.dispatch(
        commandTransaction(commandMetadata, dispatch => {
          const scopedStore = { ...store, dispatch }
          if (!isAllSelected(state)) {
            executeCommandWithMulticursor(chainableCommandInProgressExclusive, {
              event: e,
              type: 'gesture',
              store: scopedStore,
            })
          }
          executeCommandWithMulticursor(command, {
            event: e,
            type: 'gesture',
            store: scopedStore,
          })
          if (chainableCommandInProgressExclusive.id === 'selectAll') dispatch(clearMulticursors())
        }),
      )
      recordLastCommand(command, commandMetadata, store.getState())
    } else {
      executeCommandWithMulticursor(command, { event: e, type: 'gesture', store })
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

/** Set while the synthetic execCommands in registerNativeRedoStep are running, so that the `historyUndo` `beforeinput`
 * they dispatch is passed through to WebKit instead of being routed through em's undo a second time. */
let registeringNativeRedoStep = false

/**
 * Registers a single native redo step in WKWebView, so that the shake-to-redo gesture is delivered at all.
 *
 * WebKit offers a redo gesture only while its own redo stack has a step, and a step lands there only when WebKit
 * itself performs an undo. Since `beforeInput` prevents the native undo and performs em's undo instead, WebKit's redo
 * stack stays empty and the redo gesture never reaches em: iOS confirms the gesture with its own overlay while
 * nothing is restored (#5575). A shake reaches em through this route alone — it produces no touch events for
 * `device/nativeHistory.ts` to recognize — so without a step there is nothing to deliver.
 *
 * This inserts an empty marker and immediately undoes it natively, which moves that step onto the redo stack. Its DOM
 * effect is immaterial: the insert is undone before the function returns, and editableSync's suppressChange hides both
 * mutations from the Editable change handler, so no edit is recorded and the editable is not re-rendered. The step
 * exists only as the anchor that makes the native redo gesture fire; the `historyRedo` it eventually dispatches is
 * preventDefaulted like any other, so the step survives and further redo gestures keep firing.
 *
 * Must run after em's undo/redo has re-rendered the editable, since a step registered before the re-render points at
 * DOM that the re-render replaces — WebKit then silently discards the step when the gesture arrives, dispatching
 * nothing, which is indistinguishable from never having registered it.
 *
 * Registration needs a focused editing host, and undoing the creation of the only thought leaves none, so an insert
 * that finds no editable selection falls back to the hidden anchor. The undo runs only once an insert has succeeded,
 * since it would otherwise revert the user's own last edit.
 *
 * No-op outside iOS Mobile Safari. The Capacitor app is excluded because its gestures are consumed natively and
 * never consult WebKit's stacks (isTouch && isSafari alone would match its WKWebView too), and desktop Safari has no
 * shake or three-finger undo.
 */
const registerNativeRedoStep = (): void => {
  if (!isTouch || !isSafari() || isCapacitor()) return
  editableSyncStore.update({ suppressChange: true })
  registeringNativeRedoStep = true
  const marker = '<span data-native-history></span>'
  const inserted =
    document.execCommand('insertHTML', false, marker) ||
    (focusNativeHistoryAnchor() && document.execCommand('insertHTML', false, marker))
  if (inserted) {
    document.execCommand('undo')
  }
  registeringNativeRedoStep = false
  editableSyncStore.update({ suppressChange: false })
}

/** Performs a native undo/redo gesture (iOS shake-to-undo, three-finger swipe, or the Edit menu) as em's own undo/redo, so that Redux remains the single source of truth. Called from every route a native gesture can arrive by: the `historyUndo`/`historyRedo` `beforeinput` event in the browser, the three-finger swipe recognized from touch events in `device/nativeHistory.ts`, and the `nativeHistory` event from the Capacitor plugin. `registerDelay` is how long to wait before refreshing WebKit's history step — see below. */
export const handleNativeHistory = (type: 'undo' | 'redo', { registerDelay = 0 }: { registerDelay?: number } = {}) => {
  // Flush any pending throttled edit before reading the state, mirroring keyDown. Editing dispatches editThought on a
  // throttle, so a native undo triggered mid-edit (e.g. immediately after an autocorrect) would otherwise undo the
  // previous step and let the pending edit commit afterwards, duplicating text (#4477).
  commandEmitter.trigger('command', commandById(type))
  // cursorAtEnd places the caret at the end of the restored thought rather than at the cursorOffset captured before
  // the undone action, which is the position the thought was entered at and leaves the caret away from the restored
  // word, typically at the beginning of the thought.
  const state = store.getState()
  if (type === 'undo') {
    if (isUndoEnabled(state)) store.dispatch(undo({ cursorAtEnd: true }))
  } else if (isRedoEnabled(state)) {
    store.dispatch(redo({ cursorAtEnd: true }))
  }

  // em's undo re-renders the editable WebKit recorded its step against, which leaves that step stale: WebKit
  // discards it when the next gesture arrives and dispatches nothing, so a later shake reaches em nowhere (#5575).
  // Register a fresh one on every native gesture em handles, whichever route it arrived by. A step registered before
  // the re-render lands is stale on arrival, so the caller says how long that takes on its route: a `beforeinput`
  // already arrives late enough for the next task to be clear, while the touch route runs at touchend, well before
  // the re-render.
  setTimeout(registerNativeRedoStep, registerDelay)
}

/** Whether a native undo/redo is being replayed by recycleNativeHistory, so that the `beforeinput` it dispatches is swallowed instead of routed to em's undo/redo a second time. */
let recyclingNativeHistory = false

/** How many history `beforeinput` events the replay dispatched. WebKit keeps reporting `queryCommandEnabled('undo')` as true after it has stopped dispatching the event, so the dispatch itself is the only reliable signal that a step is still there. */
let replayedNativeHistoryEvents = 0

/** Moves WebKit's position through its own history and immediately back, which is net-zero while a step is available in the replayed direction and reclaims the step the gesture consumed once it is not. Returns the number of steps the replay found. */
const replayNativeHistory = (type: 'undo' | 'redo'): number => {
  replayedNativeHistoryEvents = 0
  document.execCommand(type)
  document.execCommand(type === 'undo' ? 'redo' : 'undo')
  return replayedNativeHistoryEvents
}

/**
 * Returns to WebKit's own history the step that a native undo/redo gesture consumed, so that the next gesture is still
 * dispatched.
 *
 * WebKit dispatches the `historyUndo`/`historyRedo` `beforeinput` only while its own history has a step in that
 * direction, and it registers a step only for edits it performed itself. Since em applies most edits by re-rendering
 * the editable from Redux, WebKit's history holds far fewer steps than em's — and because preventing the event still
 * advances WebKit's position, the gestures run out while em still has plenty to undo, after which iOS handles the
 * gesture itself and reports "Nothing to Undo" (#4984).
 *
 * Advancing WebKit's position is reversible, so replaying the gesture and immediately inverting it — both prevented,
 * neither routed to em — leaves a step on either side of WebKit's position for as long as it holds any step at all.
 * Unlike anchoring a step with an `insertHTML` (#4637), the replay mutates no DOM and discards no redo steps, so
 * native redo keeps working.
 *
 * The replay has nothing to recycle when the step the gesture consumed belonged to an editable that em's undo has
 * since unmounted — WebKit drops such a step instead of making it redoable — so that gesture empties the history for
 * good and every later gesture drains the steps typing registers afterwards, one per gesture, until iOS is again
 * reporting "Nothing to Undo". Anchoring a step in the editable that is focused now restores the foothold: the text is
 * typed and deleted again, so the thought is left as it was, and the replay that follows makes the anchored step
 * redoable as well as undoable.
 *
 * No-op outside iOS Safari, which is the only place a native history gesture arrives as a `beforeinput`: the Capacitor
 * app receives it as a `nativeHistory` plugin event instead, which never touches WebKit's history.
 */
const recycleNativeHistory = (type: 'undo' | 'redo') => {
  if (!isTouch || !isSafari()) return
  // Defer so that the replay does not re-enter the beforeinput dispatch that triggered it.
  setTimeout(() => {
    recyclingNativeHistory = true
    // Anchor a step only when the replay came up empty, and only with a collapsed caret in a thought, since typing
    // over a selection would destroy the selected text rather than restore it.
    if (replayNativeHistory(type) === 0 && selection.isCollapsed() && selection.isThought()) {
      editableSyncStore.update({ suppressChange: true })
      if (document.execCommand('insertText', false, ' ')) document.execCommand('delete')
      editableSyncStore.update({ suppressChange: false })
      replayNativeHistory('undo')
    }
    recyclingNativeHistory = false
  })
}

/** In the specific case of the newThought and indent commands, prevent default in beforeinput event instead of keydown to preserve default iOS auto-capitalization behavior. The Enter and space characters needs to be prevented so that it doesn't get inserted into the thought (#3707).
 *
 * Android soft keyboards report the space keydown as keyCode 229 ('Unidentified'), so the space-to-indent
 * command is never matched in keyDown and keyCommandId is never set. The second branch catches that case:
 * a `beforeinput` insertText of a single space over an empty thought indents it instead of inserting the
 * space, mirroring the keyDown-matched path on desktop/iOS (#4178). */
export const beforeInput = (e: InputEvent) => {
  // Pass through the events dispatched by registerNativeRedoStep's own execCommands, including its `historyUndo`.
  // Letting WebKit perform that undo is the entire point of the call: it is what moves a step onto the redo stack.
  if (registeringNativeRedoStep) return
  // recycleNativeHistory's replay and anchor are dispatched only to move WebKit's position, so none of the branches
  // below may act on them: undoing em a second time would consume a step of em's history that no gesture asked for,
  // and the anchored space would be read as the Android space-to-indent case. The replay is still prevented, since
  // performing it would mutate the DOM; the anchor is not, since WebKit registers the step by performing it.
  if (recyclingNativeHistory) {
    if ((e.inputType === 'historyUndo' || e.inputType === 'historyRedo') && e.cancelable) {
      e.preventDefault()
      replayedNativeHistoryEvents++
    }
    return
  }

  // Native undo/redo (iOS shake-to-undo or three-finger swipe) fires a cancelable beforeinput with inputType
  // historyUndo/historyRedo. Left unhandled, it mutates the contenteditable DOM directly, bypassing em's undo and
  // leaving stale formatting markup (e.g. a black font color from a removed background highlight) that renders the
  // thought invisible (#3954). Block the native undo before it touches the DOM and route it through em's undo/redo,
  // which reverts to the correct Redux state and re-renders the editable. Each formatSelection registers exactly one
  // native undo step (#4637), so one native gesture maps to one em undo/redo — no dedupe is needed. The cancelable check
  // gates on the case we can actually prevent; native browser undo is intentionally superseded by em's undo (#3879).
  // In the Capacitor app the gesture never reaches WebKit at all and arrives via nativeHistory instead, so the two
  // routes cannot both fire for a single gesture.
  if ((e.inputType === 'historyUndo' || e.inputType === 'historyRedo') && e.cancelable) {
    e.preventDefault()
    // A three-finger swipe reaches em twice on iOS Safari: once as the touch events device/nativeHistory.ts
    // recognizes, and again here a moment later. The default is still prevented so WebKit cannot mutate the
    // contenteditable, but the gesture has already been applied, and the touch route has already scheduled the step
    // it depends on. Recycling here as well would move WebKit's position back across that step and could leave only a
    // stale step on the undo side.
    if (Date.now() - nativeHistoryGestureStore.getState() > NATIVE_HISTORY_GESTURE_TIMEOUT) {
      const type = e.inputType === 'historyUndo' ? 'undo' : 'redo'
      // Scheduled before handleNativeHistory schedules registerNativeRedoStep, so that the replay runs first:
      // replaying after the registration would move WebKit's position across the freshly registered redo step.
      recycleNativeHistory(type)
      handleNativeHistory(type)
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
  if (e.key === (isMac ? 'Meta' : 'Control') && heldKeysStore.getState().suppressExpansion) {
    store.dispatch(suppressExpansion(false))
  }

  // clear the table column boundary crossing suppression once the arrow key is released, so it can cross again on the next discrete press
  if (heldKeysStore.getState().arrowKeyBoundaryCross === e.key) {
    heldKeysStore.update({ arrowKeyBoundaryCross: null })
  }

  keyCommandId = null
}

/** Global keyDown handler. */
export const keyDown = (e: KeyboardEvent) => {
  const state = store.getState()

  // track meta key for expansion algorithm
  if (!isCommandKey(e)) {
    // disable suppress expansion without triggering re-render
    heldKeysStore.update({ suppressExpansion: false })
  }

  // For some reason, when the caret is at the beginning of the thought, alt + ArrowLeft sets the caret to the end.
  // Prevent this default behavior, as the caret should have nowhere to go when it is already at the beginning.
  if (e.altKey && e.key === 'ArrowLeft' && selection.offset() === 0 && selection.isThought()) {
    e.preventDefault()
    return
  }

  // After a table column boundary is crossed on a discrete keypress, hard-stop auto-repeat of the same arrow key until it is released.
  // This prevents holding the arrow key from continuously advancing the caret into or through the adjacent thought — it must be released and pressed again to move further.
  if (heldKeysStore.getState().arrowKeyBoundaryCross === e.key && e.repeat) {
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
