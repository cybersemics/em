import { GestureResponderEvent } from 'react-native'
import { Store } from 'redux'
import Command from '../@types/Command'
import CommandType from '../@types/CommandType'
import MulticursorFilter from '../@types/MulticursorFilter'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { alertActionCreator as alert } from '../actions/alert'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../actions/setIsMulticursorExecuting'
import { AlertType, HOME_PATH, noop } from '../constants'
import documentSort from '../selectors/documentSort'
import hasMulticursor from '../selectors/hasMulticursor'
import thoughtToPath from '../selectors/thoughtToPath'
import globalStore from '../stores/app'
import equalPath from './equalPath'
import hashPath from './hashPath'
import head from './head'
import parentOf from './parentOf'
import UnreachableError from './unreachable'

interface Options {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store?: Store<State, any>
  type?: CommandType
  event?: Event | GestureResponderEvent | KeyboardEvent | React.MouseEvent | React.TouchEvent
}

const eventNoop = { preventDefault: noop } as Event

/** Filter the cursors based on the filter type. Cursors are sorted in document order. */
const filterCursors = (_state: State, cursors: Path[], filter: MulticursorFilter = 'all') => {
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
const executeCommand = (command: Command, { store, type, event }: Options = {}) => {
  store = store ?? globalStore
  type = type ?? 'keyboard'
  event = event ?? eventNoop

  const canExecute = !command.canExecute || command.canExecute(store.getState())
  // Exit early if the command cannot execute
  if (!canExecute) return

  // execute single command
  command.exec(store.dispatch, store.getState, event, { type })
}

/** Execute command. Defaults to global store and keyboard shortcuts. */
export const executeCommandWithMulticursor = (command: Command, { store, type, event }: Options = {}) => {
  store = store ?? globalStore
  type = type ?? 'keyboard'
  event = event ?? eventNoop

  const state = store.getState()

  // If we don't have active multicursors or the command ignores multicursors, execute the command normally.
  if (!command.multicursor || !hasMulticursor(state)) {
    return executeCommand(command, { store, type, event })
  }

  /** The value of Command['multicursor'] resolved to an object. That is, bare false has already short circuited, and bare true resolves to an empty object so that we don't need to make existential checks everywhere. */
  const multicursor = typeof command.multicursor === 'boolean' ? {} : command.multicursor

  // if multicursor is disallowed for this command, alert and exit early
  if (multicursor.disallow) {
    const errorMessage = !multicursor.error
      ? 'Cannot execute this command with multiple thoughts.'
      : typeof multicursor.error === 'function'
        ? multicursor.error(store.getState())
        : multicursor.error
    store.dispatch(
      alert(errorMessage, {
        alertType: AlertType.MulticursorError,
        clearDelay: 5000,
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
  store.dispatch(
    setIsMulticursorExecuting({
      value: true,
      operationLabel: command.id,
    }),
  )

  // If there is a custom execMulticursor function, call it with the filtered multicursors.
  // Otherwise, execute the command once for each of the filtered multicursors.
  if (multicursor.execMulticursor) {
    multicursor.execMulticursor(filteredPaths, store.dispatch, store.getState)
  } else {
    for (const path of filteredPaths) {
      // Make sure we have the correct path to the thought in case it was moved during execution.
      const recomputedPath = recomputePath(store.getState(), head(path))
      if (!recomputedPath) continue

      store.dispatch(setCursor({ path: recomputedPath }))
      executeCommand(command, { store, type, event })
    }
  }

  // Restore the cursor to its original value if not prevented.
  // Note that state.cursor is the old cursor, before any commands were executed.
  if (!multicursor.preventSetCursor && state.cursor) {
    store.dispatch(setCursor({ path: recomputePath(store.getState(), head(state.cursor)) }))
  }

  // Restore multicursors
  if (!multicursor.clearMulticursor) {
    store.dispatch(
      paths.map(path => (dispatch, getState) => {
        const recomputedPath = recomputePath(getState(), head(path))
        if (!recomputedPath) return
        dispatch(addMulticursor({ path: recomputedPath }))
      }),
    )
  }

  multicursor.onComplete?.(filteredPaths, store.dispatch, store.getState)

  // Reset isMulticursorExecuting after all operations
  store.dispatch(setIsMulticursorExecuting({ value: false }))
}

export default executeCommand
